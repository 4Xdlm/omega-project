# OMEGA IRM — LIVRABLE 14 : TRUTH RECONCILIATION MATRIX
**Date** : 2026-04-02 | **HEAD** : e1b92dd3 | **Standard** : NASA-Grade L4
**Méthode** : Croisement docs ↔ code ↔ bench data

---

## CONTRADICTIONS IDENTIFIÉES

### CONTRA-01 : AAI poids 25% vs 8% historique

| Source | Affirmation |
|--------|-------------|
| docs/OMEGA_ROADMAP_v8_0.md:46 | "AAI 25%" |
| oracle/macro-axes.ts:13 | `AAI : 0.25 (25%)` |
| Historique sessions | AAI était 8% dans les premières versions |

**Concordance** : CONCORDANT — le code et la roadmap v8 sont alignés sur 25%.
**Autorité** : Code (macro-axes.ts) = VÉRITÉ. Les anciens docs sont obsolètes.
**Action** : Aucune. Les anciens docs SESSION_SAVE mentionnant 8% sont caducs.

### CONTRA-02 : SAGA_READY 92.0 — engine.ts hardcodé vs SSOT

| Source | Valeur | Localisation |
|--------|--------|-------------|
| core/thresholds.ts:34 | `SAGA_READY_COMPOSITE_MIN = 92.0` | **SSOT** |
| engine.ts:198 | `const SAGA_COMPOSITE = 92.0` | Duplication locale |
| engine.ts:549 | `>= 92` | Hardcodé inline |

**Concordance** : VALEURS IDENTIQUES mais duplication = risque de divergence.
**Autorité** : core/thresholds.ts
**Action** : engine.ts devrait importer depuis core/thresholds.ts.

### CONTRA-03 : s-score.ts "LEGACY" mais toujours importé

| Source | Affirmation |
|--------|-------------|
| oracle/s-score.ts:7-9 | "@deprecated Use s-oracle-v2.ts" |
| RAPPORT_SCAN_ARCHITECTURAL.md | "SUSPECT-03 : s-score.ts (LEGACY) vs s-oracle-v2.ts (AUTORITÉ)" |
| engine.ts:51 | `import type { MacroSScore } from './oracle/s-score.js'` |
| aesthetic-oracle.ts:35 | `import { computeSScore, computeMacroSScore } from './s-score.js'` |

**Concordance** : CONTRADICTOIRE — le fichier est marqué deprecated mais 5 fichiers l'importent activement.
**Autorité** : s-oracle-v2.ts est l'autorité de scoring (macro-axes). Mais computeMacroSScore vit encore dans s-score.ts.
**Action** : Migrer computeMacroSScore hors de s-score.ts. Puis retirer les imports.

### CONTRA-04 : avg_sentence_length_target = 18 vs plancher BB-02 = 35

| Source | Valeur |
|--------|--------|
| DEC-20260328-BB-02 | "plancher mean_sent = 35w irréductible" |
| DEC-20260328-BB-02 Impact | "avg_sentence_length_target ne doit jamais être < 35. La valeur actuelle (18) est ignorée par le modèle" |
| types.ts:156 | `avg_sentence_length_target: number` (accepte toute valeur) |
| input/pre-write-validator.ts:207 | Valide seulement `> 0` |

**Concordance** : CONTRADICTOIRE — le validateur accepte 18 mais BB-02 a prouvé que < 35 est ignoré.
**Autorité** : BB-02 (SCELLÉ)
**Action** : Ajouter validation `>= 35` dans pre-write-validator.ts, ou adapter la valeur par défaut.

### CONTRA-05 : Polish "NO-OP prouvé" mais fichiers maintenus + importés

