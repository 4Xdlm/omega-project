# Replicability Report — Partial Derivatives across Sub-Corpora

## 1. Sub-Corpus Sizes

| Sub-Corpus | N results |
|:-----------|----------:|
| FR_CLASSIQUE | 3000 |
| FR_CONTEMPORAIN | 300 |
| FR_POPULAIRE | 4520 |
| EN_CLASSIQUE | 180 |
| EN_POPULAIRE | 2260 |
| ES_ALL | 3560 |
| PERIOD_1_2 | 1560 |
| PERIOD_3_4 | 6340 |
| PERIOD_5_6 | 3380 |

## 2. Universality Verdicts

| Law | Global Slope | Stable In | / | Verdict |
|:----|------------:|----------:|:-:|:--------|
| P01_UNIFORMIZE_RHYTHM→COMPLEXITE | +0.0019 | 4 | 9 | **LOCAL** |
| P01_UNIFORMIZE_RHYTHM→INTERIORITE | +0.0013 | 5 | 9 | **PARTIAL** |
| P01_UNIFORMIZE_RHYTHM→LEXICAL | +0.0110 | 7 | 9 | **UNIVERSAL** |
| P01_UNIFORMIZE_RHYTHM→MUSICALITE | -0.0788 | 2 | 9 | **LOCAL** |
| P01_UNIFORMIZE_RHYTHM→SENSORIEL | -0.0028 | 1 | 9 | **LOCAL** |
| P01_UNIFORMIZE_RHYTHM→TENSION | -0.0024 | 6 | 9 | **PARTIAL** |
| P03_COMPLEXIFY_SYNTAX→COMPLEXITE | +0.0290 | 6 | 9 | **PARTIAL** |
| P03_COMPLEXIFY_SYNTAX→INTERIORITE | +0.0156 | 4 | 9 | **LOCAL** |
| P03_COMPLEXIFY_SYNTAX→LEXICAL | +0.0351 | 8 | 9 | **UNIVERSAL** |
| P03_COMPLEXIFY_SYNTAX→MUSICALITE | +0.8383 | 8 | 9 | **UNIVERSAL** |
| P03_COMPLEXIFY_SYNTAX→SENSORIEL | +0.0024 | 4 | 9 | **LOCAL** |
| P03_COMPLEXIFY_SYNTAX→TENSION | -0.3880 | 4 | 9 | **LOCAL** |
| P04_REMOVE_INTERIORITY→COMPLEXITE | -0.0013 | 2 | 9 | **LOCAL** |
| P04_REMOVE_INTERIORITY→INTERIORITE | -0.0935 | 4 | 9 | **LOCAL** |
| P04_REMOVE_INTERIORITY→LEXICAL | -0.0024 | 4 | 9 | **LOCAL** |
| P04_REMOVE_INTERIORITY→MUSICALITE | -0.0637 | 3 | 9 | **LOCAL** |
| P04_REMOVE_INTERIORITY→SENSORIEL | -0.0019 | 5 | 9 | **PARTIAL** |
| P04_REMOVE_INTERIORITY→TENSION | -0.0012 | 4 | 9 | **LOCAL** |
| P05_INJECT_SYNCOPES→COMPLEXITE | -0.0220 | 6 | 9 | **PARTIAL** |
| P05_INJECT_SYNCOPES→INTERIORITE | -0.0249 | 7 | 9 | **UNIVERSAL** |
| P05_INJECT_SYNCOPES→LEXICAL | -0.0476 | 6 | 9 | **PARTIAL** |
| P05_INJECT_SYNCOPES→MUSICALITE | -1.1559 | 5 | 9 | **PARTIAL** |
| P05_INJECT_SYNCOPES→SENSORIEL | +0.0109 | 6 | 9 | **PARTIAL** |
| P05_INJECT_SYNCOPES→TENSION | -0.3819 | 5 | 9 | **PARTIAL** |

## 3. Per-Sub-Corpus Stability Summary

