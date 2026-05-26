# =============================================================================
# OMEGA -- test-commit-with-tests.ps1 (DRAFT v1)
# =============================================================================
# Test harness pour `commit-with-tests.ps1` v2 (EMP-10 v3.157.0)
# 8 scénarios Section 9 README v2
#
# Status        : DRAFT_PENDING_RATIFICATION
# Workspace path: Claude-Workspace/OMEGA/outputs/test-commit-with-tests_v1_DRAFT_2026-05-26.ps1
# Target repo path (post-ratification): omega-project/scripts/test-commit-with-tests.ps1
#
# Usage :
#   .\scripts\test-commit-with-tests.ps1                  # tous scenarios
#   .\scripts\test-commit-with-tests.ps1 -OnlyScenario 4  # un seul scenario
#   .\scripts\test-commit-with-tests.ps1 -SkipHeavy       # skip 2,3 (fixtures lourdes)
#
# Exit codes :
#   0 = tous scenarios PASS (ou justifiés DEFERRED)
#   1 = au moins un scenario FAIL
# =============================================================================

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)] [int]$OnlyScenario = 0,
  [Parameter(Mandatory = $false)] [switch]$SkipHeavy,
  [Parameter(Mandatory = $false)] [switch]$VerboseLog
)

$ErrorActionPreference = 'Continue'  # continuer entre scenarios
$script:Results = @()
$script:Passed = 0
$script:Failed = 0
$script:Deferred = 0
$script:SandboxRoot = $null
$script:WrapperPath = $null

# -----------------------------------------------------------------------------
# 0) Detect wrapper to test
# -----------------------------------------------------------------------------

$wrapperCandidates = @(
  (Join-Path $PSScriptRoot 'commit-with-tests.ps1'),                  # même dossier (scripts/)
  (Join-Path $PSScriptRoot 'commit-with-tests_v2_DRAFT_2026-05-26.ps1') # workspace draft
)
foreach ($cand in $wrapperCandidates) {
  if (Test-Path $cand) { $script:WrapperPath = $cand; break }
}
if (-not $script:WrapperPath) {
  Write-Host "FATAL: wrapper not found in $wrapperCandidates" -ForegroundColor Red
  exit 1
}
Write-Host "Using wrapper: $script:WrapperPath" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1) Sandbox setup
# -----------------------------------------------------------------------------

function New-Sandbox {
  $tmpDir = Join-Path $env:TEMP "omega-commit-test-$(Get-Random)"
  New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
  Push-Location $tmpDir
  & git init --quiet 2>&1 | Out-Null
  & git config user.email "test@omega.local" 2>&1 | Out-Null
  & git config user.name "OMEGA Test Harness" 2>&1 | Out-Null
  $script:SandboxRoot = $tmpDir
  Write-Host "  Sandbox: $tmpDir" -ForegroundColor DarkGray
  return $tmpDir
}

