# Expo起動方法ガイド - Network request failed 解決版

## 🚨 推奨起動方法（--tunnelを使わない）

### 1. **基本起動（推奨）**
```bash
npx expo start --clear
```

### 2. **LAN接続（物理デバイス用）**
```bash
npx expo start --clear --lan
```

### 3. **開発サーバーのみ**
```bash
npx expo start --clear --dev-client
```

## ❌ 避けるべき起動方法

### --tunnel オプションの問題
```bash
# ❌ これは避けてください
npx expo start --tunnel
```

**--tunnelの問題点:**
- Network request failed エラーの原因
- XMLHttpRequest の不安定化
- fetch polyfill との競合
- レイテンシーの増加

## 🔧 Network request failed 解決手順

### Step 1: キャッシュクリア
```bash
npx expo start --clear
```

### Step 2: 接続方法の確認
- **シミュレーター**: 自動で最適な接続
- **物理デバイス**: 同じWiFiネットワークに接続
- **firewall**: 開発マシンのファイアウォール確認

### Step 3: ログの確認
アプリ起動後、以下のログを確認：
```
🔍 Tunnel Connection Analysis
🌐 Network Test with Tunnel Configuration
🔧 Applying tunnel-specific network fixes...
```

## 🌐 ネットワークトラブルシューティング

### 物理デバイスでの接続問題
1. **同じWiFi確認**: 開発マシンとデバイスが同じネットワーク
2. **ファイアウォール**: ポート19000, 19001の開放
3. **IP確認**: `expo start --lan` でIPアドレス確認

### シミュレーターでの問題
1. **Xcode更新**: 最新版のXcode
2. **シミュレーター再起動**: デバイス設定の初期化
3. **Metro再起動**: `npx expo start --clear`

## ✅ 成功時のログ例

```
🔍 Tunnel Connection Analysis
   Debugger Host: 192.168.1.100:19000
   Is using tunnel: false
   Development Type: Development

🌐 Network Test with Tunnel Configuration
Test 1: Direct HTTPS Connection
   Direct HTTPS: ✅ 200
Test 2: Supabase Direct Connection  
   Supabase Direct: ✅ 401
Test 3: XMLHttpRequest Test
   XMLHttpRequest: ✅ 200

🔧 Supabase configuration validation passed
✅ Supabase client created successfully
🎉 Supabase connection test completed successfully!
```

## 🆘 まだ問題がある場合

### 最終手段
```bash
# 1. 完全リセット
rm -rf node_modules package-lock.json
npm install

# 2. Expo CLI更新
npm install -g @expo/cli@latest

# 3. クリーン起動
npx expo start --clear --reset-cache
```