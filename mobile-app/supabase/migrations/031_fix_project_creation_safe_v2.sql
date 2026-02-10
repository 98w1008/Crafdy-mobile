-- =============================================
-- Crafdy Mobile - Safe Fix for Project Creation
-- =============================================
-- 目的: 既存の依存関係を壊さずに現場作成を成功させる
-- 1. same_company関数の安全な更新 (引数名 target を維持)
-- 2. projects.created_by の追加とデフォルト値設定
-- 3. projects_users のRLS再帰排除 (自己完結ポリシー)
-- 4. projects のRLS整理 (作成者権限 + メンバー閲覧)
-- 5. スキーマキャッシュのリロード
-- =============================================

BEGIN;

-- 1. same_company関数の安全な更新
-- 引数名を "target" に維持することで 42P13 (引数名不一致) と 2BP01 (依存関係エラー) を回避
-- SECURITY DEFINER と search_path を明示して安全性を確保
CREATE OR REPLACE FUNCTION public.same_company(target UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = auth.uid() AND p.company_id = target
  );
$$;

-- 2. projectsテーブルの created_by カラム修正
DO $$
BEGIN
    -- カラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'created_by') THEN
        ALTER TABLE public.projects ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    
    -- デフォルト値の設定 (auth.uid())
    ALTER TABLE public.projects ALTER COLUMN created_by SET DEFAULT auth.uid();
END $$;

-- 3. projects_usersテーブルのRLS修正 (再帰の排除)
ALTER TABLE public.projects_users ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除 (projects_users に関するもののみ)
DROP POLICY IF EXISTS "Users can view project memberships they are part of" ON public.projects_users;
DROP POLICY IF EXISTS "Managers can manage project memberships" ON public.projects_users;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.projects_users;
DROP POLICY IF EXISTS "Parents can manage project members" ON public.projects_users;
DROP POLICY IF EXISTS "projects_users_self_manage" ON public.projects_users;
DROP POLICY IF EXISTS "projects_users_owner_manage" ON public.projects_users;
DROP POLICY IF EXISTS "projects_users_simple_mvp" ON public.projects_users;
DROP POLICY IF EXISTS "projects_users_self_manage_final" ON public.projects_users;

-- 自己完結ポリシー: 自分の行のみ操作可能 (projectsを参照しない = 再帰なし)
CREATE POLICY "projects_users_self_manage_safe" ON public.projects_users
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. projectsテーブルのRLS修正
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 既存ポリシー削除 (projects に関するもののみ)
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
DROP POLICY IF EXISTS "projects_creator_access" ON public.projects;
DROP POLICY IF EXISTS "projects_member_view" ON public.projects;
DROP POLICY IF EXISTS "projects_creator_access_final" ON public.projects;
DROP POLICY IF EXISTS "projects_member_view_final" ON public.projects;

-- 作成者はフルアクセス (created_by = auth.uid())
CREATE POLICY "projects_creator_access_safe" ON public.projects
    FOR ALL
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- メンバーは閲覧のみ (projects_usersを参照。projects_users側はprojectsを見ていないので安全)
CREATE POLICY "projects_member_view_safe" ON public.projects
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects_users pu
            WHERE pu.project_id = id
            AND pu.user_id = auth.uid()
        )
    );

-- 5. 権限の再適用 (authenticatedのみ)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;

-- 6. キャッシュリロード (PGRST204回避)
NOTIFY pgrst, 'reload config';

COMMIT;

-- 7. 確認用クエリ
SELECT 'Migration completed' as status;

-- カラム確認
SELECT table_name, column_name, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'created_by';

-- ポリシー確認
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('projects', 'projects_users');
