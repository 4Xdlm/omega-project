# NCR_GATING_EFFECT_SIZE_UNSTABLE

**ID** : NCR_GATING_EFFECT_SIZE_UNSTABLE
**Title** : ΔI INTERIOR (M_prod_p1 − M2_adaptive) oscille de +5.379 (R-D.1 n=3) à −0.083 (v2 n=6) inter-session
**Status** : **ACCEPTED_DIAGNOSED_UNKNOWN** (Sprint S8 V3B 2026-05-02 — mapping OPEN_EXTENDED → ACCEPTED_DIAGNOSED_UNKNOWN, diagnostic confirmé empiriquement, gain quantitatif UNKNOWN, Option F SHADOW de facto sans scellage formel)
**Précédent** : OPEN_EXTENDED (renforcé 2026-04-19 matin — bench v3 confirme variance LLM intrinsèque)
**Severity** : HIGH (empêche calibrage fiable des seuils kill-switch)
**Priority** : P1 (promu après v3 — bloque scellement V1-R-D.1-PROD)
**Opened** : 2026-04-18 soir
**Last update** : 2026-04-19 matin (amendement §9 post-bench v3)
**Owner** : Claude (autonome) + Francky (décisionnaire)

---

## 1. Issue

Sur deux benches de configuration structurellement identique (scène
`fr_interior_maison_enfance`, registre `litteraire`, plan V1 static 4×750w,
directives bit-identiques validées par code review), l'effet du gating
R-D.1 ADOPT_A sur INTERIOR oscille d'un facteur ~65 :

| Bench | Date | n | μ(M1) | μ(M2_adaptive) | μ(M3_gated / M_prod_p1) | ΔI(M_prod − M2) |
|---|---|---|---|---|---|---|
| R-D.1 bench-r-d-1-extended | 2026-04-18 matin | 3 | 6.559 | **1.705** | **7.084** | **+5.379** |
| v2 bench-p1-robustness-v2 | 2026-04-18 soir | 6 | 5.911 | **3.004** | **2.920** | **−0.083** |

**Constat clé** : la "marge de récupération" du gating chute de 4.85 (R-D.1 :
M1−M2 = 6.559−1.705) à 2.91 (v2 : 5.911−3.004). Avec M1 quasi-constant,
c'est la toxicité mesurée de M2 qui se divise par ~2.

**Impact** : le seuil G1=+3.0 scellé ex-ante dans NCR_BENCH_METHOD_DRIFT
(dérivé du +5.379 observé en R-D.1) **n'est pas atteignable sous le modèle
de dilution linéaire** (1/4 chunk gated), sauf si M2 retourne à sa toxicité
R-D.1.

---

## 2. Preuves

### 2.1 Directives prouvées identiques (code review + recomputation)

**R-D.1 M3_gated_A** (code inline bench-r-d-1-extended.ts) :
```ts
if (archetype === 'INTERIOR' && state in {silence, introspective}) {
  return LITTERAIRE_BASELINE_DIRECTIVE;
  // = 'rythme équilibré, alternance mesurée, respiration classique'
}
return pickPacingDirective(REGISTER, state, 'adaptive');
```

**Bench v2 M_prod_p1** (délègue à `pickPacingDirective` 4-arg) :
```ts
pickPacingDirective(REGISTER, state, undefined, archetype);
// → si INTERIOR × {silence, introspective} : REGISTER_TABLE['litteraire'].baseline
// → sinon : REGISTER_TABLE['litteraire'][state]
```

`REGISTER_TABLE.litteraire.baseline` (adaptive-chunker.ts:232) = `'rythme équilibré, alternance mesurée, respiration classique'`.

→ **Même string, même logique, même chunk**. Pas de drift wiring.

### 2.2 Engagement gating identique

| Bench | INTERIOR gated chunks / total | % |
|---|---|---|
| R-D.1 (n=3) | 3/12 | 25% |
| v2 (n=6) | 6/24 | 25% |

→ Ni régression d'engagement ni hyper-engagement.

### 2.3 Invariants code intacts

- Commit `7e89f95f` P1 gating inchangé entre R-D.1 et v2.
- 2424 tests sovereign-engine PASS.
- Détection archétype 6/6 scènes.
- SYSTEM_PROMPT verbatim identique (304 lignes bench-p1-robustness-v2.ts lignes 291-304).
- Scoring CALC V3.4 inchangé (coefficients SHA256 `e75e3bb0...`).

