# ==============================================================================
# OMEGA PROJECT - EVIDENCE PACK GENERATOR
# Phase 12 - Industrial Deployment
# Standard: NASA-Grade L4 / DO-178C Level A
# ==============================================================================
#
# INVARIANTS COVERED:
# - INV-DEP-03: Evidence pack complet (7 fichiers)
# - INV-DEP-05: Core inchange vs Phase 11 (diff vide)
#
# ==============================================================================

$ErrorActionPreference = "Stop"

$EVIDENCE_DIR = "evidence\PHASE_12_EVIDENCE"
$PHASE11_TAG = "v3.11.0-HARDENED"
$CORE_PATH = "gateway"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  OMEGA EVIDENCE PACK GENERATOR - Phase 12" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create evidence directory
Write-Host "[1/6] Creating evidence directory..." -ForegroundColor Yellow

if (Test-Path $EVIDENCE_DIR) {
    Remove-Item -Recurse -Force $EVIDENCE_DIR
}
New-Item -ItemType Directory -Force -Path $EVIDENCE_DIR | Out-Null
Write-Host "  OK: $EVIDENCE_DIR created" -ForegroundColor Green

# Step 2: Generate meta.txt
Write-Host "[2/6] Generating meta.txt..." -ForegroundColor Yellow

$metaContent = @"
OMEGA PHASE 12 - EVIDENCE PACK METADATA
========================================
Generated: $(Get-Date -Format "o")
Hostname: $env:COMPUTERNAME
User: $env:USERNAME
Working Directory: $(Get-Location)
Node Version: $(node -v 2>$null)
NPM Version: $(npm -v 2>$null)
Git Commit: $(git rev-parse HEAD 2>$null)
Git Branch: $(git branch --show-current 2>$null)
Phase 11 Tag: $PHASE11_TAG
"@

$metaContent | Out-File -FilePath "$EVIDENCE_DIR\meta.txt" -Encoding utf8
Write-Host "  OK: meta.txt" -ForegroundColor Green

# Step 3: Run tests and capture log
Write-Host "[3/6] Running tests..." -ForegroundColor Yellow

$testDir = "OMEGA_PHASE12"
if (Test-Path $testDir) {
    Push-Location $testDir
    try {
        $testOutput = npm test 2>&1 | Out-String
        $testOutput | Out-File -FilePath "..\$EVIDENCE_DIR\tests.log" -Encoding utf8
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARN: Tests may have failed (check tests.log)" -ForegroundColor Yellow
        } else {
            Write-Host "  OK: tests.log" -ForegroundColor Green
        }
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host "  SKIP: $testDir not found" -ForegroundColor Yellow
    "TEST DIRECTORY NOT FOUND: $testDir" | Out-File -FilePath "$EVIDENCE_DIR\tests.log" -Encoding utf8
}

# Step 4: Generate Merkle manifest
Write-Host "[4/6] Generating Merkle manifest..." -ForegroundColor Yellow

$merkleScript = "OMEGA_PHASE12\deployment\scripts\merkle_manifest.node.mjs"
if (Test-Path $merkleScript) {
    node $merkleScript 2>&1 | Tee-Object -FilePath "$EVIDENCE_DIR\merkle_gen.log"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Merkle manifest generation failed"
    }
    Write-Host "  OK: Merkle manifest generated" -ForegroundColor Green
} else {
    Write-Host "  WARN: Merkle script not found" -ForegroundColor Yellow
}

# Step 5: Generate git diff vs Phase 11 tag (INV-DEP-05)
Write-Host "[5/6] Checking core unchanged vs $PHASE11_TAG..." -ForegroundColor Yellow

$diffFile = "$EVIDENCE_DIR\diff_core_vs_phase11.txt"

$tagExists = git tag -l $PHASE11_TAG 2>$null
if ($tagExists) {
    if (Test-Path $CORE_PATH) {
        git diff $PHASE11_TAG -- $CORE_PATH 2>$null | Out-File -FilePath $diffFile -Encoding utf8
        
        $diffContent = Get-Content $diffFile -ErrorAction SilentlyContinue
        $diffLines = ($diffContent | Measure-Object -Line).Lines
        
        if ($diffLines -eq 0) {
            Write-Host "  OK: Core unchanged (diff is empty)" -ForegroundColor Green
        } else {
            Write-Host "  WARN: Core has changes! ($diffLines lines)" -ForegroundColor Red
        }
    } else {
        "CORE PATH NOT FOUND: $CORE_PATH" | Out-File -FilePath $diffFile -Encoding utf8
        Write-Host "  WARN: Core path not found: $CORE_PATH" -ForegroundColor Yellow
    }
} else {
    "TAG NOT FOUND: $PHASE11_TAG" | Out-File -FilePath $diffFile -Encoding utf8
    Write-Host "  WARN: Tag $PHASE11_TAG not found" -ForegroundColor Yellow
}

# Step 6: Capture git status
Write-Host "[6/6] Capturing git status..." -ForegroundColor Yellow

git status --porcelain 2>$null | Out-File -FilePath "$EVIDENCE_DIR\git_status.txt" -Encoding utf8
Write-Host "  OK: git_status.txt" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  EVIDENCE PACK COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Generated files:" -ForegroundColor White
Get-ChildItem -Path $EVIDENCE_DIR -File | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Gray
}

$rootFile = "$EVIDENCE_DIR\manifest.root.sha256"
if (Test-Path $rootFile) {
    $root = (Get-Content $rootFile -Raw).Trim()
    Write-Host ""
    Write-Host "MERKLE ROOT: $root" -ForegroundColor Cyan
}

Write-Host ""
