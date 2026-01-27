# OMEGA Phase C.1.2 — Test Runner Script
# Workaround pour le bug Windows npm.ps1 $LASTEXITCODE
# Usage: .\run-tests.ps1

$ErrorActionPreference = "Continue"
$LASTEXITCODE = 0

Set-Location -Path $PSScriptRoot

Write-Host "=== OMEGA Sentinel Judge Test Runner ===" -ForegroundColor Cyan
Write-Host "Location: $PWD"
Write-Host ""

$vitestPath = Join-Path $PWD "node_modules\.bin\vitest.cmd"

if (Test-Path $vitestPath) {
    Write-Host "Running: vitest run" -ForegroundColor Green
    & $vitestPath run
    $exitCode = $LASTEXITCODE
} else {
    Write-Host "Error: vitest not found at $vitestPath" -ForegroundColor Red
    Write-Host "Run 'npm install' first" -ForegroundColor Yellow
    $exitCode = 1
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Exit code: $exitCode"

exit $exitCode
