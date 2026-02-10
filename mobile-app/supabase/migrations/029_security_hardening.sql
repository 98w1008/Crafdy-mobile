-- =============================================
-- Phase 0: Security Hardening
-- Definition of Done:
-- 1. anon が join_project できない
-- 2. anon が projects/projects_users を INSERT/UPDATE できない
-- 3. 招待コード経由のみプロジェクト参加可能
-- =============================================

-- =============================================
-- 0-2. anon 権限の過剰付与を即 REVOKE
-- =============================================

-- projects テーブルから anon の INSERT/UPDATE 権限を削除
REVOKE INSERT, UPDATE ON public.projects FROM anon;

-- projects_users テーブルから anon の INSERT/UPDATE 権限を削除
REVOKE INSERT, UPDATE ON public.projects_users FROM anon;

-- SELECT 権限も削除（基本は authenticated のみ）
-- 必要に応じて公開プロジェクト用のポリシーを後で追加可能
REVOKE SELECT ON public.projects_users FROM anon;

-- =============================================
-- 0-1. join_project RPC を「認可必須」に作り直す
-- =============================================

-- 既存の危険な join_project(uuid) から anon 権限を削除
REVOKE EXECUTE ON FUNCTION public.join_project(uuid) FROM anon;

-- さらに安全のため、既存の join_project(uuid) を完全に無効化
-- （project_id 直指定は禁止、招待コード経由のみ許可）
DROP FUNCTION IF EXISTS public.join_project(uuid);

-- =============================================
-- 新規: 招待コード経由でのみプロジェクト参加可能な関数
-- =============================================

CREATE OR REPLACE FUNCTION public.join_project_with_code(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_project_id uuid;
  v_role text;
  v_invitation_id uuid;
BEGIN
  -- ユーザーID取得
  v_user_id := auth.uid();

  -- 匿名ユーザーを拒否（authenticated のみ）
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- 招待コードの検証と情報取得
  SELECT
    ic.id,
    ic.project_id,
    ic.role
  INTO
    v_invitation_id,
    v_project_id,
    v_role
  FROM public.invitation_codes ic
  WHERE ic.code = p_invite_code
    AND ic.is_active = true
    AND ic.expires_at > NOW()
    AND ic.used_at IS NULL;

  -- 招待コードが無効または存在しない
  IF v_invitation_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation code'
    );
  END IF;

  -- プロジェクトメンバーとして追加（projects_users テーブル）
  INSERT INTO public.projects_users (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, v_role)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- 招待コードを使用済みにマーク
  UPDATE public.invitation_codes
  SET
    used_at = NOW(),
    used_by = v_user_id,
    is_active = false
  WHERE id = v_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'project_id', v_project_id,
    'user_id', v_user_id,
    'role', v_role
  );
END;
$$;

-- authenticated ユーザーのみに実行権限を付与
GRANT EXECUTE ON FUNCTION public.join_project_with_code(text) TO authenticated;

-- anon には実行権限を付与しない（明示的に記述）
REVOKE EXECUTE ON FUNCTION public.join_project_with_code(text) FROM anon;

-- =============================================
-- 0-3. RLS ポリシーの整合（再帰回避）
-- =============================================

-- projects_users のポリシーを自己完結型に統一
-- （projects テーブルを参照しないことで再帰を回避）

DROP POLICY IF EXISTS "projects_users_self_manage_safe" ON public.projects_users;
DROP POLICY IF EXISTS "Managers can manage project memberships" ON public.projects_users;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.projects_users;

-- 自分の行のみ管理可能（基本ポリシー）
CREATE POLICY "projects_users_self_manage" ON public.projects_users
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- プロジェクト作成者（created_by）がメンバーを管理できるポリシー
-- projects テーブルを参照するが、projects 側で projects_users を参照しないため再帰なし
CREATE POLICY "projects_users_creator_manage" ON public.projects_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND p.created_by = auth.uid()
        )
    );

-- =============================================
-- 検証用コメント
-- =============================================

-- 検証手順:
-- 1. 匿名で join_project できない（関数が存在しない or 403）
-- 2. 招待コード経由だけ参加できる（join_project_with_code）
-- 3. grep -RIn "auth.getSession(" ... が 0件（Phase 1で対応）
-- 4. grep -RIn "Authorization:.*anonKey" ... が 0件（Phase 1で対応）

-- 確認クエリ（開発環境で実行）:
-- SELECT * FROM pg_policies WHERE tablename = 'projects_users';
-- SELECT proname, proacl FROM pg_proc WHERE proname LIKE 'join_project%';
