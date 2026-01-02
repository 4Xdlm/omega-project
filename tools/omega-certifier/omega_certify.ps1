# OMEGA CERTIFY v2.0.0 - Version simplifiee
param(
    [string]$ModulePath = ".",
    [ValidateSet("L1","L2","L3","L4")][string]$Profile = "L4",
    [string]$Seed = "42",
    [int]$Runs = 5,
    [string]$OutDir = "./certificates"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-Sha256([string]$data) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($data)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash($bytes)
    return ([BitConverter]::ToString($hash) -replace '-','').ToLower()
}

function Write-Utf8([string]$path, [string]$content) {
    $dir = Split-Path $path -Parent
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host ""
Write-Host "==============================================================================="
Write-Host "  OMEGA CERTIFIER v2.0.0 - NASA-Grade"
Write-Host "==============================================================================="
Write-Host ""

$modulePath = Resolve-Path $ModulePath
Write-Host "  Module:  $modulePath"
Write-Host "  Profile: $Profile"
Write-Host "  Seed:    $Seed"
Write-Host "  Runs:    $Runs"
Write-Host ""

# Check manifest
if ($Profile -eq "L4" -and -not (Test-Path "module.omega.json")) {
    Write-Host "  [ERREUR] L4 exige module.omega.json" -ForegroundColor Red
    exit 1
}

# Load manifest
if (Test-Path "module.omega.json") {
    $manifest = Get-Content "module.omega.json" -Raw | ConvertFrom-Json
    $moduleName = $manifest.meta.name
    $moduleVersion = $manifest.meta.version
} else {
    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $moduleName = $pkg.name
    $moduleVersion = $pkg.version
}

Write-Host "  Module Name:    $moduleName"
Write-Host "  Module Version: $moduleVersion"
Write-Host ""

# Run tests
Write-Host "  PHASE 2: Tests ($Runs runs)" -ForegroundColor Yellow
$env:OMEGA_SEED = $Seed
$allPassed = $true
$isStable = $true
$testResults = @()

for ($run = 1; $run -le $Runs; $run++) {
    Write-Host "    Run ${run}/${Runs}..." -NoNewline
    $rawOutput = npm test 2>&1 | Out-String
    $output = $rawOutput -replace '\x1b\[[0-9;]*m',''
    
    $passed = 0
    $failed = 0
    if ($output -match "Tests\s+(\d+)\s+passed") { $passed = [int]$Matches[1] }
    if ($output -match "(\d+) failed") { $failed = [int]$Matches[1] }
    
    $testResults += @{ run = $run; passed = $passed; failed = $failed }
    
    if ($failed -gt 0) {
        Write-Host " FAILED ($failed)" -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host " OK ($passed passed)" -ForegroundColor Green
    }
}

# Check stability
if ($testResults.Count -gt 1) {
    $first = $testResults[0]
    foreach ($r in $testResults) {
        if ($r.passed -ne $first.passed) { $isStable = $false }
    }
}

Write-Host ""

# Verdict
$verdict = "FAILED"
$canCertify = $false

if ($allPassed -and $isStable) {
    $verdict = "PASSED"
    $canCertify = $true
} elseif ($allPassed -and -not $isStable) {
    if ($Profile -eq "L4") {
        $verdict = "FAILED"
        Write-Host "  [L4] UNSTABLE = FAILED" -ForegroundColor Red
    } else {
        $verdict = "PASSED_UNSTABLE"
    }
}

# Calculate hashes
$gitCommit = try { (git rev-parse HEAD 2>$null).Trim() } catch { "N/A" }
$envHash = Get-Sha256 "node:$(node --version)|npm:$(npm --version)|git:$gitCommit"
$manifestHash = Get-Sha256 (Get-Content "module.omega.json" -Raw -ErrorAction SilentlyContinue)
$rootHash = Get-Sha256 "OMEGA|$manifestHash|$envHash|$Seed|$Profile|$Runs|$verdict"

Write-Host "  ROOT HASH: $rootHash" -ForegroundColor Cyan
Write-Host ""

# Create output
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmss")
$certDir = Join-Path $OutDir "$moduleName/$timestamp"
New-Item -ItemType Directory -Path $certDir -Force | Out-Null

# PASSPORT (always)
$passport = @{
    passport_id = [Guid]::NewGuid().ToString()
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    module = @{ name = $moduleName; version = $moduleVersion }
    config = @{ seed = $Seed; profile = $Profile; runs = $Runs }
    reproduce = ".\omega_certify.ps1 -ModulePath `"$ModulePath`" -Profile $Profile -Seed $Seed -Runs $Runs"
}
Write-Utf8 (Join-Path $certDir "PASSPORT.json") ($passport | ConvertTo-Json -Depth 10)

if ($canCertify) {
    # CERTIFICATE
    $cert = @{
        certificate_id = "sha256:$rootHash"
        verdict = $verdict
        module = @{ name = $moduleName; version = $moduleVersion }
        metrics = @{ tests_passed = $testResults[0].passed; runs = $Runs; stable = $isStable }
        root_hash = $rootHash
    }
    Write-Utf8 (Join-Path $certDir "CERTIFICATE.json") ($cert | ConvertTo-Json -Depth 10)
    
    $certMd = @"
# OMEGA CERTIFICATE - $moduleName v$moduleVersion

## PASSED

| Metric | Value |
|--------|-------|
| Profile | $Profile |
| Seed | $Seed |
| Runs | $Runs |
| Tests | $($testResults[0].passed) |
| Stable | $isStable |

## ROOT HASH
$rootHash

Generated: $((Get-Date).ToUniversalTime().ToString("o"))
"@
    Write-Utf8 (Join-Path $certDir "CERTIFICATE.md") $certMd
    
    Write-Host "===============================================================================" -ForegroundColor Green
    Write-Host "  CERTIFICATION PASSED" -ForegroundColor Green
    Write-Host "===============================================================================" -ForegroundColor Green
} else {
    # FAILURE REPORT
    $report = @{
        verdict = $verdict
        module = @{ name = $moduleName; version = $moduleVersion }
        reason = if (-not $allPassed) { "Test failures" } else { "Unstable results" }
    }
    Write-Utf8 (Join-Path $certDir "FAILURE_REPORT.json") ($report | ConvertTo-Json -Depth 10)
    Write-Utf8 (Join-Path $certDir "FAILURE_REPORT.md") "# FAILED`n`nReason: $($report.reason)"
    
    Write-Host "===============================================================================" -ForegroundColor Red
    Write-Host "  CERTIFICATION FAILED" -ForegroundColor Red
    Write-Host "===============================================================================" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Output: $certDir"
Write-Host ""





