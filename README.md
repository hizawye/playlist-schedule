# Playlist Schedule

Web app to:
- Import one or more YouTube playlists (one link/ID per line) from server-side `yt-dlp`.
- Calculate total playlist duration and per-video watch time.
- Auto-build daily watch schedule from minutes per day.
- Apply playback pace (`1x`, `1.5x`, `1.75x`, `2x`) to compute effective watch time left.
- Predict end date.
- Track completion per video.

## Quick Setup (Local + Cloned Devices)

Run one command from repo root:

```bash
./scripts/setup-local.sh
```

Or:

```bash
pnpm setup
```

This script will:
- Install missing system deps (`node`, `pnpm`, `yt-dlp`) on Linux/macOS.
- Create `.env.local` from `.env.example` if missing.
- Install project deps with `pnpm install`.
- Run environment checks, lint, and tests.
- Use fast `yt-dlp` flat-playlist extraction with automatic full fallback when metadata quality is low.

## Manual Setup

1. Install dependencies:

```bash
pnpm install
```

2. Add env file:

```bash
cp .env.example .env.local
```

3. Make sure `yt-dlp` is installed and reachable:

```bash
yt-dlp --version
```

4. Configure `.env.local` if needed:

```bash
YTDLP_PATH=yt-dlp
YTDLP_TIMEOUT_MS=30000
YTDLP_FALLBACK_TIMEOUT_MS=90000
YTDLP_MIN_DURATION_COVERAGE_PCT=80
```

5. Start app:

```bash
pnpm dev
```

## Setup Check Only

```bash
pnpm setup:check
```

## Scripts

- `pnpm setup` - bootstrap local machine and project.
- `pnpm setup:check` - verify local environment requirements only.
- `pnpm dev` - run dev server.
- `pnpm build` - production build.
- `pnpm start` - run built app.
- `pnpm lint` - lint checks.
- `pnpm test` - run unit tests.

## Notes

- Persistence is local browser storage (`localStorage`).
- No OAuth in MVP.
- For restricted content, provide `YTDLP_COOKIES_FILE` and ensure your cookies are valid.
- Remaining schedule automatically re-plans from today based on watched videos and selected pace.

## Troubleshooting

- If `sudo` fails, rerun script with a user that has sudo access.
- If `yt-dlp` still not found after setup, set `YTDLP_PATH` in `.env.local` to its absolute path.
- If playlist extraction is incomplete, lower `YTDLP_MIN_DURATION_COVERAGE_PCT` or increase `YTDLP_FALLBACK_TIMEOUT_MS`.
- If corporate proxy blocks installer URLs, manually install `node`, `pnpm`, and `yt-dlp`, then run `pnpm install`.

## Deployment (Fly.io)

Prereqs:
- `flyctl` installed and authenticated.
- A unique app name.

1. Create and configure the app (region `fra`):

```bash
fly launch --region fra --no-deploy
```

2. If the app name is taken, update it in `fly.toml`:

```toml
app = "your-unique-app"
```

3. Deploy:

```bash
fly deploy
```

4. Verify listener and health:

```bash
fly logs -a your-unique-app
fly status -a your-unique-app
```

Expected startup logs should show `0.0.0.0:8080` as the listener.

5. Open the app:

```bash
fly open
```

Notes:
- The Docker image installs `yt-dlp`, so playlist import works without extra setup.
- For private/restricted playlists, set `YTDLP_COOKIES_FILE` as a Fly secret and mount the file.
- This project standardizes on port `8080` for Fly runtime (`fly.toml` `internal_port`, Docker `PORT`, and `next start`).
- If Fly reports `instance refused connection`, confirm all three port settings are still `8080` and redeploy.
