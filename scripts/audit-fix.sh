#!/bin/bash
set -euo pipefail

echo "🔍 Running npm audit..."

# Run audit
npm audit --audit-level=moderate

RESULT=$?

if [ $RESULT -ne 0 ]; then
  echo ""
  echo "❌ Vulnerabilities found"
  echo ""
  echo "Attempting automatic fix..."
  npm audit fix

  echo ""
  echo "Re-running audit..."
  npm audit --audit-level=moderate

  RESULT2=$?

  if [ $RESULT2 -ne 0 ]; then
    echo ""
    echo "⚠️ Some vulnerabilities remain"
    echo "Run: npm audit fix --force (with caution)"
    exit 1
  else
    echo ""
    echo "✅ All vulnerabilities fixed"
  fi
else
  echo ""
  echo "✅ No vulnerabilities found"
fi
