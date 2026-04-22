# DÉDALE BENCH R2 — ADR-005 r2 VERDICT v2 (Strict dissocié)

**Bench ID** : `BENCH_DEDALE_NIGHT_20260422`
**Phase** : `R2` (mini-bench composite oracle)
**Date analyse** : 2026-04-22
**Rev** : v2 (post-arbitrage 3-IA : Francky + Gemini + ChatGPT)
**Supersede** : `DEDALE_BENCH_R2_ADR005_VERDICT_v1.md` (conservé comme trace historique)
**Runner** : `bench-dedale-night.ts` v2 patched (sha256 `941a9eb0…`)
**Modèle** : `qwen3:32b` (digest `030ee887880fc378860c2dd35101da424377520441ae4bfe7be6deff8ade7840`)
**Mode** : Dédale v0.55 RESET-FIRST, `OMEGA_DEDALE_MODE=on`, shadow

---

## 0. Pourquoi une v2

Le verdict v1 portait une étiquette globale `CONDITIONAL_PASS` qui **mélangeait
4 axes distincts** : critère bench, décision oracle, corpus, opérations.
L'arbitrage 3-IA (Gemini + ChatGPT, convergent sur **option (a) commit atomique
total**) a imposé la formulation stricte dissociée suivante (ChatGPT verbatim,
traduction OMEGA) :

> « En OMEGA, il faut trancher. Donc : R2 bench verdict : FAIL, Oracle
> recalibration decision : COMMIT, Corpus TN verdict : INVALID / CONFIRMED,
> Reset health verdict : OPEN NCR P1. »

Cette v2 remplace le verdict global ambigu par **quatre verdicts atomiques
orthogonaux**, chacun tranché sans compromis.

---

## 1. Les quatre verdicts dissociés

### 1.1 R2 BENCH VERDICT — **FAIL**

**Statut** : FAIL (au sens validation empirique du critère ADR-005 r2).
**Confiance** : Haute.

| Critère ADR-005 r2 | Cible | Mesuré | Axe |
|---|---|---|---|
| N02 false-positive rate (neutral) | ≤ 10 % | **0.00 %** (0/47 chunks) | PASS |
| T04+T01 true-positive rate (trigger) | ≥ 50 % | **0.85 %** (1/117 chunks) | **FAIL** |
| Absence de régression (zéro FP ≥ c1_high) | 0 | 0 | PASS |

**Raison du FAIL** : le critère TP global n'est pas atteint sur le corpus
mini-bench R2. **Un bench FAIL n'implique pas une règle FAIL.** Il peut
signifier (comme ici) un corpus défaillant — ce que tranche le verdict §1.3.

### 1.2 ORACLE RECALIBRATION DECISION — **COMMIT** (sous statut opérationnel)

**Statut** : COMMIT.
**Confiance** : Haute sur la sûreté, Moyenne sur le gain TP.
**Statut ADR-005 r2** : transition `PROPOSED → PROPOSED-OPERATIONAL` (accepted
for safety, provisional).

Justification (consensus 3-IA) :
- **N02 zéro FP (0/47)** prouve la non-nuisance de la règle composite sur la
  scène neutre historiquement la plus toxique (Phase S : 60 % runs HF à seuil
  c1=0.15 plat).
- **T01_G chunk 4** (c1=0.791, c4=0.076) est un vrai positif propre, reason =
  `c1_trigram_ratio` → bras haut fonctionnel.
- **Démotion C2 → info-tag** : zéro FP observé, 1 info-tag unique cohérent
  avec le hard_fail C1 — validée.
- **Bras composite `c1_c4_composite`** : logiquement correct (23/23 tests PASS),
  non-nocif (0 FP / 4 chunks éligibles), non-exercé empiriquement (0 fires).
  Conservé **en tant que safety net rare**.
- Tests totaux sovereign-engine : **2542 PASS** (zéro régression).

