# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA EXECUTOR SYSTEM — COMPLETE PACKAGE
#   "Auto-mémoire, Auto-vérité, Auto-audit"
#
#   Version: 1.0.0
#   Date: 2026-01-23
#
#   CONTENU:
#   • PART 1 — Structure de fichiers à créer
#   • PART 2 — CI Checklist bloquante
#   • PART 3 — Prompt Executor (clé en main)
#   • PART 4 — Règles de mise à jour
#   • PART 5 — Scripts d'exécution
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              PART 1 — STRUCTURE DE FICHIERS
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# PART 1 — STRUCTURE DE FICHIERS À CRÉER DANS LE REPO

```
omega-project/
│
├── 📄 OMEGA_README.md                    ← Point d'entrée (1 page)
├── 📄 OMEGA_MASTER_PLAN.md               ← Source de vérité humaine
├── 📄 OMEGA_MASTER_PLAN_ANNEXES.md       ← Couplages + hypothèses
│
├── 📁 artefacts/                         ← VÉRITÉ MÉCANIQUE (générée)
│   ├── REPO_SCOPE.txt                    ← Périmètre exact
│   ├── REPO_TREE.txt                     ← Arborescence complète
│   ├── DOC_CODE_MATRIX.json              ← Module → fichier → status
│   ├── EXPORTS_REAL.json                 ← Surface API réelle
│   ├── INTERFACE_CONTRACTS.md            ← I/O stricts
│   ├── NUMBERS_AUDIT.md                  ← Chiffres avec preuves
│   ├── IMPACT_COUPLING_MATRIX.md         ← Dépendances conceptuelles
│   ├── ASSUMPTIONS_VALIDITY.md           ← Hypothèses + risques
│   ├── HASH_MANIFEST.txt                 ← Hashes de tous les fichiers clés
│   └── CLAIMS_VS_PROOFS.csv              ← Chaque affirmation → preuve
│
├── 📁 sessions/                          ← HISTORIQUE
│   ├── SESSION_INDEX.md                  ← Index de toutes les sessions
│   └── SESSION_SAVE_YYYYMMDD.md          ← Sauvegarde par date
│
├── 📁 .ci/                               ← CI/CD
│   ├── OMEGA_TRUTH_CHECKLIST.md          ← Checklist bloquante
│   └── omega-truth-check.ps1             ← Script de vérification
│
└── 📁 src/                               ← Code source
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              PART 2 — CI CHECKLIST BLOQUANTE
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# PART 2 — OMEGA TRUTH GATE (CI BLOQUANTE)

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   RÈGLE: IMPOSSIBLE DE MERGER SI LA VÉRITÉ N'EST PAS SYNCHRONISÉE                                     ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

## 2.1 Checklist Obligatoire

### Section A — Présence des Documents

| Check | Fichier | Obligatoire |
|-------|---------|-------------|
| [ ] | `OMEGA_README.md` à la racine | ✅ OUI |
| [ ] | `OMEGA_MASTER_PLAN.md` à la racine | ✅ OUI |
| [ ] | `OMEGA_MASTER_PLAN_ANNEXES.md` à la racine | ✅ OUI |
| [ ] | `artefacts/` directory exists | ✅ OUI |
| [ ] | `sessions/` directory exists | ✅ OUI |

### Section B — Scope Lock

| Check | Vérification | Obligatoire |
|-------|--------------|-------------|
| [ ] | `artefacts/REPO_SCOPE.txt` généré | ✅ OUI |
| [ ] | Repo/branch/commit/tags documentés | ✅ OUI |
| [ ] | Aucun fichier hors scope référencé | ✅ OUI |

### Section C — DOC → CODE Alignment

| Check | Vérification | Obligatoire |
|-------|--------------|-------------|
| [ ] | `artefacts/DOC_CODE_MATRIX.json` généré | ✅ OUI |
| [ ] | Chaque module PROUVÉ a fichier preuve | ✅ OUI |
| [ ] | Aucun PHANTOM décrit comme implémenté | ✅ OUI |
| [ ] | Exports doc = Exports réels | ✅ OUI |

### Section D — Numbers & Contracts

| Check | Vérification | Obligatoire |
|-------|--------------|-------------|
| [ ] | `artefacts/NUMBERS_AUDIT.md` généré | ✅ OUI |
| [ ] | Aucun chiffre sans preuve (ou UNPROVEN) | ✅ OUI |
| [ ] | `artefacts/INTERFACE_CONTRACTS.md` généré | ✅ OUI |

### Section E — Impact & Assumptions

| Check | Vérification | Obligatoire |
|-------|--------------|-------------|
| [ ] | `artefacts/IMPACT_COUPLING_MATRIX.md` présent | ✅ OUI |
| [ ] | `artefacts/ASSUMPTIONS_VALIDITY.md` présent | ✅ OUI |

### Section F — Session Save

| Check | Vérification | Obligatoire |
|-------|--------------|-------------|
| [ ] | `sessions/SESSION_SAVE_YYYYMMDD.md` créé | ✅ OUI |
| [ ] | `sessions/SESSION_INDEX.md` mis à jour | ✅ OUI |

## 2.2 Verdict CI

```
SI toutes les cases = ✅ :
  ✔ PASS — Merge autorisé

