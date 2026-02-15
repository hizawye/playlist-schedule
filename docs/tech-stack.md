# Tech Stack

- Core: Next.js 16.1.6 (App Router), React 19, TypeScript
- Package Manager: pnpm
- UI: shadcn/ui, Tailwind CSS v4, Radix primitives
- Auth: next-auth (Google OAuth, Prisma adapter, DB sessions)
- Database: Supabase Postgres + Prisma ORM
- Data Extraction: server-side `yt-dlp` (flat fast-path + full fallback)
- State Persistence: server-backed per-user playlist data
- Migration: one-time localStorage -> DB import endpoint with idempotency key
- Validation: Zod, ESLint, Vitest
- Design Style: Single-Layer Minimalism (dark-first)
- Local Dev Bootstrap: Bash scripts (`scripts/setup-local.sh`, `scripts/setup-check.sh`)
- Scheduling: per-playlist playback speed aware planning (`1x`, `1.5x`, `1.75x`, `2x`)
- Deployment: Fly.io (Dockerfile + `fly.toml` + release-time migration) with Supabase DB secrets
