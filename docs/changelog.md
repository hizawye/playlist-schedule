# Changelog

## 2026-02-15 - Google sign-in flow fix
### Fixed
- Replaced direct `GET /api/auth/signin/google` link with client-side NextAuth `signIn("google")` flow.
- Resolved `/sign-in?...&error=google` loop and restored redirect to Google OAuth consent endpoint.

## 2026-02-15 - Supabase Postgres cutover plan
### Changed
- Switched production DB hosting guidance from Fly Postgres to Supabase Postgres.
- Updated Fly release command to use `DIRECT_DATABASE_URL` for migrations when available, with fallback to `DATABASE_URL`.
- Updated `.env.example`, README, and docs runbooks for Supabase pooler/direct URL secret setup.

## 2026-02-15 - Database + Auth rollout
### Added
- PostgreSQL persistence via Prisma with initial migration schema.
- NextAuth Google OAuth integration with database sessions.
- Sign-in page and authenticated page/API guards.
- Playlist repository and API routes for list/import/config/progress/refresh/delete.
- One-time localStorage migration endpoint with idempotency key support.
- Fly release migration command (`pnpm db:migrate`).
- Unit tests for migration-key determinism and contract schema validation.

### Changed
- Dashboard/detail data flow migrated from localStorage to authenticated APIs.
- README and env templates updated for DB/auth/Fly deployment.
- Build pipeline now generates Prisma client before Next build.

## 2026-02-15 - Fly port mismatch hotfix
### Changed
- Standardized production listener to `0.0.0.0:8080` across Fly service config, Docker image defaults, and runtime start command.
- Updated README Fly deployment guide with explicit health verification and port-drift troubleshooting steps.

## 2026-02-14 - Fly.io deployment
### Added
- Docker-based Fly.io deployment artifacts with `yt-dlp` installed in the image.
- README deployment section with Fly.io steps.

## 2026-02-14
- Bootstrapped repository docs and AGENTS configuration.
- Added Next.js app scaffold and shadcn/ui setup.
- Implemented YouTube playlist API route and duration parsing.
- Implemented multi-playlist dashboard and playlist detail pages.
- Implemented schedule engine, end-date projection, and per-video completion tracker.
- Added localStorage persistence and unit tests.
- Replaced YouTube Data API-key backend with `yt-dlp` server-side extraction while keeping API route contract unchanged.
- Added setup automation scripts for local/bootstrap on cloned devices.
- Optimized playlist extraction speed using `yt-dlp --flat-playlist` with automatic full-mode fallback for low metadata coverage.
- Added per-playlist playback speed selector and pace-adjusted remaining-time calculation.
- Updated scheduler to re-plan remaining videos from today when progress changes.
- Fixed hydration mismatch on `/` by aligning server/client first render and moving persisted playlist sync to a hydration-safe store subscription.
- Fixed `useSyncExternalStore` snapshot caching on dashboard to avoid infinite loop warnings.
- Added multiline playlist input support to import multiple playlists in one submit (one URL/ID per line).
- Added batch-import summary behavior: partial success, invalid-line reporting, and skip-existing duplicates.