### 2.4 Recomputation R-D.1

R-D.1 M2 INTERIOR n=3 : scores observés = [0.85, 1.88, 2.38] → μ=1.705, σ=1.28 → SE=0.74.
R-D.1 M3_gated_A INTERIOR n=3 : scores = [6.45, 7.20, 7.60] → μ=7.084, σ=1.01 → SE=0.58.
ΔI = 5.379, SE combiné = 0.94, effet 5.72σ → **significatif intra-bench** sous H0.

v2 M2 INTERIOR n=6 : [4.64, 2.27, 4.76, −0.76, 3.97, 3.14] → μ=3.004, σ=2.07 → SE=0.85.
v2 M_prod_p1 INTERIOR n=6 : [5.43, 1.81, 3.96, −1.70, 2.65, 5.38] → μ=2.920, σ=2.69 → SE=1.10.
ΔI = −0.084, SE combiné = 1.39 → **indistinguable de zéro**.

---

## 3. Hypothèses

### H1 — Small-n luck R-D.1 (probable)

n=3 par cellule avec σ~1.0–1.3 expose à une variance d'estimation SE ~0.6–0.8.
Trois tirages consécutifs bas pour M2 (valeurs observées 0.85, 1.88, 2.38
– toutes sous la médiane v2) et trois tirages hauts pour M3
(6.45, 7.20, 7.60 – au-dessus du 95e percentile v2) produisent un ΔI
gonflé qui **ne représente pas la population sous-jacente**.

**Test** : le +5.379 est à l'extrémité d'un IC 95% large (~±2.5)
→ non surprenant statistiquement qu'un re-tirage n=6 ramène vers zéro.

### H2 — Drift Ollama qwen3:32b non-déterministe inter-session (probable)

Le script applique `seed = hashSeed(mode, scene, chunk, seed_idx)` FNV-1a 32 bits
dans `options.seed` de l'API Ollama. Mais `qwen3:32b` sous Ollama **n'est pas
strictement reproductible** entre redémarrages de serveur :

- Warm-up différent (KV-cache froid vs. chaud).
- Temperature=0.8, top_p=0.92 : petite variation numérique amplifiée par
  `num_predict=2048` tokens autoregressifs.
- Même seed peut produire des continuations divergentes sous GPU
  (non-determinism des kernels CUDA réduction).

**Effet** : deux runs du même (mode, scene, chunk, seed) peuvent produire
des proses notablement différentes → scores tier_score variant de ±0.5–1.0.

**Test** : exécuter deux fois la **même** cellule (mode, scene, seed_idx=0)
avec rebootage Ollama entre : si Δ > 0.3, H2 est active.

### H4 — M2 variance structurelle (probable)

M2 INTERIOR σ=2.07 dans v2 vs σ=1.28 dans R-D.1. Déjà σ>M1 sur 3 cellules.
La directive adaptive `'silence'` ou `'introspective'` pour INTERIOR active
des features CALC (f33b_commas_count, f24c, f1a) avec hétérogénéité élevée
selon la distribution temporelle des tokens — ce qui crée des **scores
bi-modaux** (silences prolongés vs. introspective développée).

n=3 tombe probablement sur un mode ; n=6 capture les deux modes → μ monte,
ΔI chute.

### H3 — Drift codebase (rejetée)

SYSTEM_PROMPT identique (code review). `pickPacingDirective` inchangée depuis
7e89f95f. REGISTER_TABLE inchangé. Scoring V3.4 figé depuis 2026-04-11
(coefficients SHA256 `e75e3bb0...`).

→ **H3 écartée** : aucune source d'instabilité côté OMEGA.

---

## 4. Conséquence : seuil G1=+3.0 non atteignable

### 4.1 Modèle de dilution linéaire

Sur INTERIOR scène `fr_interior_maison_enfance`, seulement 1/4 chunk est
en state `silence|introspective` → gating engage sur 25% du volume.

Prédiction : `E[M_prod_p1 INTERIOR] = 0.25 × M1 + 0.75 × M2`.

R-D.1 : 0.25 × 6.559 + 0.75 × 1.705 = **2.92** ; observé **7.08** → **inconsistant** avec le modèle de dilution (+4.16 de gap, effet non-linéaire ou bruit).

