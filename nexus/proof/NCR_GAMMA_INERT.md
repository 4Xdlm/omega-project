# NCR-GAMMA-INERT

**Opened**: 2026-04-17
**Severity**: LOW
**Status**: OPEN — observation, pas bloquant
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
