<#
.SYNOPSIS
    OMEGA Repository Cleanup Script
.DESCRIPTION
    Cleans temporary files, caches, and validates working tree state.
    NASA-Grade L4 / DO-178C Level A compliance.
.PARAMETER DryRun
    Show what would be cleaned without actually deleting.
.PARAMETER Verbose
    Enable verbose output.
.EXAMPLE
    .\cleanup-repo.ps1
.EXAMPLE
    .\cleanup-repo.ps1 -DryRun
.NOTES
    Version: 3.90.0
    Author: OMEGA Project
    Standard: NASA-Grade L4
#>

param(
    [switch]$DryRun,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ScriptVersion = "3.90.0"

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

$CleanupPatterns = @(
    @{ Path = "**/.vite"; Type = "Directory"; Description = "Vite cache" }
    @{ Path = "**/.vitest"; Type = "Directory"; Description = "Vitest cache" }
    @{ Path = "**/.cache"; Type = "Directory"; Description = "Generic cache" }
    @{ Path = "**/tmpclaude-*"; Type = "File"; Description = "Claude temp files" }
    @{ Path = "*.tmp"; Type = "File"; Description = "Temp files" }
    @{ Path = "*.temp"; Type = "File"; Description = "Temp files" }
)

$ProtectedPaths = @(
    "packages/sentinel",
    "packages/genome",
    "packages/mycelium",
    "gateway",
    "nexus/ledger"
)

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "INFO" { "White" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-ProtectedPath {
    param([string]$Path)
    foreach ($protected in $ProtectedPaths) {
        if ($Path -like "*$protected*") {
            return $true
        }
    }
    return $false
}

function Get-CleanupTargets {
    $targets = @()

    foreach ($pattern in $CleanupPatterns) {
        $items = Get-ChildItem -Path . -Recurse -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -like $pattern.Path -or $_.Name -like ($pattern.Path -replace '\*\*/', '') }

        foreach ($item in $items) {
            if (-not (Test-ProtectedPath $item.FullName)) {
                $targets += @{
                    Path = $item.FullName
                    Type = if ($item.PSIsContainer) { "Directory" } else { "File" }
                    Size = if ($item.PSIsContainer) { 0 } else { $item.Length }
                    Description = $pattern.Description
                }
            }
        }
    }

    return $targets
}

function Remove-CleanupTarget {
    param([hashtable]$Target)

    if ($DryRun) {
        Write-Log "[DRY-RUN] Would remove: $($Target.Path)" "INFO"
        return $true
    }

    try {
        if ($Target.Type -eq "Directory") {
            Remove-Item -Path $Target.Path -Recurse -Force -ErrorAction Stop
        } else {
            Remove-Item -Path $Target.Path -Force -ErrorAction Stop
        }
        Write-Log "Removed: $($Target.Path)" "SUCCESS"
        return $true
    } catch {
        Write-Log "Failed to remove: $($Target.Path) - $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-WorkingTreeClean {
    $status = git status --porcelain 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to get git status" "ERROR"
        return $false
    }

    # Filter out ignored items
    $unclean = $status | Where-Object { $_ -and $_ -notmatch '^\?\?' }

    if ($unclean) {
        Write-Log "Working tree has uncommitted changes:" "WARN"
        $unclean | ForEach-Object { Write-Log "  $_" "WARN" }
        return $false
    }

    return $true
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

Write-Log "OMEGA Cleanup Script v$ScriptVersion" "INFO"
Write-Log "Mode: $(if ($DryRun) { 'DRY-RUN' } else { 'EXECUTE' })" "INFO"
Write-Log "═══════════════════════════════════════════════════════════════" "INFO"

# Check we're in a git repo
if (-not (Test-Path ".git")) {
    Write-Log "Not in a git repository root" "ERROR"
    exit 1
}

# Get cleanup targets
Write-Log "Scanning for cleanup targets..." "INFO"
$targets = Get-CleanupTargets

if ($targets.Count -eq 0) {
    Write-Log "No cleanup targets found" "SUCCESS"
} else {
    Write-Log "Found $($targets.Count) cleanup target(s)" "INFO"

    $removed = 0
    $failed = 0

    foreach ($target in $targets) {
        if (Remove-CleanupTarget $target) {
            $removed++
        } else {
            $failed++
        }
    }

    Write-Log "═══════════════════════════════════════════════════════════════" "INFO"
    Write-Log "Cleanup complete: $removed removed, $failed failed" $(if ($failed -gt 0) { "WARN" } else { "SUCCESS" })
}

# Verify working tree
Write-Log "═══════════════════════════════════════════════════════════════" "INFO"
Write-Log "Verifying working tree status..." "INFO"

if (Test-WorkingTreeClean) {
    Write-Log "Working tree is clean (ignoring untracked files)" "SUCCESS"
    exit 0
} else {
    Write-Log "Working tree has uncommitted changes" "WARN"
    exit 1
}
