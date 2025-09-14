-- Crafdy Mobile データベーススキーマ
-- PostgreSQL / Supabase用

-- ENUM型の定義
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'worker');
CREATE TYPE project_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE media_type AS ENUM ('image', 'audio', 'video');
CREATE TYPE cost_type AS ENUM ('labor', 'material', 'equipment', 'other');
CREATE TYPE receipt_status AS ENUM ('pending', 'processed', 'error');
CREATE TYPE subscription_plan AS ENUM ('lite', 'standard', 'unlimited');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trial');

-- 1. 会社情報テーブル
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ユーザー情報テーブル
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Supabase Auth UUIDと連携
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'worker',
    daily_rate INTEGER DEFAULT 0, -- 人件費計算用の日当（円）
    stripe_customer_id TEXT,
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 現場情報テーブル
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    status project_status DEFAULT 'not_started',
    start_date DATE,
    end_date DATE,
    total_budget INTEGER DEFAULT 0,
    progress_rate FLOAT DEFAULT 0.0, -- AI計算による進捗率 (0.0-1.0)
    customer_name TEXT,
    customer_contact TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 提出物ステータス型
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- 現場テーブル
CREATE TABLE IF NOT EXISTS work_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 日報テーブル（最適化版）
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    work_site_id UUID REFERENCES work_sites(id),
    work_hours DECIMAL(4,2) NOT NULL, -- 作業時間
    work_content TEXT NOT NULL, -- 作業内容
    progress_rate INTEGER DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100), -- 進捗率
    special_notes TEXT, -- 特記事項
    status submission_status DEFAULT 'draft', -- 承認ステータス
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT, -- 差戻し理由
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 日報添付ファイルテーブル
CREATE TABLE IF NOT EXISTS report_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'receipt', 'delivery_slip')),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 日報メディアテーブル（互換性のため残す）
CREATE TABLE IF NOT EXISTS report_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    media_type media_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 原価テーブル
CREATE TABLE costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    cost_type cost_type NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL, -- 金額（円）
    cost_date DATE NOT NULL,
    source_report_id UUID REFERENCES reports(id),
    source_receipt_id UUID REFERENCES receipts(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. レシート・請求書テーブル（OCR対象）
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id), -- 任意
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    status receipt_status DEFAULT 'pending',
    raw_text TEXT, -- OCRで読み取った生テキスト
    processed_data JSONB, -- AIで構造化されたデータ
    confidence_score FLOAT, -- OCR精度スコア
    uploaded_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    approval_status submission_status DEFAULT 'submitted', -- 承認ステータス
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 見積書テーブル
CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id), -- 任意
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_address TEXT,
    total_amount INTEGER NOT NULL DEFAULT 0,
    tax_rate FLOAT DEFAULT 0.1, -- 消費税率
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'draft', -- draft, sent, approved, rejected
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 見積項目テーブル
CREATE TABLE estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity FLOAT NOT NULL DEFAULT 1.0,
    unit TEXT DEFAULT '個',
    unit_price INTEGER NOT NULL DEFAULT 0,
    amount INTEGER NOT NULL DEFAULT 0, -- quantity * unit_price
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. サブスクリプション・課金テーブル
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    plan subscription_plan DEFAULT 'lite',
    status subscription_status DEFAULT 'trial',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. プロジェクトメンバーテーブル（引き継ぎ機能付き）
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'lead',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- 制約
    CONSTRAINT valid_member_role CHECK (role IN ('parent', 'lead', 'worker')),
    CONSTRAINT valid_period CHECK (ended_at IS NULL OR ended_at > started_at),
    
    -- 同一プロジェクト、同一ユーザーで重複するアクティブメンバーシップを防ぐ
    CONSTRAINT unique_active_membership 
        EXCLUDE (project_id WITH =, user_id WITH =) 
        WHERE (ended_at IS NULL)
);

-- 12. AIコーチング履歴テーブル
CREATE TABLE ai_coaching (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id), -- 任意
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    context JSONB, -- 質問時のコンテキスト情報
    satisfaction_rating INTEGER, -- 1-5の満足度評価
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. 提出物の監査ログテーブル
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL, -- reports.id または receipts.id
    submission_type TEXT NOT NULL CHECK (submission_type IN ('report', 'receipt')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('create', 'edit', 'approve', 'reject', 'cancel_approval')),
    previous_status submission_status,
    new_status submission_status NOT NULL,
    metadata JSONB, -- 追加の情報（編集内容、却下理由など）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_work_date ON reports(work_date);
