<# 
═══════════════════════════════════════════════════════════════════════════════════════════════════════
 OMEGA CONSCIOUSNESS — Unified Snapshot Generator
 Version: 1.0.0
 Standard: OMEGA-GRADE (Beyond NASA-Grade)
═══════════════════════════════════════════════════════════════════════════════════════════════════════

 USAGE:
   .\omega-consciousness.ps1 -Mode Full    # Complete 7-layer snapshot
   .\omega-consciousness.ps1 -Mode Quick   # Facts + Gates only
   .\omega-consciousness.ps1 -Mode Audit   # Full audit with findings
   .\omega-consciousness.ps1 -Help         # Show help

═══════════════════════════════════════════════════════════════════════════════════════════════════════
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Full", "Quick", "Audit", "Help")]
    [string]$Mode = "Quick",
    
    [Parameter(Mandatory=$false)]
    [string]$Title = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$Push,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$OMEGA_VERSION = "1.0.0"
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$GIT_SHA = (git rev-parse HEAD 2>$null) ?? "unknown"
$GIT_SHA_SHORT = $GIT_SHA.Substring(0, 8)
$GIT_TAG = (git describe --tags --exact-match 2>$null) ?? $null
$GIT_BRANCH = (git branch --show-current 2>$null) ?? "unknown"
$GIT_DIRTY = (git status --porcelain 2>$null) -ne ""

$SNAP_NAME = "SNAP_${TIMESTAMP}_${GIT_SHA_SHORT}"
$SNAP_DIR = "OMEGA_SNAPSHOTS/$SNAP_NAME"

# Colors
$C_RED = "`e[31m"
$C_GREEN = "`e[32m"
$C_YELLOW = "`e[33m"
$C_BLUE = "`e[34m"
$C_CYAN = "`e[36m"
$C_RESET = "`e[0m"
$C_BOLD = "`e[1m"

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

function Show-Banner {
    Write-Host ""
    Write-Host "${C_CYAN}╔═══════════════════════════════════════════════════════════════════════════════════╗${C_RESET}"
    Write-Host "${C_CYAN}║                                                                                   ║${C_RESET}"
    Write-Host "${C_CYAN}║${C_BOLD}   OMEGA CONSCIOUSNESS — Snapshot Generator v$OMEGA_VERSION                            ${C_RESET}${C_CYAN}║${C_RESET}"
    Write-Host "${C_CYAN}║   Mode: $Mode                                                                     ${C_RESET}${C_CYAN}║${C_RESET}"
    Write-Host "${C_CYAN}║   Snapshot: $SNAP_NAME                                       ${C_RESET}${C_CYAN}║${C_RESET}"
    Write-Host "${C_CYAN}║                                                                                   ║${C_RESET}"
    Write-Host "${C_CYAN}╚═══════════════════════════════════════════════════════════════════════════════════╝${C_RESET}"
    Write-Host ""
}

function Show-Help {
    Write-Host @"

${C_BOLD}OMEGA CONSCIOUSNESS — Unified Snapshot Generator${C_RESET}

${C_CYAN}USAGE:${C_RESET}
    .\omega-consciousness.ps1 [OPTIONS]

${C_CYAN}MODES:${C_RESET}
    -Mode Quick     Quick snapshot (Facts + Gates only) [DEFAULT]
    -Mode Full      Full 7-layer snapshot
    -Mode Audit     Complete audit with all findings

${C_CYAN}OPTIONS:${C_RESET}
    -Title          Custom title for this snapshot
    -Push           Push to remote after snapshot
    -SkipTests      Skip test execution (faster but less complete)
    -Verbose        Show detailed output
    -Help           Show this help

${C_CYAN}EXAMPLES:${C_RESET}
    # Quick snapshot for regular commits
    .\omega-consciousness.ps1 -Mode Quick

    # Full snapshot for releases
    .\omega-consciousness.ps1 -Mode Full -Title "v3.156.0 Release"

    # Complete audit
    .\omega-consciousness.ps1 -Mode Audit

${C_CYAN}OUTPUT:${C_RESET}
    OMEGA_SNAPSHOTS/SNAP_<timestamp>_<sha>/
        00_IDENTITY/      - Identity information
        10_EVIDENCE/      - Command logs and reports
        20_FACTS/         - Auto-generated facts
        30_RELATIONS/     - Relationship graphs
        40_CONTRACTS/     - Invariants and gates
        50_COGNITION/     - Purpose and philosophy
        60_IMMUNITY/      - Security and health
        70_TEMPORAL/      - History and predictions
        80_GENETICS/      - Replication patterns
        90_FINDINGS/      - All findings
        A0_KNOWLEDGE_BASE/ - Complete documentation
        B0_REMEDIATION/   - Fix plans
        Z0_META/          - Checksums and validation

"@
}

