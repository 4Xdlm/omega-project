# NCR-DIRECTIVE-BLOAT

**Opened**: 2026-04-17
**Severity**: HIGH (P1) — promu 2026-04-17 suite ROLLBACK B+ V2-C (G1 INTERIOR FAIL -2.752)
**Status**: **CLOSED_CONFIRMED** (2026-04-17, 21:47:49 CEST) — bench ablation factoriel 2×2 (24 runs qwen3:32b) a isolé la cause : directive adaptive cause Δ(A→B)=-2.027 sur plan V1 static inchangé, seuil ≥1.0 largement dépassé. Scope effectif INTERIOR uniquement (-3.903) ; CATHEDRAL non concernée (-0.150) → cause distincte, ouverture NCR_CATHEDRAL_BASELINE.
**Owner**: Francky (redesign directives — action ouverte)

## Clôture (2026-04-17)

**Verdict** : `DIRECTIVE_BLOAT_CONFIRMED` (INTERIOR scope).

**Evidence** (SHA256 scellés) :
- Bench JSON : `packages/sovereign-engine/bench-ablation-directive-results.json`
  `F33209CD3C9A8237BDC7C14316FE26F3E7153D6D1FC1CB92CD0424004A561555`
- Report : `packages/sovereign-engine/bench-ablation-directive-results-report.md`
  `688542027EE3D1901FD6803E152D2CD73FE72347CC5F7F512C55C1FEAF9E9A81`
- Verdict final : `outputs/DIRECTIVE_ABLATION_VERDICT_v1.md`
- Script bench : `packages/sovereign-engine/scripts/bench-ablation-directive.ts`
  `06E3C4E0229242D25A08484CBF2B452EB1CA8351649BBEB93DD76A6FB23404F7`
- Code modifié : `packages/sovereign-engine/src/generation/adaptive-chunker.ts`
  `DBF6A4B2B6519F57E5310B2BC3011F7FE2DEC9292BEEC90B53733DDF032C438D`

**Mesures** (24 runs, 4 variants × 2 scenes × 3 seeds) :
- A (V1 + baseline) μ=3.298 — **contrôle gagnant**
- B (V1 + adaptive) μ=1.271 → Δ(A→B)=-2.027 (directive seule)
- C (V2-B.2 + baseline) μ=2.574 → Δ(A→C)=-0.724 (word_target seul)
- D (V2-B.2 + adaptive) μ=1.332 → Δ(B→D)=+0.061 (saturation)

**Per-scene Δ(A→B)** :
- INTERIOR : **-3.903** (catastrophique, 3× le seuil 1.0)
- CATHEDRAL : **-0.150** (sous seuil REJETÉ 0.5 — neutre)

**Conclusion causale** :
1. Directive adaptive silence/introspective toxique en INTERIOR (cause primaire, ~73% régression).
2. `word_target` V2-B.2 contribue ~27% mais saturé dès que directive ON.
3. CATHEDRAL baseline μ=0.503 vs INTERIOR μ=6.093 → **cause distincte** non couverte par cette ablation → ouverture NCR_CATHEDRAL_BASELINE (P1).

**Actions post-clôture** :
1. Redesigner `REGISTER_TABLE['litteraire']['silence']` OU conditionner `pickPacingDirective` par archétype (bloquer silence/introspective quand `archetype==='INTERIOR'`).
2. Bench ablation étendue (4 archétypes × 4 modes directive) AVANT réactivation V2-B.2/V2-C.
3. Ouvrir NCR_CATHEDRAL_BASELINE (P1) — biais scoring scène-dépendant suspecté.
4. Production reste **V1 static + directives baseline** (`OMEGA_ADAPTIVE_CHUNKING=0` ; `buildStaticPlan` émet `pacing_state='baseline'` partout donc l'env `OMEGA_DIRECTIVE_MODE` est inopérant en prod → pas de modification runtime nécessaire).

## Promotion P1 (2026-04-17)

**Déclencheur** : bench V2-C (variant=v2c, 24 runs Ollama qwen3:32b)
a échoué le gate `G1_INTERIOR_WORST` (Δ=-2.752 vs seuil -1.5).

**Rationnel** : le router V2-C routait INTERIOR → `buildStaticPlan`
(identique V1) et CATHEDRAL → `buildStaticPlan`. Malgré ce routage
V1-like pour INTERIOR, la régression s'est reproduite (INTERIOR V1
μ=7.624 → V2-C μ=4.859). Cela **invalide** l'hypothèse "word_target
V2-B.2 modulation seul responsable" et **renforce** l'hypothèse
directive_bloat ou side-effect du dispatcher variant=v2c sur
l'injection de directives, indépendamment du plan chunking.

**Conséquence** : le chemin critique devient l'ablation directive
(plan section 6) — interdit de produire un V2-D/V3 tant que la
cause causale INTERIOR n'est pas identifiée par ablation.

**Artefacts** :
- Bench V2-C : `packages/sovereign-engine/bench-ab-v1-v2c-results.json`
  SHA256 `DCC1A3EB4EB06605D09C9760351DEF752AD6E800C295406C9BACACAFC2F8896F`
- Verdict : `outputs/V2C_BENCH_VERDICT_v1.md`
  SHA256 `B2CF5FFBE4E1D762C1F25DB26846FF39B0D885913CC4583024618FD2258BD701`