**Non-scellé** (pas de tag SCELLÉ r3 sur ADR) : la règle passe en
`PROPOSED-OPERATIONAL`. Le scellage r4 est conditionné à un bench TP≥50 % sur
**corpus T'** après fix `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED`.

### 1.3 CORPUS TN VERDICT — **INVALID / CONFIRMED**

**Statut** : INVALID / CONFIRMED.
**Confiance** : Haute.
**NCR** : `NCR_CORPUS_TN_INVALID.md` → **CLOSED_CONFIRMED**.

Données empiriques chunk-level (R2) :

| Scène | Kind | Chunks | hard_fail | Rate | c1_max | c4_min | Diagnostic |
|---|---|---:|---:|---:|---:|---:|---|
| N02 | neutral | 47 | 0 | 0.00 % | 0.191 | 0.318 | OK — FP propre |
| T04 | trigger | 56 | **0** | **0.00 %** | **0.130** | 0.308 | **INERT** (jamais proche 0.15) |
| T01 | trigger | 61 | 1 | 1.64 % | 0.791 | 0.076 | RARE-TRIGGER (1/61) |

- **T04** : jamais piège mesurable sur qwen3:32b + OMEGA DUEL. À retirer ou
  reclasser en `neutral:action_pass_through`.
- **T01** : piège épisodique (1 fire réel). Insuffisant pour validation
  statistique (CI 95 % sur rate 1.64 % demande n ≥ 100 chunks indépendants).
- **N02** : préservée en `neutral:reference_fp_baseline` pour non-régression
  FP future.

**Chantier successeur (ouvert, non bloquant)** : design corpus T' adversarial
calibré qwen3:32b (critères de sélection scellés dans
`NCR_CORPUS_TN_INVALID.md` §« Chantier successeur »).

### 1.4 RESET HEALTH VERDICT — **OPEN NCR P1**

**Statut** : OPEN.
**Severité** : HIGH (P1).
**NCR** : `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED.md` → **OPEN**.
**Impact** : 20/60 runs R2 perdus (33.3 %) — toute future campagne bench
Dédale impactée tant que non corrigé.

Mécanisme documenté :
1. `reset-session.ts` tue correctement `ollama serve` (`killed_serve: true`).
2. Health check post-kill échoue (`TypeError: fetch failed`), verdict
   `reset_failed`.
3. V2-B-LOOP enchaîne retry génération, épuise 4 tentatives sur daemon mort.
4. Run record : `finish_reason=error, words=0, dedale=n/a`.

**Plan de remédiation** (voir NCR §Plan) : Option 1 enforcement restart +
health probe exponentiel prioritaire, Option 2 circuit breaker V2-B-LOOP en
défense en profondeur.

**Critère d'acceptance fix** : prochain bench Dédale (30+ runs) avec error
rate < 5 %.

---

## 2. Matrice de confusion complète (chunk-level, attempt_1)

