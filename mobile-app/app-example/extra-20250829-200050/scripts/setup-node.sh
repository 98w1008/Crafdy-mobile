#!/bin/bash
# Node.js環境セットアップスクリプト

echo "🔧 Node.js環境をセットアップしています..."

# 現在のNode.jsバージョンを確認
CURRENT_NODE_VERSION=$(node -v 2>/dev/null || echo "not installed")
echo "現在のNode.jsバージョン: $CURRENT_NODE_VERSION"

# NVMがインストールされているかチェック
if ! command -v nvm &> /dev/null
then
    echo "⚠️  NVMが見つかりません。NVMをインストールしています..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # NVMを現在のセッションで有効化
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

# NVMを読み込み
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Node.js v22.17.0をインストール（まだない場合）
if ! nvm list | grep -q "v22.17.0"; then
    echo "📦 Node.js v22.17.0をインストールしています..."
    nvm install 22.17.0
fi

# Node.js v22.17.0に切り替え
echo "🔄 Node.js v22.17.0に切り替えています..."
nvm use 22.17.0

# バージョン確認
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)

echo "✅ セットアップ完了！"
echo "Node.js: $NODE_VERSION"
echo "npm: $NPM_VERSION"

# .nvmrcファイルを作成（プロジェクトディレクトリで自動的にバージョンが切り替わる）
echo "22.17.0" > ../.nvmrc
echo "📝 .nvmrcファイルを作成しました"

echo ""
echo "🚀 次のステップ:"
echo "1. ターミナルを再起動するか、以下のコマンドを実行してください:"
echo "   source ~/.bashrc  # または source ~/.zshrc"
echo "2. プロジェクトディレクトリに移動して 'nvm use' を実行してください"
echo "3. 'npm install' で依存関係をインストールしてください"