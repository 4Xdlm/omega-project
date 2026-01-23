# ═══════════════════════════════════════════════════════════════════════════
# OMEGA Phase 7 — Validate Render Profile
#
# Standard: NASA-Grade L4 / DO-178C Level A
# Version: 1.2
#
# Validates the RCE-01 render profile configuration.
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "OMEGA Phase 7 - Validate Render Profile" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ProfilePath = Join-Path $RootDir "render\profiles\RCE-01.json"
$TemplatePath = Join-Path $RootDir "render\profiles\RCE-01.template.json"
$CalibrationPath = Join-Path $RootDir "calibration\RCE-01-values.env"

# Check template exists
Write-Host "`n[1/4] Checking template..." -ForegroundColor Yellow
if (Test-Path $TemplatePath) {
    Write-Host "  Template: $TemplatePath [OK]" -ForegroundColor Green

    # Check for unsubstituted symbols
    $TemplateContent = Get-Content $TemplatePath -Raw
    $UnsubstitutedSymbols = [regex]::Matches($TemplateContent, '\$\{([^}]+)\}')
    Write-Host "  Symbols to substitute: $($UnsubstitutedSymbols.Count)"
    foreach ($symbol in $UnsubstitutedSymbols) {
        Write-Host "    - $($symbol.Value)"
    }
} else {
    Write-Warning "Template not found: $TemplatePath"
}

# Check calibration file
Write-Host "`n[2/4] Checking calibration values..." -ForegroundColor Yellow
if (Test-Path $CalibrationPath) {
    Write-Host "  Calibration: $CalibrationPath [OK]" -ForegroundColor Green

    $CalibrationValues = @{}
    Get-Content $CalibrationPath | ForEach-Object {
        if ($_ -match "^([^#=]+)=(.+)$") {
            $Key = $matches[1].Trim()
            $Value = $matches[2].Trim()
            $CalibrationValues[$Key] = $Value
            Write-Host "    $Key = $Value"
        }
    }

    # Validate ranges
    $Errors = @()

    if ([double]$CalibrationValues['ANISO_MIN'] -gt [double]$CalibrationValues['ANISO_MAX']) {
        $Errors += "ANISO_MIN > ANISO_MAX"
    }
    if ([double]$CalibrationValues['OPACITY_BASE'] -lt 0 -or [double]$CalibrationValues['OPACITY_BASE'] -gt 1) {
        $Errors += "OPACITY_BASE out of range [0,1]"
    }
    if ([double]$CalibrationValues['O2_AMP_MAX'] -lt 0 -or [double]$CalibrationValues['O2_AMP_MAX'] -gt 1) {
        $Errors += "O2_AMP_MAX out of range [0,1]"
    }
    if ([int]$CalibrationValues['RENDER_TIMEOUT'] -lt 1000) {
        $Errors += "RENDER_TIMEOUT too small (< 1000ms)"
    }

    if ($Errors.Count -gt 0) {
        foreach ($err in $Errors) {
            Write-Host "  ERROR: $err" -ForegroundColor Red
        }
    } else {
        Write-Host "  All calibration values valid" -ForegroundColor Green
    }
} else {
    Write-Error "Calibration file not found: $CalibrationPath"
    exit 1
}

# Check generated profile (if exists)
Write-Host "`n[3/4] Checking generated profile..." -ForegroundColor Yellow
if (Test-Path $ProfilePath) {
    Write-Host "  Profile: $ProfilePath [OK]" -ForegroundColor Green

    $ProfileContent = Get-Content $ProfilePath -Raw

    # Check for unsubstituted symbols (error)
    if ($ProfileContent -match '\$\{') {
        Write-Host "  ERROR: Unsubstituted symbols found in profile!" -ForegroundColor Red
        exit 1
    }

    Write-Host "  No unsubstituted symbols [OK]" -ForegroundColor Green
} else {
    Write-Host "  Profile not generated yet (will be created at runtime)"
}

# Validate via Node.js if available
Write-Host "`n[4/4] Running schema validation..." -ForegroundColor Yellow
$DistCli = Join-Path $RootDir "dist\cli.js"
if (Test-Path $DistCli) {
    Push-Location $RootDir
    try {
        node dist/cli.js validate-profile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Schema validation [OK]" -ForegroundColor Green
        } else {
            Write-Host "  Schema validation [FAILED]" -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "  CLI not built, skipping schema validation"
    Write-Host "  Run 'npm run build' to enable"
}

Write-Host "`n[OK] Profile validation complete!" -ForegroundColor Green
