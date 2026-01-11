# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA MASTER DOSSIER — SCRIPT DE VÉRIFICATION TRIBUNAL
# VERIFY.ps1
# ═══════════════════════════════════════════════════════════════════════════════
#
# USAGE:
#   .\VERIFY.ps1 -DossierPath "C:\path\to\OMEGA_MASTER_DOSSIER_v3.61.0"
#
# STANDARD: NASA-Grade L4
# VERSION: 1.0
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$true)]
    [string]$DossierPath,
    
    [Parameter(Mandatory=$false)]
    [switch]$Strict,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport
)

$ErrorActionPreference = "Continue"
$script:PassCount = 0
$script:FailCount = 0
$script:WarnCount = 0
$script:Report = @()

function Write-Check {
    param([string]$Name, [string]$Status, [string]$Detail = "")
    
    $color = switch($Status) {
        "PASS" { "Green"; $script:PassCount++ }
        "FAIL" { "Red"; $script:FailCount++ }
        "WARN" { "Yellow"; $script:WarnCount++ }
        default { "White" }
    }
    
    $symbol = switch($Status) {
        "PASS" { "✅" }
        "FAIL" { "❌" }
        "WARN" { "⚠️" }
        default { "•" }
    }
    
    Write-Host "  $symbol $Name" -ForegroundColor $color
    if ($Detail) { Write-Host "     $Detail" -ForegroundColor Gray }
    
    $script:Report += [PSCustomObject]@{
        Check = $Name
        Status = $Status
        Detail = $Detail
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# BANNER
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                               ║" -ForegroundColor Cyan
Write-Host "║   OMEGA MASTER DOSSIER — VERIFICATION TRIBUNAL                                ║" -ForegroundColor Cyan
Write-Host "║   Standard: NASA-Grade L4 / DO-178C                                           ║" -ForegroundColor Cyan
Write-Host "║                                                                               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# 1. EXISTENCE DU DOSSIER
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[1/7] EXISTENCE DU DOSSIER" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

if (Test-Path $DossierPath) {
    Write-Check "Dossier existe" "PASS" $DossierPath
} else {
    Write-Check "Dossier existe" "FAIL" "Chemin non trouvé: $DossierPath"
    Write-Host ""
    Write-Host "ARRÊT: Dossier introuvable" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# 2. DOCUMENTS CRITIQUES
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[2/7] DOCUMENTS CRITIQUES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$criticalDocs = @(
    "00_INDEX_MASTER.md",
    "README.md",
    "MANIFEST.json"
)

foreach ($doc in $criticalDocs) {
    $path = Join-Path $DossierPath $doc
    if (Test-Path $path) {
        Write-Check $doc "PASS"
    } else {
        Write-Check $doc "FAIL" "Fichier manquant"
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 3. STRUCTURE DES DOSSIERS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[3/7] STRUCTURE DES DOSSIERS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$requiredDirs = @(
    "01_ARCHITECTURE",
    "02_PIPELINE",
    "03_INVARIANTS",
    "04_TESTS_PROOFS",
    "05_CERTIFICATIONS",
    "06_CONCEPTS",
    "07_SESSION_SAVES",
    "08_GOVERNANCE",
    "09_HISTORY",
    "10_HASHES"
)

foreach ($dir in $requiredDirs) {
    $path = Join-Path $DossierPath $dir
    if (Test-Path $path) {
        $count = (Get-ChildItem $path -File).Count
        Write-Check $dir "PASS" "$count fichiers"
    } else {
        Write-Check $dir "FAIL" "Dossier manquant"
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 4. GOVERNANCE COMPLÈTE
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[4/7] GOVERNANCE" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$governanceDocs = @(
    "08_GOVERNANCE/OMEGA_SUPREME_v1.0.md",
    "08_GOVERNANCE/OMEGA_NAMING_CHARTER.md",
    "08_GOVERNANCE/OMEGA_WORKFLOW_BEST_PRACTICES.md",
    "08_GOVERNANCE/OMEGA_SESSION_CONTRACT.md",
    "08_GOVERNANCE/POLICY_v9.1.md"
)

foreach ($doc in $governanceDocs) {
    $path = Join-Path $DossierPath $doc
    if (Test-Path $path) {
        Write-Check (Split-Path $doc -Leaf) "PASS"
    } else {
        Write-Check (Split-Path $doc -Leaf) "WARN" "Recommandé mais absent"
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. SCAN PLACEHOLDERS (TODO/FIXME/TBD)
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[5/7] SCAN PLACEHOLDERS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$mdFiles = Get-ChildItem -Path $DossierPath -Filter "*.md" -Recurse
$placeholderFiles = @()

foreach ($file in $mdFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '\b(TODO|FIXME|TBD|XXX)\b') {
        $placeholderFiles += $file.Name
    }
}

if ($placeholderFiles.Count -eq 0) {
    Write-Check "Aucun placeholder" "PASS"
} else {
    Write-Check "Placeholders détectés" "WARN" "$($placeholderFiles.Count) fichiers"
    foreach ($f in $placeholderFiles | Select-Object -First 5) {
        Write-Host "     - $f" -ForegroundColor Gray
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 6. SCAN PLUTCHIK (doit être absent)
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[6/7] EMOTION MODEL (Plutchik check)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$plutchikFiles = @()
foreach ($file in $mdFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match 'Plutchik') {
        $plutchikFiles += $file.Name
    }
}

if ($plutchikFiles.Count -eq 0) {
    Write-Check "Plutchik absent (Emotion v2 OK)" "PASS"
} else {
    Write-Check "Plutchik détecté (obsolète!)" "FAIL" "$($plutchikFiles.Count) fichiers"
    foreach ($f in $plutchikFiles) {
        Write-Host "     - $f" -ForegroundColor Red
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 7. STATISTIQUES
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[7/7] STATISTIQUES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$allFiles = Get-ChildItem -Path $DossierPath -Recurse -File
$mdCount = ($allFiles | Where-Object { $_.Extension -eq ".md" }).Count
$totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum / 1KB

Write-Host "  • Fichiers markdown: $mdCount" -ForegroundColor White
Write-Host "  • Total fichiers: $($allFiles.Count)" -ForegroundColor White
Write-Host "  • Taille totale: $([math]::Round($totalSize, 2)) KB" -ForegroundColor White

# ═══════════════════════════════════════════════════════════════════════════════
# VERDICT FINAL
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$totalChecks = $script:PassCount + $script:FailCount + $script:WarnCount

if ($script:FailCount -eq 0 -and ($script:WarnCount -eq 0 -or -not $Strict)) {
    Write-Host ""
    Write-Host "  VERDICT: ✅ PASS ($script:PassCount/$totalChecks checks)" -ForegroundColor Green
    Write-Host "  Status: NASA-GRADE COMPLIANT" -ForegroundColor Green
    $exitCode = 0
} elseif ($script:FailCount -gt 0) {
    Write-Host ""
    Write-Host "  VERDICT: ❌ FAIL" -ForegroundColor Red
    Write-Host "  Errors: $script:FailCount | Warnings: $script:WarnCount | Pass: $script:PassCount" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host ""
    Write-Host "  VERDICT: ⚠️ WARN" -ForegroundColor Yellow
    Write-Host "  Warnings: $script:WarnCount | Pass: $script:PassCount" -ForegroundColor Yellow
    $exitCode = 0
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Générer rapport si demandé
if ($GenerateReport) {
    $reportPath = Join-Path $DossierPath "VERIFY_REPORT_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $script:Report | ConvertTo-Json | Out-File $reportPath -Encoding UTF8
    Write-Host "Rapport généré: $reportPath" -ForegroundColor Cyan
}

exit $exitCode