| Sub-Corpus | Quant Stable | Directional | Divergent |
|:-----------|------------:|-----------:|----------:|
| FR_CLASSIQUE | 20 | 4 | 0 |
| FR_CONTEMPORAIN | 10 | 12 | 2 |
| FR_POPULAIRE | 8 | 14 | 2 |
| EN_CLASSIQUE | 3 | 20 | 1 |
| EN_POPULAIRE | 14 | 9 | 1 |
| ES_ALL | 9 | 15 | 0 |
| PERIOD_1_2 | 12 | 12 | 0 |
| PERIOD_3_4 | 18 | 6 | 0 |
| PERIOD_5_6 | 22 | 2 | 0 |

## 4. Stability Grid (law × sub-corpus)

| Law | FR_CLASSIQUE | FR_CONTEMPORAIN | FR_POPULAIRE | EN_CLASSIQUE | EN_POPULAIRE | ES_ALL | PERIOD_1_2 | PERIOD_3_4 | PERIOD_5_6 |
|:----|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| P01_UNIFORMIZE_RHYTHM→COMPLEXITE | Q | D | Q | Q | Q | D | D | D | D |
| P01_UNIFORMIZE_RHYTHM→INTERIORITE | Q | Q | D | D | Q | D | D | Q | Q |
| P01_UNIFORMIZE_RHYTHM→LEXICAL | Q | D | Q | Q | Q | D | Q | Q | Q |
| P01_UNIFORMIZE_RHYTHM→MUSICALITE | Q | D | X | X | X | D | D | D | Q |
| P01_UNIFORMIZE_RHYTHM→SENSORIEL | D | X | D | D | D | Q | D | D | D |
| P01_UNIFORMIZE_RHYTHM→TENSION | Q | Q | Q | D | D | Q | D | Q | Q |
| P03_COMPLEXIFY_SYNTAX→COMPLEXITE | Q | Q | D | D | Q | Q | D | Q | Q |
| P03_COMPLEXIFY_SYNTAX→INTERIORITE | Q | Q | D | D | D | D | D | Q | Q |
| P03_COMPLEXIFY_SYNTAX→LEXICAL | Q | Q | Q | D | Q | Q | Q | Q | Q |
| P03_COMPLEXIFY_SYNTAX→MUSICALITE | Q | Q | Q | D | Q | Q | Q | Q | Q |
| P03_COMPLEXIFY_SYNTAX→SENSORIEL | Q | D | D | D | Q | Q | D | D | Q |
| P03_COMPLEXIFY_SYNTAX→TENSION | Q | D | D | D | D | D | Q | Q | Q |
| P04_REMOVE_INTERIORITY→COMPLEXITE | Q | D | D | D | D | D | D | D | Q |
| P04_REMOVE_INTERIORITY→INTERIORITE | D | D | D | D | Q | D | Q | Q | Q |
| P04_REMOVE_INTERIORITY→LEXICAL | Q | D | D | D | Q | D | Q | D | Q |
| P04_REMOVE_INTERIORITY→MUSICALITE | D | D | D | D | Q | D | D | Q | Q |
| P04_REMOVE_INTERIORITY→SENSORIEL | Q | D | D | D | Q | D | Q | Q | Q |
| P04_REMOVE_INTERIORITY→TENSION | D | D | D | D | Q | D | Q | Q | Q |
| P05_INJECT_SYNCOPES→COMPLEXITE | Q | D | Q | D | D | Q | Q | Q | Q |
| P05_INJECT_SYNCOPES→INTERIORITE | Q | Q | Q | D | Q | D | Q | Q | Q |
| P05_INJECT_SYNCOPES→LEXICAL | Q | Q | D | D | Q | Q | D | Q | Q |
| P05_INJECT_SYNCOPES→MUSICALITE | Q | Q | D | D | D | Q | D | Q | Q |
| P05_INJECT_SYNCOPES→SENSORIEL | Q | Q | Q | D | D | D | Q | Q | Q |
| P05_INJECT_SYNCOPES→TENSION | Q | X | X | Q | D | D | Q | Q | Q |

Legend: **Q** = Quantitatively Stable (<30% deviation), **D** = Directionally Stable (same sign), **X** = Divergent, **-** = No data
