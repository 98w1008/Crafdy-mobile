# Data Model Overview (Core Workflow)

このドキュメントは、材料伝票 → 見積ドラフト → 請求下書きまでを支える最小スキーマをまとめたものです。すべてのテーブルは `company_id` を持ち、`same_company()` + `set_company_id()` による RLS でマルチテナントを担保しています。

```
client ─┐
        │     pricebooks        receipts ─ receipt_lines
projects ├─── items ───────────┼────────┘
        │                      │
        └─ estimates ─ estimate_lines
                                │
              daily_reports ─ timesheets
                                │
                      invoices ─ invoice_lines
```

## テーブル一覧

### clients
| Column      | Type      | Notes                       |
|-------------|-----------|-----------------------------|
| id          | uuid PK   | gen_random_uuid()           |
| company_id  | uuid      | `set_company_id()` で付与   |
| name        | text      | 顧客名                      |
| created_at  | timestamptz | 自動付与                 |

### projects
| Column     | Type    | Notes                                         |
|------------|---------|-----------------------------------------------|
| id         | uuid PK |                                              |
| company_id | uuid    | RLS キー                                     |
| client_id  | uuid FK | `clients(id)` / ON DELETE CASCADE             |
| name       | text    | 現場名                                       |
| start_date | date    | 任意                                        |
| end_date   | date    | 任意                                        |
| address    | text    | 任意                                        |
| created_at | timestamptz | 自動付与                                 |

### items
| Column     | Type       | Notes                                   |
|------------|------------|-----------------------------------------|
| id         | uuid PK    |                                         |
| company_id | uuid       |                                         |
| code       | text       | 任意コード (company内ユニーク)         |
| name       | text       | 品目名                                   |
| unit       | text       | 例: m², 本                               |
| synonyms   | text[]     | 正規化のための同義語集合                 |
| created_at | timestamptz |                                         |
| updated_at | timestamptz | `update_updated_at_column()` トリガで更新 |

### pricebooks
| Column     | Type    | Notes                                 |
|------------|---------|---------------------------------------|
| id         | uuid PK |                                       |
| company_id | uuid    |                                       |
| client_id  | uuid FK | `clients(id)`                          |
| item_id    | uuid FK | `items(id)`                            |
| unit_price | numeric | 税抜単価など                           |
| valid_from | date    | 必須                                   |
| valid_to   | date    | 任意 (NULL=無期限)                    |
| rounding   | text    | `round`/`ceil`/`floor` など予定        |
| created_at | timestamptz |                                     |

### receipts / receipt_lines
- `receipts` は既存テーブルを拡張し、`total`, `date`, `image_url` を追加。
- `receipt_lines` は伝票明細。`items` と結びつけて正規化します。

| receipt_lines Column | Type    | Notes                                      |
|----------------------|---------|--------------------------------------------|
| id                   | uuid PK |                                            |
| receipt_id           | uuid FK | `receipts(id)` / ON DELETE CASCADE         |
| item_id              | uuid FK | 任意。NULLなら未知の品目                  |
| name                 | text    | 明細名称                                   |
| qty                  | numeric | 数量                                       |
| unit                 | text    | 単位                                       |
| unit_price           | numeric | 単価                                       |
| amount               | numeric | 金額                                       |
| created_at           | timestamptz |                                        |

### estimates / estimate_lines
- 既存の `estimates` 数値列を `numeric` へ変更。
- `estimate_lines` は見積明細。`kind` で work/material/other を区別予定。

| Column     | Type    | Notes                                      |
|------------|---------|--------------------------------------------|
| estimate_id| uuid FK | `estimates(id)` / ON DELETE CASCADE         |
| item_id    | uuid FK | 任意                                        |
| kind       | text    | `material` / `work`                        |
| name       | text    |                                            |
| qty        | numeric |                                            |
| unit       | text    |                                            |
| unit_price | numeric |                                            |
| amount     | numeric |                                            |
| created_at | timestamptz |                                         |

`estimates.rounding` には `round / ceil / cut` など端数処理ポリシーを保持します。

### invoices / invoice_lines
- `invoices` に `period_from`, `period_to`, `rounding` を追加。
- `invoice_lines` は請求明細テーブル。

### daily_reports / timesheets
- 日報と勤怠。`daily_reports` は `projects` に紐づき、`timesheets` は日報単位で作業者・稼働時間を保持します。

| daily_reports Column | Type      | Notes                                   |
|----------------------|-----------|-----------------------------------------|
| project_id           | uuid FK   | `projects(id)`                           |
| date                 | date      | 日報日付                                 |
| notes                | text      | 任意メモ                                 |

| timesheets Column | Type        | Notes                                       |
|-------------------|-------------|---------------------------------------------|
| daily_report_id   | uuid FK     | `daily_reports(id)`                         |
| worker            | text        | 作業者名                                    |
| start_at          | timestamptz | 任意                                        |
| end_at            | timestamptz | 任意                                        |
| hours             | numeric     | 集計済み工数（準備として保持）             |

## RLS とトリガ
- `company_id` を持つテーブルは `set_company_id()` トリガで自動補完し、`same_company()` で SELECT/INSERT/UPDATE/DELETE を制御。
- 子テーブル（*_lines, timesheets）は親テーブルの company 判定をサブクエリで確認するポリシーを付与。

## 今後の拡張メモ
- レート制限の永続化や OCR プロバイダ切替は別Phaseで実装予定。
- `estimate_items` / `invoice_items` の既存データは `estimate_lines` / `invoice_lines` にマイグレーション済み。旧テーブル利用コードは順次置き換えます。
