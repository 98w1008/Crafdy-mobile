---
name: crafdy-estimate
description: Crafdy見積（見積書/内訳/出力/修正/見積フロー/見積関連UI）の実装・導線整理・仕様判断を行うときに使う。
metadata: {"openclaw":{"emoji":"📝"}}
---

# Crafdy Estimate Skill

## いつ使う
見積（見積書/内訳/金額/単価/工事内容/修正/出力）に関係する時。

## triggers / keywords（誤判定を減らす）
強いトリガ（ほぼ見積）:
- 見積, 見積書, 見積もり, 見積り, estimate, 内訳, 積算

弱いトリガ（他カテゴリと競合しやすい）:
- 単価（※常用/応援単価や請求単価とも競合）
- PDF, 出力, テンプレ（※請求書とも競合）

## examples
- 「この現場の見積書を作りたい」
- 「見積の内訳を直して。材料費を増やして」
- 「見積をPDFで出したい」

## 複合入力の扱い（方針）
- 見積＋他（請求/日報/経費）が混在する場合、**ユーザーの最後の意図**（文末）を優先し、迷うなら1問だけ確認する。

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/main-chat-ux.md`
- `{repoRoot}/docs/skills/ai-answering-principles.md`

## 守るべき最小ルール
- 1回に聞くことは1つ（main-chatの追質問は細かく）。
- 長文説明を避ける（結論→次の入力）。
- 出力（PDF/HTML等）は最小でよいが、外に渡せる方向へ繋ぐ。
