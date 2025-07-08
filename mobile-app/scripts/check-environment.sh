#!/bin/bash
# 開発環境チェックスクリプト

echo "🔍 Crafdy Mobile 開発環境をチェックしています..."
echo ""

# Node.js チェック
echo "📦 Node.js:"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "  ✅ インストール済み: $NODE_VERSION"
    
    # バージョンチェック (v18以上推奨)
    MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo "  ✅ バージョンOK (v18以上)"
    else
        echo "  ⚠️  推奨バージョンはv18以上です"
    fi
else
    echo "  ❌ Node.jsがインストールされていません"
fi

echo ""

# npm チェック
echo "📦 npm:"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "  ✅ インストール済み: v$NPM_VERSION"
else
    echo "  ❌ npmがインストールされていません"
fi

echo ""

# NVM チェック
echo "🔧 NVM:"
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    echo "  ✅ インストール済み"
    \. "$NVM_DIR/nvm.sh"
    if nvm list | grep -q "v22.17.0"; then
        echo "  ✅ Node.js v22.17.0 利用可能"
    else
        echo "  ⚠️  Node.js v22.17.0がインストールされていません"
    fi
else
    echo "  ⚠️  NVMがインストールされていません"
fi

echo ""

# Expo CLI チェック
echo "📱 Expo CLI:"
if command -v expo &> /dev/null; then
    EXPO_VERSION=$(expo --version)
    echo "  ✅ インストール済み: v$EXPO_VERSION"
elif npx expo --version &> /dev/null; then
    echo "  ✅ npx経由で利用可能"
else
    echo "  ⚠️  Expo CLIが見つかりません"
fi

echo ""

# プロジェクトの依存関係チェック
echo "📁 プロジェクト依存関係:"
cd "$(dirname "$0")/.."

if [ -f "package.json" ]; then
    echo "  ✅ package.json 存在"
    
    if [ -d "node_modules" ]; then
        echo "  ✅ node_modules 存在"
        
        # 主要パッケージの確認
        PACKAGES=("expo" "@supabase/supabase-js" "react-native" "expo-router")
        for package in "${PACKAGES[@]}"; do
            if [ -d "node_modules/$package" ]; then
                echo "  ✅ $package インストール済み"
            else
                echo "  ❌ $package がインストールされていません"
            fi
        done
    else
        echo "  ❌ node_modules が存在しません (npm install を実行してください)"
    fi
else
    echo "  ❌ package.json が見つかりません"
fi

echo ""

# 設定ファイルチェック
echo "⚙️  設定ファイル:"
CONFIG_FILES=("app.json" "babel.config.js" "tsconfig.json")
for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file 存在"
    else
        echo "  ❌ $file が見つかりません"
    fi
done

echo ""

# データベースファイルチェック
echo "🗄️  データベース:"
if [ -f "supabase-schema.sql" ]; then
    echo "  ✅ データベーススキーマファイル存在"
else
    echo "  ❌ supabase-schema.sql が見つかりません"
fi

if [ -f "lib/supabase.ts" ]; then
    echo "  ✅ Supabase設定ファイル存在"
else
    echo "  ❌ lib/supabase.ts が見つかりません"
fi

echo ""

# 推奨事項
echo "💡 推奨事項:"
echo "1. Node.js v18以上を使用してください"
echo "2. 定期的に 'npm update' で依存関係を更新してください"
echo "3. Expo Go アプリをスマートフォンにインストールしてください"
echo "4. Supabaseプロジェクトを作成して接続情報を設定してください"

echo ""
echo "✅ 環境チェック完了!"