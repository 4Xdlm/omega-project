# NCR-GAMMA-INERT

**Opened**: 2026-04-17
**Severity**: LOW
**Status**: **DEFERRED** (Sprint S8 V3A 2026-05-01 — V2-C arbitrage path closed by ROLLBACK a156b0a3, sprint dédié S9+ requis)
**Owner**: Claude Code (IA Principal)

## Issue

Le coefficient γ (gamma) dans `adaptive-chunker.ts` est **inerte** en
pratique : les plans générés avec γ=0.1, γ=0.2 et γ=0.3 sont identiques
au mot près sur toutes les scènes testées.

## Preuve empirique

Grid search initial (2026-04-17, 54 runs) :

```
ACTION — fr_action_poursuite
  γ=0.1 plan : 387w[b],387w[b],392w[a],400w*[p],396w[a],400w*[p],766w[s]
  γ=0.2 plan : 387w[b],387w[b],392w[a],400w*[p],396w[a],400w*[p],766w[s]  ← identique
  γ=0.3 plan : 387w[b],387w[b],392w[a],400w*[p],396w[a],400w*[p],766w[s]  ← identique

INTERIOR — fr_interior_maison_enfance
  γ=0.1 plan : 724w[s],731w[b],339w[b],400w*[p],316w[s],400w*[p]
  γ=0.2 plan : 724w[s],731w[b],339w[b],400w*[p],316w[s],400w*[p]          ← identique
  γ=0.3 plan : 724w[s],731w[b],339w[b],400w*[p],316w[s],400w*[p]          ← identique
```

Les variations de score entre ces 3 valeurs (mesurées sur le même seed)
sont donc **100 % imputables au bruit stochastique de Qwen3:32b**, pas
à l'effet de γ.

## Mécanisme causal identifié

Dans `adaptive-chunker.ts` ligne 239 (`computeTargetLength`) :

```typescript
const silenceAdjusted = base * (1 + config.gamma * silence_overlap);
```

γ modifie bien `silenceAdjusted` AVANT clamp à `[l_min, l_max]` et
AVANT la redistribution par quartile (qui normalise la somme à W_target).

Après la redistribution, l'effet de γ sur l'allocation absolue est
**annulé par la normalisation proportionnelle** : si tous les chunks
sont modulés par un facteur commun dans leur quartile, la redistribution
`w_target / sum(raw_lengths)` élimine mathématiquement ce facteur.

γ n'a donc un effet **que si le silence_overlap diffère radicalement
d'un chunk à l'autre dans le même quartile**, ce qui est rare dans les
scènes testées (silence_zones généralement sur 1 ou 2 quartiles).

## Impact sur V2-B (top3)

**Faible à nul.** La décision d'intégration top3 (α=0.3, β=0.3, γ=0.2)
reste valide car :
- α et β restent discriminants (action sur L_target, sur redistribution)
- γ=0.2 est la valeur "centre d'intervalle" décidée par Francky le
  2026-04-17, maintenue par défaut
- γ inerte signifie simplement qu'on **pourrait** le fixer sans perte

## Décision

1. **γ maintenu à 0.2** dans les DEFAULTS V2-B.
2. **Ne pas refactoriser** `computeTargetLength` pour activer γ tant que
   V2-B n'est pas promu en production.
3. **Investigation en V2-C** : soit réactiver γ avec une formulation
   qui ne soit pas annulée par la redistribution (ex: appliquer γ APRÈS
   la redistribution, ou moduler `l_min`/`l_max` en fonction du silence),
   soit supprimer γ du modèle si jugé non nécessaire.

## Décision technique future (candidate, non scellée)

Option A : appliquer γ après redistribution, comme élévation locale du
`l_max` individuel d'un chunk à forte silence_overlap.

Option B : moduler `w_ref` (budget total) en fonction du silence global
de la scène (plus de silence → scène plus dense → budget réduit ou
augmenté selon doctrine).

