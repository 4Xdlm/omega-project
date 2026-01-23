# ═══════════════════════════════════════════════════════════════════════════
# OMEGA Phase 7 — Build RCE-01 Docker Image
#
# Standard: NASA-Grade L4 / DO-178C Level A
# Version: 1.2
#
# Builds the RCE-01 Premium Docker image with calibration injection.
# ═══════════════════════════════════════════════════════════════════════════

param(
    [string]$ImageTag = "omega-rce01:latest"
)

$ErrorActionPreference = "Stop"

Write-Host "OMEGA Phase 7 - Build RCE-01 Docker Image" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$DockerDir = Join-Path $RootDir "docker\rce-01"
$CalibrationFile = Join-Path $RootDir "calibration\RCE-01-values.env"

# Verify prerequisites
if (-not (Test-Path $DockerDir)) {
    Write-Error "Docker directory not found: $DockerDir"
    exit 1
}

if (-not (Test-Path $CalibrationFile)) {
    Write-Error "Calibration file not found: $CalibrationFile"
    exit 1
}

# Load calibration values
Write-Host "`n[1/4] Loading calibration values..." -ForegroundColor Yellow
$CalibrationValues = @{}
Get-Content $CalibrationFile | ForEach-Object {
    if ($_ -match "^([^#=]+)=(.+)$") {
        $CalibrationValues[$matches[1].Trim()] = $matches[2].Trim()
    }
}

Write-Host "  Loaded $($CalibrationValues.Count) calibration values"

# Build arguments
$BuildArgs = @(
    "--build-arg", "ANISO_MIN=$($CalibrationValues['ANISO_MIN'])",
    "--build-arg", "ANISO_MAX=$($CalibrationValues['ANISO_MAX'])",
    "--build-arg", "OPACITY_BASE=$($CalibrationValues['OPACITY_BASE'])",
    "--build-arg", "OPACITY_Z_COEFF=$($CalibrationValues['OPACITY_Z_COEFF'])",
    "--build-arg", "O2_AMP_MAX=$($CalibrationValues['O2_AMP_MAX'])",
    "--build-arg", "RENDER_TIMEOUT=$($CalibrationValues['RENDER_TIMEOUT'])"
)

# Build Docker image
Write-Host "`n[2/4] Building Docker image..." -ForegroundColor Yellow
Write-Host "  Tag: $ImageTag"
Write-Host "  Context: $DockerDir"

Push-Location $DockerDir
try {
    $BuildCmd = "docker build -t $ImageTag $($BuildArgs -join ' ') ."
    Write-Host "`n  Command: $BuildCmd`n"

    docker build -t $ImageTag @BuildArgs .

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed with exit code $LASTEXITCODE"
        exit 1
    }
} finally {
    Pop-Location
}

# Get image digest
Write-Host "`n[3/4] Getting image digest..." -ForegroundColor Yellow
$ImageDigest = docker inspect --format='{{index .RepoDigests 0}}' $ImageTag 2>$null
if (-not $ImageDigest) {
    $ImageDigest = docker inspect --format='{{.Id}}' $ImageTag
}
Write-Host "  Digest: $ImageDigest"

# Save digest to artifacts
Write-Host "`n[4/4] Saving image digest..." -ForegroundColor Yellow
$ArtifactsDir = Join-Path $RootDir "artifacts"
if (-not (Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
}
$DigestFile = Join-Path $ArtifactsDir "image.digest"
$ImageDigest | Out-File -FilePath $DigestFile -NoNewline -Encoding utf8
Write-Host "  Saved to: $DigestFile"

Write-Host "`n[OK] RCE-01 Docker image built successfully!" -ForegroundColor Green
Write-Host "  Image: $ImageTag"
Write-Host "  Digest: $ImageDigest"
