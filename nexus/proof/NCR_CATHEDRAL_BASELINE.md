# NCR-CATHEDRAL-BASELINE

**Opened**: 2026-04-18
**Severity**: **HIGH (P1)** — découvert suite à clôture NCR_DIRECTIVE_BLOAT
**Status**: **DEFERRED** (Sprint S8 V3A 2026-05-01 — D2 exécutée, Pistes A/B/C explicitement POST R-D.1, sprint dédié S9+)
**Précédent**: DIAGNOSED (2026-04-18, Phase 1 H1 confirmée 81.1 %) — décision D2 validée unanimité 3/3 IA
**Owner**: Francky (décision finale sur architecture scoring/emotionContract CATHEDRAL)

---

## VERDICT Phase 1 — H1 CONFIRMÉE (2026-04-18)

Phase 1 terminée : audit full 6 runs variant A re-run (Ollama qwen3:32b,
6.77 min, reproductibilité parfaite à 3 décimales).

**Résultat décisif** : `f33b_commas_count` porte **81.1 %** du gap
CATHEDRAL−INTERIOR (Δcontrib = −4.532 sur −5.590). Seuil ex-ante 50 %
largement dépassé → H1 CONFIRMÉE.

**Mécanisme causal** : f33b est un compte BRUT (non normalisé par
mots/phrases). Coefficient FR +0.3465 encode une corrélation agrégée
valide sur corpus 1334 (ρ=0.6138) mais **registre-aveugle**. La prose
liturgique-contemplatif (CATHEDRAL, peu de virgules stylistiquement
correct) est mécaniquement pénalisée.

**Biais de calibration**, pas bug moteur ni défaut qwen3:32b.

Décomposition complète :

| Feature | Δ contrib | % du gap |
|---|---|---|
| **f33b_commas_count** | **−4.532** | **81.1 %** |
| f12_tense_switches | −0.846 | 15.1 % |
| f24c_contrast_delta | −0.218 | 3.9 % |
| f1a_rhythm_variance | −0.052 | 0.9 % |
| f33c_dot_comma_ratio | +0.059 | −1.1 % |
| **TOTAL** | **−5.590** | **100 %** |

Rapport : `outputs/PHASE_1_CATHEDRAL_DIAGNOSTIC_v1.md`
Audit JSON : `packages/sovereign-engine/audit-cathedral-features-v1-results.json`
SHA256 audit : `7B720C9183D41B976D10C27348A2647DE2EF7B5188E6018CE2C7EA3ADDE58941`

## Décision Francky — D2 (unanimité 3/3 IA)

**Choix validé** : D2 — Lancer R-D.1 bench étendu (48 runs) avec V3.4
inchangé, CATHEDRAL traité comme groupe témoin de biais constant.

**Rejetés** :
- D1 (clore sur diagnostic seul) — rejeté par Gemini + ChatGPT : ne pas
  figer un biais architectural identifié.
- D3 (modifier f33b avant bench) — rejeté par les 3 IA : contamine la
  baseline, casse la chaîne de preuve.

**Logique D2** :
- R-D.1 mesure l'effet réel de la directive `silence` sur INTERIOR /
  ACTION / SENSORY (où le biais f33b ne domine pas).
- CATHEDRAL reste bas et stable par construction (témoin aveugle). Si
  CATHEDRAL bougeait > 0.5 dans R-D.1 → Phase 1 incomplète, alerte
  majeure.
- Phases 2-3 du plan NCR initial deviennent CONDITIONNELLES (secondaires,
  15.1 % par f12 seulement).

## NCR dérivé ouvert — NCR_SCORER_STYLE_BIAS (proposé Gemini)

Le biais identifié dépasse le scope CATHEDRAL : il affecte TOUT registre
minimaliste/liturgique/anaphorique jugé par V3.4. Ouvrir un ticket séparé
**NCR_SCORER_STYLE_BIAS** pour traiter la refonte architecturale future
(scoring conditionnel par registre ou features normalisées) — hors scope
immédiat R-D.1, à adresser post-R-D.1.

## Pistes correctives (POST R-D.1, aucune lancée maintenant)

- **Piste A** — feature normalisée `f33b_per_word` (nécessite retrain
  Ridge corpus 1334, chantier V4)
- **Piste B** — `type_modifier` per-archétype downstream V3.4 (patch
  rapide, modifie scoring composite pas le dispatcher)
- **Piste C** — scoring conditionnel multi-registre (refonte propre,
  `score = V3.4 + type_mod(register)`)

Question Francky à trancher post-R-D.1 (ChatGPT) :
- A — patch rapide f33b
- B — bascule scoring conditionnel (refonte)

---

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

---

## S8 V3A CLASSIFICATION — 2026-05-01

### Evidence checked