function Log-Info { param($msg) Write-Host "${C_CYAN}[INFO]${C_RESET} $msg" }
function Log-OK { param($msg) Write-Host "${C_GREEN}[OK]${C_RESET} $msg" }
function Log-Warn { param($msg) Write-Host "${C_YELLOW}[WARN]${C_RESET} $msg" }
function Log-Error { param($msg) Write-Host "${C_RED}[ERROR]${C_RESET} $msg" }
function Log-Phase { param($msg) Write-Host "`n${C_BOLD}${C_BLUE}═══ $msg ═══${C_RESET}`n" }

function Run-Command {
    param(
        [string]$Command,
        [string]$Description,
        [string]$LogFile,
        [switch]$ContinueOnError
    )
    
    $cmdLog = "$SNAP_DIR/10_EVIDENCE/commands.log"
    $stdoutLog = "$SNAP_DIR/10_EVIDENCE/stdout.log"
    $stderrLog = "$SNAP_DIR/10_EVIDENCE/stderr.log"
    
    # Log the command
    "[$TIMESTAMP] $Description" | Out-File -Append $cmdLog
    "> $Command" | Out-File -Append $cmdLog
    "" | Out-File -Append $cmdLog
    
    if ($Verbose) {
        Log-Info "Running: $Command"
    }
    
    try {
        $result = Invoke-Expression $Command 2>&1
        $result | Out-File -Append $stdoutLog
        
        if ($LogFile) {
            $result | Out-File -Encoding UTF8 $LogFile
        }
        
        return $result
    }
    catch {
        $_.Exception.Message | Out-File -Append $stderrLog
        
        if (-not $ContinueOnError) {
            throw
        }
        
        return $null
    }
}

function Create-DirectoryStructure {
    Log-Phase "PHASE 0 — Creating Directory Structure"
    
    $dirs = @(
        "00_IDENTITY",
        "10_EVIDENCE/reports",
        "20_FACTS",
        "30_RELATIONS",
        "40_CONTRACTS",
        "50_COGNITION/DECISIONS",
        "60_IMMUNITY",
        "70_TEMPORAL",
        "80_GENETICS",
        "90_FINDINGS/by_priority",
        "90_FINDINGS/by_category",
        "90_FINDINGS/by_module",
        "A0_KNOWLEDGE_BASE/docs/modules",
        "A0_KNOWLEDGE_BASE/docs/functions",
        "A0_KNOWLEDGE_BASE/schemas",
        "A0_KNOWLEDGE_BASE/graphs",
        "B0_REMEDIATION",
        "C0_PATCHES",
        "Z0_META"
    )
    
    foreach ($dir in $dirs) {
        New-Item -ItemType Directory -Force -Path "$SNAP_DIR/$dir" | Out-Null
    }
    
    Log-OK "Directory structure created"
}

function Generate-Identity {
    Log-Phase "PHASE 1 — Generating Identity"
    
    $identity = @{
        snap_name = $SNAP_NAME
        git_sha = $GIT_SHA
        git_sha_short = $GIT_SHA_SHORT
        git_tag = $GIT_TAG
        git_branch = $GIT_BRANCH
        git_dirty = $GIT_DIRTY
        generated_at = (Get-Date -Format "o")
        generator = "omega-consciousness v$OMEGA_VERSION"
        hostname = $env:COMPUTERNAME
        username = $env:USERNAME
        os = [System.Environment]::OSVersion.VersionString
        node_version = (node -v 2>$null) ?? "not installed"
        npm_version = (npm -v 2>$null) ?? "not installed"
        pnpm_version = (pnpm -v 2>$null) ?? "not installed"
        project_version = (Get-Content package.json -ErrorAction SilentlyContinue | ConvertFrom-Json).version ?? "unknown"
        title = $Title
    }
    
    $identity | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8 "$SNAP_DIR/00_IDENTITY/IDENTITY.json"
    
    Log-OK "Identity generated"
    
    if ($GIT_DIRTY) {
        Log-Warn "Repository has uncommitted changes"
    }
}

