# Sprint S11 — Doctrinal Amendments (v3.157.0)

**Status** : `RATIFIED_SEALED`
**Date scellage** : 2026-05-26
**Autorité** : Architecte Francky (ratification finale + Tribunal 3/3 IA convergent : Gemini + ChatGPT + Cowork)
**Précédence** : Section H de `CLAUDE.md` v3.157.0
**Source DRAFT workspace** : `Claude-Workspace/OMEGA/outputs/DOCTRINE_v3.157.0_DRAFT_2026-05-26.md`

---

## 1. CONTEXTE EMPIRIQUE

Session marathon Sprint S11 (2026-05-25 → 2026-05-26) a produit deux familles de défaillances doctrinalement instructives, fondant la nécessité de v3.157.0.

### 1.1 — Pattern `MASK_AND_REVEAL` (3 occurrences empiriques)

| # | Package | Action déclenchante | Erreurs avant | Erreurs après | Delta |
|---|---|---|---|---|---|
| 1 | `apps/omega-ui` | rename `theme.ts` → `theme.tsx` | 36 (TS1005/TS1109 parser stop) | 1284 (cascade TS7026 + TS2875) | +3467% |
| 2 | `gateway/wiring` | activation `noEmitOnError: true` post-S11.3-A | 0 (rootDir mask) | 41 (`exactOptionalPropertyTypes` révélé) | +∞ |
| 3 | `gateway/wiring/envelope.ts` | fix `parent_span_id` optional spread | 1 fixed | 2 nouveaux révélés (auth_context + expected_previous_hash) | +200% |

**Mécanisme** : un fix mécanique peut faire tomber un bloqueur parser ou rootDir qui masquait une cascade d'erreurs latentes. Sans audit préalable, le delta réel est invisible jusqu'à exécution post-fix → rollback obligatoire + analyse à chaud + perte de temps.

### 1.2 — Pattern `COMMIT_PRÉMATURÉ_SUR_FAIL` (3 occurrences empiriques)

| # | Sub-batch | Promesse | Réalité empirique post-commit |
|---|---|---|---|
| 1 | gold-master | "TSC PASS attendu" | TSC FAIL → follow-up correctif requis |
| 2 | oracle | "Vitest PASS attendu" | Vitest FAIL → follow-up correctif requis |
| 3 | scribe-engine (D-batch) | "TSC PASS attendu" | TSC FAIL (`getAllScenesOrdered` dead) → follow-up correctif requis |

**Mécanisme** : confiance heuristique sur "ça devrait passer" sans exécution empirique RUNTIME dans la même chaîne avant `git commit`. Fatigue humaine + autonomie IA optimiste = boucle de confiance non testée.

---

## 2. EMP-09 — `MASK_REVEAL_AUDIT`

### 2.1 — Règle normative

Toute activation de `noEmitOnError: true` sur un package OMEGA, ou tout fix mécanique susceptible de débloquer un parser stop (rename `.ts` → `.tsx`, fix `rootDir`, ajout `exactOptionalPropertyTypes`, conversion ESM massive, etc.), DOIT être précédée d'un **audit DRY-RUN multi-axes** exécuté côté **Windows-MCP runtime natif** (le bac à sable Linux ne fait pas autorité — réf. amendement 6 `WORKSPACE_VS_REPO_DRIFT`).

### 2.2 — Procédure obligatoire

**Pré-flight baseline** :
```powershell
cd <package>
npx tsc --noEmit --incremental false --pretty false 2>&1 | Tee-Object baseline_<timestamp>.log
```

**Post-fix dry-run** :
```powershell
npx tsc --noEmit --incremental false --pretty false 2>&1 | Tee-Object postfix_<timestamp>.log
```

**Comparaison obligatoire 5 axes** :
1. **Nombre total d'erreurs** : delta baseline → postfix
2. **Classes TS nouvelles** : présence de codes TS jamais vus en baseline
3. **Fichiers nouvellement exposés** : `.ts`/`.tsx` apparaissant dans postfix absents de baseline
4. **Priorité parser/syntax** : si baseline contenait TS1xxx (parser fatal) et postfix montre TS2xxx/TS7xxx → cascade probable
5. **Cascade detection** : si nombre d'erreurs postfix > baseline ET nouveau fichier exposé → `MASK_REVEAL_DETECTED`

