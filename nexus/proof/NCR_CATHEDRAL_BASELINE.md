# NCR-CATHEDRAL-BASELINE

**Opened**: 2026-04-18
**Severity**: **HIGH (P1)** — découvert suite à clôture NCR_DIRECTIVE_BLOAT
**Status**: OPEN — investigation causale requise
**Owner**: Francky (décision finale sur architecture scoring/emotionContract CATHEDRAL)

## Déclencheur

Lors du bench d'ablation factoriel 2×2 `NCR_DIRECTIVE_BLOAT` (24 runs,
2026-04-17), la désagrégation per-scene du contrôle pur A (V1 static +
baseline directives) a révélé un écart structurel non-attribuable au
directive_bloat :

| Scene | Variant A μ | Variant B μ | Δ(A→B) | Variant C μ | Δ(A→C) |
|-------|-------------|-------------|--------|-------------|--------|
| fr_interior_maison_enfance (INTERIOR) | 6.093 | 2.190 | **-3.903** | 4.021 | -2.072 |
| fr_cathedral_gardien_nuit (CATHEDRAL) | **0.503** | 0.353 | -0.150 | 1.126 | **+0.623** |

**Anomalies** :

1. CATHEDRAL baseline A μ=0.503 vs INTERIOR baseline A μ=6.093 → **écart
   -5.590** en conditions identiques (V1 static + baseline directives,
   même seed set, même registre `litteraire`).
2. Δ(A→B) CATHEDRAL = -0.150 < seuil REJETÉ 0.5 → directive_bloat
   **n'explique pas** la sous-performance CATHEDRAL (scope directive_bloat
   confirmé = INTERIOR uniquement).
3. Δ(A→C) CATHEDRAL = **+0.623** → word_target modulation V2-B.2
   **améliore** CATHEDRAL au lieu de dégrader (contre-intuitif vs
   hypothèse globale V2-B.2 régressif).

La cause CATHEDRAL est donc **distincte** à la fois :
- de `directive_bloat` (écarté par Δ(A→B)=-0.150),
- de `NCR_ACTION_BIAS` (scope ACTION, pas CATHEDRAL),
- de la modulation `word_target` V2-B.2 (qui améliore, ne dégrade pas).

## Scores bruts (seeds détail)

```
A_v1_baseline / fr_cathedral_gardien_nuit / CATHEDRAL
  seeds : -0.40, 0.42, 1.49
  μ = 0.503  σ = 0.945

A_v1_baseline / fr_interior_maison_enfance / INTERIOR
  seeds : 7.61, 6.20, 4.46
  μ = 6.093  σ = 1.578
```

Les trois seeds CATHEDRAL sont ALL-LOW (max=1.49 reste sous μ INTERIOR
mini=4.46). Reproductibilité du bas niveau → cause déterministe, pas
variance LLM.

## Hypothèses candidates (non testées)

### H1 — Biais scoring CALC V3.4 scène-dépendant

Le scoring composite Oracle V3.4 repose sur 5 features CALC (f24c, f33b,
f1a, f33c, f12) + modulateurs par archétype. CATHEDRAL scène liturgique
implique :

- phrases longues en volutes (hausse `f1_mean` → potentiellement favorable)
- feuilletage subordonné profond (hausse `f_subordination_depth`)
- lexique hiératique/liturgique rare (peut décaler des features lexicales)
- tempo lent avec pauses rituelles

Un `type_modifier` CATHEDRAL mal calibré (ou absent — fallback NARRATION ?)
peut pénaliser mécaniquement. À vérifier dans `src/oracle/axes/*.ts` et
`packages/sovereign-engine/src/oracle/type-modifiers.ts`.

### H2 — emotionContract CATHEDRAL sous-calibré

Le contrat émotionnel CATHEDRAL (axes ECC/AAI/RCI/SII/IFI cibles) peut
viser des valeurs non atteignables par la prose générée même en V1 static
baseline. Si les cibles sont déséquilibrées, le scoring composite punit
même une sortie valide littérairement.

À auditer : `packages/sovereign-engine/src/contracts/emotion-contracts/cathedral.ts`
(ou équivalent) — comparer targets à distributions observées.

### H3 — prompt-assembler archétype CATHEDRAL désaligné

Le prompt-assembler V5 (wrapper V4 + Rosetta Bridge) peut générer un
prompt CATHEDRAL dont le lore-coding L3, les personas ou les directives
de registre sont inadaptés à la scène liturgique. La génération sort un
texte techniquement correct mais hors-contrat, que l'Oracle pénalise.

### H4 — scene complexity mismatch vs baseline template