CREATE INDEX idx_costs_project_id ON costs(project_id);
CREATE INDEX idx_costs_cost_date ON costs(cost_date);
CREATE INDEX idx_receipts_company_id ON receipts(company_id);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_estimates_company_id ON estimates(company_id);
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_active ON project_members(project_id, user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_ai_coaching_user_id ON ai_coaching(user_id);
CREATE INDEX idx_audit_logs_submission ON audit_logs(submission_id, submission_type);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_receipts_approval_status ON receipts(approval_status);

-- Row Level Security (RLS) の有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coaching ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成

-- ユーザーは自分の会社のデータのみアクセス可能
CREATE POLICY "Users can view own company data" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can view company users" ON users
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- プロジェクトのRLSポリシー
CREATE POLICY "Users can view company projects" ON projects
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can create company projects" ON projects
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

-- 日報のRLSポリシー
CREATE POLICY "Users can view project reports" ON reports
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN users u ON p.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        project_id IN (
            SELECT p.id FROM projects p
            JOIN users u ON p.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

-- 原価のRLSポリシー
CREATE POLICY "Users can view project costs" ON costs
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN users u ON p.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

-- レシートのRLSポリシー
CREATE POLICY "Users can view company receipts" ON receipts
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can upload receipts" ON receipts
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        ) AND uploaded_by = auth.uid()
    );

-- 見積書のRLSポリシー
CREATE POLICY "Users can view company estimates" ON estimates
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can create estimates" ON estimates
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        ) AND created_by = auth.uid()
    );

