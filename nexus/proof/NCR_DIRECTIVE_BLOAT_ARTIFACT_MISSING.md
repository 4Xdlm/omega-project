# NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING

**ID** : NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING
**Title** : `DIRECTIVE_ABLATION_VERDICT_v1.md` référencé par 2 NCRs mais introuvable dans le repo
**Status** : **OPEN_DIAGNOSED**
**Severity** : MEDIUM (potentiellement HIGH si preuve centrale)
**Priority** : P2
**Opened** : 2026-05-01 (Sprint S8 Vague 2 D7 — recherche exhaustive Claude Code)
**Owner** : Francky + Claude

---

## 1. Issue

Le fichier `outputs/DIRECTIVE_ABLATION_VERDICT_v1.md` est référencé comme
preuve empirique dans **deux NCRs** :

1. **`NCR_DIRECTIVE_BLOAT.md`** §"Clôture > Evidence (SHA256 scellés)" — listé
   parmi les 5 evidences du verdict `DIRECTIVE_BLOAT_CONFIRMED` (CLOSED_CONFIRMED)
   sans hash SHA256 (les 4 autres evidences ont leur SHA256, lui non).
2. **`NCR_CATHEDRAL_BASELINE.md:251`** §"Traçabilité" — listé comme verdict
   ablation directive avec mention "SHA256 à sceller post-commit".

Le fichier est **introuvable** dans le repo (fichier absent du disque, jamais
commité dans aucune branche). Le scellage SHA256 mentionné n'a donc jamais eu lieu.

## 2. Preuves empiriques (recherche exhaustive Sprint S8 Vague 2 D7)

### EMP-1 — Recherche filesystem recursive

```powershell
$ Get-ChildItem -Path C:\Users\elric\omega-project -Recurse `
    -Filter "*DIRECTIVE_ABLATION*" -ErrorAction SilentlyContinue
(empty result)
```

### EMP-2 — Git log --all --name-only

```bash
$ git log --all --name-only -- "*DIRECTIVE_ABLATION*"
(empty result — fichier jamais commité dans aucune branche / aucun ref)
```

### EMP-3 — Git grep content references

```bash
$ git grep -l "DIRECTIVE_ABLATION_VERDICT"
nexus/proof/NCR_CATHEDRAL_BASELINE.md
nexus/proof/NCR_DIRECTIVE_BLOAT.md
```

→ Le nom apparaît uniquement dans 2 NCRs (références), jamais dans le contenu
d'un autre fichier qui contiendrait la preuve elle-même.

### EMP-4 — Recherches variantes filename

```powershell
$ Get-ChildItem -Recurse -Filter "*ablation*verdict*"
(empty)

