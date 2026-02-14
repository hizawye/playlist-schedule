# Changelog

## 2026-02-14 - Fly.io deployment
### Added
- Docker-based Fly.io deployment artifacts with `yt-dlp` installed in the image.

## 2026-02-14
- Bootstrapped repository docs and AGENTS configuration.
- Added Next.js app scaffold and shadcn/ui setup.
- Implemented YouTube playlist API route and duration parsing.
- Implemented multi-playlist dashboard and playlist detail pages.
- Implemented schedule engine, end-date projection, and per-video completion tracker.
- Added localStorage persistence and unit tests.
- Replaced YouTube Data API-key backend with `yt-dlp` server-side extraction while keeping API route contract unchanged.
- Added setup automation scripts for local/bootstrap on cloned devices.
- Optimized playlist extraction speed using `yt-dlp --flat-playlist` with automatic full-mode fallback for low metadata coverage.
- Added per-playlist playback speed selector and pace-adjusted remaining-time calculation.
- Updated scheduler to re-plan remaining videos from today when progress changes.
- Fixed hydration mismatch on `/` by aligning server/client first render and moving persisted playlist sync to a hydration-safe store subscription.
- Fixed `useSyncExternalStore` snapshot caching on dashboard to avoid infinite loop warnings.
- Added multiline playlist input support to import multiple playlists in one submit (one URL/ID per line).
- Added batch-import summary behavior: partial success, invalid-line reporting, and skip-existing duplicates.