-- 見積項目のRLSポリシー
CREATE POLICY "Users can view estimate items" ON estimate_items
    FOR SELECT USING (
        estimate_id IN (
            SELECT e.id FROM estimates e
            JOIN users u ON e.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

-- AIコーチングのRLSポリシー
CREATE POLICY "Users can view own coaching history" ON ai_coaching
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create coaching records" ON ai_coaching
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 監査ログのRLSポリシー
CREATE POLICY "Users can view related audit logs" ON audit_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM project_members pm
            JOIN projects p ON pm.project_id = p.id
            WHERE pm.user_id = auth.uid() 
            AND pm.ended_at IS NULL
            AND (
                (submission_type = 'report' AND EXISTS (
                    SELECT 1 FROM reports r WHERE r.id = submission_id AND r.project_id = p.id
                )) OR
                (submission_type = 'receipt' AND EXISTS (
                    SELECT 1 FROM receipts rec WHERE rec.id = submission_id AND rec.project_id = p.id
                ))
            )
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- 関数の作成

-- 提出物編集権限チェック関数
CREATE OR REPLACE FUNCTION can_edit_submission(
    submission_id UUID,
    user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    submission_record RECORD;
    user_record RECORD;
    project_record RECORD;
BEGIN
    -- 提出物の情報を取得（reportsテーブルから）
    SELECT r.user_id as created_by, r.status, r.project_id
    INTO submission_record
    FROM reports r
    WHERE r.id = submission_id;
    
    -- reportsテーブルにない場合、receiptsテーブルを確認
    IF NOT FOUND THEN
        SELECT rec.uploaded_by as created_by, rec.approval_status as status, rec.project_id
        INTO submission_record
        FROM receipts rec
        WHERE rec.id = submission_id;
    END IF;
    
    -- 提出物が見つからない場合
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- ユーザーの役割を取得
    SELECT pm.role
    INTO user_record
    FROM project_members pm
    WHERE pm.user_id = user_id 
    AND pm.project_id = submission_record.project_id
    AND pm.ended_at IS NULL;
    
    -- プロジェクトメンバーでない場合
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 権限ルールの適用
    -- 1. admin（代表）は常に編集可能
    IF user_record.role = 'parent' THEN
        RETURN TRUE;
    END IF;
    
    -- 2. manager（職長）は自分が作成した提出物で、承認前のみ編集可能
    IF user_record.role = 'lead' THEN
        RETURN (submission_record.created_by = user_id AND submission_record.status != 'approved');
    END IF;
    
    -- 3. worker（職人）は自分が作成した提出物で、承認前のみ編集可能
    IF user_record.role = 'worker' THEN
        RETURN (submission_record.created_by = user_id AND submission_record.status != 'approved');
    END IF;
    
    -- デフォルトは編集不可
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 見積項目の金額を自動計算する関数
CREATE OR REPLACE FUNCTION calculate_estimate_item_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.amount = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 見積項目の金額計算トリガー
CREATE TRIGGER trigger_calculate_estimate_item_amount
    BEFORE INSERT OR UPDATE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_estimate_item_amount();

-- 見積書の合計金額を更新する関数
CREATE OR REPLACE FUNCTION update_estimate_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE estimates
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM estimate_items
        WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 見積書合計金額更新トリガー
CREATE TRIGGER trigger_update_estimate_total
    AFTER INSERT OR UPDATE OR DELETE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_estimate_total();

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atトリガーの適用
CREATE TRIGGER trigger_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_costs_updated_at BEFORE UPDATE ON costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_estimate_items_updated_at BEFORE UPDATE ON estimate_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ビューの作成

-- プロジェクト統計ビュー
CREATE VIEW project_statistics AS
SELECT 
    p.id,
    p.name,
    p.company_id,
    p.total_budget,
    p.progress_rate,
    COALESCE(SUM(c.amount), 0) AS total_costs,
    COUNT(DISTINCT r.id) AS report_count,
    COUNT(DISTINCT r.user_id) AS worker_count,
    COALESCE(SUM(r.man_hours), 0) AS total_man_hours
FROM projects p
LEFT JOIN costs c ON p.id = c.project_id
LEFT JOIN reports r ON p.id = r.project_id
GROUP BY p.id, p.name, p.company_id, p.total_budget, p.progress_rate;

-- 会社ダッシュボードビュー
CREATE VIEW company_dashboard AS
SELECT 
    c.id AS company_id,
    c.name AS company_name,
    COUNT(DISTINCT p.id) AS total_projects,
    COUNT(DISTINCT CASE WHEN p.status = 'in_progress' THEN p.id END) AS active_projects,
    COUNT(DISTINCT u.id) AS total_users,
    COALESCE(SUM(p.total_budget), 0) AS total_budget,
    COALESCE(SUM(costs.amount), 0) AS total_costs
FROM companies c
LEFT JOIN projects p ON c.id = p.company_id
LEFT JOIN users u ON c.id = u.company_id AND u.is_active = true
LEFT JOIN costs ON p.id = costs.project_id
GROUP BY c.id, c.name;

-- サンプルデータの挿入（開発用）
-- INSERT INTO companies (name, address, phone, email) VALUES
-- ('サンプル建設株式会社', '東京都渋谷区1-1-1', '03-1234-5678', 'info@sample-construction.jp');
-- 
-- INSERT INTO users (id, company_id, full_name, email, role) VALUES
-- (gen_random_uuid(), (SELECT id FROM companies WHERE name = 'サンプル建設株式会社'), '田中太郎', 'tanaka@sample-construction.jp', 'admin');

-- 13. 勤怠設定テーブル
CREATE TABLE payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    payroll_closing_day INTEGER NOT NULL CHECK (payroll_closing_day >= 1 AND payroll_closing_day <= 31),
    payroll_pay_day INTEGER NOT NULL CHECK (payroll_pay_day >= 1 AND payroll_pay_day <= 31),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_company_payroll_settings UNIQUE (company_id)
);

-- 14. 勤怠記録テーブル
CREATE TABLE work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    break_minutes INTEGER DEFAULT 0,
    total_hours DECIMAL(4,2) DEFAULT 0.0,
    hourly_rate INTEGER DEFAULT 0, -- 時給（円）
    daily_wage INTEGER DEFAULT 0, -- 日給（円）
    overtime_hours DECIMAL(4,2) DEFAULT 0.0,
    overtime_rate INTEGER DEFAULT 0, -- 残業時給（円）
    description TEXT,
    location TEXT,
    weather TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_work_time CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT valid_hours CHECK (total_hours >= 0 AND overtime_hours >= 0),
    CONSTRAINT unique_user_project_date UNIQUE (user_id, project_id, work_date)
);

-- 15. 勤怠監査ログテーブル
CREATE TABLE payroll_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'settings_update', 'export', 'calculation', etc.
    details JSONB, -- 詳細なログデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 勤怠関連インデックス
CREATE INDEX idx_payroll_settings_company ON payroll_settings(company_id);
CREATE INDEX idx_work_sessions_user_date ON work_sessions(user_id, work_date);
CREATE INDEX idx_work_sessions_project_date ON work_sessions(project_id, work_date);
CREATE INDEX idx_work_sessions_company_date ON work_sessions(company_id, work_date);
CREATE INDEX idx_payroll_audit_logs_company ON payroll_audit_logs(company_id);
CREATE INDEX idx_payroll_audit_logs_action ON payroll_audit_logs(action, created_at);

-- 勤怠関連RLSポリシー
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_audit_logs ENABLE ROW LEVEL SECURITY;

-- 勤怠設定のRLSポリシー
CREATE POLICY "Users can view company payroll settings" ON payroll_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage payroll settings" ON payroll_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- 勤怠記録のRLSポリシー
CREATE POLICY "Users can view company work sessions" ON work_sessions
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own work sessions" ON work_sessions
    FOR ALL USING (
        user_id = auth.uid() AND
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage all work sessions" ON work_sessions
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
        )
    );

