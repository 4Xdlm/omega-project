# =============================================================================
# OMEGA -- commit-with-tests.ps1 (DRAFT v2)
# =============================================================================
# Wrapper de commit obligatoire (EMP-10 TEST_BEFORE_COMMIT_STRICT)
# Doctrine OMEGA v3.157.0 -- Sprint S11 sealed 2026-05-26
#
# Status        : DRAFT_v2_PENDING_ARCHITECT_RATIFICATION
# Author        : Claude (Cowork) post-Tribunal 3/3 IA + Arbitrage ChatGPT
# Workspace path: Claude-Workspace/OMEGA/outputs/commit-with-tests_v2_DRAFT_2026-05-26.ps1
# Target repo path (post-ratification): omega-project/scripts/commit-with-tests.ps1
#
# Mandat EMP-10 v2 (ChatGPT-correct) :
#   - Type A_CODE          : TSC ciblé PAR PACKAGE + Vitest ciblé PAR PACKAGE
#   - Type A_TOOLING_SCRIPT: scripts/*.ps1 → parsing PS + usage + scénarios test
#   - Type B_DOC_ONLY      : scope diff vérifié, sans TSC/Vitest
#   - Wrapper OBLIGATOIRE non optionnel
#
# Changes v1 → v2 (post arbitrage Tribunal Gemini+ChatGPT) :
#   - F-DRAFT-1 RESOLVED : détection package owner + TSC ciblé `-p <package>`
#   - F-DRAFT-3 ENHANCED : flag CLI `-NoTestsRationale` ajouté + check JSON package
#   - NEW class A_TOOLING_SCRIPT : voie doctrinale propre pour scripts/*.ps1
#     (résout Catch-22 bootstrap sans exemption signée)
#
# Usage :
#   .\scripts\commit-with-tests.ps1 -Message "feat(pkg): description"
#   .\scripts\commit-with-tests.ps1 -Message "chore: doc" -DryRun
#   .\scripts\commit-with-tests.ps1 -Message "infra" -NoTestsRationale "PS wrapper"
#
# Exit codes :
#   0 = commit autorisé et exécuté (ou dry-run PASS)
#   1 = FAIL bloquant : type detection / scope / TSC / Vitest / commit echec
#   2 = ABORT par utilisateur
#   3 = ERREUR pre-flight
# =============================================================================

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]  [string]$Message,
  [Parameter(Mandatory = $false)] [switch]$DryRun,
  [Parameter(Mandatory = $false)] [switch]$Force,
  [Parameter(Mandatory = $false)] [switch]$VerboseLog,
  [Parameter(Mandatory = $false)] [string]$NoTestsRationale = ''
)

$ErrorActionPreference = 'Stop'
$script:LogLines = @()
$script:RepoRoot = $null
$script:CommitClass = $null    # 'A_CODE' | 'A_TOOLING_SCRIPT' | 'B_DOC_ONLY'
$script:StagedFiles = @()
$script:PackageOwners = @()    # array of package root paths to validate (Type A_CODE)
$script:ToolingScripts = @()   # array of scripts/*.ps1 to validate (Type A_TOOLING_SCRIPT)

# -----------------------------------------------------------------------------
# 0) Helpers
# -----------------------------------------------------------------------------

function Write-Log {
  param([string]$Level, [string]$Text)
  $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ'), $Level, $Text
  $script:LogLines += $line
  switch ($Level) {
    'ERROR'   { Write-Host $line -ForegroundColor Red }
    'WARN'    { Write-Host $line -ForegroundColor Yellow }
    'SUCCESS' { Write-Host $line -ForegroundColor Green }
    'INFO'    { Write-Host $line -ForegroundColor Cyan }
    default   { Write-Host $line }
  }
}

