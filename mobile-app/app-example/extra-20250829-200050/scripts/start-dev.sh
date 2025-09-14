#!/bin/bash
# 開発サーバー起動スクリプト

echo "🚀 Crafdy Mobile 開発サーバーを起動しています..."

# NVMを読み込み
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# プロジェクトディレクトリに移動
cd "$(dirname "$0")/.."

# Node.jsバージョンを確認
if [ -f .nvmrc ]; then
    echo "📋 .nvmrcファイルを使用してNode.jsバージョンを設定..."
    nvm use
else
    echo "📋 Node.js v22.17.0を使用..."
    nvm use 22.17.0
fi

# 現在のバージョンを表示
echo "使用中のNode.js: $(node -v)"
echo "使用中のnpm: $(npm -v)"

# 依存関係がインストールされているかチェック
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストールしています..."
    npm install
fi

# パッケージの互換性をチェック
echo "🔍 パッケージの互換性をチェック..."
npx expo install --fix

echo ""
echo "🎯 開発サーバーを起動中..."
echo "📱 Expo Goアプリで表示されるQRコードをスキャンしてテストしてください"
echo ""
echo "💡 Tips:"
echo "   - QRコードが表示されない場合は、'c'を押してクリアしてください"
echo "   - 'r'を押すとアプリをリロードできます"
echo "   - Ctrl+Cで開発サーバーを停止できます"
echo ""

# Expo開発サーバーを起動
npm start