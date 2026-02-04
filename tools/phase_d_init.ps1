# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — PHASE D RUNTIME GOVERNANCE INITIALIZATION
#   Script de génération automatique — NASA-Grade L4
#
#   Version: 1.0
#   Date: 2026-02-04
#   Standard: DO-178C / MIL-STD / NASA-STD-8739.8
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  OMEGA PHASE D — RUNTIME GOVERNANCE INIT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
# FONCTIONS UTILITAIRES
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )
    
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Ensure-Dir {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Get-ShortHash {
    param([string]$Input)
    
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Input)
    $hash = $sha.ComputeHash($bytes)
    return ($hash[0..7] | ForEach-Object { $_.ToString("x2") }) -join ""
}

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
# COLLECTE METADATA BUILD
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n[1/8] Collecte metadata BUILD..." -ForegroundColor Yellow

$root = Resolve-Path "."
$govRoot = Join-Path $root "governance\runtime"
$snapDir = Join-Path $govRoot "SNAPSHOT"

# Git metadata
$commit = "UNKNOWN"
try {
    $commit = (git rev-parse --short HEAD 2>$null).Trim()
} catch {
    Write-Host "  ⚠️  Git commit non disponible" -ForegroundColor Yellow
}

$tag = "v1.0-forensic-any-types"
try {
    $tagTemp = (git describe --tags --exact-match 2>$null).Trim()
    if ($tagTemp) { $tag = $tagTemp }
} catch {
    # Keep default
}

Write-Host "  Commit: $commit" -ForegroundColor Gray
Write-Host "  Tag:    $tag" -ForegroundColor Gray

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
# CALCUL BASELINE HASH (DÉTERMINISTE)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n[2/8] Calcul baseline hash..." -ForegroundColor Yellow

$baselineSeed = @"
COMMIT=$commit
TAG=$tag
SCOPE=PHASE_D_RUNTIME_GOVERNANCE
NORMATIVE=CONSOLE_EXITCODE
"@

$baselineHash = "UNKNOWN"
try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($baselineSeed)
    $hash = $sha.ComputeHash($bytes)
    $baselineHash = ($hash | ForEach-Object { $_.ToString("x2") }) -join ""
} catch {
    Write-Host "  ⚠️  Hash calculation failed" -ForegroundColor Yellow
}

Write-Host "  Baseline: $($baselineHash.Substring(0,16))..." -ForegroundColor Gray

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
# TIMESTAMPS
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

$utc = (Get-Date).ToUniversalTime()
$ts = $utc.ToString("yyyyMMdd_HHmmss")
$iso = $utc.ToString("yyyy-MM-ddTHH:mm:ssZ")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
# CRÉATION ARBORESCENCE
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n[3/8] Création arborescence..." -ForegroundColor Yellow

Ensure-Dir $govRoot
Ensure-Dir $snapDir

Write-Host "  ✅ governance/runtime/" -ForegroundColor Green
Write-Host "  ✅ governance/runtime/SNAPSHOT/" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
# GÉNÉRATION FICHIERS
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n[4/8] Génération 00_README_PHASE_D.md..." -ForegroundColor Yellow

$readme = @"
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — PHASE D — RUNTIME GOVERNANCE
#   Observation passive · Aucune correction
#
#   Version: 1.0
#   Standard: NASA-Grade L4
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

## 🎯 RÔLE

Phase D observe le système certifié **sans jamais l'influencer**.

## 🚫 INTERDICTIONS ABSOLUES

- ❌ Recalculer ORACLE
- ❌ Modifier INVARIANTS
- ❌ Auto-corriger
- ❌ Écrire dans BUILD SEALED
- ❌ Ignorer drift sans rapport

## 📊 HIÉRARCHIE DE PREUVE

| Niveau | Éléments | Autorité |
|--------|----------|----------|
| **NORMATIF** | Exit code + console stdout/stderr | ABSOLUE |
| **NON-NORMATIF** | Reporter JSON, timestamps, métriques | TOOLING |

## 📄 ARTEFACTS

