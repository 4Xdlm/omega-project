#!/bin/bash
set -euo pipefail

# Verify GitHub token
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "❌ GITHUB_TOKEN not set"
  echo "Run: export GITHUB_TOKEN=ghp_your_token_here"
  exit 1
fi

echo "📦 Publishing packages to GitHub Packages..."

# Configure npm registry
npm config set @omega-private:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken "${GITHUB_TOKEN}"

PACKAGES=(
  "nexus/shared"
  "nexus/atlas"
  "nexus/raw"
  "nexus/proof-utils"
)

ROOT_DIR=$(pwd)

# Dry run first
echo ""
echo "🔍 Dry run..."
for pkg in "${PACKAGES[@]}"; do
  echo "  Checking $pkg..."
  cd "$ROOT_DIR/$pkg"
  npm publish --dry-run 2>&1 | tail -3
done

cd "$ROOT_DIR"

echo ""
read -p "Proceed with publish? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Publish cancelled"
  exit 1
fi

# Actual publish
echo ""
echo "📤 Publishing..."
for pkg in "${PACKAGES[@]}"; do
  echo ""
  echo "Publishing $pkg..."
  cd "$ROOT_DIR/$pkg"
  npm publish
  echo "✅ $pkg published"
done

cd "$ROOT_DIR"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ All packages published successfully"
echo "════════════════════════════════════════════════════════════════"
