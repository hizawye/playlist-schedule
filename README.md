# Playlist Schedule

Web app to:
- Import one or more YouTube playlists (one link/ID per line) from server-side `yt-dlp`.
- Calculate total playlist duration and per-video watch time.
- Auto-build daily watch schedule from minutes per day.
- Apply playback pace (`1x`, `1.5x`, `1.75x`, `2x`) to compute effective watch time left.
- Predict end date.
- Track completion per video per authenticated account.

## Stack

- Next.js App Router + TypeScript
- Auth: `next-auth` (Google OAuth)
- DB: Supabase Postgres + Prisma
- Playlist extraction: server-side `yt-dlp`
- Deployment target: Fly.io

## Quick Setup (Local)

1. Install dependencies:

```bash
pnpm install
```

2. Copy env file:

```bash
cp .env.example .env.local
```

3. Start a local Postgres instance (example with Docker):

```bash
docker run --name playlist-schedule-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=playlist_schedule \
  -p 5432:5432 -d postgres:16
```

4. Apply migrations:

```bash
pnpm db:migrate
```

5. Start app:

```bash
pnpm dev
```

## Environment Variables

Required for DB/auth:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`

Optional (recommended for production migrations when runtime uses pooler):

- `DIRECT_DATABASE_URL`

Optional for playlist extraction tuning:

- `YTDLP_PATH`
- `YTDLP_TIMEOUT_MS`
- `YTDLP_FALLBACK_TIMEOUT_MS`
- `YTDLP_MAX_BUFFER_BYTES`
- `YTDLP_MIN_DURATION_COVERAGE_PCT`
- `YTDLP_COOKIES_FILE`

## Google OAuth Setup

Add these redirect URIs in your Google OAuth app:

- Local: `http://localhost:3000/api/auth/callback/google`
- Fly production: `https://<your-fly-app>.fly.dev/api/auth/callback/google`

## Scripts

- `pnpm setup` - bootstrap local machine and project.
- `pnpm setup:check` - verify local environment requirements only.
- `pnpm db:generate` - generate Prisma client.
- `pnpm db:migrate` - apply Prisma migrations.
- `pnpm db:push` - push schema directly (non-migration).
- `pnpm db:studio` - open Prisma Studio.
- `pnpm dev` - run dev server.
- `pnpm build` - generate Prisma client and build production bundle.
- `pnpm start` - run built app.
- `pnpm lint` - lint checks.
- `pnpm test` - run unit tests.

## Deployment (Fly.io)

Prereqs:
- `flyctl` installed and authenticated.
- Fly app already created.
- Supabase project created in the same region as Fly app.

1. Copy Supabase connection strings:
- Pooler URL for runtime (set as `DATABASE_URL`).
- Direct URL for migrations (set as `DIRECT_DATABASE_URL`, optional but recommended).

2. Set required secrets:

```bash
fly secrets set \
  DATABASE_URL="postgresql://<pooler-url>" \
  DIRECT_DATABASE_URL="postgresql://<direct-url>" \
  AUTH_SECRET="$(openssl rand -base64 32)" \
  AUTH_GOOGLE_ID="..." \
  AUTH_GOOGLE_SECRET="..." \
  NEXTAUTH_URL="https://<your-fly-app>.fly.dev"
```

3. Deploy:

```bash
fly deploy
```

4. Verify health and release migration:

```bash
fly status -a <your-fly-app>
fly logs -a <your-fly-app>
```

Notes:
- `fly.toml` runs DB migrations in release phase and prefers `DIRECT_DATABASE_URL` when set, otherwise falls back to `DATABASE_URL`.
- The Docker image installs `yt-dlp`, so playlist import works without extra setup.
- Runtime listener is standardized on `0.0.0.0:8080`.

## Troubleshooting

- If auth fails with callback mismatch, check `NEXTAUTH_URL` and Google OAuth redirect URIs.
- If release migration fails against pooled DB, set `DIRECT_DATABASE_URL` to Supabase direct connection string.
- If DB queries fail in production, confirm `DATABASE_URL` is set to Supabase pooler URL and reachable from Fly.
- If playlist extraction is incomplete, lower `YTDLP_MIN_DURATION_COVERAGE_PCT` or increase `YTDLP_FALLBACK_TIMEOUT_MS`.
- If `yt-dlp` is missing locally, set `YTDLP_PATH` to its absolute path.