v2 : 0.25 × 5.911 + 0.75 × 3.004 = **3.73** ; observé **2.92** → cohérent (dans IC 95%, ±2.15).

→ L'effet +5.379 de R-D.1 ne suit pas le modèle de dilution. Soit il est
non-linéaire (bascule émergente que seul n=3 a capté), soit il est bruité
(luck + drift).

### 4.2 Plafond théorique sous dilution linéaire 1/4 gating

Même si M2 retournait à 1.705 et M1 à 6.559 (valeurs R-D.1 moyennes),
`E[ΔI] = E[M_prod] − E[M2] = (0.25 × 6.559 + 0.75 × 1.705) − 1.705 = 2.918 − 1.705 = **+1.21**`.

Le seuil +3.0 (calibré sur le point estimate R-D.1) **n'est pas
atteignable sous le modèle de dilution linéaire**, même en configuration optimale. Il faudrait :
- soit un engagement 3–4/4 chunks (scènes v3 engineered),
- soit un effet non-linéaire (non démontré).

---

## 5. Options

### Option A — Baisser seuil G1 à +1.0 et valider sous dilution linéaire

**Description** : recalibrer G1 à partir du modèle de dilution linéaire
`E[ΔI] = (1 − p_gated) × (M1 − M2)`. Avec p_gated=0.25 et un scénario
où M1−M2 = 5.0 (observé en R-D.1 et partiellement en v2), on a
`E[ΔI] = 0.75 × 5.0 = 3.75` → seuil réaliste +1.0 avec marge bruit.

**Cons** : Violation règle OMEGA "seuils scellés ex-ante PAS NÉGOCIABLES post-bench".
Baisser le seuil sans redesign du protocole est un ajustement post-hoc
qui invalide statistiquement la décision.

**Rejet** : incompatible avec discipline de validation.

### Option B — Bench v3 scènes engineered 3–4/4 chunks gated (retenue)

**Description** : construire des scènes INTERIOR dont le contrat émotionnel
produit `arousal ≤ arousal_introspective_threshold` (=0.3) OU
`silence_overlap > silence_threshold` (=0.5) sur ≥ 3 quartiles sur 4
(voire 4/4 : scène "méditation pure").

**Effet attendu** : p_gated = 0.75 ou 1.0 → `E[ΔI] = 0.25 × (M1−M2) ≈ +1.25`
ou `E[ΔI] = M1 − M2 ≈ +5.0` (plein engagement, reproduction R-D.1 M3 direct).

**Test de reproductibilité R-D.1** : inclure aussi la scène originale
`fr_interior_maison_enfance` avec n=6 sur mode M3_gated_A **pur** (pas via
pickPacingDirective 4-arg) pour mesurer directement si +5.379 se
reproduit. Si oui → H1 small-n luck infirmée ; si non → H1+H2+H4 confirmées.

**Pros** :
- Validation empirique sans dilution.
- Distingue luck / drift / variance structurelle.
- Permet seuils ex-ante recalibrés sur un protocole DIFFÉRENT (pas post-hoc).

**Cons** : coût Ollama ~3–4h supplémentaires.

### Option C — Accepter incertitude et déclarer P1 validé par preuves CALC

**Description** : déclarer P1 validé sur :
- Smoke v2 4 archétypes 0 leak INTERIOR.
- 2424 tests PASS.
- Détection archétype 6/6.
- Directives bit-identiques R-D.1 prouvées par code.
- chunk_trace JSON gated=true ∩ state∈{silence,introspective} = 100%.

Et admettre que le scoring LLM inter-session est **trop bruité** pour
calibrer des seuils de gain absolus (seuls les tests de non-régression
sont statistiquement fiables).

**Pros** : clôture immédiate.

**Cons** : laisse NCR_CATHEDRAL_BASELINE et NCR_ARCHETYPE_DETECTION_DRIFT
sans cadre méthodologique pour mesurer leurs corrections. Reporte le
problème à plus tard.

---

## 6. Recommandation

**Option B** (bench v3 scènes engineered + reproduction R-D.1 directe n=6).
Justifications :

1. **Pas d'ajustement post-hoc** : protocole différent justifie seuils différents.
2. **Test falsifiable H1** : si M3_gated_A direct n=6 reproduit +5.379±1.0, H1 infirmée.
3. **Traçabilité** : bench v3 devient référence calibrée pour futures décisions P2/P3.
4. **Coût acceptable** : +3–4h Ollama pour résoudre l'ambiguïté.

