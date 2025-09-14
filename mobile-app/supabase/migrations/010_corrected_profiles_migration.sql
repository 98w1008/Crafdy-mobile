-- =============================================
-- Crafdy Mobile - Corrected Profiles Migration
-- =============================================
-- このマイグレーションは、既存のprofilesテーブルを安全に処理し、
-- AuthContextで期待される構造に合わせて新しいuser_profilesテーブルと
-- profilesビューを作成します。
-- 
-- 修正点:
-- 1. 既存のprofilesがテーブルかビューかを判定
-- 2. 適切な方法でバックアップ・削除
-- 3. データの安全な移行
-- 4. AuthContext期待値に合わせた構造
-- =============================================

-- Step 1: 既存のprofilesオブジェクトの状態を確認し、適切に処理
DO $$
DECLARE
    object_type TEXT;
    backup_suffix TEXT;
BEGIN
    -- profilesオブジェクトが存在するかチェック
    SELECT 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'profiles'
            ) THEN 'table'
            WHEN EXISTS (
                SELECT 1 FROM information_schema.views 
                WHERE table_schema = 'public' AND table_name = 'profiles'
            ) THEN 'view'
            ELSE 'none'
        END INTO object_type;
    
    RAISE NOTICE 'Found profiles object type: %', object_type;
    
    -- オブジェクトタイプに応じて処理
    IF object_type = 'table' THEN
        -- テーブルの場合：バックアップ名を生成してリネーム
        backup_suffix := to_char(NOW(), 'YYYYMMDD_HH24MISS');
        EXECUTE format('ALTER TABLE public.profiles RENAME TO profiles_backup_%s', backup_suffix);
        RAISE NOTICE 'Existing profiles table renamed to profiles_backup_%', backup_suffix;
        
    ELSIF object_type = 'view' THEN
        -- ビューの場合：削除
        DROP VIEW public.profiles;
        RAISE NOTICE 'Existing profiles view dropped';
        
    ELSE
        RAISE NOTICE 'No existing profiles object found';
    END IF;
END
$$;

-- Step 2: user_profilesテーブルを作成（AuthContext期待値に合わせた構造）
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
COMMENT ON COLUMN public.user_profiles.role IS 'ユーザー権限: parent(親方), lead(職長), worker(職人)';
COMMENT ON COLUMN public.user_profiles.company IS '会社名（テキスト）';
COMMENT ON COLUMN public.user_profiles.company_id IS '会社ID（companiesテーブル参照）';

-- Step 3: バックアップされたprofilesテーブルからデータを移行
DO $$
DECLARE
    backup_table_name TEXT;
    migration_query TEXT;
    col_record RECORD;
    columns_to_migrate TEXT[];
    values_to_select TEXT[];
BEGIN
    -- バックアップテーブル名を検索
    SELECT table_name INTO backup_table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'profiles_backup_%'
    ORDER BY table_name DESC
    LIMIT 1;
    
    IF backup_table_name IS NOT NULL THEN
        RAISE NOTICE 'Found backup table: %', backup_table_name;
        
        -- バックアップテーブルとuser_profilesテーブルの共通カラムを特定
        FOR col_record IN
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = backup_table_name
            AND column_name IN (
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'user_profiles'
            )
        LOOP
            -- user_idカラムの名前を調整（idをuser_idにマップ）
            IF col_record.column_name = 'id' THEN
                columns_to_migrate := array_append(columns_to_migrate, 'user_id');
                values_to_select := array_append(values_to_select, 'id');
            ELSE
                columns_to_migrate := array_append(columns_to_migrate, col_record.column_name);
                values_to_select := array_append(values_to_select, col_record.column_name);
            END IF;
        END LOOP;
        
        -- display_nameとemailを特別処理
        IF 'display_name' = ANY(columns_to_migrate) THEN
            -- display_nameが既に存在する場合はそのまま使用
            NULL;
        ELSE
            -- display_nameが存在しない場合は生成
            columns_to_migrate := array_append(columns_to_migrate, 'display_name');
            IF 'email' IN (
                SELECT column_name FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = backup_table_name
            ) THEN
                values_to_select := array_append(values_to_select, 'COALESCE(email, split_part(email, ''@'', 1))');
            ELSE
                values_to_select := array_append(values_to_select, 'NULL');
            END IF;
        END IF;
        
        -- emailカラムの処理
        IF NOT 'email' = ANY(columns_to_migrate) THEN
            columns_to_migrate := array_append(columns_to_migrate, 'email');
            values_to_select := array_append(values_to_select, 'NULL');
        END IF;
        
        -- マイグレーションクエリを構築・実行
        IF array_length(columns_to_migrate, 1) > 0 THEN
            migration_query := format(
                'INSERT INTO public.user_profiles (%s) SELECT %s FROM public.%s ON CONFLICT (user_id) DO NOTHING',
                array_to_string(columns_to_migrate, ', '),
                array_to_string(values_to_select, ', '),
                backup_table_name
            );
            
            RAISE NOTICE 'Executing migration query: %', migration_query;
            EXECUTE migration_query;
            RAISE NOTICE 'Data migration completed from %', backup_table_name;
        ELSE
            RAISE NOTICE 'No compatible columns found for migration';
        END IF;
    ELSE
        RAISE NOTICE 'No backup table found, skipping data migration';
    END IF;
