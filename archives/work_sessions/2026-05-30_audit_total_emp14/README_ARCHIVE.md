# ARCHIVE DE TRAVAIL — NON SOURCE DE VÉRITÉ COURANTE

```
Status            : HISTORICAL_WORK_ARCHIVE
Classification    : ARCHIVE_HISTORIQUE_TRAVAIL · NON_SOURCE_OF_TRUTH_RUNTIME · DEMONSTRATION_PROCESS_EMP14
Runtime authority : REPO_ACTIVE_ONLY (git status + HEAD + origin + tests = seule vérité)
Validité          : démonstration de méthode + historique décisionnel
Interdit          : utiliser comme état actuel sans revalidation git/runtime
```

## Règle de reprise (obligatoire)
Toute reprise depuis cette archive EXIGE d'abord, dans le repo actif :
```powershell
git status --short
git rev-parse HEAD
git rev-parse origin/phase-r-dispatcher-v33
git describe --tags
npm test --prefix packages/sovereign-engine   # ou vitest run
```
Les chiffres/HEAD/commits cités dans les documents ci-dessous décrivent un **instant T (2026-05-29 → 2026-05-30)** et ne valent que comme récit. Décision : Tribunal 2/2 (ChatGPT + Gemini), 2026-05-30.

## Contenu de l'archive
- `OMEGA_AUDIT_TOTAL_2026-05-29.md` — rapport d'audit total (4 axes, balisage SSOT). **Contient des sur-affirmations corrigées depuis** (voir ci-dessous).
- `OMEGA_AUDIT_DASHBOARD.html` — dashboard KPIs/graphe de dépendances.
- `SESSION_LOG_2026-05-30.md` — journal de la session (EMP-14 + P2 + P3 + re-audit hostile).

## Corrections actées (le rapport d'audit initial sur-affirmait — autorité = repo)
1. « 43 TODO » → **1 réel** (le reste = faux positifs grep). Cf `nexus/proof/NCR_AUDIT_TODO_FALSE_ALARM_2026-05-30.md`.
2. « @omega/oracle package mort » → **0 import confirmé mais maintenu** → ARCHIVÉ (réversible), cf `archives/deprecated-packages/oracle/`.
3. « 4 dossiers cassés » → **outils CJS volontaires** hors-workspace, cf `nexus/proof/P2_CJS_TOOLING_KEEP_BY_DESIGN_2026-05-30.md`.
4. « 86 as any » → **85 dette src + 41 scripts légitimes** + ~150 tests, cf `nexus/proof/P3_TYPE_CASTS_TRIAGE_PLAN_2026-05-30.md`.

La trame DRAFT d'origine est **SUPERSÉDÉE** par la version ratifiée : `docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md` (EMP-14, doctrine active). Ne pas réutiliser le DRAFT.

## Vérité runtime au moment du scellement de cette archive (à REVALIDER avant tout usage)
HEAD `8c1e5224` · origin synchro (ahead 0 / behind 0) · working tree CLEAN · sovereign-engine 2522 pass / 0 fail. **Ces valeurs sont historiques — revérifie-les.**