function Save-LogSSOT {
  if (-not $script:RepoRoot) { return }
  $logDir = Join-Path $script:RepoRoot '.git\omega-commit-log'
  if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
  $ts = Get-Date -Format 'yyyy-MM-ddTHHmmssZ'
  $logFile = Join-Path $logDir "commit-with-tests_$ts.log"
  $script:LogLines | Out-File -FilePath $logFile -Encoding UTF8
  Write-Log 'INFO' "Log SSOT saved: $logFile"
}

function Exit-WithLog {
  param([int]$Code, [string]$Reason)
  Write-Log 'INFO' "Exit code: $Code | Reason: $Reason"
  Save-LogSSOT
  exit $Code
}

# -----------------------------------------------------------------------------
# 1) Resolve package owner for a staged file (walk up to find package.json)
# -----------------------------------------------------------------------------

function Resolve-PackageOwner {
  param([string]$RelPath)
  # Heuristique OMEGA : packages/<x>/, apps/<x>/, gateway/<x>/, gateway/
  if ($RelPath -match '^(packages/[^/]+)/') { return $Matches[1] }
  if ($RelPath -match '^(apps/[^/]+)/')     { return $Matches[1] }
  if ($RelPath -match '^(gateway/[^/]+)/')  { return $Matches[1] }
  if ($RelPath -match '^gateway/[^/]+$')    { return 'gateway' }
  if ($RelPath -match '^scripts/.*\.ps1$')  { return $null }  # geré par A_TOOLING_SCRIPT
  # Fallback : walk up
  $dir = Split-Path $RelPath -Parent
  while ($dir -and $dir -ne '.' -and $dir -ne '/') {
    $pkgJson = Join-Path (Join-Path $script:RepoRoot $dir) 'package.json'
    if (Test-Path $pkgJson) { return $dir.Replace('\','/') }
    $dir = Split-Path $dir -Parent
  }
  return $null
}

# -----------------------------------------------------------------------------
# 2) PRE-FLIGHT
# -----------------------------------------------------------------------------

Write-Log 'INFO' '=== EMP-10 commit-with-tests.ps1 v2 DRAFT START ==='
Write-Log 'INFO' "Doctrine OMEGA v3.157.0 -- EMP-10 TEST_BEFORE_COMMIT_STRICT"
Write-Log 'INFO' "DryRun=$DryRun, Force=$Force, VerboseLog=$VerboseLog, NoTestsRationale='$NoTestsRationale'"

try {
  $script:RepoRoot = (git rev-parse --show-toplevel 2>&1 | Out-String).Trim()
  if (-not $script:RepoRoot -or $script:RepoRoot.StartsWith('fatal:')) {
    Write-Log 'ERROR' 'Not in a git repository'
    exit 3
  }
} catch {
  Write-Log 'ERROR' "git rev-parse failed: $_"
  exit 3
}

Write-Log 'INFO' "Repo root: $script:RepoRoot"
Set-Location $script:RepoRoot

$script:StagedFiles = @(git diff --cached --name-only 2>&1 | Where-Object { $_ -and $_ -notmatch '^fatal:' })
if ($script:StagedFiles.Count -eq 0) {
  Write-Log 'ERROR' 'No files staged. Use git add <files> before invoking wrapper.'
  Exit-WithLog 3 'No staged files'
}

Write-Log 'INFO' "Staged files count: $($script:StagedFiles.Count)"
$script:StagedFiles | ForEach-Object { Write-Log 'INFO' "  staged: $_" }

# -----------------------------------------------------------------------------
# 3) DETECTION CLASSE COMMIT (3 classes EMP-10 v2)
# -----------------------------------------------------------------------------

$docOnlyPatterns = @('\.md$', '\.txt$', '\.json5$', '/LICENSE$', '^LICENSE$', '^\.gitignore$', '/\.gitignore$')
$toolingScriptPattern = '^scripts/.*\.ps1$'
$codePatterns = @(
  '\.tsx?$', '\.[cm]?js$',
  '/package\.json$', '^package\.json$',
  '/tsconfig.*\.json$', '^tsconfig.*\.json$',
  '\.config\.[jt]s$'
)

$codeFiles = @()
$toolingFiles = @()
$docFiles = @()
$unknownFiles = @()

foreach ($f in $script:StagedFiles) {
  if ($f -match $toolingScriptPattern) {
    $toolingFiles += $f
    continue
  }
  $matchedCode = $false
  foreach ($p in $codePatterns) {
    if ($f -match $p) { $matchedCode = $true; break }
  }
  if ($matchedCode) { $codeFiles += $f; continue }

  $matchedDoc = $false
  foreach ($p in $docOnlyPatterns) {
    if ($f -match $p) { $matchedDoc = $true; break }
  }
  if ($matchedDoc) { $docFiles += $f; continue }

  $unknownFiles += $f
}

Write-Log 'INFO' "Classification: code=$($codeFiles.Count), tooling=$($toolingFiles.Count), doc=$($docFiles.Count), unknown=$($unknownFiles.Count)"

if ($unknownFiles.Count -gt 0) {
  Write-Log 'WARN' 'Unknown file types treated as A_CODE (conservative escalation):'
  $unknownFiles | ForEach-Object { Write-Log 'WARN' "  unknown -> code: $_" }
  $codeFiles += $unknownFiles
}

# EMP-10 sec3.2 heuristic : doc with exec blocks -> A_CODE upgrade
$execHeuristicMatched = @()
foreach ($f in $docFiles) {
  $fullPath = Join-Path $script:RepoRoot $f
  if (Test-Path $fullPath) {
    $content = Get-Content $fullPath -Raw -ErrorAction SilentlyContinue
    if ($content -match '(?ms)```(powershell|pwsh|bash|sh|cmd)') {
      $execHeuristicMatched += $f
    }
  }
}
if ($execHeuristicMatched.Count -gt 0) {
  Write-Log 'WARN' 'EMP-10 sec3.2 exception triggered: doc-only with exec command blocks:'
  $execHeuristicMatched | ForEach-Object { Write-Log 'WARN' "  upgrade doc -> code: $_" }
  $codeFiles += $execHeuristicMatched
  $docFiles = @($docFiles | Where-Object { $execHeuristicMatched -notcontains $_ })
}

# Determine PRIMARY commit class (priorité : A_CODE > A_TOOLING_SCRIPT > B_DOC_ONLY)
if ($codeFiles.Count -gt 0) {
  $script:CommitClass = 'A_CODE'
  Write-Log 'INFO' "=> Primary class: A_CODE (per-package TSC + Vitest required)"
} elseif ($toolingFiles.Count -gt 0) {
  $script:CommitClass = 'A_TOOLING_SCRIPT'
  Write-Log 'INFO' "=> Primary class: A_TOOLING_SCRIPT (PS parsing + usage + scenarios)"
} else {
  $script:CommitClass = 'B_DOC_ONLY'
  Write-Log 'INFO' "=> Primary class: B_DOC_ONLY (no TSC/Vitest required)"
}

# Mixed commit : if code + tooling both present, A_CODE precedence (more strict)
# but tooling files still need their own validation
if ($codeFiles.Count -gt 0 -and $toolingFiles.Count -gt 0) {
  Write-Log 'WARN' 'Mixed commit detected (code + tooling). Both validations required.'
}

# -----------------------------------------------------------------------------
# 4) RESOLVE PACKAGE OWNERS for A_CODE files
# -----------------------------------------------------------------------------

if ($script:CommitClass -eq 'A_CODE' -or ($codeFiles.Count -gt 0)) {
  $ownerSet = @{}
  foreach ($f in $codeFiles) {
    $owner = Resolve-PackageOwner -RelPath $f
    if ($owner) {
      $ownerSet[$owner] = $true
    } else {
      Write-Log 'WARN' "Cannot resolve package owner for: $f -- adding root as fallback owner"
      $ownerSet['__root__'] = $true
    }
  }
  $script:PackageOwners = @($ownerSet.Keys)
  Write-Log 'INFO' "Resolved package owners ($($script:PackageOwners.Count)):"
  $script:PackageOwners | ForEach-Object { Write-Log 'INFO' "  owner: $_" }
}

# -----------------------------------------------------------------------------
# 5) BRANCH A_CODE : TSC ciblé + Vitest ciblé par package
# -----------------------------------------------------------------------------

if ($codeFiles.Count -gt 0) {
  Write-Log 'INFO' '=== EMP-10 sec3.2 Type A_CODE -- per-package TSC + Vitest ==='

  foreach ($pkg in $script:PackageOwners) {
    if ($pkg -eq '__root__') {
      Write-Log 'WARN' 'Root fallback: running root npm typecheck (broad scope WARNING)'
      $tscOutput = & npm run typecheck 2>&1 | Out-String
      $tscExit = $LASTEXITCODE
    } else {
      $pkgPath = Join-Path $script:RepoRoot $pkg
      $pkgTsconfig = Join-Path $pkgPath 'tsconfig.json'
      if (-not (Test-Path $pkgTsconfig)) {
        Write-Log 'WARN' "Package '$pkg' has no tsconfig.json -- skipping TSC for this package"
        continue
      }
      Write-Log 'INFO' "TSC ciblé: npx tsc --noEmit --pretty false -p $pkg/tsconfig.json"
      $tscOutput = & npx tsc --noEmit --pretty false -p $pkgTsconfig 2>&1 | Out-String
      $tscExit = $LASTEXITCODE
    }

    Write-Log 'INFO' "  TSC exit: $tscExit"
    if ($VerboseLog) {
      $tscOutput -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Log 'INFO' "    TSC: $_" } }
    }

    if ($tscExit -ne 0) {
      Write-Log 'ERROR' "TSC FAILED for package '$pkg'. Last 30 lines:"
      ($tscOutput -split "`n" | Select-Object -Last 30) | ForEach-Object { Write-Log 'ERROR' $_ }
      Write-Log 'ERROR' 'EMP-10 violation: TSC ciblé must PASS before commit.'
      Exit-WithLog 1 "TSC FAIL pkg=$pkg exit=$tscExit"
    }
    Write-Log 'SUCCESS' "TSC PASS for package '$pkg'"

    # Vitest ciblé par package
    if ($pkg -eq '__root__') {
      Write-Log 'WARN' 'Root fallback: skipping Vitest (rely on package-level tests)'
      continue
    }
    $pkgJson = Join-Path $pkgPath 'package.json'
    if (-not (Test-Path $pkgJson)) {
      Write-Log 'WARN' "Package '$pkg' has no package.json -- skipping Vitest"
      continue
    }
    $pkgContent = Get-Content $pkgJson -Raw | ConvertFrom-Json
    $hasTestScript = $false
    if ($pkgContent.scripts -and $pkgContent.scripts.PSObject.Properties.Name -contains 'test') {
      $hasTestScript = $true
    }

    if (-not $hasTestScript) {
      $rationaleJson = $null
      if ($pkgContent.PSObject.Properties.Name -contains 'omega:no-tests-rationale') {
        $rationaleJson = $pkgContent.'omega:no-tests-rationale'
      }
      $rationaleEffective = if ($rationaleJson) { $rationaleJson } else { $NoTestsRationale }
      if ($rationaleEffective) {
        Write-Log 'WARN' "Package '$pkg' has no test script. NO_TESTS_DECLARED accepted with rationale: $rationaleEffective"
        continue
      }
      Write-Log 'ERROR' "EMP-10 sec3.4 violation: package '$pkg' has no test script AND no rationale."
      Write-Log 'ERROR' "Provide -NoTestsRationale '<reason>' OR add 'omega:no-tests-rationale' to $pkg/package.json"
      Exit-WithLog 1 "Vitest absent pkg=$pkg no rationale"
    }

    Write-Log 'INFO' "Vitest ciblé: cd $pkg && npm test"
    Push-Location $pkgPath
    try {
      $vitestOutput = & npm test 2>&1 | Out-String
      $vitestExit = $LASTEXITCODE
    } finally {
      Pop-Location
    }
    Write-Log 'INFO' "  Vitest exit: $vitestExit"
    if ($VerboseLog) {
      $vitestOutput -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Log 'INFO' "    Vitest: $_" } }
    }

    if ($vitestExit -ne 0) {
      if ($vitestOutput -match 'No test files found') {
        $rationaleEffective = if ($NoTestsRationale) { $NoTestsRationale } else { $null }
        if ($rationaleEffective) {
          Write-Log 'WARN' "Package '$pkg' Vitest = no test files found. NO_TESTS_DECLARED accepted with -NoTestsRationale: $rationaleEffective"
          continue
        }
        Write-Log 'ERROR' "EMP-10 sec3.4 violation: pkg '$pkg' has test script but no test files AND no rationale."
        Exit-WithLog 1 "Vitest no files pkg=$pkg no rationale"
      }
      Write-Log 'ERROR' "Vitest FAILED for package '$pkg'. Last 30 lines:"
      ($vitestOutput -split "`n" | Select-Object -Last 30) | ForEach-Object { Write-Log 'ERROR' $_ }
      Exit-WithLog 1 "Vitest FAIL pkg=$pkg exit=$vitestExit"
    }
    Write-Log 'SUCCESS' "Vitest PASS for package '$pkg'"
  }
}

