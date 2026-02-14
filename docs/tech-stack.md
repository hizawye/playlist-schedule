# Tech Stack

- Core: Next.js 16.1.6 (App Router), React 19, TypeScript
- Package Manager: pnpm
- UI: shadcn/ui, Tailwind CSS v4, Radix primitives
- Data: server-side `yt-dlp` playlist extraction (flat fast-path + full fallback)
- State Persistence: Browser localStorage
- Validation: ESLint, Vitest
- Design Style: Single-Layer Minimalism (dark-first)
- Local Dev Bootstrap: Bash scripts (`scripts/setup-local.sh`, `scripts/setup-check.sh`)
- Scheduling: per-playlist playback speed aware planning (`1x`, `1.5x`, `1.75x`, `2x`)
- Deployment: Fly.io (Dockerfile + `fly.toml`)