| Fichier | Description |
|---------|-------------|
| \`RUNTIME_EVENT.json\` | Dernier événement observé |
| \`GOVERNANCE_LOG.ndjson\` | Log append-only (1 ligne = 1 événement) |
| \`SNAPSHOT/*.json\` | Snapshots périodiques |
| \`BASELINE_REF.sha256\` | Référence baseline figée |
| \`DRIFT_RULES.md\` | Classification des écarts |

## ✅ CRITÈRES DE SORTIE

**PASS si:**
- Observation complète
- Logs auditables
- Aucune intervention

**FAIL si:**
- Correction appliquée
- Recalcul vérité
- Silence sur anomalie

## 📚 RÉFÉRENCES

- OMEGA_BUILD_GOVERNANCE_CONTRACT.md
- OMEGA_AUTHORITY_MODEL.md
- OMEGA_GOVERNANCE_ROADMAP_v1.0.md
"@

Write-Utf8NoBom (Join-Path $govRoot "00_README_PHASE_D.md") $readme
Write-Host "  ✅ 00_README_PHASE_D.md" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n[5/8] Génération GOVERNANCE_CHARTER_PHASE_D.md..." -ForegroundColor Yellow

$charter = @"
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   GOVERNANCE CHARTER — PHASE D
#   Contrat liant BUILD ↔ GOUVERNANCE
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

## 📋 OBJECTIF UNIQUE

Observer l'exécution du système certifié en conditions réelles **sans l'influencer**.

## 🔐 FRONTIÈRE D'AUTORITÉ

| Acteur | Rôle | Autorité |
|--------|------|----------|
| **BUILD** | Produit la vérité | NULLE (post-SEAL) |
| **GOVERNANCE** | Observe et rapporte | NON DÉCISIONNELLE |
| **HUMAIN** | Décide (override/rollback) | FINALE |

## 🛡️ INVARIANTS PHASE D

| ID | Invariant | Test |
|----|-----------|------|
| **INV-D-01** | Pas d'exécution sans RUNTIME_EVENT | Vérifier event_id |
| **INV-D-02** | Log append-only | Pas de suppression/modification |
| **INV-D-03** | Aucune écriture BUILD SEALED | Monitorer filesystem |
| **INV-D-04** | Baseline immuable | Hash constant |
| **INV-D-05** | Aucune auto-correction | Audit trail |
| **INV-D-06** | Toute anomalie escaladée | Vérifier DRIFT_REPORT |

## 🔍 CLASSIFICATION DES ÉCARTS

### TOOLING_DRIFT (non-critique)
Divergence outillage (reporter JSON, timestamps).
**Action:** Log + note, pas d'escalade sauf accumulation.

### PRODUCT_DRIFT (critique)
Divergence comportement produit.
**Action:** Log + rapport + escalade humaine OBLIGATOIRE.

### INCIDENT (bloquant)
Violation invariant ou action interdite.
**Action:** FAIL + arrêt + rollback potentiel.

## 🚨 RÈGLE D'ESCALADE

\`\`\`
DRIFT → RAPPORT → DÉCISION HUMAINE → (optionnel) OVERRIDE TRACÉ
\`\`\`

**Aucune boucle corrective automatique.**

## 📚 RÉFÉRENCES

- OMEGA_BUILD_GOVERNANCE_CONTRACT.md (§4-6)
- OMEGA_AUTHORITY_MODEL.md (§3)
"@

Write-Utf8NoBom (Join-Path $govRoot "GOVERNANCE_CHARTER_PHASE_D.md") $charter
Write-Host "  ✅ GOVERNANCE_CHARTER_PHASE_D.md" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n[6/8] Génération schémas et artefacts..." -ForegroundColor Yellow

# RUNTIME_EVENT.schema.json
$schema = @"
{
  "`$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OMEGA Phase D Runtime Event",
  "description": "Événement d'observation runtime Phase D (gouvernance passive)",
  "type": "object",
  "required": [
    "event_id",
    "timestamp_utc",
    "phase",
    "build_ref",
    "operation",
    "verdict",
    "input_hash",
    "output_hash"
  ],
  "properties": {
    "event_id": {
      "type": "string",
      "minLength": 8,
      "pattern": "^RTE_[0-9]{8}T[0-9]{6}Z_[a-f0-9]{6,}$",
      "description": "Identifiant unique événement (format: RTE_YYYYMMDDTHHMMSSz_hash)"
    },
    "timestamp_utc": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp UTC ISO 8601"
    },
    "phase": {
      "type": "string",
      "enum": ["D"],
      "description": "Phase OMEGA (D = Runtime Governance)"
    },
    "source": {
      "type": "string",
      "description": "Source de l'événement (ex: omega-runtime, test-runner)"
    },
    "build_ref": {
      "type": "object",
      "required": ["commit", "tag"],
      "properties": {
        "commit": { "type": "string", "minLength": 7 },
        "tag": { "type": "string", "minLength": 1 }
      },
      "additionalProperties": false,
      "description": "Référence BUILD certifié observé"
    },
    "operation": {
      "type": "string",
      "description": "Type d'opération observée (ex: test_execution, oracle_run)"
    },
    "input_hash": {
      "type": "string",
      "pattern": "^SHA256\\(.+\\)$",
      "description": "Hash des inputs (format: SHA256(description))"
    },
    "output_hash": {
      "type": "string",
      "pattern": "^SHA256\\(.+\\)$",
      "description": "Hash des outputs normatifs (exit code + stdout)"
    },
    "verdict": {
      "type": "string",
      "enum": ["PASS", "FAIL", "DRIFT", "TOOLING_DRIFT", "INCIDENT"],
      "description": "Verdict observation"
    },
    "notes": {
      "type": "string",
      "description": "Notes complémentaires (optionnel)"
    }
  },
  "additionalProperties": false
}
"@

