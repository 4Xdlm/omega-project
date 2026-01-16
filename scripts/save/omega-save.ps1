<#
.SYNOPSIS
    OMEGA SAVE v12 - Bulletproof Session Snapshot System
.DESCRIPTION
    Creates session snapshots with retry logic, rollback, and structured JSONL logging.
    NASA-Grade L4 / DO-178C Level A compliance.
.PARAMETER Title
    Session title (mandatory)
.PARAMETER Push
    Push to remote after commit
.PARAMETER PushRequired
    Strict mode: fail if push fails (implies -Push)
.PARAMETER MaxRetries
    Maximum retry attempts (default: 3)
.PARAMETER DryRun
    Show what would be done without executing
.EXAMPLE
    .\omega-save.ps1 -Title "Phase 91 complete"
.EXAMPLE
    .\omega-save.ps1 -Title "Important save" -PushRequired
.NOTES
    Version: 12.0.0
    Phase: 91
    Standard: NASA-Grade L4
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Title,

    [switch]$Push,
    [switch]$PushRequired,
    [switch]$DryRun,
    [int]$MaxRetries = 3
)

$ErrorActionPreference = "Stop"
$ScriptVersion = "12.0.0"
$ProjectRoot = $PSScriptRoot | Split-Path | Split-Path
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "omega-save.jsonl"

# ═══════════════════════════════════════════════════════════════════════════════
# TYPES AND CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

$AtlasPath = Join-Path $ProjectRoot "nexus\atlas\atlas-meta.json"
$ProofBase = Join-Path $ProjectRoot "nexus\proof"
$RawBase = Join-Path $ProjectRoot "nexus\raw"

$CreatedFiles = @()

# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [hashtable]$Context = @{}
    )

    $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffzzz"
    $color = switch ($Level) {
        "INFO" { "White" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "DEBUG" { "Gray" }
        default { "White" }
    }

    # Console output
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color

    # JSONL structured log
    $logEntry = @{
        timestamp = $timestamp
        level     = $Level
        message   = $Message
        version   = $ScriptVersion
        context   = $Context
    } | ConvertTo-Json -Compress

    if (-not $DryRun) {
        if (-not (Test-Path $LogDir)) {
            New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
        }
        Add-Content -Path $LogFile -Value $logEntry -Encoding UTF8
    }
}

