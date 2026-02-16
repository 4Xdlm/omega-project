# OMEGA — INSTRUCTION CLAUDE CODE — COMMIT 10.7
# Sprint 10 (POLISH-V2) — Tests + Gates + ProofPack + SEAL
# Date: 2026-02-16

## RÔLE

Tu es l'ingénieur système OMEGA. Exécute le commit 10.7 — DERNIER commit du Sprint 10.
Ce commit SCELLE le sprint. Il ne crée rien de nouveau, il VÉRIFIE et DOCUMENTE.

## ÉTAT ACTUEL DU REPO

| Attribut | Valeur |
|----------|--------|
| HEAD | `32c4d087` (master) |
| Tests baseline | 324/324 PASS (sovereign-engine) |
| Commits 10.1-10.6 | ✅ TOUS DONE |

### Commits Sprint 10 réalisés :
| Commit | Hash | Description |
|--------|------|-------------|
| 10.1 | (voir git log) | sentence-surgeon types + constantes |
| 10.2 | af335ecc | surgeonPass() + rewriteSentence() |
| 10.3 | 0fa8ce1d | reScoreGuard() |
| 10.4 | a2294738 | patchParagraph() (quantum suture) |
| 10.5 | b4e12679 | emotion-to-action dans constraint compiler |
| 10.6 | 32c4d087 | remplacement 3 no-op (sync→async) |

## PRÉ-VOL OBLIGATOIRE

```bash
cd packages/sovereign-engine
git status  # DOIT être clean
npx vitest run 2>&1  # DOIT afficher 324 passed (324)
```
Si ≠ 324 PASS → STOP.

## COMMIT 10.7 — TESTS + GATES + PROOFPACK

### Étape 1 — Vérification complète des invariants

Vérifier que CHAQUE invariant Sprint 10 est couvert par au moins 1 test :

| ID | Description | Test(s) couvrant |
|----|-------------|-----------------|
| ART-POL-01 | Micro-correction JAMAIS acceptée si score_after ≤ score_before | SURG-02, GUARD-01..04, PARA-03 |
| ART-POL-02 | Max 15 corrections/passe | SURG-03 |
| ART-POL-03 | Chaque correction traçable (MicroPatch) | SURG-05 |
| ART-POL-04 | polishRhythm() NE retourne PLUS prose inchangée | NOOP-01 |
| ART-POL-05 | sweepCliches() NE retourne PLUS prose inchangée | NOOP-02 |
| ART-POL-06 | enforceSignature() NE retourne PLUS prose inchangée | NOOP-03 |

Si un invariant n'a pas de test → l'AJOUTER.

### Étape 2 — Audits complets

```bash
# Audit zéro dette
grep -rn "TODO\|FIXME\|HACK" src/ tests/
# Attendu : 0 résultat

# Audit zéro any
grep -rn ": any\b" src/
# Attendu : 0 résultat

# Audit zéro ts-ignore
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/
# Attendu : 0 résultat
```

### Étape 3 — Générer ProofPack Sprint 10

Utiliser le système de proofpack existant (`src/proofpack/generate-proofpack.ts` si disponible) ou créer manuellement :

```bash
mkdir -p proofpacks/sprint-10/10.7

# Test final complet
npx vitest run 2>&1 > proofpacks/sprint-10/10.7/npm_test.txt

# Audit grep
grep -rn "TODO\|FIXME\|HACK" src/ tests/ > proofpacks/sprint-10/10.7/grep_no_todo.txt 2>&1 || echo "CLEAN" > proofpacks/sprint-10/10.7/grep_no_todo.txt
grep -rn ": any\b" src/ > proofpacks/sprint-10/10.7/grep_no_any.txt 2>&1 || echo "CLEAN" > proofpacks/sprint-10/10.7/grep_no_any.txt

# Gates output
npx vitest run --reporter=verbose 2>&1 > proofpacks/sprint-10/10.7/gates_output.txt
```

### Étape 4 — Produire Sprint10_SEAL_REPORT.md

