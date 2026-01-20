#!/bin/bash
set -euo pipefail

PACK_ID=${1:-manual-$(date +%Y%m%d-%H%M%S)}
PACK_DIR="nexus/proof/ci-$PACK_ID"

echo "📦 Generating proof pack: $PACK_ID"

mkdir -p "$PACK_DIR"

# 1. Test results
echo "Collecting test results..."
npm test > "$PACK_DIR/test-results.txt" 2>&1 || true

# 2. Coverage
echo "Collecting coverage..."
npm run test:coverage > /dev/null 2>&1 || true
cp coverage/coverage-summary.json "$PACK_DIR/" 2>/dev/null || echo "No coverage report found"

# 3. Hashes
echo "Computing hashes..."
find packages nexus gateway -name "*.ts" -type f 2>/dev/null | xargs sha256sum 2>/dev/null | sort > "$PACK_DIR/hashes.txt" || echo "Hash computation skipped"

# 4. Git log
echo "Collecting git log..."
git log --oneline -20 > "$PACK_DIR/git-log.txt"

# 5. Package versions
echo "Collecting package versions..."
npm list --depth=0 > "$PACK_DIR/dependencies.txt" 2>&1 || true

# 6. README
cat > "$PACK_DIR/README.md" <<EOF
# Proof Pack — $PACK_ID

**Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Commit**: $(git rev-parse HEAD)
**Branch**: $(git rev-parse --abbrev-ref HEAD)

## Contents

- \`test-results.txt\`: Full test output
- \`coverage-summary.json\`: Coverage metrics
- \`hashes.txt\`: SHA-256 of all source files
- \`git-log.txt\`: Recent commits
- \`dependencies.txt\`: npm packages
- \`README.md\`: This file

## Verification

\`\`\`bash
# Verify hashes
sha256sum -c hashes.txt
\`\`\`
EOF

echo "✅ Proof pack generated: $PACK_DIR"
