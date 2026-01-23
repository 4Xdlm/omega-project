# ═══════════════════════════════════════════════════════════════════════════
# OMEGA Phase 7 — Run RCE-01 Render
#
# Standard: NASA-Grade L4 / DO-178C Level A
# Version: 1.2
#
# Runs the trunk renderer inside the RCE-01 Docker container.
# Guarantees deterministic output within the controlled environment.
# ═══════════════════════════════════════════════════════════════════════════

param(
    [string]$ImageTag = "omega-rce01:latest",
    [string]$SignatureFile = "",
    [switch]$UseLocal = $false
)

$ErrorActionPreference = "Stop"

Write-Host "OMEGA Phase 7 - Run RCE-01 Render" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ArtifactsDir = Join-Path $RootDir "artifacts"
$FixturesDir = Join-Path $RootDir "fixtures\trunk"

# Ensure artifacts directory exists
if (-not (Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
}

if ($UseLocal) {
    # Run locally (for development/testing)
    Write-Host "`n[LOCAL MODE] Running with Node.js..." -ForegroundColor Yellow

    $DistCli = Join-Path $RootDir "dist\cli.js"
    if (-not (Test-Path $DistCli)) {
        Write-Error "CLI not built. Run 'npm run build' first."
        exit 1
    }

    Push-Location $RootDir
    try {
        node dist/cli.js render
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Render failed with exit code $LASTEXITCODE"
            exit 1
        }
    } finally {
        Pop-Location
    }
} else {
    # Run in Docker (for deterministic output)
    Write-Host "`n[DOCKER MODE] Running in RCE-01 container..." -ForegroundColor Yellow

    # Check if image exists
    $ImageExists = docker images -q $ImageTag 2>$null
    if (-not $ImageExists) {
        Write-Error "Docker image not found: $ImageTag. Run build-rce01.ps1 first."
        exit 1
    }

    # Prepare volumes
    $Volumes = @(
        "-v", "${ArtifactsDir}:/app/artifacts"
    )

    if ($SignatureFile -and (Test-Path $SignatureFile)) {
        $FixtureMount = Split-Path -Parent $SignatureFile
        $Volumes += @("-v", "${FixtureMount}:/app/fixtures/trunk:ro")
    } elseif (Test-Path $FixturesDir) {
        $Volumes += @("-v", "${FixturesDir}:/app/fixtures/trunk:ro")
    }

    # Run container
    Write-Host "  Image: $ImageTag"
    Write-Host "  Artifacts: $ArtifactsDir"

    docker run --rm @Volumes $ImageTag render

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker render failed with exit code $LASTEXITCODE"
        exit 1
    }
}

# Verify outputs
Write-Host "`n[VERIFICATION] Checking outputs..." -ForegroundColor Yellow

$SvgFile = Join-Path $ArtifactsDir "trunk.svg"
$PngFile = Join-Path $ArtifactsDir "trunk.png"
$ReportFile = Join-Path $ArtifactsDir "render_report.json"
$PngHashFile = Join-Path $ArtifactsDir "trunk.png.sha256"

$MissingFiles = @()
if (-not (Test-Path $SvgFile)) { $MissingFiles += "trunk.svg" }
if (-not (Test-Path $PngFile)) { $MissingFiles += "trunk.png" }
if (-not (Test-Path $ReportFile)) { $MissingFiles += "render_report.json" }
if (-not (Test-Path $PngHashFile)) { $MissingFiles += "trunk.png.sha256" }

if ($MissingFiles.Count -gt 0) {
    Write-Error "Missing output files: $($MissingFiles -join ', ')"
    exit 1
}

# Display results
Write-Host "`n[OK] Render completed successfully!" -ForegroundColor Green
Write-Host "`n  Artifacts:"
Write-Host "    SVG:    $SvgFile"
Write-Host "    PNG:    $PngFile"
Write-Host "    Report: $ReportFile"

$PngHash = Get-Content $PngHashFile -Raw
Write-Host "`n  PNG SHA256: $PngHash"
