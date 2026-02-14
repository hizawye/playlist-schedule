# Architecture

## Overview
- Framework: Next.js App Router (`app/`).
- UI: shadcn/ui primitives + Tailwind CSS v4 (dark-first theme).
- Data source: server-side `yt-dlp` via API route (`app/api/youtube/playlist/route.ts`).
- Persistence: Browser localStorage (single-user local state).
- Local bootstrap: `scripts/setup-local.sh` for machine provisioning and project initialization.

## Runtime Flow
1. User adds playlist URL/ID on dashboard.
2. Client extracts `playlistId` and calls `GET /api/youtube/playlist`.
3. Server route executes fast `yt-dlp --flat-playlist --dump-single-json`.
4. If duration coverage is below threshold, route falls back to full extraction mode.
5. Client stores normalized `PlaylistState` in localStorage.
6. Scheduler computes day buckets from `minutesPerDay`, playback speed, and active start (today or future configured start).
7. Detail page tracks per-video completion and recomputes remaining schedule/ETA.

## Key Modules
- `app/api/youtube/playlist/route.ts`: API surface + error mapping.
- `lib/yt-dlp.ts`: `yt-dlp` fast-path/fallback orchestration + JSON mapping to snapshot.
- `lib/scheduler.ts`: Schedule generation and progress-aware recomputation.
- `lib/scheduler.ts`: Pace-aware schedule generation and progress-aware recomputation from today.
- `lib/youtube.ts`: Playlist ID parsing and ISO8601 duration parsing.
- `lib/storage.ts`: Versioned localStorage load/save helpers.
- `components/video-table.tsx`: Sort/filter table and completion toggles.
- `scripts/setup-local.sh`: installs missing system deps + project deps + validations.
- `scripts/setup-check.sh`: validates local runtime prerequisites.
