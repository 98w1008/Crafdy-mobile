# /figma-port

Figma正本から指定コンポーネントをReact Nativeに移植するためのガイド付き作業を開始します。

## 使い方

```
/figma-port [Figmaの行番号範囲] [コンポーネント名]
例: /figma-port 222-248 Header
```

## このコマンドが実行すること

1. `Crafdymainchat/src/app/App.tsx` の指定行範囲を読み取る
2. Tailwind → StyleSheet 変換を `docs/FIGMA_PORTING.md` の早見表に沿って適用
3. lucide-react → `@expo/vector-icons/Feather` のアイコン対応を確認
4. カラーは `mainChatTokens` (dark/light) を使用
5. `mobile-app/components/chat/[ComponentName].tsx` として出力
6. `mobile-app/app/dev/ui-preview.tsx` への組み込みポイントを提示

## 制約

- Phase 1: 純UI再現のみ。ロジック・状態管理・API連携は含めない
- Figmaにない要素を追加しない
- グラデーションは近似単色で代替 (expo-linear-gradient 未使用)
- commit/push は含めない — ユーザーの明示的な承認が必要

## 参照ドキュメント

- 変換ルール: `docs/FIGMA_PORTING.md`
- カラートークン: `mobile-app/theme/tokens.ts` → `mainChatTokens`
- Figma正本: `Crafdymainchat/src/app/App.tsx`