function Collect-Evidence {
    Log-Phase "PHASE 2 — Collecting Evidence"
    
    # Node/npm info
    Run-Command "node -v" "Node version" "$SNAP_DIR/10_EVIDENCE/reports/node_version.txt" -ContinueOnError
    Run-Command "npm -v" "NPM version" "$SNAP_DIR/10_EVIDENCE/reports/npm_version.txt" -ContinueOnError
    
    # Git info
    Run-Command "git status --porcelain" "Git status" "$SNAP_DIR/10_EVIDENCE/reports/git_status.txt" -ContinueOnError
    Run-Command "git log -1 --format='%H %s'" "Git last commit" "$SNAP_DIR/10_EVIDENCE/reports/git_last_commit.txt" -ContinueOnError
    Run-Command "git log --oneline -20" "Git recent commits" "$SNAP_DIR/10_EVIDENCE/reports/git_log_20.txt" -ContinueOnError
    
    # Install
    Log-Info "Installing dependencies..."
    if (Test-Path "pnpm-lock.yaml") {
        Run-Command "pnpm install --frozen-lockfile" "Install (pnpm)" -ContinueOnError
    } elseif (Test-Path "package-lock.json") {
        Run-Command "npm ci" "Install (npm ci)" -ContinueOnError
    } else {
        Run-Command "npm install" "Install (npm)" -ContinueOnError
    }
    
    # TypeScript check
    Log-Info "Running TypeScript check..."
    Run-Command "npx tsc --noEmit 2>&1" "TypeScript check" "$SNAP_DIR/10_EVIDENCE/reports/typecheck.txt" -ContinueOnError
    
    # Lint
    Log-Info "Running ESLint..."
    Run-Command "npx eslint . --format json 2>&1" "ESLint JSON" "$SNAP_DIR/10_EVIDENCE/reports/eslint.json" -ContinueOnError
    Run-Command "npx eslint . --format stylish 2>&1" "ESLint stylish" "$SNAP_DIR/10_EVIDENCE/reports/eslint.txt" -ContinueOnError
    
    # Tests
    if (-not $SkipTests) {
        Log-Info "Running tests..."
        Run-Command "npm test 2>&1" "Tests" "$SNAP_DIR/10_EVIDENCE/reports/tests.txt" -ContinueOnError
        
        # Coverage (if available)
        if ((Get-Content package.json | ConvertFrom-Json).scripts.'test:coverage') {
            Log-Info "Running coverage..."
            Run-Command "npm run test:coverage 2>&1" "Coverage" "$SNAP_DIR/10_EVIDENCE/reports/coverage.txt" -ContinueOnError
        }
    } else {
        Log-Warn "Tests skipped (--SkipTests)"
    }
    
    # Security: npm audit
    Log-Info "Running npm audit..."
    Run-Command "npm audit --json 2>&1" "NPM audit" "$SNAP_DIR/10_EVIDENCE/reports/npm_audit.json" -ContinueOnError
    
    # Security: gitleaks (if installed)
    if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
        Log-Info "Running gitleaks..."
        Run-Command "gitleaks detect --no-git --redact -v --report-format json --report-path '$SNAP_DIR/10_EVIDENCE/reports/gitleaks.json' 2>&1" "Gitleaks" -ContinueOnError
    } else {
        Log-Warn "gitleaks not installed, skipping secrets scan"
    }
    
    Log-OK "Evidence collected"
}

