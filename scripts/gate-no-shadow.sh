#!/bin/bash
# GATE-4: No Shadow Implementations
# sovereign-engine MUST NOT implement any omega-forge SSOT logic locally

FORBIDDEN_PATTERNS=(
  "buildTrajectoryFromWaypoints"
  "buildTrajectoryCore"
  "canonicalTable\b.*=.*\["
  "EMOTION_KEYWORDS\b.*=.*{"
  "toOmegaState\b.*function"
  "fromOmegaState\b.*function"
  "verifyLaw[1-6]\b.*function"
  "checkInertia\b.*function"
  "checkFeasibility\b.*function"
)

VIOLATIONS=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  matches=$(grep -rn "$pattern" packages/sovereign-engine/src/ --include="*.ts" | grep -v "from.*@omega/" | grep -v "import.*from" || true)
  if [ -n "$matches" ]; then
    echo "GATE-4 VIOLATION: pattern '$pattern' found:"
    echo "$matches"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ $VIOLATIONS -gt 0 ]; then
  echo "GATE-4 FAIL: $VIOLATIONS shadow implementation(s) detected"
  exit 1
fi

echo "GATE-4 PASS: No shadow implementations in sovereign-engine"
