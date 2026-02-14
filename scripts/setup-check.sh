#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail_count=0

check_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing command: $name"
    fail_count=$((fail_count + 1))
  fi
}

check_command node
check_command pnpm
check_command yt-dlp

if command -v node >/dev/null 2>&1; then
  node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
  if [ "$node_major" -lt 20 ]; then
    echo "Node.js >= 20 required, found: $(node -v)"
    fail_count=$((fail_count + 1))
  fi
fi

if [ ! -f ".env.local" ]; then
  echo "Missing .env.local"
  fail_count=$((fail_count + 1))
fi

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi

echo "Environment checks passed."
echo "node: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "yt-dlp: $(yt-dlp --version)"

