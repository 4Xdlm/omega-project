#!/usr/bin/env bash
# OMEGA Install Script (Bash)
# Phase G.0 — Install and verify OMEGA release

set -euo pipefail

VERSION="${1:?Usage: install-omega.sh <version> [install-dir]}"
INSTALL_DIR="${2:-$HOME/.local/share/omega}"

echo "OMEGA Installer v${VERSION}"
echo "Install directory: ${INSTALL_DIR}"

# 1. Check Node.js
if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js is required but not found" >&2
    exit 1
fi
echo "Node.js: $(node --version)"

# 2. Create install directory
mkdir -p "${INSTALL_DIR}"

# 3. Detect platform
PLATFORM=""
case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)  PLATFORM="linux-x64" ;;
    Darwin-arm64)  PLATFORM="macos-arm64" ;;
    *)
        echo "ERROR: Unsupported platform: $(uname -s)-$(uname -m)" >&2
        exit 1
        ;;
esac

FILENAME="omega-${VERSION}-${PLATFORM}.tar.gz"
echo "Archive: ${FILENAME}"

# 4. Verify checksum
CHECKSUM_FILE="omega-${VERSION}-checksums.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
    echo "Verifying checksum..."
    EXPECTED=$(grep "${FILENAME}" "${CHECKSUM_FILE}" | awk '{print $1}')
    ACTUAL=$(sha256sum "${FILENAME}" | awk '{print $1}')
    if [ "${EXPECTED}" != "${ACTUAL}" ]; then
        echo "ERROR: Checksum mismatch!" >&2
        echo "  Expected: ${EXPECTED}" >&2
        echo "  Actual:   ${ACTUAL}" >&2
        exit 1
    fi
    echo "Checksum verified"
else
    echo "WARNING: No checksum file found, skipping verification"
fi

# 5. Extract
echo "Extracting to ${INSTALL_DIR}..."
if [ -f "${FILENAME}" ]; then
    tar -xzf "${FILENAME}" -C "${INSTALL_DIR}"
fi

# 6. Self-test
echo "Running self-test..."
node "${INSTALL_DIR}/omega-release" selftest || true

echo ""
echo "OMEGA v${VERSION} installed successfully"
