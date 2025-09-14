# 🎨 Crafdy Mobile Design System

## ✅ 実装完了内容

### 1. **グローバルデザイントークン**
- **`constants/Colors.ts`**: 統一されたカラーパレット
  - Primary: `#0E73E0` (鮮やかなブルー)
  - Navy: `#1B365D` (ダークネイビー)
  - Surface: 白・グレー系統
  - Semantic Colors: success, warning, error, info

### 2. **共通コンポーネント**
- **`components/ui/StyledButton.tsx`**: 統一ボタンコンポーネント
  - variants: primary, secondary, outline, ghost, danger
  - sizes: sm, md, lg
  - states: loading, disabled
  
- **`components/ui/StyledInput.tsx`**: 統一入力フィールド
  - variants: default, filled, outline
  - features: label, error, hint, focus states
  
- **`components/ui/Card.tsx`**: 統一カードコンポーネント
  - variants: default, elevated, outlined, filled
  - customizable: padding, margin, radius
  
- **`components/ui/StyledText.tsx`**: 統一テキストコンポーネント
  - variants: heading1-3, title, subtitle, body, caption
  - weights: normal, medium, semibold, bold
  - colors: main, secondary, tertiary, etc.

### 3. **リファクタリング完了**
- **`components/SettingsScreen.tsx`**: 完全リニューアル
  - 新デザインシステム適用
  - モダンなUI/UX
  - 一貫したスタイリング
  - プロフェッショナルな外観

## 🎯 デザインコンセプト

### **モダンで上質**
- プロフェッショナルツールとしての信頼感
- 建設業界に適した堅実なデザイン
- 直感的で使いやすいインターフェース

### **配色システム**
```
Primary:   #0E73E0 (鮮やかなブルー)
Navy:      #1B365D (ダークネイビー)  
Surface:   #FFFFFF (白)
Background: #F8F9FA (ライトグレー)
Text:      #212529 (ダークグレー)
```

### **スペーシング (8ptグリッド)**
```
xs: 4px   sm: 8px   md: 16px   lg: 24px   xl: 32px
```

### **タイポグラフィ**
```
heading1: 32px bold
heading2: 28px bold  
title:    20px semibold
body:     16px normal
caption:  14px normal
```

## 🧩 使用方法

### **基本的なインポート**
```tsx
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { StyledText, StyledButton, StyledInput, Card } from '@/components/ui'
```

### **ボタンの使用例**
```tsx
<StyledButton
  title="保存"
  variant="primary"
  size="md"
  onPress={handleSave}
  loading={loading}
/>
```

### **カードの使用例**
```tsx
<Card variant="elevated" padding="lg">
  <StyledText variant="title">タイトル</StyledText>
  <StyledText variant="body" color="secondary">
    説明文
  </StyledText>
</Card>
```

### **入力フィールドの使用例**
```tsx
<StyledInput
  label="メールアドレス"
  placeholder="your@email.com"
  variant="outline"
  value={email}
  onChangeText={setEmail}
  error={emailError}
/>
```

## 🎉 導入効果

### **Before (旧デザイン)**
- ❌ 不統一な色使い
- ❌ バラバラなコンポーネント
- ❌ 一貫性のないスタイル
- ❌ メンテナンス困難

### **After (新デザインシステム)**
- ✅ 統一されたブランディング
- ✅ 再利用可能なコンポーネント
- ✅ 一貫したユーザー体験
- ✅ 高速開発・メンテナンス性

## 🚀 次のステップ

**SettingsScreen完了後の展開:**
1. 他の全画面への適用
2. テーマ切り替え対応 (ダーク/ライト)
3. アニメーション統一
4. アクセシビリティ対応

**テスト手順:**
```bash
npm start
# 設定画面を確認して新デザインを体験
```

新しいデザインシステムで、**Crafdy Mobile**が本格的なプロフェッショナルツールとして生まれ変わりました！