# -----------------------------------------------------------------------------
# 6) BRANCH A_TOOLING_SCRIPT : parsing PS + usage + scénarios
# -----------------------------------------------------------------------------

if ($toolingFiles.Count -gt 0) {
  Write-Log 'INFO' '=== EMP-10 v2 Type A_TOOLING_SCRIPT -- PS parsing + usage + scenarios ==='

  foreach ($scriptFile in $toolingFiles) {
    $fullPath = Join-Path $script:RepoRoot $scriptFile
    if (-not (Test-Path $fullPath)) {
      Write-Log 'ERROR' "Tooling script '$scriptFile' not found on disk"
      Exit-WithLog 1 "Tooling script missing: $scriptFile"
    }

    # 6a) Parse PowerShell
    Write-Log 'INFO' "  Parsing: $scriptFile"
    $tokens = $null
    $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($fullPath, [ref]$tokens, [ref]$errors)
    if ($errors -and $errors.Count -gt 0) {
      Write-Log 'ERROR' "PS parsing FAILED for '$scriptFile':"
      $errors | ForEach-Object { Write-Log 'ERROR' "    parse: $($_.Message) at line $($_.Extent.StartLineNumber)" }
      Exit-WithLog 1 "PS parse FAIL: $scriptFile"
    }
    Write-Log 'SUCCESS' "  PS parsing PASS for '$scriptFile'"

    # 6b) Get-Help check (synopsis presence is a proxy for usage doc)
    try {
      $help = Get-Help $fullPath -ErrorAction SilentlyContinue
      if (-not $help -or -not $help.Synopsis -or $help.Synopsis -match '^\s*$') {
        Write-Log 'WARN' "  No synopsis in Get-Help for '$scriptFile' -- recommended to add comment-based help"
        # not blocking -- warning only
      } else {
        Write-Log 'SUCCESS' "  Get-Help synopsis present for '$scriptFile'"
      }
    } catch {
      Write-Log 'WARN' "  Get-Help check non-conclusive for '$scriptFile': $_"
    }

    # 6c) Test harness invocation (if exists and test-commit-with-tests.ps1 in same dir)
    $testHarness = Join-Path (Split-Path $fullPath -Parent) 'test-commit-with-tests.ps1'
    if ((Split-Path $scriptFile -Leaf) -eq 'commit-with-tests.ps1' -and (Test-Path $testHarness)) {
      Write-Log 'INFO' "  Test harness found: $testHarness -- running 8 scenarios"
      $harnessOutput = & $testHarness 2>&1 | Out-String
      $harnessExit = $LASTEXITCODE
      Write-Log 'INFO' "  Harness exit: $harnessExit"
      if ($harnessExit -ne 0) {
        Write-Log 'ERROR' "Test harness FAILED for '$scriptFile'. Output:"
        ($harnessOutput -split "`n" | Select-Object -Last 30) | ForEach-Object { Write-Log 'ERROR' $_ }
        Exit-WithLog 1 "Test harness FAIL: $scriptFile"
      }
      Write-Log 'SUCCESS' "  Test harness PASS (8 scenarios) for '$scriptFile'"
    } else {
      Write-Log 'INFO' "  No matching test harness for '$scriptFile' -- scenarios deferred"
    }
  }
}