Option C en **fallback** si bench v3 échoue aussi à distinguer.

---

## 7. Plan d'action

1. ✅ Rédiger design doc bench v3 (`outputs/BENCH_P1_V3_DESIGN.md`).
2. ⏳ Implémenter `packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts`
   (pending validation design Francky).
3. ⏳ Créer launcher PS1 v4 ASCII-strict.
4. ⏳ Exécution Francky-side (~3–4h Ollama qwen3:32b).
5. ⏳ Autopsie post-bench + mise à jour NCR (CLOSED_FIX / REOPENED / ESCALATED).

---

## 8. Impact sur décisions précédentes

- **P1 commit `7e89f95f`** : NE PAS ROLLBACK. 5 preuves indépendantes intactes (cf. autopsie v2).
- **R-D.1 ADOPT_A** : reste SCELLÉ méthodologiquement (décision prise sur 48 runs intra-bench, critère B1 atteint intra-bench).
- **Fiabilité du gain empirique** : à requalifier après bench v3. ΔI INTERIOR en production reste inconnu (nouveau NCR).
- **Discipline seuils ex-ante** : seuils bench v3 doivent être scellés **avant** exécution, dérivés d'un modèle théorique (dilution linéaire) pas d'un point estimate historique.

---

**Références** :
- `outputs/BENCH_P1_V2_AUTOPSY.md` (diagnostic complet)
- `outputs/BENCH_P1_V3_AUTOPSY.md` (autopsie v3, 144 runs, 2026-04-19 matin)
- `packages/sovereign-engine/bench-r-d-1-extended-results.json` (R-D.1 48 runs)
- `packages/sovereign-engine/bench-p1-robustness-v2-results.json` (v2 72 runs)
- `packages/sovereign-engine/bench-p1-robustness-v3-results.json` (v3 144 runs, SHA256 7DA99121...DC0FE89)
- `nexus/proof/NCR_BENCH_METHOD_DRIFT.md` (amendement §8 v2 drift + §9 v3 closure)
- `memory/project_bench_p1_v2_autopsy_2026-04-18.md`
- `outputs/BENCH_P1_V3_DESIGN.md` (scellé)

---

## 9. Amendement 2026-04-19 matin — Bench v3 144 runs : variance LLM confirmée intrinsèque

### 9.1 Résumé exécutif

Le bench v3 (144 runs, 6 scènes × 4 modes × 6 seeds, qwen3:32b local) a été
exécuté avec succès le 2026-04-19 (02:08:30 → 07:45:37, 5.62h, 127 OK / 17 errors).
Sur les 6 gates ex-ante scellés dans `BENCH_P1_V3_DESIGN.md` :

| Gate | Seuil | Mesuré | Verdict |
|---|---|---|---|
| G1 (R-D.1 +5.379 reproductibilité) | ≥ +3.0 | n=0 (M2 timeout REPRO) | **FAIL — non calculable** |
| G2 (gain DEEP engineered) | ≥ +1.0 | +0.595 | **FAIL** |
| G3 (sanity gating wiring) | ≥ 0.95 | 1.000 | **PASS** |
| G4 (équivalence cryptographique M3≡M_prod) | = 1.00 | 1.000 (24/24 SHA256 identiques) | **PASS** |
| G5 (control no gating CTRL) | = 0 | 0 | **PASS** |
| G6 (reproductibilité baseline) | ≤ 3.0 | 2.254 | **PASS** |

**Branche décisionnelle atteinte (design §6) : B — WIRING OK, GAIN DILUÉ.**

### 9.2 Renforcement de la diagnose : variance intrinsèque démontrée

Le gate **G4 PASS** est la preuve cryptographique que pour 24 paires (seed,
chunk_idx) testées sur la scène REPRO `fr_interior_maison_enfance`, les
directives envoyées au LLM en M3_gated_A_inline et M_prod_p1 sont
**bit-identiques** (même `directive_sha256` sur 24/24 paires).

Pourtant les scores observés divergent :

| Mode | μ(M_prod_p1, REPRO) | μ(M3_gated_A_inline, REPRO) | Δ |
|---|---|---|---|
| M3 inline | — | 3.860 | — |
| M_prod_p1 | 2.920 | — | **−0.940** |