Write-Utf8NoBom (Join-Path $govRoot "RUNTIME_EVENT.schema.json") $schema
Write-Host "  ✅ RUNTIME_EVENT.schema.json" -ForegroundColor Green

# BASELINE_REF.sha256
$baselineFile = @"
$baselineHash  PHASE_D_BASELINE_REF

# Calcul déterministe:
# SHA256(COMMIT=$commit + TAG=$tag + SCOPE=PHASE_D_RUNTIME_GOVERNANCE + NORMATIVE=CONSOLE_EXITCODE)
#
# Ce hash est FIGÉ pendant toute Phase D.
# Modification = nouvelle phase requise.
"@

Write-Utf8NoBom (Join-Path $govRoot "BASELINE_REF.sha256") $baselineFile
Write-Host "  ✅ BASELINE_REF.sha256" -ForegroundColor Green

# DRIFT_RULES.md
$driftRules = @"
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   DRIFT RULES — PHASE D
#   Classification passive des écarts
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

## 📊 NORMATIF VS NON-NORMATIF

| Niveau | Éléments | Autorité |
|--------|----------|----------|
| **NORMATIF** | Exit code + console output (tests/exécutions) | **ABSOLUE** |
| **NON-NORMATIF** | Reporters JSON, timestamps, métriques perf | TOOLING |

---

## 🔍 DÉCLENCHEURS

### 1. TOOLING_DRIFT (verdict: TOOLING_DRIFT)

**Définition:** Divergence due à l'outillage, pas au comportement produit.

**Exemples:**
- Reporter JSON indique "failed" **MAIS** console + exit code = PASS
- Stack trace capture interne (non-normatif)
- Timestamps variables dans logs
- Métriques performance fluctuantes

