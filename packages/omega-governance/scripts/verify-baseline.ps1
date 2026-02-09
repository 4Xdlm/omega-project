# OMEGA Governance — Baseline Verification
# Phase F — Verify baseline integrity
# Usage: .\scripts\verify-baseline.ps1 -Version "v1.0.0"

param(
    [string]$Version = "v1.0.0",
    [string]$BaselinesDir = ".\baselines"
)

$ErrorActionPreference = "Stop"

Write-Host "OMEGA Baseline Verification" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Cyan
Write-Host ""

# Check registry
$registryPath = Join-Path $BaselinesDir "registry.json"
if (-not (Test-Path $registryPath)) {
    Write-Host "[FAIL] Registry not found at $registryPath" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] Registry exists" -ForegroundColor Green

# Check version directory
$versionDir = Join-Path $BaselinesDir $Version
if (-not (Test-Path $versionDir)) {
    Write-Host "[FAIL] Version directory not found: $versionDir" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] Version directory exists" -ForegroundColor Green

# Check manifest
$manifestPath = Join-Path $versionDir "baseline.manifest.json"
if (-not (Test-Path $manifestPath)) {
    Write-Host "[FAIL] Manifest not found" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] Manifest exists" -ForegroundColor Green

# Verify hash
$hashPath = Join-Path $versionDir "baseline.manifest.sha256"
if (Test-Path $hashPath) {
    $storedHash = (Get-Content $hashPath -Raw).Trim()
    $computedHash = (Get-FileHash $manifestPath -Algorithm SHA256).Hash.ToLower()
    if ($storedHash -eq $computedHash) {
        Write-Host "[PASS] Manifest hash verified: $computedHash" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Hash mismatch: stored=$storedHash computed=$computedHash" -ForegroundColor Red
        exit 1
    }
}

# Check thresholds
$thresholdsPath = Join-Path $versionDir "thresholds.json"
if (Test-Path $thresholdsPath) {
    Write-Host "[PASS] Thresholds file exists" -ForegroundColor Green
} else {
    Write-Host "[WARN] Thresholds file missing" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Baseline $Version verified successfully" -ForegroundColor Green
