#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SUDO=""
PKG_MANAGER=""

log() {
  echo "[setup] $*"
}

warn() {
  echo "[setup][warn] $*" >&2
}

fail() {
  echo "[setup][error] $*" >&2
  exit 1
}

ensure_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
    return
  fi

  if ! command -v sudo >/dev/null 2>&1; then
    fail "sudo is required to install system dependencies."
  fi

  sudo -v || fail "Failed to acquire sudo privileges."
  SUDO="sudo"
}

run_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
    return
  fi

  if [ -z "$SUDO" ]; then
    ensure_sudo
  fi
  sudo "$@"
}

detect_os() {
  case "$(uname -s)" in
    Linux) echo "linux" ;;
    Darwin) echo "darwin" ;;
    *) fail "Unsupported OS: $(uname -s). Supported: Linux/macOS." ;;
  esac
}

detect_linux_pm() {
  if command -v dnf >/dev/null 2>&1; then
    echo "dnf"
    return
  fi
  if command -v apt-get >/dev/null 2>&1; then
    echo "apt-get"
    return
  fi
  if command -v pacman >/dev/null 2>&1; then
    echo "pacman"
    return
  fi
  if command -v zypper >/dev/null 2>&1; then
    echo "zypper"
    return
  fi
  fail "No supported Linux package manager found (dnf/apt-get/pacman/zypper)."
}

ensure_homebrew() {
  if command -v brew >/dev/null 2>&1; then
    return
  fi

  log "Homebrew not found. Installing Homebrew."
  NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [ -x "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x "/usr/local/bin/brew" ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi

  command -v brew >/dev/null 2>&1 || fail "Homebrew installation failed."
}

install_base_linux_tools() {
  case "$PKG_MANAGER" in
    dnf)
      run_root dnf install -y curl git ca-certificates
      ;;
    apt-get)
      run_root apt-get update
      run_root apt-get install -y curl git ca-certificates
      ;;
    pacman)
      run_root pacman -Sy --noconfirm curl git ca-certificates
      ;;
    zypper)
      run_root zypper --non-interactive install curl git ca-certificates
      ;;
    *)
      fail "Unsupported package manager: $PKG_MANAGER"
      ;;
  esac
}

ensure_node_lts_linux() {
  local need_install="0"
  if ! command -v node >/dev/null 2>&1; then
    need_install="1"
  else
    local major
    major="$(node -p "Number(process.versions.node.split('.')[0])")"
    if [ "$major" -lt 20 ]; then
      need_install="1"
    fi
  fi

  if [ "$need_install" -eq 0 ]; then
    return
  fi

  log "Installing Node.js 20+"
  case "$PKG_MANAGER" in
    dnf)
      curl -fsSL https://rpm.nodesource.com/setup_20.x | run_root bash -
      run_root dnf install -y nodejs
      ;;
    apt-get)
      curl -fsSL https://deb.nodesource.com/setup_20.x | run_root bash -
      run_root apt-get install -y nodejs
      ;;
    pacman)
      run_root pacman -Sy --noconfirm nodejs npm
      ;;
    zypper)
      run_root zypper --non-interactive install nodejs20 npm20 || \
        run_root zypper --non-interactive install nodejs npm
      ;;
    *)
      fail "Unsupported package manager: $PKG_MANAGER"
      ;;
  esac

  command -v node >/dev/null 2>&1 || fail "Node.js installation failed."
  local major
  major="$(node -p "Number(process.versions.node.split('.')[0])")"
  if [ "$major" -lt 20 ]; then
    fail "Node.js >= 20 is required. Found $(node -v)."
  fi
}

ensure_node_lts_macos() {
  local need_install="0"
  if ! command -v node >/dev/null 2>&1; then
    need_install="1"
  else
    local major
    major="$(node -p "Number(process.versions.node.split('.')[0])")"
    if [ "$major" -lt 20 ]; then
      need_install="1"
    fi
  fi

  if [ "$need_install" -eq 0 ]; then
    return
  fi

  ensure_homebrew
  log "Installing Node.js 20+ via Homebrew"
  brew install node
}

