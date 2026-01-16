<#
.SYNOPSIS
    Install OMEGA Git Hooks
.DESCRIPTION
    Copies git hooks from scripts/githooks/ to .git/hooks/
    NASA-Grade L4 / DO-178C Level A compliance.
.PARAMETER Force
    Overwrite existing hooks without prompting
.EXAMPLE
    .\install-hooks.ps1
.EXAMPLE
    .\install-hooks.ps1 -Force
.NOTES
    Version: 3.92.0
    Phase: 92
#>

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptVersion = "3.92.0"

$ProjectRoot = $PSScriptRoot | Split-Path | Split-Path
$HooksSource = $PSScriptRoot
$HooksTarget = Join-Path $ProjectRoot ".git\hooks"

$Hooks = @(
    @{ Name = "pre-commit"; Description = "Fast validation (<5s)" }
    @{ Name = "pre-push"; Description = "Thorough validation" }
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " OMEGA Git Hooks Installer v$ScriptVersion" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verify .git directory exists
if (-not (Test-Path $HooksTarget)) {
    Write-Host "[ERROR] .git/hooks directory not found" -ForegroundColor Red
    Write-Host "  Expected: $HooksTarget" -ForegroundColor Red
    exit 1
}

$installed = 0
$skipped = 0

foreach ($hook in $Hooks) {
    $source = Join-Path $HooksSource $hook.Name
    $target = Join-Path $HooksTarget $hook.Name

    Write-Host "[$($hook.Name)] $($hook.Description)" -ForegroundColor White

    if (-not (Test-Path $source)) {
        Write-Host "  [SKIP] Source not found: $source" -ForegroundColor Yellow
        $skipped++
        continue
    }

    if ((Test-Path $target) -and -not $Force) {
        Write-Host "  [SKIP] Already exists (use -Force to overwrite)" -ForegroundColor Yellow
        $skipped++
        continue
    }

    try {
        Copy-Item -Path $source -Destination $target -Force
        Write-Host "  [OK] Installed to $target" -ForegroundColor Green
        $installed++
    }
    catch {
        Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Summary: $installed installed, $skipped skipped" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($installed -gt 0) {
    Write-Host "Hooks installed successfully!" -ForegroundColor Green
}
