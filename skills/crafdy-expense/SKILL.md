---
name: crafdy-expense
description: Crafdy経費（材料費/外注費/高速代/レシート/経費整理/承認）の実装・導線整理・仕様判断を行うときに使う。
metadata: {"openclaw":{"emoji":"💸"}}
---

# Crafdy Expense Skill

## いつ使う
経費（材料費/外注費/高速代/レシート/精算/承認）に関係する時。

## triggers / keywords（誤判定を減らす）
強いトリガ（ほぼ経費）:
- 経費, 支出, 精算, レシート, 領収書, 材料費, 外注費, 交通費, 高速代

弱いトリガ（他カテゴリと競合しやすい）:
- 金額（※売上/見積/請求とも競合）
- 会社名（※請求先/協力会社とも競合）

## examples
- 「高速代 1,200円」
- 「材料費 5000円 メモ：配管」
- 「今月の経費いくら？」

## 複合入力の扱い（方針）
- 日報＋経費の同時入力は **日報を先**（daily-report側）で、経費は次の1問で処理。
- 現場更新＋経費は、現場（project-update）を先に確定してから経費保存。

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/main-chat-ux.md`
- `{repoRoot}/docs/skills/ai-answering-principles.md`

## 守るべき最小ルール
- 入力不足は1つずつ聞く（追質問を詰め込みすぎない）。
- 既存の reviewStatus/承認導線を壊さない。