pnpm_version_spec() {
  local detected
  detected="$(grep -oE '"packageManager":\s*"pnpm@[0-9]+\.[0-9]+\.[0-9]+"' package.json | sed -E 's/.*pnpm@([0-9]+\.[0-9]+\.[0-9]+).*/\1/' || true)"
  if [ -n "$detected" ]; then
    echo "$detected"
  else
    echo "10.29.2"
  fi
}

ensure_pnpm() {
  local version
  version="$(pnpm_version_spec)"

  if command -v pnpm >/dev/null 2>&1; then
    return
  fi

  log "Installing pnpm@$version"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare "pnpm@$version" --activate
    return
  fi

  if ! command -v npm >/dev/null 2>&1; then
    fail "npm missing; cannot install pnpm."
  fi
  run_root npm install -g "pnpm@$version"
}

install_ytdlp_linux() {
  case "$PKG_MANAGER" in
    dnf)
      run_root dnf install -y yt-dlp
      ;;
    apt-get)
      run_root apt-get update
      run_root apt-get install -y yt-dlp
      ;;
    pacman)
      run_root pacman -Sy --noconfirm yt-dlp
      ;;
    zypper)
      run_root zypper --non-interactive install yt-dlp
      ;;
    *)
      return 1
      ;;
  esac
}

install_ytdlp_binary_fallback() {
  log "Installing yt-dlp binary fallback to /usr/local/bin/yt-dlp"
  run_root curl -fL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp
  run_root chmod a+rx /usr/local/bin/yt-dlp
}

ensure_ytdlp() {
  if command -v yt-dlp >/dev/null 2>&1; then
    return
  fi

  local os
  os="$(detect_os)"
  log "Installing yt-dlp"
  if [ "$os" = "darwin" ]; then
    ensure_homebrew
    brew install yt-dlp
  else
    if ! install_ytdlp_linux; then
      warn "Package manager install for yt-dlp failed. Trying binary fallback."
      install_ytdlp_binary_fallback
    fi
  fi

  if ! command -v yt-dlp >/dev/null 2>&1; then
    fail "yt-dlp installation failed."
  fi
}

ensure_env_local() {
  if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    log "Created .env.local from .env.example"
  fi

  append_if_missing "YTDLP_PATH" "yt-dlp"
  append_if_missing "YTDLP_TIMEOUT_MS" "30000"
  append_if_missing "YTDLP_FALLBACK_TIMEOUT_MS" "90000"
  append_if_missing "YTDLP_MAX_BUFFER_BYTES" "26214400"
  append_if_missing "YTDLP_MIN_DURATION_COVERAGE_PCT" "80"
}

append_if_missing() {
  local key="$1"
  local value="$2"
  if ! grep -Eq "^${key}=" ".env.local"; then
    printf "\n%s=%s\n" "$key" "$value" >> .env.local
    log "Added $key to .env.local"
  fi
}

main() {
  local os
  os="$(detect_os)"
  log "Detected OS: $os"

  if [ "$os" = "linux" ]; then
    PKG_MANAGER="$(detect_linux_pm)"
    log "Using package manager: $PKG_MANAGER"
    if ! command -v curl >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
      install_base_linux_tools
    fi
    ensure_node_lts_linux
  else
    ensure_node_lts_macos
  fi

  ensure_pnpm
  ensure_ytdlp
  ensure_env_local

  log "Installing project dependencies"
  pnpm install

  log "Running environment checks"
  bash ./scripts/setup-check.sh

  log "Running lint and tests"
  pnpm lint
  pnpm test

  log "Setup complete."
  echo "Next:"
  echo "  pnpm dev"
  echo "  Open http://localhost:3000"
}

main "$@"
