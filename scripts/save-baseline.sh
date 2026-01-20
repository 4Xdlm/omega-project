#!/bin/bash
# Save Benchmark Baseline Script
# Standard: NASA-Grade L4
#
# Creates a versioned baseline for performance comparison

set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
BASELINE_FILE="bench-results/baseline-v${VERSION}.json"

echo "📊 Saving benchmark baseline v${VERSION}..."
echo ""

# Run benchmarks
npx tsx nexus/bench/run-all.ts "$BASELINE_FILE"

# Copy to latest baseline
cp "$BASELINE_FILE" bench-results/baseline.json

echo ""
echo "✅ Baseline saved:"
echo "   - $BASELINE_FILE"
echo "   - bench-results/baseline.json"
