# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — PHASE P0→P3
# Intégration du Tribunal GB V1 dans le Pipeline TypeScript
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-22
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : 5e1951cc
# Tag entrant  : phase-r8-complete
# Standard     : NASA-Grade L4 / DO-178C Level A
# Autorité     : Francky (Architecte Suprême)
# IA Principal : Claude (Opus 4.6)
# Exécutant    : Claude Code
#
# DURÉE ESTIMÉE : 3-5 heures
# API CALLS     : 0 (tout est local)
#
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 0 — CONTEXTE CRITIQUE (LIRE AVANT TOUTE ACTION)
# ═══════════════════════════════════════════════════════════════════════════════

## L'ERREUR QU'ON A COMMISE

On a démarré Phase P (pilotage du Scribe) AVANT d'avoir intégré le juge
principal dans le pipeline. Résultat : quand on a voulu évaluer la prose
POST-injection, on a dû créer un script Python ad hoc parce que le vrai
juge (GB V1, Spearman 0.79) N'EXISTE PAS dans le pipeline TypeScript.

Le bench `run-benchmark-dual.ts` utilise :
- V3 legacy (dramaturgie) — OPÉRATIONNEL en TS
- R6 multi-stage (artisanat) — OPÉRATIONNEL en TS mais INVALIDÉ (GPT > Flaubert)

Ni le GB V1 (le vrai juge), ni le diagnostic typologique R-8, ni l'endurance
ne sont accessibles automatiquement dans le pipeline.

## L'ARCHITECTURE DES 3 COUCHES (VERROUILLÉE — DECISION_R8_INTEGRATION.md)

| Couche | Rôle | Niveau | Fichier Python source | Fichier TS cible |
|--------|------|--------|----------------------|-----------------|
| JUGE (GB V1) | Score par-œuvre | ŒUVRE (2000w) | r7_multiscale_scorer_v2.py | À CRÉER : gb-scorer.ts |
| PHYSICIEN (R-8) | Diagnostic passage | PASSAGE | 8 scripts R-8 | typological-normalizer.ts (EXISTE, 18 tests) |
| METTEUR EN SCÈNE | Contraintes Scribe | PROMPT | master-prompt.ts | DÉJÀ FAIT (commit 5e1951cc) |

## RÈGLES ABSOLUES

R-01 : TOUT coefficient est APPRIS — ZÉRO poids fixé à la main
R-02 : Validation sur HOLDOUT (split identique seed=42)
R-03 : Le scorer TS doit reproduire le Python à tolérance ±0.05 par score
R-04 : AUCUNE modification des fichiers SCELLÉS (engine.ts, damage-gate.ts, config.ts)
R-05 : Tests AVANT et APRÈS chaque sprint
R-06 : Commit + tag à chaque fin de sprint
R-07 : AUCUN TODO/FIXME dans le code livré
R-08 : Chaque fichier créé a un header avec date, phase, rôle
R-09 : Le R6 scorer reste en place mais N'EST PLUS autorité de décision
R-10 : Le V3 legacy reste en place, inchangé

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — DOCUMENTS À LIRE (OBLIGATOIRE AVANT CODE)
# ═══════════════════════════════════════════════════════════════════════════════

LIRE DANS CET ORDRE :

1. docs/OMEGA_PROTOCOLE_ANALYSE_COMPLET.md
   → La Bible. Explique le GB, les features, les formules, les procédures.

2. docs/OMEGA_DECISION_R8_INTEGRATION.md
   → Architecture 3 couches. V1 gagne V2 et V3. R-8 = explicatif seulement.

3. docs/OMEGA_PHASE_R8_TECHNICAL_REPORT.md
   → Données complètes R-8 (Ci,f, λ, γ, Tk, assembly, lois).

4. docs/SESSION_SAVE_PHASE_R_FINAL.md
   → État exact au scellement. Features, scorer, endurance, limites.

5. docs/OMEGA_R7_SCORER_FINAL_REPORT.md
   → Meta-regression, courbes endurance, coefficients multi-échelle.

6. Le fichier Python de référence :
   omega-autopsie/corpus_r/r7_multiscale_scorer_v2.py
   → C'EST LE SOURCE DE VÉRITÉ. Tout le TS doit reproduire ce Python.

