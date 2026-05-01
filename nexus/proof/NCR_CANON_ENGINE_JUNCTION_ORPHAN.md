# NCR_CANON_ENGINE_JUNCTION_ORPHAN

**ID** : NCR_CANON_ENGINE_JUNCTION_ORPHAN
**Title** : Junction `canon-engine` orpheline détectée — package non listé dans workspaces[], origine et utilité indéterminée
**Status** : **RESOLVED** (2026-05-01 — closure rétroactive post-cleanup de facto)
**Severity** : P3 — non bloquant production, dette technique
**Priority** : P3
**Opened** : 2026-04-27 (Tribunal 3-IA, retro S6 forensics)
**Owner** : Francky + Claude

---

## 1. Issue

Lors du forensics S6 (Tribunal 3-IA), un répertoire `packages/canon-engine/`
ou similaire a été identifié comme **orphelin** :
- Non listé dans le `workspaces[]` du `package.json` racine
- Non référencé par les autres packages
- Origine non documentée (commit créant le dossier introuvable ou ambigu)

**Statut empirique à confirmer en S6.2** (audit non effectué en S6.1 par
strict scope).

## 2. Preuves (à compléter en S6.2)

### 2.1 Vérification existence

```
$ ls packages/canon-engine 2>&1
(à exécuter en S6.2 — non couvert S6.1)

$ git log --all --diff-filter=A -- "packages/canon-engine/" 2>&1 | head
(historique création à investiguer)
```

### 2.2 Vérification workspace

```
$ grep -E "canon.engine" package.json
(devrait être absent si vraiment orphelin)
```

### 2.3 Vérification dépendants

```
$ grep -rln "canon-engine\|@omega/canon-engine" packages/ --include="package.json"
(devrait être 0 références)
```

## 3. Hypothèses

### 3.1 H1 — Restant Phase Q (renommée vers canon-kernel)

Possible : `canon-engine` aurait été le nom historique de `canon-kernel`.
Renommé Phase Q ou ultérieur, le dossier original n'a pas été nettoyé.

**Test S6.2** : `git log --all --oneline -- "packages/canon-kernel/" "packages/canon-engine/"`
pour voir l'historique de renommage éventuel.

### 3.2 H2 — Branche WIP abandonnée fusionnée

Possible : commit fusion d'une branche feature ayant créé canon-engine
indépendamment, jamais utilisé en main.

### 3.3 H3 — Junction Windows

Possible (Windows-specific) : `canon-engine` est un junction (symlink) vers
`canon-kernel`. Détectable via `dir /A:L` ou `Get-Item .Attributes`.

**Test S6.2** : `Get-Item packages/canon-engine | Select Attributes` ou
`fsutil reparsepoint query packages/canon-engine`.

## 4. Impact

### 4.1 Doctrine "REPO = TRUTH" (CLAUDE.md §C.9)

La présence d'un répertoire orphelin viole la cohérence repo : code physique
sans rôle déclaré dans la structure projet.

### 4.2 Impact production : NUL

Si vraiment orphelin (non importé), aucun impact runtime. C'est de la dette
technique pure.

### 4.3 Risque archéologique

Tout audit futur (security review, license check, code metrics) inclura ce
dossier dans les résultats sans contexte → faux signaux.

## 5. Options de résolution

### Option A — Investiguer puis supprimer

**Description** : audit historique, confirmation orphelin, `git rm -r
packages/canon-engine`.

**Effort** : 30 min audit + 10 min cleanup.

**Bénéfice** : repo propre.

### Option B — Documenter et conserver (si junction)

**Description** : si confirmé junction Windows vers canon-kernel, ajouter
`.gitkeep` ou commentaire `README.md` expliquant le pourquoi.

**Effort** : 15 min.

### Option C — Auto-cleanup tool

**Description** : créer un script de cleanup repo qui détecte les packages
orphelins (présents dans `packages/` mais absents du `workspaces[]`).

**Effort** : 1h tool.

**Bénéfice** : régression detection.

## 6. Recommandation

**Option A** en S6.2 ou sprint cleanup dédié. Confirmer orphelin via
investigation puis supprimer si non utilisé.

**NE PAS** appliquer en S6.1 (hors scope hotfix gate-imports).

## 7. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S6.1 | **DONE** |
| 2 | Investiguer existence + nature (junction?) | Claude | S6.2 | PENDING |
| 3 | Décision Architecte cleanup vs documenter | Francky | S6.2 | PENDING |
| 4 | Cleanup ou documentation finale | Claude | S6.2 | PENDING |

## 8. Traçabilité

