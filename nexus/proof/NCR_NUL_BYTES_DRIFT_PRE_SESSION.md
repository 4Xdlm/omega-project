# NCR_NUL_BYTES_DRIFT_PRE_SESSION

**ID** : NCR_NUL_BYTES_DRIFT_PRE_SESSION
**Title** : 3 fichiers `polish/*.ts` contiennent 4 NUL bytes injectés — corruption silencieuse pré-session
**Status** : **OPEN_DIAGNOSED** (fix proposé chirurgical, NCR + test reverse selon RECOVERY_TEST_DOCTRINE)
**Severity** : **HIGH**
**Priority** : P1
**Opened** : 2026-05-15 (Phase 3.1.1 — découverte ANCHOR_PRE_FLIGHT working tree drift)
**Owner** : Francky + Claude
**Référence parent** : commit `847429cb` (P3.1.1) — drift INDÉPENDANT du fix

---

## 1. Résumé

À l'ouverture de la session Phase 3.1.1, l'ANCHOR_PRE_FLIGHT a détecté
un working tree drift de 9 fichiers (mémoire `project_p311_correctionpitch_*`).
L'investigation chirurgicale a montré une discrimination 3+3 :

- **3 fichiers `polish/*.ts` corrompus** par injection de 4 NUL bytes
  (signature artefact Edit tool documentée `feedback_edit_tool_nul_artifact.md`)
- 3 fichiers `scoring/*.ts` + `validation/*.ts` = modifs légitimes
  (NUL=0, diff propre `+1 -2` par fichier)

Le pattern "exactement 4 NUL bytes par fichier" sur 3 fichiers consécutifs
du même répertoire suggère un **événement de corruption groupé** lors
d'une session multi-Edit antérieure.

→ Sealed pipeline INV-VAL-05 cassé sur `musical-engine.ts` (T08 FAIL)
mais cause SUPERPOSÉE à NCR_INV_VAL_05_SEALED_LIST_DRIFT (HEAD lui-même
divergé du sealed).

## 2. Évidence empirique observée 2026-05-15

**Mesures NUL bytes via sandbox bash (`tr -d -c '\0' | wc -c`)** :

| Fichier | Size | NUL | Git diff stat |
|---|---|---|---|
| `packages/sovereign-engine/src/polish/anti-cliche-sweep.ts` | 4982 | **4** | `Bin -` (binaire) |
| `packages/sovereign-engine/src/polish/musical-engine.ts` | 7432 | **4** | `Bin 7428 -> 7432` (binaire) |
| `packages/sovereign-engine/src/polish/signature-enforcement.ts` | 4531 | **4** | `Bin -` (binaire) |

**Contre-exemples (cluster B propre)** :

| Fichier | Size | NUL | Git diff |
|---|---|---|---|
| `packages/sovereign-engine/src/scoring/multi-stage-scorer-v2.ts` | 8946 | **0** | `+1 -2` (texte) |
| `packages/sovereign-engine/src/scoring/multi-stage-scorer-v3.ts` | 8104 | **0** | `+1 -2` (texte) |
| `packages/sovereign-engine/src/validation/phase-u/benchmark/run-dual-benchmark.ts` | 28685 | **0** | `+1 -2` (texte) |

**Contrôle patches Phase 3.1.1 (non corrompus)** :

| Fichier | Size | NUL |
|---|---|---|
| `packages/sovereign-engine/src/runtime/anthropic-provider.ts` | 21754 | **0** |
| `packages/sovereign-engine/src/runtime/ollama-provider.ts` | 12070 | **0** |

## 3. Ce qui est PROUVÉ empiriquement

- 3 fichiers `polish/*.ts` contiennent exactement 4 NUL bytes chacun
- Git les voit comme **binaires** (numstat `- -`, diff stat `Bin`)
- file(1) les détecte comme "Java source, Unicode text, UTF-8 text"
  (faux positif binary detection)
- Le pattern "4 NUL bytes par fichier sur 3 fichiers d'un même dossier"
  correspond exactement à l'artefact documenté `feedback_edit_tool_nul_artifact.md`
- Les patches P3.1.1 (runtime/) sont indemnes — corruption locale à polish/
- INV-VAL-05 T08 FAIL sur `musical-engine.ts` est superposé : cause
  principale = `NCR_INV_VAL_05_SEALED_LIST_DRIFT` (HEAD divergé sealed),
  mais NUL bytes worktree aggravent la divergence (3e hash distinct)

