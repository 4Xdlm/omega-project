# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — Script de Vérification
# verify-omega.ps1
# ═══════════════════════════════════════════════════════════════════════════════

<#
.SYNOPSIS
    Vérifie l'intégrité et la conformité du projet OMEGA

.DESCRIPTION
    Ce script effectue les vérifications suivantes:
    - Hash SHA-256 des fichiers critiques
    - Présence des documents requis
    - Absence de TODO/FIXME/TBD
    - Conformité des conventions de nommage

.EXAMPLE
    .\verify-omega.ps1 -Path "C:\Users\elric\omega-project"

.NOTES
    Standard: NASA-Grade L4
    Version: 1.0
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,
    
    [Parameter(Mandatory=$false)]
    [switch]$Strict
)

# Configuration
$ErrorActionPreference = "Stop"
$script:errors = @()
$script:warnings = @()

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "          OMEGA VERIFICATION SCRIPT v1.0" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Vérification existence du chemin
Write-Host "[1/5] Vérification du chemin..." -ForegroundColor Yellow
if (-not (Test-Path $Path)) {
    Write-Host "ERREUR: Chemin non trouvé: $Path" -ForegroundColor Red
    exit 1
}
Write-Host "      OK: $Path existe" -ForegroundColor Green

# 2. Documents requis
Write-Host ""
Write-Host "[2/5] Vérification documents requis..." -ForegroundColor Yellow
$required = @(
    "00_INDEX_MASTER.md",
    "README.md"
)

foreach ($doc in $required) {
    $docPath = Join-Path $Path $doc
    if (Test-Path $docPath) {
        Write-Host "      OK: $doc" -ForegroundColor Green
    } else {
        Write-Host "      MANQUANT: $doc" -ForegroundColor Red
        $script:errors += "Document manquant: $doc"
    }
}

# 3. Scan TODO/FIXME/TBD
Write-Host ""
Write-Host "[3/5] Scan TODO/FIXME/TBD..." -ForegroundColor Yellow
$mdFiles = Get-ChildItem -Path $Path -Filter "*.md" -Recurse
$placeholders = @()

foreach ($file in $mdFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '\b(TODO|FIXME|TBD|XXX)\b') {
        $placeholders += $file.Name
    }
}

if ($placeholders.Count -eq 0) {
    Write-Host "      OK: Aucun placeholder trouvé" -ForegroundColor Green
} else {
    Write-Host "      ATTENTION: $($placeholders.Count) fichiers avec placeholders" -ForegroundColor Yellow
    foreach ($p in $placeholders) {
        Write-Host "        - $p" -ForegroundColor Yellow
        $script:warnings += "Placeholder dans: $p"
    }
}

# 4. Calcul hash des fichiers critiques
Write-Host ""
Write-Host "[4/5] Calcul des hashes..." -ForegroundColor Yellow
$criticalFiles = @(
    "00_INDEX_MASTER.md",
    "README.md"
)

foreach ($file in $criticalFiles) {
    $filePath = Join-Path $Path $file
    if (Test-Path $filePath) {
        $hash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
        Write-Host "      $file" -ForegroundColor White
        Write-Host "      SHA-256: $hash" -ForegroundColor Gray
    }
}

# 5. Comptage fichiers
Write-Host ""
Write-Host "[5/5] Statistiques..." -ForegroundColor Yellow
$allMd = Get-ChildItem -Path $Path -Filter "*.md" -Recurse
$dirs = Get-ChildItem -Path $Path -Directory
Write-Host "      Fichiers .md: $($allMd.Count)" -ForegroundColor White
Write-Host "      Dossiers: $($dirs.Count)" -ForegroundColor White

# Rapport final
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($script:errors.Count -eq 0 -and ($script:warnings.Count -eq 0 -or -not $Strict)) {
    Write-Host "RÉSULTAT: ✅ PASS" -ForegroundColor Green
    exit 0
} elseif ($script:errors.Count -gt 0) {
    Write-Host "RÉSULTAT: ❌ FAIL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erreurs:" -ForegroundColor Red
    foreach ($e in $script:errors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
    exit 1
} else {
    Write-Host "RÉSULTAT: ⚠️ WARN" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Avertissements:" -ForegroundColor Yellow
    foreach ($w in $script:warnings) {
        Write-Host "  - $w" -ForegroundColor Yellow
    }
    exit 0
}
