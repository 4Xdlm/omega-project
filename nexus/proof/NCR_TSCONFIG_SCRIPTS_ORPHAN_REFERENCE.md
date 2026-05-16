# NCR_TSCONFIG_SCRIPTS_ORPHAN_REFERENCE

**ID** : NCR_TSCONFIG_SCRIPTS_ORPHAN_REFERENCE
**Title** : `tsconfig.scripts.json:9` référence fichier inexistant + exclut autres scripts/ → drift silencieux post-refactor
**Status** : **RESOLVED** (commit `8b29db69` 2026-05-16)
**Severity** : **MEDIUM**
**Priority** : P1 (résolu)
**Opened** : 2026-05-16 (audit nuit autonome)
**Resolved** : 2026-05-16 commit `8b29db69`
**Owner** : Francky + Claude

---

## 1. Résumé

`packages/sovereign-engine/tsconfig.scripts.json` ligne 9 référençait `scripts/bench-p1-robustness-v3.ts` (fichier inexistant, supprimé par commit `c395a316 bench(v4) cleanup`). En plus, le pattern d'include excluait TOUS les autres scripts (`bench-bestof3-ollama.ts`, `cross-test-judge.ts`, etc.) du typecheck strict.

**Conséquence** : Bugs post-refactor du provider Ollama (e.g. `createOllamaProvider({ ollamaModel })` au lieu de `OllamaProviderConfig` complet) **silencieusement non détectés** par tsc. Découverts UNIQUEMENT au runtime quand bench lancé.

## 2. Évidence empirique observée 2026-05-16

```json
// AVANT FIX — tsconfig.scripts.json:9
"include": ["scripts/bench-p1-robustness-v3.ts", "src/**/*"]
```

- `scripts/bench-p1-robustness-v3.ts` confirmé absent du filesystem (`find` retourne vide)
- Aucun autre script `scripts/**/*.ts` n'était inclus
- Le typecheck `npm run typecheck:scripts` (si lancé) ne testait QUE src/

## 3. Bugs silencieux détectés grâce à découverte de ce NCR

| Script | Bug | Commit fix |
|---|---|---|
| `bench-bestof3-ollama.ts:99` | `createOllamaProvider({ ollamaModel })` config incomplète | `e97a55a4` (Phase P3.1.1) |
| `bench-bestof3-ollama.ts:14` | `import getOllamaCallCount` (export inexistant) | `e97a55a4` |
| `cross-test-judge.ts:80` | Même bug `createOllamaProvider({ ollamaModel })` | `8b29db69` (Phase 3.1.6 bug bonus) |

→ 2 scripts broken silencieusement depuis le refactor provider Ollama.

## 4. Résolution (RESOLVED 2026-05-16)

Commit `8b29db69` :
```json
// APRÈS FIX
"include": ["scripts/**/*.ts", "src/**/*"]
```

Glob wildcard pour tous les scripts + src. Tous les scripts désormais typecheckés strict.

Plus rewrite complet du fichier (Write tool a injecté 18 NUL bytes en padding lors du Edit initial — fix par truncation Python).

## 5. Pattern méta

Pattern auto-mémoire `feedback_tsconfig_scripts_orphan_include.md` formalisé :
- AVANT cleanup/suppression de fichiers, vérifier les références dans tsconfig*.json
- Pattern d'include glob (`**/*.ts`) > référence fichier individuel
- Toujours validate que `tsc --noEmit` sur le tsconfig spécialisé matche le scope attendu

## 6. Refs

- Commit fix : `8b29db69` (Phase 3.1.6.D bug bonus + tsconfig wildcard)
- Audit nuit : `outputs/p311_audit/AUDIT_PHASE_B_BENCH_SCRIPTS_AUDIT.md`
- Pattern auto-mémoire : `feedback_tsconfig_scripts_orphan_include.md`
- Lien NCR : `NCR_ORPHAN_TESTS_BENCH_V3.md` (15 tests orphans même cause racine)

---

**Doctrine** : PROVE IT + audit complet de tous les configs lors de cleanup massif.
**Standard** : NASA-Grade L4 / DO-178C Level A.