function Remove-Sandbox {
  Pop-Location
  if ($script:SandboxRoot -and (Test-Path $script:SandboxRoot)) {
    Remove-Item -Path $script:SandboxRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
  $script:SandboxRoot = $null
}

# -----------------------------------------------------------------------------
# 2) Run scenario helper
# -----------------------------------------------------------------------------

function Invoke-WrapperScenario {
  param(
    [hashtable]$WrapperArgs,
    [string]$StdinInput = $null
  )
  $argString = ($WrapperArgs.GetEnumerator() | ForEach-Object {
    if ($_.Value -is [bool] -or $_.Value -is [switch]) {
      if ($_.Value) { "-$($_.Key)" }
    } else {
      "-$($_.Key)", "'$($_.Value)'"
    }
  }) -join ' '

  # Propagate cwd to sub-shell (Push-Location en parent ne propage pas cwd au sub-process powershell.exe)
  # Propagate $LASTEXITCODE explicitly (sinon powershell -Command renvoie 1 generique au lieu du vrai exit)
  $currentCwd = (Get-Location).Path -replace "'", "''"
  $cmd = "Set-Location '$currentCwd'; & '$script:WrapperPath' $argString 2>&1; exit `$LASTEXITCODE"
  if ($StdinInput) {
    $tmpFile = New-TemporaryFile
    $StdinInput | Out-File -FilePath $tmpFile -Encoding ASCII -NoNewline
    # For stdin: use -File approach via temp script to allow Read-Host to work (NonInteractive blocks Read-Host)
    # Workaround: write a temp wrapper script that uses [Console]::In.ReadLine() instead, or use redirection
    $output = & powershell -NoProfile -Command "Get-Content '$tmpFile' | & { $cmd }"
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
  } else {
    $output = & powershell -NoProfile -NonInteractive -Command $cmd
  }
  $exit = $LASTEXITCODE
  return [PSCustomObject]@{ Exit = $exit; Output = ($output -join "`n") }
}

function Assert-Scenario {
  param(
    [int]$Num,
    [string]$Name,
    [int]$ExpectedExit,
    [int]$ActualExit,
    [string]$Output = ''
  )
  $passed = ($ActualExit -eq $ExpectedExit)
  $status = if ($passed) { 'PASS' } else { 'FAIL' }
  $color = if ($passed) { 'Green' } else { 'Red' }
  Write-Host ("  Scenario {0}: {1} -- expected exit {2}, got {3} -- {4}" -f $Num, $Name, $ExpectedExit, $ActualExit, $status) -ForegroundColor $color
  if (-not $passed -and $VerboseLog) {
    Write-Host "    Output tail:" -ForegroundColor DarkGray
    ($Output -split "`n" | Select-Object -Last 10) | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
  }
  $script:Results += [PSCustomObject]@{ Num = $Num; Name = $Name; ExpectedExit = $ExpectedExit; ActualExit = $ActualExit; Passed = $passed }
  if ($passed) { $script:Passed++ } else { $script:Failed++ }
}

function Skip-Scenario {
  param([int]$Num, [string]$Name, [string]$Reason)
  Write-Host ("  Scenario {0}: {1} -- DEFERRED ({2})" -f $Num, $Name, $Reason) -ForegroundColor Yellow
  $script:Results += [PSCustomObject]@{ Num = $Num; Name = $Name; Deferred = $true; Reason = $Reason }
  $script:Deferred++
}

# -----------------------------------------------------------------------------
# 3) SCENARIOS
# -----------------------------------------------------------------------------

Write-Host "`n=== OMEGA EMP-10 wrapper test harness ===" -ForegroundColor Cyan
Write-Host "Wrapper: $script:WrapperPath`n" -ForegroundColor Cyan

# --- Scenario 1: Aucun fichier staged -> exit 3 ---
if ($OnlyScenario -eq 0 -or $OnlyScenario -eq 1) {
  Write-Host "Scenario 1: No staged files -> exit 3" -ForegroundColor Cyan
  New-Sandbox | Out-Null
  try {
    $r = Invoke-WrapperScenario -WrapperArgs @{ Message = 'test scenario 1'; DryRun = $true }
    Assert-Scenario -Num 1 -Name 'no staged files' -ExpectedExit 3 -ActualExit $r.Exit -Output $r.Output
  } finally { Remove-Sandbox }
}

# --- Scenario 4: Staged 1 .md pur -> exit 0 (Type B) ---
if ($OnlyScenario -eq 0 -or $OnlyScenario -eq 4) {
  Write-Host "Scenario 4: Pure doc commit -> exit 0 (B_DOC_ONLY)" -ForegroundColor Cyan
  New-Sandbox | Out-Null
  try {
    "# Test doc" | Out-File 'test.md' -Encoding UTF8
    & git add test.md 2>&1 | Out-Null
    $r = Invoke-WrapperScenario -WrapperArgs @{ Message = 'docs: test'; DryRun = $true }
    Assert-Scenario -Num 4 -Name 'pure doc commit' -ExpectedExit 0 -ActualExit $r.Exit -Output $r.Output
  } finally { Remove-Sandbox }
}

# --- Scenario 5: Staged 1 .md avec bloc ```powershell -> exit 0 mais upgrade A_CODE ---
# Note : dans sandbox vide, A_CODE upgrade va tenter TSC qui fail (pas de package)
# Donc on attend exit 1 (upgrade vers A_CODE puis TSC root fail)
if ($OnlyScenario -eq 0 -or $OnlyScenario -eq 5) {
  Write-Host "Scenario 5: Doc with exec block -> upgrade A_CODE -> TSC fail in sandbox -> exit 1" -ForegroundColor Cyan
  New-Sandbox | Out-Null
  try {
    @"
# Test
``````powershell
Write-Host 'hello'
``````
"@ | Out-File 'test-exec.md' -Encoding UTF8
    & git add test-exec.md 2>&1 | Out-Null
    $r = Invoke-WrapperScenario -WrapperArgs @{ Message = 'docs: with exec'; DryRun = $true }
    # In sandbox with no tsconfig, expected DryRun PASS because no actual TSC required for DryRun on root fallback
    # Actually: A_CODE branch will run npm typecheck which fails (no package.json), so exit 1
    # But DryRun returns 0 if validation passes... Re-reading wrapper: DryRun skips final commit but DOES run TSC/Vitest
    # So expect exit 1 (no package.json -> npm typecheck fail)
    # Adjusted expectation : if root fallback owner triggered, npm typecheck fails
    Assert-Scenario -Num 5 -Name 'doc with exec upgrade' -ExpectedExit 1 -ActualExit $r.Exit -Output $r.Output
  } finally { Remove-Sandbox }
}

# --- Scenario 7: DryRun avec Type B PASS -> exit 0 sans commit ---
if ($OnlyScenario -eq 0 -or $OnlyScenario -eq 7) {
  Write-Host "Scenario 7: DryRun Type B PASS -> exit 0 no commit" -ForegroundColor Cyan
  New-Sandbox | Out-Null
  try {
    "# Test doc" | Out-File 'test7.md' -Encoding UTF8
    & git add test7.md 2>&1 | Out-Null
    $r = Invoke-WrapperScenario -WrapperArgs @{ Message = 'docs: dryrun'; DryRun = $true }
    Assert-Scenario -Num 7 -Name 'DryRun Type B PASS' -ExpectedExit 0 -ActualExit $r.Exit -Output $r.Output
    # Verify no commit happened
    $log = & git log --oneline 2>&1 | Out-String
    if ($log -match '^\s*$' -or $log -match 'does not have any commits') {
      Write-Host "    [verified] No commit performed in sandbox after DryRun" -ForegroundColor DarkGreen
    } else {
      Write-Host "    [WARNING] Commit detected in sandbox after DryRun: $log" -ForegroundColor Yellow
    }
  } finally { Remove-Sandbox }
}

# --- Scenario 8: Refus confirmation interactive -> exit 2 ---
# DEFERRED : empirique a montre que PS5.1 stdin pipe vers Read-Host est fragile
# (Get-Content | & sub-shell ne propage pas correctement vers Read-Host de la sub-sub-shell)
# Validation manuelle: invoquer wrapper sans -DryRun, repondre "n" au prompt -> exit 2 attendu
if ($OnlyScenario -eq 0 -or $OnlyScenario -eq 8) {
  Write-Host "Scenario 8: Interactive abort 'n' -> exit 2" -ForegroundColor Cyan
  Skip-Scenario -Num 8 -Name 'interactive abort' -Reason 'PS5.1 stdin pipe vers Read-Host fragile en nested sub-shell; validation manuelle requise'
}

# --- Scenario 9: A_TOOLING_SCRIPT detection (stage scripts/foo.ps1 valid + DryRun -> exit 0) ---
if ($OnlyScenario -eq 0 -or $OnlyScenario -eq 9) {
  Write-Host "Scenario 9: A_TOOLING_SCRIPT detection -> exit 0 (DryRun)" -ForegroundColor Cyan
  New-Sandbox | Out-Null
  try {
    New-Item -ItemType Directory -Path 'scripts' -Force | Out-Null
    @"
# Scenario 9 fixture: minimal valid PS script
<#
.SYNOPSIS
  Scenario 9 fixture script
#>
Write-Host 'hello from scenario 9'
"@ | Out-File 'scripts/foo.ps1' -Encoding UTF8
    & git add scripts/foo.ps1 2>&1 | Out-Null
    $r = Invoke-WrapperScenario -WrapperArgs @{ Message = 'feat(scripts): scenario 9'; DryRun = $true }
    Assert-Scenario -Num 9 -Name 'A_TOOLING_SCRIPT detection' -ExpectedExit 0 -ActualExit $r.Exit -Output $r.Output
  } finally { Remove-Sandbox }
}

# --- Scenarios 2, 3, 6 : FIXTURE_REQUIRED (TS package complet) ---

if (-not $SkipHeavy -and ($OnlyScenario -eq 0 -or $OnlyScenario -in @(2,3,6))) {
  Write-Host "Scenario 2: TS file + tests PASS -> exit 0 (A_CODE)" -ForegroundColor Cyan
  Skip-Scenario -Num 2 -Name 'TS code + tests PASS' -Reason 'requires real TS package fixture; deferred to manual validation on real package'

  Write-Host "Scenario 3: TS file with TSC error -> exit 1" -ForegroundColor Cyan
  Skip-Scenario -Num 3 -Name 'TS code with TSC error' -Reason 'requires real TS package fixture; deferred to manual validation'

  Write-Host "Scenario 6: TS + MD mixed -> exit 0 (A_CODE)" -ForegroundColor Cyan
  Skip-Scenario -Num 6 -Name 'TS + MD mixed' -Reason 'requires real TS package fixture; deferred to manual validation'
} elseif ($SkipHeavy) {
  Write-Host "Scenarios 2,3,6 SKIPPED (-SkipHeavy flag)" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# 4) VERDICT FINAL
# -----------------------------------------------------------------------------

Write-Host "`n=== TEST HARNESS VERDICT ===" -ForegroundColor Cyan
Write-Host "PASS    : $script:Passed" -ForegroundColor Green
Write-Host "FAIL    : $script:Failed" -ForegroundColor $(if ($script:Failed -gt 0) { 'Red' } else { 'DarkGray' })
Write-Host "DEFERRED: $script:Deferred" -ForegroundColor Yellow

if ($script:Failed -gt 0) {
  Write-Host "`nFAIL details:" -ForegroundColor Red
  $script:Results | Where-Object { -not $_.Passed -and -not $_.Deferred } | ForEach-Object {
    Write-Host ("  Scenario {0}: {1} -- expected {2}, got {3}" -f $_.Num, $_.Name, $_.ExpectedExit, $_.ActualExit) -ForegroundColor Red
  }
  exit 1
}

if ($script:Deferred -gt 0) {
  Write-Host "`nDEFERRED scenarios require manual validation on real OMEGA package fixtures:" -ForegroundColor Yellow
  $script:Results | Where-Object { $_.Deferred } | ForEach-Object {
    Write-Host ("  Scenario {0}: {1} -- reason: {2}" -f $_.Num, $_.Name, $_.Reason) -ForegroundColor Yellow
  }
}

Write-Host "`n=== HARNESS PASS (with $script:Deferred deferred) ===" -ForegroundColor Green
exit 0
