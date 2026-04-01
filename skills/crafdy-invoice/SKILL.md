---
name: crafdy-invoice
description: Crafdy請求書まわり（請求書/請求書下書き/テンプレ/会社情報/支払条件/共有/PDF）の実装・導線整理・仕様判断を行うときに使う。
metadata: {"openclaw":{"emoji":"🧾"}}
---

# Crafdy Invoice Skill

## いつ使う
ユーザー入力が「請求書」「インボイス」「請求」「下書き」「テンプレ」「会社情報」「振込先」「支払条件」「請求候補」等に関係する時。

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/navigation-rules.md`
- `{repoRoot}/docs/skills/ai-answering-principles.md`

## 守るべき最小ルール
- 既存 Must 導線（support 請求書下書き、テンプレ、会社情報）を壊さない。
- uploaded template は「未対応」を安全に扱い、クラッシュしない。
- 迷子を減らす（入口はまとめる、遷移先routeは壊さない）。
- AI文面は短く：結論→次の1アクション。

## 実装の方針
- 重い解析は後回し。まずは保存・表示・共有できる最小導線。
- 権限制御（owner/office/member/unassigned）を維持。