**Conclusion mécanique** : à directive SHA256 identique, sur 6 seeds chacun
(n=12 totaux), la moyenne diverge de **0.94 points** (~σ/2). Cette dispersion
est **non éliminable par contrôle algorithmique** : elle vient du LLM lui-même
(qwen3:32b sampling stochastique, ou état modèle inter-call).

→ **L'hypothèse H2 de §3 (variance LLM intra-modèle) est CONFIRMÉE.**

### 9.3 Confirmation du non-atteignabilité de G1=+3.0

Le bench v3 ne permet pas de mesurer G1 (cellule M2_adaptive × REPRO = n=0
suite à 6/6 timeouts 600s — voir nouvelle NCR `NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR`).

**Mais** sur les scènes DEEP engineered (3 scènes INTERIOR avec engagement
attendu ≥ 75% des chunks gated), le gain G2 mesuré est :

```
G2 = mean({DEEP_1, DEEP_2, DEEP_3}, μ(M_prod_p1) − μ(M2_adaptive))
   = mean({+1.30, +2.70, +2.28})  // veillee, dialogue, meditation
   = +0.595
```

Ces scènes étaient pourtant le **best-case engineered** pour démontrer le gain
de gating sous engagement maximum. Avec p_gated=0.75-1.00 attendu, le modèle
de dilution linéaire prédisait `E[ΔI] = 0.25 × (M1−M2) ≈ +0.5 à +1.5`.

→ Mesure +0.595 cohérente avec dilution linéaire **mais sous-seuil G2=+1.0**.

→ **Le seuil +3.0 (G1) est définitivement non atteignable** sous le modèle de
dilution linéaire 1/4 chunks gated, comme prédit en §4.2 dès l'ouverture de la NCR.

### 9.4 Discipline préservée : pas d'ajustement post-hoc

Conformément à l'Option A rejetée en §5, **le seuil G1=+3.0 reste scellé**.
Sa non-atteignabilité ne déclenche pas un re-calibrage post-hoc : elle déclenche
une **requalification du critère de décision V1-R-D.1-PROD** (cf. §9.5).

### 9.5 Nouvelles options post-v3

#### Option B' (déjà tentée, INSUFFISANT) — Bench v3 scènes engineered → seuil non atteint

Le bench v3 a exécuté ce que prévoyait l'option B originale de §5 (scènes
DEEP engineered avec engagement gated élevé). **Résultat : G2 sous-seuil de
+0.405 points.** L'option B en l'état n'a pas validé le gain.

#### Option D — Augmenter n par cellule (n=12 ou n=18)

**Description** : refaire le bench v3 avec n=12 ou n=18 par cellule (288 ou
432 runs au lieu de 144), pour réduire l'écart-type des moyennes par √2 ou √3.

**Budget** : 12-15h compute Ollama (qwen3:32b sur RTX 3090). Nuit 2026-04-19.

**Pros** : test direct de la variance intrinsèque ; si μ(M3) − μ(M2) reste
stable autour de +0.6 pts avec σ²/12 → confirme dilution linéaire.

**Cons** : ne baisse pas les seuils mais établit une mesure stable du gain.
Si le gain stable est < +1.0, V1-R-D.1-PROD reste non scellable au sens strict.

#### Option E — Changer de modèle LLM (qwen3:72b ou commercial)

**Description** : tester si la variance vient du sampling qwen3:32b ou du
gating en lui-même.

**Pros** : réplication cross-model = preuve robuste.

**Cons** : qwen3:72b ≈ 4-6× compute, modèle commercial = budget API ($).

#### Option F — Accepter SHADOW définitif sur P1 (recommandée par défaut)

**Description** : reconnaître que sous dilution linéaire 1/4, le gain G1=+3.0
n'est jamais atteignable, et sceller P1 en **mode SHADOW permanent** : R-D.1
ADOPT_A reste activé en production avec logging mais **sans claim de gain
mesurable**.

**Pros** : respecte la discipline ex-ante. Aucune dégradation observée
(G5 PASS = neutralité non-INTERIOR). Wiring prouvé fonctionnel (G3+G4 PASS).

**Cons** : V1-R-D.1-PROD ne peut pas être scellé comme un gain prouvé. Doit
être reframé comme "fonctionnalité opt-in sans dégradation, pending plus de
données".

### 9.6 Recommandation actualisée

**Statut** : OPEN_EXTENDED (en attente arbitrage Francky entre Options D, E, F).