| Source | Affirmation |
|--------|-------------|
| engine.ts:409-414 | "Sprint 2: Polish DISABLED — proven NO-OP (delta 0.0 on ALL runs)" |
| engine.ts:43-45 | Imports de polishRhythm, sweepCliches, enforceSignature présents |
| polish/*.ts | 7 fichiers dans le répertoire |

**Concordance** : CONTRADICTOIRE — code maintenu mais déclaré inutile.
**Autorité** : engine.ts (les fonctions sont commentées = désactivées)
**Action** : Archiver polish/*.ts ou supprimer les imports.

### CONTRA-06 : f26b importance inversée GB V1 vs Ridge V2

| Source | Direction |
|--------|-----------|
| docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md:147 | f26b_long_sent_rate : Tier S ×9.5 vs Tier C |
| GB V1 (scoring/data/GB_V1_MODEL.json) | f26b a un coefficient positif (plus = mieux) |
| RAPPORT_SCAN : "f26b importance inversée GB/Ridge" | Potentielle inversion |

**Concordance** : À VÉRIFIER — le scan architectural signalait cette inversion. Le GB V1 est un modèle opaque (262KB JSON). La physique littéraire v3 confirme f26b = DRIVER positif.
**Autorité** : Physique littéraire v3 (empiriquement prouvé)
**Action** : Vérifier le signe du coefficient f26b dans GB V1 vs Ridge V2.

### CONTRA-07 : Pipeline hybride REJETÉ mais code présent

| Source | Affirmation |
|--------|-------------|
| SESSION_SAVE_2026-04-01_BLOC7_FINAL.md | "HYBRIDE REJETÉ (3/3 IAs + Francky)" |
| runtime/hybrid-provider.ts | Fichier présent, 100+ lignes |
| runtime/ollama-provider.ts | Fichier présent |
| duel/duel-engine.ts:30 | `OMEGA_HYBRID_MODE` env var toujours checked |

**Concordance** : CONTRADICTOIRE — décision architecturale rejetant l'hybride, mais code et env vars toujours présents.
**Autorité** : SESSION_SAVE BLOC7 (Francky + 3 IAs)
**Action** : Archiver hybrid-provider.ts, nettoyer env vars OMEGA_HYBRID_MODE.

### CONTRA-08 : PVI module SCELLÉ mais absent du pipeline sovereign-engine

| Source | Affirmation |
|--------|-------------|
| SESSION_SAVE_PVI_FINAL | "MODULE PVI — SCELLÉ DÉFINITIVEMENT 2026-04-01" |
| scripts/pvi/pvi_module_autonome.py | Existe, Python standalone |
| sovereign-engine/src/ | Aucun import de PVI, aucune intégration |

**Concordance** : VRAI PHANTOM — PVI est un module Python indépendant, jamais intégré dans le pipeline TypeScript.
**Autorité** : Roadmap (PVI = diagnostic externe, pas composant pipeline)
**Action** : Documenter l'interface PVI ↔ sovereign-engine si intégration prévue en R4+.

### CONTRA-09 : L35 collision ID

| Source | Signification |
|--------|---------------|
| docs/OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md:390-401 | L35 = deux sens différents : A) "sub_per_sentence = méga-levier" B) "modèle survit au retrait auteur FR" |
| Gemini correction | "L35 → conserver pour A, L35b → nouveau ID pour B" |

**Concordance** : COLLISION CONFIRMÉE par Gemini, non résolue dans le code.
**Autorité** : PHYSIQUE_LITTERAIRE_MANUEL (recommandation)
**Action** : Créer L35b pour différencier les deux sens.

---

## TABLEAU RÉCAPITULATIF

| # | Affirmation | Source 1 | Source 2 | Concordance | Action |
|---|-------------|----------|----------|-------------|--------|
| 01 | AAI 25% | roadmap v8 | macro-axes.ts | OK | Aucune |
| 02 | SAGA_READY 92.0 | thresholds.ts | engine.ts hardcodé | DUPLICATION | Unifier |
| 03 | s-score deprecated | s-score.ts | 5 imports actifs | CONTRADICTOIRE | Migrer |
| 04 | target_sent < 35 | BB-02 | validator accepte | CONTRADICTOIRE | Fixer validateur |
| 05 | Polish NO-OP | engine.ts | imports maintenus | CONTRADICTOIRE | Archiver |
| 06 | f26b direction | physique v3 | GB V1 modèle | À VÉRIFIER | Auditer GB V1 |
| 07 | Hybride rejeté | BLOC7 decision | code présent | CONTRADICTOIRE | Archiver |
| 08 | PVI scellé | PVI FINAL | Absent de SE | PHANTOM | Documenter |
| 09 | L35 collision | Manuel v1.0 | Gemini audit | COLLISION | Créer L35b |

---

*repo_live_confirmed: true*
