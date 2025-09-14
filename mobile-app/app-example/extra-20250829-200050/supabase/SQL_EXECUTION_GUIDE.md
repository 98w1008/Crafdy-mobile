# データベース修正作業 - 実行手順書

## 概要
このドキュメントでは、2つのデータベースエラーを解決するための実行手順を説明します。

### 修正対象の問題
- **問題①**: プロフィールが自動作成されない問題 (PGRST116)
- **問題②**: usersテーブルへのアクセス権限エラー (42501)

---

## 🔧 問題① プロフィール自動作成の修正

### 症状
新規ユーザーがサインアップした際に、`public.profiles`テーブルに対応するレコードが自動作成されない

### 解決方法
SQLトリガーを使用して、`auth.users`テーブルにレコードが挿入された際に自動的に`public.profiles`テーブルにプロフィールを作成

### 実行手順

#### 1. Supabaseダッシュボードにアクセス
1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. 該当するプロジェクトを選択
3. 左側メニューから「SQL Editor」を選択

#### 2. SQLマイグレーションの実行
1. 新しいクエリを作成
2. 以下のファイルの内容をコピー&ペースト：
   ```
   mobile-app/supabase/migrations/005_profile_auto_creation_trigger.sql
   ```
3. 「RUN」ボタンをクリックして実行

#### 3. 実行結果の確認
以下のクエリで設定が正しく適用されているか確認：

```sql
-- トリガーの確認
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 関数の確認
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- RLSポリシーの確認
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

#### 4. 既存ユーザーのプロフィール作成（必要に応じて）
```sql
-- 既存ユーザーでプロフィールが無い場合のバッチ処理
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

#### 5. 動作テスト
1. 新規ユーザーでサインアップを実行
2. `public.profiles`テーブルにレコードが自動作成されることを確認

---

## 🔧 問題② JOINクエリの修正

### 症状
`chat.tsx`でメッセージ履歴を取得する際に、`auth.users`テーブルに直接アクセスして権限エラー (42501) が発生

### 解決方法
`auth.users`テーブルではなく`public.profiles`テーブルをJOINするようにクエリを修正

### 修正されたファイル
- `mobile-app/app/projects/[id]/chat.tsx`

### 主な変更点

#### 変更前：
```typescript
users (
  full_name,
  email
)
```

#### 変更後：
```typescript
profiles!reports_user_id_fkey (
  full_name,
  email
)
```

### 動作テスト
1. プロジェクトの日報チャット画面にアクセス
2. メッセージ履歴が正常に表示されることを確認
3. 投稿者名が正しく表示されることを確認

---

## 🚀 全体的な実行手順

### 1. SQLマイグレーションの実行
```bash
# Supabaseダッシュボードで実行
# または supabase CLI を使用する場合：
supabase db push
```

### 2. アプリケーションの更新
```bash
# 変更されたファイルをコミット
git add .
git commit -m "Fix: プロフィール自動作成とJOINクエリの修正"
```

### 3. 動作確認
1. 新規ユーザーでサインアップ
2. プロフィールが自動作成されることを確認
3. チャット機能でメッセージ履歴が正常に表示されることを確認

---

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. トリガーが動作しない
**原因**: 既存のトリガーが競合している  
**解決方法**: 
```sql
-- 既存のトリガーを確認
SELECT * FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;

-- 不要なトリガーを削除
DROP TRIGGER IF EXISTS [トリガー名] ON auth.users;
```

#### 2. RLS権限エラー
**原因**: Row Level Security ポリシーが正しく設定されていない  
**解決方法**:
```sql
-- RLSポリシーの確認
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 必要に応じてポリシーを再作成
```

#### 3. 外部キー制約エラー
**原因**: `reports`テーブルと`profiles`テーブルの外部キー関係が設定されていない  
**解決方法**:
```sql
-- 外部キー制約を追加
ALTER TABLE public.reports 
ADD CONSTRAINT reports_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);
```

---

## 📊 実行後の確認チェックリスト

### ✅ 確認項目

- [ ] トリガー関数が正しく作成されている
- [ ] トリガーが`auth.users`テーブルに設定されている
- [ ] RLSポリシーが適切に設定されている
- [ ] 新規ユーザーでプロフィールが自動作成される
- [ ] チャット機能でメッセージ履歴が表示される
- [ ] 投稿者名が正しく表示される
- [ ] アプリケーションエラーが解消されている

### 📞 サポート
問題が解決しない場合は、以下の情報と共にお問い合わせください：
- エラーメッセージの詳細
- 実行したSQLクエリ
- Supabaseのログ出力
- ブラウザの開発者ツールのエラー