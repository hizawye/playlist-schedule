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

require_env_key() {
  local key="$1"
  if ! grep -Eq "^${key}=.+$" ".env.local"; then
    echo "Missing or empty .env.local key: ${key}"
    fail_count=$((fail_count + 1))
  fi
}

warn_env_key() {
  local key="$1"
  if ! grep -Eq "^${key}=.+$" ".env.local"; then
    echo "Warning: missing or empty .env.local key: ${key}"
  fi
}

if [ -f ".env.local" ]; then
  require_env_key "DATABASE_URL"
  require_env_key "AUTH_SECRET"
  require_env_key "NEXTAUTH_URL"
  warn_env_key "AUTH_GOOGLE_ID"
  warn_env_key "AUTH_GOOGLE_SECRET"
fi

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi

echo "Environment checks passed."
echo "node: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "yt-dlp: $(yt-dlp --version)"
