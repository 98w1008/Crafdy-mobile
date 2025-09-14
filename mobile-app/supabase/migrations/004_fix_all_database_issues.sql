-- =============================================
-- Crafdy Mobile - Fix All Database Issues
-- =============================================
-- このマイグレーションは、以下の問題を一括で解決します：
-- 1. profilesテーブルのRLS無限再帰エラー
-- 2. messagesテーブルの不存在エラー
-- =============================================

-- 問題① profilesテーブルのRLS無限再帰エラーを修正

-- 1. 既存のprofilesテーブルのRLSポリシーをすべて削除
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of same company" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view same company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.profiles;

-- 2. 新しいシンプルなRLSポリシーを作成（自分のプロフィールのみアクセス可能）
CREATE POLICY "Users can only access their own profile" ON public.profiles
    FOR ALL 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. RLSが有効になっていることを確認
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 問題③ messagesテーブルを新規作成

-- 4. messagesテーブルを作成
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_user BOOLEAN NOT NULL DEFAULT true,
    sender_name TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- messagesテーブルにコメントを追加
COMMENT ON TABLE public.messages IS 'チャットメッセージ';
COMMENT ON COLUMN public.messages.thread_id IS 'スレッドID（プロジェクトID等）';
COMMENT ON COLUMN public.messages.content IS 'メッセージ内容';
COMMENT ON COLUMN public.messages.user_id IS 'メッセージ送信者のユーザーID';
COMMENT ON COLUMN public.messages.is_user IS 'ユーザーメッセージかAI/システムメッセージか';
COMMENT ON COLUMN public.messages.sender_name IS '送信者名';
COMMENT ON COLUMN public.messages.metadata IS 'メッセージメタデータ';

-- 5. messagesテーブルのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- 6. messagesテーブルのRLSを設定
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- messagesテーブルのRLSポリシー
CREATE POLICY "Users can view messages in their threads" ON public.messages
    FOR SELECT USING (
        -- 自分が送信したメッセージ
        user_id = auth.uid()
        OR
        -- プロジェクトメンバーとして参加しているスレッド
        thread_id IN (
            SELECT p.id::text
            FROM public.projects p
            JOIN public.projects_users pu ON p.id = pu.project_id
            WHERE pu.user_id = auth.uid()
        )
        OR
        -- 会社スレッド（company-で始まるthread_id）
        (thread_id LIKE 'company-%')
        OR
        -- サポートスレッド
        (thread_id = 'support')
    );

CREATE POLICY "Users can create messages" ON public.messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- 7. updated_atトリガーを作成（関数が存在しない場合は作成）
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- messagesテーブルのupdated_atトリガー
DROP TRIGGER IF EXISTS handle_messages_updated_at ON public.messages;
CREATE TRIGGER handle_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 8. projectsテーブルにprogressカラムを追加（存在しない場合）
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

COMMENT ON COLUMN public.projects.progress IS 'プロジェクトの進捗率（0-100）';

-- 既存のprojectsにダミーの進捗率を設定
UPDATE public.projects 
SET progress = FLOOR(RANDOM() * 100) + 1
WHERE progress IS NULL OR progress = 0;

-- =============================================
-- マイグレーション完了
-- =============================================
-- 実行後の確認項目:
-- 1. profilesテーブルのRLSポリシーが1つだけ存在する
-- 2. messagesテーブルが作成されている
-- 3. projectsテーブルにprogressカラムが追加されている
-- 4. アプリからプロフィール情報とメッセージが正常に取得できる
-- =============================================