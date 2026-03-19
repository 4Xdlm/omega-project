# OMEGA — RAPPORT PHASE R4 : SCORER MULTI-ETAGES
# Date : 2026-03-19
# Statut : PASS
# Standard : NASA-Grade L4 / DO-178C Level A

---

## 1. RESUME EXECUTIF

Phase R4 a implemente le scorer multi-etages TypeScript dans sovereign-engine.
Le module est STANDALONE (aucune dependance vers les fichiers geles).
6 fichiers crees, 33 tests unitaires, 0 regression sur les 1817 tests existants.

## 2. ARCHITECTURE DU SCORER

```
src/scoring/
├── types.ts                  # Interfaces (MultiStageScore, QualityProfile, etc.)
├── coefficients-loader.ts    # Charge JSON R3 + interpolation + lookups
├── passage-type-detector.ts  # Detecte DESCRIPTION/DIALOGUE/ACTION/INTROSPECTION/TRANSITION
├── quality-profiles.ts       # 6 profils (STRATOSPHERIQUE → EXPERIMENTAL)
├── multi-stage-scorer.ts     # Scorer 2 etages LOCAL+ARC
└── data/
    └── OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json  # Coefficients R3 (105 KB)

tests/art/
└── multi-stage-scorer.test.ts  # 33 tests unitaires
```

Pipeline du scorer :
```
features (Record<string, number>)
  │
  ├─ detectPassageType(features) → PassageType
  │
  ├─ computeStage('LOCAL', features, wordCount, pRel, type, overrides)
  │   └─ Pour chaque feature LOCAL :
  │       confidence × position_mod × type_mod × profile_mod = weight
  │       Σ(feature × weight) / Σ(weight) = score_LOCAL
  │
  ├─ HANDSHAKE : si score_LOCAL < 30 → skip ARC
  │
  ├─ computeStage('ARC', features, wordCount, pRel, type, overrides)
  │   └─ Pour chaque feature LOCAL+ARC :
  │       (meme algorithme)
  │
  └─ composite = alpha × LOCAL + beta × ARC
     seal_eligible = composite >= threshold AND axes >= min_axis
```

## 3. FICHIERS CREES

| Fichier | Lignes | Role |
|---------|--------|------|
| types.ts | 104 | Interfaces TypeScript |
| coefficients-loader.ts | 156 | Chargement JSON + interpolation |
| passage-type-detector.ts | 90 | Detection type de passage |
| quality-profiles.ts | 92 | 6 profils de qualite |
| multi-stage-scorer.ts | 145 | Scorer 2 etages |
| multi-stage-scorer.test.ts | 260 | 33 tests unitaires |
| **Total** | **847** | |

## 4. COEFFICIENTS INTEGRES

Le JSON R3 (105 KB) contient :
- confidence_table : 121 features x 10 tailles
- disabled_below : seuils de desactivation
- never_active_features : 29 features OFF
- weight_table : LOCAL_600 (49 features) + ARC_2500 (78 features)
- position_modifiers : 67 features x 5 zones
- type_modifiers : 5 types x features significatives
- language_dependency : 66 UNIVERSAL + 55 DEPENDENT
- scoring_formula : alpha/beta pour 10 tailles

Le JSON a ete sanitize (Infinity → 999999) pour compatibilite JSON standard.

## 5. 6 PROFILS DE QUALITE

| Profil | Seuil SEAL | Min Axis | Description |
|--------|-----------|----------|-------------|
| STRATOSPHERIQUE | 93.0 | 85 | Chef-d'oeuvre, coefficients R3 purs |
| LITTERAIRE | 88.0 | 80 | Roman de qualite litteraire |
| COMMERCIAL | 82.0 | 75 | Best-seller, fluidite privilegiee |
| THRILLER | 80.0 | 70 | Tension maximale, prose efficace |
| CONTEMPLATIF | 85.0 | 78 | Woolf/Proust, interiorite |
| EXPERIMENTAL | 78.0 | 65 | Faulkner/Simon, fragmentation |

**Note** : Les weight_overrides sont marques @provisional. Calibration en R5.

## 6. DETECTEUR DE TYPE

Heuristiques basees sur les seuils P75 des 9141 fenetres R2 :

| Type | Criteres | % corpus R2 |
|------|----------|-------------|
| DIALOGUE | f34b > 5.0 ET f33a > 50 | 1.0% |
| INTROSPECTION | f28d > 0.08 ET f27d > 0.45 | 9.0% |
| ACTION | f5a > 0.06 ET f38c > 0.28 ET f1 < 12 | 3.4% |
| TRANSITION | f12b > 0.12 (sans extremes) | 14.9% |
| DESCRIPTION | defaut | 71.7% |

## 7. RESULTATS DES TESTS

### Tests existants (inchanges)
- 200 fichiers, 1817 tests GREEN, 7 skipped
- 0 regression

### Tests nouveaux (33)
- CoefficientsLoader : 12 tests (chargement, interpolation, edges, modifiers)
- getPrelZone : 2 tests (mapping, edges)
- detectPassageType : 6 tests (5 types + edge case)
- QualityProfiles : 4 tests (count, default, thresholds, validity)
- MultiStageScorer : 9 tests (empty, known, handshake, profiles, position, type, alpha/beta, seal, structure)

### TypeScript
- 0 erreurs dans src/scoring/
- Erreurs pre-existantes dans d'autres fichiers (adversarial-judge.ts, etc.) non impactees

## 8. INTEGRATION PIPELINE

Le scorer est un module importable :
```typescript
import { MultiStageScorer } from './scoring/multi-stage-scorer.js';
import { getProfile, getProfileNames } from './scoring/quality-profiles.js';

const scorer = new MultiStageScorer('/path/to/coefficients.json');
const result = scorer.score(features, {
  wordCount: 600,
  pRel: 0.5,
  profile: 'LITTERAIRE',
});

console.log(result.composite.score);    // 0-100
console.log(result.seal_eligible);      // true/false
console.log(result.passage_type);       // 'DESCRIPTION'
```

Pas de modification de engine.ts. Le bench R5 appellera le scorer directement.

## 9. POINTS PROVISOIRES

- weight_overrides des 4 profils (COMMERCIAL, THRILLER, CONTEMPLATIF, EXPERIMENTAL)
  sont des propositions initiales. A calibrer avec le bench R5.
- Le pont features Python → TypeScript n'est pas encore implemente.
  Le scorer prend Record<string, number> — agnostique sur la source.
- Le handshake LOCAL_FAIL_THRESHOLD = 30.0 est un seuil initial.

## 10. MESSAGE DE REDEMARRAGE R5

```
OMEGA SESSION — PHASE R5 (BENCH TAILLE REELLE)
Dernier etat : SESSION_SAVE_R4
Corpus : 181 oeuvres / 121 features / 92 actives
Scorer multi-etages : TypeScript, 2 etages (LOCAL 49 feat + ARC 78 feat)
6 profils : STRATOSPHERIQUE/LITTERAIRE/COMMERCIAL/THRILLER/CONTEMPLATIF/EXPERIMENTAL
Tests : 1817 GREEN (200 fichiers)
Objectif R5 : Premier bench 1500-3000 mots avec scorer multi-etages
  - Generer des scenes longues (1500-3000 mots)
  - Scorer avec le nouveau module
  - Comparer avec le scoring existant (macro-axes V3)
  - Calibrer les weight_overrides des profils
Lire : SESSION_SAVE_R4 + OMEGA_R4_REPORT
Tag repo : phase-r4-complete
Branche : phase-w-mixer
```

---

*Rapport genere le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
*Phase R4 : PASS — Pret pour R5*