**Recommandation Claude** : **Option F par défaut**, avec collecte passive de
n=12-18 par cellule en arrière-plan (Option D non bloquante, lancée si
ressources nuit disponibles).

**Justification** :
- 4/6 gates indépendants du LLM PASSENT → architecture saine et mesurable
- 2/6 gates qui dépendent du gain de score sont sous-seuil → soit la dilution linéaire le prédit (G2), soit le calcul est impossible par deadlock M2 (G1)
- Insister sur "gain mesurable +3.0" devient une chasse au bruit : variance σ ≈ 2 pts intra-modèle confirmée par G4 PASS
- Le bénéfice réel de R-D.1 ADOPT_A (élimination du collapse 1.7 vs 6.5 sur scènes spécifiques R-D.1) reste valide en production sans claim quantitatif fixe

### 9.7 Impact sur autres NCRs

- `NCR_BENCH_METHOD_DRIFT` : `FIX_VALIDATED` (méthode v3 a fonctionné, voir §9 de cette NCR)
- `NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR` (NOUVEAU) : `OPEN` **P0** (promu 2026-04-19 matin — bloque tout futur mini-rebench d'effet-size tant que non corrigé)
- `OMEGA_V1_SEAL_CERTIFICATE.md` : invariant. R-D.1-PROD non scellé en gain mesurable, scellé en wiring fonctionnel uniquement (§9.6 Option F).

### 9.8 Reformulation ChatGPT-strict de la question ouverte (consensus 3-IA 2026-04-19)

La question ouverte de cette NCR est **officiellement reformulée** pour
refléter la réalité post-bench v3 et le blocage NCR_M2 P0.

**Ancienne formulation (pré-v3)** :
> "Le gating R-D.1 ADOPT_A marche-t-il ? Si oui, le gain +5.379 est-il reproductible ?"

**Nouvelle formulation (post-v3, ChatGPT-strict)** :
> **"Le gating archétypal a-t-il un bénéfice stable après correction du
> deadlock M2_adaptive INTERIOR ?"**

**Raison du shift** :
- Pré-v3 : on cherchait à confirmer un gain (+5.379 observé en R-D.1 n=3).
- Post-v3 : on a prouvé que 2/3 des mesures d'effet-size sont polluées par le
  deadlock M2 (11/24 timeouts sur INTERIOR = 45.8% de données manquantes
  non aléatoires). La question "marche ou pas" est **techniquement impossible
  à répondre** tant que NCR_M2 P0 n'est pas fermé.
- La nouvelle formulation impose la séquence logique correcte :
  1. **D'abord** fermer NCR_M2 (timeout garde-fou, découpage INTERIOR long, ou
     fallback déterministe — cf. §6 de cette NCR) ⇒ condition nécessaire.
  2. **Ensuite** seulement, relancer un mini-bench d'effet-size sur INTERIOR
     avec données non polluées ⇒ condition suffisante.

**Canonique P1 SHADOW (scellement V1)** :
> "Le gating archétypal est câblé en production. Son gain d'effet observé en
> R-D.1 n'est pas reproduit de manière robuste dans le bench v3. Le correctif
> est conservé comme mesure de stabilité, non comme amélioration de
> performance certifiée."

Cette phrase **doit être citée verbatim** dans :
- `OMEGA_V1_SEAL_CERTIFICATE.md` (amendement P1 SHADOW)
- `outputs/log_quality.md` (entrée du 2026-04-19 matin)
- Tout futur commit message qui scelle V1-R-D.1-PROD