$ Get-ChildItem -Recurse -Filter "*directive*ablation*"
(empty)
```

Aucun fichier proche par nom n'existe.

### EMP-5 — Recherches sub-paths spécifiques

```powershell
$ Test-Path C:\Users\elric\omega-project\OMEGA       # uppercase
False
$ Get-ChildItem omega -Recurse -Filter "*DIRECTIVE*"  # lowercase
(empty)
$ Get-ChildItem packages -Recurse -Filter "*DIRECTIVE*"
(empty)
$ Get-ChildItem nexus -Recurse -Filter "*DIRECTIVE*"
(empty)
```

### EMP-6 — Comparaison avec autres evidences NCR_DIRECTIVE_BLOAT

Les 4 autres evidences ont leurs SHA256 scellés et sont **présents dans le repo** :

| Evidence | SHA256 | Présent ? |
|----------|--------|-----------|
| `bench-ablation-directive-results.json` | `F33209CD..A561555` | ✅ |
| `bench-ablation-directive-results-report.md` | `68854202..AF9E9A81` | ✅ |
| `scripts/bench-ablation-directive.ts` | `06E3C4E0..3404F7` | ✅ |
| `src/generation/adaptive-chunker.ts` | `DBF6A4B2..F032C438D` | ✅ |
| **`outputs/DIRECTIVE_ABLATION_VERDICT_v1.md`** | **(non scellé)** | **❌ INTROUVABLE** |

→ Le fichier manquant est précisément celui qui n'a jamais reçu de SHA256.

## 3. Impact

### 3.1 Closure NCR_DIRECTIVE_BLOAT partiellement non-vérifiable

`NCR_DIRECTIVE_BLOAT` est **CLOSED_CONFIRMED** (commit `fcbba202`, 2026-04-18).
Sa traçabilité §"Clôture > Evidence" liste 5 fichiers comme preuve. Avec 1/5
introuvable, la preuve **est partiellement amputée**.

Les 4 evidences restantes (JSON bench, report markdown, script bench, code
modifié) sont suffisantes pour **reproduire** le verdict factoriel 2×2
(Δ(A→B)=-2.027 etc.), mais le verdict markdown narratif final est perdu —
ce qui peut être ce qui a synthétisé la décision de scellage.

### 3.2 NCR_CATHEDRAL_BASELINE traçabilité dégradée

`NCR_CATHEDRAL_BASELINE` (P1, OPEN, ouvert même commit `fcbba202` que la
closure DIRECTIVE_BLOAT) cite ce verdict comme **prérequis** de son
analyse (le NCR_CATHEDRAL_BASELINE traite la "cause distincte" CATHEDRAL
identifiée dans le verdict ablation). Sans le verdict, le contexte
décisionnel CATHEDRAL est appauvri.

### 3.3 Risque dette documentaire

Tout futur sprint réouvrant le dossier directive-bloat (par exemple pour
décider si redesign `REGISTER_TABLE['litteraire']['silence']` doit être
conduit) devra reconstituer le verdict synthétique à partir des 4 evidences
restantes.

### 3.4 Risque méta — scellage NCR sur preuve introuvable

Pattern doctrinal préoccupant : `NCR_DIRECTIVE_BLOAT` a été marqué
**CLOSED_CONFIRMED** alors qu'une de ses preuves citées n'a jamais été
commitée. Cela soulève la question : **combien d'autres NCRs CLOSED ont
un évidence-gap similaire** ?

(Voir aussi `NCR_REGISTRY_BROKEN_FILTER` §3.2 — risque de faux scope sur
audits NCR.)

## 4. Action requise (Sprint S9+)

### 4.1 Recherche archive backup

Le fichier peut exister dans :
- Backup local Francky (Claude-Workspace, OneDrive, externe)
- Archive externe `Claude-Workspace/OMEGA/archive/drift-20260420/MANIFEST.md`
  (référencée par `docs/archive/drift-20260420.md` — 31 fichiers archivés)
- Snapshots filesystem antérieurs (Restore Points Windows, Time Machine, etc.)

**Action 1** : audit de l'archive externe `drift-20260420` pour vérifier si
le fichier y figure (manifest accessible uniquement à Francky côté workspace).

### 4.2 Régénération si faisable

Si le fichier original est définitivement perdu, mais les 4 evidences
restantes (bench JSON + report + script + code) sont intactes :

**Action 2** : régénérer un `DIRECTIVE_ABLATION_VERDICT_v1_REGEN_2026-05-01.md`
synthétique à partir du bench JSON, en marquant explicitement qu'il
remplace l'original perdu et n'a pas de SHA256 historique.

### 4.3 Reclassification NCR_DIRECTIVE_BLOAT si fichier irrécupérable

Si Action 1 et Action 2 échouent ou ne sont pas conduites :

**Action 3** : envisager la **rétrogradation** de `NCR_DIRECTIVE_BLOAT`
de `CLOSED_CONFIRMED` vers `ACCEPTED_DIAGNOSED_UNKNOWN` — statut qui
admet honnêtement que le verdict est **opérationnellement valide**
(les autres evidences sont là) mais **forensiquement amputé** (preuve
synthétique perdue).

Cette décision est de l'autorité Architecte (Francky) — elle ne sera
**pas** prise dans le présent NCR.

## 5. Hypothèses sur la disparition

### H1 — Fichier jamais commité (perdu localement)

Possible : le fichier a été produit sur le disque de Francky à la fin du
bench ablation (2026-04-17 nuit), mais le commit `fcbba202` qui scellait
la closure n'a inclus que les 4 fichiers techniques (bench, report,
script, code). Le verdict markdown serait resté en workspace local non
commité, puis perdu lors d'un cleanup ultérieur.

**Cohérent avec** : SHA256 mentionné "à sceller post-commit" dans
NCR_CATHEDRAL_BASELINE — promesse non tenue.

### H2 — Fichier dans archive non-tracked

Possible : le fichier a été déplacé dans
`Claude-Workspace/OMEGA/archive/drift-20260420/` (31 fichiers archivés
hors-source post-seal `phase-s-r7-sealed-2026-04-20`). Le manifest externe
n'est pas accessible runtime à Claude Code.

**Cohérent avec** : pattern d'archivage hors-source documenté dans
`docs/archive/drift-20260420.md`.

### H3 — Fichier renommé sans update NCR référence

Peu probable : aucune trace dans `git log --all` même pour un nom voisin.
Si renommage, le `git log --all --diff-filter=R` aurait montré quelque
chose. Empiriquement non observé.

## 6. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S8.V2 | **DONE** |
| 2 | Audit archive externe `drift-20260420/MANIFEST.md` | Francky (accès workspace) | S9+ | PENDING |
| 3 | Décision Architecte : régénération ou reclassification | Francky | S9+ | PENDING |
| 4 | Si régénération : créer `_REGEN_2026-05-01.md` à partir bench JSON | Claude | S9+ | BLOCKED |
| 5 | Si reclassification : update NCR_DIRECTIVE_BLOAT status | Claude | S9+ | BLOCKED |

**Sprint S8 Vague 2 : DOCUMENTATION ONLY. Aucun fix.**

## 7. Doctrine méta — scellage prématuré

Ce NCR émergent illustre un risque doctrinal plus large :

> **Un NCR ne peut pas être scellé `CLOSED_CONFIRMED` si une de ses
> preuves citées dans la traçabilité n'a pas son SHA256 explicite ou
> n'est pas vérifiable empiriquement au moment de la closure.**

Convention proposée pour amendement Plan Max v3.1.0 (en plus des
amendements C9 + C10 du NCR méta Cowork) :

> **Amendement C11 — EVIDENCE_HASH_PRECONDITION** :
> Tout passage de status `OPEN`/`DOCUMENTED` vers `CLOSED_CONFIRMED` ou
> `RESOLVED` requiert **vérification empirique de présence ET hash SHA256
> de toutes les evidences listées** dans la section traçabilité du NCR.
> Mention "à sceller post-commit" est INTERDITE comme placeholder durable.

## 8. Traçabilité

- **Source** : Sprint S8 Vague 2 D7 — recherche exhaustive Claude Code 2026-05-01
- **Découvert via** : audit closure `NCR_DIRECTIVE_BLOAT` Vague 1 C8 (path drift R2)
- **NCRs liés** :
  - `NCR_DIRECTIVE_BLOAT` (CLOSED_CONFIRMED) — preuve manquante 1/5
  - `NCR_CATHEDRAL_BASELINE` (P1, OPEN) — citation contextuelle dégradée
  - `NCR_REGISTRY_BROKEN_FILTER` (OPEN_DIAGNOSED) — pattern méta dette documentaire
  - `NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN` (à créer C17 Vague 2) — pattern
    Cowork anchors ; ce NCR-ci concerne un anchor INTERNE Claude Code
    (différent : Cowork = externe sandbox vs Claude Code = auto-référence
    repo) mais doctrine convergente

## 9. Signature

```
NCR-ID    : NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING
OPENED    : 2026-05-01 (Sprint S8 Vague 2 D7)
STATUS    : OPEN_DIAGNOSED — fix queued Sprint S9+ (audit archive externe + décision)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal, runtime arbiter)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
