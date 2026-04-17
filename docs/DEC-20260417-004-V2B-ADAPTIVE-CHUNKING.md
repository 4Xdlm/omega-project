# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DÉCISION ARCHITECTURALE (PROVISIONAL)
# DEC-20260417-004 : V2-B ADAPTIVE CHUNKING — INTÉGRATION + COEFFICIENTS TOP3
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date          : 2026-04-17
# Statut        : 🟡 PROVISIONAL_WINNER_V2B — NON SCELLÉE
#                  Promotion définitive (FROZEN SSOT) conditionnée au bench A/B P5.
# Autorité      : Francky (Architecte Suprême)
# Consensus     : Unanimité 3/3 IA (Claude + Gemini + ChatGPT) sur la shortlist top3
# Prérequis     : OMEGA V1 scellé (2026-04-13), CALC V3.4 scellé (ρ=0.6138)
# NCR référencés : NCR_GAMMA_INERT (LOW), NCR_ACTION_BIAS (MEDIUM)
#
# ═══════════════════════════════════════════════════════════════════════════════

## CONTEXTE — POURQUOI V2-B

OMEGA V1 utilise un chunking statique `4 × 750w` dans `generateChunkedDraft`.
Ce découpage est agnostique du contrat émotionnel : il ignore les zones de
silence, les pics d'arousal, les pivots Q-faille et la respiration de la
courbe de tension.

V2-B introduit un **chunker adaptatif** piloté par l'`EmotionContract` :

- `L_target(chunk_i)` = fonction de l'arousal local (coef α) et du silence
  local (coef γ).
- Redistribution des budgets-mots entre quartiles (coef β) selon la
  densité narrative souhaitée (pic / faille / silence).
- Modulation du budget total `W_target` (coef δ) selon l'intensité globale
  de la scène.

**Objectif** : aligner le rythme de génération sur la physique émotionnelle,
sans toucher à SCRIBE ni au scoring CALC scellé.

---

## CE QUI EST DÉCIDÉ

### POINT 1 — COEFFICIENTS RETENUS (top3 shortlist)

| Coefficient | Valeur | Rôle |
|-------------|--------|------|
| α (alpha) | **0.3** | Pente L_target / arousal local |
| β (beta)  | **0.3** | Poids redistribution inter-quartile |
| γ (gamma) | **0.2** | Stretch silence (voir NCR_GAMMA_INERT) |
| δ (delta) | **0.2** | Modulation budget total W_target |

Justification empirique (bench validate-shortlist, 60 runs : 3 configs × 4
scènes × 5 seeds, Qwen3:32b via Ollama) :

| config | score_moyen | pire_scène (μ) | σ_seed | verdict |
|--------|-------------|----------------|--------|---------|
| a0.7_b0.1_g0.2 | médian | -4.35 (ACTION) | 6.64 | REJETÉ (pire scène) |
| a0.3_b0.2_g0.2 | médian | -3.95 (ACTION) | 3.63 | REJETÉ (σ élevé) |
| **a0.3_b0.3_g0.2** | **best_worst** | **-1.81 (ACTION)** | **1.31** | **TOP3 RETENU** |

**Critère de sélection** (ordre strict, production-robust) :
1. `pire_scène` minimisée (worst-case robustness)
2. `σ_seed` minimisée (stabilité inter-seed)
3. `médiane` maximisée (qualité nominale)
4. `coût/temps` (tie-breaker)

Top3 gagne sur les 2 premiers critères. Le dommage ACTION résiduel (-1.81)
est documenté dans **NCR_ACTION_BIAS** et attribué à un biais scoring CALC
(pas au chunker).

### POINT 2 — ARCHITECTURE : DISPATCHER TRI-STATE

Feature flag `OMEGA_ADAPTIVE_CHUNKING` à 3 valeurs :

- `'0'` (default) → chemin legacy `4 × 750w`, aucun changement observable
- `'shadow'` → chemin legacy exécuté, `adaptive_plan` calculé et loggué en
  parallèle (non utilisé en génération). Permet observation sans risque.
- `'1'` → chemin adaptatif actif, le plan détermine la séquence de chunks.

**Fallback silencieux** : si `emotionContract` absent ou `computeAdaptivePlan`
lève une exception, retour legacy avec `adaptive_fallback_triggered=true`.

**Observabilité propagée même en mode '0'** :
- `result.adaptive_mode` (string)
- `result.adaptive_plan` (ChunkPlan[] | undefined)
- `result.adaptive_fallback_triggered` (boolean)

Logs de runtime (tagués `[V2-B]`) émis depuis `chunked-generator.ts`,
`engine.ts` et `duel-engine.ts`.

### POINT 3 — INJECTION PROMPT ADAPTATIF

La fonction `buildAdaptiveChunkPrompt` injecte par chunk :

- `archetype_rhythm` (issu de `ChunkPlan.pacing_state`)
- `pacing_instruction` (directive dérivée : action/introspective/silence/pivot/baseline)
- `chunk_budget` (objectif-mots adaptatif `ChunkPlan.word_target`)
- Position narrative (`position_pct`), quartile (`quartile`), pivot flag

Rhythm.ts et type_modifiers **NE SONT PAS MODIFIÉS** (NCR_ACTION_BIAS).
V2-B touche uniquement la séquence de chunks et le prompt par chunk —
pas le scoring, pas le SCRIBE, pas les personas.

### POINT 4 — γ MAINTENU À 0.2 MALGRÉ INERTIE

Le grid search (54 runs) a révélé que γ ∈ {0.1, 0.2, 0.3} produit des plans
identiques au mot près. γ est donc **inerte en pratique** dans l'implémentation
actuelle (cf. NCR_GAMMA_INERT pour la démonstration causale : γ est annulé
par la renormalisation post-redistribution dans `computeTargetLength`).

**Décision** : γ=0.2 maintenu comme **maintenance défensive**. Trois raisons :

1. Valeur centre-d'intervalle choisie par Francky, sans effet observable
   négatif.
2. Supprimer γ maintenant nécessiterait un refactor du modèle (3 coefs
   au lieu de 4) — risque de divergence avec shortlist documentée.
