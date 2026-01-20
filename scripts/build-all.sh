#!/bin/bash
set -euo pipefail

echo "🔨 Building all packages..."

PACKAGES=(
  "nexus/shared"
  "nexus/atlas"
  "nexus/raw"
  "nexus/proof-utils"
)

ROOT_DIR=$(pwd)

for pkg in "${PACKAGES[@]}"; do
  echo ""
  echo "Building $pkg..."
  cd "$ROOT_DIR/$pkg"

  # Install dependencies if needed
  if [ ! -d "node_modules" ] && [ -f "package-lock.json" ]; then
    npm ci
  fi

  # Build
  npm run build

  echo "✅ $pkg built"
done

cd "$ROOT_DIR"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ All packages built successfully"
echo "════════════════════════════════════════════════════════════════"