- **Source** : Tribunal 3-IA observation (Cowork + Gemini + ChatGPT, 2026-04-27)
- **Hotfix S6.1** : `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`
- **NCRs liés** : `NCR_BUILD_CASCADE_INCOMPLETE` (P2 — peut révéler d'autres orphelins lors audit dist/)

## 9. Signature

```
NCR-ID    : NCR_CANON_ENGINE_JUNCTION_ORPHAN
OPENED    : 2026-04-27 (Tribunal 3-IA observation)
STATUS    : RESOLVED — closure rétroactive 2026-05-01 (post-cleanup de facto)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```

---

## 9bis. Post-mortem investigation rétroactive (2026-05-01)

### 9bis.1 Constat brut — violation procédurale

- **Le cleanup `canon-engine` a eu lieu de facto sans suivre la procédure §7.**
- **Aucune investigation H1/H2/H3 documentée n'a été produite au moment du cleanup.**
- **Aucune décision Architecte tracée** dans un NCR de décision ou commit log.
- **Aucun commit de fermeture formel** ne marque la transition orphan → cleaned.
- **Le drift `package-lock.json`** (entrée `packages/canon-engine: { extraneous: true }`)
  **est l'unique preuve observable** du cleanup, détectée incidemment lors du
  diagnostic working tree non-clean en session 2026-05-01.

### 9bis.2 Évidences empiriques collectées en analyse rétroactive (2026-05-01)

Commandes exécutées sur le repo dans son état post-cleanup :

| Test | Commande | Résultat |
|------|----------|----------|
| EMP-1 | `git log --all --diff-filter=D --summary -- packages/canon-engine/package.json` | VIDE |
| EMP-2 | `git log --all --oneline -- packages/canon-engine/` | VIDE |
| EMP-3 | `git log --all --diff-filter=A --summary -- "packages/canon-engine/*"` | VIDE |
| EMP-4 | `git log --all --diff-filter=R -- canon-kernel canon-engine` | VIDE |
| EMP-5 | grep `canon-engine` dans tous `packages/*/package.json` | 0 référence |
| EMP-6 | `Test-Path packages/canon-engine` | False |
| EMP-7 | SBOM `nexus/proof/phase_sbom/SBOM_BASELINE.json` + `SBOM.json` | 2 entrées : `@omega/canon-engine` ET `@omega/canon-kernel` (noms distincts) |
| EMP-8 | Phase-C report `WORKSPACE_STABILIZATION_REPORT_2026-01-27.md:152` | `canon-engine` listé comme membre actif aux côtés de `canon-kernel` |

### 9bis.3 Diagnostic des hypothèses §3

**H1 — Restant Phase Q (renommage canon-engine → canon-kernel)** : **REFUTÉE partiellement**.
EMP-8 montre que les deux packages coexistaient comme membres distincts au 2026-01-27.
Un renommage produirait l'extinction de l'un en faveur de l'autre, pas leur coexistence.

**H2 — Branche WIP abandonnée fusionnée** : **PLAUSIBLE mais non confirmée**.
Cohérente avec EMP-1/2/3/4 (zéro trace git), mais aucune évidence directe d'un merge
commit creating canon-engine n'est observable. Si fusion il y a eu, elle a été
ultérieurement reset ou rebased hors de la lignée actuelle.

**H3 — Junction Windows (symlink vers canon-kernel)** : **AFFAIBLIE par EMP-7**.
SBOM enregistre `@omega/canon-engine` ET `@omega/canon-kernel` comme entités à noms
distincts. Une junction exposerait le `package.json` de la cible (canon-kernel) sous
les deux chemins, produisant typiquement le même nom dédupliqué. Deux noms distincts
suggèrent une identité propre de canon-engine.

### 9bis.4 Conclusion rétroactive

**Hypothèse confirmée empiriquement : INDÉTERMINABLE RÉTROACTIVEMENT.**

L'absence totale de trace git (EMP-1 à EMP-4) combinée à la présence d'évidences
externes (EMP-7 SBOM, EMP-8 Phase-C report) crée une **contradiction empirique** :
canon-engine existait comme entité scannée par les outils tooling, mais n'a jamais
été commité dans aucune branche accessible.

Explications candidates non discriminables sans logs forensics S6.P1/P2 complets :
- (a) Variante H3 affaiblie : junction avec `package.json` shadow distinct
- (b) Variante H2 plausible : commit perdu (reset/rebase ultérieur effaçant la trace)
- (c) Hypothèse non listée §3 : `packages/canon-engine` créé par un script local
  (scaffolding, build artifact) ignoré par `.gitignore` à un moment donné

### 9bis.5 Violation doctrinale

**Violation §7 (plan d'action) : ADMISE.**

Sévérité : **P3** (résultat physique correct : orphelin supprimé, repo propre ;
process violé : aucune décision Architecte tracée, aucune investigation préalable).

### 9bis.6 Action corrective Sprint S9+

Amendement Plan Max v3.1.0 — **doctrine RECOVERY TEST** :

> Tout cleanup de package, dossier, ou artefact dans `packages/` ou `nexus/proof/`
> DOIT être précédé d'un commit ou NCR formel documentant :
> - L'état pré-cleanup (ls, hash, git log)
> - La décision Architecte (ou auto-décision motivée)
> - L'investigation H1/H2/H3 si NCR ouvert
>
> Objectif : empêcher futurs cleanups silencieux ne laissant que des drifts
> incidemment détectés comme unique preuve a posteriori.

### 9bis.7 Preuve observable du cleanup (closure)

Commit accompagnant cette closure :
- **Modifié** : `package-lock.json` — alignement lockfile sur état réel post-cleanup
  (`canon-engine: { extraneous: true }` retiré, références `node_modules/@omega/canon-engine`
  et `file:../canon-engine` supprimées)
- **Modifié** : ce fichier (NCR_CANON_ENGINE_JUNCTION_ORPHAN.md) — status RESOLVED + section 9bis