# -----------------------------------------------------------------------------
# 7) BRANCH B_DOC_ONLY (déjà filtré : execHeuristic a déjà migré les exec docs)
# -----------------------------------------------------------------------------

if ($codeFiles.Count -eq 0 -and $toolingFiles.Count -eq 0 -and $docFiles.Count -gt 0) {
  Write-Log 'INFO' '=== EMP-10 sec3.2 Type B_DOC_ONLY -- pure doc commit (no TSC/Vitest) ==='
  Write-Log 'SUCCESS' "Doc files validated: $($docFiles.Count) (no exec blocks detected)"
}

# -----------------------------------------------------------------------------
# 8) FINAL : commit ou dry-run
# -----------------------------------------------------------------------------

if ($DryRun) {
  Write-Log 'SUCCESS' '=== DRY-RUN COMPLETE -- commit NOT executed ==='
  Write-Log 'INFO' "Would commit class=$script:CommitClass message='$Message'"
  Exit-WithLog 0 'DryRun PASS'
}

if (-not $Force) {
  Write-Host ''
  Write-Host "=== COMMIT CONFIRMATION ===" -ForegroundColor Cyan
  Write-Host "Class    : $script:CommitClass" -ForegroundColor Cyan
  Write-Host "Files    : $($script:StagedFiles.Count)" -ForegroundColor Cyan
  Write-Host "Code pkgs: $($script:PackageOwners.Count)" -ForegroundColor Cyan
  Write-Host "Tooling  : $($toolingFiles.Count)" -ForegroundColor Cyan
  Write-Host "Docs     : $($docFiles.Count)" -ForegroundColor Cyan
  Write-Host "Message  : $Message" -ForegroundColor Cyan
  Write-Host ''
  $reply = Read-Host 'Proceed with git commit? (y/N)'
  if ($reply -notmatch '^[Yy]') {
    Write-Log 'WARN' 'User aborted at final confirmation.'
    Exit-WithLog 2 'User abort'
  }
}

Write-Log 'INFO' 'Executing: git commit -m "<message>"'
$commitOutput = & git commit -m $Message 2>&1 | Out-String
$commitExit = $LASTEXITCODE
Write-Log 'INFO' "git commit exit: $commitExit"
$commitOutput -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Log 'INFO' "  git: $_" } }

if ($commitExit -ne 0) {
  Write-Log 'ERROR' 'git commit FAILED.'
  Exit-WithLog 1 "git commit failed exit=$commitExit"
}

$newHead = (git log -1 --oneline 2>&1 | Out-String).Trim()
Write-Log 'SUCCESS' "Commit OK. New HEAD: $newHead"
Write-Log 'SUCCESS' "=== EMP-10 commit-with-tests.ps1 v2 END ==="
Exit-WithLog 0 'Commit successful'
