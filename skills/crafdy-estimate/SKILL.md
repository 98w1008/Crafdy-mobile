---
name: crafdy-estimate
description: Crafdy見積（見積書/内訳/出力/修正/見積フロー/見積関連UI）の実装・導線整理・仕様判断を行うときに使う。
metadata: {"openclaw":{"emoji":"📝"}}
---

# Crafdy Estimate Skill

## いつ使う
ユーザー入力が「見積」「見積書」「estimate」「内訳」「単価」「工事内容」「見積の修正」等に関係する時。

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/main-chat-ux.md`
- `{repoRoot}/docs/skills/ai-answering-principles.md`

## 守るべき最小ルール
- 1回に聞くことは1つ（main-chatの追質問は細かく）。
- 長文説明を避ける（結論→次の入力）。
- 出力（PDF/HTML等）は最小でよいが、外に渡せる方向へ繋ぐ。
