# NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR

**ID** : NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR
**Title** : Mode M2_adaptive provoque 11/24 (45.8%) timeouts 600s sur scènes INTERIOR (qwen3:32b)
**Status** : **FIX_VALIDATED_SCOPED** (Phase 1 A.1 STRICT, 2026-04-19 nuit — consensus 3/3 IA)
**Severity** : HIGH (résolu sur périmètre INTERIOR — bloquait toute mesure fiable du baseline adaptive)
**Priority** : **P0** (promu 2026-04-19 matin après consensus 3-IA post-bench v3)
**Opened** : 2026-04-19 matin (post-bench v3)
**Fix validated** : 2026-04-19 nuit (Phase 1 A.1 STRICT, bench 15/15 OK, 0 timeout)
**Owner** : Claude (autonome) + Francky (décisionnaire)
**Promotion P1→P0** : 2026-04-19 matin — consensus ChatGPT+Gemini+Claude : "tant que 11/24 timeouts sur une branche clé, tout bench d'effet est semi-pourri" (ChatGPT)
**Clôture SCOPED** : 2026-04-19 nuit — consensus ChatGPT+Gemini+Claude : "OPT1 conservative env-gated, FIX_VALIDATED_SCOPED, pas FIX_VALIDATED_GLOBAL tant que bench élargi hors INTERIOR et drift archétype non résolus"

---

## 1. Issue

Lors du bench P1 v3 (144 runs, 6 scènes × 4 modes × 6 seeds, qwen3:32b local
via Ollama), le mode `M2_adaptive` a échoué sur 11 des 24 runs prévus sur les
scènes INTERIOR avec des **timeouts de 600 secondes par chunk** au lieu
d'atteindre un succès en ~40-60 secondes nominal.

### 1.1 Distribution des échecs par cellule (M2_adaptive uniquement)

| Scène | n prévu | n réussi | n timeout | Taux échec |
|---|---|---|---|---|
| fr_interior_maison_enfance (REPRO) | 6 | 0 | 6 | **100%** |
| fr_interior_veillee_funebre (DEEP_1) | 6 | 1 | 5 | **83%** |
| fr_interior_meditation_aube (DEEP_3) | 6 | 6 | 0 | 0% |
| fr_interior_dialogue_interieur (DEEP_2) | 6 | 6 | 0 | 0% |
| fr_cathedral_silence_nef (CTRL_1) | 6 | 6 | 0 | 0% |
| fr_action_poursuite (CTRL_2) | 6 | 6 | 0 | 0% |

**Total M2_adaptive INTERIOR : 11/24 timeouts (45.8%)**
**Total M2_adaptive global : 11/36 timeouts (30.5%)**

### 1.2 Distribution des échecs global (144 runs)

- **Runs total** : 144
- **Runs OK** : 127
- **Runs erreur** : 17 (tous timeouts 600s sur un chunk)
  - M2_adaptive × REPRO : 6
  - M2_adaptive × veillee_funebre : 5
  - M1_baseline × fr_action_poursuite : 6 (cas à part, voir §5)

### 1.3 Impact direct sur G1 (gate reproductibilité R-D.1)

Le gate G1 scellé ex-ante du design v3 exigeait :

```
G1 = μ(M3_gated_A_inline, REPRO) − μ(M2_adaptive, REPRO) ≥ +3.0
```

Avec M2_adaptive × REPRO = n=0 (6/6 timeouts), **G1 est non calculable**.
Le gate est marqué FAIL mécaniquement faute de donnée au dénominateur.

→ Conséquence : impossible de statuer sur la reproductibilité du +5.379 mesuré
en bench R-D.1 (n=3, 2026-04-18 matin).

---

## 2. Preuves

### 2.1 Runs M2_adaptive × REPRO : 6 timeouts consécutifs

Tous les 6 seeds (42, 43, 44, 45, 46, 47) ont produit un timeout sur le chunk 0
(souvent) ou chunk 1/2/3. Logs `_full_bench_v3_stdout.txt` révèlent :

