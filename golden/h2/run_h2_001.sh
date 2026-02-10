#!/usr/bin/env bash
# H2 Golden Run 001 - Le Gardien (LLM Mode)

set -e

export OMEGA_PROVIDER_MODE=llm
export OMEGA_CACHE_DIR="$(pwd)/golden/h2/run_h2_001/cache"

echo "=== H2 RUN 001 - Le Gardien ==="
echo "Provider: $OMEGA_PROVIDER_MODE"
echo "Cache: $OMEGA_CACHE_DIR"
echo "API Key: $(echo $ANTHROPIC_API_KEY | head -c 10)..."
echo

mkdir -p golden/h2/run_h2_001

npx tsx packages/omega-runner/src/cli/main.ts run full \
  --intent golden/intents/intent_pack_gardien.json \
  --out golden/h2/run_h2_001 \
  --seed "h2-gardien-001"

EXIT_CODE=$?
echo
echo "=== EXIT CODE: $EXIT_CODE ==="

if [ $EXIT_CODE -eq 0 ]; then
  echo "Run completed successfully"
  ls -lh golden/h2/run_h2_001/cache/ 2>&1 | head -10 || echo "No cache dir"
else
  echo "Run failed with code $EXIT_CODE"
fi
