# Supabase ロールベース権限管理 セットアップガイド

このガイドでは、Crafdy Mobileアプリのロールベース権限管理システムをSupabaseに実装する手順を説明します。

## 🎯 実装される機能

- **ユーザーロール管理**: worker(職人), manager(現場監督), admin(管理者), owner(会社経営者)
- **プロフィール管理**: 氏名、アバター、所属会社などの公開情報
- **プロジェクトメンバー管理**: どのユーザーがどの現場に参加しているか
- **会社管理**: 複数の会社での利用をサポート

## 📋 事前準備

1. Supabaseプロジェクトにログインしてください
2. 対象のプロジェクトのダッシュボードを開いてください
3. OTPレート制限を有効化するために `supabase/config.toml` を最新化してください（後述）

### OTPレート制限（必須）

`mobile-app/supabase/config.toml` では `/otp` エンドポイントのレート制限をメール/SMS/検証それぞれ 60 秒あたり 3〜10 回に抑える設定を追加しています。Supabase CLI を利用している場合は `supabase start` 時に自動で反映されます。既存プロジェクトに適用する際はダッシュボードの **Settings → Configuration → Auth** で同等の設定値を入力するか、`supabase deploy` を実行してください。

## 🚀 実装手順

### ステップ1: SQL Editorを開く

1. Supabaseダッシュボードの左側メニューから「**SQL Editor**」をクリック
2. 「**New query**」ボタンをクリック

### ステップ2: マイグレーションSQLを実行

1. 新しいクエリエディタが開いたら、以下のファイルの内容をコピー&ペースト：
   ```
   /Users/watanabekuuya/Crafdy-mobile/mobile-app/supabase/migrations/001_role_based_permissions.sql
   ```

2. 右下の「**Run**」ボタンをクリックして実行
   - 成功すると "Success. No rows returned" と表示されます
   - エラーが出た場合は、エラーメッセージを確認して修正してください

### ステップ3: 作成されたテーブルを確認

1. 左側メニューから「**Table Editor**」をクリック
2. 以下のテーブルが作成されていることを確認：
   - **auth.users** (roleカラムが追加済み)
   - **profiles** (新規作成)
   - **projects_users** (新規作成)
   - **companies** (新規作成)

## 🔍 各テーブルの確認方法

### auth.users テーブル

1. Table Editorで「**auth**」スキーマを選択
2. 「**users**」テーブルをクリック
3. カラム一覧に「**role**」カラムが追加されていることを確認
4. デフォルト値が「worker」になっていることを確認

### profiles テーブル

1. Table Editorで「**public**」スキーマを選択
2. 「**profiles**」テーブルをクリック
3. 以下のカラムが存在することを確認：
   - `id` (UUID, Primary Key)
   - `full_name` (TEXT)
   - `avatar_url` (TEXT)
   - `company_id` (UUID, Foreign Key)
   - `phone` (TEXT)
   - `position` (TEXT)
   - `bio` (TEXT)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

### projects_users テーブル

1. Table Editorで「**public**」スキーマを選択
2. 「**projects_users**」テーブルをクリック
3. 以下のカラムが存在することを確認：
   - `id` (UUID, Primary Key)
   - `project_id` (UUID, Foreign Key)
   - `user_id` (UUID, Foreign Key)
   - `joined_at` (TIMESTAMP)
   - `created_at` (TIMESTAMP)

### companies テーブル

1. Table Editorで「**public**」スキーマを選択
2. 「**companies**」テーブルをクリック
3. 以下のカラムが存在することを確認：
   - `id` (UUID, Primary Key)
   - `name` (TEXT)
   - `description` (TEXT)
   - `address` (TEXT)
   - `phone` (TEXT)
   - `email` (TEXT)
   - `website` (TEXT)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

## 🧪 動作テスト

### 1. 新規ユーザーの作成テスト

1. 「**Authentication**」メニューから「**Users**」を選択
2. 「**Add user**」ボタンをクリック
3. テストユーザーを作成：
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm password: `password123`
4. 「**Create user**」をクリック

### 2. 自動プロフィール作成の確認

1. 「**Table Editor**」→「**profiles**」テーブルを確認
2. 新規作成したユーザーのプロフィールが自動的に作成されているか確認
3. `id`が`auth.users`テーブルのユーザーIDと一致しているか確認

### 3. ロールの確認

1. 「**Table Editor**」→「**auth**」→「**users**」テーブルを確認
2. 新規ユーザーの`role`カラムが「worker」になっているか確認

## 🔐 セキュリティ設定の確認

### Row Level Security (RLS) の確認

1. 「**Authentication**」メニューから「**Policies**」を選択
2. 以下のポリシーが作成されていることを確認：
   - `profiles`テーブル用のポリシー
   - `projects_users`テーブル用のポリシー
   - `companies`テーブル用のポリシー

## 📊 テストデータの投入 (オプション)

### 会社データの作成

1. 「**Table Editor**」→「**companies**」を選択
2. 「**Insert**」→「**Insert row**」をクリック
3. 以下のデータを入力：
   ```
   name: "株式会社クラフディ"
   description: "建設・工事業"
   address: "東京都新宿区..."
   phone: "03-1234-5678"
   email: "info@crafdy.com"
   ```
4. 「**Save**」をクリック

### プロジェクトデータの作成

1. 「**Table Editor**」→「**projects**」を選択
2. 「**Insert**」→「Insert row**」をクリック
3. 以下のデータを入力：
   ```
   name: "A修繕工事"
   description: "外壁塗装工事"
   company_id: (上で作成した会社のID)
   ```
4. 「**Save**」をクリック

### プロジェクトメンバーの追加

1. 「**Table Editor**」→「**projects_users**」を選択
2. 「**Insert**」→「**Insert row**」をクリック
3. 以下のデータを入力：
   ```
   project_id: (上で作成したプロジェクトのID)
   user_id: (テストユーザーのID)
   ```
4. 「**Save**」をクリック

## ⚠️ トラブルシューティング

### エラー: "relation does not exist"

- `projects`テーブルが存在しない場合は、先に作成してください
- 既存のテーブル構造と整合性を確認してください

### エラー: "permission denied"

- RLS（Row Level Security）の設定を確認してください
- 必要に応じてポリシーを調整してください

### エラー: "duplicate key value"

- 既存のデータとの重複を確認してください
- 必要に応じて既存データを削除してから再実行してください

## 🎉 完了確認

すべての手順が完了したら、以下を確認してください：

- [ ] auth.usersテーブルにroleカラムが追加されている
- [ ] profilesテーブルが作成されている
- [ ] projects_usersテーブルが作成されている
- [ ] companiesテーブルが作成されている
- [ ] 新規ユーザー作成時にprofileが自動作成される
- [ ] RLSポリシーが適切に設定されている

## 🔗 次のステップ

このマイグレーションが完了したら、以下を実装できます：

1. **ロールベース機能制限**: アプリ内でユーザーロールに応じた機能制限
2. **プロフィール管理画面**: ユーザーが自分の情報を編集できる画面
3. **プロジェクトメンバー管理**: 現場監督が現場メンバーを管理できる機能
4. **会社管理機能**: 管理者が会社情報を管理できる機能

ご質問やエラーが発生した場合は、エラーメッセージと共にお知らせください。
