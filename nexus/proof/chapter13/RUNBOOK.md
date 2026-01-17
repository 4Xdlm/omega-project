# OMEGA Chapter 13 — RUNBOOK

## German (DE) Language Support + Sanity Warnings

### Command Syntax

```bash
npm run omega -- analyze <file> --lang de --output json|md|both
```

### Supported Languages

| Code | Language | File |
|------|----------|------|
| en | English | lang/en.ts |
| fr | Français | lang/fr.ts |
| es | Español | lang/es.ts |
| de | Deutsch | lang/de.ts |

### New Fields in JSON Output

```json
{
  "analysis": {
    "summary": {
      "keywordsFound": 51,
      "keywordDensity": 0.211
    },
    "warnings": []
  }
}
```

### Warning Thresholds

| Warning | Condition |
|---------|-----------|
| HIGH_KEYWORD_DENSITY | keywordDensity > 0.25 |

### Test Commands

```bash
# Emotional text (high intensity expected)
npm run omega -- analyze nexus/user_imputs/test_de_emotional.txt --lang de --output json

# Neutral text (zero intensity expected)
npm run omega -- analyze nexus/user_imputs/test_de_neutral.txt --lang de --output json

# Comparison (same file, different languages)
npm run omega -- analyze nexus/user_imputs/test_de_emotional.txt --lang en --output json
npm run omega -- analyze nexus/user_imputs/test_de_emotional.txt --lang de --output json
```

### Expected Results

| File | Lang | Keywords | Intensity | Density |
|------|------|----------|-----------|---------|
| test_de_emotional.txt | de | 51 | 100% | 21.1% |
| test_de_emotional.txt | en | 8 | 12.5% | 3.3% |
| test_de_neutral.txt | de | 0 | 0% | 0% |

### German Keyword Coverage

All 8 Plutchik emotions with umlauts normalized:
- joy (Freude, Glück, Heiterkeit)
- trust (Vertrauen, Treue, Zuverlässigkeit)
- fear (Angst, Furcht, Panik)
- surprise (Überraschung, Erstaunen, Verblüffung)
- sadness (Trauer, Kummer, Einsamkeit)
- disgust (Ekel, Abscheu, Widerwille)
- anger (Wut, Zorn, Ärger)
- anticipation (Erwartung, Hoffnung, Vorfreude)

### Umlaut Handling

Text normalization uses NFD decomposition:
- ä → a, ö → o, ü → u
- Keywords stored with ue/ae/oe variants

### FROZEN Status

```bash
# Verify no changes to frozen modules
git diff --name-only packages/sentinel packages/genome
# Expected: empty output
```
