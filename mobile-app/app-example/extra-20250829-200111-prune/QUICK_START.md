# 🚀 Crafdy Mobile - クイックスタートガイド

## 今すぐアプリを起動する手順

### ステップ1: 環境チェック
```bash
cd /Users/watanabekuuya/Crafdy-mobile/mobile-app
./scripts/check-environment.sh
```

### ステップ2: Node.js セットアップ
```bash
./scripts/setup-node.sh
```

### ステップ3: 開発サーバー起動
```bash
./scripts/start-dev.sh
```

### ステップ4: スマートフォンでテスト
1. **Expo Go** アプリをインストール
2. QRコードをスキャン
3. アプリが起動！

---

## 🔧 問題が発生した場合

### Node.jsエラー
```bash
# NVMでNode.js v22.17.0に切り替え
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22.17.0
```

### アプリが起動しない
```bash
# キャッシュクリア
npx expo start --clear
```

### パッケージエラー
```bash
# 依存関係を再インストール
rm -rf node_modules
npm install
npx expo install --fix
```

---

## 📱 主要な操作コマンド

```bash
# 開発サーバー起動
npm start

# Android で起動
npm run android

# iOS で起動  
npm run ios

# リンター実行
npm run lint
```

---

詳細な手順は `USER_GUIDE.md` を参照してください。