3. V2-C réactivera potentiellement γ (application post-redistribution
   ou modulation de `l_max` local). Garder la place du coefficient
   évite un breaking change futur.

### POINT 5 — NON-MODIFICATION DE SCORING

NCR_ACTION_BIAS (MEDIUM) documente un biais scoring CALC sur scènes ACTION
(couplage `f_subordination_depth` × `CV_sent` × `euphony` pénalisant le
staccato). Ce biais n'est **pas** adressé par V2-B.

**Règle explicite** :
- V2-B = intégration chunking adaptatif uniquement.
- V2-B NE MODIFIE PAS `rhythm.ts`, ni `type_modifiers`, ni le scoring Oracle.
- L'investigation ACTION est reportée à V2-C, avec mesure empirique préalable
  sur corpus FR ACTION pur.

Tordre V2-B pour compenser le biais ACTION serait une correction au mauvais
étage causal.

### POINT 6 — STATUT PROVISIONAL_WINNER_V2B

Cette décision est **PROVISIONAL**, pas SCELLÉE.

**Conditions de promotion SCELLÉE (FROZEN SSOT)** :

1. **P4 dry-run shadow** : pass (6/6 checks) sur `fr_interior_maison_enfance`,
   script `dryrun-v2b-shadow.ts`.
2. **Non-régression tests** : 2245 PASS sovereign-engine conservés (baseline
   V1 scellé 2026-04-13).
3. **P5 bench A/B** : V1 legacy vs V2-B adaptive, 4 scènes × 3 seeds × 2 modes
   = 24 runs Ollama. Décision selon critère strict :

   ```
   if (dWorst < -1.5)                         → REJECT (retour V1, V2-B archivé)
   else if (dWorst ≥ 0 ∧ dMedian ≥ 0 ∧ dSigma ≤ 0.5) → PROMOTE (V2-B SCELLÉ)
   else                                         → SHADOW_CONTINUE (V2-B shadow, itérer)
   ```

   où `dWorst = V2B.worst_scene − V1.worst_scene`, idem `dMedian`, `dSigma`.

4. **Pas de régression observabilité** : logs `[V2-B]` émis dans tous les
   chemins (engine, duel, chunked-generator).

**Tant que ces 4 conditions ne sont pas satisfaites** : V2-B reste en
`shadow` par défaut, V1 reste le chemin de production.

---

## CE QUI N'EST PAS DÉCIDÉ (reports V2-C)

1. **γ actif** — soit reformulation computeTargetLength (γ post-redistribution),
   soit suppression (3 coefs α, β, δ). Arbitrage à l'issue V2-C.
2. **scene-aware scoring** — correction du biais ACTION via modulateur par
   archétype. Spec `scene-aware-scoring-v1.md` à rédiger en V2-C.
3. **Intégration embeddings** — pilotage plus fin du plan via similarité
   sémantique inter-chunks. Hors scope V2-B.
4. **Early-exit par chunk** — terminaison anticipée si CALC local confirme
   convergence. Hors scope V2-B.

---

## TRAÇABILITÉ

### Modules créés/modifiés V2-B

- `packages/sovereign-engine/src/generation/adaptive-chunker.ts` (créé)
- `packages/sovereign-engine/src/generation/chunked-generator.ts` (AdaptiveChunker branch + observabilité propagée)
- `packages/sovereign-engine/src/engine.ts` (emotionContract passé + log `[V2-B][engine]`)
- `packages/sovereign-engine/src/duel/duel-engine.ts` (emotionContract propagé K2 + log `[V2-B][duel]`)
- `packages/sovereign-engine/tests/generation/chunked-generator-v2b.test.ts` (créé, 8 describe blocks)
- `packages/sovereign-engine/scripts/dryrun-v2b-shadow.ts` (créé, P4)
- `packages/sovereign-engine/scripts/bench-ab-v1-v2b.ts` (créé, P5)

### Artefacts de décision

- Grid search initial : `packages/sovereign-engine/grid-search-results.json`
- Bench shortlist (découverte top3) : `packages/sovereign-engine/validate-shortlist-results.json`
- Rapport shortlist : `packages/sovereign-engine/validate-shortlist-results-report.md`
- Consensus 3-IA : Claude + Gemini + ChatGPT, 2026-04-17, top3 = PROVISIONAL_WINNER_V2B

### NCR liés

- `nexus/proof/NCR_GAMMA_INERT.md` — γ inerte, maintenance défensive γ=0.2
- `nexus/proof/NCR_ACTION_BIAS.md` — biais scoring ACTION, report V2-C
- `nexus/proof/NCR_SEAL_V2B_DUEL_ENGINE.md` — seal Phase S rompu sur duel-engine.ts (autorisé Francky Option A, 2026-04-17)

### Seal Phase S impact (ajout 2026-04-17)

L'intégration V2-B modifie `packages/sovereign-engine/src/duel/duel-engine.ts`
pour propager `emotion_contract` dans la branche K2 duel (ligne 152). Ce
fichier figurant dans le registre scellé `proofpack/phase-s-sealed/HASHES.sha256`
(ligne 8), le test `T08: sealed pipeline source unchanged [INV-VAL-05]`
échouait.

**Décision** (Francky, 2026-04-17, Option A) :
- Rehash `duel-engine.ts` dans le registre : `f075ee3a...` → `4f11ea54...`
- NCR_SEAL_V2B_DUEL_ENGINE ouverte et acceptée
- Modifications limitées : 6 lignes effectives (propagation emotion_contract +
  log `[V2-B][duel]`), zéro refactor de la boucle duel, zéro breaking pour
  callers existants

**Impact** : seal Phase S V1 (commit `0c3cbc48`, 2026-04-13) reste préservé
dans le git log. Le registre HASHES.sha256 devient un seal "vivant" post-V1,
reflétant l'état courant des fichiers sous invariant.

Rollback plan (si verdict P5 = REJECT) : revert `duel-engine.ts` au hash V1 +
restaurer l'ancienne ligne dans HASHES.sha256. NCR amendée en conséquence.

### Décisions antérieures référencées

- `docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md` — doctrine "CALC ≠ coach"
  (V2-B respecte : chunker ne reçoit aucun feedback CALC, CALC reste un
  douanier sur la prose générée)
