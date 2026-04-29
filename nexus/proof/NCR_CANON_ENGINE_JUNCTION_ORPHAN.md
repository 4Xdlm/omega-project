# NCR_CANON_ENGINE_JUNCTION_ORPHAN

**ID** : NCR_CANON_ENGINE_JUNCTION_ORPHAN
**Title** : Junction `canon-engine` orpheline détectée — package non listé dans workspaces[], origine et utilité indéterminée
**Status** : **DOCUMENTED** (DRAFT 2026-04-27, auto-cleanup futur)
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
STATUS    : DOCUMENTED — résolution S6.2+ (auto-cleanup futur)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
