#!/bin/bash
# 確実にエラーを修正して起動するスクリプト

echo "🔧 根本的な問題を修正しています..."

# 1. 全てのプロセスを停止
echo "📛 既存プロセスを停止中..."
pkill -f expo 2>/dev/null
pkill -f metro 2>/dev/null
pkill -f node.*8081 2>/dev/null
pkill -f node.*8082 2>/dev/null
sleep 3

# 2. 全てのキャッシュとビルドファイルを削除
echo "🗑️  キャッシュを完全削除中..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro
rm -rf .expo-shared
rm -rf dist

# 3. Node.js環境の確認と設定
echo "🔧 Node.js環境を設定中..."
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
    nvm use 22.17.0
else
    echo "⚠️  NVMが見つかりません"
fi

# 4. Node.jsバージョンを確認
NODE_VERSION=$(node -v)
echo "使用中のNode.js: $NODE_VERSION"

# 5. npm cache を清理
echo "🧹 npm キャッシュをクリア中..."
npm cache clean --force

# 6. Metro bundler のキャッシュをリセット
echo "🔄 Metro bundlerをリセット中..."
npx react-native start --reset-cache 2>/dev/null &
sleep 2
pkill -f react-native 2>/dev/null

echo "✅ 修正完了！Expoサーバーを起動します..."

# 7. Expo開発サーバーを起動
npx expo start --clear --port 8081