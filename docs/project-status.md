# Project Status

Last Updated: 2026-02-15 - Fixed Fly runtime port mismatch by standardizing production listener on 8080.

## Current Progress
- Implemented full MVP web app:
- Next.js + TypeScript + shadcn/ui setup completed.
- Playlist fetch endpoint implemented at `app/api/youtube/playlist/route.ts`.
- Dashboard implemented for multi-playlist import and overview metrics.
- Playlist detail page implemented with daily schedule + per-video tracker.
- localStorage persistence implemented (`lib/storage.ts`).
- Scheduler engine implemented (`lib/scheduler.ts`) with end-date projection.
- Migrated backend playlist extraction from YouTube Data API to server-side `yt-dlp` (`lib/yt-dlp.ts`).
- Added local setup automation scripts (`scripts/setup-local.sh`, `scripts/setup-check.sh`) for cloned devices.
- Optimized extraction latency with `yt-dlp` flat-playlist fast-path and quality-based fallback.
- Added pace-aware schedule controls and calculations (1x, 1.5x, 1.75x, 2x) per playlist.
- Updated remaining schedule recomputation to start from today after videos are marked watched.
- Fixed hydration mismatch on dashboard by replacing first-render localStorage initialization with `useSyncExternalStore` subscription.
- Added multiline playlist import support (one URL/ID per line) in dashboard form.
- Implemented batch import flow with partial success summary, invalid-line accounting, and skip-existing duplicate behavior.
- Added multiline parser utility and unit tests (`parsePlaylistIdsFromMultiline`).
- Unit tests added and passing (`lib/*.test.ts`).
- Validation complete: `pnpm lint`, `pnpm test`, `pnpm build`.
- Added Fly.io deployment artifacts (`Dockerfile`, `.dockerignore`, `fly.toml`) with `yt-dlp` installed in image.
- Added Fly.io deployment section to README.
- Fixed Fly connection failures by aligning app runtime to `0.0.0.0:8080` across `fly.toml`, Docker, and `next start` script.
- Added Fly deployment verification and port-drift troubleshooting notes to README.

## Blockers / Bugs
- Requires `yt-dlp` binary available in the runtime environment to import playlists.
- Pending remote verification: redeploy and confirm Fly health checks pass with no `[PC01] instance refused connection` events.

## Next Immediate Starting Point
- Run `fly deploy` and validate machine health/logs (`fly status`, `fly logs`) show successful routing on port 8080.
