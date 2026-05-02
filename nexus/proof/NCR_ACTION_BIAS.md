# NCR-ACTION-BIAS

**Opened**: 2026-04-17
**Severity**: **HIGH (P0)** — promu le 2026-04-17 post-autopsie V2-B.2
**Status**: **DEFERRED** (Sprint S8 V3C 2026-05-02 — V2-C arbitrage path closed by ROLLBACK a156b0a3, sprint dédié S9+ requis ; severity P0 maintenue)
**Précédent**: OPEN — investigation requise quelle que soit l'issue du bench V2-C (header original 2026-04-17)
**Owner**: Francky (décision finale sur architecture scoring conditionnel)

## Promotion P0 (2026-04-17)

Auparavant MEDIUM, promu P0 suite au verdict SHADOW_CONTINUE du bench
V2-B.2 et à la décision Francky sur le plan A→B+ (DEC-20260417-004
POINT 17).

**Rationnel de la promotion** :

1. **Aucune variante de chunker** (V2-B.1, V2-B.2, V2-C) ne résout le
   bias ACTION. Le V2-C route ACTION vers `planAdaptiveChunkingV2B2`
   (gain modeste) mais ne corrige pas le scoring downstream.
2. **Cas A (V2-C PASS)** : V2-C promu en production, ACTION reste plafonné
   à ~0.88 en dispatch. Le bias devient le facteur limitant suivant.
3. **Cas B+ (V2-C FAIL)** : rollback V1 static, plus aucun levier de
   chunking → le bias scoring devient l'unique axe d'amélioration ACTION.
4. **Dans les deux cas**, NCR_ACTION_BIAS est chemin critique → P0.

## Issue

Les scènes de type ACTION/BRUTAL sous-performent systématiquement dans les
benchs de chunking adaptatif V2-B (médiane négative sur `fr_action_poursuite`
pour les 3 configurations testées : μ ∈ [-4.35, -1.81] vs μ positive sur
INTERIOR/SENSORY/CATHEDRAL).

L'origine causale n'est **pas** le chunker. Elle est un couplage mécanique
de trois capteurs CALC dans l'Oracle V3.4 :

1. **type_modifier ACTION via `f_subordination_depth` = 0.76** (vs 1.00
   NARRATION, 1.18 DESCRIPTION) — pénalise la faible subordination inhérente
   au staccato de l'action.
2. **RCI/rhythm** : pénalité `CV_sent` faible sur phrases courtes →
   "variance syntaxique insuffisante".
3. **RCI/euphony** : pénalité consonnes occlusives dures (scène action) →
   musicalité liquide absente.

Les trois features qui définissent une bonne scène d'action classique
(phrase courte + verbe dense + consonne dure) sont **automatiquement
délictuelles** pour l'Oracle calibré sur Flaubert/Duras/Proust.

## Features suspectes à investiguer

