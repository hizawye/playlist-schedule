# Decision Log

## 2026-02-15 - Fly runtime port contract hardening
**Context:** Fly machines were healthy at process level but unreachable by proxy, with repeated `[PC01] instance refused connection` errors while app logs showed Next listening on port `3000`.
**Decision:** Standardize production listener to port `8080` across `fly.toml` (`internal_port`), Docker (`PORT`, `EXPOSE`), and runtime startup command (`next start -H 0.0.0.0 -p ${PORT:-8080}`).
**Rationale:** Removes implicit defaults and prevents future 3000/8080 drift between app runtime and Fly health checks.
**Consequences:** Local development remains unchanged (`pnpm dev`), but production now has explicit host/port startup guardrails.
**Alternatives Considered:** Keep `3000` and reconfigure Fly service/machine metadata only.

## 2026-02-14 - Fly.io deployment
**Context:** Need a low-cost paid hosting option that can run `yt-dlp` and the Next.js server.
**Decision:** Use Fly.io with a Docker-based deploy and install `yt-dlp` in the image.
**Rationale:** Fly.io provides low monthly cost, supports custom Docker images, and runs the required binary.
**Consequences:** Deployment is container-based; the app runs on a small VM with auto start/stop behavior.
**Alternatives Considered:** DigitalOcean Droplet, Hetzner Cloud VM.

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