**Action:**
\`\`\`
1. Log event verdict=TOOLING_DRIFT
2. Note explicative
3. Référence artefact
4. Pas d'escalade (sauf accumulation suspecte >10 en 1h)
\`\`\`

---

### 2. PRODUCT_DRIFT (verdict: DRIFT)

**Définition:** Divergence comportement/output produit.

**Exemples:**
- output_hash diverge de baseline attendue
- Format/schema de sortie change (breaking)
- Verdict décisionnel incohérent
- Tests passent/échouent différemment

**Action:**
\`\`\`
1. Log event verdict=DRIFT
2. Créer DRIFT_REPORT_<id>.json
3. Escalade humaine OBLIGATOIRE
4. Aucune correction automatique
5. Attente décision (accept/override/rollback)
\`\`\`

---

### 3. INCIDENT (verdict: INCIDENT)

**Définition:** Violation invariant ou action interdite.

**Exemples:**
- Écriture dans zone SEALED
- Modification baseline pendant Phase D
- Absence d'événement pour exécution observée
- Auto-correction détectée

**Action:**
\`\`\`
1. FAIL immédiat
2. Créer INCIDENT_<id>.md
3. Arrêt observation
4. Alerte urgente humain
5. Rollback potentiel
\`\`\`

---

## 🚨 ESCALADE

\`\`\`
DRIFT/INCIDENT
     ↓
RAPPORT (JSON/MD)
     ↓
ALERTE HUMAINE (obligatoire)
     ↓
DÉCISION HUMAINE
     ↓
(optionnel) OVERRIDE TRACÉ
\`\`\`

**Aucune auto-correction autorisée.**
"@

Write-Utf8NoBom (Join-Path $govRoot "DRIFT_RULES.md") $driftRules
Write-Host "  ✅ DRIFT_RULES.md" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n[7/8] Génération événements initiaux..." -ForegroundColor Yellow

# GOVERNANCE_LOG.ndjson (init)
$logInit = @"
{"phase":"D","timestamp_utc":"$iso","event":"GOV_INIT","build_commit":"$commit","build_tag":"$tag","baseline_ref":"$baselineHash"}
"@

Write-Utf8NoBom (Join-Path $govRoot "GOVERNANCE_LOG.ndjson") $logInit
Write-Host "  ✅ GOVERNANCE_LOG.ndjson" -ForegroundColor Green

# RUNTIME_EVENT.json (sample init)
$evtId = "RTE_${ts}_INIT"
$runtimeEvent = @"
{
  "event_id": "$evtId",
  "timestamp_utc": "$iso",
  "source": "omega-governance-init",
  "phase": "D",
  "build_ref": {
    "commit": "$commit",
    "tag": "$tag"
  },
  "operation": "governance_init",
  "input_hash": "SHA256(phase_d_init_script)",
  "output_hash": "SHA256(arborescence_created)",
  "verdict": "PASS",
  "notes": "Phase D initialized. Observation-only mode. No BUILD modifications."
}
"@

Write-Utf8NoBom (Join-Path $govRoot "RUNTIME_EVENT.json") $runtimeEvent
Write-Host "  ✅ RUNTIME_EVENT.json" -ForegroundColor Green

# SNAPSHOT initial
$snapId = "SNAP_${ts}"
$snap = @"
{
  "snapshot_id": "$snapId",
  "timestamp_utc": "$iso",
  "baseline_ref": "$baselineHash",
  "events_count": 1,
  "anomalies": {
    "tooling_drift": 0,
    "product_drift": 0,
    "incidents": 0
  },
  "status": "STABLE",
  "notes": "Initial snapshot after Phase D initialization. Baseline established."
}
"@

Write-Utf8NoBom (Join-Path $snapDir "SNAPSHOT_${ts}.json") $snap
Write-Host "  ✅ SNAPSHOT/$snapId.json" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n[8/8] Génération SESSION_SAVE..." -ForegroundColor Yellow

$sessionSave = @"
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   SESSION_SAVE — PHASE D INIT
#   Date: 2026-02-04
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

\`\`\`
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA SESSION SAVE — PHASE D INIT                                                   ║
║                                                                                       ║
║   Phase: D (Runtime Governance)                                                       ║
║   Type: GOVERNANCE INIT (OBSERVATION ONLY)                                            ║
║   Status: ✅ READY                                                                    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
\`\`\`

## 📋 CONTEXTE D'ENTRÉE (FIGÉ)

| Élément | Valeur |
|---------|--------|
| **BUILD Status** | SEALED (Phases A→Q→C intouchables) |
| **Commit** | $commit |
| **Tag** | $tag |
| **Baseline Phase D** | $($baselineHash.Substring(0,16))... |
| **Timestamp Init** | $iso |

## 🚫 RÈGLES (RÉSUMÉ)

- ❌ Aucun recalcul vérité BUILD
- ❌ Aucune correction automatique
- ✅ Append-only logs
- ✅ Toute anomalie = escalade humaine

## 📦 ARTEFACTS CRÉÉS

| Fichier | Description |
|---------|-------------|
| \`00_README_PHASE_D.md\` | Point d'entrée documentation |
| \`GOVERNANCE_CHARTER_PHASE_D.md\` | Charte contractuelle |
| \`RUNTIME_EVENT.schema.json\` | Schéma JSON validation |
| \`RUNTIME_EVENT.json\` | Premier événement init |
| \`GOVERNANCE_LOG.ndjson\` | Log append-only initialisé |
| \`BASELINE_REF.sha256\` | Référence baseline figée |
| \`DRIFT_RULES.md\` | Classification écarts |
| \`SNAPSHOT/SNAPSHOT_${ts}.json\` | Snapshot initial |

## ✅ VERDICT

**PHASE D INIT: PASS**

Initialisation complète.
Aucune modification BUILD.
Gouvernance prête à observer.

## 🎯 PROCHAINES ÉTAPES

1. Commit artefacts governance
2. Push vers remote
3. Activer observation runtime (selon besoin)

## 📚 RÉFÉRENCES

- OMEGA_BUILD_GOVERNANCE_CONTRACT.md
- OMEGA_GOVERNANCE_ROADMAP_v1.0.md
- OMEGA_AUTHORITY_MODEL.md
"@

Write-Utf8NoBom (Join-Path $govRoot "SESSION_SAVE_PHASE_D_INIT.md") $sessionSave
Write-Host "  ✅ SESSION_SAVE_PHASE_D_INIT.md" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ PHASE D INITIALIZATION COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`nFiles generated under: $govRoot" -ForegroundColor White
Write-Host "`nMetadata:" -ForegroundColor White
Write-Host "  Commit:   $commit" -ForegroundColor Gray
Write-Host "  Tag:      $tag" -ForegroundColor Gray
Write-Host "  Baseline: $($baselineHash.Substring(0,16))..." -ForegroundColor Gray
Write-Host "  Snapshot: $snapId" -ForegroundColor Gray

Write-Host "`n🎯 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review generated files" -ForegroundColor White
Write-Host "  2. git add governance/runtime" -ForegroundColor White
Write-Host "  3. git commit -m 'feat(governance): init Phase D runtime governance'" -ForegroundColor White
Write-Host "  4. git push" -ForegroundColor White

Write-Host "`n✅ Phase D ready for observation." -ForegroundColor Green
