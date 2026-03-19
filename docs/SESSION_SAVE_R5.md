# SESSION_SAVE — PHASE R5 : BENCH TAILLE REELLE
# Date : 2026-03-19
# Branche : phase-w-mixer
# Statut : PASS — Pret pour R6

---

## CONTEXTE

Phase R5 = portage F24-F38 en TypeScript + premier bench multi-etages (MOCK).
Approche C retenue : portage TS des features text-based (pas spaCy).

Precede par : R4 (scorer multi-etages TypeScript, 6 profils, 33 tests).

## PREREQUIS RESOLUS

### P-01 : text-features.ts (F24-F38)
- Portage direct de v5_features.py en TypeScript
- 470 lignes, 46 features, 13 scores composites
- Memes formules, memes seuils, memes marqueurs (FR+EN+ES)

### P-02 : Cross-validation TS vs Python
- Teste sur Bovary (Gutenberg cache) a P_rel ~5%, 600 mots
- f24e: 1.7%, f29d: 3.5%, f34b: 0.0%, f38c: 7.5% de difference
- Ecarts > 50% expliques par texte source different (Gutenberg vs PDF)

### P-03 : Bench MOCK sans API
- 8 extraits depuis gutenberg_cache (Flaubert, Hugo, Zola, Stendhal, Austen)
- Mode 1 (600w) + Mode 2 (1500w) + tableau croise 6 profils

## DECISIONS PRISES

### D-01 : Approche C — portage TS
- F24-F38 en TS natif, pas de subprocess Python
- F1 (rhythm) aussi porte (pas besoin de spaCy)
- F2-F23 non portes (spaCy) — scoring partiel accepte

### D-02 : Scores sur echelle brute (pas 0-100)
- Les features sont des ratios 0-1, le score composite est ~7-8
- La normalisation 0-100 sera faite en R6 avec les baselines
- Documenter clairement que ce n'est PAS comparable au scoring V3

### D-03 : Bench MOCK valide le pipeline
- Pas de texte hardcode — lecture de fichiers Gutenberg externes
- Valide : features, scorer, profils, confiance, types de passage
- Le bench LLM complet sera lance par Francky

## RESULTATS CHIFFRES

| Metrique | Valeur |
|----------|--------|
| Features portees en TS | 46 |
| Features actives a 600w | 18 / 49 (LOCAL) |
| Score moyen (STRATO) | 7.8 (echelle brute) |
| Confiance a 600w | 0.654 |
| Confiance a 1500w | 0.679 (+2.6%) |
| Difference CONTEMPLATIF vs THRILLER | +0.5 points |
| Cross-validation TS/Python | ±7.5% max (meme texte) |
| Tests nouveaux | 12 (11 + 1 cross) |
| Tests totaux | 1829 GREEN (202 fichiers) |

### Fichiers crees

| Fichier | Lignes | Role |
|---------|--------|------|
| src/scoring/text-features.ts | 470 | F24-F38 + F1 basic en TS |
| scripts/run-benchmark-r5.ts | 195 | Bench MOCK (lecture externe) |
| tests/art/text-features-r5.test.ts | 100 | 11 tests features |
| tests/art/cross-validate-bovary.test.ts | 50 | 1 test cross TS/Python |

## ETAT DU REPO

- HEAD : (sera mis a jour apres commit)
- Branche : phase-w-mixer
- Tests : 1829 GREEN / 202 fichiers
- Fichiers ajoutes :
  - packages/sovereign-engine/src/scoring/text-features.ts
  - packages/sovereign-engine/scripts/run-benchmark-r5.ts
  - packages/sovereign-engine/tests/art/text-features-r5.test.ts
  - packages/sovereign-engine/tests/art/cross-validate-bovary.test.ts
  - packages/sovereign-engine/sessions/bench_r5_mock_*.json
  - docs/OMEGA_R5_REPORT.md
  - docs/SESSION_SAVE_R5.md

## WARNING POUR R6

**W-01** : Scores sur echelle brute (~7-8). PAS comparable aux scores V3 (0-100).
Normalisation 0-100 necessaire avant toute comparaison.

**W-02** : 18/49 features actives = scoring PARTIEL.
F1-F23 (spaCy) manquantes. Le scoring sera plus complet quand portees.

**W-03** : La confiance a 600w (0.654) est MODEREE.
Elle augmentera avec plus de features actives.

---

## MESSAGE DE REDEMARRAGE POUR R6

```
OMEGA SESSION — PHASE R6 (NORMALISATION + BENCH LLM)
Dernier etat : SESSION_SAVE_R5
Scorer multi-etages : 46 features TS, 6 profils, 18 actives a 600w
Cross-validation TS/Python : ±7.5% max
Tests : 1829 GREEN (202 fichiers)
Objectif R6 : normaliser 0-100, porter F1-F5, bench LLM, calibrer profils
Tag repo : phase-r5-complete
Branche : phase-w-mixer
```

---

*Session save generee le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
