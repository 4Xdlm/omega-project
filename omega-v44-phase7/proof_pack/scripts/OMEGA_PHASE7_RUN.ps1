# OMEGA Phase 7 - Main Execution Script
# Standard: NASA-Grade L4 / DO-178C Level A
# Version: 1.2

param(
    [switch]$SkipDocker = $false,
    [switch]$SkipTests = $false,
    [switch]$CreateProofPack = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "                    OMEGA Phase 7 - Trunk Renderer                       " -ForegroundColor Cyan
Write-Host "  Standard: NASA-Grade L4 / DO-178C Level A | Version: 1.2              " -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$StartTime = Get-Date

# STEP 1: Prerequisites
Write-Host "[STEP 1/5] Validating prerequisites..." -ForegroundColor Yellow

$NodeVersion = node --version 2>$null
if ($NodeVersion) {
    Write-Host "  Node.js: $NodeVersion [OK]" -ForegroundColor Green
} else {
    Write-Error "Node.js not found. Please install Node.js >= 20.11.0"
    exit 1
}

$NpmVersion = npm --version 2>$null
if ($NpmVersion) {
    Write-Host "  npm:     v$NpmVersion [OK]" -ForegroundColor Green
} else {
    Write-Error "npm not found."
    exit 1
}

$NodeModules = Join-Path $RootDir "node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    Push-Location $RootDir
    npm install
    Pop-Location
}

# STEP 2: Build
Write-Host ""
Write-Host "[STEP 2/5] Building TypeScript..." -ForegroundColor Yellow

Push-Location $RootDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    Write-Host "  Build complete [OK]" -ForegroundColor Green
} finally {
    Pop-Location
}

# STEP 3: Tests
if (-not $SkipTests) {
    Write-Host ""
    Write-Host "[STEP 3/5] Running tests (TR-01 to TR-07)..." -ForegroundColor Yellow

    Push-Location $RootDir
    try {
        npm test
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Tests failed"
            exit 1
        }
        Write-Host "  All tests passed [OK]" -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    Write-Host ""
    Write-Host "[STEP 3/5] Skipping tests (SkipTests flag)" -ForegroundColor Yellow
}

# STEP 4: Render
Write-Host ""
Write-Host "[STEP 4/5] Running trunk render..." -ForegroundColor Yellow

$RunScript = Join-Path $ScriptDir "run-rce01-render.ps1"
& $RunScript -UseLocal

# STEP 5: Proof Pack
if ($CreateProofPack) {
    Write-Host ""
    Write-Host "[STEP 5/5] Creating proof pack..." -ForegroundColor Yellow
    Write-Host "  (proof pack creation logic here)"
} else {
    Write-Host ""
    Write-Host "[STEP 5/5] Skipping proof pack (use -CreateProofPack to enable)" -ForegroundColor Yellow
}

# Summary
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Green
Write-Host "                        EXECUTION COMPLETE                               " -ForegroundColor Green
Write-Host "=========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Duration: $($Duration.TotalSeconds.ToString('F2')) seconds" -ForegroundColor White
Write-Host "Artifacts: $(Join-Path $RootDir 'artifacts')" -ForegroundColor White

$ArtifactFiles = Get-ChildItem -Path (Join-Path $RootDir "artifacts") -File -ErrorAction SilentlyContinue
if ($ArtifactFiles) {
    Write-Host ""
    Write-Host "Generated files:" -ForegroundColor White
    foreach ($file in $ArtifactFiles) {
        $Hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash.Substring(0, 16)
        Write-Host "  $($file.Name) [$Hash...]"
    }
}