Créer le fichier `proofpacks/sprint-10/Sprint10_SEAL_REPORT.md` avec ce contenu (rempli avec les valeurs réelles) :

```markdown
# OMEGA — Sprint 10 (POLISH-V2) — SEAL REPORT

## Résumé

| Attribut | Valeur |
|----------|--------|
| Sprint | 10 — POLISH-V2 |
| Commits | 7 (10.1 → 10.7) |
| Tests avant | 308/308 |
| Tests après | X/X |
| Tests ajoutés | +Y |
| Invariants | ART-POL-01..06 (6/6 PASS) |
| Verdict | PASS |

## Commits

| # | Hash | Message | Tests ajoutés |
|---|------|---------|---------------|
| 10.1 | ... | feat(sovereign): sentence surgeon interface + types [ART-POL-01, ART-POL-02] | +4 |
| 10.2 | af335ecc | feat(sovereign): micro-rewrite engine [ART-POL-01, ART-POL-02, ART-POL-03] | +5 |
| 10.3 | 0fa8ce1d | feat(sovereign): re-score guard (zero regression) [ART-POL-01] | +4 |
| 10.4 | a2294738 | feat(sovereign): paragraph-level patch (quantum suture) [ART-POL-01] | +3 |
| 10.5 | b4e12679 | feat(sovereign): emotion-to-action mapping in constraint compiler [ART-SEM-05] | +3 |
| 10.6 | 32c4d087 | feat(sovereign): replace 3 no-op polish functions [ART-POL-04,05,06] | +5 (-4 ancien) |
| 10.7 | (ce commit) | chore(sovereign): tests + gates + proofpack Sprint 10 [ART-POL-01..06] | +0 |

## Invariants

| ID | Description | Test(s) | PASS |
|----|-------------|---------|------|
| ART-POL-01 | Zéro correction dégradante | SURG-02, GUARD-01..04, PARA-03 | ✅ |
| ART-POL-02 | Max 15 corrections/passe | SURG-03 | ✅ |
| ART-POL-03 | Traçabilité MicroPatch | SURG-05 | ✅ |
| ART-POL-04 | polishRhythm ACTIF | NOOP-01 | ✅ |
| ART-POL-05 | sweepCliches ACTIF | NOOP-02 | ✅ |
| ART-POL-06 | enforceSignature ACTIF | NOOP-03 | ✅ |

## Fichiers créés/modifiés

(lister tous les fichiers touchés par Sprint 10)

## Audits
- TODO/FIXME : 0
- any : 0
- ts-ignore : 0
```

### Étape 5 — Commit final

```bash
git add proofpacks/sprint-10/10.7/ proofpacks/sprint-10/Sprint10_SEAL_REPORT.md
git commit -m "chore(sovereign): tests + gates + proofpack Sprint 10 [ART-POL-01..06]"
```

⚠️ NE PAS toucher à `.roadmap-hash.json`. Revert si modifié.

## CRITÈRES PASS

| # | Critère |
|---|---------|
| 1 | 6/6 invariants ART-POL-01..06 couverts par tests |
| 2 | Total tests ≥ 324 PASS, 0 fail |
| 3 | Audits clean (0 TODO, 0 any, 0 ts-ignore) |
| 4 | Sprint10_SEAL_REPORT.md complet |
| 5 | ProofPack 10.7 (npm_test.txt + grep audits + gates) |
| 6 | `git status` clean |

## FORMAT DE RENDU

```
📦 LIVRABLE — Commit 10.7 — Sprint 10 SEAL
Tests: X/X PASS
Invariants: ART-POL-01..06 (6/6 PASS)
Audits: CLEAN
ProofPack: proofpacks/sprint-10/
SEAL_REPORT: proofpacks/sprint-10/Sprint10_SEAL_REPORT.md
Git: chore(sovereign): tests + gates + proofpack Sprint 10 [ART-POL-01..06]
VERDICT: PASS/FAIL — SPRINT 10 SEALED / NOT SEALED
```