7. Les fichiers TS existants :
   packages/sovereign-engine/src/scoring/typological-normalizer.ts (18 tests)
   packages/sovereign-engine/src/scoring/multi-scale-scorer.ts (meta-regression)
   packages/sovereign-engine/src/scoring/text-features.ts (features F24-F38)
   packages/sovereign-engine/src/scoring/semantic-depth-features.ts (features sémantiques)
   packages/sovereign-engine/src/scoring/passage-classifier.ts (5 types)
   packages/sovereign-engine/src/scoring/depth-features.ts (f_pov, f_sub, f_clause)

8. Les données JSON :
   packages/sovereign-engine/src/scoring/data/R8_TIPPING_POINTS.json
   packages/sovereign-engine/src/scoring/data/R8_TYPOLOGICAL_CONSTANTS.json
   packages/sovereign-engine/src/scoring/data/R8_ASSEMBLY_PATTERNS.json

9. Le corpus et les données d'entraînement :
   omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json
   omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json
   omega-autopsie/corpus_r/CORPUS_TIERS_V3.json
   omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — SPRINT P0 : INTÉGRER LE GB V1 EN TYPESCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Avoir un scorer TypeScript natif qui reproduit EXACTEMENT le Python de référence.
Pas de bridge Python. Pas de spawn. Du TS pur.

## STRATÉGIE : EXPORT + INFÉRENCE NATIVE

### Étape P0.1 — Exporter le modèle entraîné depuis Python

Créer : omega-autopsie/corpus_r/export_gb_model.py

Ce script DOIT :
1. Charger les mêmes données que r7_multiscale_scorer_v2.py
   (MASTER + DEPTH + TIERS + SEMANTIC)
2. Entraîner le GB avec les MÊMES paramètres exacts :
   n_estimators=50, max_depth=4, learning_rate=0.05,
   random_state=42, subsample=0.8, min_samples_leaf=5
3. Faire le MÊME split : random.seed(42), shuffle, 70% train
4. Utiliser les MÊMES 42 features dans le MÊME ORDRE :
   V3_FEATURES (20) + SEMANTIC_FEATURES (22)
   (copier la liste EXACTE de r7_multiscale_scorer_v2.py ligne 250-252)
5. Après entraînement, EXPORTER les 50 arbres en JSON :
   Pour chaque arbre, pour chaque noeud :
   - feature_index (int)
   - threshold (float)
   - left_child (int, index du noeud fils gauche)
   - right_child (int, index du noeud fils droit)
   - value (float, valeur de prédiction si feuille)
   - is_leaf (bool)
   Utiliser gb.estimators_ pour accéder aux arbres sklearn.
