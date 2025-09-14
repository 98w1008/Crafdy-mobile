#!/bin/bash
# Supabaseデータベースセットアップスクリプト

echo "🗄️  Supabaseデータベースをセットアップしています..."

# Supabase CLIがインストールされているかチェック
if ! command -v supabase &> /dev/null
then
    echo "📦 Supabase CLIをインストールしています..."
    npm install -g supabase
fi

# プロジェクトディレクトリに移動
cd "$(dirname "$0")/.."

echo ""
echo "🔧 データベースセットアップの手順:"
echo ""
echo "1. Supabaseプロジェクトを作成してください:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2. プロジェクトの設定から以下の情報を取得してください:"
echo "   - Project URL"
echo "   - anon public key"
echo ""
echo "3. lib/supabase.ts ファイルの接続情報を更新してください"
echo ""
echo "4. 以下のコマンドでデータベーススキーマを適用してください:"
echo ""

# スキーマファイルの存在確認
if [ -f "supabase-schema.sql" ]; then
    echo "✅ データベーススキーマファイルが見つかりました"
    echo ""
    echo "📝 Supabaseダッシュボードでの手動セットアップ手順:"
    echo ""
    echo "1. https://supabase.com/dashboard でプロジェクトを開く"
    echo "2. 左メニューの 'SQL Editor' をクリック"
    echo "3. 'New Query' をクリック"
    echo "4. supabase-schema.sql の内容をコピー&ペースト"
    echo "5. 'Run' ボタンをクリックしてスキーマを実行"
    echo ""
    echo "または、Supabase CLI を使用:"
    echo "supabase db reset"
    echo ""
else
    echo "❌ データベーススキーマファイル (supabase-schema.sql) が見つかりません"
    exit 1
fi

echo "🔐 認証設定:"
echo "1. Authentication > Settings で以下を設定:"
echo "   - Enable email confirmations: OFF (開発中)"
echo "   - Enable phone confirmations: OFF (開発中)"
echo ""
echo "2. Authentication > URL Configuration:"
echo "   - Site URL: exp://localhost:8081 (開発用)"
echo "   - Redirect URLs: exp://localhost:8081 (開発用)"
echo ""

echo "📊 データベーステーブル構成:"
echo "- companies (会社情報)"
echo "- users (ユーザー情報)"  
echo "- projects (プロジェクト)"
echo "- reports (日報)"
echo "- costs (原価)"
echo "- receipts (レシート・OCR)"
echo "- estimates (見積書)"
echo "- estimate_items (見積項目)"
echo "- subscriptions (サブスクリプション)"
echo "- project_members (プロジェクトメンバー)"
echo "- ai_coaching (AIコーチング履歴)"
echo ""

echo "🔒 セキュリティ機能:"
echo "- Row Level Security (RLS) 有効"
echo "- 会社単位でのデータ分離"
echo "- 認証済みユーザーのみアクセス可能"
echo ""

echo "✅ データベースセットアップガイド完了!"
echo ""
echo "🚀 次のステップ:"
echo "1. Supabaseプロジェクトを作成"
echo "2. 接続情報を lib/supabase.ts に設定"
echo "3. スキーマを適用"
echo "4. アプリをテスト"