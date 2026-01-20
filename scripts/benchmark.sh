#!/bin/bash
# Benchmark Runner Script
# Standard: NASA-Grade L4
#
# CRITICAL (VERROU 2):
# - Run with: npm run bench
# - NEVER in CI
# - NEVER timing assertions

set -euo pipefail

echo "🚀 Running OMEGA Benchmarks..."
echo ""

# Run benchmarks
npx tsx nexus/bench/run-all.ts bench-results/latest.json

echo ""
echo "✅ Benchmarks complete"
