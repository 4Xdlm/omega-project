# Chapter 11 — French Support — RUNBOOK

## Usage
```powershell
cd C:\Users\elric\omega-project

# French analysis
npm run omega -- analyze "nexus/user_imputs/test.txt" --lang fr --output both

# Compare EN vs FR
npm run omega -- analyze "nexus/user_imputs/test.txt" --lang en --output json
npm run omega -- analyze "nexus/user_imputs/test.txt" --lang fr --output json
```

## Expected Results (French novel)

| Lang | Keywords | Intensity |
|------|----------|-----------|
| EN   | ~162     | ~2.4%     |
| FR   | ~1844    | ~27.7%    |

## Files
- roman_analysis_fr.json — Full analysis data
- roman_analysis_fr.md — Human-readable report
