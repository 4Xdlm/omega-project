#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA Release Script
# Version: 1.0.0
# Standard: NASA-Grade L4
# ═══════════════════════════════════════════════════════════════════════════════

VERSION="${1:-}"
DRY_RUN="${2:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check git
  if ! command -v git &> /dev/null; then
    log_error "git not found"
    exit 1
  fi

  # Check npm
  if ! command -v npm &> /dev/null; then
    log_error "npm not found"
    exit 1
  fi

  # Check gh CLI
  if ! command -v gh &> /dev/null; then
    log_warn "GitHub CLI (gh) not found - GitHub release will be skipped"
  fi

  # Check GITHUB_TOKEN
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    log_warn "GITHUB_TOKEN not set - package publish will fail"
  fi

  log_success "Prerequisites checked"
}

check_clean_working_tree() {
  log_info "Checking working tree..."

  if [[ -n $(git status --porcelain) ]]; then
    log_error "Working tree is not clean. Commit or stash changes first."
    git status --short
    exit 1
  fi

  log_success "Working tree is clean"
}

run_tests() {
  log_info "Running tests..."

  npm test

  TEST_COUNT=$(npm test 2>&1 | grep -oP '\d+(?= passed)' | tail -1)
  log_success "Tests passed: ${TEST_COUNT:-unknown}"
}

check_frozen_modules() {
  log_info "Checking FROZEN modules..."

  FROZEN_DIRS=(
    "packages/sentinel"
    "packages/genome"
    "gateway/sentinel"
  )

  # Get list of modified files since last tag
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

  if [ -n "$LAST_TAG" ]; then
    for dir in "${FROZEN_DIRS[@]}"; do
      if [ -d "$dir" ]; then
        MODIFIED=$(git diff --name-only "$LAST_TAG" HEAD -- "$dir" 2>/dev/null || echo "")
        if [ -n "$MODIFIED" ]; then
          log_error "FROZEN module modified: $dir"
          echo "$MODIFIED"
          exit 1
        fi
      fi
    done
  fi

  log_success "FROZEN modules intact"
}

generate_release_notes() {
  log_info "Generating release notes..."

  if [ -f "scripts/generate-release-notes.sh" ]; then
    bash scripts/generate-release-notes.sh "$VERSION" > "RELEASE_NOTES_${VERSION}.md"
    log_success "Release notes generated: RELEASE_NOTES_${VERSION}.md"
  else
    log_warn "Release notes script not found, skipping"
  fi
}

build_packages() {
  log_info "Building packages..."

  if [ -f "scripts/build-all.sh" ]; then
    bash scripts/build-all.sh
    log_success "Packages built"
  else
    log_warn "Build script not found, skipping"
  fi
}

create_git_tag() {
  log_info "Creating git tag: $VERSION"

  if [ "$DRY_RUN" = "true" ]; then
    log_warn "[DRY RUN] Would create tag: $VERSION"
    return
  fi

  # Check if tag exists
  if git rev-parse "$VERSION" >/dev/null 2>&1; then
    log_error "Tag $VERSION already exists"
    exit 1
  fi

  git tag -a "$VERSION" -m "Release $VERSION [NASA-L4]"
  log_success "Tag created: $VERSION"
}

push_to_remote() {
  log_info "Pushing to remote..."

  if [ "$DRY_RUN" = "true" ]; then
    log_warn "[DRY RUN] Would push to remote"
    return
  fi

  git push origin HEAD
  git push origin "$VERSION"
  log_success "Pushed to remote"
}

publish_packages() {
  log_info "Publishing packages..."

  if [ "$DRY_RUN" = "true" ]; then
    log_warn "[DRY RUN] Would publish packages"
    return
  fi

  if [ -z "${GITHUB_TOKEN:-}" ]; then
    log_warn "GITHUB_TOKEN not set, skipping package publish"
    return
  fi

  if [ -f "scripts/publish.sh" ]; then
    bash scripts/publish.sh
    log_success "Packages published"
  else
    log_warn "Publish script not found, skipping"
  fi
}

create_github_release() {
  log_info "Creating GitHub release..."

  if [ "$DRY_RUN" = "true" ]; then
    log_warn "[DRY RUN] Would create GitHub release"
    return
  fi

  if ! command -v gh &> /dev/null; then
    log_warn "GitHub CLI not found, skipping release creation"
    return
  fi

  NOTES_FILE="RELEASE_NOTES_${VERSION}.md"
  if [ -f "$NOTES_FILE" ]; then
    gh release create "$VERSION" \
      --title "OMEGA $VERSION" \
      --notes-file "$NOTES_FILE"
    log_success "GitHub release created"
  else
    gh release create "$VERSION" \
      --title "OMEGA $VERSION" \
      --generate-notes
    log_success "GitHub release created (auto-generated notes)"
  fi
}

generate_proof_pack() {
  log_info "Generating proof pack..."

  if [ -f "scripts/generate-proof-pack.sh" ]; then
    bash scripts/generate-proof-pack.sh
    log_success "Proof pack generated"
  else
    log_warn "Proof pack script not found, skipping"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "  OMEGA Release Script"
echo "  Standard: NASA-Grade L4 / DO-178C Level A"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Validate version
if [ -z "$VERSION" ]; then
  log_error "Usage: ./release.sh <version> [--dry-run]"
  log_error "Example: ./release.sh v6.0.0-INDUSTRIAL"
  log_error "Example: ./release.sh v6.0.0-INDUSTRIAL --dry-run"
  exit 1
fi

# Check for dry run flag
if [ "${2:-}" = "--dry-run" ]; then
  DRY_RUN="true"
  log_warn "DRY RUN MODE - No changes will be made"
  echo ""
fi

log_info "Releasing version: $VERSION"
echo ""

# Run release steps
check_prerequisites
check_clean_working_tree
run_tests
check_frozen_modules
generate_release_notes
build_packages
create_git_tag
push_to_remote
publish_packages
create_github_release
generate_proof_pack

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
if [ "$DRY_RUN" = "true" ]; then
  log_warn "DRY RUN COMPLETE - No changes were made"
else
  log_success "RELEASE COMPLETE: $VERSION"
fi
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Print post-release checklist
if [ -f "scripts/post-release.md" ]; then
  echo "See scripts/post-release.md for post-release checklist"
fi