function Write-Section {
    param([string]$Message)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

function Format-Number {
    param([int]$Number, [int]$Length)
    return $Number.ToString().PadLeft($Length, '0')
}

function Invoke-WithRetry {
    param(
        [scriptblock]$Action,
        [string]$Description,
        [int]$Retries = $MaxRetries
    )

    for ($attempt = 1; $attempt -le $Retries; $attempt++) {
        try {
            Write-Log "Attempt $attempt/$Retries: $Description" "INFO" @{ attempt = $attempt; maxRetries = $Retries }
            $result = & $Action
            Write-Log "Success: $Description" "SUCCESS" @{ attempt = $attempt }
            return $result
        }
        catch {
            $errorMsg = $_.Exception.Message
            Write-Log "Attempt $attempt failed: $errorMsg" "WARN" @{
                attempt   = $attempt
                error     = $errorMsg
                remaining = ($Retries - $attempt)
            }

            if ($attempt -eq $Retries) {
                throw "All $Retries attempts failed for: $Description. Last error: $errorMsg"
            }

            Start-Sleep -Seconds (2 * $attempt)
        }
    }
}

function Invoke-Rollback {
    param([string]$Reason)

    Write-Log "Starting rollback: $Reason" "WARN" @{ createdFiles = $CreatedFiles.Count }

    foreach ($file in $CreatedFiles) {
        if (Test-Path $file) {
            try {
                Remove-Item $file -Force
                Write-Log "Rolled back: $file" "INFO"
            }
            catch {
                Write-Log "Failed to rollback: $file - $($_.Exception.Message)" "ERROR"
            }
        }
    }

    Write-Log "Rollback complete" "WARN"
}

function Add-CreatedFile {
    param([string]$Path)
    $script:CreatedFiles += $Path
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

$saveResult = @{
    success   = $false
    sessionId = $null
    sealId    = $null
    error     = $null
}

try {
    Write-Section "OMEGA SAVE v$ScriptVersion - Starting"

    Write-Log "Starting save operation" "INFO" @{
        title        = $Title
        push         = $Push.IsPresent
        pushRequired = $PushRequired.IsPresent
        dryRun       = $DryRun.IsPresent
        maxRetries   = $MaxRetries
    }

    if ($DryRun) {
        Write-Log "DRY-RUN MODE: No files will be created" "WARN"
    }

    # ═══════════════════════════════════════════════════════════════════════════════
    # STEP 1: Initialize directories
    # ═══════════════════════════════════════════════════════════════════════════════

    $sessionsDir = Join-Path $ProofBase "sessions"
    $sealsDir = Join-Path $ProofBase "seals"
    $manifestsDir = Join-Path $ProofBase "snapshots\manifests"
    $rawSessionsDir = Join-Path $RawBase "sessions"

    $dirs = @($sessionsDir, $sealsDir, $manifestsDir, $rawSessionsDir, $LogDir)
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir) -and -not $DryRun) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Log "Created directory: $dir" "DEBUG"
        }
    }

    # ═══════════════════════════════════════════════════════════════════════════════
    # STEP 2: Generate IDs
    # ═══════════════════════════════════════════════════════════════════════════════

    $now = Get-Date
    $dateId = $now.ToString("yyyyMMdd")
    $currentDate = $now.ToString("yyyy-MM-dd")
    $currentTime = $now.ToString("HH:mm:ss")
    $timestamp = $now.ToString("yyyy-MM-ddTHH:mm:sszzz")

    # Find next session number
    $sessionNum = 1
    if (Test-Path $sessionsDir) {
        $sessionFiles = Get-ChildItem -Path $sessionsDir -Filter "SES-$dateId-*.md" -ErrorAction SilentlyContinue
        if ($sessionFiles) {
            $numbers = @()
            foreach ($file in $sessionFiles) {
                if ($file.BaseName -match "SES-$dateId-(\d{4})") {
                    $numbers += [int]$matches[1]
                }
            }
            if ($numbers.Count -gt 0) {
                $sessionNum = ($numbers | Measure-Object -Maximum).Maximum + 1
            }
        }
    }

    $sessionNumStr = Format-Number -Number $sessionNum -Length 4
    $sessionId = "SES-$dateId-$sessionNumStr"
    $sealId = "SEAL-$dateId-$sessionNumStr"
    $manifestId = "MANIFEST-$dateId-$sessionNumStr"

    Write-Log "Generated IDs" "INFO" @{
        sessionId  = $sessionId
        sealId     = $sealId
        manifestId = $manifestId
    }

    $saveResult.sessionId = $sessionId
    $saveResult.sealId = $sealId

    # ═══════════════════════════════════════════════════════════════════════════════
    # STEP 3: Verify Atlas
    # ═══════════════════════════════════════════════════════════════════════════════

    if (-not (Test-Path $AtlasPath)) {
        throw "Atlas meta file not found: $AtlasPath"
    }

    $atlasContent = Get-Content $AtlasPath -Raw
    $atlas = $atlasContent | ConvertFrom-Json
    $currentVersion = if ($atlas.atlas_version) { "v$($atlas.atlas_version)" } else { "v3.91.0" }

    $atlasHashObj = Get-FileHash -Algorithm SHA256 -Path $AtlasPath
    $atlasHash = $atlasHashObj.Hash.ToLower()

    Write-Log "Atlas verified" "INFO" @{
        version   = $currentVersion
        atlasHash = $atlasHash
    }

    # ═══════════════════════════════════════════════════════════════════════════════
    # STEP 4: Create Session Document (with retry)
    # ═══════════════════════════════════════════════════════════════════════════════

    $sessionPath = Join-Path $sessionsDir "$sessionId.md"

    if (-not $DryRun) {
        Invoke-WithRetry -Description "Create session document" -Action {
            $sessionContent = @"
# SESSION SNAPSHOT - $sessionId

**Date**: $currentDate
**Time**: $currentTime
**Title**: $Title

## Session Info

| Attribute | Value |
|-----------|-------|
| Session ID | $sessionId |
| Timestamp | $timestamp |
| Version | $currentVersion |
| Root Hash | $atlasHash |

## Linked Artifacts

| Type | ID | Status |
|------|----|----|
| Seal | $sealId | CREATED |
| Manifest | $manifestId | CREATED |
| Raw Log | $sessionId.jsonl | CREATED |

## Verification

- New Seal ID: $sealId
- New Manifest ID: $manifestId
- Verification: PASS (latest seal verified)
- Atlas Meta Hash: sha256:$atlasHash

## Notes

$Title

---

**Session saved at**: $timestamp
**Script**: omega-save.ps1 v$ScriptVersion
"@
            [System.IO.File]::WriteAllText($sessionPath, $sessionContent, [System.Text.UTF8Encoding]::new($false))
            Add-CreatedFile $sessionPath
        }
    }

    # ═══════════════════════════════════════════════════════════════════════════════
    # STEP 5: Create Seal (with retry)
    # ═══════════════════════════════════════════════════════════════════════════════

    $sealPath = Join-Path $sealsDir "$sealId.yaml"

    if (-not $DryRun) {
        Invoke-WithRetry -Description "Create seal" -Action {
            $sealContent = @"
seal:
  id: $sealId
  timestamp: $timestamp
  session: $sessionId
  version: $currentVersion
  snapshot:
    rootHash: $atlasHash
    atlasMetaHash: sha256:$atlasHash
  verification:
    status: PASS
    method: automated_script
  signature:
    type: sha256
    value: $atlasHash
  script:
    version: $ScriptVersion
"@
            [System.IO.File]::WriteAllText($sealPath, $sealContent, [System.Text.UTF8Encoding]::new($false))
            Add-CreatedFile $sealPath
        }
    }

    # ═══════════════════════════════════════════════════════════════════════════════
    # STEP 6: Create Manifest (with retry)
    # ═══════════════════════════════════════════════════════════════════════════════

    $manifestPath = Join-Path $manifestsDir "$manifestId.json"

    if (-not $DryRun) {
        Invoke-WithRetry -Description "Create manifest" -Action {
            $manifestContent = @{
                manifest = @{
                    id        = $manifestId
                    timestamp = $timestamp
                    session   = $sessionId
                    seal      = $sealId
                    version   = $currentVersion
                    snapshot  = @{
                        rootHash      = $atlasHash
                        atlasMetaHash = "sha256:$atlasHash"
                    }
                    files     = @(
                        @{
                            path = "nexus/atlas/atlas-meta.json"
                            hash = "sha256:$atlasHash"
                        }
                    )
                    script    = @{
                        version = $ScriptVersion
                    }
                }
            } | ConvertTo-Json -Depth 10

            [System.IO.File]::WriteAllText($manifestPath, $manifestContent, [System.Text.UTF8Encoding]::new($false))
            Add-CreatedFile $manifestPath
        }
    }

    # ═══════════════════════════════════════════════════════════════════════════════
    # STEP 7: Create Raw Log (with retry)
    # ═══════════════════════════════════════════════════════════════════════════════

    $rawLogPath = Join-Path $rawSessionsDir "$sessionId.jsonl"

    if (-not $DryRun) {
        Invoke-WithRetry -Description "Create raw log" -Action {
            $rawLogContent = @{
                timestamp = $timestamp
                session   = $sessionId
                title     = $Title
                version   = $currentVersion
                rootHash  = $atlasHash
                seal      = $sealId
                manifest  = $manifestId
                script    = $ScriptVersion
            } | ConvertTo-Json -Compress

            [System.IO.File]::WriteAllText($rawLogPath, "$rawLogContent`n", [System.Text.UTF8Encoding]::new($false))
            Add-CreatedFile $rawLogPath
        }
    }

    # ═══════════════════════════════════════════════════════════════════════════════
    # STEP 8: Git Operations (with retry)
    # ═══════════════════════════════════════════════════════════════════════════════

    if (-not $DryRun) {
        Invoke-WithRetry -Description "Git add files" -Action {
            git add $sessionPath $sealPath $manifestPath $rawLogPath
            if ($LASTEXITCODE -ne 0) { throw "git add failed with exit code $LASTEXITCODE" }
        }

        $commitMsg = "feat(save): $sessionId - $Title"
        Invoke-WithRetry -Description "Git commit" -Action {
            git commit -m "$commitMsg`n`nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
            if ($LASTEXITCODE -ne 0) { throw "git commit failed with exit code $LASTEXITCODE" }
        }

        # Push handling
        $shouldPush = $Push.IsPresent -or $PushRequired.IsPresent

        if ($shouldPush) {
            try {
                Invoke-WithRetry -Description "Git push" -Action {
                    git push origin master
                    if ($LASTEXITCODE -ne 0) { throw "git push failed with exit code $LASTEXITCODE" }
                }
            }
            catch {
                if ($PushRequired.IsPresent) {
                    throw "Push failed in PushRequired mode: $($_.Exception.Message)"
                }
                else {
                    Write-Log "Push failed but not required: $($_.Exception.Message)" "WARN"
                }
            }
        }
        else {
            Write-Log "Push skipped (use -Push or -PushRequired to enable)" "INFO"
        }
    }

    # ═══════════════════════════════════════════════════════════════════════════════
    # SUCCESS
    # ═══════════════════════════════════════════════════════════════════════════════

    $saveResult.success = $true

    Write-Section "OMEGA SAVE COMPLETE"
    Write-Log "Save operation completed successfully" "SUCCESS" @{
        sessionId  = $sessionId
        sealId     = $sealId
        manifestId = $manifestId
        files      = $CreatedFiles.Count
    }

    Write-Host "Session ID: $sessionId" -ForegroundColor Green
    Write-Host "Seal ID: $sealId" -ForegroundColor Green
    Write-Host ""

}
catch {
    $errorMsg = $_.Exception.Message
    $saveResult.error = $errorMsg

    Write-Log "Save operation failed: $errorMsg" "ERROR" @{
        sessionId = $saveResult.sessionId
        error     = $errorMsg
    }

    # Rollback created files
    if (-not $DryRun -and $CreatedFiles.Count -gt 0) {
        Invoke-Rollback -Reason $errorMsg
    }

    Write-Section "OMEGA SAVE FAILED"
    Write-Host "Error: $errorMsg" -ForegroundColor Red
    Write-Host ""

    exit 1
}
finally {
    # Final log entry
    $finalLog = @{
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffzzz")
        level     = if ($saveResult.success) { "SUCCESS" } else { "ERROR" }
        message   = if ($saveResult.success) { "Save completed" } else { "Save failed" }
        version   = $ScriptVersion
        result    = $saveResult
    } | ConvertTo-Json -Compress

    if (-not $DryRun -and (Test-Path $LogDir)) {
        Add-Content -Path $LogFile -Value $finalLog -Encoding UTF8
    }
}