- ✅ `packages/sovereign-engine/audit-cathedral-features-v1-results.json` présent (88 447 bytes)
- ✅ `audit-cathedral-features-preliminary-results.json` + 2 reports markdown présents (4 fichiers cathedral audit total)
- ❌ `outputs/PHASE_1_CATHEDRAL_DIAGNOSTIC_v1.md` cité §"VERDICT Phase 1" : **INTROUVABLE** filesystem (couvert par NCR_EVIDENCE_ARTIFACT_GAP_PATTERN F1 umbrella, commit `3bfcdbde`)
- ❌ `outputs/DIRECTIVE_ABLATION_VERDICT_v1.md` cité §"Traçabilité" : INTROUVABLE (couvert NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING + F1 umbrella)
- ❌ `M0B_SLIM_V34_COEFFICIENTS.json` cité §"Traçabilité" SHA256 e75e3bb0..fe8424c : INTROUVABLE (couvert F1 umbrella)
- ✅ `NCR_SCORER_STYLE_BIAS` dérivé existe (mentionné §"NCR dérivé ouvert")
- ⚠️ Anchor Cowork "S8-prep livré spec dans `outputs/OMEGA_TRIBUNAL_2026-04-26/S8_PREP*/CATHEDRAL_*`" : **NON VÉRIFIABLE** — aucun fichier `S8_PREP*` ni CATHEDRAL n'existe à ce path. Anchor `[À VÉRIFIER]` non confirmé empiriquement, ne pas inclure dans la closure.

### Decision rationale

**D2 (lancer R-D.1) est EXÉCUTÉE empiriquement** :
- Commit `7e89f95f` (2026-04-18 15:18) "feat(adaptive-chunker): P1 archetype gating wiring (R-D.1 ADOPT_A)"
- R-D.1 bench complet lancé selon plan §"Décision D2"

**Pistes correctives A/B/C (refonte scoring conditionnel ou patch f33b)** :
- Toutes explicitement marquées **POST R-D.1** dans le NCR
- Aucune n'a été engagée dans le code (pas de commit relatif post-2026-04-18)
- Toutes nécessitent sprint dédié (refonte Ridge / patch type_modifier)

→ **DEFERRED** est correct :
- Cannot RESOLVED (Pistes A/B/C non appliquées, biais persiste)
- Cannot CLOSED_CONFIRMED (corrective action pas faite)
- Cannot STILL_OPEN passive (D2 explicitement EXÉCUTÉE — pas en attente passive)
- DEFERRED reflète : diagnostic acquis, action corrective différée à sprint dédié S9+

### Final status

**DEFERRED** (severity HIGH P1 maintenue — biais structural identifié et persistant)

### Scope

- **Diagnostic acquis** : H1 confirmée 81.1% (Phase 1 audit), mécanisme causal identifié (f33b registre-aveugle)
- **Décision D2 exécutée** : R-D.1 bench lancé (commit `7e89f95f`)
- **Pistes correctives DEFERRED** : A (feature normalisée `f33b_per_word`, retrain Ridge), B (`type_modifier` per-archétype downstream V3.4), C (scoring conditionnel multi-registre — refonte propre)

### Remaining risks

- **R1** — Biais f33b persiste en prod : toute scène CATHEDRAL en bench est artificiellement basse → §"Conséquences si non résolu" §3 (kill-switch +0.02 peut rejeter à tort)
- **R2** — Evidence-gap multiple : 3 fichiers cités introuvables (PHASE_1, DIRECTIVE_ABLATION, M0B_SLIM_V34) — impacte traçabilité empirique du diagnostic
- **R3** — Décision A vs B vs C non prise : Question Francky §"Pistes correctives" ("A patch rapide vs B refonte") en attente depuis 13 jours
- **R4** — Décision NCR_SCORER_STYLE_BIAS : NCR dérivé ouvert, hérite du même DEFERRED (à voir C23)

### Next sprint if deferred

**Sprint S9+ dédié** (cohérent avec instruction Cowork D2 logique) :
1. Décision Architecte explicite Piste A (patch rapide f33b) vs B (refonte scoring conditionnel)
2. Audit empirique Phase 3 (corpus liturgique 1334) si Piste A retenue
3. Bench Phase 4 (4 archétypes × 4 modes × 3 seeds = 48 runs) si refonte
4. Coordination avec NCR_SCORER_STYLE_BIAS (refonte commune si Piste C globale)
5. Régler evidence-gaps (couvert F1 umbrella) en parallèle

### Anchor empirique runtime arbitrage

```
S8 V3A CLASSIFICATION — NCR_CATHEDRAL_BASELINE
================================================
Date            : 2026-05-01 (Sprint S8 V3A)
Status          : DIAGNOSED → DEFERRED (D2 exécutée, Pistes POST R-D.1)
Severity        : HIGH P1 (inchangée — biais structural)
Authority       : Claude Code (runtime arbiter S8 V3A)
                  + Tribunal 3 IA convergence Phase 1 (3/3 D2)
Evidence anchor : audit-cathedral-features-v1-results.json (88 KB) +
                  3 autres fichiers audit cathedral présents
                  + commit 7e89f95f wiring R-D.1 ADOPT_A
Evidence gaps   : PHASE_1_CATHEDRAL_DIAGNOSTIC_v1.md introuvable,
                  DIRECTIVE_ABLATION_VERDICT_v1.md introuvable,
                  M0B_SLIM_V34_COEFFICIENTS.json introuvable
                  (tous couverts F1 umbrella commit 3bfcdbde)
Anchor non vérifié : Cowork "S8-prep livré spec CATHEDRAL_*"
                  introuvable empiriquement — non cité dans closure
Scope           : diagnostic complet acquis, corrective action
                  Pistes A/B/C reportée Sprint S9+
Risks           : R1 biais persiste prod, R2 evidence-gaps,
                  R3 décision A/B 13 jours sans choix, R4 scorer-style-bias coupling
```