Cohérente avec v1 §1 (inchangée, données d'origine).

| Scene | Kind | Chunks | hard_fail | no_loop | Rate hf % | C1 mean | C1 max | C4 mean | C4 min |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| N02 | neutral | 47 | 0 | 47 | 0.00 % | 0.053 | 0.191 | 0.460 | 0.318 |
| T01 | trigger | 61 | 1 | 60 | 1.64 % | 0.055 | 0.791 | 0.460 | 0.076 |
| T04 | trigger | 56 | 0 | 56 | 0.00 % | 0.035 | 0.130 | 0.482 | 0.308 |

Agrégat trigger (T04+T01) : **1/117 = 0.85 %**.

---

## 3. Bras composite `c1_c4_composite` — statut NEUTRE

Règle : `c1 ∈ (0.15, 0.20] AND c4 < 0.30` → `reason = c1_c4_composite`.

| Scène | Chunks `c1 ∈ (0.15, 0.20]` | Dont `c4 < 0.30` | Fires |
|---|---:|---:|---:|
| N02 | 3 | 0 | 0 |
| T01 | 1 | 0 | 0 |
| T04 | 0 | 0 | 0 |
| **TOTAL** | **4** | **0** | **0** |

**Interprétation** :
- 4 chunks dans la zone composite, aucun avec `c4 < 0.30` simultané.
- La conjonction est rare sur qwen3:32b dans les conditions OMEGA actuelles
  (persona forte + DUEL N=7 dilue le collapse lexical).
- Le fire unique observé (T01_G chunk 4) a franchi le **bras C1 haut**
  (c1=0.791) → bras composite non impliqué.
- Statut **NEUTRE** : règle logiquement correcte (tests 23/23 PASS),
  non-nocive (zéro FP), utilité pratique non démontrée. Conservée comme
  safety net rare.

---

## 4. Événement hard_fail unique

```
scene=T01  run=R2_T01_G  chunk=4
  c1_trigram_ratio      = 0.791   (> c1_high=0.20)
  c2_repetition_score   = 0.867   (> c2_threshold=0.60, c2_info_elevated=true)
  c4_unique_ratio       = 0.076   (< c4_threshold=0.30)
  reason                = c1_trigram_ratio   (bras haut, prioritaire)
  final_verdict         = hard_fail → reset effectué
```

Vrai positif propre : quasi-répétition massive (C1 ~79 %), confirmée par C2
et C4. L'oracle ADR-005 r2 isole correctement ce type de pathologie.

---

## 5. Incident opérationnel : Ollama reset health

| Phase | Runs | OK | Error | Error rate |
|---|---:|---:|---:|---:|
| R2 (total 60 = 2 epochs × 30) | 60 | 40 | 20 | **33.3 %** |

Breakdown par scène : N02 9/20, T01 5/20, T04 6/20 erreurs.

Détails mécanisme et plan de fix → `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED.md`.

---

## 6. Contre-analyse — pourquoi FAIL TP ≠ FAIL règle

**Hypothèse A — oracle trop conservateur sur trigger** : **RÉFUTÉE**.
- T01_G chunk 4 : fire propre → l'oracle *détecte* correctement les
  pathologies réelles.
- T04 c1_max=0.130 : même à un seuil hypothétique c1=0.10, T04 n'atteindrait
  que 14/56 = 25 % TP, pas 50 %. Pas un problème de seuil.

**Hypothèse B — corpus T04/T01 n'est pas trigger sur qwen3:32b** : **RETENUE**.
- T04 : pipeline OMEGA (K2 Chunked + persona Flaubert+Proust+Duras + DUEL N=7)
  dilue l'entrée suffisamment pour éviter le collapse lexical même sur scène
  nominalement adversariale.
- T01 : fire rare mais réel — signal existant mais pas systémique, n
  insuffisant.
- Phase S historique : **N02 était la vraie scène toxique** (60 % runs HF à
  seuil c1=0.15 plat) — et la recalibration r2 l'a désactivée comme prévu.
  T04/T01 n'ont jamais produit ces taux de déclenchement historiques.

**Conclusion** : le FAIL TP est **attribuable au corpus**, pas à la règle.
D'où la dissociation stricte §1.

---

## 7. Scellage conditionnel pour `r4` (future)

L'ADR-005 `r3` (amendement 2026-04-22 dans
`docs/DEC-20260422-005-ORACLE-THRESHOLDS-RECALIBRATION.md`) fixe explicitement
les conditions pour un éventuel scellage `r4` :

1. `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` **closed + fix déployé** (error rate
   < 5 % prouvé sur ≥ 30 runs).
2. **Corpus T' adversarial** designed + empiriquement mesuré (3 à 5 scènes
   avec c1_max ≥ 0.20 sur ≥ 30 % chunks OU c1 ∈ [0.15, 0.20] ET c4 < 0.30 sur
   ≥ 40 % chunks, reproductibilité ≥ 2 seeds).
