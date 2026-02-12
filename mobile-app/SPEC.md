0. 目的 / βの完成定義（DoD）

対象範囲：ログイン（デモ対応）／ホーム／見積作成／請求作成（PDFプレビュー可）

ユーザができること：

アプリ起動→「デモで試す」or マジックリンクで入れる

ホーム上段の2CTAから3タップ以内でPDFプレビュー

品質バー：

端数処理既定＝しない（小数点・1円単位を保持）

締日＝月末 / 1〜31日のホイール選択

請求先＝日報起点の既知情報を初期入力（なければ不足フォーム）

1. デザイン原則 / 非目標

原則：速い決定・少ない入力・常にプレビュー

非目標（βではやらない）：複雑なレイアウト編集、テーマ切替、細かなPDFレイアウト調整

2. デザイントークン

{
  "color": {
    "bg": "#0B0F14",
    "panel": "#121824",
    "primary": "#2B73FF",
    "primaryText": "#FFFFFF",
    "muted": "#8CA0B3",
    "border": "#1F2937",
    "danger": "#FF5A5A",
    "success": "#1EC28B"
  },
  "radius": { "sm": 10, "md": 14, "lg": 20, "xl": 28 },
  "spacing": { "xs": 6, "sm": 10, "md": 16, "lg": 20, "xl": 28 },
  "font": { "h1": 22, "h2": 18, "body": 16, "label": 14 },
  "shadow": { "card": 8 }
}

3. ナビゲーション / レッドルート

起動 → Login → Home

Home 上段の2CTA：

「見積を作る」→ EstimateSheet

「請求書を作る」→ InvoiceSheet

戻る：各シートはスワイプダウンで閉じる

4. 画面仕様（ワイヤ＋受入条件）
4.1 Login

要素：メール入力、[マジックリンクを送信]、[デモで試す]（強調リンク）

デモ：匿名サインイン成功→Homeへ

失敗時メッセージ：

API Key不整合→「設定エラー。管理者に連絡してください。」（再試行は出さない）

4.2 Home

ヘッダ：現場セレクタ（デモ時は「渋谷オフィス改修工事」固定表示OK）

ファーストビュー：大ボタン2つのみ

「見積を作る」(primary)

「請求書を作る」(secondary=同サイズ、並列)

2段目以降：材料カード、チャットなど“補助”

受入条件

初回表示で上段2CTAがスクロール無しで両方見える

どちらもタップ→1秒以内にシートが開く

4.3 EstimateSheet / InvoiceSheet（共通部品は同じ）

セクション：

請求先/見積先（テキストフィールド）

初期値：project.customer_name → 無ければ latest_report.client_name → それも無ければ MissingFieldsForm 自動表示

端数処理（“しない/四捨五入/切り上げ/切り捨て”の4チップ。初期値しない）

締日（Picker：月末＋1〜31日）

支払期日（締めから日数）（数値フィールド、初期値30）

下部ボタン：[PDFプレビュー]（常に活性）／[確定して発行]

受入条件

PDFプレビュー：デモ時はモックURLを必ず開く／本番時は生成リクエスト→URL応答が無ければ「生成に失敗しました（権限/会社設定を確認）」トースト

端数処理ロジック

none：金額・小計・消費税・合計すべてで端数保持（小計→税→合計の順）

round/ceil/floor：合計に対する10円単位丸め（現状仕様のままでも可。将来は粒度設定）

5. デモデータ契約（Functionsの返り値）

/invoices/generate?demo=1（抜粋）

{
  "meta": { "demo": true },
  "blocks": {
    "summary": {
      "title": "渋谷オフィス改修工事 請求書",
      "customer": { "name": "株式会社テスト建設 御中" },
      "closing_day": "eom",
      "payment_term_days": 30,
      "rounding": "none"
    },
    "table": {
      "headers": ["品名","数量","単位","単価","金額","備考"],
      "rows": [
        ["内装改修工事 一式",1,"式",420000,420000,"仮設・養生・片付け含む"],
        ["追加手間・調整費",1,"式",38000,38000,""],
        ["安全協議費",1,"式",12000,12000,""]
      ]
    },
    "actions": { "preview_pdf": { "url": "https://example.com/mock-invoice.pdf" } }
  }
}

※ estimates も同フォーマットで単価だけ調整

6. コンポーネント仕様（API）

Rounding = 'none' | 'round' | 'ceil' | 'floor'

Shimebi = number | 'eom' // 1〜31 or 月末

applyRounding(amount:number, mode:Rounding): number

ShimebiPicker：props { value:Shimebi; onChange:(v:Shimebi)=>void }

RoundingChips：props { value:Rounding; onChange:(v:Rounding)=>void }

CustomerField：props { value?: string; fallback?: string; onChange:(text:string)=>void }

7. ローディング・エラー規約

ネットワーク中はボタン右に小スピナー。全画面ブロックはしない。

サーバー4xxは設定エラー、5xxは再試行案内の定型文のみ。

デモモード時は“生成不可”トーストを出さない（常にプレビュー可）。

8. 実装チェックリスト（PRレビュー用）

 端数既定が none
 締日Picker 実装（eom + 1..31）
 請求先初期化ロジック（project→report→MissingFields）
 Homeの2CTAがFold内に収まる
 ?demo=1 で meta.demo=true が返る／通常時は false
 PDFプレビュー は常に活性（デモで即URL）
