# AUDIT BUG-01 : AAI invariant à 95.6

**Date** : 2026-03-26
**Statut** : DIAGNOSTIC CONFIRMÉ

## Diagnostic

AAI retourne 95.6 sur les 5 briques V-ATOMIC car **les deux composants sont purement CALC** sur prose de qualité littéraire :

1. **show_dont_tell** (w=0.60) : Pure CALC via `detectTelling(prose)`. Sur prose littéraire bien écrite, 0 violation "telling" → score ~100.

2. **authenticity** (w=0.40) : **Conçu HYBRID (CALC 60% + LLM 40%) mais LLM TOUJOURS en fallback.** Le `adversarial-judge.ts:96` appelle `provider.llm_generate()` — méthode qui **N'EXISTE PAS** dans l'interface `SovereignProvider` (types.ts). Résultat : try/catch → `fraud_score: null` → CALC 100% seul → score ~89.

**Calcul** : AAI = 100 × 0.60 + 89 × 0.40 = **95.6** (invariant pour toute prose sans telling + peu d'IA patterns).

## Root cause

`adversarial-judge.ts` ligne 96 : `provider.llm_generate({...})` — méthode inexistante.
Confirmé par `npx tsc --noEmit` : `error TS2339: Property 'llm_generate' does not exist on type 'SovereignProvider'`.

L'adversarial judge a été écrit pour une interface future jamais implémentée.

## Impact

- AAI ne discrimine pas entre proses de qualité différente
- AAI gonfle artificiellement le composite de +0.2 à +0.5 pts (vs un AAI réel qui varierait)
- Aucun risque de scoring TROP BAS : c'est un plafond, pas un plancher

## Recommandation de fix

**Option A (court terme)** : Câbler `adversarial-judge.ts` pour utiliser `provider.generateStructuredJSON()` au lieu de `provider.llm_generate()`. Nécessite un refactoring du prompt adversarial pour correspondre au format JSON structuré.

**Option B (moyen terme)** : Ajouter `llm_generate()` à l'interface SovereignProvider et l'implémenter dans anthropic-provider.ts.

**Option C (immédiat, choisi)** : Documenter et ajouter un test de regression. Le composant n'est pas bloquant (score élevé, pas de faux négatif). La discrimination AAI viendra quand l'adversarial judge sera câblé.

## Valeurs mesurées

| Prose | show_dont_tell | authenticity (CALC) | AAI |
|---|---|---|---|
| Toute prose littéraire sans telling | ~100 | ~89 | ~95.6 |
| Prose avec 1 telling violation | ~75 | ~89 | ~80.6 |
| Prose avec patterns IA | ~100 | ~60-70 | ~84-88 |

Le seul cas où AAI baisse significativement : telling violations OU patterns IA flagrants.
