# NCR-DIRECTIVE-BLOAT

**Opened**: 2026-04-17
**Severity**: HIGH (P1) — promu 2026-04-17 suite ROLLBACK B+ V2-C (G1 INTERIOR FAIL -2.752)
**Status**: OPEN — chemin critique, investigation ablation obligatoire avant tout nouveau variant chunker
**Owner**: Francky (investigation ablation directive_silence — plan section 6)

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
