# Pre-release QA Checklist (Crafdy)

目的: 1人運営でも回せる「本番前の通し確認」チェックリスト。
- 期待結果が1行で分かる
- owner / member / auth / billing を **画面順**で通す
- 未実装が混ざる場合は「保留」にできる

記入:
- 実施日: ____
- 対象commit/branch: ____
- 環境: iOS(実機/Sim) ____ / Android(実機/Emu) ____
- Supabase Project: ____
- Stripe Mode: test / live（どちらか）

---

## 0. Go / No-Go（最終）
- [ ] **No-Go条件**（ログインできない / main-chatで保存できない / 役割が崩れて権限事故が起きる）が無い
- [ ] **owner導線**（signup→セットアップ→現場→main-chat）が通る
- [ ] **member導線**（招待コード→現場→main-chat）が通る
- [ ] **billing**（checkout開始→戻り→状態確認）が最低限通る（未実装は保留扱いの判断ができる）

---

## 1. owner 初回導線（代表/親方）
### 1-1. signup
- [ ] auth-screen → 「代表・親方としてはじめる」へ進める
  - 期待: signup画面が開き、何を入力する画面か3秒で分かる
- [ ] signup 成功（sessionありの環境）
  - 期待: owner-setup が開き「最初にやること」が見える
- [ ] signup 成功（確認メールが必要な環境）
  - 期待: 「ログインへ」案内が出て迷わない

### 1-2. owner-setup
- [ ] 「会社情報を設定」→ company profile へ遷移できる
- [ ] 「現場を作る / 選ぶ」→ project selector へ遷移できる
- [ ] 「main-chat を開く」→ main-chat へ戻れる
  - 期待: returnTo/戻り先が不自然でない

### 1-3. 会社情報（company-billing-profile）
- [ ] ownerで閲覧/編集できる
  - 期待: 「閲覧できません」で終わらず編集できる
- [ ] 保存できる
  - 期待: 保存後に次の一手（例: 現場へ）が分かる
- [ ] returnTo付き導線のとき
  - 期待: 保存後の案内が自然（現場へ進める/あとで、など）

### 1-4. 現場（project-selector）
- [ ] 現場を新規作成できる
  - 期待: 作成後 main-chat に戻り、現場が選択状態になる
- [ ] 既存現場を選択できる
  - 期待: 選択後 main-chat に戻り、現場が選択状態になる

---

## 2. member 初回導線（職長/従業員）
### 2-1. 招待コード参加（join/by-code）
- [ ] auth-screen → 「招待コードで参加」へ進める
- [ ] 正しいコードで参加できる
  - 期待: member-setup が開き、次の一手が見える
- [ ] 間違い/期限切れ/使用済み/無効化
  - 期待: 短い文言で理由が分かり、次の行動（代表に依頼）が分かる

### 2-2. member-setup
- [ ] 「担当現場を確認 / 選ぶ」→ project selector に進める
- [ ] 「main-chat を開く」→ main-chat に進める
- [ ] owner向け設定（会社情報/テンプレ等）が主役になっていない
  - 期待: “あなたができること（日報/経費）” が明示される

### 2-3. 担当現場の確認（project-selector）
- [ ] memberの場合、割当現場だけが見える
  - 期待: 0件なら「代表に割当依頼」の案内が出る
- [ ] 戻る（←）が自然
  - 期待: member-setup returnTo が効く（または main-chat に戻れる）

---

## 3. main-chat（共通）
### 3-1. 空状態
- [ ] 画面を開いた瞬間に「何ができる/何を押す/何を送る」が分かる
  - 期待: 長文でなく、主役ボタンへ視線が誘導される

### 3-2. quick actions
- [ ] 4つの主役ボタンが押せる
  - 期待: 押した後、最初の質問が1つで返る（1問1答）

### 3-3. prompt chips
- [ ] chips が横スクロールで表示される
- [ ] chips 押下で「即送信ではなく入力欄に入る」
  - 期待: 入力欄に文言が入り、編集できる

### 3-4. guideReply（使い方説明モード）
- [ ] 「何ができる？」で短い説明 + 次の一手が返る
- [ ] 「最初に何を設定すればいい？」で短い説明 + 次の一手が返る
- [ ] member向けで内容が自然（担当現場/日報/経費が主役）

### 3-5. 保存後の次の一手
- [ ] 日報/経費の保存後に「次に何をすればいいか」が分かる
  - 期待: 長文でなく、1〜2案まで

---

## 4. billing / checkout（owner想定）
※ 未実装/暫定がある場合は「保留」にしてGo/No-Goで判断。

### 4-1. billing 画面
- [ ] dashboard → billing へ遷移できる
- [ ] 契約状態/プラン状態が表示される

### 4-2. checkout 開始 → 戻り
- [ ] checkout を開始できる（WebBrowser）
- [ ] success で /billing に戻れる
- [ ] cancel で /billing に戻れる

### 4-3. billing refresh / webhook
- [ ] success 後に状態確認（refresh）が走る
  - 期待: 「確認中…」→ 状態が更新（or 反映待ちの説明）
- [ ] webhook が有効な環境
  - [ ] webhook受信で Supabase側の billingState が更新される
  - [ ] refresh が user_metadata.billingStateV1 を優先して返す
- [ ] webhook未設定/遅延の環境（fallback）
  - 期待: Stripe直取得fallbackでも落ちない

---

## 5. auth / session（共通）
- [ ] login 成功 → signed_in になり自然な画面へ進む
- [ ] login 失敗
  - 期待: 短い文言で何を直すか分かる
- [ ] logout（サインアウト）できる
- [ ] アプリ再起動後にセッション復元される
  - 期待: signed_in のまま main-chat/dashboard に入れる

---

## 6. security / env（最低限）
### 6-1. Supabase / Stripe 環境変数
- [ ] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY が正しい
- [ ] STRIPE_SECRET_KEY / STRIPE_PRICE_* が Edge Function 側に設定されている
- [ ] STRIPE_WEBHOOK_SECRET が webhook 受信口に設定されている（運用時）
- [ ] SUPABASE_SERVICE_ROLE_KEY が webhook 更新に必要（運用時）

### 6-2. RLS / 権限事故（最低限確認）
- [ ] member が owner向け画面に入ったとき
  - 期待: 「閲覧できません」で終わらず、次の行動（代表に依頼/戻る）が出る
- [ ] owner は必要な設定画面に入れる
  - 期待: 初期セットアップで詰まらない

---

## 7. 失敗しやすい環境項目（メモ）
- [ ] Expo/Metro の不安定（signal 9等）が出ていない
- [ ] iOS/Androidで WebBrowser.openAuthSessionAsync の戻りが想定通り
- [ ] deep link のURL形式が正しい（/billing?result=...）

---

## 8. 実施ログ（任意）
- 実施者: ____
- 結果: Go / No-Go / 保留
- 主要なNG/保留:
  - ____
  - ____
