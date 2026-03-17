# Quartile Derivative Analysis

**Date**: 2026-03-17 13:27
**Chapters**: 200 | **Amplitude**: 0.5 | **Measurements**: 3200
**Time**: 131s

## Hypothesis

Does perturbation sensitivity vary by narrative position? Is Q3 (climax) more sensitive than Q1 (setup)?

## UNIFORMIZE_RHYTHM

| Category | Q1 (setup) | Q2 (develop) | Q3 (climax) | Q4 (resolution) | Strongest | Dependent? |
|----------|-----------|-------------|------------|-----------------|-----------|------------|
| MUSICALITE |  **0.3122** |  0.2570 |  0.2786 |  0.3001 | Q1 | YES |
| COMPLEXITE |  **0.0038** |  0.0037 |  0.0037 |  0.0038 | Q1 | no |
| SENSORIEL |  0.0069 |  0.0064 |  **0.0072** |  0.0071 | Q3 | no |
| LEXICAL |  **0.0056** |  0.0050 |  0.0055 |  0.0045 | Q1 | YES |
| INTERIORITE |  0.0027 |  0.0026 |  **0.0028** |  0.0027 | Q3 | no |
| TENSION |  0.0023 |  0.0023 |  0.0023 |  **0.0024** | Q4 | no |

## COMPLEXIFY_SYNTAX

| Category | Q1 (setup) | Q2 (develop) | Q3 (climax) | Q4 (resolution) | Strongest | Dependent? |
|----------|-----------|-------------|------------|-----------------|-----------|------------|
| MUSICALITE |  0.1588 |  0.1748 |  0.1676 |  **0.1770** | Q4 | no |
| COMPLEXITE |  0.0053 |  0.0055 |  0.0057 |  **0.0057** | Q4 | no |
| SENSORIEL |  **0.0065** |  0.0063 |  0.0059 |  0.0058 | Q1 | no |
| LEXICAL |  0.0054 |  0.0052 |  0.0054 |  **0.0057** | Q4 | no |
| INTERIORITE |  0.0034 |  0.0036 |  0.0038 |  **0.0039** | Q4 | no |
| TENSION |  0.0522 |  **0.0729** |  0.0521 |  0.0687 | Q2 | YES |

## REMOVE_INTERIORITY

| Category | Q1 (setup) | Q2 (develop) | Q3 (climax) | Q4 (resolution) | Strongest | Dependent? |
|----------|-----------|-------------|------------|-----------------|-----------|------------|
| MUSICALITE |  0.0101 |  0.0099 |  0.0120 |  **0.0127** | Q4 | YES |
| COMPLEXITE |  0.0015 |  0.0015 |  0.0016 |  **0.0016** | Q4 | no |
| SENSORIEL |  0.0003 |  0.0004 |  0.0006 |  **0.0007** | Q4 | YES |
| LEXICAL |  0.0006 |  0.0007 |  **0.0008** |  0.0006 | Q3 | YES |
| INTERIORITE |  0.0078 |  **0.0112** |  0.0105 |  0.0107 | Q2 | YES |
| TENSION |  0.0007 |  **0.0008** |  0.0008 |  0.0007 | Q2 | YES |

## INJECT_SYNCOPES

| Category | Q1 (setup) | Q2 (develop) | Q3 (climax) | Q4 (resolution) | Strongest | Dependent? |
|----------|-----------|-------------|------------|-----------------|-----------|------------|
| MUSICALITE |  0.2257 |  0.2049 |  **0.2270** |  0.1987 | Q3 | no |
| COMPLEXITE |  0.0034 |  0.0032 |  **0.0035** |  0.0031 | Q3 | no |
| SENSORIEL |  0.0103 |  0.0101 |  0.0104 |  **0.0104** | Q4 | no |
| LEXICAL |  **0.0084** |  0.0079 |  0.0081 |  0.0074 | Q1 | no |
| INTERIORITE |  0.0041 |  0.0041 |  **0.0041** |  0.0041 | Q3 | no |
| TENSION |  0.0643 |  0.0522 |  0.0647 |  **0.0661** | Q4 | YES |

## Summary

- **Q3 strongest**: 6/24 (25%) of (perturbation, category) pairs
- **Quartile-dependent**: 9/24 (38%) pairs show >20% variation across quartiles

### Strongest quartile distribution

- Q1: 5 #####
- Q2: 3 ###
- Q3: 6 ######
- Q4: 10 ##########