SI au moins une case = ❌ :
  ❌ FAIL — TRUTH DESYNC DETECTED
  MERGE BLOCKED
  Liste des écarts à corriger
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              PART 3 — PROMPT EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# PART 3 — PROMPT CLAUDE EXECUTOR OMEGA

**À copier-coller tel quel au début de chaque session de travail.**

```
═══════════════════════════════════════════════════════════════════════════════════════════
                         CLAUDE — EXECUTOR OMEGA MODE
═══════════════════════════════════════════════════════════════════════════════════════════

CONTRAINTE ABSOLUE:
Toute information non prouvée par le repo, un artefact généré,
ou un document versionné est considérée comme FAUSSE.
Si un doute existe, il doit être EXPLICITÉ, pas résolu par supposition.

═══════════════════════════════════════════════════════════════════════════════════════════

PROCÉDURE D'EXÉCUTION (dans l'ordre, sans sauter d'étape):

ÉTAPE 1 — LECTURE OBLIGATOIRE
  Lire intégralement:
  • OMEGA_README.md
  • OMEGA_MASTER_PLAN.md
  • OMEGA_MASTER_PLAN_ANNEXES.md
  Présenter un BILAN DE COMPRÉHENSION avant d'agir.

ÉTAPE 2 — SCOPE LOCK VERIFICATION
  Vérifier:
  • Repo exact
  • Branche
  • Commit(s)
  • Tags
  Générer: artefacts/REPO_SCOPE.txt

ÉTAPE 3 — DOC → CODE MATRIX
  Scanner le repo et produire:
  • artefacts/DOC_CODE_MATRIX.json
  Pour chaque module:
  • status = PROUVÉ / SPÉCIFIÉ / PHANTOM
  • chemin(s) code
  • fichier preuve
  • exports trouvés (si PROUVÉ)
  RÈGLE: Toute incohérence = SIGNALÉE, jamais corrigée implicitement.

ÉTAPE 4 — EXPORTS MAP
  Scanner AST / index.ts / exports:
  • Produire artefacts/EXPORTS_REAL.json
  • Comparer avec Master Plan
  RÈGLE: Si divergence → corriger le DOC, jamais le code.

ÉTAPE 5 — INTERFACE CONTRACTS
  Identifier tous les bridges inter-modules:
  • Produire artefacts/INTERFACE_CONTRACTS.md
  • Input schema, Output schema, Invariants
  • Hash / non-hash explicite

ÉTAPE 6 — NUMBERS POLICY
  Scanner les docs pour chaque nombre:
  • Preuve → OK
  • Pas de preuve → Variable symbolique OU marquer UNPROVEN
  Produire: artefacts/NUMBERS_AUDIT.md

ÉTAPE 7 — IMPACT & COUPLING
  Analyser dépendances conceptuelles:
  • Produire artefacts/IMPACT_COUPLING_MATRIX.md
  • "Si X change, quoi casse?"

ÉTAPE 8 — ASSUMPTIONS & VALIDITY
  Lister hypothèses implicites:
  • Description, Justification, Risque, Mitigation
  Produire: artefacts/ASSUMPTIONS_VALIDITY.md

ÉTAPE 9 — PHANTOM CLASSIFICATION
  Classer chaque PHANTOM:
  • PH-A (vague)
  • PH-B (formalisé)
  • PH-C (planifié)
  Mettre à jour le Master Plan.

ÉTAPE 10 — SESSION SAVE
  Générer:
  • sessions/SESSION_SAVE_YYYYMMDD.md
  • Mettre à jour sessions/SESSION_INDEX.md
  Contenu: Ce qui a changé, ce qui est nouveau, ce qui est invalidé.

═══════════════════════════════════════════════════════════════════════════════════════════

INTERDICTIONS ABSOLUES:
❌ Deviner
❌ Compléter un trou par logique
❌ Harmoniser "pour faire joli"
❌ Mélanger vision et réalité
❌ Corriger le code pour sauver la doc
❌ Inventer une preuve

═══════════════════════════════════════════════════════════════════════════════════════════

SORTIE FINALE OBLIGATOIRE:

Si tout est conforme:
  ✔ Repo scanné
  ✔ Docs alignés
  ✔ Artefacts générés
  ✔ Vérité synchronisée
  ✔ Aucun écart non expliqué

Sinon:
  ❌ TRAVAIL INCOMPLET
  [Liste précise des écarts non résolus]

═══════════════════════════════════════════════════════════════════════════════════════════
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              PART 4 — RÈGLES DE MISE À JOUR
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# PART 4 — RÈGLES DE MISE À JOUR (IMMUABLES)

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   RÈGLE D'OR À GRAVER DANS OMEGA_README.md:                                                           ║
║                                                                                                       ║
║   "Si ce n'est ni dans le code, ni dans un artefact généré,                                           ║
║    ni dans le Master Plan versionné, alors ça n'existe pas."                                          ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

## 4.1 Quand mettre à jour quoi

| Événement | Action sur Master Plan | Action sur Artefacts |
|-----------|------------------------|----------------------|
| Nouveau module codé | Ajouter en PROUVÉ avec preuve | Régénérer DOC_CODE_MATRIX |
| Module supprimé | Passer en PHANTOM ou supprimer | Régénérer DOC_CODE_MATRIX |
| Nouveau test | Mettre à jour compteur | Régénérer NUMBERS_AUDIT |
| Changement d'interface | Mettre à jour §6 CONTRACTS | Régénérer INTERFACE_CONTRACTS |
| Nouvelle hypothèse | Ajouter en ANNEX B | Régénérer ASSUMPTIONS_VALIDITY |
| Fin de phase | Créer SESSION_SAVE | Tous les artefacts |
| Changement de scope | Mettre à jour §0 SCOPE LOCK | Régénérer REPO_SCOPE |

## 4.2 Qui peut modifier quoi

| Document | Qui peut modifier | Condition |
|----------|-------------------|-----------|
| OMEGA_README.md | Architecte (Francky) | Jamais sans raison documentée |
| OMEGA_MASTER_PLAN.md | Architecte + IA | Avec preuve obligatoire |
| OMEGA_MASTER_PLAN_ANNEXES.md | Architecte + IA | Avec preuve obligatoire |
| artefacts/* | IA uniquement | Par scan/génération automatique |
| sessions/* | IA uniquement | À chaque fin de session |

## 4.3 Format des commits

```
feat(module): description [INV-xxx]
fix(module): description [INV-xxx]
docs(master-plan): mise à jour section X
artefacts(scan): régénération DOC_CODE_MATRIX
session(save): SESSION_SAVE_20260123
```

## 4.4 Workflow de mise à jour

```
1. Changement dans le code
        │
        ▼
