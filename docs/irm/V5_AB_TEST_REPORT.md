# V5 Bridge A/B Test Report
**Date** : 2026-04-02 | **Standard** : NASA-Grade L4

## Configuration
- **V4** : compileRosettaConstraints hardcode (7 directives mecaniques)
- **V5** : Rosetta Bridge dynamique (3 TOP PILOTABLE, compliance 100%)

## Resultats prompt comparison (test unitaire)

| Metrique | V4 | V5 | Delta |
|----------|----|----|-------|
| Prompt structure | 1 section monolithique | 1 section monolithique | identique |
| Rosetta block | 7 directives hardcodees | 3 directives bridge calibrees | -4 directives |
| Features injectees | 7 (mix SOLIDE/non-valide) | 3 (TOP PILOTABLE 100%) | -4 features |
| Features ILLUSION | 0 (V4 les evitait deja) | 0 (bridge les bloque) | 0 |
| FR subordination | OUI (L37 hardcode) | OUI (L37 preserve) | identique |
| Prompt hash | different | different | change attendu |

## Differences qualitatives

### V4 (hardcode) — 7 directives :
1. Vocabulaire : 70 mots uniques / 100 mots consecutifs
2. Contraste : 1/3 phrases < 8 mots, 1/3 > 25 mots
3. Redondance : aucun bigramme > 2 fois
4. Originalite : > 85% bigrammes uniques
5. Accroche : premiere phrase avec tension < 15 mots
6. Suspense : derniers 20 mots = question ouverte
7. Sensoriel : 6 mots sensoriels / 100 mots

### V5 (bridge dynamique) — 3 directives :
1. f24e_contrast_score (100% compliance) — instruction calibree S0
2. f15b_redundancy_compression (100% compliance) — instruction calibree S0
3. f16a_bigram_rarity (100% compliance) — instruction calibree S0

### Analyse
- V5 retire 4 directives qui n'ont PAS ete prouvees efficaces par Rosetta S0
- V5 garde UNIQUEMENT les 3 features avec 100% de compliance mesuree
- V5 est plus PRECIS (instructions calibrees) mais moins COUVRANT (3 vs 7)
- Les features retirees (accroche, suspense, sensoriel) sont soit ILLUSION soit non testees en S0

## Tests V5

| Test | Resultat |
|------|---------|
| isV5Active() off by default | PASS |
| isV5Active() with env var | PASS |
| Build valid V5 prompt | PASS |
| Contains Rosetta Bridge directives | PASS |
| Does NOT contain V4 hardcoded block | PASS |
| V5 size similar to V4 (±20%) | PASS |
| V4 and V5 have different hashes | PASS |
| **Total** | **7/7 PASS** |

## engine.ts Integration
V5 est cable en cascade : `isV5Active() → V5, isV4Active() → V4, default → V2`
Active par `OMEGA_PROMPT_V5=1`. Par defaut → V4 (aucun changement en production).

## Verdict

**GO CONDITIONNEL** — V5 est techniquement pret (tests PASS, integration OK).

### Conditions pour activation production :
1. Bench reel avec API (10 scenes V4 vs 10 scenes V5 sur memes packets)
2. KPI cible : reduction passes Sovereign Loop OU amelioration composite
3. Si passes V5 <= passes V4 ET composite V5 >= composite V4 - 0.5 → ACTIVER
4. Si regression > 0.5 composite → GARDER V4

### Risque
FAIBLE — V5 est active par env var uniquement. V4 reste le default.
La modification engine.ts = +3 lignes (1 import + 1 condition ternaire).

---

*"Ce qui n'est pas mesure n'est pas acceptable."*