La scène `fr_cathedral_gardien_nuit` peut avoir un briefing (longueur,
complexité narrative, contraintes d'époque) qui la rend structurellement
plus difficile que `fr_interior_maison_enfance`. Le LLM produit une
tentative honnête mais sous-calibrée pour cet archétype.

### H5 — corpus training Oracle V3.4 pauvre en CATHEDRAL

Si le corpus 1334 œuvres V3.4 contient peu de scènes liturgiques/rituelles
(vs abondantes scènes introspectives Proust/Duras), les coefficients Ridge
sont optimisés pour INTERIOR et sous-performent sur CATHEDRAL.

À vérifier : distribution archétypes dans `FEATURE_MATRIX_V3.csv` (si
labelisée) ou proxy via `source` / sous-catégorie.

## Plan d'investigation

### Phase 1 — Diagnostic features (coût faible, 1-2h)

1. Extraire les 5 features CALC (f24c, f33b, f1a, f33c, f12) des 3 sorties
   CATHEDRAL seeds (A_v1_baseline) depuis `bench-ablation-directive-results.json`.
2. Extraire les mêmes features pour 3 sorties INTERIOR A_v1_baseline.
3. Comparer distributions : quelle feature contribue le plus à l'écart
   composite ?
4. Si une feature domine (e.g. f1a chute massive sur CATHEDRAL) → piste
   causale micro-identifiée → H1 confirmée.

### Phase 2 — Audit emotionContract + prompt (coût moyen, 2-4h)

1. Lire `emotionContract` CATHEDRAL (chemin à localiser dans packages/).
2. Comparer targets ECC/AAI/RCI/SII/IFI à scores observés sur 3 seeds A.
3. Si écart systématique sur 1-2 axes → emotionContract mal calibré → H2.
4. Lire prompt assemblé pour CATHEDRAL (`prompt-assembler-v5.ts` output).
5. Vérifier cohérence lore-coding + registre + personas pour scène
   liturgique → H3.

### Phase 3 — Corpus audit V3.4 (coût moyen, 2-3h)

1. Scanner `FEATURE_MATRIX_V3.csv` (1334 œuvres) pour labels/keywords
   liturgiques : `église`, `cathédrale`, `messe`, `prière`, `vitrail`, `nef`.
2. Compter échantillons ≥ seuil liturgique.
3. Si N < 50 → H5 probable (sous-représentation corpus).
4. Si N ≥ 200 → H5 peu probable, cause ailleurs.

### Phase 4 — Bench d'ablation étendue (coût HAUT, 30-60 min compute)

Si Phase 1-3 inconcluante :
- Bench 4 archétypes (INTERIOR, CATHEDRAL, ACTION, SENSORY) × 4 modes
  directive × 3 seeds = 48 runs.
- Désactiver `type_modifier` CATHEDRAL en variante C' pour isoler son
  effet.
- Mesurer Δ sur CATHEDRAL avec/sans modifier.

## Règles scellées ex-ante

Pour éviter post-hoc rationalization, fixer avant bench Phase 4 :

- `|Δ(type_modifier)| ≥ 1.0` CATHEDRAL → modifier coupable → refonte ciblée.
- `|Δ| < 0.5` → modifier innocent → cause ailleurs (emotionContract ou prompt).
- `[0.5, 1.0)` → inconclusif, runs supplémentaires requis (N=6/cellule).

## Non-décisions explicites

- **NE PAS** recalibrer globalement Oracle V3.4 (plateau CALC scellé
  2026-04-11, ρ=0.6138, toute baisse seuil +0.02 interdite).
- **NE PAS** modifier `type_modifier` CATHEDRAL sans preuve empirique
  (Phase 4 bench d'ablation préalable).
- **NE PAS** assimiler à NCR_ACTION_BIAS (scope ACTION, causes features
  différentes : subordination + CV_sent + euphony, pas f1a).
- **NE PAS** assimiler à NCR_DIRECTIVE_BLOAT (CLOSED_CONFIRMED, scope
  INTERIOR, cause distincte confirmée par Δ(A→B) CATHEDRAL=-0.150).
- **NE PAS** rouvrir V2-B.2 / V2-C sur la base de Δ(A→C) CATHEDRAL=+0.623
  seul (effet local, agrégé V2-B.2 reste perdant).

## Conséquences si non résolu

1. Bench OMEGA toute scène CATHEDRAL donne résultats aberrants vs autres
   archétypes → biaise toute décision architecture chunking/directive.
2. Livrables V1 production CATHEDRAL peuvent passer le gate R6 (≥4.2) mais
   scorer anormalement bas vs benchmarks archetypes → faux signal
   d'alerte sur pipeline.
3. Toute feature future évaluée contre kill-switch +0.02 sur corpus
   incluant CATHEDRAL peut être rejetée à tort (bruit dominant le signal).

## Traçabilité

- Verdict ablation directive : `outputs/DIRECTIVE_ABLATION_VERDICT_v1.md`
  SHA256 à sceller post-commit
- Bench JSON source : `packages/sovereign-engine/bench-ablation-directive-results.json`
  SHA256 `F33209CD3C9A8237BDC7C14316FE26F3E7153D6D1FC1CB92CD0424004A561555`
- Report bench : `packages/sovereign-engine/bench-ablation-directive-results-report.md`
  SHA256 `688542027EE3D1901FD6803E152D2CD73FE72347CC5F7F512C55C1FEAF9E9A81`
- NCR amont clôturé : `nexus/proof/NCR_DIRECTIVE_BLOAT.md`
- NCR parallèle (cause distincte) : `nexus/proof/NCR_ACTION_BIAS.md`
- Oracle coefficients V3.4 : `M0B_SLIM_V34_COEFFICIENTS.json`
  SHA256 `e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c`

## Décision attendue

Francky décide séquence Phase 1 → 4 (diagnostic micro avant bench lourd)
OU saut direct Phase 4 si ressources compute disponibles.

Par défaut, recommandation = Phase 1 (coût faible, signal potentiellement
décisif avant d'engager 48 runs compute).
