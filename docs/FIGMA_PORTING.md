# Figma移植ルール (Crafdy-mobile)

Figma正本: `Crafdymainchat/src/app/App.tsx`  
移植先: `Crafdy-mobile/mobile-app/`

---

## 基本方針

- **Figma正本を変更しない**: `Crafdymainchat/` は読み取り専用参照として扱う
- **Phase 1 (純UI) → Phase 2 (ロジック)** の順で進める
- **改善・追加機能は禁止**: Figmaにない要素を追加しない
- コンポーネントは `mobile-app/components/chat/` に分離して管理する

---

## Tailwind → React Native StyleSheet 変換早見表

### レイアウト

| Tailwind | React Native |
|----------|-------------|
| `flex` | `flex: 1` |
| `flex-row` | `flexDirection: 'row'` |
| `items-center` | `alignItems: 'center'` |
| `justify-between` | `justifyContent: 'space-between'` |
| `gap-3` | `gap: 12` |
| `gap-2.5` | `gap: 10` |
| `flex-wrap` | `flexWrap: 'wrap'` |

### スペーシング (1単位 = 4px)

| Tailwind | React Native |
|----------|-------------|
| `p-4` | `padding: 16` |
| `px-5` | `paddingHorizontal: 20` |
| `py-2.5` | `paddingVertical: 10` |
| `pt-14` | `paddingTop: 56` |
| `pb-5` | `paddingBottom: 20` |
| `mb-3` | `marginBottom: 12` |
| `mb-7` | `marginBottom: 28` |
| `-mx-5` | `marginHorizontal: -20` |

### タイポグラフィ

| Tailwind | React Native |
|----------|-------------|
| `text-sm` | `fontSize: 14` |
| `text-base` | `fontSize: 16` |
| `text-lg` | `fontSize: 18` |
| `text-xl` | `fontSize: 20` |
| `text-3xl` | `fontSize: 30` |
| `font-medium` | `fontWeight: '500'` |
| `font-semibold` | `fontWeight: '600'` |
| `leading-tight` | `lineHeight: fontSize * 1.25` |
| `leading-relaxed` | `lineHeight: fontSize * 1.625` |

### ボーダー半径

| Tailwind | React Native |
|----------|-------------|
| `rounded-full` | `borderRadius: 9999` |
| `rounded-2xl` | `borderRadius: 16` |
| `rounded-xl` | `borderRadius: 12` |
| `rounded-lg` | `borderRadius: 8` |
| `rounded-t-[32px]` | `borderTopLeftRadius: 32, borderTopRightRadius: 32` |

### 幅

| Tailwind | React Native |
|----------|-------------|
| `w-10` | `width: 40` |
| `w-12` | `width: 48` |
| `h-1` | `height: 4` (1pxは細すぎるため4px) |
| `h-8` | `height: 32` |
| `h-12` | `height: 48` |
| `grid-cols-2` | `flexDirection: 'row', flexWrap: 'wrap'` + 各アイテム `width: '48%'` |

### アイコン

| lucide-react | @expo/vector-icons/Feather |
|-------------|--------------------------|
| `Menu` | `menu` |
| `MapPin` | `map-pin` |
| `Mic` | `mic` |
| `Send` | `send` |
| `Image` | `image` |
| `Camera` | `camera` |
| `Paperclip` | `paperclip` |
| `FileText` | `file-text` |
| `Plus` | `plus` |
| `X` | `x` |

---

## 非対応の変換

### グラデーション

Figmaの `bg-gradient-to-br from-[#1a2635] to-[#0f1922]` などのグラデーションは、
`expo-linear-gradient` が未統合のため **近似単色** に変換する。

```
from-[#1a2635] to-[#0f1922] → #1a2635
from-blue-500 to-blue-600   → #3B82F6
from-emerald-500 to-emerald-600 → #10B981
```

Phase 2 でグラデーションを正確に再現する場合は `expo-linear-gradient` を導入する。

### backdrop-blur

`backdrop-blur-sm` などのブラー効果はRN未対応。オーバーレイの透明度で代替する。

### framer-motion アニメーション

`motion.div` などのアニメーションはRN未対応。Phase 2 で `react-native-reanimated` を使って再現する。

---

## カラートークン

`mobile-app/theme/tokens.ts` の `mainChatTokens` を参照。

```ts
import { mainChatTokens } from '@/theme/tokens'

const t = mainChatTokens.dark // または mainChatTokens.light
```

### テーマ切替パターン

```tsx
const t = isDark ? mainChatTokens.dark : mainChatTokens.light
```

isDark は `useColorScheme()` の結果を `resolvedScheme === 'dark'` で判定してpropsで渡す。

---

## ファイル構成

```
mobile-app/
  app/
    main-chat.tsx           # メインチャット画面 (ロジック + レイアウト)
    dev/
      ui-preview.tsx        # DEV: コンポーネント目視確認用
  components/
    chat/
      MainChatHomeView.tsx       # ホーム状態 (ウェルカム + チップス)
      MainChatAttachSheetView.tsx # + ボタン → アクションシート
  theme/
    tokens.ts               # mainChatTokens を含む全デザイントークン
docs/
  FIGMA_PORTING.md          # このファイル
```

---

## 移植フロー

1. `Crafdymainchat/src/app/App.tsx` の対象箇所を特定 (行番号をコメントに残す)
2. JSX構造を読み取り、Tailwindクラスを上記早見表でRNに変換
3. カラーは `mainChatTokens` を使用、または直接16進数で記述
4. `isDark` props で dark/light を分岐
5. `/dev/ui-preview` で目視確認
6. TypeScript型チェック: `tsc --noEmit --skipLibCheck`
7. commit: `feat: phase1 ui - [コンポーネント名]`

---

## 禁止事項

- Figmaにない機能の追加
- グラデーションの `expo-linear-gradient` 未確認での使用
- Phase 1 完了前のロジック実装
- `settings.local.json` のcommitへの含め方
- 承認なしのgit push