- V1 SEAL 2026-04-13 (commit `0c3cbc48`) — baseline 2245 tests

---

## EXIGENCE PHYSIQUE (satisfaire avant promotion SCELLÉ)

### Pourquoi ça marche (mécanisme)

- α redistribue L_target vers les pics d'arousal → la prose "respire plus
  fort" dans les moments intenses.
- β redistribue le budget-mots inter-quartile → les quartiles porteurs de
  pivot (faille, pic) reçoivent plus de volume.
- δ modulent W_target selon l'intensité globale → scène plate = moins de
  volume, scène dense = plus de volume.
- La séquence de chunks suit la physique émotionnelle au lieu de la contredire.

### Dans quelles conditions ça échoue (limites)

- **Contract malformé** : `curve_quartiles` vide ou `silence_zones` incohérent
  → fallback legacy silencieux, loggué `adaptive_fallback_triggered=true`.
- **Scène ACTION pure** : le biais scoring CALC pénalise la prose d'action
  même si le chunking est correct. Dommage résiduel -1.81 observé. Non
  adressé par V2-B.
- **LLM hors-distribution** : si le modèle ignore `pacing_instruction` (petits
  modèles, prompts tronqués), V2-B se comporte comme V1 sans gain.
- **γ inerte** : n'apporte rien tant que V2-C n'est pas livré.

### Qu'est-ce qui pourrait casser (risques)

- **Régression silencieuse** : `emotionContract` mal propagé depuis un caller
  tiers → fallback legacy. Log `[V2-B]` absent = signal à surveiller.
- **Déséquilibre volumique** : si `word_target` d'un chunk explose (>1500w),
  le LLM peut tronquer. Clamp `[l_min, l_max]` doit rester actif.
- **Prompt bloating** : `buildAdaptiveChunkPrompt` ajoute des directives ;
  risque de saturation fenêtre context. À surveiller si chunks > 6.
- **Divergence shortlist / runtime** : si runtime lit les coefs depuis
  env vars (`OMEGA_ADAPTIVE_ALPHA` etc.) et ces vars ne sont pas settées
  en prod, fallback aux DEFAULTS. DEFAULTS doivent **coïncider** avec
  α=0.3, β=0.3, γ=0.2, δ=0.2.

---

## SIGNATURES ET AUTORITÉ

- **Architecte** : Francky — autorité finale, décision top3 validée 2026-04-17.
- **IA Principal** : Claude Code — intégration et documentation.
- **Validation consensus** : Claude + Gemini + ChatGPT (unanimité shortlist top3).
- **Scellé conditionnel** : OUI si P5 bench A/B ≥ PROMOTE ; NON sinon.

---

**Rappel NASA-Grade L4** : cette ADR est un artefact de traçabilité. Toute
promotion SCELLÉE nécessite evidence pack (logs bench, hashes, rapport).
Tant que statut = PROVISIONAL_WINNER_V2B, V1 reste source de vérité production.

---

## AMENDEMENT 2026-04-17 — BENCH P5 RÉSULTATS + TRANSITION V2-B.2

### Résultat bench A/B P5 (24 runs Ollama qwen3:32b)

Bench exécuté après livraison P0→P5 avec coefficients top3 (α=0.3, β=0.3,
γ=0.2, δ=0.2). 4 scènes × 3 seeds × 2 modes (V1 legacy vs V2-B adaptatif).

**Verdict : SHADOW_CONTINUE** (ni REJECT, ni PROMOTE).

| Métrique | V1 | V2-B | Δ |
|----------|-----|------|----|
| `mean`   | (baseline) | −0.774 pts | régression |
| `median` | (baseline) | +0.909 pts | gain |
| `worst_scene` | (baseline) | −1.033 pts | régression (sous seuil REJECT −1.5) |
| `σ_seed` | (baseline) | +0.954 | instabilité accrue |
| `calls`  | (baseline) | +56.3 % | surcoût compute |

**Passage des seuils** :
- `dWorst = -1.033` > `-1.5` (seuil REJECT) → pas de REJECT.
- `dWorst = -1.033` < `0` (seuil PROMOTE) → pas de PROMOTE.
- Verdict middle-case → SHADOW_CONTINUE.

### Per-scène (gain/perte V2-B vs V1)

| Scène       | Δ score V2-B−V1 | Analyse |
|-------------|------------------|---------|
| INTERIOR    | **−2.95**        | pire régression : excès de seams détruit la continuité contemplative |
| CATHEDRAL   | **−1.81**        | perte sur architecture lente (même diagnostic : trop de jonctions) |
| ACTION      | **−1.04**        | perte modérée, confirme NCR_ACTION_BIAS (non-corrigé par V2-B) |
| SENSORY     | **+2.70**        | seul gain : V2-B réussit sur scènes sensorielles (arousal variable) |

### Diagnostic causal (hypothèse seam noise)

V1 produit systématiquement **N=4 chunks** → **3 jonctions inter-chunks**.

V2-B top3 produit **N=6 à N=7 chunks** (via `ceil(w_q / l_target)` +
pivots pic/faille en chunk supplémentaire) → **5 à 6 jonctions**.

**Mécanisme** : chaque jonction est un point de reprise où le LLM doit
resynchroniser sur les 200 derniers mots. Plus de jonctions = plus de
risque de discontinuité lexicale, rythmique, et sémantique. Le scoring
CALC (Ridge V3.4, features f33c/f24c/f1a en particulier) pénalise les
sauts de registre et les redondances trigrammes inter-chunks.

**Conclusion causale** : V2-B modulait correctement le volume et le
pacing par quartile, mais l'**augmentation du nombre de chunks** a coûté
plus que le gain apporté par la modulation. 1 quartile ≠ 1-3 chunks —
c'est 1 quartile = 1 chunk qui préserve la résilience du modèle.

Le seul archétype où V2-B top3 gagne (SENSORY, +2.70) est celui où la
modulation de volume + pacing compense l'excès de seams, car la prose
sensorielle est intrinsèquement plus fragmentée et supporte mieux les
reprises.

### Consensus 3-IA post-bench (2026-04-17)