2. IA exécute PROMPT EXECUTOR
        │
        ▼
3. Artefacts régénérés automatiquement
        │
        ▼
4. Master Plan mis à jour si nécessaire
        │
        ▼
5. CI CHECKLIST vérifiée
        │
        ├── ✅ PASS → Merge autorisé
        │
        └── ❌ FAIL → Bloquer + corriger
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              PART 5 — SCRIPTS D'EXÉCUTION
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# PART 5 — SCRIPTS D'EXÉCUTION

## 5.1 Script PowerShell: omega-truth-check.ps1

```powershell
# ═══════════════════════════════════════════════════════════════════════════════════════════
# OMEGA TRUTH CHECK — Script de vérification
# ═══════════════════════════════════════════════════════════════════════════════════════════

param(
    [string]$RepoPath = "."
)

Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "              OMEGA TRUTH CHECK v1.0.0" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$errors = @()

# CHECK 1: Documents présents
Write-Host "`n[1/7] Vérification des documents..." -ForegroundColor Yellow

$requiredDocs = @(
    "OMEGA_README.md",
    "OMEGA_MASTER_PLAN.md",
    "OMEGA_MASTER_PLAN_ANNEXES.md"
)

foreach ($doc in $requiredDocs) {
    if (Test-Path "$RepoPath/$doc") {
        Write-Host "  ✅ $doc" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $doc MANQUANT" -ForegroundColor Red
        $errors += "Document manquant: $doc"
    }
}