Option C : supprimer γ du modèle (3 coefs α, β, δ suffisent).

Arbitrage à l'issue de V2-C.

## Traçabilité

- Grid search découverte : `packages/sovereign-engine/grid-search-results.json`
- Fichier concerné : `packages/sovereign-engine/src/generation/adaptive-chunker.ts:234-244`

---

## S8 V3A CLASSIFICATION — 2026-05-01

### Evidence checked

- ✅ `grid-search-results.json` présent (`Test-Path` True)
- ⚠️ `adaptive-chunker.ts` L234-244 contient maintenant `REGISTER_TABLE`
  (drift numérotation depuis 2026-04-17 — `computeTargetLength` déplacé)
- ❌ V2-C arbitrage path **fermé** : commit `a156b0a3` "chore(v2c):
  ROLLBACK B+ — bench FAIL 3/4 gates, retour V1 static" (2026-04-17 20:32)
- ✅ γ=0.2 comme DEFAULT V2-B reste opérationnel (décision Francky 2026-04-17)

### Decision rationale

Le NCR planifiait l'arbitrage des Options A/B/C **en V2-C**. V2-C a été
ROLLBACKé le même jour (2026-04-17, commit `a156b0a3`). Le path d'arbitrage
n'a donc jamais été emprunté et **ne le sera pas** sous cette forme.

Cependant :
- L'**observation** (γ inerte mathématiquement, annulé par redistribution)
  reste empiriquement valide
- La **décision opérationnelle** (γ=0.2 en DEFAULT) est appliquée
- Aucun risque runtime (LOW severity confirmée)

→ **DEFERRED** sprint dédié S9+ pour décider Options A/B/C dans un
nouveau contexte (post V2-B/V2-C rollback). Pas STILL_OPEN car aucune
investigation active n'est en cours et le NCR n'est pas en attente
d'une décision Architecte immédiate.

### Final status

**DEFERRED** (severity LOW maintenue)

### Scope

- **INCLUS** : observation γ inerte, décision γ=0.2 DEFAULT V2-B
- **DEFERRED S9+** : arbitrage Options A/B/C (refactor formulation,
  modulation w_ref, ou suppression γ)

### Remaining risks

- **R1** — Drift numérotation NCR vs code : ligne 239 référencée n'est
  plus la bonne (REGISTER_TABLE à L234-244). Toute future investigation
  devra re-localiser `computeTargetLength`.
- **R2** — γ silencieusement présent mais inerte : risque de fausse
  intuition pour futur dev modifiant adaptive-chunker (croyant tuner γ
  alors qu'aucun effet)
- **R3** — Décision V2-C arbitrage perdue : aucun nouveau path n'a été
  défini pour reprendre la question

### Next sprint if deferred

**Sprint S9+ dédié** :
- Re-localiser `computeTargetLength` dans adaptive-chunker.ts (drift L)
- Décider Option A (γ après redistribution) / Option B (modulation w_ref) /
  Option C (suppression γ du modèle)
- Si Option C retenue : refactor adaptive-chunker.ts + mise à jour DEFAULTS

### Anchor empirique runtime arbitrage

```
S8 V3A CLASSIFICATION — NCR_GAMMA_INERT
========================================
Date            : 2026-05-01 (Sprint S8 V3A)
Status          : OPEN → DEFERRED (path V2-C closed)
Severity        : LOW (inchangée)
Authority       : Claude Code (runtime arbiter S8 V3A)
                  + Francky décisionnaire pour Options A/B/C S9+
Evidence anchor : grid-search-results.json présent + commit a156b0a3
                  ROLLBACK V2-C confirmant fermeture path arbitrage
Scope           : observation γ inerte + décision DEFAULT γ=0.2 maintenue,
                  arbitrage Options A/B/C reporté
Risks           : R1 drift L numérotation, R2 fausse intuition future,
                  R3 path V2-C arbitrage perdu
```