- **Gemini** : V2-B.1 avec MIN_CHUNK_SIZE=400 + MAX_CHUNKS=5 + override
  CATHEDRAL/INTERIOR (α=0.1, β=0.1). Vote : patch, garde dynamic N.
- **ChatGPT #1** : FREEZE V2-B en shadow, pivot vers NCR_ACTION_BIAS.
  Vote : refuse promotion, traite symptôme ailleurs.
- **ChatGPT #2** : V2-B.2 avec **N=4 fixe** (1 quartile = 1 chunk),
  modulation α/β sur word_target uniquement. Vote : refonte principielle.

**Majorité** : Gemini + ChatGPT #2 (2/3) convergent sur une refonte qui
réduit le nombre de chunks. ChatGPT #2 va le plus loin avec un principe
architectural clair (N=4 = nombre de quartiles). Francky autorise via
« retour IA lis les croise et attaque a faire tous ».

### POINT 7 — V2-B.2 ARCHITECTURE RETENUE (2026-04-17, post-bench)

**Principe fondateur** : **1 quartile narratif = 1 chunk de génération**.

La richesse physique de V2-B (modulation arousal/silence/pivot par
quartile) est préservée **mais injectée dans la taille et le pacing
d'un chunk unique par quartile**, pas dans le nombre de chunks.

**Formulation mathématique V2-B.2** :

```
Pour i ∈ {0, 1, 2, 3} (i.e. Q1..Q4):
  a_i            = curve_quartiles[i].arousal
  silence_i      = overlapWithSilenceZones(q_i.start, q_i.end, silence_zones)
  is_pivot_i     = ∃ pivot ∈ {pic, faille} : pivot ∈ [q_i.start, q_i.end)
  state_i        = derivePacingState(a_i, silence_i, is_pivot_i)

w_total          = W_REF × (1 + δ × (a_mean − 0.5))           // δ modulation
q_weights[i]     = (1 + β × (a_i − 0.5)) / Σ_j(1 + β × (a_j − 0.5))  // β
alpha_factor[i]  = 1 + α × (a_i − 0.5)                         // α intra
gamma_factor[i]  = 1 + γ × silence_i                           // γ silence

raw_target[i]    = w_total × q_weights[i] × alpha_factor[i] × gamma_factor[i]
word_target[i]   = clamp(raw_target[i] × w_total/Σraw, l_min, l_max)

plan.length      = 4 STRICT (hard constraint)
plan[i].quartile = Q(i+1)
plan[i].pacing_state     = state_i  // action/introspective/silence/pivot/baseline
plan[i].pacing_directive = pickPacingDirective(register, state_i)
```

**Invariants V2-B.2** :
- `plans.length === 4` **toujours** (hard constraint, pas de fallback à 3 ou > 4).
- 1 quartile = 1 chunk, mapping `chunk_i ↔ quartile_i` strict.
- α, β, γ, δ modulent **uniquement** `word_target` (volume).
- `pacing_state` détermine la directive de prompt, jamais un chunk supplémentaire.
- Pivots (pic, faille) modifient `pacing_state` du quartile hôte, n'ajoutent pas de chunk.
- Seams inter-chunk : **3** (comme V1) → préservation de la résilience CALC.

### POINT 8 — SORT DE V2-B (ex-top3) — ARCHIVÉ

- V2-B (α=0.3, β=0.3, γ=0.2, δ=0.2 avec N dynamique) = **NON PROMU**.
- Statut bench P5 : SHADOW_CONTINUE sur `dWorst=-1.033`, `dSigma=+0.954`.
- Raison causale : excès de seams inter-chunks (N=6-7 vs N=4 V1).
- Code conservé dans `planAdaptiveChunking` (adaptive-chunker.ts) pour
  reproduction scientifique du bench P5 via `OMEGA_ADAPTIVE_VARIANT=v2b1`.
- **Défaut runtime V2-B.2** : `OMEGA_ADAPTIVE_VARIANT` absent → 'v2b2' (nouveau).

### POINT 9 — CRITÈRES DE PROMOTION V2-B.2 (stricts, ChatGPT #2)

Après bench A/B V2-B.2 vs V1 (mêmes 4 scènes × 3 seeds), promotion SCELLÉE
uniquement si **TOUTES** les conditions suivantes sont satisfaites :