-- 監査ログのRLSポリシー
CREATE POLICY "Admins can view audit logs" ON payroll_audit_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON payroll_audit_logs
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

-- 勤怠関連の自動更新トリガー
CREATE TRIGGER trigger_payroll_settings_updated_at 
    BEFORE UPDATE ON payroll_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_work_sessions_updated_at 
    BEFORE UPDATE ON work_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 勤怠統計ビュー
CREATE VIEW payroll_statistics AS
SELECT 
    ws.company_id,
    ws.user_id,
    u.full_name AS user_name,
    DATE_TRUNC('month', ws.work_date) AS month,
    COUNT(*) AS work_days,
    SUM(ws.total_hours) AS total_hours,
    SUM(ws.overtime_hours) AS overtime_hours,
    SUM(ws.daily_wage) AS total_wage,
    SUM(ws.overtime_hours * ws.overtime_rate) AS overtime_wage,
    SUM(ws.daily_wage + (ws.overtime_hours * ws.overtime_rate)) AS total_payment
FROM work_sessions ws
JOIN users u ON ws.user_id = u.id
GROUP BY ws.company_id, ws.user_id, u.full_name, DATE_TRUNC('month', ws.work_date);

-- 元請け係数テーブル
CREATE TABLE IF NOT EXISTS public.contractor_coefficients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_name TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  price_adjustment DECIMAL(4,3) DEFAULT 1.000, -- 価格調整係数
  schedule_adjustment DECIMAL(4,3) DEFAULT 1.000, -- 工期調整係数
  win_rate_historical DECIMAL(4,3), -- 過去受注率
  recommended_adjustment DECIMAL(4,3), -- AI推奨調整値
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_contractor_company UNIQUE (contractor_name, company_id),
  CONSTRAINT valid_price_adjustment CHECK (price_adjustment > 0.0 AND price_adjustment <= 3.000),
  CONSTRAINT valid_schedule_adjustment CHECK (schedule_adjustment > 0.0 AND schedule_adjustment <= 3.000),
  CONSTRAINT valid_win_rate CHECK (win_rate_historical >= 0.0 AND win_rate_historical <= 1.0),
  CONSTRAINT valid_recommended_adjustment CHECK (recommended_adjustment IS NULL OR (recommended_adjustment > 0.0 AND recommended_adjustment <= 3.000))
);

-- 見積り学習データテーブル
CREATE TABLE IF NOT EXISTS public.estimate_learning_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_name TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  submitted_amount DECIMAL(12,2) NOT NULL,
  won_amount DECIMAL(12,2),
  win_status BOOLEAN NOT NULL, -- true: 受注, false: 失注
  submission_date DATE NOT NULL,
  season TEXT CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  market_condition TEXT CHECK (market_condition IN ('good', 'normal', 'poor')),
  work_category TEXT, -- 工事カテゴリ（内装、外装、解体など）
  estimated_duration INTEGER, -- 推定工期（日数）
  actual_duration INTEGER, -- 実際の工期（日数）
  metadata JSONB, -- 追加の学習データ（競合他社数、特殊要件など）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 係数調整履歴テーブル
CREATE TABLE IF NOT EXISTS public.coefficient_adjustment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_coefficient_id UUID REFERENCES contractor_coefficients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  previous_price_adjustment DECIMAL(4,3),
  new_price_adjustment DECIMAL(4,3),
  previous_schedule_adjustment DECIMAL(4,3),
  new_schedule_adjustment DECIMAL(4,3),
  adjustment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 元請け学習関連インデックス
