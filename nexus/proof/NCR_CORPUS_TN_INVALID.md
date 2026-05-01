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

---

## 10. Closure (enrichissement Sprint S8 Vague 1, 2026-05-01)

### 10.1 Date de closure et statut final

- **Date closure réelle** : 2026-04-22 23:59 +0200 (timestamp commit `558c57fd`)
- **Status final** : **CLOSED_CONFIRMED** (inchangé)
- **Date d'enrichissement closure section** : 2026-05-01 (Sprint S8 Vague 1)

### 10.2 Décision d'autorité

- **Décisionnaire** : Francky (Architect)
- **Arbitrage** : Tribunal 3-IA (consensus 3/3 cité §"Décisions & plan de remédiation")
- **Source verdict** : ChatGPT verbatim (cf. message commit `558c57fd` "VERDICT DISSOCIE 4-AXES")
- **Implémenteur** : Claude (IA Principal)

### 10.3 Evidence empirique consolidée

**ATTENTION — drift de path détecté lors de l'enrichissement** :

Les paths cités §"Clôture > Evidence empirique" (`outputs/bench_dedale_night/...`)
sont **incorrects**. Les fichiers réels sont sous
`packages/sovereign-engine/outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/`.
Vérification 2026-05-01 :

| Fichier cité | Path NCR original | Path réel (vérifié 2026-05-01) | Tracké git ? |
|-------------|-------------------|--------------------------------|--------------|
| `runs_R2.jsonl` | `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/runs_R2.jsonl` | **NON TROUVÉ** sur disque | NON tracké (probablement `.gitignore` taille/format) |
| `DEDALE_BENCH_R2_ADR005_VERDICT_v1.md` | `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/...` | `packages/sovereign-engine/outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/DEDALE_BENCH_R2_ADR005_VERDICT_v1.md` | **OUI** (`git ls-files`) |
| `analysis/r2_adr005_analysis.json` | `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/analysis/r2_adr005_analysis.json` | `packages/sovereign-engine/outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/analysis/r2_adr005_analysis.json` | **OUI** |

Bonus tracké également (non cité dans le NCR original) :
- `packages/sovereign-engine/outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/DEDALE_BENCH_R2_ADR005_VERDICT_v2.md` (verdict strict 4-axes)
- `packages/sovereign-engine/outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/DEDALE_BENCH_NIGHT_REPORT_v1.md`
- `packages/sovereign-engine/outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/analysis/MANIFEST_SHA256.txt` (1328 artefacts bench hashés)

### 10.4 Anchor commit

| Type | Référence | Note |
|------|-----------|------|
| Commit closure | `558c57fd` — "feat(dedale): ADR-005 r2 composite oracle + bench R2 mini-validation" | 19 fichiers, 14 CORE + 5 artefacts bench |
| Date commit | 2026-04-22 23:59 +0200 | Aligné sur date Status §header |
| ADR référencé | `docs/DEC-20260422-005-ORACLE-THRESHOLDS-RECALIBRATION.md` (r1+r2+r3) | Cité dans message commit |
| Tag dédié | **Aucun tag spécifique** pour CORPUS_TN closure | Note: `phase-s-ncr-dedale-reset-health-validated-r4-5351554b` couvre RESET_HEALTH (NCR distinct) |

### 10.5 Portée du fix

**INCLUS dans la closure** :
- Verdict empirique : T04 INERT, T01 RARE-TRIGGER, N02 reference baseline (mesures §"Mesures" tableau 3 scènes)
- Décision scellée Tribunal 3-IA : reclasser/retirer T04, conserver T01 et N02 (§"Décisions > Scellée")
- Acceptation explicite : `BENCH_CORPUS` actuel **invalide** comme source TP statistique
- ADR-005 r2 oracle COMMIT malgré FAIL TP corpus, raisons §"Lien vers ADR-005 r2"

**HORS closure (chantiers ouverts)** :
- Design corpus T' adversarial qwen3:32b (§"Chantier successeur") — **non démarré**
- Action concrète sur T04 dans `BENCH_CORPUS` (retrait ou reclassement) — **non implémentée**
- T01 statistique : ≥ 100 chunks pour CI 95 % — **non collectés**
- `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` (OPEN P1, créé même commit) — séparé

### 10.6 Risques restants (post-closure)

- **R1 — Dette corpus T' non comblée** : aucun bench Dédale ne peut produire de TP statistique fiable tant que T' n'existe pas. Tout futur sprint Dédale dépendant d'une mesure de TP est **bloqué empiriquement** (pas seulement bureaucratiquement).
- **R2 — `BENCH_CORPUS` toujours utilisé tel quel** : aucune modification commit-side de `packages/sovereign-engine/scripts/bench-dedale-night.ts` n'a retiré T04. Tout opérateur lançant ce bench sans relire ce NCR risque de tirer de fausses conclusions sur des runs futurs.
- **R3 — Path drift dans la documentation** : la NCR §"Clôture > Evidence" cite des paths incorrects (root `outputs/` au lieu de `packages/sovereign-engine/outputs/`). Risque de non-retrouvabilité des preuves lors d'audits futurs.
- **R4 — `runs_R2.jsonl` non tracké** : la jsonl source des 60 runs n'est pas dans le repo. Si le fichier est perdu localement, **les mesures §"Mesures" deviennent non-reproductibles**.

### 10.7 Closure officielle

```
CLOSURE OFFICIELLE NCR_CORPUS_TN_INVALID
========================================
Date            : 2026-04-22 (verdict + commit) / 2026-05-01 (enrichissement section)
Status final    : CLOSED_CONFIRMED
Authority       : Francky (Architect) + consensus Tribunal 3-IA
Evidence anchor : commit 558c57fd + 5 artefacts bench dans
                  packages/sovereign-engine/outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/
                  (path original NCR incorrect — voir §10.3)
Scope           : verdict empirique T04/T01/N02 + décision reclassement (chantier T'
                  ouvert mais non démarré, hors closure)
Risks           : R1/R2/R3/R4 — dette corpus T', BENCH_CORPUS non patché,
                  path drift documentaire, runs_R2.jsonl non tracké
```
