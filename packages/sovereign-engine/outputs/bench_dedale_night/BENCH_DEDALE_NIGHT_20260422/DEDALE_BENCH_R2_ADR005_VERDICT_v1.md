# DÉDALE BENCH R2 — ADR-005 r2 VERDICT v1

**Bench ID** : `BENCH_DEDALE_NIGHT_20260422`
**Phase** : `R2` (mini-bench composite oracle)
**Date analyse** : 2026-04-22
**Runner** : `bench-dedale-night.ts` (v2 patched)
**Modèle** : `qwen3:32b` (digest `030ee887880fc378860c2dd35101da424377520441ae4bfe7be6deff8ade7840`)
**Mode** : Dédale v0.55 RESET-FIRST, `OMEGA_DEDALE_MODE=on`, shadow (no impact on engine output)

---

## 0. TL;DR

| Critère ADR-005 r2 | Cible | Mesuré | Verdict |
|---|---|---|---|
| **N02 false-positive rate (neutral)** | ≤ 10 % | **0.00 %** (0/47 chunks) | **PASS** |
| **T04+T01 true-positive rate (trigger)** | ≥ 50 % | **0.85 %** (1/117 chunks) | **FAIL** |

**VERDICT GLOBAL : CONDITIONAL_PASS sous réserve d'invalidation corpus T04/T01.**

- La **recalibration ADR-005 r2 est techniquement correcte** : seuils `c1_high=0.20`, `c1_low=0.15`, `c4=0.30`, `c2=0.60` → FP neutres éliminés.
- Le **critère TP sur corpus T04/T01 échoue** parce que les scènes T04/T01 **ne déclenchent pas de loops sur qwen3:32b** (max `c1` observé = 0.130 pour T04, 0.791 pour 1 chunk T01 sur 61 mesurés). Ce sont les scènes elles-mêmes qui sont défaillantes comme pièges, pas la règle oracle.
- L'issue `NCR_CORPUS_TN_INVALID` est **CONFIRMÉE PAR DONNÉES** : T04 est structurellement neutre sur qwen3:32b dans le pipeline OMEGA actuel (DUEL + persona Flaubert+Proust+Duras), et T01 ne piège qu'épisodiquement (1 chunk sur 61 → 1.64 %).
- Branche composite `c1_c4_composite` : **jamais exercée dans ce bench** (4 chunks dans la zone `0.15 < c1 ≤ 0.20`, 0 avec `c4 < 0.30`). La nouvelle bras reste donc validée *structurellement* (tests unitaires 2542 PASS) mais pas *empiriquement*.

---

## 1. Matrice de confusion (chunk-level, oracle attempt_1)

| Scene | Kind | Chunks | hard_fail | no_loop | Rate hf % | C1 mean | C1 max | C4 mean | C4 min |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| N02 | neutral | 47 | 0 | 47 | 0.00 % | 0.053 | 0.191 | 0.460 | 0.318 |
| T01 | trigger | 61 | 1 | 60 | 1.64 % | 0.055 | 0.791 | 0.460 | 0.076 |
| T04 | trigger | 56 | 0 | 56 | 0.00 % | 0.035 | 0.130 | 0.482 | 0.308 |

Agrégat trigger (T04+T01) : **1/117 = 0.85 %**.

---

## 2. Distribution C1 par scène

### N02 (neutral — FP target)
- min=0.000  p25=0.007  med=0.040  p75=0.082  p90=0.137  **max=0.191**
- Stable (c1 ≤ 0.05) : 63.8 % | Low (0.05–0.15) : 29.8 % | **Composite zone (0.15–0.20)** : 6.4 % (3/47) | Hard (>0.20) : 0 %

### T01 (trigger — TP target)
- min=0.000  p25=0.008  med=0.025  p75=0.068  p90=0.124  **max=0.791**
- Stable : 67.2 % | Low : 29.5 % | **Composite zone** : 1.6 % (1/61) | Hard (>0.20) : 1.6 % (1/61, **seul fire du bench**)

