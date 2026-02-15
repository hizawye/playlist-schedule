# Architecture

## Overview
- Framework: Next.js App Router (`app/`).
- UI: shadcn/ui primitives + Tailwind CSS v4.
- Auth: NextAuth with Google OAuth and database sessions.
- Persistence: PostgreSQL via Prisma.
- Extraction: server-side `yt-dlp` with flat fast-path and full fallback.
- Deployment: Fly.io via Docker with Supabase Postgres and release-time DB migration command.

## Runtime Flow
1. User lands on `/`, unauthenticated users are redirected to `/sign-in`.
2. User signs in via Google OAuth (`/api/auth/[...nextauth]`).
3. Dashboard reads account playlists from `GET /api/playlists`.
4. Import requests call `POST /api/playlists/import`:
- fetch snapshot via `yt-dlp`
- persist playlist + videos + config to Postgres
5. Detail page reads from `GET /api/playlists/[playlistId]` and updates via:
- `PATCH /config` for plan settings
- `PATCH /progress` for completion state
- `POST /refresh` for snapshot refresh
6. Scheduler (`lib/scheduler.ts`) computes day buckets client-side from server DTOs.
7. One-time migration: legacy localStorage data can be imported via `POST /api/migration/local-state`.

## Data Model
- `User`, `Account`, `Session`, `VerificationToken` (NextAuth adapter models).
- `Playlist`: per-user playlist metadata + plan config.
- `PlaylistVideo`: normalized video rows per playlist.
- `VideoProgress`: per-video completion rows.
- `UserSettings`: migration completion metadata.
- `MigrationEvent`: idempotency records for local-state imports.

## Key Modules
- `lib/auth-options.ts`: NextAuth provider/session config.
- `lib/db.ts`: Prisma client singleton.
- `lib/server/playlists-repository.ts`: DB mapping and per-user data operations.
- `lib/server/playlists-contract.ts`: Zod schemas for playlist/migration API payloads.
- `lib/client/playlists-api.ts`: typed client API layer.
- `app/api/playlists/**`: authenticated playlist CRUD/import/refresh endpoints.
- `app/api/migration/local-state/route.ts`: one-time local data migration endpoint.
- `components/dashboard-client.tsx`: dashboard UI + import + migration trigger.
- `app/playlist/[playlistId]/playlist-detail-client.tsx`: detail UI backed by API.
- `lib/yt-dlp.ts`: extraction orchestration and error mapping.

## Access Control
- Every playlist API route requires a valid session.
- All DB reads/writes are scoped by `userId` and playlist composite keys.
- Cross-account access attempts return not-found/unauthorized responses.

## Production Database Routing
- Runtime queries use `DATABASE_URL` (Supabase pooler URL).
- Release migration command prefers `DIRECT_DATABASE_URL` when present, then falls back to `DATABASE_URL`.
