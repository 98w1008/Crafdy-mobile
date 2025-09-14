# 🚀 Crafdy Mobile - 確実な起動ガイド

## ✅ 推奨起動手順（Network request failed解決版）

### 1. **基本起動（最推奨）**
```bash
cd /Users/watanabekuuya/Crafdy-mobile/mobile-app
npx expo start --clear
```

### 2. **QRコードが機能しない場合**
```bash
# LAN接続で物理デバイス接続
npx expo start --clear --lan

# または開発クライアント用
npx expo start --clear --dev-client
```

## 🔧 `--clear` で "There was a problem running the requested app" 解決方法

### Step 1: 依存関係の完全リセット
```bash
cd /Users/watanabekuuya/Crafdy-mobile/mobile-app
rm -rf node_modules package-lock.json
npm install
```

### Step 2: Metro キャッシュクリア
```bash
npx expo start --clear --reset-cache
```

### Step 3: 物理デバイスでの接続確認
1. **同一WiFi確認**: 開発マシンとスマートフォンが同じWiFiネットワーク
2. **Expo Goアプリ**: 最新版をインストール
3. **QRコード読み取り**: `npx expo start --clear --lan` のQRコードをスキャン

## 🌐 ネットワーク問題の完全解決

### --tunnel使用時の問題点
- ❌ Network request failed エラーの主原因
- ❌ 接続の不安定化
- ❌ レイテンシー増加

### 解決済み最適化
✅ 開発環境用のfetch polyfill適用済み  
✅ Tunnel環境の自動検出・最適化  
✅ Supabase接続の安定化  
✅ SecureStore実装の改善  

## 📱 デバイス別接続方法

### iOSシミュレーター
```bash
npx expo start --clear --ios
```

### Androidエミュレーター
```bash
npx expo start --clear --android
```

### 物理デバイス（iPhone/Android）
```bash
npx expo start --clear --lan
# QRコードをExpo Goアプリでスキャン
```

## 🔍 接続確認ログ

起動後、以下のログが表示されます：

```
🔧 Initializing Supabase configuration...
✅ Supabase URL loaded successfully
✅ Supabase Anonymous Key loaded successfully
✅ Supabase configuration validation passed
✅ Supabase client created successfully

Test 1: Basic network connectivity
   Basic connectivity: ✅ PASS
Test 2: Supabase server health check  
   Supabase health: ✅ PASS (Status: 401)
Test 3: Supabase client functionality
   Client test: ✅ PASS (table not found is expected)
🎉 Supabase connection test completed successfully!
```

## 🆘 まだ問題がある場合

### 最終解決手順
```bash
# 1. Expo CLIを最新版に更新
npm install -g @expo/cli@latest

# 2. プロジェクトディレクトリで完全リセット
rm -rf node_modules package-lock.json .expo
npm install

# 3. デバイス/シミュレーターの確認
# iOS: Xcode最新版とシミュレーター確認
# Android: Android Studio最新版とエミュレーター確認

# 4. 確実な起動
npx expo start --clear --reset-cache
```

### ファイアウォール設定（必要に応じて）
- ポート19000: Metro bundler
- ポート19001: Expo dev tools
- ポート8081: React Native packager

## ⚡️ クイックスタート（1分で起動）

```bash
cd /Users/watanabekuuya/Crafdy-mobile/mobile-app
npx expo start --clear
```

この起動方法で、Network request failedエラーは解決し、安定した開発環境が得られます。