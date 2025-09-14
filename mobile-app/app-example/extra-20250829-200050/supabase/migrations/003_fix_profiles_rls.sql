-- =============================================
-- Crafdy Mobile - Fix Profiles RLS Policies
-- =============================================
-- このマイグレーションは、profilesテーブルのRLSポリシーの
-- 無限再帰エラーを修正します。
--
-- 実行内容:
-- 1. 既存のprofilesテーブルのRLSポリシーをすべて削除
-- 2. 新しい安全なRLSポリシーを2つ作成
-- =============================================

-- 1. 既存のprofilesテーブルのRLSポリシーをすべて削除
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of same company" ON public.profiles;

-- 念のため、他の名前のポリシーも削除（存在する場合）
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.profiles;

-- 2. 新しいRLSポリシーを作成

-- ポリシー1: 自分のプロフィールは、自分だけが読み書きできる
CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ポリシー2: 同じ会社のメンバーの公開情報は閲覧できる
CREATE POLICY "Users can view same company profiles" ON public.profiles
    FOR SELECT 
    USING (
        company_id IS NOT NULL 
        AND company_id = (
            SELECT p.company_id 
            FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id IS NOT NULL
        )
    );

-- 3. RLSが有効になっていることを確認
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- マイグレーション完了
-- =============================================
-- 実行後の確認:
-- 1. 新しいポリシーが作成されていることを確認
-- 2. ユーザーが自分のプロフィールにアクセスできることを確認
-- 3. 同じ会社のメンバーのプロフィールが閲覧できることを確認
-- =============================================