CREATE INDEX idx_contractor_coefficients_company ON contractor_coefficients(company_id);
CREATE INDEX idx_contractor_coefficients_contractor ON contractor_coefficients(contractor_name);
CREATE INDEX idx_estimate_learning_contractor ON estimate_learning_data(contractor_name, company_id);
CREATE INDEX idx_estimate_learning_date ON estimate_learning_data(submission_date);
CREATE INDEX idx_estimate_learning_season ON estimate_learning_data(season);
CREATE INDEX idx_coefficient_history_contractor ON coefficient_adjustment_history(contractor_coefficient_id);

-- 元請け学習関連RLS有効化
ALTER TABLE contractor_coefficients ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE coefficient_adjustment_history ENABLE ROW LEVEL SECURITY;

-- 元請け係数のRLSポリシー
CREATE POLICY "Users can view company contractor coefficients" ON contractor_coefficients
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage company contractor coefficients" ON contractor_coefficients
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

-- 見積り学習データのRLSポリシー
CREATE POLICY "Users can view company learning data" ON estimate_learning_data
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage company learning data" ON estimate_learning_data
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE users.id = auth.uid()
        )
    );

-- 係数調整履歴のRLSポリシー
CREATE POLICY "Users can view coefficient history" ON coefficient_adjustment_history
    FOR SELECT USING (
        contractor_coefficient_id IN (
            SELECT cc.id FROM contractor_coefficients cc
            JOIN users u ON cc.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can create coefficient history" ON coefficient_adjustment_history
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        contractor_coefficient_id IN (
            SELECT cc.id FROM contractor_coefficients cc
            JOIN users u ON cc.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

-- 元請け学習関連の更新トリガー
CREATE TRIGGER trigger_contractor_coefficients_updated_at 
    BEFORE UPDATE ON contractor_coefficients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 係数調整時の履歴記録関数
CREATE OR REPLACE FUNCTION record_coefficient_adjustment()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.price_adjustment != NEW.price_adjustment OR OLD.schedule_adjustment != NEW.schedule_adjustment) THEN
        INSERT INTO coefficient_adjustment_history (
            contractor_coefficient_id,
            user_id,
            previous_price_adjustment,
            new_price_adjustment,
            previous_schedule_adjustment,
            new_schedule_adjustment,
            adjustment_reason
        ) VALUES (
            NEW.id,
            auth.uid(),
            OLD.price_adjustment,
            NEW.price_adjustment,
            OLD.schedule_adjustment,
            NEW.schedule_adjustment,
            NEW.notes
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 係数調整履歴記録トリガー
CREATE TRIGGER trigger_record_coefficient_adjustment
    AFTER UPDATE ON contractor_coefficients
    FOR EACH ROW
    EXECUTE FUNCTION record_coefficient_adjustment();

-- 元請け統計ビュー
CREATE VIEW contractor_performance_stats AS
SELECT 
    cc.id AS coefficient_id,
    cc.contractor_name,
    cc.company_id,
    cc.price_adjustment,
    cc.schedule_adjustment,
    cc.win_rate_historical,
    cc.recommended_adjustment,
    COUNT(eld.id) AS total_submissions,
    COUNT(CASE WHEN eld.win_status = true THEN 1 END) AS won_projects,
    CASE 
        WHEN COUNT(eld.id) > 0 
        THEN COUNT(CASE WHEN eld.win_status = true THEN 1 END)::DECIMAL / COUNT(eld.id)
        ELSE 0
    END AS current_win_rate,
    AVG(CASE WHEN eld.won_amount IS NOT NULL THEN eld.won_amount / eld.submitted_amount ELSE NULL END) AS avg_price_ratio,
    AVG(CASE WHEN eld.actual_duration IS NOT NULL THEN eld.actual_duration::DECIMAL / eld.estimated_duration ELSE NULL END) AS avg_schedule_ratio,
    MAX(eld.submission_date) AS last_submission_date,
    cc.last_updated
FROM contractor_coefficients cc
LEFT JOIN estimate_learning_data eld ON cc.contractor_name = eld.contractor_name 
    AND cc.company_id = eld.company_id
    AND eld.submission_date >= (CURRENT_DATE - INTERVAL '2 years') -- 直近2年のデータ
GROUP BY cc.id, cc.contractor_name, cc.company_id, cc.price_adjustment, 
         cc.schedule_adjustment, cc.win_rate_historical, cc.recommended_adjustment, cc.last_updated;

-- 完了
SELECT 'Crafdy Mobile database schema with contractor learning system created successfully!' AS status;