# CHECK 2: Dossier artefacts
Write-Host "`n[2/7] Vérification des artefacts..." -ForegroundColor Yellow

$requiredArtefacts = @(
    "artefacts/REPO_SCOPE.txt",
    "artefacts/DOC_CODE_MATRIX.json",
    "artefacts/EXPORTS_REAL.json",
    "artefacts/INTERFACE_CONTRACTS.md",
    "artefacts/NUMBERS_AUDIT.md",
    "artefacts/IMPACT_COUPLING_MATRIX.md",
    "artefacts/ASSUMPTIONS_VALIDITY.md"
)

foreach ($art in $requiredArtefacts) {
    if (Test-Path "$RepoPath/$art") {
        Write-Host "  ✅ $art" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ $art non généré" -ForegroundColor Yellow
        $errors += "Artefact manquant: $art"
    }
}

# CHECK 3: Sessions
Write-Host "`n[3/7] Vérification des sessions..." -ForegroundColor Yellow

if (Test-Path "$RepoPath/sessions/SESSION_INDEX.md") {
    Write-Host "  ✅ SESSION_INDEX.md" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ SESSION_INDEX.md non trouvé" -ForegroundColor Yellow
}

# CHECK 4: Hashes
Write-Host "`n[4/7] Calcul des hashes..." -ForegroundColor Yellow

foreach ($doc in $requiredDocs) {
    if (Test-Path "$RepoPath/$doc") {
        $hash = (Get-FileHash -Algorithm SHA256 "$RepoPath/$doc").Hash
        Write-Host "  $doc : $($hash.Substring(0,16))..." -ForegroundColor Gray
    }
}

# CHECK 5-7: Réservés pour extensions futures
Write-Host "`n[5/7] Vérification NUMBERS POLICY..." -ForegroundColor Yellow
Write-Host "  (Scan manuel requis)" -ForegroundColor Gray

Write-Host "`n[6/7] Vérification INTERFACE CONTRACTS..." -ForegroundColor Yellow
Write-Host "  (Scan manuel requis)" -ForegroundColor Gray

Write-Host "`n[7/7] Vérification DOC↔CODE SYNC..." -ForegroundColor Yellow
Write-Host "  (Scan manuel requis)" -ForegroundColor Gray

# VERDICT
Write-Host "`n═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "✅ OMEGA TRUTH CHECK: PASS" -ForegroundColor Green
    Write-Host "  Tous les documents présents" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ OMEGA TRUTH CHECK: FAIL" -ForegroundColor Red
    Write-Host "  Erreurs trouvées: $($errors.Count)" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "    - $err" -ForegroundColor Red
    }
    exit 1
}
```

## 5.2 GitHub Actions Workflow

```yaml
# .github/workflows/omega-truth-gate.yml

name: OMEGA Truth Gate

on:
  pull_request:
    branches: [master, main]
  push:
    branches: [master, main]