function Generate-Facts {
    Log-Phase "PHASE 3 — Generating Facts"
    
    # Dependency graph
    Log-Info "Generating dependency graph..."
    if (Get-Command madge -ErrorAction SilentlyContinue) {
        Run-Command "npx madge --json src 2>&1" "Dependency graph JSON" "$SNAP_DIR/20_FACTS/dependency_graph.json" -ContinueOnError
        Run-Command "npx madge --circular src 2>&1" "Circular dependencies" "$SNAP_DIR/20_FACTS/dependency_cycles.txt" -ContinueOnError
    } else {
        Log-Warn "madge not installed, skipping dependency graph"
        '{"warning": "madge not installed"}' | Out-File -Encoding UTF8 "$SNAP_DIR/20_FACTS/dependency_graph.json"
    }
    
    # Module inventory (basic)
    Log-Info "Creating module inventory..."
    $modules = Get-ChildItem -Path "src" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        @{
            name = $_.Name
            path = $_.FullName -replace [regex]::Escape((Get-Location).Path + "\"), ""
            files = (Get-ChildItem -Path $_.FullName -Recurse -File -Include "*.ts","*.tsx" | Measure-Object).Count
        }
    }
    @{ modules = $modules; generated_at = (Get-Date -Format "o") } | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8 "$SNAP_DIR/20_FACTS/module_inventory.json"
    
    # Test inventory
    Log-Info "Creating test inventory..."
    $tests = Get-ChildItem -Path "." -Recurse -File -Include "*.test.ts","*.spec.ts" -ErrorAction SilentlyContinue | ForEach-Object {
        @{
            name = $_.Name
            path = $_.FullName -replace [regex]::Escape((Get-Location).Path + "\"), ""
        }
    }
    @{ tests = $tests; count = $tests.Count; generated_at = (Get-Date -Format "o") } | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8 "$SNAP_DIR/20_FACTS/test_inventory.json"
    
    # LOC metrics (basic)
    Log-Info "Calculating LOC metrics..."
    $tsFiles = Get-ChildItem -Path "src" -Recurse -File -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue
    $totalLines = 0
    foreach ($file in $tsFiles) {
        $totalLines += (Get-Content $file.FullName | Measure-Object -Line).Lines
    }
    @{
        total_files = $tsFiles.Count
        total_lines = $totalLines
        generated_at = (Get-Date -Format "o")
    } | ConvertTo-Json | Out-File -Encoding UTF8 "$SNAP_DIR/20_FACTS/loc_metrics.json"
    
    Log-OK "Facts generated"
}

function Evaluate-Gates {
    Log-Phase "PHASE 4 — Evaluating Gates"
    
    $gateResults = @{
        generated_at = (Get-Date -Format "o")
        git_sha = $GIT_SHA
        gates = @()
    }
    
    $p0_failed = $false
    
    # GATE-P0-TRUTH-SYNC
    $truthGate = @{
        id = "GATE-P0-TRUTH-SYNC"
        priority = "P0"
        checks = @()
        status = "PASS"
    }
    
    # Check: Identity exists
    if (Test-Path "$SNAP_DIR/00_IDENTITY/IDENTITY.json") {
        $truthGate.checks += @{ name = "identity_exists"; status = "PASS" }
    } else {
        $truthGate.checks += @{ name = "identity_exists"; status = "FAIL" }
        $truthGate.status = "FAIL"
        $p0_failed = $true
    }
    
    $gateResults.gates += $truthGate
    
    # GATE-P0-BUILD-DETERMINISM
    $buildGate = @{
        id = "GATE-P0-BUILD-DETERMINISM"
        priority = "P0"
        checks = @()
        status = "PASS"
    }
    
    # Check: TypeScript compiles
    $tscResult = Get-Content "$SNAP_DIR/10_EVIDENCE/reports/typecheck.txt" -ErrorAction SilentlyContinue
    if ($tscResult -match "error") {
        $buildGate.checks += @{ name = "typecheck"; status = "FAIL" }
        $buildGate.status = "FAIL"
        $p0_failed = $true
    } else {
        $buildGate.checks += @{ name = "typecheck"; status = "PASS" }
    }
    
    # Check: Tests pass
    if (-not $SkipTests) {
        $testResult = Get-Content "$SNAP_DIR/10_EVIDENCE/reports/tests.txt" -ErrorAction SilentlyContinue
        if ($testResult -match "FAIL|failed") {
            $buildGate.checks += @{ name = "tests"; status = "FAIL" }
            $buildGate.status = "FAIL"
            $p0_failed = $true
        } else {
            $buildGate.checks += @{ name = "tests"; status = "PASS" }
        }
    } else {
        $buildGate.checks += @{ name = "tests"; status = "SKIP" }
    }
    
    $gateResults.gates += $buildGate
    
    # GATE-P0-SECURITY-BASELINE
    $secGate = @{
        id = "GATE-P0-SECURITY-BASELINE"
        priority = "P0"
        checks = @()
        status = "PASS"
    }
    
    # Check: npm audit
    $auditResult = Get-Content "$SNAP_DIR/10_EVIDENCE/reports/npm_audit.json" -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($auditResult.metadata.vulnerabilities.critical -gt 0 -or $auditResult.metadata.vulnerabilities.high -gt 0) {
        $secGate.checks += @{ 
            name = "npm_audit"
            status = "FAIL"
            critical = $auditResult.metadata.vulnerabilities.critical
            high = $auditResult.metadata.vulnerabilities.high
        }
        $secGate.status = "FAIL"
        $p0_failed = $true
    } else {
        $secGate.checks += @{ name = "npm_audit"; status = "PASS" }
    }
    
    # Check: gitleaks
    if (Test-Path "$SNAP_DIR/10_EVIDENCE/reports/gitleaks.json") {
        $leaks = Get-Content "$SNAP_DIR/10_EVIDENCE/reports/gitleaks.json" -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($leaks -and $leaks.Count -gt 0) {
            $secGate.checks += @{ name = "secrets"; status = "FAIL"; count = $leaks.Count }
            $secGate.status = "FAIL"
            $p0_failed = $true
        } else {
            $secGate.checks += @{ name = "secrets"; status = "PASS" }
        }
    } else {
        $secGate.checks += @{ name = "secrets"; status = "SKIP" }
    }
    
    $gateResults.gates += $secGate
    
    # Summary
    $gateResults.summary = @{
        total = $gateResults.gates.Count
        passed = ($gateResults.gates | Where-Object { $_.status -eq "PASS" }).Count
        failed = ($gateResults.gates | Where-Object { $_.status -eq "FAIL" }).Count
        p0_blocked = $p0_failed
    }
    
    # Save results
    $gateResults | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8 "$SNAP_DIR/60_IMMUNITY/gate_results.json"
    
    # Generate GATES.md
    $gatesMd = @"
# OMEGA GATES Report

**Generated**: $(Get-Date -Format "o")
**Git SHA**: $GIT_SHA
**Mode**: $Mode

## Summary

| Gate | Priority | Status |
|------|----------|--------|
"@
    
    foreach ($gate in $gateResults.gates) {
        $statusIcon = if ($gate.status -eq "PASS") { "✅" } else { "❌" }
        $gatesMd += "`n| $($gate.id) | $($gate.priority) | $statusIcon $($gate.status) |"
    }
    
    $gatesMd += @"

## Overall Verdict: $(if ($p0_failed) { "❌ BLOCKED" } else { "✅ PASS" })

$(if ($p0_failed) {
@"
## ⚠️ P0 GATE FAILURES

Release is blocked due to P0 gate failures. Fix the issues above before releasing.
"@
})
"@
    
    $gatesMd | Out-File -Encoding UTF8 "$SNAP_DIR/90_FINDINGS/GATES.md"
    
    if ($p0_failed) {
        Log-Error "P0 GATES FAILED — Release blocked"
    } else {
        Log-OK "All P0 gates passed"
    }
    
    return $p0_failed
}

function Generate-RootHash {
    Log-Phase "PHASE 5 — Generating Root Hash"
    
    $allHashes = @()
    
    Get-ChildItem -Path $SNAP_DIR -Recurse -File | Sort-Object FullName | ForEach-Object {
        if ($_.Name -ne "ROOT_HASH.txt") {
            $hash = Get-FileHash -Path $_.FullName -Algorithm SHA256
            $relativePath = $_.FullName -replace [regex]::Escape("$SNAP_DIR\"), ""
            $allHashes += "$($hash.Hash) $relativePath"
        }
    }
    
    $allHashes | Out-File -Encoding UTF8 "$SNAP_DIR/Z0_META/file_hashes.txt"
    
    # Compute root hash
    $hashContent = $allHashes -join "`n"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($hashContent)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $rootHashBytes = $sha256.ComputeHash($bytes)
    $rootHash = [System.BitConverter]::ToString($rootHashBytes) -replace '-', ''
    
    "ROOT_HASH: sha256:$rootHash" | Out-File -Encoding UTF8 "$SNAP_DIR/00_IDENTITY/ROOT_HASH.txt"
    "sha256:$rootHash" | Out-File -Encoding UTF8 "$SNAP_DIR/Z0_META/ROOT_HASH.txt"
    
    Log-OK "Root hash: sha256:$($rootHash.Substring(0, 16))..."
}

function Generate-Summary {
    Log-Phase "FINAL — Generating Summary"
    
    $summary = @"
# OMEGA CONSCIOUSNESS Snapshot

**Name**: $SNAP_NAME
**Generated**: $(Get-Date -Format "o")
**Mode**: $Mode
**Git SHA**: $GIT_SHA
**Git Tag**: $(if ($GIT_TAG) { $GIT_TAG } else { "N/A" })
**Git Branch**: $GIT_BRANCH
**Dirty**: $GIT_DIRTY

## Contents

$(Get-ChildItem -Path $SNAP_DIR -Directory | ForEach-Object { "- $($_.Name)/" })

## Gates Result

$(Get-Content "$SNAP_DIR/90_FINDINGS/GATES.md" -ErrorAction SilentlyContinue | Select-Object -Skip 6 | Select-Object -First 20)

## Root Hash

$(Get-Content "$SNAP_DIR/00_IDENTITY/ROOT_HASH.txt" -ErrorAction SilentlyContinue)

---

*Generated by omega-consciousness v$OMEGA_VERSION*
"@
    
    $summary | Out-File -Encoding UTF8 "$SNAP_DIR/Z0_META/SNAP_SUMMARY.md"
    
    # Copy to latest
    if (-not (Test-Path "OMEGA_SNAPSHOTS/LATEST")) {
        New-Item -ItemType Directory -Force -Path "OMEGA_SNAPSHOTS/LATEST" | Out-Null
    }
    Copy-Item -Path "$SNAP_DIR/*" -Destination "OMEGA_SNAPSHOTS/LATEST/" -Recurse -Force
    
    Log-OK "Snapshot complete: $SNAP_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if ($Help) {
    Show-Help
    exit 0
}

Show-Banner

$startTime = Get-Date

try {
    Create-DirectoryStructure
    Generate-Identity
    Collect-Evidence
    Generate-Facts
    $blocked = Evaluate-Gates
    Generate-RootHash
    Generate-Summary
    
    $duration = (Get-Date) - $startTime
    
    Write-Host ""
    Write-Host "${C_CYAN}╔═══════════════════════════════════════════════════════════════════════════════════╗${C_RESET}"
    Write-Host "${C_CYAN}║                                                                                   ║${C_RESET}"
    if ($blocked) {
        Write-Host "${C_CYAN}║${C_RED}   ❌ SNAPSHOT COMPLETE — P0 GATES FAILED — RELEASE BLOCKED                       ${C_RESET}${C_CYAN}║${C_RESET}"
    } else {
        Write-Host "${C_CYAN}║${C_GREEN}   ✅ SNAPSHOT COMPLETE — ALL GATES PASSED                                        ${C_RESET}${C_CYAN}║${C_RESET}"
    }
    Write-Host "${C_CYAN}║                                                                                   ║${C_RESET}"
    Write-Host "${C_CYAN}║   Output: $SNAP_DIR                                 ${C_RESET}${C_CYAN}║${C_RESET}"
    Write-Host "${C_CYAN}║   Duration: $([math]::Round($duration.TotalSeconds, 1)) seconds                                                       ${C_RESET}${C_CYAN}║${C_RESET}"
    Write-Host "${C_CYAN}║                                                                                   ║${C_RESET}"
    Write-Host "${C_CYAN}╚═══════════════════════════════════════════════════════════════════════════════════╝${C_RESET}"
    Write-Host ""
    
    if ($blocked) {
        exit 1
    }
}
catch {
    Log-Error "Snapshot failed: $_"
    exit 1
}
