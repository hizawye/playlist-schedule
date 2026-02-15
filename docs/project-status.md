# Project Status

Last Updated: 2026-02-15 - Fixed Google sign-in failure by switching sign-in flow to NextAuth client `signIn()` POST flow and redeployed.

## Current Progress
- Migrated app persistence from browser localStorage to PostgreSQL.
- Added Prisma ORM setup (`prisma/schema.prisma`, migration SQL, Prisma client generation scripts).
- Added NextAuth (`next-auth`) with Google OAuth and Prisma adapter.
- Added authenticated sign-in page at `app/sign-in/page.tsx`.
- Added per-user playlist APIs:
- `GET /api/playlists`
- `POST /api/playlists/import`
- `GET|DELETE /api/playlists/[playlistId]`
- `PATCH /api/playlists/[playlistId]/config`
- `PATCH /api/playlists/[playlistId]/progress`
- `POST /api/playlists/[playlistId]/refresh`
- Added one-time local migration API `POST /api/migration/local-state` with idempotency key.
- Added repository layer for DB mapping and strict user scoping (`lib/server/playlists-repository.ts`).
- Refactored dashboard and playlist detail UI to API-backed state.
- Added account sign-out action on dashboard.
- Protected app pages and APIs by session checks.
- Kept `yt-dlp` extraction flow and scheduler logic unchanged.
- Added Fly release migration hook with direct-url fallback (`fly.toml` release command uses `DIRECT_DATABASE_URL` when available).
- Updated `.env.example` and README for Supabase Postgres + Fly setup.
- Added tests for migration key determinism and API schema contracts.
- Installed `flyctl` in this environment (`~/.fly/bin/flyctl`).
- Loaded `.env.local` keys and successfully ran `pnpm db:migrate` against Supabase pooler host (`aws-1-eu-west-1.pooler.supabase.com`).
- Set Fly secrets from `.env.local` for `playlist-schedule`:
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL=https://playlist-schedule.fly.dev`
- Deployed release `v5` on Fly and confirmed `release_command` migration succeeded (`No pending migrations to apply` against Supabase direct host).
- Verified production responses:
- `GET /` redirects to `/sign-in` (expected for unauthenticated users).
- `GET /sign-in` returns `200` and renders `Continue with Google`.
- Fixed auth bug where direct `GET /api/auth/signin/google` link returned `/sign-in?...&error=google`.
- Updated sign-in UI to use CSRF-backed NextAuth client `signIn("google")`.
- Deployed release `v6` on Fly and validated OAuth initiation returns redirect to `https://accounts.google.com/...`.
- Validation complete:
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Blockers / Bugs
- Requires valid production secrets before deploy (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL`).
- For pooled runtime, release migrations are more reliable when `DIRECT_DATABASE_URL` is set.
- Requires Google OAuth client redirect URI registration for Fly domain.
- Existing local browser data only migrates after user signs in once on that same browser.
- Fly trial limitation observed in logs: machines are auto-stopped after ~5 minutes with warning to add a credit card.

## Next Immediate Starting Point
- Add billing method in Fly account to remove trial stop behavior and keep machine availability stable.
