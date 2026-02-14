# Decision Log

## 2026-02-14
- Initialized Codex agent environment (`git init`, `pnpm init`, docs scaffold, AGENTS.md bootstrap).
- Selected `pnpm` as package manager baseline for all setup and scripts.
- Chose Next.js fullstack (App Router) instead of split frontend/backend for MVP speed.
- Chose shadcn/ui primitives-first approach for UI consistency with minimal wrappers.
- Chose localStorage persistence for playlist state and tracker data (single-user local mode).
- Chose minutes-per-day scheduler with sequential non-splitting video allocation.
- Chose binary per-video completion tracking (no partial watch progress in MVP).
- Replaced YouTube Data API dependency with server-side `yt-dlp` extraction to remove API key requirement.
- Kept API contract stable at `GET /api/youtube/playlist` while swapping backend implementation.
- Added clone-friendly local bootstrap scripts (`scripts/setup-local.sh`, `scripts/setup-check.sh`) to auto-install Node/pnpm/yt-dlp and prepare `.env.local`.
- Optimized `yt-dlp` extraction to `--flat-playlist` fast-path with automatic full-extraction fallback when duration coverage is below threshold.
- Added pace-aware scheduling (`1x`, `1.5x`, `1.75x`, `2x`) with per-playlist playback speed persistence.
- Updated remaining-plan behavior to reschedule from today after watched progress updates.
- Fixed dashboard hydration mismatch by making initial render deterministic and subscribing to localStorage changes via `useSyncExternalStore`.
- Stabilized `useSyncExternalStore` snapshots by caching server/client snapshot references to prevent infinite re-render loops.
- Added multiline playlist batch import (one URL/ID per line) with partial-success behavior and single-submit summary reporting.
- Chose duplicate handling for batch import to skip already tracked playlist IDs instead of overwriting existing state.
