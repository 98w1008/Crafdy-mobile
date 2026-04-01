---
name: crafdy-daily-report
description: Crafdy日報（作業内容/出面/協力会社/未入力検知/承認フロー/集計）の実装・導線整理・仕様判断を行うときに使う。
metadata: {"openclaw":{"emoji":"📋"}}
---

# Crafdy Daily Report Skill

## いつ使う
ユーザー入力が「日報」「作業」「出面」「職人」「協力会社」「人工」「確認依頼」「承認」等に関係する時。

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/main-chat-ux.md`
- `{repoRoot}/docs/skills/ai-answering-principles.md`

## 守るべき最小ルール
- 未入力の強制ではなく「要確認」で導入（既存運用を壊さない）。
- 表示・集計は後方互換補完で落ちないようにする。
