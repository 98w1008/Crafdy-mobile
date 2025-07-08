#!/bin/bash
# 完全クリーンスタートスクリプト

echo "🧹 プロジェクトを完全にクリーンアップしています..."

# すべてのExpoプロセスを停止
pkill -f expo
pkill -f metro
sleep 2

# キャッシュを完全削除
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro

# Node.js環境をセットアップ
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22.17.0

echo "✅ クリーンアップ完了"
echo "🚀 開発サーバーを起動しています..."

# 開発サーバーを起動
npm start