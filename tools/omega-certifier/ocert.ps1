# OMEGA CERTIFY AUTO v2.0.0
# Certification automatique - ZERO QUESTION, ZERO PARAMETRE

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$CONFIG = @{
    Profile = "L4"
    Seed = "42"
    Runs = 5
    OutDir = "./certificates"
}

$certifierPath = Join-Path $PSScriptRoot "omega_certify.ps1"
if (-not (Test-Path $certifierPath)) {
    $certifierPath = ".\omega_certify.ps1"
    if (-not (Test-Path $certifierPath)) {
        Write-Host ""
        Write-Host "  [ERREUR] omega_certify.ps1 non trouve!" -ForegroundColor Red
        exit 1
    }
}

$modulePath = "."
$hasOfficialManifest = Test-Path "module.omega.json"
$hasPackageJson = Test-Path "package.json"

if (-not $hasOfficialManifest -and -not $hasPackageJson) {
    Write-Host ""
    Write-Host "  [ERREUR] Aucun module detecte!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  OMEGA CERTIFY AUTO v2.0.0" -ForegroundColor Cyan
Write-Host "  Module:  $((Get-Location).Path)"
Write-Host "  Profile: $($CONFIG.Profile)"
Write-Host "  Seed:    $($CONFIG.Seed)"
Write-Host "  Runs:    $($CONFIG.Runs)"
Write-Host ""

& $certifierPath `
    -ModulePath $modulePath `
    -Profile $CONFIG.Profile `
    -Seed $CONFIG.Seed `
    -Runs $CONFIG.Runs `
    -OutDir $CONFIG.OutDir

exit $LASTEXITCODE
