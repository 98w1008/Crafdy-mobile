-- =============================================
-- プロフィール自動作成トリガー設定
-- =============================================
-- 新規ユーザー登録時にpublic.profilesテーブルに
-- 対応するレコードを自動作成するトリガー
-- =============================================



-- =============================================
-- 実行結果確認用クエリ
-- =============================================
-- 以下のクエリで設定を確認できます:
-- 
-- 1. トリガーの確認
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- 
-- 2. 関数の確認
-- SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
-- 
-- 3. RLSポリシーの確認
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
-- 
-- 4. 既存ユーザーのプロフィール作成（必要に応じて）
-- INSERT INTO public.profiles (id, email, full_name)
-- SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
-- FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.profiles);
-- =============================================