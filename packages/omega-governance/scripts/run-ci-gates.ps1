# OMEGA Governance — CI Gates Runner
# Phase F — PowerShell script for local CI gate execution
# Usage: .\scripts\run-ci-gates.ps1

param(
    [string]$BaselineVersion = "v1.0.0",
    [string]$BaselinesDir = ".\baselines",
    [string]$Format = "json"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " OMEGA CI Gates — Phase F" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: TypeCheck
Write-Host "[GATE 0] TypeCheck..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] TypeCheck failed" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] TypeCheck" -ForegroundColor Green
Write-Host ""

# Step 2: Run Tests
Write-Host "[GATE 1] Running tests..." -ForegroundColor Yellow
$testOutput = npx vitest run 2>&1
$testOutput | Write-Host
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Tests failed" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] Tests" -ForegroundColor Green
Write-Host ""

# Step 3: Verify test count
Write-Host "[GATE 2] Verifying test count >= 312..." -ForegroundColor Yellow
$match = $testOutput | Select-String -Pattern "(\d+) passed"
if ($match) {
    $count = [int]$match.Matches[0].Groups[1].Value
    if ($count -ge 312) {
        Write-Host "[PASS] $count tests passed (>= 312)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Only $count tests passed (< 312)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[WARN] Could not parse test count" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Generate evidence hashes
Write-Host "[GATE 3] Generating evidence hashes..." -ForegroundColor Yellow
$hashFile = "evidence\phase-f-hashes.txt"
if (-not (Test-Path "evidence")) { New-Item -ItemType Directory -Path "evidence" | Out-Null }
Get-ChildItem -Path "src" -Recurse -Filter "*.ts" | ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    "$hash  $($_.FullName)"
} | Out-File -FilePath $hashFile -Encoding utf8
Write-Host "[PASS] Evidence hashes written to $hashFile" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host " ALL CI GATES PASSED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
