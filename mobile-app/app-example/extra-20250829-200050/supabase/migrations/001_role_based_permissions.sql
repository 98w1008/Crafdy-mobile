-- =============================================
-- Crafdy Mobile - Role-Based Permissions Migration
-- =============================================
-- このマイグレーションファイルは、ロールベースの権限管理を実装するために
-- 必要なテーブル構造を作成・変更します。
--
-- 実行順序:
-- 1. usersテーブルにroleカラムを追加
-- 2. profilesテーブルを新規作成
-- 3. projects_usersテーブルを新規作成
-- =============================================

-- 1. usersテーブルにroleカラムを追加
-- デフォルト値は'worker'（職人）
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker';

-- roleカラムにコメントを追加
COMMENT ON COLUMN auth.users.role IS 'ユーザーの役割: worker(職人), manager(現場監督), admin(管理者), owner(会社経営者)';

-- 既存のユーザーにデフォルト値を設定
UPDATE auth.users 
SET role = 'worker' 
WHERE role IS NULL;

-- 2. profilesテーブルを新規作成
-- ユーザーの公開可能な情報を格納
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    phone TEXT,
    position TEXT,
    bio TEXT,
    profit_visible BOOLEAN DEFAULT FALSE,
    cross_project_visible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- profilesテーブルにコメントを追加
COMMENT ON TABLE public.profiles IS 'ユーザーのプロフィール情報（公開可能な情報）';
COMMENT ON COLUMN public.profiles.id IS 'auth.usersテーブルのidと1対1対応';
COMMENT ON COLUMN public.profiles.full_name IS '氏名';
COMMENT ON COLUMN public.profiles.avatar_url IS 'アバター画像のURL';
COMMENT ON COLUMN public.profiles.company_id IS '所属会社のID';
COMMENT ON COLUMN public.profiles.phone IS '電話番号';
COMMENT ON COLUMN public.profiles.position IS '職位・役職';
COMMENT ON COLUMN public.profiles.bio IS '自己紹介文';
COMMENT ON COLUMN public.profiles.profit_visible IS '親方用：粗利・利益の表示設定';
COMMENT ON COLUMN public.profiles.cross_project_visible IS '親方用：横断プロジェクトの表示設定';

-- profilesテーブルのRLS（Row Level Security）を有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profilesテーブルのRLSポリシーを作成
-- 自分のプロフィールは読み書き可能
CREATE POLICY "Users can view and edit their own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- 同じ会社のユーザーのプロフィールは閲覧可能
CREATE POLICY "Users can view profiles of same company" ON public.profiles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- 3. projects_usersテーブルを新規作成
-- プロジェクトとユーザーの多対多関係を管理
CREATE TABLE IF NOT EXISTS public.projects_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 同じプロジェクトに同じユーザーが重複して参加しないように
    UNIQUE(project_id, user_id)
);

-- projects_usersテーブルにコメントを追加
COMMENT ON TABLE public.projects_users IS 'プロジェクトとユーザーの多対多関係を管理';
COMMENT ON COLUMN public.projects_users.project_id IS 'プロジェクトID';
COMMENT ON COLUMN public.projects_users.user_id IS 'ユーザーID';
COMMENT ON COLUMN public.projects_users.joined_at IS 'プロジェクトに参加した日時';

-- projects_usersテーブルのRLS（Row Level Security）を有効化
ALTER TABLE public.projects_users ENABLE ROW LEVEL SECURITY;

-- projects_usersテーブルのRLSポリシーを作成
-- 自分が参加しているプロジェクトの情報は閲覧可能
CREATE POLICY "Users can view project memberships they are part of" ON public.projects_users
    FOR SELECT USING (user_id = auth.uid());

-- 管理者・現場監督は自分の会社のプロジェクトメンバーを管理可能
CREATE POLICY "Managers can manage project memberships" ON public.projects_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 
            FROM auth.users u
            JOIN public.profiles p ON u.id = p.id
            JOIN public.projects proj ON proj.id = project_id
            WHERE u.id = auth.uid() 
            AND u.role IN ('manager', 'admin', 'owner')
            AND proj.company_id = p.company_id
        )
    );

-- 4. 既存のcompaniesテーブルに必要なカラムが存在しない場合は作成
-- (companiesテーブルが存在しない場合は先に作成)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- companiesテーブルにコメントを追加
COMMENT ON TABLE public.companies IS '会社情報';
COMMENT ON COLUMN public.companies.name IS '会社名';
COMMENT ON COLUMN public.companies.description IS '会社の説明';
COMMENT ON COLUMN public.companies.address IS '所在地';

-- companiesテーブルのRLS（Row Level Security）を有効化
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- companiesテーブルのRLSポリシーを作成
-- 所属会社の情報は閲覧可能
CREATE POLICY "Users can view their company info" ON public.companies
    FOR SELECT USING (
        id IN (
            SELECT company_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- 5. 既存のprojectsテーブルにcompany_idカラムが存在しない場合は追加
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.company_id IS '案件を受注した会社のID';

-- 6. updated_atカラムを自動更新するためのトリガー関数を作成
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profilesテーブルのupdated_atトリガーを作成
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- companiesテーブルのupdated_atトリガーを作成
DROP TRIGGER IF EXISTS handle_companies_updated_at ON public.companies;
CREATE TRIGGER handle_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. 新規ユーザーサインアップ時に自動的にprofileを作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除して新しいトリガーを作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- マイグレーション完了
-- =============================================
-- 実行後の確認方法:
-- 1. auth.usersテーブルでroleカラムが追加されているか確認
-- 2. public.profilesテーブルが作成されているか確認
-- 3. public.projects_usersテーブルが作成されているか確認
-- 4. public.companiesテーブルが作成されているか確認
-- 5. 新規ユーザーを作成して、profilesテーブルにレコードが自動作成されるか確認
-- =============================================