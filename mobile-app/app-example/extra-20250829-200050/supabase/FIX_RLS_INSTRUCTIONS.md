# Supabase RLS無限再帰エラー修正ガイド

このガイドでは、profilesテーブルのRLS（Row Level Security）無限再帰エラーを修正する手順を説明します。

## ⚠️ 問題の概要

現在、profilesテーブルのRLSポリシーで無限再帰が発生し、以下のようなエラーが起きています：
- ユーザーのプロフィール情報が取得できない
- アプリでユーザー情報の表示でエラーになる

## 🛠️ 修正手順

### ステップ1: Supabase管理画面にアクセス

1. Supabaseプロジェクトのダッシュボードを開く
2. 左側メニューから **「SQL Editor」** をクリック

### ステップ2: 修正SQLの実行

1. SQL Editorで **「New query」** ボタンをクリック
2. 新しいクエリエディタが開いたら、以下のSQLコードをコピー&ペーストしてください：

```sql
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
```

3. 右下の **「Run」** ボタンをクリックして実行

### ステップ3: 実行結果の確認

正常に実行された場合、以下のような表示になります：
- ✅ "Success. No rows returned" または類似のメッセージ
- エラーメッセージが表示されない

## 🔍 修正内容の詳細

### 削除される古いポリシー
- `"Users can view and edit their own profile"`
- `"Users can view profiles of same company"`
- その他の既存ポリシー

### 新しく作成されるポリシー

#### ポリシー1: 自分のプロフィール管理
- **名前**: `"Users can manage their own profile"`
- **対象操作**: `FOR ALL`（読み取り、作成、更新、削除）
- **条件**: `auth.uid() = id`
- **効果**: ユーザーは自分のプロフィールのみ完全に管理可能

#### ポリシー2: 同じ会社のプロフィール閲覧
- **名前**: `"Users can view same company profiles"`
- **対象操作**: `FOR SELECT`（読み取りのみ）
- **条件**: 同じ会社IDを持つプロフィール
- **効果**: 同じ会社のメンバーの公開情報を閲覧可能

## ✅ 動作確認方法

### 1. Table Editorでポリシー確認
1. 左側メニューから **「Table Editor」** をクリック
2. **「public」** スキーマを選択
3. **「profiles」** テーブルをクリック
4. 上部の **「Policies」** タブをクリック
5. 新しいポリシーが2つ作成されていることを確認

### 2. アプリでの動作確認
1. Crafdy Mobileアプリを再起動
2. 設定画面でプロフィール情報が正常に表示されることを確認
3. エラーメッセージが表示されないことを確認

## 🚨 トラブルシューティング

### エラーが発生した場合
1. **構文エラー**: SQLをもう一度コピー&ペーストして実行
2. **権限エラー**: Supabaseプロジェクトの管理者権限があることを確認
3. **接続エラー**: インターネット接続とSupabaseの状態を確認

### それでも解決しない場合
1. Supabaseダッシュボードの **「Logs」** タブでエラーログを確認
2. エラーメッセージと共にサポートに問い合わせ

## 📝 注意事項

- この操作は**本番環境**に影響します
- 実行前にSupabaseプロジェクトのバックアップを取ることを推奨
- 修正後、アプリの動作を必ず確認してください

---

このガイドに従って実行することで、RLS無限再帰エラーが解決され、Crafdy Mobileアプリが正常に動作するようになります。