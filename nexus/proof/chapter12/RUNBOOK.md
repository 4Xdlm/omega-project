# Chapter 12 — Spanish Support — RUNBOOK

## Usage

```powershell
cd C:\Users\elric\omega-project

# Spanish analysis
npm run omega -- analyze "nexus/user_imputs/test_es.txt" --lang es --output both

# Compare EN vs ES
npm run omega -- analyze "nexus/user_imputs/test_es.txt" --lang en --output json
npm run omega -- analyze "nexus/user_imputs/test_es.txt" --lang es --output json
```

## Supported Languages

| Language | Flag | Keywords File |
|----------|------|---------------|
| English  | `--lang en` | lang/en.ts |
| French   | `--lang fr` | lang/fr.ts |
| Spanish  | `--lang es` | lang/es.ts |

## Expected Results (Spanish test text)

| Lang | Keywords | Intensity |
|------|----------|-----------|
| EN   | ~1       | ~1.4%     |
| ES   | ~137     | ~91.7%    |

## Spanish Keywords Coverage

- **joy**: alegría, feliz, amor, sonrisa, celebrar...
- **trust**: confianza, leal, sincero, amigo, seguro...
- **fear**: miedo, terror, angustia, pánico, peligro...
- **surprise**: sorpresa, asombro, inesperado, increíble...
- **sadness**: triste, dolor, llorar, lágrimas, muerte...
- **disgust**: asco, repugnante, odio, desprecio...
- **anger**: ira, furia, enojo, violencia, gritar...
- **anticipation**: esperar, anticipar, futuro, preparar...

## Files

- roman_analysis_es.json — Full analysis data
- roman_analysis_es.md — Human-readable report
