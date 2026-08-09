#!/bin/sh
# Install pnpm without corepack (avoids flaky registry.npmjs.org downloads via corepack).
# Tries: GitHub standalone binary → npm registry → npmmirror fallback.
set -eu

PNPM_VERSION="${PNPM_VERSION:-9.15.0}"
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmjs.org}"
ARCH="${TARGETARCH:-$(uname -m)}"

case "$ARCH" in
  amd64|x86_64) PNPM_ARCH=x64 ;;
  arm64|aarch64) PNPM_ARCH=arm64 ;;
  *) PNPM_ARCH=x64 ;;
esac

apk add --no-cache curl ca-certificates >/dev/null

install_github() {
  echo "Installing pnpm@${PNPM_VERSION} from GitHub releases (${PNPM_ARCH})..."
  curl -fsSL --retry 5 --retry-all-errors --retry-delay 2 \
    "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linuxstatic-${PNPM_ARCH}" \
    -o /usr/local/bin/pnpm
  chmod +x /usr/local/bin/pnpm
  /usr/local/bin/pnpm --version
}

install_npm() {
  echo "Installing pnpm@${PNPM_VERSION} via npm (${NPM_REGISTRY})..."
  npm install -g "pnpm@${PNPM_VERSION}" --registry "$NPM_REGISTRY"
  pnpm --version
}

install_mirror() {
  echo "Installing pnpm@${PNPM_VERSION} via npmmirror fallback..."
  npm install -g "pnpm@${PNPM_VERSION}" --registry https://registry.npmmirror.com
  pnpm --version
}

install_github || install_npm || install_mirror

# Harden subsequent package downloads
pnpm config set fetch-retries 5
pnpm config set fetch-retry-mintimeout 20000
pnpm config set fetch-retry-maxtimeout 120000
pnpm config set network-concurrency 4
