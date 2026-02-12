Deprecated: -> README.md
# Repository Guidelines

## Project Structure & Module Organization
- Root workspace; mobile app lives in `mobile-app/`.
- App code: `mobile-app/app/`, `components/`, `hooks/`, `lib/`, `theme/`, `types/`.
- Utilities: `src/utils/` (pure TS helpers) and `lib/` (platform/IO code such as Supabase, network, storage).
- Assets: `assets/` (images, fonts). Config: `app.config.js`, `babel.config.js`, `tsconfig.json`.
- Tests: `__tests__/` (co-located under `mobile-app/`). Database: `supabase/` (migrations, setup docs).

## Build, Test, and Development Commands
- Install: `cd mobile-app && npm install`.
- Start (Expo): `npm run start` (with tunnel), or `npm run start-local`/`start-lan`.
- Platform launch: `npm run ios` or `npm run android` (opens simulator/device via Expo).
- Lint: `npm run lint` (Expo ESLint rules). Metro cache clear: `npm run clean:metro`.
- Env check (optional): `scripts/check-environment.sh` to validate Node/Expo/deps.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Indent 2 spaces, single quotes, no semicolons.
- Imports: use path aliases like `@/lib/...` (see `tsconfig.json`).
- Components: PascalCase files (e.g., `GlobalFABMenu.tsx`). Hooks: `useX` naming in `hooks/`.
- Pure helpers in `src/utils/`; platform code in `lib/`.
- Run `npm run lint` before pushing; fix warnings in touched files.

## Testing Guidelines
- Framework: Jest + `@testing-library/react-native`.
- Location: `mobile-app/__tests__/`; name tests `*.test.ts`/`*.test.tsx`.
- Write tests against behavior (queries/roles/events), avoid implementation details.
- If a `test` script is missing locally, run via your editor’s Jest runner or add `"test": "jest"` temporarily.

## Commit & Pull Request Guidelines
- Commits follow Conventional Commits: `feat:`, `fix:`, `refactor:` (project history uses this pattern).
- Scope clearly and keep subjects concise; include Japanese where helpful.
- PRs must include: clear description, linked issues, screenshots/video for UI, and a brief test plan.

## Security & Configuration Tips
- Secrets: Do not commit keys. Configure Supabase in `app.config.js` under `expo.extra` (e.g., `supabaseUrl`, `supabaseAnonKey`).
- Verify connectivity with the in-app logs and `lib/supabase.ts`; use `npm run start-tunnel` when on unstable networks.
- See `mobile-app/supabase/SETUP_INSTRUCTIONS.md` for database setup and RLS notes.

# Crafdy Engineering Agent Guide

本エージェントは “クラフディ(Crafdy)” の **モバイルアプリ** および **Supabase Edge Functions（Deno）** を、最小差分・安全第一で実装/修正する。UI互換とバックエンド運用の安定を最優先する。

---
## リポジトリ地図（最小）
- `mobile-app/supabase/functions/**` … Edge Functions（Deno）
- `mobile-app/app/**` … Expo/React Native（安全書類プレビューなど）
- **注意**: `supabase functions deploy` は **`mobile-app` 直下**で実行する

---
## 絶対ルール（House Rules）
1. **差分最小（該当ファイルのみ）**でPR/回答する。無関係ファイルを触らない。
2. **既存APIのUI互換**を壊さない（`blocks` / `meta` / `missing_fields` を維持）。
3. **AI_MOCK=1/0 いずれでもレスポンスのトップレベル構造は同一**。
4. Supabase 呼び出しは **“新規 Headers() + sanitize” のテンプレ**のみを使用（`req.headers` の流用禁止）。
5. 5s タイムアウト / 100KB超は **413** / UUID不正は **400**。既存ガードを保持。
6. 失敗時は **ログ出力 → モックへフォールバック**（UIを止めない）。

---
## レスポンス仕様（UI互換の核）
すべての生成系レスポンスは**必ず**以下を満たす：
```json
{
  "blocks": { "v":1, ... },
  "meta": { "docType":"ky|toolbox", "gcId": null|"...", "templateVersion": 1, "flags": { "elderly":false, "foreign":false } },
  "missing_fields": [{ "key":"attendees[]","label":"出席者","type":"list:string" }]
}

KY: blocks.table.columns=["リスク","対策","担当"]、3行。fields.attendees があれば 担当列を入力順で上書き。

TBM: blocks.fields.attendees を入力値またはDB値で上書き。agenda/decisions は固定で可（現状）。

actions: preview_pdf / export_xlsx|csv / open_page を温存（URLはモックで可）。

診断と運用フラグ

x-debug-db: 1 受信時は、AI_MOCK=0 でも DB診断JSON を返す：

{ "debug": { "sb_url": true|false, "has_sr_key": true|false, "project": {...}, "people_sample":[...], "flags": {...} } }

例外時は { "debug_error": "..." } を返す（500でも本文は上記形式）。

レート制限や __health など運用ハンドラは壊さない。

Secrets（Functions側）: SB_URL / SB_SERVICE_ROLE / SUPABASE_ANON_KEY。SR→anon に自動フォールバック。
