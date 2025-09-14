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

