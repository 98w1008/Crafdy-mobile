-- =============================================
-- Crafdy Mobile - Create Profiles View and User Profiles Setup
-- =============================================
-- このマイグレーションは、AuthContextで期待される構造に合わせて
-- user_profilesテーブルとprofilesビューを作成します。
-- 
-- 実行内容:
-- 1. user_profilesテーブルを作成（AuthContextの構造に合わせる）
-- 2. 既存のprofilesテーブルデータをuser_profilesに移行
-- 3. profilesビューを作成（auth.usersとuser_profilesを結合）
-- 4. RLSポリシーを設定
-- 5. 適切な権限を付与
-- =============================================

-- 1. user_profilesテーブルを作成
-- AuthContextで期待される構造に合わせる
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'worker' CHECK (role IN ('parent', 'lead', 'worker')),
    company TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    daily_rate NUMERIC,
    phone TEXT,
    position TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    profit_visible BOOLEAN DEFAULT false,
    cross_project_visible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_profilesテーブルにコメントを追加
COMMENT ON TABLE public.user_profiles IS 'ユーザープロフィール情報（AuthContextで使用）';
COMMENT ON COLUMN public.user_profiles.user_id IS 'auth.usersテーブルのidと1対1対応';
COMMENT ON COLUMN public.user_profiles.display_name IS '表示名（emailのローカル部分または設定された名前）';
COMMENT ON COLUMN public.user_profiles.full_name IS 'フルネーム';
COMMENT ON COLUMN public.user_profiles.email IS 'メールアドレス（auth.usersと同期）';
COMMENT ON COLUMN public.user_profiles.role IS 'ユーザー権限: parent(親方), lead(職長), worker(職人)';
COMMENT ON COLUMN public.user_profiles.company IS '会社名（テキスト）';
COMMENT ON COLUMN public.user_profiles.company_id IS '会社ID（companiesテーブル参照）';
COMMENT ON COLUMN public.user_profiles.daily_rate IS '日給';

-- 2. 既存のprofilesテーブルからuser_profilesにデータを移行
INSERT INTO public.user_profiles (
    user_id, 
    full_name, 
    avatar_url, 
    company_id, 
    phone, 
    position, 
    bio,
    profit_visible,
    cross_project_visible,
    created_at,
    updated_at
)
SELECT 
    id,
    full_name,
    avatar_url,
    company_id,
    phone,
    position,
    bio,
    profit_visible,
    cross_project_visible,
    created_at,
    updated_at
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 3. profilesビューを作成（最小限の公開データ）
CREATE OR REPLACE VIEW public.profiles AS
SELECT
    u.id AS user_id,
    u.email,
    COALESCE(p.display_name, split_part(u.email,'@',1)) AS display_name,
    COALESCE(p.role, 'worker') AS role,
    p.full_name,
    p.company,
    p.company_id,
    p.daily_rate,
    p.phone,
    p.position,
    p.bio,
    p.avatar_url,
    p.is_active,
    p.profit_visible,
    p.cross_project_visible,
    p.created_at,
    p.updated_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id;

-- profilesビューにコメントを追加
COMMENT ON VIEW public.profiles IS 'ユーザープロフィール情報のビュー（auth.usersとuser_profilesの結合）';

-- 4. user_profilesテーブルのRLS（Row Level Security）を有効化
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "read_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "upsert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can only access their own user_profile" ON public.user_profiles;

-- 5. 新しいRLSポリシーを作成

-- 読み取りポリシー: 自分のプロフィールのみ読み取り可能
CREATE POLICY "read_own_profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- 挿入ポリシー: 自分のプロフィールのみ作成可能
CREATE POLICY "upsert_own_profile"
    ON public.user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 更新ポリシー: 自分のプロフィールのみ更新可能
CREATE POLICY "update_own_profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. 権限を付与
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.profiles TO authenticated;  -- ビューへの読み取り権限
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;  -- テーブルへの権限

-- 7. updated_atトリガーを作成
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER handle_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 8. 新規ユーザー登録時に自動的にuser_profilesレコードを作成するトリガー関数を更新
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- user_profilesテーブルにレコードを作成
    INSERT INTO public.user_profiles (user_id, display_name, email, full_name)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    
    -- 既存のprofilesテーブルにもレコードを作成（後方互換性）
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを更新
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 9. 既存ユーザーのuser_profilesレコードを確実に作成
INSERT INTO public.user_profiles (user_id, display_name, email, full_name)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1)),
    u.email,
    u.raw_user_meta_data->>'full_name'
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.user_profiles)
ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

-- =============================================
-- マイグレーション完了
-- =============================================
-- 実行後の確認:
-- 1. user_profilesテーブルが作成されている
-- 2. profilesビューが作成されている  
-- 3. RLSポリシーが適用されている
-- 4. 権限が正しく付与されている
-- 5. 新規ユーザー作成時に自動的にuser_profilesレコードが作成される
-- 
-- 確認用クエリ:
-- SELECT * FROM public.profiles WHERE user_id = auth.uid();
-- SELECT * FROM public.user_profiles WHERE user_id = auth.uid();
-- =============================================