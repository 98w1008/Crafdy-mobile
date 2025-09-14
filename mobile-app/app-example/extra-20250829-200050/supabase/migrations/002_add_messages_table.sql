-- =============================================
-- Crafdy Mobile - Messages Table Migration
-- =============================================
-- このマイグレーションは、チャット機能で使用する
-- messagesテーブルを作成します。
-- =============================================

-- 1. messagesテーブルを作成
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_user BOOLEAN NOT NULL DEFAULT false,
    sender_name TEXT,
    metadata JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- messagesテーブルにコメントを追加
COMMENT ON TABLE public.messages IS 'チャットメッセージ';
COMMENT ON COLUMN public.messages.thread_id IS 'スレッドID（プロジェクトID、会社ID、またはsupport等）';
COMMENT ON COLUMN public.messages.content IS 'メッセージ内容';
COMMENT ON COLUMN public.messages.is_user IS 'ユーザーメッセージかどうか（false=AI/システム）';
COMMENT ON COLUMN public.messages.sender_name IS '送信者名';
COMMENT ON COLUMN public.messages.metadata IS 'メッセージメタデータ（JSON）';
COMMENT ON COLUMN public.messages.created_by IS 'メッセージ作成者';

-- messagesテーブルのRLS（Row Level Security）を有効化
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- messagesテーブルのRLSポリシーを作成
-- ユーザーは自分が参加しているスレッドのメッセージのみ閲覧・作成可能
CREATE POLICY "Users can view messages of threads they participate in" ON public.messages
    FOR SELECT USING (
        -- プロジェクトスレッドの場合
        (thread_id IN (
            SELECT p.id::text
            FROM public.projects p
            JOIN public.projects_users pu ON p.id = pu.project_id
            WHERE pu.user_id = auth.uid()
        ))
        OR
        -- 会社スレッドの場合
        (thread_id LIKE 'company-%' AND SUBSTRING(thread_id FROM 9) IN (
            SELECT pr.company_id::text
            FROM public.profiles pr
            WHERE pr.id = auth.uid()
        ))
        OR
        -- サポートスレッドの場合
        (thread_id = 'support')
    );

-- ユーザーはメッセージを作成可能
CREATE POLICY "Users can create messages" ON public.messages
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        (
            -- プロジェクトスレッドの場合
            (thread_id IN (
                SELECT p.id::text
                FROM public.projects p
                JOIN public.projects_users pu ON p.id = pu.project_id
                WHERE pu.user_id = auth.uid()
            ))
            OR
            -- 会社スレッドの場合
            (thread_id LIKE 'company-%' AND SUBSTRING(thread_id FROM 9) IN (
                SELECT pr.company_id::text
                FROM public.profiles pr
                WHERE pr.id = auth.uid()
            ))
            OR
            -- サポートスレッドの場合
            (thread_id = 'support')
        )
    );

-- 2. messagesテーブルのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON public.messages(thread_id, created_at);

-- 3. updated_atトリガーを作成
DROP TRIGGER IF EXISTS handle_messages_updated_at ON public.messages;
CREATE TRIGGER handle_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. projectsテーブルにprogressカラムを追加（存在しない場合）
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

COMMENT ON COLUMN public.projects.progress IS 'プロジェクトの進捗率（0-100）';

-- 5. 既存のprojectsにダミーの進捗率を設定
UPDATE public.projects 
SET progress = FLOOR(RANDOM() * 100) + 1
WHERE progress IS NULL OR progress = 0;

-- =============================================
-- マイグレーション完了
-- =============================================