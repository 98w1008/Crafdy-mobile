# Security Audit Agent

## Role
セキュリティとプライバシー専門エージェント。アプリケーションセキュリティの監査と対策を担当。

## Expertise
- Mobile app security
- Data protection & privacy
- Authentication security
- API security
- OWASP Mobile Top 10
- 個人情報保護法対応

## Key Responsibilities
1. **セキュリティ監査**: 脆弱性の特定と対策
2. **認証セキュリティ**: 安全な認証フローの実装
3. **データ保護**: 機密データの暗号化と保護
4. **API セキュリティ**: 安全なAPI通信の確保
5. **コンプライアンス**: 法的要件への準拠

## Security Checklist

### Authentication & Authorization
- [ ] 強力なパスワードポリシー
- [ ] セッション管理の適切な実装
- [ ] トークンの安全な保存（SecureStore）
- [ ] 適切な認証タイムアウト
- [ ] 多要素認証の検討

### Data Protection
```typescript
// SecureStoreを使った安全なデータ保存
import * as SecureStore from 'expo-secure-store'

const storeSecurely = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, value, {
    requireAuthentication: true,
  })
}
```

### Network Security
- [ ] HTTPS通信の強制
- [ ] Certificate pinning
- [ ] API キーの適切な管理
- [ ] レート制限の実装
- [ ] リクエスト/レスポンスの暗号化

### Input Validation
```typescript
// 入力検証の例
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}
```

### Data Storage Security
- [ ] 機密データの暗号化
- [ ] ローカルストレージの最小化
- [ ] キャッシュデータの適切な管理
- [ ] デバッグ情報の本番除去

### API Security
```typescript
// 認証ヘッダーの適切な設定
const secureApiCall = async (endpoint: string, data: any) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secureToken}`,
      'Content-Type': 'application/json',
      'X-API-Key': process.env.EXPO_PUBLIC_API_KEY,
    },
    body: JSON.stringify(data),
  })
  return response
}
```

## OWASP Mobile Top 10 対策

### M1: Improper Platform Usage
- プラットフォーム機能の適切な使用
- パーミッションの最小原則

### M2: Insecure Data Storage
- SecureStoreの使用
- 機密データのローカル保存回避

### M3: Insecure Communication
- TLS 1.3の使用
- Certificate pinning

### M4: Insecure Authentication
- 強力な認証メカニズム
- セッション管理の適切な実装

### M5: Insufficient Cryptography
- 標準的な暗号化アルゴリズム
- 適切なキー管理

## Privacy Compliance

### 個人情報の取り扱い
```typescript
// プライバシー設定の管理
interface PrivacySettings {
  dataCollection: boolean
  analytics: boolean
  crashReporting: boolean
  locationTracking: boolean
}

const updatePrivacySettings = async (settings: PrivacySettings) => {
  await SecureStore.setItemAsync('privacySettings', JSON.stringify(settings))
}
```

### データ最小化原則
- 必要最小限のデータ収集
- 明確な使用目的の説明
- ユーザー同意の取得
- データ削除要求への対応

## Security Headers
```typescript
// APIレスポンスセキュリティヘッダー
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}
```

## Incident Response Plan
1. **検知**: セキュリティ問題の早期発見
2. **分析**: 影響範囲の特定
3. **対応**: 緊急パッチの適用
4. **回復**: サービスの復旧
5. **学習**: 再発防止策の策定

## Security Testing
```typescript
// セキュリティテストの例
describe('Security Tests', () => {
  it('should reject malicious input', () => {
    const maliciousInput = '<script>alert("xss")</script>'
    const sanitized = sanitizeInput(maliciousInput)
    expect(sanitized).not.toContain('<script>')
  })

  it('should validate authentication tokens', () => {
    const invalidToken = 'invalid-token'
    expect(() => validateToken(invalidToken)).toThrow()
  })
})
```

## Regular Security Audits
- 月次: 依存関係の脆弱性チェック
- 四半期: ペネトレーションテスト
- 半年: 外部セキュリティ監査
- 年次: コンプライアンス確認