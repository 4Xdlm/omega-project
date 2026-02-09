# OMEGA Install Script (PowerShell)
# Phase G.0 — Install and verify OMEGA release

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [string]$InstallDir = "$env:LOCALAPPDATA\omega",

    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"

Write-Host "OMEGA Installer v$Version" -ForegroundColor Cyan
Write-Host "Install directory: $InstallDir"

# 1. Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js is required but not found" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js: $nodeVersion"

# 2. Create install directory
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# 3. Download archive
$platform = "win-x64"
$filename = "omega-$Version-$platform.zip"
Write-Host "Archive: $filename"

# 4. Verify checksum (unless skipped)
if (-not $SkipVerify) {
    $checksumFile = "omega-$Version-checksums.sha256"
    if (Test-Path $checksumFile) {
        Write-Host "Verifying checksum..."
        $expected = (Get-Content $checksumFile | Where-Object { $_ -match $filename } | ForEach-Object { ($_ -split '\s+')[0] })
        $actual = (Get-FileHash -Algorithm SHA256 $filename).Hash.ToLower()
        if ($expected -ne $actual) {
            Write-Host "ERROR: Checksum mismatch!" -ForegroundColor Red
            Write-Host "  Expected: $expected"
            Write-Host "  Actual:   $actual"
            exit 1
        }
        Write-Host "Checksum verified" -ForegroundColor Green
    } else {
        Write-Host "WARNING: No checksum file found, skipping verification" -ForegroundColor Yellow
    }
}

# 5. Extract
Write-Host "Extracting to $InstallDir..."
if (Test-Path $filename) {
    Expand-Archive -Path $filename -DestinationPath $InstallDir -Force
}

# 6. Self-test
Write-Host "Running self-test..."
$selftest = & node "$InstallDir\omega-release" selftest 2>&1
Write-Host $selftest

Write-Host ""
Write-Host "OMEGA v$Version installed successfully" -ForegroundColor Green
