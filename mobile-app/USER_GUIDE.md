# Crafdy Mobile - ユーザー操作ガイド

## 🚀 アプリの起動手順

### 1. 環境の確認
```bash
# プロジェクトディレクトリに移動
cd /Users/watanabekuuya/Crafdy-mobile/mobile-app

# 環境をチェック
chmod +x scripts/*.sh
./scripts/check-environment.sh
```

### 2. Node.js環境のセットアップ
```bash
# Node.jsバージョンを確認・セットアップ
./scripts/setup-node.sh

# ターミナルを再起動するか、以下を実行
source ~/.bashrc  # または source ~/.zshrc
```

### 3. 開発サーバーの起動
```bash
# 開発サーバーを起動
./scripts/start-dev.sh
```

### 4. スマートフォンでテスト
1. **Expo Go アプリ**をダウンロード
   - iOS: App Store から「Expo Go」をインストール
   - Android: Google Play から「Expo Go」をインストール

2. **QRコードをスキャン**
   - ターミナルに表示されるQRコードをExpo Goでスキャン
   - iOSの場合: カメラアプリでもスキャン可能

3. **アプリが起動**
   - 数秒でCrafdy Mobileアプリが起動します

## 📱 アプリの使い方

### ダッシュボード
- プロジェクト概要の確認
- 進捗状況の表示
- 今月の売上・コスト統計

### プロジェクト管理
- 新規プロジェクトの作成
- 既存プロジェクトの編集
- プロジェクト詳細の確認

### 日報機能
- 日々の作業報告を投稿
- 写真の添付
- AI解析による工数自動計算

### アップロード機能
- レシート・請求書のアップロード
- OCR機能による自動データ抽出
- プロジェクトへの紐付け

### 見積管理
- 見積書の作成・編集
- PDF出力機能
- 顧客情報の管理

### 設定
- プロフィール編集
- 通知設定
- データ同期設定

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. QRコードが表示されない
```bash
# ターミナルで 'c' を押してクリア
# または開発サーバーを再起動
npm start
```

#### 2. アプリが起動しない
```bash
# キャッシュをクリア
expo start -c

# または
npx expo start --clear
```

#### 3. Node.jsバージョンエラー
```bash
# Node.jsバージョンを確認
node -v

# NVMでバージョン切り替え
nvm use 22.17.0
```

#### 4. パッケージエラー
```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm install

# パッケージの互換性を修正
npx expo install --fix
```

#### 5. Metro bundler エラー
```bash
# Metro bundlerのキャッシュをクリア
npx expo start --clear

# または
npx react-native start --reset-cache
```

## 🗄️ データベースセットアップ

### Supabaseプロジェクトの作成
1. [Supabase](https://supabase.com) にアクセス
2. 「New Project」をクリック
3. プロジェクト名を入力（例: crafdy-mobile）
4. データベースパスワードを設定
5. リージョンを選択（Tokyo推奨）

### データベーススキーマの適用
```bash
# データベースセットアップガイドを実行
./scripts/setup-database.sh
```

### 接続情報の設定
1. Supabaseダッシュボードで「Settings」→「API」
2. 以下の情報をコピー:
   - Project URL
   - anon public key
3. `lib/supabase.ts` ファイルを更新:
   ```typescript
   const supabaseUrl = 'YOUR_PROJECT_URL'
   const supabaseAnonKey = 'YOUR_ANON_KEY'
   ```

## 📋 開発フロー

### 日常の開発作業
1. **開発サーバー起動**
   ```bash
   ./scripts/start-dev.sh
   ```

2. **コード編集**
   - VS Code またはお好みのエディタで編集
   - 保存すると自動的にアプリがリロード

3. **テスト**
   - Expo Goでリアルタイムにテスト
   - 'r'キーでアプリをリロード

4. **デバッグ**
   - ブラウザの開発者ツールを使用
   - React Native Debuggerも利用可能

### コード変更後の確認項目
- [ ] アプリが正常に起動する
- [ ] 新機能が期待通りに動作する
- [ ] 既存機能に影響がない
- [ ] エラーが発生していない

## 🚨 緊急時の対応

### アプリがクラッシュする場合
1. 開発サーバーを停止（Ctrl+C）
2. キャッシュをクリア
   ```bash
   npx expo start --clear
   ```
3. 依存関係を再インストール
   ```bash
   rm -rf node_modules
   npm install
   ```

### データベース接続エラー
1. Supabaseプロジェクトの状態を確認
2. 接続情報（URL、キー）の確認
3. インターネット接続の確認

### ビルドエラー
1. TypeScriptエラーの確認・修正
2. インポート文の確認
3. パッケージの互換性確認

## 📞 サポート

### 開発に関する質問
- プロジェクトのIssueに投稿
- 開発チームに相談

### 技術情報
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)

---

このガイドに従って、Crafdy Mobileの開発を効率的に進めることができます。
問題が発生した場合は、まずトラブルシューティングセクションを参照してください。