- ADR amendement : `docs/DEC-20260417-004-V2B-ADAPTIVE-CHUNKING.md` POINT 18 quinquies


## Issue

Lors du bench V2-B.2 vs V1 (24 runs, Ollama qwen3:32b), les scènes
INTERIOR et CATHEDRAL régressent en composite score. L'autopsie
mathématique V2-B.2 (voir `outputs/autopsy-v2b2-interior-result.md`)
montre que les facteurs multiplicatifs `δ × (a_mean − 0.5)` et
`γ × silence_overlap` amputent mécaniquement `word_target` pour les
quartiles concernés. **Mais cette explication reste incomplète** :
l'écart observé en bench (prédiction −135 mots vs réalité +262 mots)
n'est pas fermé.

Hypothèse alternative non testée : la directive de silence elle-même
(via `pickPacingDirective(register, 'silence')`) serait toxique pour
les scènes INTERIOR/CATHEDRAL, **indépendamment** de `word_target`.
Elle injecterait des instructions stylistiques qui entrent en conflit
avec la prose introspective naturelle et poussent le LLM vers un mode
moins performant.

## Directive suspecte

Pour le registre `litteraire` (défaut en bench) :

> "prose ralentie, pauses ostensibles, syntaxe qui se raréfie, vide
>  tangible en fin de phrase"

Cette directive peut :

1. **Sur-contraindre** le LLM vers un registre minimaliste alors que
   INTERIOR/CATHEDRAL demandent de l'amplitude (phrases longues en
   volutes, feuilletage subordonné).
2. **Entrer en conflit** avec la directive `introspective` de quartiles
   non-silence de la même scène → prose incohérente, prompts
   sur-chargés, perte de signal.
3. **Pénaliser** des features CALC sur `f1_mean` (longueur phrase)
   qui baisse artificiellement dans les zones silence, fragilisant
   le composite Ridge V3.4.

## Évidence partielle

- Bench V2-B.2 INTERIOR : composite chute de `X` (V1) à `Y` (V2-B.2)
  sur 6 seeds. Pattern reproductible → cause déterministe, pas variance.
- Autopsy théorique : word_target V2-B.2 INTERIOR = [723, 665, 730, 747]
  vs V1 = [750, 750, 750, 750]. Dégradation word_target seule prédit
  un chute modeste ≈ 3-5% volume. Observé : beaucoup plus.
- **Écart non expliqué** : la directive de silence active sur Q1 et Q4
  (silence_overlap ≥ 0.5 → pacing_state='silence') pourrait être le
  facteur causal principal, pas le budget-mots.

## Plan d'investigation (non démarré)

1. **Bench d'ablation directive-only** (scope : INTERIOR + CATHEDRAL,
   3 seeds, OMEGA qwen3:32b) :
   - **Variant A** : V1 static + directives baseline partout.
   - **Variant B** : V1 static + directives adaptatives (silence activé).
   - **Variant C** : V2-B.2 + directives baseline partout.
   - **Variant D** : V2-B.2 full (baseline).
   - Delta(A vs B) = effet directive seule.
   - Delta(C vs D) = effet directive en contexte word_target modulé.
   - Delta(A vs C) = effet word_target seul.
2. Si `|Delta(A vs B)| ≥ 1.0` → directive_bloat confirmé comme facteur
   majeur → redesign pacing_directive ou désactivation conditionnelle.
3. Si `|Delta(A vs B)| < 0.5` → directive_bloat rejeté, cause résiduelle
   ailleurs (seam tokenization, variance LLM non bornée, ou biais
   scoring scène-dépendant déjà tracké par NCR_ACTION_BIAS).

## Lien avec V2-C (DEC-20260417-004 POINT 17)

- **V2-C** contourne le problème en routant INTERIOR/CATHEDRAL vers
  `buildStaticPlan` (qui force `pacing_state='baseline'` partout).
  Cela évite à la fois le bloat directive ET la modulation word_target.
- Si V2-C PASS les 4 gates du bench A.3 : le problème est
  contourné en production, mais la cause reste **non élucidée**.
  NCR_DIRECTIVE_BLOAT reste OPEN pour diagnostic causal futur.
- Si V2-C FAIL → rollback B+ → NCR_DIRECTIVE_BLOAT devient
  P1 (investigation immédiate pour décider si V2-B.2 peut être
  réhabilité avec directives ablatées).

## Non-décision explicite

- **NE PAS** désactiver `pickPacingDirective` globalement — la directive
  fonctionne sur ACTION/SENSORY en V2-B.2 (bench partiellement positif
  sur SENSORY).
- **NE PAS** modifier REGISTER_TABLE sans preuve empirique d'ablation.
- **NE PAS** assimiler NCR_DIRECTIVE_BLOAT à NCR_ACTION_BIAS (causes
  distinctes : l'un concerne les scènes silencieuses, l'autre les
  scènes d'action).

## Traçabilité

- Autopsy théorique : `outputs/autopsy-v2b2-interior-result.md` (SHA256 b84895ff)
- Bench V2-B.2 résultats : `packages/sovereign-engine/bench-ab-v1-v2b2-results.json`
- ADR V2-C POINT 17 : `docs/DEC-20260417-004-V2B-ADAPTIVE-CHUNKING.md`
- Fonction suspecte : `packages/sovereign-engine/src/generation/adaptive-chunker.ts`
  `pickPacingDirective` + `REGISTER_TABLE['litteraire']['silence']`
