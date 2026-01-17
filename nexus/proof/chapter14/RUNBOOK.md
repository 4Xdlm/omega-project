# OMEGA Chapter 14 — RUNBOOK

## Intensity Normalization v2 + Saturation Warnings

### Command Syntax

```bash
# Default (v2)
npm run omega -- analyze <file> --lang <en|fr|es|de> --output json

# Explicit v1 (legacy)
npm run omega -- analyze <file> --lang de --intensity v1 --output json

# Explicit v2 (exponential curve)
npm run omega -- analyze <file> --lang de --intensity v2 --output json
```

### v1 vs v2 Comparison Commands

```bash
# German emotional - v1 (saturates at 100%)
npm run omega -- analyze nexus/user_imputs/test_de_emotional.txt --lang de --intensity v1 --output json

# German emotional - v2 (stabilizes at 97%)
npm run omega -- analyze nexus/user_imputs/test_de_emotional.txt --lang de --intensity v2 --output json

# German neutral - both methods yield 0%
npm run omega -- analyze nexus/user_imputs/test_de_neutral.txt --lang de --intensity v1 --output json
npm run omega -- analyze nexus/user_imputs/test_de_neutral.txt --lang de --intensity v2 --output json

# Spanish emotional
npm run omega -- analyze nexus/user_imputs/test_es.txt --lang es --intensity v1 --output json
npm run omega -- analyze nexus/user_imputs/test_es.txt --lang es --intensity v2 --output json

# French novel (large file)
npm run omega -- analyze nexus/user_imputs/test.txt --lang fr --intensity v1 --output json
npm run omega -- analyze nexus/user_imputs/test.txt --lang fr --intensity v2 --output json
```

### Expected Results

| File | Lang | Method | Intensity | Density | Warnings |
|------|------|--------|-----------|---------|----------|
| test_de_emotional.txt | de | v1 | 100.0% | 21.1% | SATURATED_INTENSITY |
| test_de_emotional.txt | de | v2 | 97.0% | 21.1% | - |
| test_de_neutral.txt | de | v1 | 0% | 0% | - |
| test_de_neutral.txt | de | v2 | 0% | 0% | - |
| test_es.txt | es | v1 | 91.7% | 15.2% | - |
| test_es.txt | es | v2 | 92.1% | 15.2% | - |
| test.txt | fr | v1 | 27.7% | 2.2% | - |
| test.txt | fr | v2 | 30.9% | 2.2% | - |

### Intensity v2 Formula

```
overallIntensity = 1 - exp(-rawDensity / k)
where k = 0.06
```

Calibration targets:
- density 0.08 → ~73-74% intensity
- density 0.21 → ~96-97% intensity

### JSON Output Fields

```json
{
  "analysis": {
    "summary": {
      "overallIntensity": 0.97,
      "keywordDensity": 0.211,
      "intensityMethod": "v2"
    },
    "warnings": []
  }
}
```

### Warning Thresholds

| Warning | Condition |
|---------|-----------|
| HIGH_KEYWORD_DENSITY | keywordDensity > 0.25 |
| SATURATED_INTENSITY | intensity >= 0.98 AND wordCount > 200 |

### FROZEN Verification

```bash
git diff --name-only -- packages/genome packages/mycelium
# Expected: empty output
```
