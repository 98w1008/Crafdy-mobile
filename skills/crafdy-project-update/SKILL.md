---
name: crafdy-project-update
description: Crafdy現場（現場作成/選択/詳細更新/メンバー割当/導線整理/ダッシュボード状態表示）の実装・仕様判断を行うときに使う。
metadata: {"openclaw":{"emoji":"🏗️"}}
---

# Crafdy Project Update Skill

## いつ使う
ユーザー入力が「現場」「プロジェクト」「住所変更」「メモ更新」「メンバー」「招待コード」「割当」「ダッシュボード整理」等に関係する時。

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/navigation-rules.md`
- `{repoRoot}/docs/skills/main-chat-ux.md`

## 守るべき最小ルール
- chat主導線を維持しつつ、全体導線へ戻れること。
- dashboard は「今どこまで済んでいるか」が分かること。
- 既存route/権限制御を壊さない。