## 4. Ce qui N'EST PAS prouvé (à investiguer)

- Session/commit exact qui a contaminé les 3 fichiers
- Si la corruption affecte le runtime (les NUL bytes sont-ils dans
  des commentaires ou dans du code actif ?)
- Si esbuild/tsc tolère ou crash sur ces NUL bytes (`tsc --noEmit` PASS
  post-P3.1.1 → tolère apparemment, mais peut-être suspecte)
- Origine humain vs automatique (script ? IDE ? Edit tool ?)

## 5. Hypothèses sur cause racine (NON tranchées)

- **H1** : Session Edit-tool antérieure (Cowork sandbox) a injecté
  les NUL bytes lors d'un multi-Edit sur le dossier polish/
  (cf. `feedback_edit_tool_nul_artifact.md` pattern documenté)
- **H2** : Un script de polish/refactor a écrit en mode binaire au lieu
  de texte (rare, mais possible avec un script Node mal configuré)
- **H3** : Sauvegarde/restauration mal-encodée depuis archive ZIP
- **H4** : `git checkout` interrompu en plein milieu (très rare)

## 6. Risques identifiés

- **R1** : Compilation tsc peut échouer silencieusement sur ces fichiers
  dans certaines configurations (skipLibCheck off, strict mode)
- **R2** : Runtime import peut faire crasher Node si NUL bytes dans
  positions critiques (rare mais déjà observé sur esbuild)
- **R3** : INV-VAL-05 T08 reste FAIL tant que corruption non traitée
- **R4** : Pattern récurrent → autres polish/* potentiellement corrompus
  dans des sessions futures (Edit tool reste actif sur mount omega-project)
- **R5** : Confiance dans le sealed pipeline compromise

## 7. Tests requis pour trancher (Sprint S10+)

1. Localiser les NUL bytes : `grep -aP '\x00' <fichier>` ou `od -c <fichier> | grep "\\0"`
2. Vérifier si les NUL sont dans code actif vs commentaires
3. `git log --all -- <fichier>` pour identifier session contaminante
4. Recherche `git reflog` pour stash/checkout récents
5. Audit autres dossiers similaires (engine/, scoring/) pour NUL bytes
6. Tester compilation tsc strict avec et sans NUL bytes

## 8. Décision actuelle

- **Fix proposé chirurgical par fichier** (doctrine RECOVERY_TEST_DOCTRINE :
  NCR + test reverse) :
  ```powershell
  git checkout -- packages/sovereign-engine/src/polish/anti-cliche-sweep.ts
  git checkout -- packages/sovereign-engine/src/polish/musical-engine.ts
  git checkout -- packages/sovereign-engine/src/polish/signature-enforcement.ts
  ```
- **Test reverse** : vérifier NUL=0 post-revert sur les 3 fichiers
- **NE RÉSOUDRA PAS T08** car cause principale = HEAD ≠ sealed (NCR_INV_VAL_05)
- Fix indépendant du commit P3.1.1 — commit séparé recommandé

## 9. Action recommandée (pending Francky)

1. Sauvegarde diff avant revert : `git diff -- packages/sovereign-engine/src/polish/ > nexus/proof/P311_POLISH_PRE_REVERT.patch`
2. Revert chirurgical sur les 3 fichiers (commandes ci-dessus §8)
3. Vérification post-revert NUL=0 (test reverse doctrine)
4. Commit dédié : `chore(polish): revert NUL bytes corruption pre-session — NCR_NUL_BYTES_DRIFT_PRE_SESSION`
5. Investigation H1 : audit `git reflog` pour identifier session source

## 10. Refs

- Mémoire pattern : `feedback_edit_tool_nul_artifact.md`
- NCR superposé : `NCR_INV_VAL_05_SEALED_LIST_DRIFT.md`
- Commit parent : `847429cb` (P3.1.1) — drift INDÉPENDANT
- Fichiers affectés (3) : [REPO] `packages/sovereign-engine/src/polish/`

---

**Doctrine** : RECOVERY_TEST_DOCTRINE (cleanup chirurgical + test reverse).
**Standard** : NASA-Grade L4 / DO-178C Level A.