1. `worst_scene(V2B2) ≥ worst_scene(V1)` (pas de pire pire-scène).
2. `σ_seed(V2B2) ≤ σ_seed(V1)` (pas d'instabilité accrue).
3. `mean(V2B2) ≥ mean(V1)` (pas de régression globale).
4. `median(V2B2) ≥ median(V1)` (pas de régression médiane).
5. `calls(V2B2) raisonnable` (≤ +10 % vs V1, car N fixe = pas de surcoût structurel).

Tout **critère en échec** → FAIL → Option 3 rollback (revert duel-engine.ts
au hash V1, restaurer HASHES.sha256 ligne 8, archiver V2-B/V2-B.2).

Tout **critère en succès** → PROMOTE → ADR DEC-20260417-004 passe de
🟡 PROVISIONAL à 🟢 SCELLÉE, seal Phase S déjà mis à jour (NCR fermée).

### POINT 10 — IMPACT NCR

- **NCR_GAMMA_INERT** : inchangé. V2-B.2 active γ via `gamma_factor[i]`
  sur `word_target` — γ devient **potentiellement actif**. À observer dans
  bench V2-B.2 : si `σ_seed` diffère entre γ=0 et γ=0.2, γ est reconnu
  actif et NCR_GAMMA_INERT peut être amendé.
- **NCR_ACTION_BIAS** : inchangé. V2-B.2 ne touche toujours pas rhythm.ts
  ni scoring. Le biais ACTION persistera même en V2-B.2.
- **NCR_SEAL_V2B_DUEL_ENGINE** : inchangé. Conditions de fermeture
  maintenues, rollback duel-engine.ts préparé si V2-B.2 FAIL.

═══════════════════════════════════════════════════════════════════════════════
FIN DEC-20260417-004 (amendé 2026-04-17, Bench P5 + transition V2-B.2)
═══════════════════════════════════════════════════════════════════════════════

---

## AMENDEMENT 2026-04-17 (bis) — BENCH V2-B.2 RÉSULTATS + SHADOW_CONTINUE

### POINT 11 — BENCH A/B V2-B.2 vs V1 (24 runs Ollama qwen3:32b)

Bench exécuté avec `OMEGA_ADAPTIVE_VARIANT=v2b2`, coefficients top3
(α=0.3, β=0.3, γ=0.2, δ=0.2), 4 scènes × 3 seeds × 2 modes = 24 runs.
Résultats bruts : `packages/sovereign-engine/bench-ab-v1-v2b2-results.json`.

**Verdict automatique : 🟡 SHADOW_CONTINUE** (PROMOTE refusé, REJECT non atteint).

#### Métriques globales

| Métrique  | V1 (legacy) | V2-B.2 | Δ (V2B2 − V1) | Critère strict POINT 9 | Passage |
|-----------|-------------|--------|---------------|------------------------|---------|
| pire scène (moyenne) | 0.856 (ACTION) | 0.882 (ACTION) | **+0.026** | ≥ 0 | ✅ PASS |
| σ_seed moyen | 1.120 | 1.099 | **−0.021** | ≤ 0 | ✅ PASS |
| médiane globale | 2.383 | 1.609 | **−0.774** | ≥ 0 | ❌ FAIL |
| moyenne globale | 3.206 | 2.215 | **−0.991** | ≥ 0 | ❌ FAIL |
| calls Ollama totaux | 48 | 48 | **0** | ≤ +10 % | ✅ PASS |

**Règle POINT 9** : TOUTES les conditions doivent passer → promotion
uniquement si unanimité. 2/5 FAIL (médiane + moyenne) → refus PROMOTE.
`dWorst = +0.026 > −1.5` → pas de REJECT direct.
→ **Middle-case = SHADOW_CONTINUE** (V2-B.2 reste disponible via flag,
V1 reste production).

#### Per-scène (moyenne score × 3 seeds, ± σ)

| Scène     | V1 μ ± σ      | V2-B.2 μ ± σ   | Δμ      | Δσ      | Lecture |
|-----------|---------------|----------------|---------|---------|---------|
| ACTION    | 0.856 ± 1.252 | 0.882 ± 0.643  | **+0.026** | **−0.609** | quasi-neutre, stabilisation bienvenue (σ ÷ 2) |
| INTERIOR  | 7.624 ± 0.436 | 2.171 ± 1.649  | **−5.453** | **+1.213** | **crash + instabilité accrue** |
| SENSORY   | 2.209 ± 1.513 | 4.497 ± 0.870  | **+2.288** | **−0.643** | gain net + stabilisation |
| CATHEDRAL | 2.136 ± 1.278 | 1.307 ± 1.236  | **−0.829** | −0.042  | dégradation modérée, σ ≈ inchangé |

Invariant N=4 confirmé en production : tous les 24 runs ont exactement
4 chunks, `plan_summary` différent entre scènes (ex. ACTION :
`713w[b],820w*[p],843w*[p],752w[s]`, INTERIOR : `746w[s],685w[b],757w*[p],723w*[p]`).

#### Volumétrie générée (total_words)

| Scène     | V1 moyenne | V2-B.2 moyenne | Δ mots | Commentaire |
|-----------|------------|----------------|--------|-------------|
| ACTION    | 2253       | 2355           | +102   | +4.5 %, ordre de grandeur similaire |
| INTERIOR  | 2352       | 2614           | **+262** | +11.1 %, **inflation suspecte** |
| SENSORY   | 2648       | 2338           | −310   | −11.7 %, compression |
| CATHEDRAL | 2341       | 2338           | −3     | neutre |

Note INTERIOR : V2-B.2 génère **11 % de mots en plus** que V1 pour
obtenir un score 3.5× plus bas. Corrélation inverse volume / qualité
sur cet archétype = signal fort de directives parasites (Qwen3 sur-remplit
quand on lui dicte `silence` puis `pivot`).

### POINT 12 — DIAGNOSTIC CAUSAL (hypothèse à valider par autopsie)

#### Mécanique suspectée : cannibalisation budgétaire

Le contrat `fr_interior_maison_enfance` a des `silence_zones` couvrant
**Q1 (0.0–0.2) et Q4 (0.7–1.0)** (zones contemplatives d'ouverture et
de clôture). En V2-B.2 :

```
gamma_factor[i] = 1 + γ × silence_overlap_i   (γ=0.2)

Pour INTERIOR :
  silence_overlap(Q1) ≈ 1.0  → gamma_factor[0] ≈ 1.20
  silence_overlap(Q2) ≈ 0.0  → gamma_factor[1] = 1.00
  silence_overlap(Q3) ≈ 0.0  → gamma_factor[2] = 1.00
  silence_overlap(Q4) ≈ 1.0  → gamma_factor[3] ≈ 1.20
```

Puis `raw_target[i] = w_total × q_weights[i] × alpha_factor[i] × gamma_factor[i]`,
suivi de **renormalisation** `scale = w_total / Σraw` pour respecter
le budget total `w_total`.

**Conséquence mathématique** : la renormalisation est un **jeu à somme
nulle**. Si γ gonfle Q1 et Q4 de ~20 %, le scale factor divise tout
par ~1.10, donc :
- Q1 : ×1.20 × 0.91 ≈ ×1.09 (gain net ~+9 %)
- Q2 : ×1.00 × 0.91 ≈ ×0.91 (**perte ~−9 %**)
- Q3 : ×1.00 × 0.91 ≈ ×0.91 (**perte ~−9 %**)
- Q4 : ×1.20 × 0.91 ≈ ×1.09 (gain net ~+9 %)

**Effet sur INTERIOR** : Q2/Q3 = montée émotionnelle + climax de
l'introspection. Les amputer de ~9 % × baseline 750w ≈ −65w par
quartile central impacte directement la densité narrative que CALC
récompense (f33c, f24c, f1a).

Observation corroborante : `plan_summary` INTERIOR V2-B.2 =
`746w[s],685w[b],757w*[p],723w*[p]` → Q2 = **685w** (−65w vs baseline
750w, conforme au calcul). Q1 et Q4 gonflés par le silence.

#### Mécanique suspectée #2 : injection de directives `silence`/`pivot` sur scène contemplative

En V1, Qwen3 reçoit 4 prompts identiques (4×750w baseline, aucune
directive de pacing). La prose évolue organiquement sur 3000 mots de
contemplation fluide.

En V2-B.2 INTERIOR, Qwen3 reçoit `pacing_state: silence` (Q1/Q2) +
`pacing_state: pivot*` (Q3/Q4). La directive `silence` pousse le modèle
à **sur-souligner** les temps morts (prose explicite sur l'absence de
son, l'immobilité, etc.), ce qui sur scène INTERIOR = redondance verbeuse,
et sur CALC = pénalité f24c (redondance trigramme) + f1a (euphonie).

Observation corroborante : `total_words` INTERIOR V2-B.2 = 2735 / 2832 /
2274 (moyenne 2614) vs V1 = 2341 / 2400 / 2314 (moyenne 2352). Soit
**+262 mots générés pour un score 3.5× plus bas**. Qwen3 sur-explique
le silence = prose diluée.

#### Pourquoi SENSORY gagne

Sur `fr_sensory_cuisine_nuit`, `silence_zones` vides ou faibles, arousal
variable (montées et descentes). γ inerte ou faible, α redistribue
utilement vers les pics. Directive `pivot` sur un quartile sensoriel
aide le modèle à matérialiser des sensations tactiles / olfactives
intenses → gain +2.29 confirmé.

### POINT 13 — OPTIONS OUVERTES (décision Francky requise)

Trois voies validées par consensus IA. Chacune a un coût de rework et
un gain attendu différent :

#### Option A — V2-C hybride "routage archétypal" (Gemini #1 + ChatGPT validation implicite partielle)

**Spec** : dans `engine.ts`, router `OMEGA_ADAPTIVE_CHUNKING` par archétype :
- `INTERIOR`, `CATHEDRAL` → moteur V1 statique (4×750w, zéro directive pacing)
- `ACTION`, `SENSORY`, `BRUTAL`, `SOCIETAL` → moteur V2-B.2 adaptatif

**Mécanisme attendu** : préserver les plafonds V1 sur contemplation
(+7.62 INTERIOR) et capturer le gain V2-B.2 sur sensoriel (+2.29).

**Risque** : introduit une dépendance dure au `detectedArchetype` dans
le pipeline de génération. Si la détection d'archétype est erronée
(INTERIOR classé SENSORY), on retombe sur la régression.

**Coût** : ~1 jour de refactor engine.ts + 1 bench A/B/C (V1 vs V2-B.2
unifié vs V2-B.2 routé).

#### Option B — Rollback V2-B.2 + pivot NCR_ACTION_BIAS (ChatGPT #2)

**Spec** : V2-B.2 et V2-B.1 passent en archive expérimentale. Code
conservé dans le repo (reproductibilité scientifique) mais `OMEGA_ADAPTIVE_CHUNKING`
default = `'0'`. Pivot immédiat vers NCR_ACTION_BIAS (correction du
biais scoring CALC sur staccato).

**Mécanisme attendu** : le plafond INTERIOR V1 est structurellement
intouchable par le chunking. Le vrai plafond OMEGA reste bloqué par
le biais ACTION (−2 à −4 points sur cet archétype). Travailler là où
le gain est possible plutôt que s'acharner sur un moteur qui ne
surperforme pas.

**Risque** : abandon d'un signal réel (+2.29 SENSORY). Si NCR_ACTION_BIAS
est aussi un cul-de-sac, on a perdu du temps.

**Coût** : ~2h (archive + flag switch) + 3-5 jours NCR_ACTION_BIAS.

#### Option C — V2-B.3 itération fine (ChatGPT interdit, Gemini non-prioritaire)

**Spec** : tuning γ (γ=0.2 → γ=0.1 ou γ=0.0 sur INTERIOR/CATHEDRAL)
ou conditionner γ au `detectedArchetype`.

**Mécanisme attendu** : atténuer la cannibalisation Q2/Q3 sans casser
le gain SENSORY.

**Risque** : rapprochement cosmétique, violation de la règle dure
"toute future feature CALC doit prouver un MÉCANISME NOUVEAU, pas juste
une feature de plus". Itération sans nouveau levier causal.

**Coût** : ~1 jour + 1 bench A/B (24 runs). **ChatGPT le déconseille
explicitement.**

### POINT 14 — ACTIONS IMMÉDIATES EXÉCUTÉES

1. **POINT 11 + 12 + 13 documentés dans cette ADR** (présent amendement).
2. **log_quality.md** amendé avec entrée bench V2-B.2 SHADOW_CONTINUE.
3. **Autopsy script** créé : `scripts/autopsy-v2b2-interior-word-target.ts`
   log comparatif V1/V2-B.1/V2-B.2 des `word_target` par quartile sur
   `fr_interior_maison_enfance` (pure analyse CALC, zéro Ollama).
4. **Aucune modification de code production** : `OMEGA_ADAPTIVE_CHUNKING`
   default reste `'0'`, engine.ts inchangé, V1 reste SSOT production.

### POINT 15 — DÉCISION EN ATTENTE

Options A / B / C : **Francky tranche**.
Jusqu'à décision explicite, V2-B.2 reste en SHADOW_CONTINUE, accessible
via `OMEGA_ADAPTIVE_CHUNKING='1' + OMEGA_ADAPTIVE_VARIANT='v2b2'` pour
reproductibilité scientifique, mais jamais active en production par
défaut.

### POINT 16 — IMPACT NCR (mise à jour)

- **NCR_GAMMA_INERT** : ✅ **γ confirmé ACTIF** en V2-B.2. σ_seed
  diffère entre scènes avec/sans silence_zones. Candidat à fermeture
  après autopsy INTERIOR.
- **NCR_ACTION_BIAS** : ✅ **confirmé hors scope chunker**. ACTION
  reste plafonnée à 0.88 en V1 comme en V2-B.2. Si Option B retenue,
  NCR_ACTION_BIAS devient P0.
- **NCR_SEAL_V2B_DUEL_ENGINE** : statut inchangé. Fermeture pendante
  sur décision Options A/B/C.

═══════════════════════════════════════════════════════════════════════════════
FIN DEC-20260417-004 — Amendé 2026-04-17 (ter) — Bench V2-B.2 SHADOW_CONTINUE
═══════════════════════════════════════════════════════════════════════════════

---

## AMENDEMENT 2026-04-17 (quater) — PLAN A→B+ : V2-C ROUTER ARCHÉTYPAL

**Contexte** :

- Autopsy V2-B.2 INTERIOR (Étape 2 Option a) : hypothèse de cannibalisation
  word_target **REFUSÉE en valeurs absolues** (Q1=723, Q2=665, Q3=730, Q4=747,
  tous < V1=750), **CONFIRMÉE en composite multiplicatif** (δ tire w_total
  à 2865 pour a_mean=0.275, et α×γ[i] compresse Q2=0.940). Silence zones
  actives Q1+Q4 (γ=0.2) sur-pondèrent les bornes, creusant Q2.
- Consultations IA :
  - Gemini → Option B (rollback pur) + 2 NCRs (DIRECTIVE_BLOAT, ACTION_BIAS).
  - ChatGPT → Option A (V2-C spécialisation archétypale) avec gates stricts.
- Arbitrage Francky : **A puis B+** — tester V2-C avec gates ex-ante scellés,
  fallback automatique sur rollback si gates FAIL.

**Rationnel** :

V2-B.2 échoue sur INTERIOR/CATHEDRAL parce que la formulation
`w_total × (α×γ[i])` pénalise les scènes à arousal bas + silence élevé.
V2-C résout le problème en dispatchant par **archétype émotionnel** :
les scènes qui bénéficient de l'adaptatif (SENSORY) restent adaptatives,
les scènes qui régressent (INTERIOR, CATHEDRAL) basculent sur V1 static,
ACTION reste sous NCR séparé (cap plafond hors scope chunker).

**Prod default reste V1** pendant toute la phase V2-C (feature flag
`OMEGA_ADAPTIVE_CHUNKING='0'` en prod). Aucun risque régression runtime.

---

### POINT 17 — GATES V2-C EX-ANTE SCELLÉS (interdits de modification post-hoc)

Les gates suivants sont scellés **AVANT** toute exécution de bench.
Toute modification post-hoc (assouplir seuil, exclure scène, re-seeder)
= p-hacking explicite → verdict **FAIL automatique**.

**Méthodologie de comparaison** :

- Baseline : V1 static (mêmes scènes, mêmes seeds, mêmes provider Ollama
  qwen3:32b).
- Candidat : V2-C router archétypal (détection automatique par
  `detectArchetype(contract)`).
- N = 24 runs (4 scènes × 3 seeds × 2 modes V1+V2C) — identique bench P5.
- Seeds = 42, 1337, 2024 (fixes, reproductibles).
- Composite score moyen + worst-seed par scène.

**Critères de promotion V2-C** :

| # | Gate | Seuil | Rationnel |
|---|------|-------|-----------|
| 1 | INTERIOR worst ≥ V1_worst − 1.5 | crash réparé | V2-B.2 worst chutait à −3.4 |
| 2 | CATHEDRAL worst ≥ V1_worst − 1.5 | pas de nouvelle régression | archétype similaire à INTERIOR |
| 3 | SENSORY mean ≥ V1_mean + 1.5 | gain réel confirmé | la scène qui justifie V2-C |
| 4 | Σ global mean ≥ V1_mean − 0.5 | neutralité globale | pas de dégradation agrégée |
| 5 | ACTION | no constraint | hors scope chunker (NCR_ACTION_BIAS) |

**Verdict** :

- **4/4 gates PASS** → V2-C promu, `OMEGA_ADAPTIVE_VARIANT='v2c'` devient
  default, NCR_SENSORY_SIGNAL fermé.
- **< 4/4 gates PASS** → V2-C rejeté, fallback automatique **B+** :
  rollback `OMEGA_ADAPTIVE_CHUNKING='0'` default, V2-B.2 code conservé en
  shadow pour tests, ouverture NCR_ADAPTIVE_CHUNKING_UNRESOLVED.

**Seuils anti-p-hacking** :

- Aucune re-exécution partielle autorisée (pas de "re-roll une scène").
- Bench complet rejoué intégralement ou rejeté.
- Résultats bruts archivés SHA256 avant verdict.
- Rapport verdict signé avec horodatage + hash résultats.

**Architecture router V2-C (gel design)** :

```ts
type Archetype = 'ACTION' | 'INTERIOR' | 'SENSORY' | 'CATHEDRAL';

function detectArchetype(contract: EmotionContract): Archetype {
  const a_mean = mean(contract.arousal);
  const silence_total = sumSilenceOverlap(contract);
  const var_arousal = variance(contract.arousal);

  if (a_mean >= 0.65 && silence_total < 0.2) return 'ACTION';
  if (a_mean <= 0.35 && silence_total >= 1.5) return 'INTERIOR';
  if (silence_total >= 1.0 && a_mean >= 0.35 && a_mean < 0.60) return 'CATHEDRAL';
  return 'SENSORY'; // default : modéré, partial silence
}

function planV2CArchetypal(contract, config): ChunkPlan {
  const arch = detectArchetype(contract);
  switch (arch) {
    case 'SENSORY': return planAdaptiveChunkingV2B2(contract, config);
    case 'ACTION':  return planAdaptiveChunkingV2B2(contract, config); // NCR séparé
    case 'INTERIOR':
    case 'CATHEDRAL':
      return buildStaticPlan(contract, config.W_REF); // fallback V1
  }
}
```

**Feature flag** :

- `OMEGA_ADAPTIVE_VARIANT='v2c'` → active le router archétypal.
- Les variants `'v2b1'` et `'v2b2'` restent disponibles pour reproductibilité.
- Default prod : `OMEGA_ADAPTIVE_CHUNKING='0'` (V1 static).

**Traçabilité** :

- Log par scène : `{archetype, plan_source, gates_eval}` dans evidence.
- Hash SHA256 résultats bench avant verdict.
- Verdict archivé dans `outputs/V2C_BENCH_VERDICT_v1.md`.

═══════════════════════════════════════════════════════════════════════════════

## AMENDEMENT 2026-04-17 (quinquies) — POINT 18 : ROLLBACK B+ APPLIQUÉ

### Contexte

Plan A→B+ (POINT 17) exécuté en autonomie. Bench V2-C 24 runs Ollama
qwen3:32b, 3 seeds × 4 scènes × 2 modes (legacy V1 / v2c router).
Verdict évalué ex-post avec les gates scellés ex-ante (POINT 17).

### Résultat bench V2-C

**Statut** : FAIL — 3/4 gates PASS (G1_INTERIOR_WORST a échoué).

**Agrégats par archétype** :

| Archétype | Mode | n | μ | min | σ |
|-----------|------|---|---|-----|---|
| ACTION | V1 (legacy) | 3 | 0.855 | -0.721 | 1.533 |
| ACTION | V2-C | 3 | 0.882 | 0.305 | 0.788 |
| INTERIOR | V1 (legacy) | 3 | 7.624 | 7.016 | 0.533 |
| INTERIOR | V2-C | 3 | 4.859 | 4.265 | 0.617 |
| SENSORY | V1 (legacy) | 3 | 2.209 | 0.271 | 1.853 |
| SENSORY | V2-C | 3 | 4.497 | 3.577 | 1.066 |
| CATHEDRAL | V1 (legacy) | 3 | 2.137 | 0.466 | 1.565 |
| CATHEDRAL | V2-C | 3 | 1.629 | 0.632 | 0.987 |

Global V1 μ = 3.206 ; Global V2-C μ = 2.967 (Δ=-0.240).

**Gates POINT 17 (résultats)** :

| # | Gate | V1 | V2-C | Seuil | Δ | Verdict |
|---|------|----|----- |-------|---|---------|
| G1 | INTERIOR worst ≥ V1-1.5 | 7.016 | 4.265 | 5.516 | **-2.752** | ❌ FAIL |
| G2 | CATHEDRAL worst ≥ V1-1.5 | 0.466 | 0.632 | -1.034 | +0.166 | ✅ PASS |
| G3 | SENSORY mean ≥ V1+1.5 | 2.209 | 4.497 | 3.709 | +2.288 | ✅ PASS |
| G4 | GLOBAL mean ≥ V1-0.5 | 3.206 | 2.967 | 2.706 | -0.240 | ✅ PASS |
| G5 | ACTION | — | — | — | — | ⚪ SKIP (NCR) |

### Décision

- **V2-C router archétypal** : NO-GO — non promu en production.
- **Retour V1 static** : `OMEGA_ADAPTIVE_CHUNKING='0'` (déjà default,
  aucun changement code requis).
- **V2-B.2** : reste en `SHADOW_CONTINUE` (code conservé pour
  diagnostic causal futur, feature flag OFF par défaut).
- **V2-C** : code conservé dans `adaptive-chunker.ts` pour
  reproductibilité scientifique, feature flag OFF par défaut.
- **NCR_DIRECTIVE_BLOAT** : promu `HIGH (P1)` — V2-C n'a pas résolu
  la régression INTERIOR malgré routage vers buildStaticPlan (V1).
  Signal : la régression INTERIOR observée V2-B.2 → V2-C se
  reproduit même avec plan V1-like, donc la cause causale n'est pas
  uniquement le word_target modulation. Investigation ablation
  directive silence devient chemin critique.
- **NCR_ACTION_BIAS** : reste P0 (inchangé) — ACTION mean quasi-neutre
  V1→V2-C (Δ=+0.027), confirme absence de levier chunker pour ACTION,
  le scoring scene-aware reste seul axe possible.

### Mécanisme causal — hypothèses

Le fait que V2-C (routage INTERIOR → buildStaticPlan V1-like) **régresse
de -2.765** sur INTERIOR vs V1 pur invalide l'hypothèse "word_target
V2-B.2 seul responsable". Deux hypothèses concurrentes émergent :

1. **Variance intrinsèque qwen3:32b** sur 3 seeds (σ=0.533 V1 vs
   σ=0.617 V2-C est proche, mais μ chute). Peu probable : les 3 seeds
   V1 sont tous ≥ 7.02, les 3 seeds V2-C sont tous ≤ 5.50 → pas de
   chevauchement. Bimodalité réelle, pas bruit.
2. **Divergence plan_summary réelle** : malgré routage supposé
   identique, il faut vérifier que `buildStaticPlan` dans branche V2-C
   produit bien exactement le même plan que dans branche legacy. Si
   NOT strict identity, c'est le bug causal. À investiguer en ablation.
3. **Directive silence bloat** (NCR_DIRECTIVE_BLOAT) : les directives
   injectées sous variant=v2c pourraient être légèrement différentes
   des directives legacy même pour plan identique, via side-effect
   du détecteur ou du dispatcher → investigation ablation directe.

### Traçabilité

- Bench JSON source : `packages/sovereign-engine/bench-ab-v1-v2c-results.json`
  SHA256 : `DCC1A3EB4EB06605D09C9760351DEF752AD6E800C295406C9BACACAFC2F8896F`
- Verdict : `outputs/V2C_BENCH_VERDICT_v1.md`
  SHA256 : `B2CF5FFBE4E1D762C1F25DB26846FF39B0D885913CC4583024618FD2258BD701`
- Script évaluateur : `scripts/evaluate-v2c-gates.ts`
- Procédure rollback : `outputs/V2C_ROLLBACK_B_PLUS_PROCEDURE_v1.md`

### Règle cardinale

**Aucun nouveau variant chunker (V2-D, V3…) avant d'avoir élucidé la
cause causale de la régression INTERIOR observée en V2-B.2 ET V2-C.**
Prochaine étape obligatoire : bench ablation directive_silence selon
plan `NCR_DIRECTIVE_BLOAT` section 6 (3 seeds × 2 scènes × 4 variants
A/B/C/D = 24 runs ablation).

═══════════════════════════════════════════════════════════════════════════════
FIN DEC-20260417-004 — Amendé 2026-04-17 (quinquies) — POINT 18 ROLLBACK B+
═══════════════════════════════════════════════════════════════════════════════