6. Exporter AUSSI :
   - learning_rate (0.05)
   - init_value (moyenne de y_train = baseline)
   - feature_names (liste des 42 features dans l'ordre)
   - sanity_check : prédire 5 exemples connus et sauver les scores
7. Sauver dans : packages/sovereign-engine/src/scoring/data/GB_V1_MODEL.json
8. Afficher le Spearman du modèle pour confirmer qu'il est identique (0.7865)

### Vérification P0.1

```
python omega-autopsie/corpus_r/export_gb_model.py
# DOIT afficher : Spearman = 0.7865 (±0.0001)
# DOIT produire : packages/sovereign-engine/src/scoring/data/GB_V1_MODEL.json
```

### Étape P0.2 — Implémenter l'inférence GB en TypeScript

Créer : packages/sovereign-engine/src/scoring/gb-inference.ts

Ce module DOIT :
1. Charger le JSON exporté (GB_V1_MODEL.json)
2. Implémenter la traversée d'arbre :
   ```
   function predictTree(tree, features): number {
     let node = 0; // racine
     while (!tree.nodes[node].is_leaf) {
       const n = tree.nodes[node];
       if (features[n.feature_index] <= n.threshold) {
         node = n.left_child;
       } else {
         node = n.right_child;
       }
     }
     return tree.nodes[node].value;
   }
   ```
3. Implémenter la prédiction GB complète :
   ```
   function predictGB(model, features): number {
     let prediction = model.init_value;
     for (const tree of model.trees) {
       prediction += model.learning_rate * predictTree(tree, features);
     }
     return prediction;
   }
   ```
4. Exporter une classe `GBScorer` avec :
   - constructor() qui charge le modèle
   - score(features: Record<string, number>): number
   - getFeatureImportance(): Array<{name: string, importance: number}>
5. Le module doit être DÉTERMINISTE : même features → même score → même hash

### Étape P0.3 — Vérifier que TOUTES les 42 features sont calculables en TS

LES 42 FEATURES EXACTES (dans l'ordre du Python) :

```
V3_FEATURES = [
  'f26b_long_sent_rate',     # text-features.ts
  'f1a_rhythm_variance',     # text-features.ts
  'f1_mean',                 # text-features.ts
  'f24c_contrast_delta',     # text-features.ts
  'f28b_irony_density',      # text-features.ts
  'f27a_epistemic_rate',     # text-features.ts
  'f9a_contradiction_rate',  # text-features.ts
  'f19a_approx_entropy',     # text-features.ts
  'f27d_modal_score',        # text-features.ts
  'f26c_period_score',       # text-features.ts
  'f_pov_shift_rate',        # depth-features.ts
  'f_subordination_depth',   # depth-features.ts
  'f_clause_per_sentence',   # depth-features.ts
  'f17_knife_count',         # text-features.ts
  'f29d_ttr_score',          # text-features.ts
  'f35c_hook_score',         # text-features.ts
  'f36c_cliff_score',        # text-features.ts
  'ix_mean_x_subdepth',      # CALCULÉ : f1_mean * f_subordination_depth
  'ix_pov_x_irony',          # CALCULÉ : f_pov_shift_rate * f28b_irony_density
  'ix_variance_x_longrate',  # CALCULÉ : f1a_rhythm_variance * f26b_long_sent_rate
]

SEMANTIC_FEATURES = [
  'f_referent_continuity',       # semantic-depth-features.ts
  'f_referent_orphan_rate',      # semantic-depth-features.ts
  'f_entity_persistence',        # semantic-depth-features.ts
  'f_lexical_progression',       # semantic-depth-features.ts
  'f_semantic_stagnation',       # semantic-depth-features.ts
  'f_novelty_curve_slope',       # semantic-depth-features.ts
  'f_contextual_precision',      # semantic-depth-features.ts
  'f_rare_word_isolation',       # semantic-depth-features.ts
  'f_hapax_contextual_rate',     # semantic-depth-features.ts
  'f_vocabulary_depth',          # semantic-depth-features.ts
  'f_tension_density',           # semantic-depth-features.ts
  'f_desire_negation_rate',      # semantic-depth-features.ts
  'f_perception_conflict_rate',  # semantic-depth-features.ts
  'f_pov_drift_rate',            # semantic-depth-features.ts
  'f_pov_rupture_rate',          # semantic-depth-features.ts
  'f_pov_stability',             # semantic-depth-features.ts
  'f_causal_density',            # semantic-depth-features.ts
  'f_causal_chain_length',       # semantic-depth-features.ts
  'f_temporal_anchor_rate',      # semantic-depth-features.ts
  'f_echo_density',              # semantic-depth-features.ts
  'f_lexical_callback_rate',     # semantic-depth-features.ts
  'f_motif_concentration',       # semantic-depth-features.ts
]
```

Pour CHAQUE feature, vérifier qu'elle est calculée dans le TS existant.
Si une feature MANQUE dans le TS, L'AJOUTER.

Créer une fonction unifiée :
```typescript
function computeAllGBFeatures(text: string): Record<string, number> {
  const textF = computeTextFeatures(text);       // text-features.ts
  const depthF = computeDepthFeatures(text);      // depth-features.ts
  const semF = computeSemanticFeatures(text);     // semantic-depth-features.ts
  
  return {
    ...textF,
    ...depthF,
    ...semF,
    ix_mean_x_subdepth: (textF.f1_mean ?? 0) * (depthF.f_subordination_depth ?? 0),
    ix_pov_x_irony: (depthF.f_pov_shift_rate ?? 0) * (textF.f28b_irony_density ?? 0),
    ix_variance_x_longrate: (textF.f1a_rhythm_variance ?? 0) * (textF.f26b_long_sent_rate ?? 0),
  };
}
```

⚠️ ATTENTION CRITIQUE : les features TS et Python utilisent les MÊMES marqueurs
(mots-clés, regex, seuils). Comparer les listes de marqueurs entre le Python
(r7_multiscale_scorer_v2.py lignes 50-120) et le TS (text-features.ts, 
semantic-depth-features.ts). Si des marqueurs DIVERGENT, ALIGNER sur le Python
car c'est la source de vérité.

### Étape P0.4 — Tests de parité Python/TS

Créer : packages/sovereign-engine/tests/art/gb-scorer-parity.test.ts

Ce test DOIT :
1. Charger 5 textes de référence (extraits du corpus classé) :
   - 1 texte S-tier (Flaubert Bovary, extrait 2000w)
   - 1 texte A-tier
   - 1 texte B-tier
   - 1 texte C-tier
   - 1 texte D-tier
   Les 5 extraits sont dans omega-autopsie/corpus_r/txt/
   Utiliser les mêmes positions que le Python (position 0.5 = milieu du texte)

2. Pour chaque texte :
   - Calculer les 42 features en TS
   - Scorer avec le GB TS
   - Comparer au score Python attendu (stocké dans le JSON d'export, sanity_check)

3. Critères de PASS :
   - |score_TS - score_Python| < 0.05 pour chaque texte
   - Ordonnancement identique (S > A > B > C > D)
   - Spearman entre TS et Python ≥ 0.99 sur les 5 textes

4. Tests additionnels :
   - DÉTERMINISME : scorer 2 fois le même texte = même résultat
   - FEATURE COUNT : 42 features retournées, aucune NaN/undefined
   - MODEL LOADED : le JSON est parsé sans erreur

### Étape P0.5 — Commit P0

```bash
git add packages/sovereign-engine/src/scoring/gb-inference.ts
git add packages/sovereign-engine/src/scoring/data/GB_V1_MODEL.json
git add packages/sovereign-engine/tests/art/gb-scorer-parity.test.ts
git add omega-autopsie/corpus_r/export_gb_model.py
# + tout fichier modifié (text-features.ts, depth-features.ts, etc.)
git commit -m "feat(P0): integrate GB V1 scorer in TypeScript — parity with Python

- export_gb_model.py: trains exact GB (seed=42) and exports 50 trees as JSON
- gb-inference.ts: pure TS inference engine (tree traversal, no sklearn)
- gb-scorer-parity.test.ts: 5-text parity test, tolerance ±0.05
- Spearman parity: TS reproduces Python 0.7865
- 42 features verified: 20 V3 + 22 semantic, all computed in TS
- Zero Python dependency at runtime"
git tag p0-gb-scorer-integrated
```

## CRITÈRES DE SORTIE P0 (TOUS OBLIGATOIRES)

- [ ] GB_V1_MODEL.json existe et contient 50 arbres
- [ ] gb-inference.ts compile sans erreur (tsc --noEmit)
- [ ] 5 textes de référence scorés en TS avec |delta| < 0.05 vs Python
- [ ] Ordonnancement S > A > B > C > D correct
- [ ] Zéro NaN, zéro undefined dans les features
- [ ] Zéro TODO/FIXME dans le code
- [ ] Tests PASS (incluant tests existants — aucune régression)
- [ ] Commit + tag p0-gb-scorer-integrated

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — SPRINT P1 : CÂBLER LE PHYSICIEN (TYPOLOGICAL NORMALIZER)
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Câbler le typological-normalizer.ts (déjà existant, 18 tests) dans le 
pipeline de bench pour qu'il produise un diagnostic automatique par scène.

## PRÉREQUIS : P0 PASS

## Étape P1.1 — Créer le module de diagnostic R-8

Créer : packages/sovereign-engine/src/scoring/r8-diagnostic.ts

Ce module combine :
1. Le passage-classifier.ts (vecteur de type)
2. Le typological-normalizer.ts (Ci,f, λ, γ, Tk)
3. Le gb-inference.ts (score GB V1)

Interface de sortie :
```typescript
interface R8DiagnosticReport {
  /** GB V1 score (1-5 scale) */
  gb_score: number;
  /** Tier interpretation */
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  /** Type composition vector */
  type_composition: Record<string, number>;
  /** Dominant type */
  dominant_type: string;
  /** Tipping points audit */
  tipping_points: Array<{
    feature: string;
    value: number;
    threshold: number;
    direction: string;
    master_side: boolean;
  }>;
  /** Count of Tk on master side */
  tk_master_count: number;
  tk_total: number;
  /** Key features (top 10 by GB importance) */
  key_features: Array<{name: string; value: number; importance: number}>;
  /** Word count */
  word_count: number;
}
```

### Fonctions à implémenter :

```typescript
function diagnose(text: string): R8DiagnosticReport {
  const features = computeAllGBFeatures(text);
  const gbScore = gbScorer.score(features);
  const typeVec = classifyPassage(text);
  const normReport = normalizer.getNormalizationReport(features, typeVec);
  // ... assembler le rapport
}
```

## Étape P1.2 — Tests du diagnostic

Créer : packages/sovereign-engine/tests/art/r8-diagnostic.test.ts

Tests :
- Texte S-tier → tier = 'S' ou 'A', tk_master_count ≥ 5
- Texte D-tier → tier = 'C' ou 'D', tk_master_count ≤ 3
- Type composition → somme = 1.0 (±0.001)
- Tipping points → 10 items retournés
- DÉTERMINISME : même texte → même rapport

## Étape P1.3 — Commit P1

```bash
git add packages/sovereign-engine/src/scoring/r8-diagnostic.ts
git add packages/sovereign-engine/tests/art/r8-diagnostic.test.ts
git commit -m "feat(P1): wire R-8 diagnostic into TypeScript pipeline

- r8-diagnostic.ts: combines GB V1 + passage classifier + typological normalizer
- Outputs: gb_score, tier, type_composition, tipping_points, key_features
- 18 existing normalizer tests still PASS
- New diagnostic tests PASS"
git tag p1-diagnostic-wired
```

## CRITÈRES DE SORTIE P1

- [ ] r8-diagnostic.ts compile et exporte diagnose()
- [ ] Tests de diagnostic PASS
- [ ] Tests existants du normalizer (18) PASS
- [ ] Zéro régression sur tests existants
- [ ] Commit + tag p1-diagnostic-wired

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — SPRINT P2 : CÂBLER L'ENDURANCE
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Ajouter le scoring multi-échelle (500w + 2000w) dans le pipeline TS.
Le fichier multi-scale-scorer.ts EXISTE déjà avec la meta-regression.
Il manque la fonction scoreWindow(text) qui utilise le GB V1.

## PRÉREQUIS : P0 PASS + P1 PASS

## Étape P2.1 — Compléter multi-scale-scorer.ts

Le fichier packages/sovereign-engine/src/scoring/multi-scale-scorer.ts
contient déjà :
- META_COEFFICIENTS (appris sur 571 œuvres)
- buildMultiScaleScore()
- computeFinalScore()
- MIN_WORDS_FOR_VERIFICATION = 2000

Il MANQUE :
- extractWindows(text, windowSize, nWindows) — découpe en fenêtres
- scoreWindow(text) — GB V1 sur une fenêtre unique
- computeMultiScaleScore(fullText) — orchestration complète

Ajouter ces 3 fonctions. La logique EXACTE est dans le Python
(r7_multiscale_scorer_v2.py lignes 261-267 et 311-313).

### extractWindows :
```typescript
function extractWindows(text: string, windowSize: number, nWindows: number = 5): string[] | null {
  const words = text.split(/\s+/);
  if (words.length < windowSize) return null;
  const positions = Array.from({length: nWindows}, (_, i) => (i + 1) / (nWindows + 1));
  return positions.map(pos => {
    const start = Math.max(0, Math.floor(words.length * pos) - Math.floor(windowSize / 2));
    return words.slice(start, start + windowSize).join(' ');
  });
}
```

### scoreWindow :
```typescript
function scoreWindow(text: string): number {
  const features = computeAllGBFeatures(text);
  return gbScorer.score(features);
}
```

### computeMultiScaleScore :
```typescript
function computeMultiScaleScore(fullText: string): MultiScaleScore {
  const wordCount = fullText.split(/\s+/).length;
  
  // 500w windows
  const w500 = extractWindows(fullText, 500, 5);
  const s500 = w500 ? w500.map(w => scoreWindow(w)) : [];
  const scoreLocal = mean(s500) || 0;
  
  // 2000w windows
  const w2000 = extractWindows(fullText, 2000, 5);
  let scoreMeso: number | null = null;
  let stdMeso: number | null = null;
  if (w2000) {
    const s2000 = w2000.map(w => scoreWindow(w));
    scoreMeso = mean(s2000);
    stdMeso = stdev(s2000);
  }
  
  // Slope (multi-scale)
  let slope: number | null = null;
  const points: Array<[number, number]> = [];
  if (s500.length > 0) points.push([Math.log(500), mean(s500)]);
  if (scoreMeso !== null) points.push([Math.log(2000), scoreMeso]);
  // 5000w windows if available
  const w5000 = extractWindows(fullText, 5000, 5);
  if (w5000) points.push([Math.log(5000), mean(w5000.map(w => scoreWindow(w)))]);
  
  if (points.length >= 2) {
    // Linear regression on log-scale
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const xm = mean(xs); const ym = mean(ys);
    const num = xs.reduce((s, x, i) => s + (x - xm) * (ys[i] - ym), 0);
    const den = xs.reduce((s, x) => s + (x - xm) ** 2, 0);
    slope = den > 0 ? num / den : 0;
  }
  
  return buildMultiScaleScore(scoreLocal, scoreMeso, slope, stdMeso, wordCount);
}
```

⚠️ ATTENTION : computeMultiScaleScore est COÛTEUX (5 à 15 appels GB par texte).
Sur des scènes de 400-800 mots, seul le scoreLocal (500w) sera disponible.
Les scènes de bench seront flaggées NON_VERIFIABLE pour l'endurance — c'est NORMAL
et ATTENDU. L'endurance est un diagnostic sur les textes LONGS (chapitres, romans).

## Étape P2.2 — Tests d'endurance

Créer : packages/sovereign-engine/tests/art/endurance-scoring.test.ts

Tests :
- Texte < 500w → scoreLocal basé sur le texte entier, flag NON_VERIFIABLE
- Texte 500-2000w → scoreLocal OK, scoreMeso null, flag NON_VERIFIABLE
- Texte > 2000w → scoreLocal + scoreMeso + slope + flag VERIFIED
- DÉTERMINISME : même texte → même score final

Pour les textes de test > 2000w, utiliser un extrait de Flaubert Bovary
(copier 2500 mots depuis omega-autopsie/corpus_r/txt/flaubert_bovary_14155.txt).

## Étape P2.3 — Commit P2

```bash
git add packages/sovereign-engine/src/scoring/multi-scale-scorer.ts
git add packages/sovereign-engine/tests/art/endurance-scoring.test.ts
git commit -m "feat(P2): wire endurance scoring with GB V1 windows

- extractWindows: 500w/2000w/5000w window extraction
- scoreWindow: GB V1 on single window (pure TS)
- computeMultiScaleScore: full multi-scale with meta-regression
- Tests: 4 cases (tiny/short/medium/long)
- NON_VERIFIABLE flag for texts < 2000w (expected for bench scenes)"
git tag p2-endurance-wired
```

## CRITÈRES DE SORTIE P2

- [ ] extractWindows, scoreWindow, computeMultiScaleScore implémentés
- [ ] Tests d'endurance PASS
- [ ] Texte > 2000w → flag VERIFIED + slope calculé
- [ ] Zéro régression
- [ ] Commit + tag p2-endurance-wired

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — SPRINT P3 : LE BENCH UNIFIÉ
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Un SEUL run de bench qui affiche les 3 couches + endurance + prose sauvegardée.

## PRÉREQUIS : P0 + P1 + P2 PASS

## Étape P3.1 — Créer le bench unifié

Créer : packages/sovereign-engine/scripts/run-benchmark-unified.ts

Ce script remplace conceptuellement run-benchmark-dual.ts (qui reste en place
pour historique). Le bench unifié DOIT :

### Pour chaque scène générée :

1. **V3 legacy** (inchangé) → composite, min_axis, verdict
2. **GB V1** → score (1-5), tier (S/A/B/C/D)
3. **R-8 Diagnostic** → type_composition, tipping_points, tk_master_count
4. **Endurance** → score_local, score_meso (si applicable), flag
5. **Prose** → sauvegardée dans {packDir}/prose/{sceneId}.txt

### Format de sortie (console) :

```
═══════════════════════════════════════════════════════════════════════
  OMEGA UNIFIED BENCH — TABLEAU DE BORD COMPLET
═══════════════════════════════════════════════════════════════════════
  Scene                V3     GB V1  Tier  Tk   f26b    f1a    f29d  Type       Flag
  ────────────────────────────────────────────────────────────────────────────────
  Confrontation       91.30   3.54    A   2/10  0.000  6.45  0.756  DIALOGUE   NON_VER
  Élégie              92.16   3.65    A   3/10  0.000  8.08  0.748  DESCRIPT   NON_VER
  ...
  ────────────────────────────────────────────────────────────────────────────────
  MÉDIANE             91.78   3.65    A
  
  REFERENCE: S ≥ 4.5 | A ≥ 3.5 | B ≥ 2.5 | C ≥ 1.5
═══════════════════════════════════════════════════════════════════════
```

### Format de sortie (JSON) :

Fichier : {packDir}/unified_results.json
Contient pour chaque scène : V3 + GB V1 + R8 diagnostic complet + endurance + prose_hash

### Modes :

- MOCK : pas d'API, prose fixe, tous les scorers tournent
- API : génération réelle, tous les scorers tournent

### Invariants du bench unifié :

- I1 : V3 legacy IDENTIQUE à run-benchmark-dual (même code, même résultat)
- I2 : GB V1 score = même résultat que tribunal_gb_v1.py (±0.05)
- I3 : R-8 diagnostic = même Tk que le rapport technique
- I4 : Prose sauvegardée avec hash SHA-256
- I5 : DÉTERMINISME en mode MOCK

## Étape P3.2 — Test du bench en mode MOCK

Lancer : `npx tsx scripts/run-benchmark-unified.ts`

Vérifier :
- Les 8 scènes MOCK s'exécutent
- Le tableau s'affiche correctement
- Le JSON est sauvegardé
- Les proses sont sauvegardées
- Aucune erreur

## Étape P3.3 — Tests d'intégration

Créer : packages/sovereign-engine/tests/art/unified-bench-integration.test.ts

Tests :
- MOCK mode : 1 scène → tous les champs du rapport sont remplis
- GB V1 score dans la plage [1.0, 5.5]
- Type composition somme = 1.0
- Tipping points = 10 items
- Endurance flag = 'NON_VERIFIABLE' (scènes courtes)
- V3 composite > 50 (sanity check)

## Étape P3.4 — Relancer les tests existants

```bash
# TOUS les tests du monorepo
npm test

# OBLIGATOIRE : vérifier que RIEN n'a régressé
# Si un test échoue qui n'a pas été modifié → STOPPER et diagnostiquer
```

## Étape P3.5 — SESSION_SAVE + Commit P3

Créer : docs/SESSION_SAVE_P0_P3_INTEGRATION.md

Contenu :
- Résumé de ce qui a été fait (P0 → P3)
- Liste des fichiers créés/modifiés
- Résultats des tests de parité Python/TS
- Résultats du bench MOCK unifié
- État des 3 couches (JUGE + PHYSICIEN + METTEUR EN SCÈNE)
- Questions en suspens (R-9 ? HOTFIX 5.4 ?)
- Message de redémarrage

```bash
git add -A
git commit -m "feat(P3): unified bench — 3-layer tribunal operational in TypeScript

Sprint P0: GB V1 scorer in pure TS (50 trees, 42 features, parity ±0.05)
Sprint P1: R-8 diagnostic wired (type composition, Tk audit, deviation)
Sprint P2: Endurance scoring wired (500w/2000w/5000w windows, meta-regression)
Sprint P3: Unified bench with V3 + GB V1 + R-8 + endurance + prose saving

Tests: XX new + existing PASS, 0 regressions
Architecture: JUGE (GB V1) + PHYSICIEN (R-8) + METTEUR EN SCÈNE (prompt)
All 3 layers now operational in TypeScript pipeline."
git tag p3-unified-bench-complete
```

## CRITÈRES DE SORTIE P3 (TOUS OBLIGATOIRES)

- [ ] run-benchmark-unified.ts fonctionne en mode MOCK
- [ ] Tableau de bord complet affiché (V3 + GB V1 + Tk + endurance)
- [ ] JSON sauvegardé avec tous les champs
- [ ] Prose sauvegardée dans /prose/
- [ ] Tests d'intégration PASS
- [ ] TOUS les tests existants PASS (zéro régression)
- [ ] SESSION_SAVE rédigé
- [ ] Commit + tag p3-unified-bench-complete

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — RÈGLES D'EXÉCUTION (NON NÉGOCIABLES)
# ═══════════════════════════════════════════════════════════════════════════════

## ORDRE D'EXÉCUTION

P0.1 → P0.2 → P0.3 → P0.4 → P0.5 (commit)
→ P1.1 → P1.2 → P1.3 (commit)
→ P2.1 → P2.2 → P2.3 (commit)
→ P3.1 → P3.2 → P3.3 → P3.4 → P3.5 (commit)

NE PAS sauter d'étape. NE PAS paralléliser.

## TESTS

- Lancer `npm test` (ou `npx vitest`) AVANT de commencer (baseline)
- Lancer APRÈS chaque sprint (régression check)
- Si un test CASSE qui n'a pas été touché → STOPPER, diagnostiquer, corriger

## FICHIERS INTERDITS DE MODIFICATION

- packages/sovereign-engine/src/engine.ts
- packages/sovereign-engine/src/config.ts
- packages/sovereign-engine/src/types.ts (sauf ajout d'interfaces)
- Tout fichier dans les phases scellées A-U

## TOLÉRANCE NUMÉRIQUE

- Parité Python/TS : |delta| < 0.05 par score individuel
- Spearman parité : ≥ 0.99 sur les textes de référence
- Feature parité : |delta| < 0.01 pour les features normalisées (0-1)
- Feature parité : |delta| < 1.0 pour les features absolues (counts)

## SI BLOCAGE

Si une étape est bloquée (feature manquante, bug de parité, etc.) :
1. DOCUMENTER le blocage dans un fichier BLOCAGE_Px.md
2. Ne PAS contourner avec un hack
3. Ne PAS inventer une valeur
4. Chercher la cause dans le Python de référence
5. Si la divergence est dans les marqueurs (mots-clés regex), 
   ALIGNER le TS sur le Python (le Python est source de vérité)

## CHEMINS STANDARDS

| Quoi | Chemin |
|------|--------|
| Projet | C:\Users\elric\omega-project |
| Sovereign Engine | packages/sovereign-engine/ |
| Scoring modules | packages/sovereign-engine/src/scoring/ |
| Tests | packages/sovereign-engine/tests/art/ |
| Scripts bench | packages/sovereign-engine/scripts/ |
| Sessions bench | packages/sovereign-engine/sessions/ |
| Data JSON | packages/sovereign-engine/src/scoring/data/ |
| Python source | omega-autopsie/corpus_r/ |
| Corpus textes | omega-autopsie/corpus_r/txt/ |
| Results R-8 | omega-autopsie/results_phase_r8/ |
| Docs | docs/ |

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — VÉRIFICATION FINALE
# ═══════════════════════════════════════════════════════════════════════════════

## CHECKLIST AVANT LE DERNIER PUSH

- [ ] P0 : GB V1 en TS, parity ±0.05, 5 textes de référence
- [ ] P1 : Diagnostic R-8 câblé, type + Tk + deviation
- [ ] P2 : Endurance câblée, 500w/2000w/5000w, meta-regression
- [ ] P3 : Bench unifié V3 + GB V1 + R-8 + endurance
- [ ] Tous les tests PASS (aucune régression)
- [ ] Zéro TODO/FIXME dans le code livré
- [ ] SESSION_SAVE rédigé avec tous les chiffres
- [ ] 4 tags : p0-gb-scorer-integrated, p1-diagnostic-wired, p2-endurance-wired, p3-unified-bench-complete
- [ ] Prose sauvegardée dans le bench (dossier /prose/)
- [ ] Le V3 legacy et le R6 restent INTACTS (pas supprimés, pas modifiés)

## QUESTION FINALE (R15)

À la fin de l'exécution, poser cette question :

"Architecte, m'autorises-tu à rédiger le document historique officiel
SESSION_SAVE reprenant toutes les preuves, le code et la certification
pour mise à jour du Master Dossier ?"

# ═══════════════════════════════════════════════════════════════════════════════
# FIN DU PROMPT — P0→P3 INTÉGRATION DU TRIBUNAL
# ═══════════════════════════════════════════════════════════════════════════════
#
# Ce prompt est AUTONOME. Claude Code doit pouvoir l'exécuter sans intervention
# humaine jusqu'à la question finale R15.
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Autorité : Francky (Architecte Suprême)
# "Ce qui n'est pas mesuré n'est pas acceptable."
# "Ce qui n'est pas prouvé n'existe pas."
#
# ═══════════════════════════════════════════════════════════════════════════════