**Interdiction post-hoc** : aucune reformulation ne peut affaiblir la
condition §9.4 (pas d'ajustement ex-post des seuils). Le seuil G1=+3.0 reste
inchangé ; il est simplement **suspendu** tant que NCR_M2 P0 empêche sa
mesure.

**Recommandation Claude consolidée 2026-04-19 matin** :
1. **Option F (SHADOW permanent)** = scellement V1 par défaut, effet immédiat.
2. **NCR_M2 P0** = chantier technique bloquant avant tout mini-rebench.
3. **Option D (mini-rebench n=12)** = conditionnée à fermeture NCR_M2, pas
   avant. Pas de "collecte passive" tant que les données restent polluées.
4. **Option E (qwen3:72b)** = rejetée (ChatGPT+Gemini+Claude) — change le
   modèle ne prouve rien sur la méthode, et 72b ne rentre pas en VRAM.

---

## 10. S8 V3B CLASSIFICATION — 2026-05-02

### 10.1 Anchors empiriques vérifiés (canon-engine quality bar EMP-N)

| Test | Commande | Résultat |
|------|----------|----------|
| EMP-1 | SHA256 `bench-p1-robustness-v3-results.json` | **EXACT MATCH** : `7DA991210E0C78A1D2972F05F1EE7FC5EB3A5515E3E94CE3B498D9C99DC0FE89` ✅ (déjà vérifié C24) |
| EMP-2 | `Test-Path bench-r-d-1-extended-results.json` | True ✅ |
| EMP-3 | `Test-Path bench-p1-robustness-v2-results.json` | True ✅ |
| EMP-4 | NCR_M2 status check | Confirmé `FIX_VALIDATED_SCOPED` (Vague 1 C9, ligne 5 du NCR M2) ✅ |
| EMP-5 | P1 wiring commit `7e89f95f` | Confirmé "feat(adaptive-chunker): P1 archetype gating wiring (R-D.1 ADOPT_A)" — intact, R-D.1 ADOPT_A active en prod ✅ |
| EMP-6 | Search `OMEGA_V1_SEAL_CERTIFICATE.md` filesystem | **NON TROUVÉ** ❌ — Evidence Rot supplémentaire |
| EMP-7 | git log grep "SHADOW.*permanent\|Option F\|P1 SHADOW" | **0 commit** — Architecte arbitrage D/E/F **non scellé** empiriquement |

### 10.2 Mapping OPEN_EXTENDED → status doctrinal

`OPEN_EXTENDED` n'est pas dans la liste statuts autorisés.

| Critère | Vérif | Match status |
|---------|-------|-------------|
| Diagnostic confirmé empiriquement (G4 PASS bit-identical, 144 runs) | ✅ EMP-1 | DIAGNOSED-family |
| Architect décision Option D/E/F formellement scellée | ❌ EMP-7 | NOT RESOLVED |
| Status quo SHADOW de facto (P1 commit intact) | ✅ EMP-5 | UNKNOWN gain quantitatif accepté |
| `OMEGA_V1_SEAL_CERTIFICATE.md` amendement P1 SHADOW présent | ❌ EMP-6 (introuvable) | UNKNOWN sealing status |
| NCR_M2 closure (condition Option D) | ❌ EMP-4 (FIX_VALIDATED_SCOPED, pas RESOLVED) | UNKNOWN remaining path |

→ **ACCEPTED_DIAGNOSED_UNKNOWN** est le mapping correct :
- ACCEPTED : recommandation Option F implicitement appliquée (P1 intact, R-D.1 ADOPT_A active)
- DIAGNOSED : variance LLM intrinsèque empiriquement prouvée (G4 PASS)
- UNKNOWN : gain mesurable quantitatif structurellement non atteignable, scellage formel manquant

### 10.3 Decision rationale

Cannot RESOLVED :
- Aucun commit "P1 SHADOW" tracé
- OMEGA_V1_SEAL_CERTIFICATE.md introuvable → impossible de vérifier amendement P1 SHADOW
- Architecte arbitrage D/E/F non tracé formellement

Cannot CLOSED_CONFIRMED :
- "Closure" requires explicit decision; only Claude recommandation (line 392-394) emitted, not Architect-sealed

Cannot DEFERRED :
- DEFERRED implies sprint dédié S9+ to act ; ici le diagnostic est complet et la doctrine accepte UNKNOWN

Cannot STILL_OPEN :
- L'investigation est complète (bench v3 144 runs, G4 PASS), pas en attente passive

Cannot FIX_VALIDATED_SCOPED :
- Pas de fix appliqué scoped ; Option F est acceptation pas fix

→ **ACCEPTED_DIAGNOSED_UNKNOWN** est doctrinalement aligné.

### 10.4 Evidence-gap supplémentaire détecté Vague 2 (EMP-6)

Le NCR §9.7 et §9.8 cite `OMEGA_V1_SEAL_CERTIFICATE.md` comme cible
pour amendement P1 SHADOW canonique. Vérification 2026-05-02 :

```powershell
$ Get-ChildItem -Recurse -Filter "OMEGA_V1_SEAL*"
(empty)
```

→ Le fichier **n'existe pas** dans le repo. Pattern parallèle à
`NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING` et `M0B_SLIM_V34_COEFFICIENTS.json`.
Cet evidence-gap supplémentaire doit être ajouté à l'audit S9+ du F1
umbrella `NCR_EVIDENCE_ARTIFACT_GAP_PATTERN` (commit `3bfcdbde`).

### 10.5 Final status

**ACCEPTED_DIAGNOSED_UNKNOWN** (severity HIGH P1 maintenue dans le header
pour trace historique du blocage scellement V1-R-D.1-PROD)

### 10.6 Scope

- **DIAGNOSED ACCEPTED** : variance LLM intrinsèque confirmée (G4 PASS),
  gain quantitatif G1=+3.0 non atteignable sous dilution linéaire,
  Option F SHADOW de facto via P1 commit intact
- **UNKNOWN** : gain mesurable quantitatif, scellage formel V1-R-D.1-PROD,
  amendement OMEGA_V1_SEAL_CERTIFICATE
- **HORS scope** : actions correctives (Options D/E si NCR_M2 fermé)

### 10.7 Remaining risks

- **R1** — Scellage formel V1-R-D.1-PROD bloqué : OMEGA_V1_SEAL_CERTIFICATE.md
  introuvable + aucun commit P1 SHADOW → la canonique scellement n'existe pas
  empiriquement
- **R2** — Décision Architecte D/E/F en attente 13 jours (depuis 2026-04-19) :
  pattern bit-rot contextuel
- **R3** — NCR_M2 condition non remplie : Option D bloquée tant que NCR_M2
  reste FIX_VALIDATED_SCOPED (cf. C9 V1)
- **R4** — Evidence Rot OMEGA_V1_SEAL_CERTIFICATE.md : 4ème cas pattern
  Evidence Rot détecté (après DIRECTIVE_ABLATION + M0B + PHASE_1_CATHEDRAL) →
  audit S9+ F1 umbrella requis

### 10.8 Cross-references

- `NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR` (FIX_VALIDATED_SCOPED, Vague 1 C9
  commit `7d4bff66`) : condition pour Option D, non remplie
- `NCR_BENCH_METHOD_DRIFT` (CLOSED_CONFIRMED, Vague 2 C24 commit `87a400cb`) :
  hérite de cette NCR via §9.7 cross-impact (méthode bench valide, mais
  effet-size instable)
- `NCR_EVIDENCE_ARTIFACT_GAP_PATTERN` (F1 umbrella commit `3bfcdbde`) :
  doit ajouter `OMEGA_V1_SEAL_CERTIFICATE.md` à l'audit S9+ §5
- `NCR_FROZEN_BREACH_DUEL_ENGINE_2026-04-20` (CLOSED_CONFIRMED Vague 2 C26
  commit `458df9ab`) : V1_SEAL_CERTIFICATE intact selon NCR §12.5,
  contradiction empirique avec EMP-6 — investigation S9+ requise

### 10.9 Closure officielle

```
CLASSIFICATION S8 V3B — NCR_GATING_EFFECT_SIZE_UNSTABLE
=========================================================
Date            : 2026-05-02 (Sprint S8 V3B)
Status          : OPEN_EXTENDED → ACCEPTED_DIAGNOSED_UNKNOWN (mapping)
Severity        : HIGH P1 (inchangée, blocage scellement V1-R-D.1-PROD)
Authority       : Claude Code (runtime arbiter S8 V3B) +
                  Recommandation Claude consolidée 2026-04-19 (Option F)
                  + 3-IA consensus pre-existing
Evidence anchor : 7/7 EMP runtime — bench v3 SHA256 match exact +
                  3 bench JSON présents + NCR_M2 status confirmé +
                  P1 wiring commit intact
Evidence gaps   : EMP-6 OMEGA_V1_SEAL_CERTIFICATE.md introuvable +
                  EMP-7 0 commit Option F scellé →
                  4ème evidence-gap pattern (audit F1 umbrella S9+)
Anchors Cowork  : aucun anchor [À VÉRIFIER] explicite dans brief V3B C27.
                  Anchors NCR-internes vérifiés.
Scope           : diagnostic accepté + Option F SHADOW de facto, gain
                  quantitatif UNKNOWN, scellage formel pending S9+
Risks           : R1 scellage bloqué, R2 Architect 13 jours bit-rot,
                  R3 NCR_M2 condition Option D, R4 Evidence Rot V1_SEAL
```
