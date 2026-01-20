#!/bin/bash
# CPU Profiling Script
# Standard: NASA-Grade L4
#
# Generates CPU profile for performance analysis

set -euo pipefail

OUTPUT_DIR="profiling-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo "🔍 Profiling OMEGA..."
echo ""

# CPU profiling with Node.js built-in profiler
echo "Running CPU profiling..."
node --cpu-prof --cpu-prof-dir="$OUTPUT_DIR" \
  --import tsx \
  nexus/bench/run-all.ts "$OUTPUT_DIR/bench-during-profile.json"

# Find the .cpuprofile file (most recent)
PROFILE_FILE=$(ls -t "$OUTPUT_DIR"/*.cpuprofile 2>/dev/null | head -1)

if [ -n "$PROFILE_FILE" ]; then
  FINAL_PROFILE="$OUTPUT_DIR/cpu-profile-$TIMESTAMP.cpuprofile"
  mv "$PROFILE_FILE" "$FINAL_PROFILE"

  echo ""
  echo "✅ CPU profile saved: $FINAL_PROFILE"
  echo ""
  echo "📊 Analyze with:"
  echo "   1. Chrome DevTools: chrome://inspect → Open dedicated DevTools"
  echo "   2. Load profile: $FINAL_PROFILE"
  echo ""
  echo "   Or use: npx tsx scripts/analyze-profile.ts $FINAL_PROFILE"
else
  echo "⚠️  No profile file generated"
fi
