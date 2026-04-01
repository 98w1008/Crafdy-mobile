---
name: crafdy-expense
description: Crafdy経費（材料費/外注費/高速代/レシート/経費整理/承認）の実装・導線整理・仕様判断を行うときに使う。
metadata: {"openclaw":{"emoji":"💸"}}
---

# Crafdy Expense Skill

## いつ使う
ユーザー入力が「経費」「材料費」「外注費」「レシート」「高速代」「支出」「精算」等に関係する時。

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/main-chat-ux.md`
- `{repoRoot}/docs/skills/ai-answering-principles.md`

## 守るべき最小ルール
- 入力不足は1つずつ聞く（追質問を詰め込みすぎない）。
- 既存の reviewStatus/承認導線を壊さない。
