# ═══════════════════════════════════════════════════════════════════════════
# OMEGA Phase 7 — Create Proof Pack
#
# Standard: NASA-Grade L4 / DO-178C Level A
# Version: 1.2
#
# Creates the final proof_pack_phase7_v1.2.zip deliverable.
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "OMEGA Phase 7 - Create Proof Pack" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ProofPackDir = Join-Path $RootDir "proof_pack"
$ZipPath = Join-Path $RootDir "proof_pack_phase7_v1.2.zip"

# Clean existing
Write-Host "`n[1/6] Cleaning existing proof pack..."
if (Test-Path $ProofPackDir) {
    Remove-Item -Recurse -Force $ProofPackDir
}
if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
}

New-Item -ItemType Directory -Path $ProofPackDir -Force | Out-Null

# Copy artifacts
Write-Host "`n[2/6] Copying artifacts..."
$ArtifactsDir = Join-Path $RootDir "artifacts"
if (Test-Path $ArtifactsDir) {
    $ProofArtifacts = Join-Path $ProofPackDir "artifacts"
    New-Item -ItemType Directory -Path $ProofArtifacts -Force | Out-Null
    Copy-Item -Path (Join-Path $ArtifactsDir "*") -Destination $ProofArtifacts -Recurse
    Write-Host "  Copied artifacts/"
}

# Copy docs
Write-Host "`n[3/6] Copying documentation..."
$DocsDir = Join-Path $RootDir "docs\phase7"
if (Test-Path $DocsDir) {
    $ProofDocs = Join-Path $ProofPackDir "docs"
    New-Item -ItemType Directory -Path $ProofDocs -Force | Out-Null
    Copy-Item -Path (Join-Path $DocsDir "*") -Destination $ProofDocs -Recurse
    Write-Host "  Copied docs/"
}

# Copy render profiles
Write-Host "`n[4/6] Copying render profiles..."
$ProfilesDir = Join-Path $RootDir "render\profiles"
if (Test-Path $ProfilesDir) {
    $ProofProfiles = Join-Path $ProofPackDir "render\profiles"
    New-Item -ItemType Directory -Path $ProofProfiles -Force | Out-Null
    Copy-Item -Path (Join-Path $ProfilesDir "*") -Destination $ProofProfiles -Recurse
    Write-Host "  Copied render/profiles/"
}

# Copy calibration
$CalibrationDir = Join-Path $RootDir "calibration"
if (Test-Path $CalibrationDir) {
    $ProofCalibration = Join-Path $ProofPackDir "calibration"
    New-Item -ItemType Directory -Path $ProofCalibration -Force | Out-Null
    Copy-Item -Path (Join-Path $CalibrationDir "*") -Destination $ProofCalibration -Recurse
    Write-Host "  Copied calibration/"
}

# Copy test fixtures
$FixturesDir = Join-Path $RootDir "fixtures\trunk"
if (Test-Path $FixturesDir) {
    $ProofFixtures = Join-Path $ProofPackDir "fixtures\trunk"
    New-Item -ItemType Directory -Path $ProofFixtures -Force | Out-Null
    Copy-Item -Path (Join-Path $FixturesDir "*") -Destination $ProofFixtures -Recurse
    Write-Host "  Copied fixtures/trunk/"
}

# Generate manifest
Write-Host "`n[5/6] Generating manifest..."
$ManifestFiles = @()

Get-ChildItem -Path $ProofPackDir -Recurse -File | ForEach-Object {
    $RelPath = $_.FullName.Substring($ProofPackDir.Length + 1).Replace("\", "/")
    $Hash = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash.ToLower()
    $ManifestFiles += @{
        path = $RelPath
        sha256 = $Hash
        size_bytes = $_.Length
    }
    Write-Host "    $RelPath"
}

$Manifest = @{
    manifest_version = "1.0"
    proof_pack_version = "1.2"
    standard = "NASA-Grade L4 / DO-178C Level A"
    created_utc = (Get-Date -Format "o")
    files = $ManifestFiles
    summary = @{
        total_files = $ManifestFiles.Count
        artifacts = ($ManifestFiles | Where-Object { $_.path -like "artifacts/*" }).Count
        docs = ($ManifestFiles | Where-Object { $_.path -like "docs/*" }).Count
    }
}

$ManifestPath = Join-Path $ProofPackDir "MANIFEST.json"
$Manifest | ConvertTo-Json -Depth 10 | Out-File -FilePath $ManifestPath -Encoding utf8
Write-Host "  Created MANIFEST.json"

# Create ZIP
Write-Host "`n[6/6] Creating ZIP archive..."
Compress-Archive -Path (Join-Path $ProofPackDir "*") -DestinationPath $ZipPath -Force

$ZipHash = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash
$ZipSize = (Get-Item $ZipPath).Length

Write-Host "`n╔═══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                       PROOF PACK CREATED                                   ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  File:   $ZipPath"
Write-Host "  Size:   $([math]::Round($ZipSize / 1024, 2)) KB"
Write-Host "  SHA256: $ZipHash"
Write-Host ""
Write-Host "  Total files in pack: $($ManifestFiles.Count)"