3. Re-bench Dédale (≥ 30 runs) avec ADR-005 r2 → **TP ≥ 50 %** prouvé.
4. Ajout d'un test de non-régression FP baseline sur N02 (c1_max < 0.20).

Tant que ces 4 conditions ne sont pas remplies, la règle reste en
`PROPOSED-OPERATIONAL` — acceptée en production mais non scellée.

---

## 8. Artefacts scellés R2

| Fichier | Path | Rôle |
|---|---|---|
| `runs_R2.jsonl` | `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/` | 60 runs (2 epochs × 30), 95 897 bytes |
| `dedale_telemetry_R2/*.jsonl` | idem | 48 fichiers chunk-level + 40 agrégats |
| `chunks_text_R2/` | idem | Dumps texte bruts par chunk |
| `checkpoint_R2.json` | idem | `completed=true, runs_done=30, epoch_id=1` |
| `analysis/r2_adr005_analysis.json` | idem | Summary machine-readable |
| `DEDALE_BENCH_R2_ADR005_VERDICT_v1.md` | idem | Trace historique (CONDITIONAL_PASS) |
| `DEDALE_BENCH_R2_ADR005_VERDICT_v2.md` | idem | **Ce rapport** (strict dissocié) |
| `../../../../docs/DEC-20260422-005-ORACLE-THRESHOLDS-RECALIBRATION.md` | repo root `docs/` | ADR r1+r2+r3 amendé |
| `../../../../nexus/proof/NCR_CORPUS_TN_INVALID.md` | repo root `nexus/proof/` | CLOSED_CONFIRMED |
| `../../../../nexus/proof/NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED.md` | idem | OPEN P1 |

---

## 9. VERDICT FINAL — Quatre axes orthogonaux

```
R2 BENCH            : FAIL               (TP 0.85 % vs cible ≥ 50 %)
ORACLE DECISION     : COMMIT              (PROPOSED-OPERATIONAL, non scellé r3)
CORPUS TN           : INVALID / CONFIRMED (NCR closed)
RESET HEALTH        : OPEN NCR P1         (33 % runs perdus, fix requis)
```

- **Forces** :
  - Dissociation 4 axes évite le malentendu CONDITIONAL_PASS global.
  - N02 FP=0.00 % prouve la sûreté de la recalibration.
  - Fire unique T01_G chunk 4 est un vrai positif propre.
  - Tests 2542 PASS zéro régression.
  - Arbitrage 3-IA (Gemini + ChatGPT) unanime sur option (a) commit.

- **Faiblesses** :
  1. Aucune preuve empirique de TP ≥ 50 % — le scellage r3 est différé.
  2. Bras composite `c1_c4_composite` jamais exercé (0 fires / 4 chunks).
  3. 33 % runs perdus (reset non-enforced) fragilise la surface de mesure.

- **Risques restants** :
  - Si ADR-005 r2 fait perdre un vrai positif qu'on aurait capté en r1 sur
    un nouveau corpus, on ne le saura pas tant que le bench T' n'a pas
    tourné. Mitigation : r2 reste PROPOSED-OPERATIONAL, `r1` consultable dans
    historique Git si besoin de rollback.
  - `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` bloque de fait toute campagne
    bench Dédale ≥ 30 runs tant que non corrigé.

- **Action requise** :
  - **Step 7 commit atomique** (pré-autorisé Francky « go autonome ») :
    merge oracle ADR-005 r2 + tests + bench R2 phase + ADR r3 + 2 NCRs.
  - Post-commit : ouvrir tâches successeur (1) fix reset health, (2) design
    corpus T' adversarial.
  - Sceller `r4` quand les 4 conditions §7 sont réunies.

---

*Généré 2026-04-22 — post-arbitrage 3-IA, formulation stricte ChatGPT
verbatim appliquée. Remplace v1 sans invalider les données (v1 conservé
comme trace historique du raisonnement pré-arbitrage).*