### 2.3 — États de sortie

| État | Conditions | Action |
|---|---|---|
| `PASS_CLEAN` | erreurs identiques ou en baisse, zéro nouvelle classe TS, zéro nouveau fichier exposé | Procéder fix/activation |
| `PASS_EXPECTED_DELTA` | delta dans seuil configuré `MASK_REVEAL_DELTA_THRESHOLD`, documenté avant action | Procéder avec note SSOT |
| `MASK_REVEAL_DETECTED` | nouvelle strate d'erreurs révélée, ou nouvelle classe TS, ou fichier exposé non prévu | **STOP + NCR DRAFT obligatoire** |

### 2.4 — Seuil `MASK_REVEAL_DELTA_THRESHOLD`

**Non-magique** : aucune valeur numérique en dur dans la doctrine. Le seuil est une **variable de configuration repo** (à définir dans `.omega-doctrine.json` ou équivalent lors d'un sprint d'outillage futur), calibrée empiriquement par package au fil des sprints. Tant que non calibrée → valeur défaut = **0** (toute augmentation déclenche MASK_REVEAL_DETECTED).

### 2.5 — Risque résiduel et fallback

- **Mécanisme principal** : un seul fix peut révéler N erreurs latentes ; activer `noEmitOnError` sans audit = blocage runtime + rollback coûteux.
- **Conditions d'échec** : parser fatal (JSX-in-.ts, syntax error), rootDir restrictif, `exactOptionalPropertyTypes` non audité, imports cassés non détectés.
- **Risque résiduel** : Windows-MCP runtime down → fallback Linux sandbox autorisé MAIS avec flag `[BASELINE_LINUX_FALLBACK]` explicite dans logs et SSOT.

---

## 3. EMP-10 — `TEST_BEFORE_COMMIT_STRICT`

### 3.1 — Règle normative

Aucun `git commit` autorisé sans validation empirique RUNTIME dans la même chaîne d'exécution, calibrée selon le **type de commit**.

### 3.2 — Typologie commit

**Type A — Commit CODE** (touche `.ts`, `.tsx`, `.js`, `.cjs`, `.mjs`, `package.json` dependencies, `tsconfig.json`, scripts build) :

```powershell
# Pré-commit OBLIGATOIRE (via commit-with-tests.ps1 chemin CODE)
npx tsc --noEmit --incremental false --pretty false  # exit 0 attendu
npx vitest run --reporter=verbose                    # PASS ou NO_TESTS_DECLARED documenté
# Si exit ≠ 0 sur TSC OU FAIL Vitest → STOP, pas de commit
```

**Type B — Commit DOC-ONLY** (touche `.md`, `.txt`, `LICENSE`, `.gitignore` non-runtime, fichiers documentation pure) :

```powershell
# Pré-commit (via commit-with-tests.ps1 chemin DOC_ONLY)
git diff --cached --name-only | Where-Object {
  $_ -notmatch '\.(md|txt|json5)$' -and $_ -ne '.gitignore' -and $_ -ne 'LICENSE'
}
# Si résultat non vide → ce n'est PAS doc-only → bascule Type A obligatoire
# Si résultat vide ET aucun contrat exécutable touché → commit autorisé sans TSC/Vitest
```

**Exception Type B → Type A forcé** : si le commit doc modifie un fichier contenant des **commandes exécutables référencées** (README avec scripts, runbook PowerShell, ADR avec code exemple compilable) → traiter comme Type A.

### 3.3 — Wrapper PowerShell obligatoire

**Livrable Phase 2A préalable à toute frappe code** : script `scripts/commit-with-tests.ps1` qui :

1. Détecte type commit (A vs B) via analyse `git diff --cached --name-only`
2. Si Type A → exécute TSC ciblé sur packages touchés + Vitest ciblé sur tests impactés
3. Si Type B → chemin `DOC_ONLY` : vérifie scope strict + détecte commandes exécutables référencées (heuristique pattern `\`\`\`(powershell|bash|sh)`) — autorise commit sans TSC/Vitest si scope confirmé
4. Capture exit codes empiriques + log SSOT
5. Si tous PASS → autorise `git commit` interactif
6. Si FAIL → bloque + affiche raison + propose NCR DRAFT