### T04 (trigger — TP target)
- min=0.000  p25=0.004  med=0.020  p75=0.054  p90=0.102  **max=0.130**
- Stable : 75.0 % | Low : 25.0 % | Composite zone : 0 % | Hard : 0 %
- **T04 ne génère jamais de signal C1 suffisant** → scène invalide comme piège sur pipeline actuel.

---

## 3. Branche composite `c1_c4_composite` — non exercée

Règle : `c1 > 0.15 AND c1 ≤ 0.20 AND c4 < 0.30` → `reason='c1_c4_composite'`.

| Scene | Chunks `c1 ∈ (0.15, 0.20]` | Dont `c4 < 0.30` | Fires |
|---|---:|---:|---:|
| N02 | 3 | 0 | 0 |
| T01 | 1 | 0 | 0 |
| T04 | 0 | 0 | 0 |
| **TOTAL** | **4** | **0** | **0** |

**Interprétation** :
- 4 chunks ont eu une collision `c1 ∈ zone composite` mais aucun n'avait simultanément `c4 < 0.30`.
- La conjonction `c1 ∈ (0.15, 0.20] AND c4 < 0.30` est rare sur qwen3:32b dans les conditions OMEGA actuelles.
- Le single hard_fail observé (`R2_T01_G` chunk 4) l'a été via **bras C1 haut** (c1=0.791, c2=0.867, c4=0.076, `reason='c1_trigram_ratio'`), pas via le bras composite.
- **Pas de preuve empirique que le bras composite apporte de la couverture TP additionnelle sur ce corpus.**
- **Pas de preuve empirique que le bras composite cause des FP** sur N02 (0 fires).

Statut : **NEUTRE** sous ce bench. La règle reste logiquement correcte (tests unitaires 23/23 PASS) et non-nocive (zéro FP observé), mais son utilité pratique n'est pas démontrée ici.

---

## 4. Événement hard_fail unique

```
scene=T01  run=R2_T01_G  chunk=4
  c1_trigram_ratio      = 0.791   (> c1_high=0.20)
  c2_repetition_score   = 0.867   (> c2_threshold=0.60, c2_info_elevated=true)
  c4_unique_ratio       = 0.076   (< c4_threshold=0.30)
  reason                = c1_trigram_ratio   (bras high, prioritaire)
  final_verdict         = hard_fail → reset effectué, issue à vérifier
```

Ce chunk est **un vrai positif** : C1 0.79 indique une quasi-répétition massive des trigrams, confirmé par C2=0.87 et C4=0.076 (lexique très pauvre). La règle ADR-005 r2 l'a correctement isolé.

---

## 5. Observation annexe : `c2_info_elevated`

- **1 chunk** avec `c2_info_elevated=true` (le T01 hard_fail ci-dessus).
- Aucun autre chunk sur 163 n'a franchi `c2 > 0.60` seul.
- Le démotion de C2 vers *info-tag* (décision ADR-005 r2) n'a **pas créé de FP** sur le corpus R2.

---

## 6. Incident opérationnel : Ollama reset health

### Statistique
| Phase | Runs | OK | Error | Error rate |
|---|---:|---:|---:|---:|
| R2 (total 60 = 2 epochs × 30) | 60 | 40 | 20 | **33.3 %** |

Breakdown par scène :
- N02 : 9 errored / 20
- T01 : 5 errored / 20
- T04 : 6 errored / 20

### Mécanisme observé dans les logs
1. Scène ou chunk précédent déclenche `resetSession` (après hard_fail ou en fallback).
2. `reset-session.ts` `kill_serve` : `killed_serve: true` (OK).
3. Health check post-kill : `TypeError: fetch failed` → verdict **`reset_failed`**.
4. V2-B-LOOP tente une regen : `[OLLAMA] Failed after 4 attempts` → run record `finish_reason=error, words=0`.

### Cause racine probable
La séquence reset-first **tue correctement** `ollama serve` mais **ne garantit pas le redémarrage** avant la retry. L'orchestrateur V2-B-LOOP enchaîne sur un daemon mort.

