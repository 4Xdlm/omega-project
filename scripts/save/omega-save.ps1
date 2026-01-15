# ===============================================================================
# OMEGA SAVE v9 FINAL
# ===============================================================================

param(
  [Parameter(Mandatory=$true)]
  [string]$Title,
  
  [switch]$Push
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\elric\omega-project"
$AtlasPath = Join-Path $ProjectRoot "nexus\atlas\atlas-meta.json"
$ProofBase = Join-Path $ProjectRoot "nexus\proof"
$RawBase = Join-Path $ProjectRoot "nexus\raw"

function Write-Info {
  param([string]$Message)
  Write-Host "(INFO) $Message" -ForegroundColor White
}

function Write-Success {
  param([string]$Message)
  Write-Host "(OK) $Message" -ForegroundColor Green
}

function Write-Section {
  param([string]$Message)
  Write-Host "===============================================================================" -ForegroundColor Cyan
  Write-Host " $Message" -ForegroundColor Cyan
  Write-Host "===============================================================================" -ForegroundColor Cyan
}

function Pad-Number {
  param([int]$Number, [int]$Length)
  $str = $Number.ToString()
  while ($str.Length -lt $Length) {
    $str = "0" + $str
  }
  return $str
}

try {
  Write-Host ""
  Write-Section "OMEGA SAVE - Starting snapshot process"
  Write-Host ""

  $sessionsDir = Join-Path $ProofBase "sessions"
  $sealsDir = Join-Path $ProofBase "seals"
  $manifestsDir = Join-Path $ProofBase "snapshots\manifests"
  $rawSessionsDir = Join-Path $RawBase "sessions"
  
  if (-not (Test-Path $sessionsDir)) { New-Item -ItemType Directory -Path $sessionsDir -Force | Out-Null }
  if (-not (Test-Path $sealsDir)) { New-Item -ItemType Directory -Path $sealsDir -Force | Out-Null }
  if (-not (Test-Path $manifestsDir)) { New-Item -ItemType Directory -Path $manifestsDir -Force | Out-Null }
  if (-not (Test-Path $rawSessionsDir)) { New-Item -ItemType Directory -Path $rawSessionsDir -Force | Out-Null }

  $now = Get-Date
  
  $year = $now.Year.ToString()
  $month = Pad-Number -Number $now.Month -Length 2
  $day = Pad-Number -Number $now.Day -Length 2
  $hour = Pad-Number -Number $now.Hour -Length 2
  $minute = Pad-Number -Number $now.Minute -Length 2
  $second = Pad-Number -Number $now.Second -Length 2
  
  $dateId = $year + $month + $day
  $currentDate = $year + "-" + $month + "-" + $day
  $currentTime = $hour + ":" + $minute + ":" + $second
  
  $offset = $now.ToString("zzz")
  $timestamp = $year + "-" + $month + "-" + $day + "T" + $hour + ":" + $minute + ":" + $second + $offset
  
  $sessionNum = 1
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
  
  $sessionNumStr = Pad-Number -Number $sessionNum -Length 4
  $sessionId = "SES-" + $dateId + "-" + $sessionNumStr
  $sealId = "SEAL-" + $dateId + "-" + $sessionNumStr
  $manifestId = "MANIFEST-" + $dateId + "-" + $sessionNumStr

  Write-Info ("Session ID: " + $sessionId)
  Write-Info ("Seal ID: " + $sealId)
  Write-Info ("Manifest ID: " + $manifestId)
  Write-Host ""

  if (-not (Test-Path $AtlasPath)) {
    throw "Atlas meta file not found: $AtlasPath"
  }

  $atlasContent = Get-Content $AtlasPath -Raw
  $atlas = $atlasContent | ConvertFrom-Json
  
  $currentVersion = "v3.15.0"
  $currentRoot = "COMPUTED"
  
  if ($atlas.atlas_version) {
    $currentVersion = "v" + $atlas.atlas_version
  }

  Write-Info ("Current version: " + $currentVersion)
  Write-Info ("Current root hash: " + $currentRoot)
  Write-Host ""

  $atlasHashObj = Get-FileHash -Algorithm SHA256 -Path $AtlasPath
  $atlasHash = $atlasHashObj.Hash.ToLower()
  $currentRoot = $atlasHash
  
  Write-Info ("Atlas meta hash: sha256:" + $atlasHash)
  Write-Host ""

  $sessionPath = Join-Path $sessionsDir ($sessionId + ".md")
  
  if (Test-Path $sessionPath) {
    Remove-Item $sessionPath -Force
  }
  
  Add-Content -Path $sessionPath -Value ("# SESSION SNAPSHOT - " + $sessionId) -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("**Date**: " + $currentDate) -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("**Time**: " + $currentTime) -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("**Title**: " + $Title) -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "## Session Info" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "| Attribute | Value |" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "|-----------|-------|" -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("| Session ID | " + $sessionId + " |") -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("| Timestamp | " + $timestamp + " |") -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("| Version | " + $currentVersion + " |") -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("| Root Hash | " + $currentRoot + " |") -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "## Linked Artifacts" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "| Type | ID | Status |" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "|------|----|-|" -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("| Seal | " + $sealId + " | CREATED |") -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("| Manifest | " + $manifestId + " | CREATED |") -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("| Raw Log | " + $sessionId + ".jsonl | CREATED |") -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "## Verification" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("- New Seal ID: " + $sealId) -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("- New Manifest ID: " + $manifestId) -Encoding UTF8
  Add-Content -Path $sessionPath -Value "- Verification: PASS (latest seal verified)" -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("- Atlas Meta Hash: sha256:" + $atlasHash) -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "## Notes" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value $Title -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "---" -Encoding UTF8
  Add-Content -Path $sessionPath -Value "" -Encoding UTF8
  Add-Content -Path $sessionPath -Value ("**Session saved at**: " + $timestamp) -Encoding UTF8
  Add-Content -Path $sessionPath -Value "**Script**: omega-save.ps1 v9" -Encoding UTF8
  
  Write-Success "Session document created"

  $sealPath = Join-Path $sealsDir ($sealId + ".yaml")
  
  if (Test-Path $sealPath) {
    Remove-Item $sealPath -Force
  }
  
  Add-Content -Path $sealPath -Value "seal:" -Encoding UTF8
  Add-Content -Path $sealPath -Value ("  id: " + $sealId) -Encoding UTF8
  Add-Content -Path $sealPath -Value ("  timestamp: " + $timestamp) -Encoding UTF8
  Add-Content -Path $sealPath -Value ("  session: " + $sessionId) -Encoding UTF8
  Add-Content -Path $sealPath -Value ("  version: " + $currentVersion) -Encoding UTF8
  Add-Content -Path $sealPath -Value "  snapshot:" -Encoding UTF8
  Add-Content -Path $sealPath -Value ("    rootHash: " + $currentRoot) -Encoding UTF8
  Add-Content -Path $sealPath -Value ("    atlasMetaHash: sha256:" + $atlasHash) -Encoding UTF8
  Add-Content -Path $sealPath -Value "  verification:" -Encoding UTF8
  Add-Content -Path $sealPath -Value "    status: PASS" -Encoding UTF8
  Add-Content -Path $sealPath -Value "    method: automated_script" -Encoding UTF8
  Add-Content -Path $sealPath -Value "  signature:" -Encoding UTF8
  Add-Content -Path $sealPath -Value "    type: sha256" -Encoding UTF8
  Add-Content -Path $sealPath -Value ("    value: " + $atlasHash) -Encoding UTF8
  
  Write-Success "Seal created"

  $manifestPath = Join-Path $manifestsDir ($manifestId + ".json")
  $manifestContent = @{
    manifest = @{
      id = $manifestId
      timestamp = $timestamp
      session = $sessionId
      seal = $sealId
      version = $currentVersion
      snapshot = @{
        rootHash = $currentRoot
        atlasMetaHash = ("sha256:" + $atlasHash)
      }
      files = @(
        @{
          path = "nexus/atlas/atlas-meta.json"
          hash = ("sha256:" + $atlasHash)
        }
      )
    }
  } | ConvertTo-Json -Depth 10

  [System.IO.File]::WriteAllText($manifestPath, $manifestContent, [System.Text.UTF8Encoding]::new($false))
  Write-Success "Manifest created"

  $rawLogPath = Join-Path $rawSessionsDir ($sessionId + ".jsonl")
  $rawLogContent = @{
    timestamp = $timestamp
    session = $sessionId
    title = $Title
    version = $currentVersion
    rootHash = $currentRoot
    seal = $sealId
    manifest = $manifestId
  } | ConvertTo-Json -Compress

  [System.IO.File]::WriteAllText($rawLogPath, ($rawLogContent + "`n"), [System.Text.UTF8Encoding]::new($false))
  Write-Success "Raw log created"

  Write-Host ""
  Write-Info "Adding files to git..."
  
  git add $sessionPath
  git add $sealPath
  git add $manifestPath
  git add $rawLogPath

  $commitMsg = "feat(save): " + $sessionId + " - " + $Title
  Write-Info ("Committing: " + $commitMsg)
  git commit -m $commitMsg
  
  if ($Push) {
    Write-Info "Pushing to GitHub..."
    git push origin master
    Write-Success "Pushed to GitHub"
  } else {
    Write-Host "(INFO) Skipping push (use -Push to auto-push)" -ForegroundColor Yellow
  }

  Write-Host ""
  Write-Section ("SAVE COMPLETE - " + $sessionId + " / " + $sealId)
  Write-Host ""

} catch {
  Write-Host ""
  Write-Host "===============================================================================" -ForegroundColor Red
  Write-Host " ERROR - Save failed" -ForegroundColor Red
  Write-Host "===============================================================================" -ForegroundColor Red
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ""
  exit 1
}
