# Gemini協業 - AuthScreen問題解決

## 🚨 現在の問題

### 1. アカウント作成フォームの問題
- フォーム表示がおかしくなっている
- 具体的な症状要確認

### 2. 利用規約とGoogle認証の整合性問題
- **現在の動作:**
  - メール/パスワードのサインアップ: 利用規約チェック必須 ✅
  - メール/パスワードのログイン: 利用規約チェック不要 ✅
  - Google認証: 常に「Googleでログイン」表示 ❌
  - Google認証: 利用規約チェック無視 ❌

- **期待する動作:**
  - サインアップモード + Google → 「Googleでアカウント作成」+ 利用規約チェック必須
  - ログインモード + Google → 「Googleでログイン」+ 利用規約チェック不要

## 🔧 修正が必要な箇所

### AuthScreen.tsx の問題箇所:

1. **Googleボタンテキスト** (行296-298)
```tsx
<Text style={styles.googleButtonText}>
  {googleLoading ? 'Google認証中...' : 'Googleでログイン'}
</Text>
```
→ `isSignUp`に応じてテキスト変更が必要

2. **Googleボタンの無効化条件** (行291)
```tsx
isLoginButtonDisabled && styles.buttonDisabled
```
→ サインアップ時の利用規約チェックを考慮する必要

3. **handleGoogleSignIn関数** (行78-156)
```tsx
const handleGoogleSignIn = async () => {
  // 利用規約チェックの実装が必要
}
```

## 🎯 Geminiへの相談事項

1. **UIの整合性**: サインアップ/ログインモードでのGoogle認証の表示統一
2. **UXの改善**: 利用規約チェックのタイミングと方法
3. **エラーハンドリング**: Google認証失敗時の適切な処理

## 📱 現在の環境

- **プロジェクト**: `/Users/watanabekuuya/Crafdy-mobile/mobile-app`
- **問題ファイル**: `src/screens/AuthScreen.tsx`
- **テスト環境**: iOSシミュレーター
- **認証バックエンド**: Supabase

## ✅ 次のステップ

1. Geminiと具体的な修正方針を相談
2. AuthScreen.tsxの段階的修正
3. 動作テストと検証