END
$$;

-- Step 4: 既存ユーザーのuser_profilesレコードを確実に作成
INSERT INTO public.user_profiles (user_id, display_name, email, full_name, role)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1)),
    u.email,
    u.raw_user_meta_data->>'full_name',
    COALESCE(u.raw_user_meta_data->>'role', 'worker')
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.user_profiles)
ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    role = COALESCE(EXCLUDED.role, user_profiles.role);

-- Step 5: profilesビューを作成（AuthContextが期待する構造）
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
    COALESCE(p.is_active, true) AS is_active,
    COALESCE(p.profit_visible, false) AS profit_visible,
    COALESCE(p.cross_project_visible, false) AS cross_project_visible,
    COALESCE(p.created_at, u.created_at) AS created_at,
    COALESCE(p.updated_at, u.updated_at) AS updated_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id;

-- profilesビューにコメントを追加
COMMENT ON VIEW public.profiles IS 'ユーザープロフィール情報のビュー（auth.usersとuser_profilesの結合）AuthContext用';

-- Step 6: user_profilesテーブルのRLS（Row Level Security）を有効化
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 既存のRLSポリシーを削除（エラーが出ても無視）
DROP POLICY IF EXISTS "read_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "upsert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can only access their own user_profile" ON public.user_profiles;

-- Step 7: 新しいRLSポリシーを作成

-- 読み取りポリシー: 自分のプロフィールのみ読み取り可能
CREATE POLICY "read_own_profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- 挿入ポリシー: 自分のプロフィールのみ作成可能
CREATE POLICY "insert_own_profile"
    ON public.user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 更新ポリシー: 自分のプロフィールのみ更新可能
CREATE POLICY "update_own_profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Step 8: 権限を付与
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.profiles TO authenticated, anon;  -- ビューへの読み取り権限
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;  -- テーブルへの権限

-- Step 9: updated_atトリガーを作成/更新
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーを削除してから新規作成
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER handle_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Step 10: 新規ユーザー登録時に自動的にuser_profilesレコードを作成するトリガー関数を作成/更新
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- user_profilesテーブルにレコードを作成
    INSERT INTO public.user_profiles (
        user_id, 
        display_name, 
        email, 
        full_name,
        role
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        email = COALESCE(EXCLUDED.email, user_profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        role = COALESCE(EXCLUDED.role, user_profiles.role);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除してから新規作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 11: companiesテーブルが存在しない場合は外部キー制約を削除
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'companies'
    ) THEN
        -- companiesテーブルが存在しない場合、外部キー制約を削除
        ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_company_id_fkey;
        RAISE NOTICE 'Removed foreign key constraint to companies table (table does not exist)';
    END IF;
END
$$;

-- =============================================
-- マイグレーション完了
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'マイグレーション完了！';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '実行内容:';
    RAISE NOTICE '1. 既存のprofilesテーブルをprofiles_backup_XXXXXXXXにリネーム';
    RAISE NOTICE '2. user_profilesテーブルを作成（AuthContext期待構造）';
    RAISE NOTICE '3. バックアップテーブルからデータを安全に移行';
    RAISE NOTICE '4. profilesビューを作成（auth.users + user_profiles結合）';
    RAISE NOTICE '5. RLSポリシーを設定';
    RAISE NOTICE '6. 新規ユーザー自動作成トリガーを設定';
    RAISE NOTICE '7. 適切な権限を付与';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '確認用クエリ:';
    RAISE NOTICE 'SELECT * FROM public.profiles WHERE user_id = auth.uid();';
    RAISE NOTICE 'SELECT * FROM public.user_profiles WHERE user_id = auth.uid();';
    RAISE NOTICE '==============================================';
END
$$;