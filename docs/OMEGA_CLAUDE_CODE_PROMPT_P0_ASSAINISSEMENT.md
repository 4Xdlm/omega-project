# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — CLAUDE CODE MEGA-PROMPT — P0 ASSAINISSEMENT
#   "Vérité vérifiée — Zéro approximation — Double contrôle"
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   Date         : 2026-04-02
#   HEAD entrant : c41edc2e
#   Branche      : phase-r-metrology-rebuild
#   Standard     : NASA-Grade L4 / DO-178C Level A
#   Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   MISSION : Exécuter les corrections P0 (certitude 100%) + PDP f26b
#   PUIS : Réorganiser scoring/data/ en 3 couches (P0-BIS)
#
#   RÈGLE CARDINALE : VÉRIFIER 2 FOIS AVANT CHAQUE MODIFICATION.
#   Pour chaque action :
#     1. LIRE le fichier (les lignes exactes à modifier)
#     2. AFFICHER ce qui va être changé (avant → après)
#     3. MODIFIER seulement si la lecture confirme l'attendu
#     4. RELIRE après modification pour vérifier
#     5. Si doute → STOP, marquer [DOUTE] et passer à l'action suivante
#
#   AUCUNE modification si la lecture ne correspond pas à l'attendu.
#   Les tests doivent rester GREEN à chaque étape.
#
# ═══════════════════════════════════════════════════════════════════════════════

# CHEMINS
REPO     = C:\Users\elric\omega-project
SE_SRC   = packages\sovereign-engine\src
PY311    = C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 0 — SNAPSHOT ÉTAT INITIAL
# ═══════════════════════════════════════════════════════════════════════════════