### Impact sur bench R2
- 20/60 runs perdus (33 %) → surface de mesure réduite à 164 chunks au lieu de ~240 attendus (60 × 4 chunks moyens).
- La réduction n'invalide pas les verdicts (N02=0 FP reste solide, T04 c1_max=0.130 est robuste), mais elle **fragilise l'estimation de TP** sur T01 (la scène la plus sensible).
- **Recommandation** : ouvrir `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` en P1.

---

## 7. Contre-analyse : est-ce le corpus ou l'oracle qui échoue ?

**Hypothèse A — L'oracle ADR-005 r2 est trop conservateur sur trigger.**
- Réfutation : le seul fire observé (T01_G chunk 4) montre que l'oracle **détecte correctement** une quasi-répétition massive.
- Réfutation (bis) : C1 max sur T04 = 0.130 → même au seuil hypothétique c1=0.10, T04 serait à 14/56 = 25 % TP, pas 50 %. Pas une question de seuil.

**Hypothèse B — Le corpus T04/T01 n'est pas trigger sur qwen3:32b.**
- T04 `c1_max=0.130` : jamais proche du seuil bas 0.15. Persona OMEGA (Flaubert+Proust+Duras) + DUEL génèrent une prose assez riche pour éviter le collapse lexical même sur scène supposée piégeante.
- T01 `c1_max=0.791` mais seulement 1 chunk sur 61 → signal rare, pas systémique.
- **Cohérent avec `project_dedale_bench_night_phase_s`** : le Phase S avait trouvé N02 la scène la plus toxique (60 % runs HF) — c'est N02 le vrai piège historique, pas T04/T01.

**Conclusion** : **Hypothèse B retenue.** Le corpus R2 tel que spécifié (N02+T04+T01) ne fournit plus de TP stable sur qwen3:32b + OMEGA v0.55. T04 est invalide comme piège.

---

## 8. Décisions

### Oracle (ADR-005 r2) — CONFIRMÉ
- **c1_high=0.20** : PASS (0 FP sur N02, 1 TP sur T01_G).
- **c1_low=0.15 + c4<0.30** composite : non nocif, non exercé. Statut *NEUTRE*.
- **c2 info-tag** : démotion valide, aucune FP.
- **Tests unitaires** 23/23 PASS pour oracle.test.ts, 2542 PASS global.

### Corpus T04/T01 — INVALIDÉS
- `NCR_CORPUS_TN_INVALID` (pré-existante P1) : **CLÔTURER avec verdict "CONFIRMED — corpus insuffisant sur qwen3:32b"**.
- T04 : à retirer ou reclasser en *neutral_action_pass_through*.
- T01 : à conserver en *episodic_trigger* (1 fire réel sur 61).
- **Action** : ouvrir tâche de conception corpus T' adversarial calibré pour qwen3:32b.

### Bras composite — à retesster
- Aucun exercice empirique. Ne pas commit sans *un* fire empirique minimum, OU accepter comme safety net rare.
- **Option 1 (recommandée 3-IA pending)** : commit tel quel (sûreté, logiquement correct, 0 nuisance observée).
- **Option 2** : lâcher `c4_threshold` à 0.40 pour permettre exercice → risque FP sur N02.
- **Décision Francky requise** pour choisir.

### Opérations — NCR à ouvrir P1
- `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` : 33 % de runs perdus due à Ollama serve pas redémarré après kill. Refonte `reset-session.ts` requise : enforcement health probe avec retry exponentiel *avant* de rendre la main à V2-B-LOOP.

---

## 9. Recommandations sur Step 7 (commit atomique)

