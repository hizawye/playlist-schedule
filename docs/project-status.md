# Project Status

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
- Unit tests added and passing (`lib/*.test.ts`).
- Validation complete: `pnpm lint`, `pnpm test`, `pnpm build`.

## Blockers / Bugs
- Requires `yt-dlp` binary installed on server/runtime to import playlists.

## Next Immediate Starting Point
- Validate pace-aware timeline/table UX polish on mobile and add inline helper copy if needed.
