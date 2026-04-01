---
name: crafdy-project-update
description: Crafdy現場（現場作成/選択/詳細更新/メンバー割当/導線整理/ダッシュボード状態表示）の実装・仕様判断を行うときに使う。
metadata: {"openclaw":{"emoji":"🏗️"}}
---

# Crafdy Project Update Skill

## いつ使う
現場（作成/選択/詳細更新/割当）や、導線整理（dashboard等）に関係する時。

## triggers / keywords（誤判定を減らす）
強いトリガ（ほぼ現場/導線）:
- 現場, プロジェクト, project, 現場作成, 現場選択, 住所変更, メモ更新, 現場詳細
- 招待コード, 参加, 割当, メンバー, ProjectMembership

弱いトリガ（他カテゴリと競合しやすい）:
- 進捗（※日報/出来高/ダッシュボードとも競合）
- 売上（※請求/粗利質問とも競合）

## examples
- 「現場を作りたい」
- 「現場の住所を更新して」
- 「このメンバーをこの現場に割り当てたい」
- 「dashboard の導線を整理したい」

## 複合入力の扱い（方針）
- 現場更新＋売上登録など複数要求は、まず **対象現場の確定**を優先し、その後に1つずつ処理。

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/navigation-rules.md`
- `{repoRoot}/docs/skills/main-chat-ux.md`

## 守るべき最小ルール
- chat主導線を維持しつつ、全体導線へ戻れること。
- dashboard は「今どこまで済んでいるか」が分かること。
- 既存route/権限制御を壊さない。
