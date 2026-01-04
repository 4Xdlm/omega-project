# ==============================================================================
# OMEGA PROJECT - DEPLOYMENT SCRIPT (1 COMMAND)
# Phase 12 - Industrial Deployment
# Standard: NASA-Grade L4 / DO-178C Level A
# ==============================================================================
#
# INVARIANTS COVERED:
# - INV-DEP-01: Deploiement 1 commande, sans interaction
#
# USAGE:
#   powershell -ExecutionPolicy Bypass -File .\deployment\scripts\omega_deploy.ps1
#
# EXIT CODES:
#   0 = SUCCESS
#   1 = FAILURE
#
# ==============================================================================

$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  OMEGA DEPLOY - Phase 12 Industrial Deployment" -ForegroundColor Cyan
Write-Host "  Standard: NASA-Grade L4" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$exitCode = 0

try {
    # --------------------------------------------------------------------------
    # Step 1: Preflight checks
    # --------------------------------------------------------------------------
    Write-Host "[1/5] Preflight checks..." -ForegroundColor Yellow
    
    $nodeVersion = node -v 2>$null
    if (-not $nodeVersion) {
        throw "Node.js not found. Please install Node.js >= 18"
    }
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Gray
    
    $npmVersion = npm -v 2>$null
    if (-not $npmVersion) {
        throw "npm not found"
    }
    Write-Host "  npm: $npmVersion" -ForegroundColor Gray
    
    $gitVersion = git --version 2>$null
    if (-not $gitVersion) {
        throw "git not found"
    }
    Write-Host "  git: $gitVersion" -ForegroundColor Gray
    
    Write-Host "  OK: All preflight checks passed" -ForegroundColor Green
    
    # --------------------------------------------------------------------------
    # Step 2: Install dependencies
    # --------------------------------------------------------------------------
    Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
    
    $phase12Dir = "OMEGA_PHASE12"
    if (-not (Test-Path $phase12Dir)) {
        throw "OMEGA_PHASE12 directory not found"
    }
    
    Push-Location $phase12Dir
    try {
        if (Test-Path "package-lock.json") {
            npm ci 2>&1 | Out-Null
        } else {
            npm install 2>&1 | Out-Null
        }
        Write-Host "  OK: Dependencies installed" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
    
    # --------------------------------------------------------------------------
    # Step 3: Run tests
    # --------------------------------------------------------------------------
    Write-Host "[3/5] Running tests..." -ForegroundColor Yellow
    
    Push-Location $phase12Dir
    try {
        $testResult = npm test 2>&1
        $testExitCode = $LASTEXITCODE
        
        if ($testExitCode -ne 0) {
            Write-Host $testResult
            throw "Tests failed with exit code $testExitCode"
        }
        
        $testMatch = $testResult | Select-String -Pattern "Tests\s+(\d+)\s+passed"
        if ($testMatch) {
            Write-Host "  OK: $($testMatch.Matches[0].Value)" -ForegroundColor Green
        } else {
            Write-Host "  OK: Tests passed" -ForegroundColor Green
        }
    }
    finally {
        Pop-Location
    }
    
    # --------------------------------------------------------------------------
    # Step 4: Generate evidence pack
    # --------------------------------------------------------------------------
    Write-Host "[4/5] Generating evidence pack..." -ForegroundColor Yellow
    
    $evidenceScript = "$phase12Dir\deployment\scripts\evidence_pack.ps1"
    if (Test-Path $evidenceScript) {
        & $evidenceScript
        if ($LASTEXITCODE -ne 0) {
            throw "Evidence pack generation failed"
        }
    } else {
        Write-Host "  WARN: evidence_pack.ps1 not found, skipping" -ForegroundColor Yellow
    }
    
    # --------------------------------------------------------------------------
    # Step 5: Verify deployment
    # --------------------------------------------------------------------------
    Write-Host "[5/5] Verifying deployment..." -ForegroundColor Yellow
    
    $verifyScript = "$phase12Dir\deployment\scripts\omega_verify.ps1"
    if (Test-Path $verifyScript) {
        & $verifyScript
        if ($LASTEXITCODE -ne 0) {
            throw "Deployment verification failed"
        }
    } else {
        $evidenceDir = "evidence\PHASE_12_EVIDENCE"
        if (Test-Path $evidenceDir) {
            $fileCount = (Get-ChildItem $evidenceDir -File).Count
            Write-Host "  OK: Evidence directory exists ($fileCount files)" -ForegroundColor Green
        }
    }
    
    # --------------------------------------------------------------------------
    # Success
    # --------------------------------------------------------------------------
    $duration = (Get-Date) - $startTime
    
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  OMEGA DEPLOY - SUCCESS" -ForegroundColor Green
    Write-Host "  Duration: $($duration.TotalSeconds.ToString('F1'))s" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    
}
catch {
    $exitCode = 1
    $duration = (Get-Date) - $startTime
    
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host "  OMEGA DEPLOY - FAILED" -ForegroundColor Red
    Write-Host "  Duration: $($duration.TotalSeconds.ToString('F1'))s" -ForegroundColor Red
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

exit $exitCode