| Feature | Suspicion | Direction attendue sur ACTION |
|---------|-----------|-------------------------------|
| `f1_mean` (longueur moyenne phrase) | forte | chute mécanique (phrase courte) |
| `CV_sent` (variance rythmique) | forte | chute mécanique (staccato régulier) |
| `f5a` (densité verbes d'action) | moyenne | hausse → pénalité type_modifier |
| `f28d` / `f27d` (poids intériorité) | moyenne | chute naturelle (scène externe) |
| `f_subordination_depth` | forte | chute naturelle (staccato) |
| `euphony` (consonnes dures) | moyenne | chute naturelle (consonnes occlusives) |

## Contexte historique

- `docs/OMEGA_DOSSIER_DETECTION_TYPE.md` (mars 2026) documente que le
  détecteur de type classe presque tout en ACTION parce que la prose OMEGA
  a un profil uniformément action-like (verbes denses + phrases courtes).
- `docs/SESSION_SAVE_2026-03-24_MARATHON_BOTTLENECK.md` (mars 2026) :
  Rosetta rapport "Action pure = 93.01 en V3 mais 52.94 en R6", preuve
  que deux capteurs ne lisent pas la même physique.
- V3.4 retrain avril 2026 sur 1334 œuvres — le biais peut avoir été
  atténué, déplacé ou inchangé. **Non mesuré empiriquement.**

## Évidence du bench V2-B (2026-04-17)

Bench validate-shortlist 60 runs (3 configs × 4 scènes × 5 seeds) :

| config | fr_action_poursuite μ | σ | pire seed |
|--------|----------------------|---|-----------|
| a0.7_b0.1_g0.2 | **-4.35** | 6.64 | -16.06 (s0) |
| a0.3_b0.2_g0.2 | **-3.95** | 3.63 | -9.78 (s2) |
| a0.3_b0.3_g0.2 | **-1.81** | 1.31 | -3.67 (s0) |

Top3 (a0.3_b0.3_g0.2) minimise le dommage ACTION en redistribuant le
budget-mots hors des quartiles ACTION (via β=0.3), **pas** en améliorant
la scène d'action elle-même. C'est une optimisation d'évasion fiscale
algorithmique, pas une amélioration narrative.

## Décision

1. **Pas de modification de `src/oracle/axes/rhythm.ts` ni des
   `type_modifiers` maintenant.** Toute correction scoring nécessite une
   mesure empirique V3.4 préalable (le biais a pu être atténué par le
   retrain 1334 œuvres).
2. **Investigation reportée à V2-C** après intégration V2-B (chunking
   adaptatif top3) et bench A/B V1 vs V2-B.
3. **Implémentation potentielle** : scoring scene-aware avec architecture
   `noyau universel + modulateur par archétype`. Spec à rédiger en V2-C.

## Plan d'investigation V2-C (non démarré)

1. Mesurer les 6 features suspectes sur corpus FR ACTION pur (Zola
   Germinal extraits, Simenon — scènes d'action) vs corpus FR
   INTROSPECTION pur (Proust, Duras).
2. Vérifier si `f_subordination_depth` ACTION est toujours = 0.76 dans
   V3.4 ou si le retrain l'a modifié.
3. Si biais confirmé : rédiger spec `scene-aware-scoring-v1.md` et ADR.
4. Si biais atténué post-V3.4 : refermer NCR avec verdict RESOLVED.

## Non-décision explicite

- **NE PAS** baisser globalement les seuils rhythm/euphony (corromprait
  les scènes introspectives).
- **NE PAS** tordre le chunker V2-B pour compenser (mauvais étage causal).
- **NE PAS** supprimer l'archétype ACTION du forge-packet (le biais est
  dans l'Oracle, pas dans le packet).

## Traçabilité

- Bench de découverte : `packages/sovereign-engine/validate-shortlist-results.json`
- Rapport bench : `packages/sovereign-engine/validate-shortlist-results-report.md`
- Consensus 3-IA : Claude + Gemini + ChatGPT (2026-04-17), unanimité sur
  décision "ne pas recalibrer maintenant".

---

## S8 V3C CLASSIFICATION — 2026-05-02

### Anchors empiriques vérifiés (canon-engine quality bar EMP-N)

| Test | Commande | Résultat |
|------|----------|----------|
| EMP-1 | `Test-Path packages/sovereign-engine/validate-shortlist-results.json` | True ✅ (bench découverte préservé) |
| EMP-2 | `Test-Path packages/sovereign-engine/validate-shortlist-results-report.md` | True ✅ |
| EMP-3 | `git show a156b0a3` (V2-C rollback) | "chore(v2c): ROLLBACK B+ — bench FAIL 3/4 gates, retour V1 static" 2026-04-17 20:32 ✅ — **même jour que NCR ouverture** |
| EMP-4 | grep "scene-aware-scoring" filesystem | **0 fichier** — Plan §"Plan investigation V2-C" #3 non exécuté |
| EMP-5 | grep commits `action.bias|ACTION_BIAS|action-bias` | **0 commit** post-NCR — Plan §1, §2, §4 tous non exécutés |
| EMP-6 | grep `NCR_ACTION_BIAS` autres NCRs | 5 cross-refs : NCR_CATHEDRAL_BASELINE.md (3) + NCR_DIRECTIVE_BLOAT.md (2) — famille architecturale CALC bias confirmée ✅ |

### Cowork anchor brief V3C C30 — registry stale

L'instruction Vague 3C C30 mentionne :
> "Contexte minimal Cowork — registry CSV liste statut UNKNOWN."

**Vérification** : registry CSV (`omega/outputs/NCR_REGISTRY_2026-04-29.csv`)
liste effectivement `NCR_ACTION_BIAS` avec Status=`UNKNOWN`. Mais le NCR
header actuel (avant cette classification) dit clairement `OPEN — HIGH P0`.

→ **Confirmation registry stale** (pattern documenté `NCR_REGISTRY_BROKEN_FILTER`
commit `d46587fc`) : le CSV ne reflète pas l'état réel des NCRs.

### Decision rationale

Pattern identique à `NCR_GAMMA_INERT` (Sprint S8 V3A C20) :
- Plan §"Plan d'investigation V2-C" dépendait empiriquement de V2-C
- V2-C rolled back **le même jour** que NCR ouverture (commit `a156b0a3` 2026-04-17 20:32)
- Path d'arbitrage planifié **est mort** depuis le jour 1

Empirical state :
- Aucune mesure V3.4 ACTION (Plan §1, §2 non faits)
- Aucun spec scene-aware-scoring (Plan §3 non fait)
- Aucune verdict RESOLVED ni recalibration (Plan §4 non fait)
- Biais ACTION reste empirique (μ ∈ [-4.35, -1.81] sur fr_action_poursuite)

Decision: **OPEN P0 → DEFERRED Sprint S9+**
- Cannot RESOLVED : aucune mesure V3.4 faite, biais non confirmé/atténué empiriquement
- Cannot CLOSED_CONFIRMED : pas de closure formelle
- Cannot STILL_OPEN : path V2-C explicitement clos, pas d'attente passive
- Cannot ACCEPTED_DIAGNOSED_UNKNOWN : "DIAGNOSED" implique mesure récente, ici dernière mesure = bench 2026-04-17 (15 jours)
- DEFERRED reflète : path V2-C dead, nouveau context S9+ requis
- **Severity P0 MAINTENUE** : promotion §"Promotion P0" reste valide indépendamment du path V2-C

### Final status

**DEFERRED** (severity HIGH P0 maintenue dans header pour trace historique
du chemin critique et flag prio S9+)

### Scope

- **DEFERRED S9+** : Plan §1-§4 (mesure features V3.4 ACTION, vérification
  f_subordination_depth, spec scene-aware-scoring, decision RESOLVED ou refonte)
- **PERSISTANT empirique** : biais ACTION non corrigé, μ négatives bench 2026-04-17
- **HORS scope** : V2-C arbitrage (path mort), modifications type_modifier maintenant

### Remaining risks

- **R1** — Biais P0 persistant 15 jours : production prod scènes ACTION reste pénalisée
  silencieusement par triple couplage CALC (type_modifier + RCI/rhythm + RCI/euphony)
- **R2** — Famille CALC bias : couplage avec `NCR_CATHEDRAL_BASELINE` (DEFERRED, V3A C22)
  + `NCR_SCORER_STYLE_BIAS` (DEFERRED, V3A C23) — refonte coordonnée S9+ recommandée
  pour éviter solutions partielles ne traitant qu'un archétype
- **R3** — Mesure V3.4 jamais faite : §"Contexte historique" mentionne retrain V3.4
  avril 2026 ; il est possible que le biais soit déjà atténué (Plan §4 RESOLVED)
  mais cette branche reste **non vérifiée empiriquement**
- **R4** — Path V2-C closure perdu : décision Plan §1-§4 reportée à un sprint dédié
  qui n'a pas de date prévue. P0 reste P0 sans plan d'action concret.

### Cross-references

- `NCR_GAMMA_INERT` (DEFERRED, V3A C20 commit `00a56ef6`) : pattern identique
  V2-C arbitrage path closed
- `NCR_CATHEDRAL_BASELINE` (DEFERRED, V3A C22 commit `acb25614`) : famille
  CALC bias parallèle (CATHEDRAL bias)
- `NCR_SCORER_STYLE_BIAS` (DEFERRED, V3A C23 commit `d1d49268`) : famille
  CALC bias parallèle (style bias f33b)
- `NCR_DIRECTIVE_BLOAT` (CLOSED_CONFIRMED, V1 C8 commit `87a172cd`) : cause
  distincte INTERIOR (cf. §"Non-décision explicite" du présent NCR)
- `NCR_REGISTRY_BROKEN_FILTER` (OPEN_DIAGNOSED, V1 C5 commit `d46587fc`) :
  registry stale documenté (UNKNOWN ≠ OPEN P0)

### Closure officielle

```
CLASSIFICATION S8 V3C — NCR_ACTION_BIAS
=========================================
Date            : 2026-05-02 (Sprint S8 V3C)
Status          : OPEN P0 → DEFERRED (path V2-C closed, sprint S9+ requis)
Severity        : HIGH P0 (MAINTENUE — promotion §"Promotion P0" toujours valide)
Authority       : Claude Code (runtime arbiter S8 V3C) +
                  Francky décisionnaire pour Plan §1-§4 S9+
Evidence anchor : 6/6 EMP runtime — bench validate-shortlist présent +
                  V2-C rollback même jour confirmé + 0 commit post-NCR +
                  5 cross-refs famille CALC bias
Anchors Cowork  : "registry CSV UNKNOWN" — confirmé stale (pattern documenté
                  NCR_REGISTRY_BROKEN_FILTER), header NCR réel = OPEN HIGH P0
Scope           : Plan §1-§4 DEFERRED S9+, biais ACTION persistant empirique,
                  V2-C path mort
Risks           : R1 biais P0 prod 15 jours, R2 famille CALC coordination,
                  R3 V3.4 mesure jamais faite, R4 P0 sans plan concret
```
