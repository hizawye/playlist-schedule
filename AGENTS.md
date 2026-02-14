# Project: playlist-schedule

## 🏗 Tech Stack
- **Core:** Next.js 16 (App Router) + React 19 + TypeScript
- **Package Manager:** pnpm
- **Design:** Single-Layer Minimalism
- **Env:** Fedora / Fish / Neovim

## 🔧 Build Scripts
- `pnpm setup`
- `pnpm setup:check`
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm test`
- `pnpm test:watch`

## 🔄 Autonomous Workflow
- **Initialization:** Read `docs/` to restore mental model.
- **Sync Routine:** 1. Update `docs/`
  2. `git add docs/ && git commit -m "docs: sync project state"`
  3. `git add . && git commit -m "feat/fix: [desc]"`

## ⚡ Agent Commands
- **/context**: `cat docs/project-status.md docs/decision-log.md docs/architecture.md`
- **/status**: `cat docs/project-status.md`
- **/history**: `tail -n 20 docs/decision-log.md`
