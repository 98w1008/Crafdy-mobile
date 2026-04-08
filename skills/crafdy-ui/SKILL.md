---
name: crafdy-ui
description: Crafdy の UI/UX を「初見で迷わない」方向へ改善する（main-chat主役・空状態・権限制限・文言/CTA/メニューの自然化・role-aware）。新機能追加より、導線/コピー/空状態で体感価値を上げるときに使う。
metadata: {"openclaw":{"emoji":"🧭"}}
---

# Crafdy UI / UX Skill

## いつ使う
- 「何ができるか分からない / どれを押せばいいか分からない / 迷う」
- main-chat / dashboard / auth / invite code / project selector / billing / company profile / invoice template / drafts の **文言・CTA・空状態・権限制限**を直したい
- 新機能追加ではなく、**説明/導線/余白/ラベル**で改善できる局面

## triggers / keywords
ui, ux, design, polish, layout, wording, copy, button label, empty state, onboarding, first impression,
role-based ui, auth screen, main chat, dashboard, company profile, invoice template, billing,
閲覧できません, 分かりにくい, 使い方が分からない, 何ができるか分からない, 迷う, 押しにくい

## 前提（プロダクト意図）
- Crafdy は **チャットUI起点のAI業務アシスタント**。
- UIの主役は **main-chat**。
- 他画面は補助（確認/設定/一覧/レビュー）に寄せる。

## 固定ルール（短く）
### 1) 3秒で分かる
各画面で必ず言える状態にする:
- ここは何の画面か
- 自分に何ができるか
- 次にどこを押すか（次の一手を1つ）

### 2) 1画面1目的
入口/設定/一覧/レビューを混ぜない。主CTAは1つに寄せる。

### 3) CTAは「動詞 + 成果物」
- 悪い: 請求書 / 見積 / 日報 / 経費
- 良い: 請求書を作る / 見積を作る / 日報を入力 / 経費を登録 / 現場を選ぶ / 会社情報を設定

### 4) 権限制限は「次の行動」まで出す
「閲覧できません」で終わらせない。
- この画面は owner/office 向け
- 職長・従業員は代表に依頼
- [ダッシュボードへ戻る] などの戻り/代替導線

### 5) 空状態は3点セット
1) 何が無いか
2) それで何ができないか
3) 次に何をするか

### 6) 既存導線を壊さない
ルート/データ構造は極力そのまま。まずは **文言・見出し・補助文・空状態**で改善する。

## role-aware（必須）
- owner: 会社/契約/テンプレ/下書き等の設定導線を見せる。主役は「設定して使い始める」。
- office: 確認/テンプレ/下書き等は見せる。金融系は必要範囲のみ。
- member（職長/従業員）: 担当現場/日報/経費/履歴が主役。権限が無い機能は目立たせないか、押した先で代替導線。
- unassigned: 招待コード参加が主役。他の行動は増やさない。

## menu ルール
- 英語ラベル禁止（dashboard 等は日本語へ）。
- member/unassigned に「押すと閲覧不可」項目を並べすぎない。

## 実装時の進め方（最小）
- 変更前: どこで迷うかを1文で特定
- 変更: 見出し/補助文/CTA/空状態/権限制限文言を短く修正
- 確認: owner/office/member/unassigned で見え方が破綻しないか

## 作業前に読む（固定）
- `{repoRoot}/docs/skills/navigation-rules.md`
- `{repoRoot}/docs/skills/main-chat-ux.md`
- `{repoRoot}/docs/skills/ai-answering-principles.md`