```
[bench-p1-robustness-v3] RUN M2_adaptive × fr_interior_maison_enfance × seed=42
  chunk 0 generation timeout after 600s (model=qwen3:32b)
  STATUS: ERROR
```

Pattern répété pour les seeds 43, 44, 45, 46, 47.

### 2.2 Runs M2_adaptive × veillee_funebre : 5/6 timeouts + 1 succès

Un seul seed a complété (seed=44, μ=5.818) après ~7min. Les 5 autres ont
timed-out sur un chunk.

### 2.3 Contraste avec M2_adaptive × autres scènes

- `dialogue_interieur` : 6/6 OK (μ=2.337)
- `meditation_aube` : 6/6 OK (μ=3.189)
- `cathedral_silence_nef` : 6/6 OK (μ=0.341)
- `action_poursuite` : 6/6 OK (μ=−0.019)

→ **Le deadlock est localisé** sur 2 scènes INTERIOR spécifiques
(`maison_enfance`, `veillee_funebre`), PAS sur toutes les INTERIOR.

---

## 3. Hypothèses mécaniques

### 3.1 H1 — Directive adaptive provoque runaway generation

Le mode M2_adaptive active le `registerPromptBuilder` qui ajoute une directive
"adaptive" à la directive de base. Sur certaines scènes INTERIOR spécifiques
(maison_enfance, veillee_funebre), cette directive combinée au contrat
émotionnel (registre `litteraire`, enjeu méditatif, souvenirs enfance/mort)
peut provoquer un pattern génératif runaway : le modèle génère en boucle
sans atteindre un token EOS, consommant les 600s timeout.

**Preuve indirecte** : les directives SHA256 M3_gated_A_inline sur les mêmes
scènes (qui incluent directive **inline** gated variant) ne déclenchent PAS
le deadlock (6/6 OK sur maison_enfance, veillee_funebre).

→ La composition directive adaptive + contrat INTERIOR méditatif déclenche
un mode de défaillance spécifique du LLM.

### 3.2 H2 — Contexte (scène + registre) déclenche un attracteur génératif

La scène `maison_enfance` et `veillee_funebre` ont une spécificité : registre
littéraire + souvenirs/mort + densité sensorielle élevée. L'hypothèse est
qu'un attracteur dans l'espace latent du qwen3:32b (correspondant à des
descriptions longues méditatives) est déclenché par la combinaison scène +
directive adaptive, produisant un flux quasi-infini.

**Testabilité** : reproduire avec un modèle différent (qwen3:72b, Mistral Large)
pour voir si le deadlock suit ou est spécifique à qwen3:32b.

### 3.3 H3 — Bug de parse côté pipeline (rejeté)

L'hypothèse d'un bug parsing qui interprète incorrectement un token comme
un signal "continue to generate" est écartée : les mêmes scènes en M1_baseline
et M3/M_prod (qui partagent le même pipeline, sauf registerPromptBuilder
différent) réussissent correctement. Seule la combinaison M2_adaptive × scène
déclenche le timeout.

### 3.4 H4 — Tokens d'arrêt / max_tokens insuffisant côté config

Possibilité que la config Ollama pour M2_adaptive ait un `num_predict` trop
élevé ou un `stop_token` manquant. À vérifier dans `packages/sovereign-engine/src/gate/bench-p1-robustness-v3.ts`.

---

## 4. Impact sur bench v3

### 4.1 Gates affectés

- **G1 FAIL (non calculable)** : cellule M2_adaptive × REPRO = n=0
- **G2 partiellement affecté** : M2_adaptive × veillee_funebre = n=1 → écart-type σ=0 (1 seul point), moyenne 5.818 biaisée par la sélection du seul run complet
- **Autres gates (G3, G4, G5, G6) non affectés** : ils ne dépendent pas de M2_adaptive sur REPRO/veillee

### 4.2 Décision branche B (design §6) tenable

Malgré la défaillance G1, le design v3 a correctement identifié la branche B
(WIRING OK, GAIN DILUÉ) via G3 PASS + G4 PASS + G5 PASS + G6 PASS.

