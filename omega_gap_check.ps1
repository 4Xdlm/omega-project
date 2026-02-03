# ═══════════════════════════════════════════════════════════════════════
# OMEGA — Vérification Écarts Documentation vs Repository
# Date: 2026-02-03
# ═══════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  OMEGA GAP ANALYSIS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

cd C:\Users\elric\omega-project

$errors = @()
$warnings = @()

# 1. Vérifier roadmaps
Write-Host "`n[1/6] Vérification roadmaps..." -ForegroundColor Yellow
$roadmaps = @(
    @{File="OMEGA_SUPREME_ROADMAP_v3.0.md"; Critical=$true},
    @{File="OMEGA_SUPREME_ROADMAP_v2.0.md"; Critical=$false},
    @{File="OMEGA_SUPREME_ROADMAP_v1.1.md"; Critical=$false}
)
foreach ($rm in $roadmaps) {
    if (Test-Path $rm.File) {
        Write-Host "  ✅ $($rm.File)" -ForegroundColor Green
    } else {
        if ($rm.Critical) {
            Write-Host "  ❌ $($rm.File) MANQUANT (CRITIQUE)" -ForegroundColor Red
            $errors += "Roadmap CRITIQUE manquante: $($rm.File)"
        } else {
            Write-Host "  ℹ️  $($rm.File) (archived)" -ForegroundColor Gray
        }
    }
}

# 2. Vérifier sessions/
Write-Host "`n[2/6] Vérification sessions/..." -ForegroundColor Yellow
if (Test-Path "sessions\") {
    Write-Host "  ✅ sessions/ exists" -ForegroundColor Green
    $sessionFiles = Get-ChildItem "sessions\SESSION_SAVE*.md" -ErrorAction SilentlyContinue
    Write-Host "  ℹ️  SESSION_SAVE files: $($sessionFiles.Count)" -ForegroundColor Gray
    
    # Vérifier SESSION_SAVE phases JKLM spécifiquement
    $jklmFile = Get-ChildItem "sessions\SESSION_SAVE*PHASES_JKLM*.md" -ErrorAction SilentlyContinue
    if ($jklmFile) {
        Write-Host "  ✅ SESSION_SAVE JKLM trouvé: $($jklmFile.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  SESSION_SAVE JKLM non trouvé" -ForegroundColor Yellow
        $warnings += "SESSION_SAVE phases JKLM manquant"
    }
} else {
    Write-Host "  ❌ sessions/ MANQUANT (CRITIQUE)" -ForegroundColor Red
    $errors += "Dossier sessions/ manquant"
}

# 3. Vérifier tags Git phases J-M
Write-Host "`n[3/6] Vérification tags Git phases J-M..." -ForegroundColor Yellow
$expectedTags = @("phase-j-complete", "phase-k-complete", "phase-l-complete", "phase-m-complete")
$gitTags = git tag
foreach ($tag in $expectedTags) {
    if ($gitTags -contains $tag) {
        Write-Host "  ✅ $tag" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $tag MANQUANT" -ForegroundColor Red
        $errors += "Tag Git manquant: $tag"
    }
}

# 4. Vérifier tests
Write-Host "`n[4/6] Vérification tests..." -ForegroundColor Yellow
Write-Host "  ℹ️  Pour vérifier: npm test" -ForegroundColor Gray
Write-Host "  ℹ️  Baseline attendue: 4941 tests passed" -ForegroundColor Gray
Write-Host "  ℹ️  (Exécution manuelle requise)" -ForegroundColor Gray

# 5. Vérifier Trust Chain tags
Write-Host "`n[5/6] Vérification Trust Chain v1.0..." -ForegroundColor Yellow
$trustTags = @(
    "phase-x-sealed",    # Trust Foundation
    "phase-s-sealed",    # Spec Hardening
    "phase-y-sealed",    # External Verifier
    "phase-h-sealed",    # Hostile Suite
    "phase-z-sealed",    # Trust Versioning
    "phase-sbom-sealed"  # Supply Chain
)
$trustFound = 0
foreach ($tag in $trustTags) {
    if ($gitTags -contains $tag) {
        Write-Host "  ✅ $tag" -ForegroundColor Green
        $trustFound++
    } else {
        Write-Host "  ⚠️  $tag non trouvé" -ForegroundColor Yellow
    }
}

if ($trustFound -eq 0) {
    $warnings += "Aucun tag Trust Chain trouvé (phases X/S/Y/H/Z/SBOM)"
} elseif ($trustFound -lt 6) {
    $warnings += "Trust Chain incomplète: $trustFound/6 phases trouvées"
}

# 6. Vérifier Phase Q prep
Write-Host "`n[6/6] Vérification préparation Phase Q..." -ForegroundColor Yellow
$phaseQFiles = @(
    "CLAUDE_CODE_PHASE_Q_EXTREME.md",
    "OMEGA_PHASE_Q_SPEC.md"
)
$phaseQFound = $false
foreach ($file in $phaseQFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file trouvé" -ForegroundColor Green
        $phaseQFound = $true
    }
}
if (-not $phaseQFound) {
    Write-Host "  ℹ️  Aucun document Phase Q trouvé (phase future - OK)" -ForegroundColor Gray
}

# Vérifier artefacts Trust Chain
Write-Host "`n[BONUS] Vérification artefacts Trust Chain..." -ForegroundColor Yellow
$trustArtefacts = @(
    "LAUNCH_READINESS*.zip",
    "OMEGA_RAPPORT_FINAL*.md"
)
foreach ($pattern in $trustArtefacts) {
    $files = Get-ChildItem $pattern -Recurse -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "  ✅ Trouvé: $($files[0].Name)" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  $pattern non trouvé" -ForegroundColor Gray
    }
}

# RÉSUMÉ FINAL
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`nERREURS CRITIQUES: $($errors.Count)" -ForegroundColor $(if ($errors.Count -eq 0) { "Green" } else { "Red" })
foreach ($err in $errors) {
    Write-Host "  ❌ $err" -ForegroundColor Red
}

Write-Host "`nAVERTISSEMENTS: $($warnings.Count)" -ForegroundColor $(if ($warnings.Count -eq 0) { "Green" } else { "Yellow" })
foreach ($warn in $warnings) {
    Write-Host "  ⚠️  $warn" -ForegroundColor Yellow
}

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ REPOSITORY CONFORME — Aucun écart détecté" -ForegroundColor Green
    exit 0
} elseif ($errors.Count -eq 0) {
    Write-Host "⚠️  REPOSITORY OK — Quelques avertissements" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ ÉCARTS CRITIQUES DÉTECTÉS" -ForegroundColor Red
    Write-Host "`nPour corriger, consulter: OMEGA_GAP_ANALYSIS_2026-02-03.md" -ForegroundColor Yellow
    exit 1
}