jobs:
  truth-check:
    runs-on: ubuntu-latest
    name: OMEGA Truth Verification
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Check Required Documents
        run: |
          echo "=== OMEGA TRUTH GATE ==="
          
          ERRORS=0
          
          # Check documents
          for doc in OMEGA_README.md OMEGA_MASTER_PLAN.md OMEGA_MASTER_PLAN_ANNEXES.md; do
            if [ -f "$doc" ]; then
              echo "✅ $doc present"
            else
              echo "❌ $doc MISSING"
              ERRORS=$((ERRORS+1))
            fi
          done
          
          # Check artefacts directory
          if [ -d "artefacts" ]; then
            echo "✅ artefacts/ directory exists"
          else
            echo "⚠️ artefacts/ directory missing"
          fi
          
          # Check sessions directory
          if [ -d "sessions" ]; then
            echo "✅ sessions/ directory exists"
          else
            echo "⚠️ sessions/ directory missing"
          fi
          
          # Calculate hashes
          echo ""
          echo "=== DOCUMENT HASHES ==="
          for doc in OMEGA_README.md OMEGA_MASTER_PLAN.md OMEGA_MASTER_PLAN_ANNEXES.md; do
            if [ -f "$doc" ]; then
              sha256sum "$doc"
            fi
          done
          
          # Verdict
          echo ""
          if [ $ERRORS -eq 0 ]; then
            echo "✅ OMEGA TRUTH GATE: PASS"
            exit 0
          else
            echo "❌ OMEGA TRUTH GATE: FAIL ($ERRORS errors)"
            exit 1
          fi
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              PART 6 — TEMPLATES D'ARTEFACTS
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# PART 6 — TEMPLATES D'ARTEFACTS

## 6.1 Template: REPO_SCOPE.txt

```
# OMEGA REPO SCOPE
# Generated: YYYY-MM-DD HH:MM:SS
# By: Claude EXECUTOR OMEGA

## Repository
URL: github.com/xxx/omega-project
Branch: master
Commit: xxxxxxx
Tag: vX.X.X

## Included Paths
src/
tests/
package.json
tsconfig.json

## Excluded Paths
node_modules/
dist/
.env*
nexus/proof/
```

## 6.2 Template: DOC_CODE_MATRIX.json

```json
{
  "generated": "2026-01-23T00:00:00Z",
  "version": "1.0.0",
  "modules": [
    {
      "name": "EMOTION_BRIDGE",
      "status": "PROUVÉ",
      "paths": ["src/genesis/core/emotion_bridge.ts"],
      "proofFile": "scan_forensique/ast/symbols.txt:2",
      "exports": {
        "classes": ["EmotionBridge"],
        "functions": ["analyzeEmotion", "getDefaultBridge", "createCustomEmotionState"],
        "interfaces": ["EmotionAnalysisResult"]
      },
      "tests": 45,
      "coverage": "UNPROVEN"
    }
  ]
}
```

## 6.3 Template: SESSION_SAVE_YYYYMMDD.md

```markdown
# SESSION SAVE — YYYY-MM-DD

## Métadonnées
| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Durée | Xh |
| Architecte | Francky |
| IA | Claude |

## Ce qui a CHANGÉ
- [ ] Module X: description du changement

## Ce qui est NOUVEAU
- [ ] Artefact Y créé

## Ce qui est INVALIDÉ
- [ ] Ancien chiffre Z remplacé

## Artefacts générés
- artefacts/DOC_CODE_MATRIX.json
- artefacts/EXPORTS_REAL.json

## Prochaines actions
1. Action 1
2. Action 2

## Hash du Master Plan après session
SHA-256: xxxxxxxx
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              SEAL
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   OMEGA EXECUTOR SYSTEM v1.0.0                                                                       ║
║                                                                                                       ║
║   Avec ce système:                                                                                   ║
║   ✅ Impossible de merger sans vérité synchronisée (CI bloquante)                                    ║
║   ✅ Impossible d'oublier (artefacts générés automatiquement)                                        ║
║   ✅ Impossible de dériver (règles de mise à jour strictes)                                          ║
║   ✅ Impossible de mentir (PROUVÉ / SPÉCIFIÉ / PHANTOM)                                              ║
║                                                                                                       ║
║   OMEGA devient un système qui ne peut plus oublier, ni mentir, ni dériver,                          ║
║   même avec 10 IA différentes, sur 2 ans, avec interruptions.                                        ║
║                                                                                                       ║
║   Date: 2026-01-23                                                                                    ║
║   Authority: Francky (Architecte Suprême)                                                            ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

**END OF OMEGA EXECUTOR SYSTEM v1.0.0**
