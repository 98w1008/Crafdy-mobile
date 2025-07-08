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

-- 4. 日報テーブル
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    work_date DATE NOT NULL,
    weather TEXT,
    workers_count INTEGER,
    man_hours FLOAT DEFAULT 0.0, -- AI解析による作業工数
    photo_urls TEXT[], -- 写真URLの配列
    ai_analysis TEXT, -- AI分析結果
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 日報メディアテーブル
CREATE TABLE report_media (
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

-- 11. プロジェクトメンバーテーブル（アクセス権限管理）
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- owner, manager, member, viewer
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
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
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_ai_coaching_user_id ON ai_coaching(user_id);

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

-- 関数の作成

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

-- 完了
SELECT 'Crafdy Mobile database schema created successfully!' AS status;