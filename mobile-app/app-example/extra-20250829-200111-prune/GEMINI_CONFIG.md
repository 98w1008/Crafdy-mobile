# Gemini AI 協業設定ファイル

## 🤖 Gemini設定情報

### プロジェクト概要
- **プロジェクト名**: Crafdy Mobile
- **技術スタック**: React Native, Expo, TypeScript, Supabase
- **開発環境**: macOS, Node.js v17.1.0
- **認証システム**: Supabase Auth (Email/Password + Google OAuth)

### 現在のプロジェクト構造
```
/Users/watanabekuuya/Crafdy-mobile/mobile-app/
├── src/
│   ├── screens/
│   │   ├── AuthScreen.tsx      # 認証画面（問題発生中）
│   │   ├── HomeScreen.tsx      # ホーム画面
│   │   └── ProfileScreen.tsx   # プロフィール画面
│   ├── lib/
│   │   └── supabase.ts         # Supabase設定
│   └── contexts/
│       └── AuthContext.tsx     # 認証コンテキスト
├── app/
│   ├── (tabs)/                 # タブナビゲーション
│   └── (auth)/                 # 認証ルート
├── App.tsx                     # メインアプリファイル
└── package.json
```

## 🚨 現在の問題（Gemini協業対象）

### 優先度: HIGH
**AuthScreen.tsx の認証UI整合性問題**

#### 問題1: Googleボタンテキストの不整合
```tsx
// 現在の実装（問題）
<Text style={styles.googleButtonText}>
  {googleLoading ? 'Google認証中...' : 'Googleでログイン'}
</Text>

// 期待する実装
{googleLoading 
  ? 'Google認証中...' 
  : (isSignUp ? 'Googleでアカウント作成' : 'Googleでログイン')
}
```

#### 問題2: 利用規約チェックの不整合
```tsx
// 現在の実装（問題）
const isLoginButtonDisabled = loading || googleLoading  // 利用規約無視

// 期待する実装  
const isGoogleButtonDisabled = loading || googleLoading || (isSignUp && !agreeToTerms)
```

#### 問題3: Google認証での利用規約チェック
```tsx
// handleGoogleSignIn関数に追加が必要
if (isSignUp && !agreeToTerms) {
  Alert.alert('エラー', '利用規約とプライバシーポリシーに同意してください')
  return
}
```

## 🎯 Geminiへの依頼事項

### 1. コードレビューと改善提案
- AuthScreen.tsxの整合性問題の解決方法
- UX/UIの一貫性向上
- TypeScript型安全性の確保

### 2. 実装方針の相談
- サインアップ/ログインモードでの適切な処理分岐
- 利用規約チェックのベストプラクティス
- エラーハンドリングの改善

### 3. テスト戦略
- 認証フローのテストケース
- iOS/Android対応の検証方法

## 📱 技術仕様

### 使用中のライブラリ
```json
{
  "expo": "~53.0.0",
  "react": "18.2.0",
  "react-native": "0.79.5",
  "@supabase/supabase-js": "^2.0.0",
  "expo-auth-session": "latest",
  "expo-web-browser": "latest",
  "expo-checkbox": "latest"
}
```

### 認証フロー
1. **メール/パスワード認証**: `supabase.auth.signUp()` / `signInWithPassword()`
2. **Google OAuth**: `supabase.auth.signInWithOAuth()` + `WebBrowser.openAuthSessionAsync()`
3. **セッション管理**: AuthContext + `onAuthStateChange`

## 🔄 協業プロセス

### Phase 1: 問題分析
- [ ] 現在のコード詳細レビュー
- [ ] UX/UI整合性の課題特定
- [ ] 修正優先度の決定

### Phase 2: 修正実装
- [ ] AuthScreen.tsx の段階的修正
- [ ] テスト実行と検証
- [ ] デバッグとトラブルシューティング

### Phase 3: 最適化
- [ ] パフォーマンス改善
- [ ] エラーハンドリング強化
- [ ] ドキュメント更新

## 💬 Geminiとの対話履歴

### 2025-01-08
- **課題**: AuthScreen.tsx 認証UI整合性問題
- **状況**: サインアップ/ログインでの Google認証の動作不整合
- **要求**: UX統一と利用規約チェック実装

---

**Geminiへの次の質問準備**:
"AuthScreen.tsxで、サインアップモードとログインモードでGoogle認証ボタンの動作を統一するための最適な実装方法を教えてください。特に利用規約チェックの整合性に重点を置いて提案してください。"