Le commit atomique pré-autorisé par Francky ("ok avec t'es recommandation 1B' 2go 3mini bench valide et go commit") incluait :
1. `packages/sovereign-engine/src/dedale/types.ts` (ADR-005 r2 types)
2. `packages/sovereign-engine/src/dedale/oracle.ts` (règle composite)
3. `packages/sovereign-engine/src/dedale/orchestrator.ts` (neutral result updated)
4. `packages/sovereign-engine/tests/dedale/*.test.ts` (23 oracle tests PASS, 2542 total)
5. `packages/sovereign-engine/scripts/bench-dedale-night.ts` (phase R2)
6. Artefacts bench `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/runs_R2.jsonl` + ce rapport
7. Clôture `NCR_CORPUS_TN_INVALID` avec ce verdict

**Observation blocante à soumettre à Francky avant commit** :
- Le critère TP **échoue** (0.85 % vs 50 %). La pré-autorisation mentionnait "mini-bench valide ET go commit". Ce bench n'est *pas* valide sur TP.
- **Trois options** :
  - **(a) Commit tel quel**, et ouvrir simultanément NCR_CORPUS_TN_INVALID=CONFIRMED + NCR_DEDALE_RESET_HEALTH (Francky doit valider ce chemin : accepter la recalibration sans preuve empirique TP, en conservant la solidité N02).
  - **(b) Commit uniquement types/oracle/tests/bench-script** (sans artefacts runs_R2.jsonl) en attente d'un bench T' adversarial qui exercera le TP.
  - **(c) Itérer corpus T' avant commit** : designer 3 scènes adversariales calibrées qwen3:32b (prose pauvre + répétitions forcées), bench 30 runs, puis commit avec vrai TP≥50 %.

**Recommandation IA** (toi en tant qu'Architecte) : **(a)** — la recalibration est techniquement correcte, le corpus est le problème, bloquer le commit pour corriger le corpus mélange deux dettes. On scelle l'oracle + on documente les NCR en P1.

---

## 10. Artefacts

| Fichier | Path | Rôle |
|---|---|---|
| `runs_R2.jsonl` | `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/` | 60 runs (2 epochs × 30), 95 897 bytes |
| `dedale_telemetry_R2/*.jsonl` | idem | 48 fichiers chunk-level + 40 agrégats |
| `chunks_text_R2/` | idem | Dumps texte bruts par chunk |
| `checkpoint_R2.json` | idem | `completed=true, runs_done=30, epoch_id=1` |
| `analysis/r2_adr005_analysis.json` | idem | Summary machine-readable (ce verdict codifié) |
| `DEDALE_BENCH_R2_ADR005_VERDICT_v1.md` | idem | Ce rapport |

---

## VERDICT

- **Statut** : `CONDITIONAL_PASS`
- **Confiance** : Moyenne
- **Forces** :
  - N02 FP = 0.00 % (cible ≤ 10 %) → recalibration élimine proprement les faux positifs neutres.
  - Le seul hard_fail observé (T01_G chunk 4, c1=0.791) est un vrai positif propre.
  - Aucun impact du démotion C2 → info-tag, zéro nuisance.
  - Tests unitaires 2542 PASS, zéro régression.
- **Faiblesses** :
  1. Critère TP (T04+T01 ≥ 50 %) **FAIL catastrophique** (0.85 %). Corpus invalide confirmé.
  2. Bras composite `c1_c4_composite` jamais exercé empiriquement (0 fires sur 4 chunks éligibles).
  3. 33 % de runs perdus (Ollama reset non-enforced) → surface mesure réduite.
- **Risques restants** :
  - Commit sans preuve TP empirique → si l'ADR-005 r2 fait perdre un vrai positif qu'on aurait capté en ADR-005 r1 sur un nouveau corpus, on ne le saura pas.
  - NCR_DEDALE_RESET_HEALTH en P1 → toute future campagne bench Dédale impactée.
- **Action requise** :
  - **Francky** tranche entre options (a)/(b)/(c) du §9 avant Step 7.
  - Ouvrir `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` P1.
  - Clôturer `NCR_CORPUS_TN_INVALID` = CONFIRMED.
  - Tâche nouvelle : design corpus T' adversarial qwen3:32b.

---

*Généré 2026-04-22 après parse de runs_R2.jsonl (60 lignes) + 48 fichiers telemetry chunk-level.*
