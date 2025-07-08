#!/bin/bash
# 完全修正スクリプト - タイムアウトエラーを根本解決

echo "🔧 タイムアウトエラーを根本的に修正しています..."

# 1. すべてのプロセスを強制停止
echo "📛 全プロセス停止中..."
pkill -f expo 2>/dev/null
pkill -f metro 2>/dev/null  
pkill -f node 2>/dev/null
sleep 3

# 2. Node.js環境設定
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22.17.0

echo "Node.js: $(node -v)"

# 3. 完全クリーンアップ
echo "🗑️  完全クリーンアップ中..."
rm -rf node_modules
rm -rf .expo
rm -rf .metro
rm -rf dist
rm -rf package-lock.json

# 4. 依存関係を再インストール
echo "📦 依存関係を再インストール中..."
npm install

# 5. Expo関連の互換性修正
echo "🔧 Expo互換性を修正中..."
npx expo install --fix

# 6. Metro bundlerキャッシュをクリア
echo "🧹 キャッシュを完全クリア..."
npx react-native start --reset-cache &
sleep 2
pkill -f react-native 2>/dev/null

# 7. localhost で起動（IPアドレスではなく）
echo "🚀 localhost でサーバーを起動中..."
npx expo start --localhost --clear

echo "✅ 修正完了！localhost:8081 でアクセスしてください"