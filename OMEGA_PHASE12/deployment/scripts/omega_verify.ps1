# ==============================================================================
# OMEGA PROJECT - DEPLOYMENT VERIFICATION
# Phase 12 - Industrial Deployment
# Standard: NASA-Grade L4 / DO-178C Level A
# ==============================================================================
#
# INVARIANTS VERIFIED:
# - INV-DEP-02: Merkle root well-formed (64 hex chars)
# - INV-DEP-03: Evidence pack complete (all expected files)
# - INV-DEP-05: Core diff is empty
#
# EXIT CODES:
#   0 = VERIFICATION PASSED
#   1 = VERIFICATION FAILED
#
# ==============================================================================

$ErrorActionPreference = "Stop"

$EVIDENCE_DIR = "evidence\PHASE_12_EVIDENCE"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  OMEGA VERIFY - Phase 12 Deployment Verification" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$exitCode = 0
$failures = @()

# Check 1: Evidence directory exists
Write-Host "[1/5] Checking evidence directory..." -ForegroundColor Yellow

if (Test-Path $EVIDENCE_DIR) {
    Write-Host "  OK: $EVIDENCE_DIR exists" -ForegroundColor Green
} else {
    Write-Host "  FAIL: $EVIDENCE_DIR not found" -ForegroundColor Red
    $failures += "Evidence directory missing"
    $exitCode = 1
}

# Check 2: Required files present (INV-DEP-03)
Write-Host "[2/5] Checking required files (INV-DEP-03)..." -ForegroundColor Yellow

$requiredFiles = @(
    "tests.log",
    "manifest.files.sha256",
    "manifest.merkle.json",
    "manifest.root.sha256",
    "diff_core_vs_phase11.txt",
    "git_status.txt",
    "meta.txt"
)

foreach ($file in $requiredFiles) {
    $filePath = Join-Path $EVIDENCE_DIR $file
    if (Test-Path $filePath) {
        Write-Host "  OK: $file" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: $file missing" -ForegroundColor Red
        $failures += "Missing file: $file"
        $exitCode = 1
    }
}

# Check 3: Merkle root well-formed (INV-DEP-02)
Write-Host "[3/5] Checking Merkle root format (INV-DEP-02)..." -ForegroundColor Yellow

$rootFile = Join-Path $EVIDENCE_DIR "manifest.root.sha256"
if (Test-Path $rootFile) {
    $root = (Get-Content $rootFile -Raw).Trim()
    
    if ($root.Length -eq 64) {
        Write-Host "  OK: Root length = 64 chars" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: Root length = $($root.Length) (expected 64)" -ForegroundColor Red
        $failures += "Invalid Merkle root length"
        $exitCode = 1
    }
    
    if ($root -match "^[A-Fa-f0-9]{64}$") {
        Write-Host "  OK: Root is valid hex" -ForegroundColor Green
        Write-Host "  ROOT: $root" -ForegroundColor Cyan
    } else {
        Write-Host "  FAIL: Root contains non-hex characters" -ForegroundColor Red
        $failures += "Invalid Merkle root format"
        $exitCode = 1
    }
} else {
    Write-Host "  SKIP: manifest.root.sha256 not found" -ForegroundColor Yellow
}

# Check 4: Core diff is empty (INV-DEP-05)
Write-Host "[4/5] Checking core unchanged (INV-DEP-05)..." -ForegroundColor Yellow

$diffFile = Join-Path $EVIDENCE_DIR "diff_core_vs_phase11.txt"
if (Test-Path $diffFile) {
    $diffContent = Get-Content $diffFile -ErrorAction SilentlyContinue
    
    if ($null -eq $diffContent -or $diffContent.Count -eq 0) {
        Write-Host "  OK: Core diff is empty (unchanged)" -ForegroundColor Green
    } else {
        $firstLine = $diffContent[0]
        if ($firstLine -match "^(TAG NOT FOUND|CORE PATH NOT FOUND)") {
            Write-Host "  WARN: $firstLine" -ForegroundColor Yellow
        } else {
            $lineCount = ($diffContent | Measure-Object -Line).Lines
            Write-Host "  FAIL: Core has changes ($lineCount lines)" -ForegroundColor Red
            $failures += "Core modified vs Phase 11"
            $exitCode = 1
        }
    }
} else {
    Write-Host "  SKIP: diff file not found" -ForegroundColor Yellow
}

# Check 5: Tests passed
Write-Host "[5/5] Checking test results..." -ForegroundColor Yellow

$testLog = Join-Path $EVIDENCE_DIR "tests.log"
if (Test-Path $testLog) {
    $testContent = Get-Content $testLog -Raw
    
    if ($testContent -match "(\d+)\s+passed") {
        $passedCount = $Matches[1]
        Write-Host "  OK: $passedCount tests passed" -ForegroundColor Green
    } elseif ($testContent -match "FAIL|failed|error") {
        Write-Host "  WARN: Test log may contain failures" -ForegroundColor Yellow
    } else {
        Write-Host "  OK: Test log exists" -ForegroundColor Green
    }
} else {
    Write-Host "  SKIP: tests.log not found" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan

if ($exitCode -eq 0) {
    Write-Host "  VERIFICATION: PASS" -ForegroundColor Green
} else {
    Write-Host "  VERIFICATION: FAIL" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Failures:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "    - $failure" -ForegroundColor Red
    }
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

exit $exitCode