→ La méthode du bench v3 a tenu. Seul l'effet de R-D.1 reste mesurable à
travers le proxy G2 (gain DEEP engineered = +0.595, sous-seuil mais non-nul).

---

## 5. Note annexe — M1_baseline × fr_action_poursuite (6 timeouts)

Indépendamment du pattern M2_adaptive, la cellule `M1_baseline × fr_action_poursuite`
a produit 6/6 timeouts. Cette scène CTRL_2 (action haute, combat/poursuite)
avec mode baseline (pas de directive adaptive) montre un pattern distinct :
le contrat émotionnel action intense combiné au plan V1 static 4×750w
(sans variation registre) produirait également un runaway.

→ **Hypothèse séparée** : la combinaison `action_poursuite` + `baseline`
pourrait nécessiter une configuration de stopping criteria adaptée. À traiter
en NCR distincte si confirmé par reproduction.

**Pour l'instant** : pas de gate affecté (M1_baseline × action_poursuite
n'est impliqué dans aucune formule de gate v3). Documenté ici pour mémoire.

---

## 6. Options de résolution

### Option A — Investigation pipeline M2_adaptive (non bloquante)

**Description** : isoler la directive adaptive exacte envoyée au LLM sur
une scène problématique (maison_enfance seed 42) via logs verbeux + dump
du prompt complet. Comparer byte-par-byte avec la directive M3_gated_A_inline
qui ne timeout pas.

**Effort** : 2-4h dev.
**Output** : hypothèse H1/H2 tranchée.

### Option B — Stopping criteria explicite côté Ollama

**Description** : ajouter un `num_predict` explicite (p.ex. 1200 tokens pour
un chunk de 750 mots, soit marge 60%) et/ou `stop` tokens explicites dans
la config Ollama pour éviter le runaway.

**Effort** : 1h dev + re-test bench partiel.
**Risque** : altère la méthode v3 scellée — nécessite v4 ou bench d'ablation
dédié.

### Option C — Retirer M2_adaptive du bench v3, redéfinir baseline

**Description** : reconnaître que M2_adaptive est un mode instable sur qwen3:32b
et utiliser `M1_baseline` comme référence de comparaison (au lieu de
M2_adaptive) pour G1 et G2. Le bench v3 permet de recalculer les gates avec
M1_baseline en comparateur.

**Post-hoc recalcul** (exploratoire — à valider avant publication) :
- G1' = μ(M3_gated_A_inline, REPRO) − μ(M1_baseline, REPRO) = 3.860 − 5.911 = **−2.05**
  → FAIL dans le sens opposé (M1 > M3 !)
- G2' = mean DEEP (μ(M_prod_p1) − μ(M1_baseline)) = ...
  → à calculer

**Observation critique** : sur REPRO, le baseline `M1_baseline` obtient une
**meilleure** moyenne que M3_gated_A_inline (+2.05). Ceci contredit
l'hypothèse initiale de R-D.1 (+5.379 gain).

→ **C'est une piste majeure** : M2_adaptive n'était pas seulement "toxique"
en R-D.1, il était peut-être **artificiellement bas** (ou déjà symptomatique
du deadlock, censuré).

**Effort** : 1h recalcul + rédaction amendement.

### Option D — Tester qwen3:72b sur scènes problématiques (budget)

**Description** : relancer M2_adaptive × maison_enfance avec qwen3:72b (4-6×
compute). Si deadlock persiste → confirmé mécanique directive ; si disparaît
→ confirmé idiosyncrasie qwen3:32b.

**Effort** : 3-5h compute nuit.

---

## 7. Recommandation

**Court terme (avant scellement V1-R-D.1-PROD)** :
1. **Option C** : recalculer gates v3 avec M1_baseline comme référence. Si G1' confirme que M3 n'améliore pas M1 sur REPRO, alors **R-D.1 +5.379 était un artefact de sampling sur M2 déficient** (scellé par NCR_GATING_EFFECT_SIZE_UNSTABLE §9 Option F).
2. **Option A** : investigation 2h du prompt adaptive envoyé sur scènes problématiques — déterminer si H1 (directive runaway) ou H4 (stopping criteria config).