**Mandat** : ce wrapper est **OBLIGATOIRE**, non optionnel. La checklist procédurale humaine est faillible (3 occurrences S11 le prouvent). Le système doit contraindre l'humain ET l'IA.

### 3.4 — État `NO_TESTS_DECLARED`

Si package touché n'a aucun test Vitest (légitime : utility pur, types-only, etc.), l'exécution Vitest renvoie code spécial documenté. Le wrapper accepte `NO_TESTS_DECLARED` comme PASS **uniquement si** le `package.json` du package contient le flag explicite `"omega:no-tests-rationale": "<raison>"`. Sinon → FAIL bloquant.

### 3.5 — Risque résiduel et fallback

- **Mécanisme principal** : confiance heuristique sans preuve runtime = dette technique masquée + rollback coûteux + perte de confiance dans chaîne CI.
- **Conditions d'échec** : fatigue humaine, autonomie IA optimiste, déclaration "ça devrait passer" sans empirie.
- **Risque résiduel** : wrapper PS bloqué (lock, erreur runtime PS) → fallback procédural avec checklist manuelle SIGNÉE + log SSOT explicite `[PROCEDURAL_FALLBACK_EMP-10]`.

---

## 4. PLAN D'APPLICATION POST-SCELLEMENT

**Étape 1 (CETTE LIVRAISON)** : scellement v3.157.0 — `CLAUDE.md` Section H amendée + ce fichier doctrine versionné — 1 commit atomique doc-only Type B + tag `phase-s-doctrine-v3.157.0-sealed-2026-05-26`.

**Étape 2A (Phase 2A — commit code Type A séparé)** : création `scripts/commit-with-tests.ps1` (livrable obligatoire EMP-10). Le wrapper sera lui-même soumis à EMP-10 self-applied (Type A, TSC + Vitest empirique sur scripts/ ou `NO_TESTS_DECLARED` justifié).

**Étape 2B (Phase 2B — frappe gateway/resilience)** : 139 err TS1205 cluster ESM `export type` — script batch transformation mécanique. DOIT être précédé d'audit EMP-09 dry-run + utilisé wrapper EMP-10 pour commit.

**Étape 3+ (Sprints futurs)** : extension à gateway root (55 err cascade), puis S11.4-C (gold-cli + headless-runner), puis selon priorités produit Architecte.

---

## 5. VERDICT SCELLEMENT

- **Statut** : `RATIFIED_SEALED` post-Tribunal 3/3 IA convergent
- **Confiance** : Haute (3 occurrences empiriques par pattern + corrections ChatGPT + ajustements Gemini absorbés)
- **Forces** :
  1. Empirique : ancré sur 6 occurrences réelles session S11 (3 mask-and-reveal + 3 commit prématuré)
  2. Non-magique : aucun seuil numérique en dur, tout configurable
  3. Multi-axes : EMP-09 vérifie 5 dimensions, pas seulement total erreurs
  4. Typologie commit : EMP-10 distingue code vs doc-only avec chemin `DOC_ONLY` explicite (pas de religion du test pour virgule README)
  5. Windows-MCP runtime natif autoritaire (réf. amendement 6 existant)
- **Faiblesses identifiées** :
  1. Wrapper PS pas encore implémenté → risque dérive entre doctrine et implémentation (mitigée par étape 2A explicite obligatoire avant Phase 2B)
  2. Pas de mécanisme automatique de calibration `MASK_REVEAL_DELTA_THRESHOLD` (humain doit le faire au fil du temps)
- **Risques restants** : si wrapper Phase 2A non implémenté → EMP-10 reste théorique. Gate Phase 2B sur `gateway/resilience` impossible sans wrapper.
- **Action requise** : commit doc-only + tag + push (CETTE LIVRAISON), puis Phase 2A wrapper, puis Phase 2B frappe.

---

_Document scellé Sprint S11 — Doctrine OMEGA v3.157.0 — Convergence Tribunal Gemini + ChatGPT + Cowork ratifiée par Architecte Francky — Standard NASA-Grade L4 / DO-178C Level A_
