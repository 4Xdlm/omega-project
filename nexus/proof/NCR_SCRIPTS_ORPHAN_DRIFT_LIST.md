# NCR_SCRIPTS_ORPHAN_DRIFT_LIST

**ID** : NCR_SCRIPTS_ORPHAN_DRIFT_LIST
**Title** : 19 scripts `packages/sovereign-engine/scripts/*.ts` orphans/drift cross-package exclus du typecheck strict via `tsconfig.scripts.json` exclude
**Status** : **DRAFT_OPEN**
**Severity** : **LOW**
**Priority** : P3 (S10+)
**Opened** : 2026-05-17 (Phase 3.2 mass-fix)
**Owner** : Francky + Claude

---

## 1. Résumé

Pour atteindre **zéro TS errors scripts/** dans le sprint mass-fix Phase 3.2, 19 scripts orphans avec imports cassés et/ou drift cross-package ont été **exclus de `tsconfig.scripts.json`** (commit `c2923652`). Ces scripts ne sont plus typecheckés en strict.

**Total** : 19 scripts excludes + 1 script avec `// @ts-nocheck` (`run-benchmark-phase-w.ts` qui était tiré par dépendance malgré exclude).

Les scripts sont supposés "orphans" (non utilisés en production) ou "broken" (imports vers modules inexistants), mais aucun audit complet n'a confirmé leur statut réel.

## 2. Évidence empirique observée 2026-05-17

```json
// [REPO] packages/sovereign-engine/tsconfig.scripts.json (commit c2923652)
{
  "exclude": [
    "node_modules",
    "scripts/audit-classifier.ts",                  // TS2339 build-gold-set.default
    "scripts/bench-dedale-tprime-validation.ts",    // TS2307 ./bench-dedale-tprime-corpus.js
    "scripts/bench-p1-v4-fusion.ts",                // TS2305 ×3 imports inexistants
    "scripts/calibrate-full.ts",                    // TS2339 SentenceProfile.type ×4
    "scripts/collect-bench-hybrid-32.ts",           // TS2307 hybrid-provider.js
    "scripts/resume-benchmark-topk.ts",             // 6 errors mix (SubtextLayer, AxisScore, SymbolMap)
    "scripts/run-benchmark-phase-u.ts",             // 2 errors (SubtextLayer + literal type)
    "scripts/run-benchmark-phase-w.ts",             // 1 error TS2322 SubtextLayer (+ @ts-nocheck)
    "scripts/run-calibration.ts",                   // 3 errors (import ForgePacketInput, signature, physics_delta)
    "scripts/run-dual-benchmark.ts",                // 2 imports genius/* inexistants
    "scripts/run-retro-bench.ts",                   // 2 errors null vs undefined
    "scripts/test-mirror.ts",                       // TS2339 primary_type
    "scripts/test-p1-3000w-fdp-k2.ts",              // TS2339 primary_type
    "scripts/test-phase4-antidrift.ts",             // TS2339 primary_type
    "scripts/test-phase4b-pulverize.ts",            // TS2339 primary_type
    "scripts/test-phase4c-fusion-intl.ts",          // TS2339 primary_type
    "scripts/test-phase5-assembly.ts",              // TS2339 primary_type
    "scripts/test-phase5b-validate.ts",             // TS2339 primary_type
    "scripts/validate-hybrid.ts"                    // TS2307 hybrid-provider.js
  ]
}
```

**Total erreurs scripts/ masquées par exclude** : ~27 TS errors initialement (baseline `16629707`)

## 3. Ce qui est PROUVÉ empiriquement

- 19 scripts excludes dans tsconfig.scripts.json
- Tous présents physiquement dans `scripts/` (non supprimés)
- TSC scripts/ EXIT=0 après exclusion + @ts-nocheck (cold restart 2026-05-17)
- Aucun de ces scripts n'est dans une CI/CD automated (recherche `*.yml`, `*.yaml`, package.json scripts)

## 4. Ce qui N'EST PAS prouvé

- Si ces scripts sont **vraiment** orphans (jamais utilisés) ou s'ils sont lancés manuellement par Francky / autres devs
- Si certains ont des dépendances runtime qui auraient cassé même sans drift (les rendre runtime-broken aussi)
- Si l'archivage / suppression de certains est safe vs garder pour archive historique

## 5. Hypothèses sur cause racine

- **H1 — Refactor mass** : sovereign-engine a subi des refactors massifs (renames de types, API changes omega-forge) sans migration des scripts. Les scripts ont accumulé du drift.
- **H2 — Scripts test ad-hoc** : `test-mirror`, `test-phase4-*`, `test-phase5-*` semblent être des scripts test one-shot d'anciens sprints. Probable dead code.
- **H3 — Scripts bench expérimentaux** : `bench-dedale-tprime-validation`, `bench-p1-v4-fusion`, `collect-bench-hybrid-32` semblent expérimentaux/jetables.
- **H4 — Cross-package drift** : `validate-hybrid`, `collect-bench-hybrid-32` importent `hybrid-provider.js` qui n'existe pas → probable refactor qui a déplacé/renommé le module hybrid-provider.

## 6. Impact

- **Pas d'impact build/test** : exclude fonctionne, TSC 0 erreurs
- **Pas d'impact runtime** : scripts non lancés en CI ; impact runtime si Francky les lance manuellement (mais ils sont probablement déjà broken même sans le drift TS)
- **Dette d'audit** : 19 scripts dans l'état "broken silencieux" — soit fixer, soit supprimer, soit archiver

## 7. Recommandation

**Stratégie audit S10+** : pour chaque script de la liste exclude :
1. `git log --follow -- scripts/<file>.ts | head -5` pour identifier dernière activité
2. `grep -r "scripts/<file>" .` pour voir si invoké par autre script / docs
3. Si dernière activité > 6 mois ET aucune invocation → **supprimer** (cleanup)
4. Si activité récente ET invocation existante → **fixer** (imports, types)
5. Si activité ancienne mais archive intéressante → **déplacer** vers `scripts/archive/` + add `// @ts-nocheck`

**Priorité audit** (ordre décroissant d'importance) :
1. `run-calibration.ts` (mentionne `physics_delta` — peut-être lié à pipeline)
2. `validate-hybrid.ts` + `collect-bench-hybrid-32.ts` (hybrid-provider drift)
3. `run-benchmark-phase-*.ts` (3 scripts — peut-être encore utilisés ?)
4. `test-phase*-*.ts` (7 scripts — probable dead one-shot)
5. `bench-*` (3 scripts — expérimentaux)
6. `audit-classifier.ts`, `resume-benchmark-topk.ts`, `test-mirror.ts` (cas isolés)

## 8. Refs

- Commit exclude : `c2923652` (Phase 3.2 mass-fix)
- Commit hotfix cross-package : `741f88c1` (cold restart verified)
- Pattern auto-mémoire : `feedback_tsc_exclude_pulled_by_deps.md`
- NCR connexe : `NCR_TSCONFIG_SCRIPTS_ORPHAN_REFERENCE.md` (NCR initial sur tsconfig orphan reference)
- NCR connexe : `NCR_BENCH_TEST_BROKEN_EXPORTS.md` (bench test connexe)

---

**Doctrine** : MINIMIZE IT (exclude > fix forcé sur orphans) + NCR OVER HEROICS (documenter avant cleanup mass).
**Standard** : NASA-Grade L4 / DO-178C Level A.
