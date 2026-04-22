# NCR-CORPUS-TN-INVALID

**Opened**: 2026-04-22 (matin, suite bench shadow Phase S nuit 2026-04-21→22)
**Severity**: MEDIUM (P1) — bench validation Dédale non fiable tant que corpus T faux
**Status**: **CLOSED_CONFIRMED** (2026-04-22, post bench R2 30 runs → 60 runs effectifs sur qwen3:32b)
**Owner**: Claude Code (IA Principal) → chantier corpus T' ouvert pour successeur

---

## Clôture (2026-04-22, mini-bench R2 ADR-005 r2)

**Verdict** : `CORPUS_TN_INVALID_CONFIRMED` — scope T04 (inert), T01 (rare-trigger).

### Evidence empirique (chunk-level, R2)

- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/runs_R2.jsonl` (60 runs, 95 897 bytes)
- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/DEDALE_BENCH_R2_ADR005_VERDICT_v1.md` (verdict détaillé)
- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/analysis/r2_adr005_analysis.json`

### Mesures (164 chunks, oracle attempt_1, ADR-005 r2 seuils c1_high=0.20, c1_low=0.15, c4=0.30)

| Scene | Kind | Chunks | hard_fail | Rate | c1_max | c4_min | Diagnostic |
|---|---|---:|---:|---:|---:|---:|---|
| N02 | neutral | 47 | 0 | 0.00 % | 0.191 | 0.318 | OK (FP propre) |
| **T04** | trigger | 56 | **0** | **0.00 %** | **0.130** | 0.308 | **INERT — jamais proche seuil bas 0.15** |
| T01 | trigger | 61 | 1 | 1.64 % | 0.791 | 0.076 | RARE-TRIGGER (1 fire sur 61) |

**TP agrégé T04+T01** : 1/117 = **0.85 %** (cible ADR-005 r2 ≥ 50 %).

### Conclusion causale

Sur pipeline OMEGA actuel (DUEL + persona Flaubert+Proust+Duras + K2 Chunked)
appliqué à qwen3:32b (digest `030ee887880fc378860c2dd35101da424377520441ae4bfe7be6deff8ade7840`) :

1. **T04** ne produit JAMAIS de signal de répétition mesurable. La prose
   générée reste riche lexicalement même sur la scène supposée piégeante
   (c1_max sur 56 chunks = 0.130, bien en-dessous du seuil bas 0.15).
2. **T01** piège épisodiquement (1 fire sur 61 = 1.64 %) — signal
   existant mais pas systémique, insuffisant comme test statistique.
3. **N02** reste la seule scène historiquement toxique (voir Phase S :
   60 % runs HF) — et la recalibration ADR-005 r2 l'a désactivée.

### Corollaire

Le corpus `BENCH_CORPUS` dans `packages/sovereign-engine/scripts/bench-dedale-night.ts`
scène `T04` et `T01` **ne peut plus servir** comme piège TP pour Dédale.

---

## Issue initiale (contexte)

**Problème constaté** : le bench Phase S nuit 2026-04-21→22 (120 runs
qwen3:32b, 4h46) a révélé que N02 (scène neutre) déclenchait C1 dans
~60 % des runs au seuil historique (0.15 plat), ce qui invalidait la
taxonomie du corpus T/N — les "neutral" tiraient plus que les "trigger".

La recalibration ADR-005 r2 visait à corriger les seuils oracle pour
rétablir la spécificité, mais le mini-bench R2 révèle que le problème
est **double** :
- (résolu) seuils oracle trop agressifs → ADR-005 r2 corrige
- (persistant) corpus T04/T01 n'est pas piégeant sur qwen3:32b

---

## Mécanisme causal (corpus T faux)

Hypothèses éliminées :
- (rejetée) Oracle trop conservateur : seul fire observé (T01_G chunk 4,
  c1=0.791) montre que l'oracle détecte bien les vrais positifs.
- (rejetée) Seuils trop hauts : même à c1_low=0.10 hypothétique, T04
  serait à 14/56 = 25 %, pas 50 %. Pas une question de seuil.

Hypothèse retenue (validée par données) :
- **T04 et T01 ne forcent pas d'effondrement entropique sur qwen3:32b**
  dans le pipeline OMEGA actuel. La combinaison K2 Chunked + persona
  fort + DUEL N=7 dilue suffisamment l'entrée pour éviter le collapse
  lexical même sur scènes adversariales nominales.

---

## Décisions & plan de remédiation

### Scellée (2026-04-22, consensus 3/3 IA)

1. **T04** : retirer ou reclasser en `neutral:action_pass_through`.
2. **T01** : conserver en `episodic_trigger` (1 fire réel confirmé sur 61).
3. **N02** : conserver en `neutral:reference_fp_baseline` (validation
   non-régression FP sur future recalibrations).

### Chantier successeur — corpus T' adversarial qwen3:32b

**Objectif** : concevoir 3 à 5 scènes adversariales *empiriquement
mesurées* déclencheuses sur qwen3:32b + pipeline OMEGA v0.55.

**Critères de sélection d'une scène T'** :
- c1_max observé sur ≥ 30 % des chunks ≥ 0.20 OU
- c1 ∈ [0.15, 0.20] ET c4 < 0.30 sur ≥ 40 % des chunks
- reproductibilité : ≥ 2 seeds indépendants déclenchent

**Méthode de design proposée** :
- Prompts à vocabulaire restreint imposé (ex : "écris en utilisant
  uniquement les verbes `être`, `avoir`, `faire`, `voir`")
- Scènes à structure répétitive forcée (ex : 4 paragraphes commençant
  par la même proposition)
- Directives pacing ultra-contraintes (ex : 20 phrases courtes en
  asyndète)

**Blocking** : ouvrir tâche dédiée après Step 7. Corpus T' = dette
découverte, traitée **séparément** de la dette oracle (ADR-005 r2).

---

## Lien vers ADR-005 r2

- ADR-005 r2 COMMIT malgré FAIL bench TP, car :
  - règle oracle prouvée non-nocive sur N02 (0 FP / 47 chunks)
  - fire unique (T01_G chunk 4) = vrai positif propre
  - corpus invalide = problème distinct, pas argument pour bloquer
    recalibration oracle

---

## Actions post-clôture

- [x] Clore `NCR_CORPUS_TN_INVALID` = CONFIRMED (ce fichier)
- [ ] Ouvrir tâche "design corpus T' adversarial qwen3:32b" (post-Step 7)
- [ ] Retirer scène T04 du `BENCH_CORPUS` dans prochain bench Dédale,
      OU la reclasser explicitement `neutral:action_pass_through`
- [ ] Conserver T01 en `episodic_trigger`, usage statistique insuffisant
      (≥ 100 chunks requis pour CI 95 % sur rate ≈ 1-2 %)