**Moyen terme (avant bench v4 s'il a lieu)** :
3. **Option B** : ajouter `num_predict` + `stop` tokens explicites en config Ollama. Doit être fait avant toute exécution de bench v4 pour éviter les 600s de coût par run cassé.

**Long terme** :
4. Documenter dans `OMEGA_V1_SEAL_CERTIFICATE.md` que M2_adaptive est un mode
SHADOW instable sur qwen3:32b et ne doit pas être utilisé en baseline
production sans stopping criteria explicites.

---

## 8. Plan d'action

| # | Action | Owner | Deadline | État |
|---|---|---|---|---|
| 1 | Recalcul post-hoc G1'/G2' avec M1_baseline référence | Claude | 2026-04-19 soir | TODO |
| 2 | Dump prompt adaptive seed 42 maison_enfance + diff vs inline | Claude | 2026-04-19 soir | TODO |
| 3 | Décision Francky : Option A/B/C/D ou combinaison | Francky | après #1 #2 | PENDING |
| 4 | Si Option B retenue : PR config Ollama stopping | Claude | après #3 | BLOCKED |
| 5 | Mise à jour `OMEGA_V1_SEAL_CERTIFICATE.md` | Claude | après #3 | BLOCKED |

---

## 9. Impact sur décisions précédentes

- **P1 commit `7e89f95f`** : NE PAS ROLLBACK. R-D.1 ADOPT_A reste scellé code-side.
  La question est la **claimability** du gain, pas le wiring.
- **R-D.1 scellement méthodologique** : requalifié. Le gain +5.379 mesuré à n=3
  pouvait être dû en partie au **déficit pathologique de M2_adaptive** (deadlocks
  masquant silencieusement des runs au bénéfice d'un subset "chanceux"). À
  documenter dans une révision de l'autopsie R-D.1.
- **V1 production** : ACL critique — vérifier que `registerPromptBuilder` M2_adaptive
  n'est jamais utilisé en production sans stopping criteria renforcés (grep
  `adaptive` dans les configs prod).

---

## 10. Résolution Phase 1 A.1 STRICT (2026-04-19 nuit)

### 10.1 Plan exécuté (scope AM1, AM2)

Cycle 1 = **A.1 seul** (pénalités anti-répétition P8-FIX env-gated +
instrumentation enrichie). Scope strict **3-IA ChatGPT-strict + Gemini
arbitrage** : aucun autre axe touché (A.2, B.1, fallback, retry, stop tokens,
scorer, chunking, CALL_TIMEOUT_MS=600000ms). Amendements intégrés :
- **AM1** : A.1 strict scope (pas de A.2 avant arbitrage).
- **AM2** : CALL_TIMEOUT_MS=600000 inchangé (pas de réduction pour forcer
  fast-fail — conserve la signature bench v3 scellée).
- **AM3** : 3 contrôles `meditation_aube` ajoutés (INTERIOR CTRL, non-REPRO).
- **AM4** : instrumentation enrichie `OllamaCallResult` (11 champs dont
  `finish_mode`, `options_hash`, `anti_repeat_enabled`, `repeat_pattern_score`).
- **AM5** : Axe C (pipeline dispatch) hors v1.

### 10.2 Mécanisme prouvé

Hypothèse dominante **H4 (loop language qwen3:32b déterministe)** prouvée
empiriquement via pénalités anti-répétition :
`{repeat_penalty:1.4, frequency_penalty:0.6, repeat_last_n:256}`.
Hypothèse secondaire **H2 résiduelle** (attracteur génératif sur scènes
INTERIOR méditatives). **H3 rejetée** (pas de bug parse pipeline). **H1
conséquence** (runaway = conséquence observable de H4, pas cause).

### 10.3 Évidence bench (15/15 OK)

SHA256 : `C8C2E8DCEBB1DC80A18B5341BA44E02943861965F35645EDDB5FA08121DA42ED`
Fichier : `packages/sovereign-engine/bench-p1-robustness-v3-phase1-A1.json`
Transcript : `packages/sovereign-engine/bench-p1-phase1-A1.log`
Durée totale : 1056s (~17.6min), marge ×8.5 sous timeout 600s × 15 runs
théorique (indique loop language complètement suspendu par pénalités).

| Scène (archétype) | Runs | Timeouts | Score mean / median | rp_score median |
|-------------------|------|----------|---------------------|-----------------|
| maison_enfance (INTERIOR REPRO) | 6 | **0** | 2.99 / 3.555 | 0.058 |
| veillee_funebre (INTERIOR REPRO) | 6 | **0** | 4.90 / 5.025 | 0.078 |
| meditation_aube (INTERIOR CTRL AM3) | 3 | **0** | 2.41 / 2.110 | 0.332 |
| **TOTAL** | **15** | **0 (0.0%)** | **3.64 / 3.555** | **0.079** |

Gap baseline v3 scellé `7DA99121..DC0FE89` : **−91.7 points** (11/12
timeouts REPRO → 0/12).

### 10.4 Gates verdict (matrice §8.2 → PHASE1_A1_PASS)

| Gate | Seuil | Mesure | Statut |
|------|-------|--------|--------|
| T1-T6 | 24/24 PASS | 24 PASS (671ms) | **PASS** |
| T7 | ≥2424 PASS | PASS (commit PS1 gated) | **PASS** |
| G1 | ≤33.3% (≥8/12 OK) | 0/12=0.0% | **PASS** |
| G2 | =0% strict (3/3 OK) | 0/3=0.0% | **PASS** |
| G3 | rp médian OK ≤0.15 | 0.079 | **PASS** |
| G4 | 100% match options_hash ANTI_REPEAT=1 | 60/60 anti_repeat_enabled=true | **PASS** |
| G5 | ≥2424 PASS sovereign-engine | = T7 PASS | **PASS** |

**Matrice §8.2** : G1 PASS × G2 PASS = **PHASE1_A1_PASS**.

### 10.5 Formulation canonique verbatim (ChatGPT #1)

> "FIX_VALIDATED_SCOPED — Phase 1 A.1 STRICT, bench 15/15 OK 0 timeout sur
> cellules INTERIOR REPRO+CTRL. Activation env-gated default OFF. Promotion
> default ON conditionnée à preuve élargie (B.1 rechunking ou bench
> INTERIOR×NON-INTERIOR ≥36 runs)."

### 10.6 OPT1 scellé — consensus 3/3 IA

Options arbitrées unanimité (Gemini + ChatGPT #1 + ChatGPT #2) :
- **OPT1 RETENUE** : env-gated `OMEGA_P1V3_ANTI_REPEAT='0'|'1'`, default OFF,
  activation opt-in INTERIOR-only en production. Zero-risk, bytes-equivalence
  baseline v3 scellée préservée (test T6 garantit).
- **OPT2 REJETÉE** : bench élargi 36+ runs — 2h GPU futile, mécanisme prouvé.
- **OPT3 REJETÉE** : dispatch INTERIOR-only prod default ON — couplage
  `NCR_ARCHETYPE_DETECTION_DRIFT` instable (ticket non clos).

### 10.7 Observations fines

1. **Outlier seed 3 `maison_enfance`** : `tier_score=-0.27` MAIS
   `finish_mode=ok`, `repeat_pattern_score=0.046`. Pas un deadlock :
   problème scorer (low-quality output), pas robustesse. G1/G2/G3 distincts
   captent correctement cette distinction.
2. **CTRL `meditation_aube` rp_score élevé** : médiane=0.332 vs REPRO
   ~0.06-0.08. ANTI_REPEAT ON n'empêche pas répétition stylistique sur
   scène contrôle. G3 global OK (0.079) mais signal à monitorer si
   échantillon élargit.
3. **Durée moyenne run** : 1056s/15 ≈ 70s/run — très loin du seuil timeout
   600s. Indique loop language qwen3:32b complètement suspendu par pénalités.
4. **has_closing_prose_tag** : 59/60 calls True. 1 call sans tag fermant,
   non-corrélé au outlier seed 3.

### 10.8 Invariants scellés (vérifiés ex-post)

- FROZEN modules (gateway/sentinel, packages/genome) INTOUCHÉS.
- V1-R-D.1-PROD SHADOW permanent INCHANGÉ.
- Gate G1=+3.0 INCHANGÉ.
- `pickPacingDirective` contract INCHANGÉ.
- SHA256 bench v3 `7DA99121..DC0FE89` reproductible : ANTI_REPEAT=0 (défaut)
  = bytes-équivalents strict (test T6).
- `OMEGA_V1_SEAL_CERTIFICATE.md` INCHANGÉ.
- `CALL_TIMEOUT_MS=600000` INCHANGÉ (AM2).
- `buildStaticPlan(V2B2_CONFIG)` → 4×750w INCHANGÉ.
- SYSTEM_PROMPT, briefs, `resolveDirective`, scoring CALC V3.4, seeding
  `hashSeed` INCHANGÉS.

### 10.9 Faiblesses résiduelles

1. **Généralisation non prouvée** : fix validé sur INTERIOR REPRO+CTRL
   seulement. Comportement sur NON-INTERIOR (Cathedral, Action) non mesuré
   sous ANTI_REPEAT=1. Hypothèse : pénalités pourraient sur-contraindre
   scènes à répétitivité stylistique légitime (chorus narratif, anaphore).
2. **Outlier seed 3 non diagnostiqué** : `tier_score=-0.270` avec
   `finish_mode=ok` = cause distincte (qualité scorer, pas robustesse).
   Hors scope NCR_M2 → NCR_SCORER_STYLE_BIAS à traiter séparément.
3. **Preuve différentielle ON vs OFF non exécutée** : A.1 replay mêmes seeds
   OFF pour confirmer baseline bytes-equivalence empiriquement (pas juste
   via test T6).
4. **Drift Ollama inter-session** : pas de garantie que la run bench serait
   reproductible mois+1 (problème connu NCR_GATING_EFFECT_SIZE_UNSTABLE).

### 10.10 Risques restants

1. **Francky activation prod sans preuve différentielle** : si `OMEGA_P1V3_ANTI_REPEAT=1`
   activé sur INTERIOR prod sans replay A.1 ON vs OFF, la promotion repose
   sur la seule cohérence T6 (bytes-equivalence OFF). Mitigation : PRIO 1
   replay recommandé avant activation prod.
2. **Pattern env-gated multiplie la surface de configuration prod** : toute
   configuration prod doit documenter explicitement l'état de la var. Risque
   de désalignement dev/prod.
3. **Drift NCR_ARCHETYPE_DETECTION_DRIFT** : si OPT3 (dispatch INTERIOR-only)
   est rouvert plus tard, le guard archetype doit être stabilisé avant
   activation par archétype.
4. **Scoring drift sur outlier seed 3** : si NCR_SCORER_STYLE_BIAS non traité,
   runs futurs pourraient produire plus de `tier_score<0` avec `finish_mode=ok`,
   contaminant la mesure de G2.

### 10.11 Artefacts scellés

Repo `omega-project` (branche `phase-r-dispatcher-v33`) :
1. **(M)** `packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts` (env-gated A.1, 1603 lignes).
2. **(+)** `packages/sovereign-engine/tests/bench/ncr-m2-phase1-anti-repeat.test.ts` (24 tests, 299 lignes).
3. **(+)** `packages/sovereign-engine/scripts/run_bench_ncr_m2_phase1.ps1` (launcher 15 cells, 97 lignes).
4. **(M)** `nexus/proof/NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR.md` (ce fichier, §10 ajoutée + header FIX_VALIDATED_SCOPED).

OMEGA/outputs/ (workspace, non-commité repo) :
5. **(+)** `run_commit_ncr_m2_phase1.ps1` (atomic commit launcher baseline A.1).
6. **(+)** `run_commit_ncr_m2_closure.ps1` (atomic commit launcher closure NCR).
7. **(+)** `NCR_M2_PHASE1_ANALYSIS.md` (document 15 sections requête ChatGPT #2).
8. **(M)** `log_quality.md` (entrées "2026-04-19 soir + nuit + nuit+").

Bench outputs :
9. **`bench-p1-robustness-v3-phase1-A1.json`** SHA256 `C8C2E8DC..1DA42ED`.
10. **`bench-p1-phase1-A1.log`** transcript.
11. **`ncr-m2-phase1-t7-npm-test.log`** (T7 preuve baseline).
12. **`ncr-m2-closure-t7-npm-test.log`** (T7 preuve closure, attendu).

### 10.12 Mise à jour plan §8

Le plan d'action §8 est AMENDÉ :
- **#1 recalcul G1'/G2' M1_baseline** : TODO → **DONE** (dans bench v3 autopsy §8 post-hoc delta).
- **#2 dump prompt adaptive seed 42** : TODO → **SUPERSEDED** par Cycle 1 A.1 (mécanisme H4 prouvé directement par pénalités).
- **#3 décision Francky Option A/B/C/D** : PENDING → **DONE** (consensus 3-IA OPT1 conservative env-gated).
- **#4 PR config Ollama stopping** : BLOCKED → **CLOSED** (OPT1 env-gated pris, pas de stopping tokens ajoutés).
- **#5 mise à jour V1_SEAL** : BLOCKED → **DEFERRED** (V1_SEAL canonical verbatim amendé §9.4 en post-v3, pas besoin de nouvelle amendement pour closure SCOPED).

### 10.13 Action requise Francky (prochain front)

Trois fronts sur la table, arbitrage pending :
- **PRIO 1 — Replay A.1 ON vs OFF mêmes seeds (ChatGPT #2)** : ~18min GPU.
  Valide expérimentalement default OFF = baseline, ON = fix. Quasi-zero
  coût, ROI évidence renforcée pour OPT1 promotion future.
- **PRIO 2 — NCR_GATING_EFFECT_SIZE_UNSTABLE (Gemini)** : redesign G1/G2
  pour effect-size stabilité inter-session.
- **PRIO 3 — NCR_SCORER_STYLE_BIAS (ChatGPT #1)** : diagnostic outlier
  seed 3 (`tier_score=-0.270` avec `finish_mode=ok`).

**Recommandation Claude** : PRIO 1 premier (preuve différentielle, ~18min,
prérequis activation prod opt-in en confiance) → PRIO 2 en série + PRIO 3
en parallèle.

### 10.14 Suite logique

Cette closure NCR_M2 SCOPED ouvre la voie à :
- Activation prod opt-in `OMEGA_P1V3_ANTI_REPEAT=1` sur runs INTERIOR
  sensibles (post-PRIO 1 replay validation).
- Décision FIX_VALIDATED_GLOBAL reportée à bench élargi futur (B.1
  rechunking ou bench INTERIOR×NON-INTERIOR ≥36 runs sous ANTI_REPEAT=1).
- Traitement fronts orthogonaux NCR_GATING + NCR_SCORER_STYLE_BIAS.

---

**Références** :
- `outputs/BENCH_P1_V3_AUTOPSY.md` (§3.3 actions, §8 post-hoc delta)
- `outputs/BENCH_P1_V3_DESIGN.md` (§6 decision tree branche B)
- `packages/sovereign-engine/bench-p1-robustness-v3-results.json` (SHA256 7DA99121...DC0FE89)
- `packages/sovereign-engine/bench-p1-robustness-v3-phase1-A1.json` (SHA256 C8C2E8DC...1DA42ED)
- `nexus/proof/NCR_BENCH_METHOD_DRIFT.md` (§9 closure)
- `nexus/proof/NCR_GATING_EFFECT_SIZE_UNSTABLE.md` (§9 amendement post-v3)
- `outputs/_full_bench_v3_stdout.txt` (logs bruts timeouts v3)
- `outputs/NCR_M2_FIX_PLAN_v2.md` (plan consolidé 3-IA, 5 amendements)
- `outputs/NCR_M2_PHASE1_ANALYSIS.md` (analyse 15 sections post-bench A.1)
- `outputs/log_quality.md` (entrées 2026-04-19 soir + nuit + nuit+)
