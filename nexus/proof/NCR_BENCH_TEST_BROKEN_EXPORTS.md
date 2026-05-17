# NCR_BENCH_TEST_BROKEN_EXPORTS

**ID** : NCR_BENCH_TEST_BROKEN_EXPORTS
**Title** : `tests/bench/ncr-m2-v4-fusion.test.ts` importe `buildOllamaOptions` / `hashOptions` / `repeatPatternScore` qui n'existent PAS dans `scripts/bench-p1-robustness-v3.ts`
**Status** : **DRAFT_OPEN**
**Severity** : **MEDIUM**
**Priority** : P2 (S10+)
**Opened** : 2026-05-17 (Phase 3.2 cold restart révélation post-bench-guard)
**Owner** : Francky + Claude

---

## 1. Résumé

Le fichier de test `packages/sovereign-engine/tests/bench/ncr-m2-v4-fusion.test.ts` importe **3 exports inexistants** depuis `scripts/bench-p1-robustness-v3.ts` :
- `buildOllamaOptions` ❌
- `hashOptions` ❌
- `repeatPatternScore` ❌

Au runtime, ces imports = `undefined`. Les 15 tests qui les utilisent FAILED systématiquement (`TypeError: buildOllamaOptions is not a function`).

**Bug masqué jusqu'à 2026-05-17** : le bench `main()` de `bench-p1-robustness-v3.ts` s'auto-exécutait au module load (sans guard `import.meta.url`), bloquant tout le test runner pendant ~6h+. Les 15 FAIL n'étaient donc jamais visibles complètement.

**Fix temporaire (commit `c2923652`)** : 20 `describe.skip(...)` appliqués sur tout le test file → 49 tests skipped, 0 FAIL.

## 2. Évidence empirique observée 2026-05-17

```ts
// [REPO] packages/sovereign-engine/tests/bench/ncr-m2-v4-fusion.test.ts:65-69
import {
  buildOllamaOptions,    // ← INEXISTANT dans bench-p1-robustness-v3.ts
  hashOptions,           // ← INEXISTANT
  repeatPatternScore,    // ← INEXISTANT
} from '../../scripts/bench-p1-robustness-v3.js';

// [REPO] grep "function buildOllamaOptions" packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts
// Aucun match — les 3 fonctions ne sont définies NULLE PART dans ce fichier.
```

**Erreurs runtime observées (avant skip)** :
```
TypeError: buildOllamaOptions is not a function
  at tests/bench/ncr-m2-v4-fusion.test.ts:87:18
  ... (15 tests FAIL identiques)
```

## 3. Ce qui est PROUVÉ empiriquement

- 3 imports inexistants ligne 65-69 du test file
- `bench-p1-robustness-v3.ts` ne contient AUCUNE définition de ces 3 fonctions
- 15 tests FAIL systématique en runtime (cf. log `test_validation_v4_2026-05-17.log`)
- `describe.skip` × 20 = workaround actuel (0 FAIL, 49 skipped)

## 4. Hypothèses sur cause racine

- **H1** : Refactor `bench-p1-robustness-v3.ts` avait initialement exporté ces 3 fonctions, puis elles ont été extraites vers `bench-p1-v4-fusion.ts` (qui les importe ligne 101-103, aussi cassé). Le test n'a pas été migré.
- **H2** : Le test a été écrit par référence à un design théorique de la v3 qui n'a jamais été matérialisé.
- **H3** : Les 3 fonctions devraient venir d'un autre module (peut-être omega-forge ou semantic) que personne n'a su importer correctement.

## 5. Ce qui N'EST PAS prouvé

- Où ces 3 fonctions devraient logiquement vivre (architecture)
- Si elles ont jamais existé (git blame du test pourrait éclairer)
- Si le test était d'avant la creation de `bench-p1-v4-fusion.ts` ou après

## 6. Impact

- **49 tests skipped** : couverture régressée par rapport à l'intention initiale
- **Pas d'impact runtime** : le test n'était pas dans le pipeline CI/CD critique
- **Dette technique masquée** : description du test (`OMEGA P1 ROBUSTNESS BENCH v3 — Q_REPRO + Q_POWER`) suggère qu'un design important n'est pas testé

## 7. Recommandation

**Option A — Investigation** : `git log --follow --all -- packages/sovereign-engine/tests/bench/ncr-m2-v4-fusion.test.ts` pour identifier le commit qui a introduit ces imports. Trouver le commit qui a supprimé ou déplacé `buildOllamaOptions` etc.

**Option B — Recreation** : Si ces fonctions sont essentielles, les recréer dans `bench-p1-robustness-v3.ts` selon les signatures attendues par les tests (déduisibles depuis test bodies).

**Option C — Suppression définitive** : Si le test bench est obsolète (NCR_M2 V4 FUSION était lié à Sprint S9), supprimer le test file entier + `bench-p1-v4-fusion.ts` orphan.

**Option D — Status quo** : Garder skip + NCR (configuration actuelle commit `c2923652`).

## 8. Refs

- Test file skip : `packages/sovereign-engine/tests/bench/ncr-m2-v4-fusion.test.ts` (20 `describe.skip`)
- Commit fix temporaire : `c2923652`
- Pattern auto-mémoire : `feedback_vitest_bench_npm_test.md`
- NCR connexe : `NCR_TSCONFIG_SCRIPTS_ORPHAN_REFERENCE.md` (autre fichier orphan v3)

---

**Doctrine** : NCR OVER HEROICS + AUDIT BEFORE ACTION (git log avant suppression).
**Standard** : NASA-Grade L4 / DO-178C Level A.
