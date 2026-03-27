# SESSION SAVE — AUDIT MULTI-ECHELLE MAITRES
**Date** : 2026-03-27
**Branche** : phase-r-metrology-rebuild

---

## Travail effectue

### 1. Archeologie briques SAGA_READY (Etape 0)
- Analyse des 5 briques winner du BESTOF3 (3 gagnantes + 2 perdantes)
- Metriques calculees : f26b, f17, f1a, cv_sent, mean, words, transitions L->C, C->L, ratio_alt
- Resultat : alternance NATURELLE (14.3% moyen chez les gagnantes)
- 75% des candidats Duel ont cohabitation f17>=4 + f26b>=0.15
- 3/4 modes produisent alternance a 100%, seul loop_refined echoue (0%)
- Vrai differenciateur gagnantes vs perdantes = VOLUME (+123 mots)
- **Verdict : STOP injection alternance. Investiguer volume.**

### 2. Audit multi-echelle complet
- Script : scripts/audit_multi_echelle.py
- Sources : 181 fichiers R1 (10 tailles x 5 positions x 121 features) + R4 tiers (571 oeuvres)
- 3 JSON produits :
  - src/scoring/data/MASTER_SCALE_LADDER.json
  - src/scoring/data/MASTER_TYPE_TRANSITIONS_BY_SCALE.json
  - src/scoring/data/MASTER_FEATURE_COHERENCE_BY_SCALE.json
- 2 rapports :
  - docs/MASTER_SCALE_AUDIT.md (10 sections)
  - docs/MASTER_SCALE_DECISIONS.md (7 decisions PASS)

### Resultats cles

| Fait | Valeur |
|------|--------|
| Features LOCAL (fiables a 500w) | 81/121 (67%) |
| Features ARC (necessitent 2000w) | 40/121 (33%) |
| Features MACRO (necessitent >10000w) | 0/121 (0%) |
| Hypotheses testees | 7 (6 PASS, 1 INDETERMINE) |
| Inversions de correlation | 0 detectees |
| Instabilite type par taille | 68% des oeuvres |
| Feature la plus stable | f16a_bigram_rarity (CV < 0.04) |
| Feature la plus discriminante (tier) | f26b_long_sent_rate (rho=+0.513) |

### Limitation connue
- Matching tier-R1 : 8/181 oeuvres matchees (nommage incompatible). Compense par R4 (571 oeuvres a 500w).
- H6 (maitres plus stables) : INDETERMINE.

## Fichiers modifies/crees

- nexus/proof/ARCHEOLOGIE_BRIQUES_SAGA_READY.md (commit 82dea943)
- scripts/audit_multi_echelle.py
- src/scoring/data/MASTER_SCALE_LADDER.json
- src/scoring/data/MASTER_TYPE_TRANSITIONS_BY_SCALE.json
- src/scoring/data/MASTER_FEATURE_COHERENCE_BY_SCALE.json
- docs/MASTER_SCALE_AUDIT.md
- docs/MASTER_SCALE_DECISIONS.md
- sessions/SESSION_SAVE_MASTER_SCALE_AUDIT_2026-03-27.md
