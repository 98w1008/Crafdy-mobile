-- 勤怠・請求管理システムの拡張スキーマ
-- 既存のsupabase-schema.sqlに追加する項目

-- 新しいENUM型の追加
CREATE TYPE invoice_due_type AS ENUM ('month_end', 'net30');
CREATE TYPE approval_status AS ENUM ('draft', 'submitted', 'approved');

-- 1. company_settingsテーブルの拡張（payroll_closing_day, payroll_pay_day, invoice_default_dueを追加）
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payroll_closing_day INTEGER CHECK (payroll_closing_day >= 1 AND payroll_closing_day <= 31);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payroll_pay_day INTEGER CHECK (payroll_pay_day >= 1 AND payroll_pay_day <= 31);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invoice_default_due invoice_due_type DEFAULT 'month_end';

-- 2. invoicesテーブル（請求書管理）
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status approval_status DEFAULT 'draft',
    description TEXT,
    customer_name TEXT,
    customer_email TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. reportsテーブルとreceiptsテーブルにstatusカラムを追加（承認フロー用）
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status approval_status DEFAULT 'draft';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS content_json JSONB; -- 構造化されたコンテンツ

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'draft';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id);

-- 4. audit_logsテーブル（監査ログ）
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'reports', 'receipts', 'invoices', etc.
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'approve', 'submit', 'cancel'
    before_data JSONB, -- 変更前のデータ
    after_data JSONB, -- 変更後のデータ
    acted_by UUID REFERENCES users(id) NOT NULL,
    acted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT, -- 変更の説明
    ip_address INET, -- IPアドレス
    user_agent TEXT -- ユーザーエージェント
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_acted_by ON audit_logs(acted_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_acted_at ON audit_logs(acted_at);

-- RLSの有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成

-- invoicesのRLS
CREATE POLICY "Users can view company invoices" ON invoices
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can create company invoices" ON invoices
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        ) AND created_by = auth.uid()
    );

CREATE POLICY "Users can update own invoices or parent/manager can update all" ON invoices
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        ) AND (
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'manager')
                AND users.company_id = invoices.company_id
            )
        )
    );

-- audit_logsのRLS
CREATE POLICY "Users can view company audit logs" ON audit_logs
    FOR SELECT USING (
        acted_by IN (
            SELECT u.id FROM users u
            WHERE u.company_id IN (
                SELECT company_id FROM users WHERE users.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (acted_by = auth.uid());

-- 承認・編集権限をチェックする関数
CREATE OR REPLACE FUNCTION can_edit_submission(
    entity_type TEXT,
    entity_id UUID,
    user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    entity_status approval_status;
    entity_creator UUID;
    user_role user_role;
    user_company UUID;
    entity_company UUID;
BEGIN
    -- ユーザーの会社とロールを取得
    SELECT u.company_id, u.role INTO user_company, user_role
    FROM users u WHERE u.id = user_id;
    
    -- エンティティの情報を取得
    CASE entity_type
        WHEN 'reports' THEN
            SELECT r.status, r.submitted_by, p.company_id
            INTO entity_status, entity_creator, entity_company
            FROM reports r
            JOIN projects p ON r.project_id = p.id
            WHERE r.id = entity_id;
            
        WHEN 'receipts' THEN
            SELECT r.approval_status, r.submitted_by, r.company_id
            INTO entity_status, entity_creator, entity_company
            FROM receipts r
            WHERE r.id = entity_id;
            
        WHEN 'invoices' THEN
            SELECT i.status, i.created_by, i.company_id
            INTO entity_status, entity_creator, entity_company
            FROM invoices i
            WHERE i.id = entity_id;
    END CASE;
    
    -- 会社が異なる場合は編集不可
    IF user_company != entity_company THEN
        RETURN FALSE;
    END IF;
    
    -- 代表(admin)は常に編集可能
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- 職長(manager)は承認前のみ編集可能
    IF user_role = 'manager' AND entity_creator = user_id THEN
        RETURN entity_status != 'approved';
    END IF;
    
    -- 作業員(worker)は作成者本人かつ未提出のもののみ編集可能
    IF user_role = 'worker' AND entity_creator = user_id THEN
        RETURN entity_status = 'draft';
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 監査ログを記録する関数
CREATE OR REPLACE FUNCTION record_audit_log(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_action TEXT,
    p_before_data JSONB DEFAULT NULL,
    p_after_data JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        before_data,
        after_data,
        acted_by,
        description
    ) VALUES (
        p_entity_type,
        p_entity_id,
        p_action,
        p_before_data,
        p_after_data,
        auth.uid(),
        p_description
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 月末日を取得する関数
CREATE OR REPLACE FUNCTION get_month_end_date(base_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
    RETURN (DATE_TRUNC('MONTH', base_date) + INTERVAL '1 MONTH - 1 DAY')::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 支払期日を計算する関数
CREATE OR REPLACE FUNCTION calculate_invoice_due_date(
    company_id UUID,
    issued_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
    default_due invoice_due_type;
BEGIN
    -- 会社の初期設定を取得
    SELECT c.invoice_default_due INTO default_due
    FROM companies c WHERE c.id = company_id;
    
    -- 初期設定に基づいて支払期日を計算
    CASE default_due
        WHEN 'month_end' THEN
            RETURN get_month_end_date(issued_date);
        WHEN 'net30' THEN
            RETURN issued_date + INTERVAL '30 days';
        ELSE
            RETURN issued_date + INTERVAL '30 days';
    END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

-- 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存テーブルにupdated_atトリガーを追加
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 監査ログを自動記録するトリガー関数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    entity_type_name TEXT;
BEGIN
    entity_type_name := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        PERFORM record_audit_log(
            entity_type_name,
            NEW.id,
            'create',
            NULL,
            row_to_json(NEW)::JSONB,
            'Record created'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM record_audit_log(
            entity_type_name,
            NEW.id,
            'update',
            row_to_json(OLD)::JSONB,
            row_to_json(NEW)::JSONB,
            'Record updated'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM record_audit_log(
            entity_type_name,
            OLD.id,
            'delete',
            row_to_json(OLD)::JSONB,
            NULL,
            'Record deleted'
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 監査ログトリガーの設定
DROP TRIGGER IF EXISTS audit_reports_trigger ON reports;
CREATE TRIGGER audit_reports_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_receipts_trigger ON receipts;
CREATE TRIGGER audit_receipts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_invoices_trigger ON invoices;
CREATE TRIGGER audit_invoices_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();