Avant toute modification :
1. Capturer le HEAD actuel : `git rev-parse HEAD`
2. Lancer les tests : `cd packages\sovereign-engine && npx vitest run`
3. Noter le nombre exact de tests passing
4. Si les tests ne passent PAS → STOP TOTAL, ne rien modifier

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-01 — ALIGNER weight-calibrator.ts sur config.ts (PRIORITÉ #1)
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
Lire src/calibration/weight-calibrator.ts lignes 64-76.
VÉRIFIER que tu vois :
```
export const DEFAULT_MACRO_WEIGHTS: readonly WeightConfig[] = [
  { axis: 'ecc', weight: 0.30 },
  { axis: 'rci', weight: 0.17 },
  { axis: 'sii', weight: 0.18 },
  { axis: 'ifi', weight: 0.15 },
  { axis: 'aai', weight: 0.20 },
];
```

Lire AUSSI src/oracle/macro-axes.ts lignes 9-13 pour confirmer les valeurs PROD :
  ECC=0.33, RCI=0.17, SII=0.15, IFI=0.10, AAI=0.25

## MODIFICATION :
Remplacer les valeurs dans weight-calibrator.ts PAR :
```typescript
/**
 * Default macro-axis weights (ECC, RCI, SII, IFI, AAI).
 * ALIGNED with SOVEREIGN_CONFIG (config.ts) — Sprint 11+ values.
 * Previous values (pre-Sprint 11): ECC=0.30, SII=0.18, IFI=0.15, AAI=0.20
 */
export const DEFAULT_MACRO_WEIGHTS: readonly WeightConfig[] = [
  { axis: 'ecc', weight: 0.33 },
  { axis: 'rci', weight: 0.17 },
  { axis: 'sii', weight: 0.15 },
  { axis: 'ifi', weight: 0.10 },
  { axis: 'aai', weight: 0.25 },
];
```

## APRÈS modification :
1. Relire le fichier pour vérifier les valeurs
2. Lancer les tests : `npx vitest run`
3. Si FAIL → git checkout le fichier et marquer [FAIL]


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-02 — UNIFIER SAGA_READY dans engine.ts
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
Lire src/engine.ts ligne 1 pour vérifier les imports existants.
Chercher si core/thresholds.ts est déjà importé.
Lire src/engine.ts lignes 197-200 et vérifier :
```
  const SAGA_COMPOSITE = 92.0;
  const SAGA_MIN_AXIS = 85.0;
```
Lire src/engine.ts ligne 549 et vérifier :
```
  saga_ready: final_score_v3.composite >= 92 && final_score_v3.min_axis >= 85,
```

## MODIFICATION :
1. Ajouter l'import en haut du fichier (après les autres imports, ~ligne 56) :
```typescript
import { SAGA_READY_COMPOSITE_MIN, SAGA_READY_SSI_MIN } from './core/thresholds.js';
```

2. Remplacer lignes 198-199 :
```typescript
  const SAGA_COMPOSITE = SAGA_READY_COMPOSITE_MIN;
  const SAGA_MIN_AXIS = SAGA_READY_SSI_MIN;
```

3. Remplacer ligne 549 :
```typescript
  saga_ready: final_score_v3.composite >= SAGA_READY_COMPOSITE_MIN && final_score_v3.min_axis >= SAGA_READY_SSI_MIN,
```

## APRÈS modification :
1. Relire les 3 endroits modifiés
2. Lancer les tests
3. Si FAIL → git checkout et marquer [FAIL]

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-03 — UNIFIER SEAL_FLOOR dans duel-engine.ts
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
Lire src/duel/duel-engine.ts lignes 135-139 et vérifier :
```
  const floorPenalty = 1.5 * Math.max(0, 85 - s.min_axis);
```
Vérifier les imports en tête du fichier.

## MODIFICATION :
1. Ajouter l'import :
```typescript
import { SEAL_FLOOR_MIN } from '../core/thresholds.js';
```

2. Remplacer la ligne :
```typescript
  // floorPenalty multiplier 1.5 : empirique Sprint hostile selection — ADR-FLOOR-01
  const floorPenalty = 1.5 * Math.max(0, SEAL_FLOOR_MIN - s.min_axis);
```

## APRÈS modification :
1. Relire la ligne modifiée
2. Tests


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-04 — COMPAT : VÉRIFIER AVANT DE TOUCHER
# ═══════════════════════════════════════════════════════════════════════════════

## ATTENTION — CORRECTION CRITIQUE :
L'IRM disait "compat/ = 0 imports, code mort". C'EST FAUX.
version-guard.ts EST re-exporté depuis index.ts :
  `export { assertVersion2 } from './compat/version-guard.js';`
ET a des tests actifs.

## AVANT de modifier :
1. Lire src/index.ts et chercher toute mention de "compat"
2. Chercher dans TOUT le repo : `assertVersion2` et `brief-compat`
3. Si version-guard a des consommateurs → NE PAS SUPPRIMER

## MODIFICATION (CONDITIONNELLE) :
- brief-compat-guard.ts : Vérifier s'il a des imports réels.
  Si 0 imports → SUPPRIMER. Sinon → GARDER.
- version-guard.ts : NE PAS SUPPRIMER (il est exporté + testé).

Si tu ne peux pas confirmer que brief-compat-guard.ts est mort → NE RIEN TOUCHER.
Marquer [DOUTE — compat gardé par précaution].

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-05 — SUPPRIMER IMPORTS POLISH COMMENTÉS
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
Lire src/engine.ts lignes 43-45 et vérifier :
```
import { polishRhythm } from './polish/musical-engine.js';
import { sweepCliches } from './polish/anti-cliche-sweep.js';
import { enforceSignature } from './polish/signature-enforcement.js';
```

Lire src/engine.ts lignes ~410-415 et vérifier que ces fonctions sont COMMENTÉES :
```
// Sprint 2: Polish DISABLED — proven NO-OP (delta 0.0 on ALL runs)
// polishRhythm(...)
// sweepCliches(...)
// enforceSignature(...)
```

VÉRIFIER qu'aucun autre endroit dans engine.ts n'appelle ces fonctions NON commenté.
Si doute → NE PAS MODIFIER.

## MODIFICATION :
Commenter les imports (PAS supprimer les fichiers — on archive en P1) :
```typescript
// ★ Sprint 2: Polish DISABLED — proven NO-OP (delta 0.0 on ALL runs)
// import { polishRhythm } from './polish/musical-engine.js';
// import { sweepCliches } from './polish/anti-cliche-sweep.js';
// import { enforceSignature } from './polish/signature-enforcement.js';
```

## APRÈS modification :
Tests.

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-06 — VALIDER avg_sentence_length_target >= 35
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
Lire src/input/pre-write-validator.ts et trouver la validation de
avg_sentence_length_target. On attend de voir :
```
if (sp.rhythm.avg_sentence_length_target <= 0) {
```

## MODIFICATION :
Remplacer par :
```typescript
if (sp.rhythm.avg_sentence_length_target <= 0) {
    errors.push({ field: 'style_genome.rhythm.avg_sentence_length_target', message: 'Target must be > 0', severity: 'error' });
  }
  // BB-02 (DEC-20260328-BB-02): Claude plancher mean_sent = 35w irréductible.
  // Toute cible < 35 est ignorée par le modèle → inutile et trompeur.
  if (sp.rhythm.avg_sentence_length_target > 0 && sp.rhythm.avg_sentence_length_target < 35) {
    errors.push({
      field: 'style_genome.rhythm.avg_sentence_length_target',
      message: 'BB-02: Claude plancher = 35w. Cible < 35 sera ignorée. Minimum accepté: 35.',
      severity: 'warning',
    });
  }
```

NOTE : on met un WARNING, pas une error, pour ne pas casser les tests existants
qui utilisent des cibles < 35. C'est la version SAFE.

## APRÈS modification :
Tests.


# ═══════════════════════════════════════════════════════════════════════════════
# ACTIONS P0-07 à P0-09 — DOCUMENTATION (ADR + L35b)
# ═══════════════════════════════════════════════════════════════════════════════

## P0-07 : Documenter CLIFF_THRESHOLD = 0.30
Créer docs/adr/ADR_CLIFF_THRESHOLD.md :
```markdown
# ADR: CLIFF_THRESHOLD = 0.30
Date: 2026-04-02
Statut: EMPIRIQUE — provenance partielle

## Contexte
engine.ts:455 utilise CLIFF_THRESHOLD = 0.30 pour la guillotine déterministe (BB-01).
cliff_score = tension * 0.5 + ellipsis * 0.3 + incomplete * 0.2

## Provenance
Lié indirectement à BB-01 (cliff_score = 0.50, confidence 0.96).
Le seuil 0.30 est plus strict que 0.50 : il coupe plus tôt.
Provenance exacte : non documentée lors de l'implémentation.

## Impact si modifié
Augmenter → moins de coupes → plus de closure (contredit BB-01)
Diminuer → plus de coupes → prose tronquée
```

## P0-08 : Documenter floorPenalty = 1.5
Créer docs/adr/ADR_FLOOR_PENALTY.md :
```markdown
# ADR: floorPenalty multiplier = 1.5
Date: 2026-04-02
Statut: EMPIRIQUE — magic number

## Contexte
duel-engine.ts:137 utilise 1.5 dans la sélection hostile :
  selectionScore = composite - 1.5 * max(0, 85 - min_axis)

## Provenance
Apparu avec la sélection hostile Sprint N.
Pas de calibration formelle documentée.
Le multiplier pénalise les candidats avec des axes faibles.

## Impact si modifié
Augmenter → pénalité plus forte sur les axes faibles
Diminuer → tolérance plus grande aux déséquilibres
```

## P0-09 : Créer L35b
Ajouter à docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md (ou créer un ADR) :
```markdown
# CORRECTION: L35 collision résolue
L35 = sub_per_sentence est le méga-levier FR (SEALED)
L35b = robustesse V6 : le modèle survit au retrait d'un auteur FR (SEALED)
Signalé par Gemini lors de l'audit IRM 2026-04-02.
```

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-10 — ARCHIVER hybrid-provider.ts
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
1. Lire src/runtime/hybrid-provider.ts pour confirmer qu'il existe
2. Chercher dans TOUT le codebase : `hybrid-provider` ou `HybridProvider`
3. Vérifier SURTOUT duel-engine.ts pour `OMEGA_HYBRID_MODE`

## MODIFICATION (CONDITIONNELLE) :
Si hybrid-provider.ts n'est importé NULLE PART dans le code actif :
  Déplacer vers src/runtime/archive/hybrid-provider.ts
  NE PAS SUPPRIMER — archiver.

Si OMEGA_HYBRID_MODE est testé dans duel-engine.ts :
  Commenter le test (pas le supprimer) avec un commentaire :
  `// BLOC7: hybrid mode rejeté 3/3 IAs + Francky. Env var conservée pour compatibilité.`

Si doute → NE RIEN TOUCHER. Marquer [DOUTE].

## APRÈS modification :
Tests.


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-11 — SUPPRIMER 2 DÉPENDANCES FANTÔMES
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
1. Lire packages/sovereign-engine/package.json et chercher @omega/phonetic-stack
2. Lire packages/truth-gate/package.json et chercher @omega/canon-engine

## MODIFICATION :
Supprimer les lignes de dépendance pour les packages inexistants.
VÉRIFIER que tu ne supprimes pas une dépendance vers un package qui EXISTE.

## APRÈS modification :
Tests (si les packages ont des tests configurés).

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P0-12 — PDP f26b (script Python — LECTURE SEULE, 0 modif code)
# ═══════════════════════════════════════════════════════════════════════════════

Écrire et exécuter ce script. IL NE MODIFIE RIEN — il mesure.

```python
# Fichier : docs/irm/inv/_pdp_f26b.py
import json
import numpy as np

MODEL = r"C:\Users\elric\omega-project\packages\sovereign-engine\src\scoring\data\GB_V1_MODEL.json"
with open(MODEL) as f:
    model = json.load(f)

def predict_tree(nodes, features):
    idx = 0
    while True:
        node = nodes[idx]
        if node['is_leaf']:
            return node['value']
        if features[node['feature_index']] <= node['threshold']:
            idx = node['left_child']
        else:
            idx = node['right_child']

def predict_gb(model, features):
    pred = model['init_value']
    lr = model['params']['learning_rate']
    for tree in model['trees']:
        pred += lr * predict_tree(tree['nodes'], features)
    return pred

# Extraire les médianes approximatives des features depuis le modèle
# On utilise les seuils médians de chaque feature
n_features = model['training']['n_features']
median_features = [0.05] * n_features  # approximation

# Pour chaque feature, estimer la médiane depuis les seuils des arbres
for fi in range(n_features):
    thresholds = []
    for tree in model['trees']:
        for node in tree['nodes']:
            if node['feature_index'] == fi and not node['is_leaf']:
                thresholds.append(node['threshold'])
    if thresholds:
        median_features[fi] = np.median(thresholds)

print(f"Médianes estimées (features 0-5): {[round(m,4) for m in median_features[:6]]}")

# Partial Dependence Plot sur f26b (feature 0)
f26b_values = np.linspace(0.0, 0.25, 50)
predictions = []
for val in f26b_values:
    features = median_features.copy()
    features[0] = val
    predictions.append(predict_gb(model, features))

# Analyse de la direction
preds = np.array(predictions)
slope_global = np.polyfit(f26b_values, preds, 1)[0]
slope_low = np.polyfit(f26b_values[:20], preds[:20], 1)[0]
slope_high = np.polyfit(f26b_values[20:], preds[20:], 1)[0]

monotonic = all(preds[i] <= preds[i+1] for i in range(len(preds)-1))
anti_monotonic = all(preds[i] >= preds[i+1] for i in range(len(preds)-1))

result = {
    "feature": "f26b_long_sent_rate",
    "method": "Partial Dependence Plot (50 points, 0.0-0.25)",
    "slope_global": round(float(slope_global), 4),
    "slope_low_range": round(float(slope_low), 4),
    "slope_high_range": round(float(slope_high), 4),
    "min_prediction": round(float(np.min(preds)), 4),
    "max_prediction": round(float(np.max(preds)), 4),
    "monotonic_increasing": bool(monotonic),
    "monotonic_decreasing": bool(anti_monotonic),
    "verdict": "POSITIVE" if slope_global > 0.1 else "NEGATIVE" if slope_global < -0.1 else "FLAT_OR_NONLINEAR",
    "coherent_with_L37": slope_global > 0,
    "note": "Ce PDP utilise des médianes estimées. Pour plus de précision, utiliser les vraies médianes du corpus."
}

OUT = r"C:\Users\elric\omega-project\docs\irm\inv\PDP_F26B_RESULT.json"
with open(OUT, 'w') as f:
    json.dump(result, f, indent=2)

print(f"\n=== RÉSULTAT PDP f26b ===")
print(f"Slope globale: {result['slope_global']}")
print(f"Slope basse (0-0.10): {result['slope_low_range']}")
print(f"Slope haute (0.10-0.25): {result['slope_high_range']}")
print(f"Monotone croissant: {result['monotonic_increasing']}")
print(f"Verdict: {result['verdict']}")
print(f"Cohérent avec L37: {result['coherent_with_L37']}")
```

Exécuter avec Python 3.11 :
```powershell
& "C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe" "C:\Users\elric\omega-project\docs\irm\inv\_pdp_f26b.py"
```

Le résultat sera dans docs/irm/inv/PDP_F26B_RESULT.json.
CE RÉSULTAT DÉTERMINE LE STATUT DE GB V1 :
  Si slope > 0 → GB V1 est COHÉRENT avec L37 (les IAs avaient TORT)
  Si slope < 0 → GB V1 est INVERSÉ (quarantaine justifiée)
  Si slope ≈ 0 → relation non-linéaire, investigation supplémentaire requise


# ═══════════════════════════════════════════════════════════════════════════════
# P0-BIS — RÉORGANISATION JSON EN 3 COUCHES
# ═══════════════════════════════════════════════════════════════════════════════

## STRUCTURE CIBLE :
```
scoring/data/
  ├── (4 fichiers RUNTIME — NE PAS DÉPLACER)
  │   ├── GB_V1_MODEL.json
  │   ├── OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json
  │   ├── R8_TIPPING_POINTS.json
  │   └── R8_TYPOLOGICAL_CONSTANTS.json
  │
  ├── calibration/   ← créer ce dossier
  │   └── (21 fichiers — données nécessaires pour Phase R4)
  │
  └── archive/       ← créer ce dossier
      └── (~32 fichiers — résultats de bench historiques)
```

## ÉTAPE 1 — Créer les dossiers
```powershell
New-Item -ItemType Directory -Force -Path "src\scoring\data\calibration"
New-Item -ItemType Directory -Force -Path "src\scoring\data\archive"
```

## ÉTAPE 2 — Déplacer les fichiers CALIBRATION R4
VÉRIFIER 2 FOIS que chaque fichier listé n'est PAS importé par le code.
Si un fichier EST importé → NE PAS DÉPLACER.

Fichiers CALIBRATION (déplacer vers calibration/) :
```
COMPOSITION_PROFILES.json
TYPE_FEATURE_IMPORTANCE.json
TYPE_MEASURE_SIGNATURES.json
TYPE_COMPATIBILITY_MATRIX.json
TRANSITION_MATRICES.json
R8_ASSEMBLY_PATTERNS.json
CLASSIFIER_CALIBRATION_V2.json
CLASSIFIER_AUDIT_RESULTS.json
GOLD_SET_PASSAGES.json
MEASURE_ROLES.json
MEASURE_TRUST_MATRIX.json
METRIC_UTILITY_ANALYSIS.json
JUDGE_CALIBRATION_MULTI_SIZE.json
JUDGE_CALIBRATION_RESULTS.json
TIER_RADAR_PROFILES.json
PARTIAL_CORRELATIONS_DEEP.json
DENOMINATOR_BIAS_AUDIT.json
R_MEASURE_TOTAL.json
FR_VS_EN_COMPARISON.json
TRANSLATION_PAIRS.json
TRANSLATION_FIDELITY.json
```

## ÉTAPE 3 — Déplacer les fichiers ARCHIVE
Fichiers bench/expériences terminées (déplacer vers archive/) :
```
BENCH_CHAPTER_3MODELS.json
CALIBRATION_METRICS.json
CAUSAL_AUDIT_COMPLETE.json
CAUSAL_DEEP_AUDIT.json
DIAGNOSTIC_CHRONOGRAPH.json
EN_NATIVE_CORPUS.json
EPOCH_REQUALIFICATION.json
F26B_BREAKER_RESULTS.json
F26B_PHASE2_RESULTS.json
F26B_PHASE3_RESULTS.json
FR_VS_EN_BOTTLENECK_TEST.json
GPT_FR_VS_EN_BOTTLENECK.json
HURST_LOCAL_ANALYSIS.json
MEASURE_CROSS_CORRELATION.json
MIRROR_TEST_RESULTS.json
MISTRAL_FR_VS_EN_BOTTLENECK.json
MISTRAL_VS_CLAUDE_FR.json
NONLINEAR_PATTERNS.json
OMEGA_COVERAGE_AUDIT.json
OVERACTING_AUDIT.json
P1_3000W_FDP_K2_RESULTS.json
P1_REDESIGN_RESULTS.json
P1_REDESIGN_V2_RESULTS.json
P1_REDESIGN_V3_RESULTS.json
P2_RESCORE_V2_RESULTS.json
P3_REGIME_CIBLE_RESULTS.json
P3_V4_CONFIRMATION_RESULTS.json
P4_CONTINUITE_RESULTS.json
PHASE4B_PULVERIZE_RESULTS.json
PHASE4C_FUSION_INTL_RESULTS.json
PHASE4_ANTIDRIFT_RESULTS.json
PHASE5B_VALIDATION_RESULTS.json
PCA_ANALYSIS.json
PROMPT_COMPLIANCE_AUDIT.json
R_CONVERSION_EN_RESULTS.json
R_CONVERSION_RESULTS.json
REDUNDANCY_DEEP_AUDIT.json
RESIDUAL_DIAGNOSIS.json
ROSETTA_INTEGRATION_AUDIT.json
ROSETTA_VS_PHASE_P_DIAGNOSIS.json
SENSATION_ANALYSIS.json
SIGNAL_ANALYSIS.json
SURFACE_3D_ANALYSIS.json
TRUE_DIMENSIONS_AUDIT.json
VATOMIC_RESCORED_A.json
VATOMIC_RESCORED_B.json
VATOMIC_RESULTS.json
VRECAL1_B0_RESULTS.json
VRECAL1_ENGINE_RESULTS.json
```

## ÉTAPE 4 — VÉRIFICATION FINALE
1. Lister scoring/data/ → doit contenir EXACTEMENT 4 fichiers + 2 dossiers
2. Lister scoring/data/calibration/ → ~21 fichiers
3. Lister scoring/data/archive/ → ~32+ fichiers
4. Lancer les tests → DOIVENT RESTER GREEN
   (les tests n'importent que les 4 fichiers runtime)
5. Si un test FAIL → un fichier "ORPHAN" est en réalité ACTIF → le remettre


# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT FINAL
# ═══════════════════════════════════════════════════════════════════════════════

## Tests finaux
```powershell
Set-Location C:\Users\elric\omega-project\packages\sovereign-engine
npx vitest run
```
Résultat attendu : même nombre de tests passing qu'au début + 0 FAIL.

## Nettoyer scripts temporaires
```powershell
Remove-Item "C:\Users\elric\omega-project\docs\irm\inv\_pdp_f26b.py" -ErrorAction SilentlyContinue
```

## Commit
Écrire le message dans un fichier :
```
fix(ssot): P0 assainissement — 11 corrections vérité vérifiée

P0-01: ALIGN weight-calibrator.ts sur config.ts (ECC 0.33, SII 0.15, IFI 0.10, AAI 0.25)
P0-02: Unifier SAGA_READY engine.ts → import core/thresholds.ts
P0-03: Unifier SEAL_FLOOR duel-engine.ts → import core/thresholds.ts
P0-04: compat/ vérifié (version-guard GARDÉ, brief-compat-guard évalué)
P0-05: Polish imports commentés (NO-OP prouvé Sprint 2)
P0-06: Validation avg_sent >= 35 (BB-02 warning)
P0-07: ADR CLIFF_THRESHOLD 0.30
P0-08: ADR floorPenalty 1.5
P0-09: Création L35b (résolution collision)
P0-10: hybrid-provider archivé (BLOC7 rejeté)
P0-11: 2 dépendances fantômes supprimées
P0-12: PDP f26b exécuté → résultat dans docs/irm/inv/PDP_F26B_RESULT.json
P0-BIS: Réorganisation scoring/data/ en 3 couches (runtime/calibration/archive)

Tests: [X] passed, 0 failed (INCHANGÉ)
Standard: NASA-Grade L4 / DO-178C Level A
```

```powershell
Set-Location C:\Users\elric\omega-project
git add -A
git commit -F commit_msg.txt
git tag omega-p0-assainissement-v1
git push origin phase-r-metrology-rebuild --tags
```

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKLIST FINALE — 15 CONTRÔLES
# ═══════════════════════════════════════════════════════════════════════════════

[ ] 1. weight-calibrator.ts : ECC=0.33, SII=0.15, IFI=0.10, AAI=0.25
[ ] 2. engine.ts:198 : importe SAGA_READY_COMPOSITE_MIN (pas 92.0 hardcodé)
[ ] 3. engine.ts:549 : utilise SAGA_READY_COMPOSITE_MIN (pas >= 92)
[ ] 4. duel-engine.ts:137 : utilise SEAL_FLOOR_MIN (pas 85 hardcodé)
[ ] 5. compat/version-guard.ts : TOUJOURS PRÉSENT (pas supprimé)
[ ] 6. Polish imports : commentés dans engine.ts:43-45
[ ] 7. pre-write-validator.ts : warning si avg_sent_target < 35
[ ] 8. docs/adr/ADR_CLIFF_THRESHOLD.md créé
[ ] 9. docs/adr/ADR_FLOOR_PENALTY.md créé
[ ] 10. L35b documenté
[ ] 11. hybrid-provider.ts archivé (si confirmé mort)
[ ] 12. 2 deps fantômes supprimées de package.json
[ ] 13. PDP_F26B_RESULT.json produit avec verdict
[ ] 14. scoring/data/ = 4 runtime + calibration/ + archive/
[ ] 15. Tests = même nombre passing qu'avant, 0 FAIL

UN SEUL contrôle manqué → noter dans le rapport.

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLE D'OR — EN CAS DE DOUTE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Si à TOUT moment tu n'es pas sûr d'une modification :
#   1. NE MODIFIE PAS
#   2. Marque [DOUTE — raison]
#   3. Passe à l'action suivante
#   4. Francky décidera
#
# "Ce qui n'est pas prouvé n'existe pas."
# "Mieux vaut ne rien toucher que casser quelque chose."
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Autorité : Francky (Architecte Suprême)
# ═══════════════════════════════════════════════════════════════════════════════
