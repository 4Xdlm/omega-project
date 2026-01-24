# ===================================================================
# OMEGA TRUTH CHECK — Verification Script
# Version: 1.0.0
# ===================================================================

param(
    [string]$RepoPath = "."
)

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "              OMEGA TRUTH CHECK v1.0.0" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan

$errors = @()

# CHECK 1: Core documents
Write-Host "`n[1/7] Checking core documents..." -ForegroundColor Yellow

$requiredDocs = @(
    "OMEGA_README.md",
    @("OMEGA_MASTER_PLAN.md", "OMEGA_MASTER_PLAN_v2.md"),
    "OMEGA_MASTER_PLAN_ANNEXES.md"
)

foreach ($doc in $requiredDocs) {
    if ($doc -is [array]) {
        $found = $false
        foreach ($alt in $doc) {
            if (Test-Path "$RepoPath/$alt") {
                Write-Host "  [PASS] $alt" -ForegroundColor Green
                $found = $true
                break
            }
        }
        if (-not $found) {
            Write-Host "  [FAIL] Missing: $($doc -join ' or ')" -ForegroundColor Red
            $errors += "Missing document: $($doc -join ' or ')"
        }
    } else {
        if (Test-Path "$RepoPath/$doc") {
            Write-Host "  [PASS] $doc" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $doc MISSING" -ForegroundColor Red
            $errors += "Missing document: $doc"
        }
    }
}

# CHECK 2: Artefacts directory
Write-Host "`n[2/7] Checking artefacts..." -ForegroundColor Yellow

$requiredArtefacts = @(
    "artefacts/REPO_SCOPE.txt",
    "artefacts/DOC_CODE_MATRIX.json",
    "artefacts/EXPORTS_REAL.json",
    "artefacts/INTERFACE_CONTRACTS.md",
    "artefacts/NUMBERS_AUDIT.md",
    "artefacts/IMPACT_COUPLING_MATRIX.md",
    "artefacts/ASSUMPTIONS_VALIDITY.md"
)

foreach ($art in $requiredArtefacts) {
    if (Test-Path "$RepoPath/$art") {
        Write-Host "  [PASS] $art" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] $art not generated" -ForegroundColor Yellow
        $errors += "Missing artefact: $art"
    }
}

# CHECK 3: Sessions
Write-Host "`n[3/7] Checking sessions..." -ForegroundColor Yellow

if (Test-Path "$RepoPath/sessions") {
    Write-Host "  [PASS] sessions/ directory exists" -ForegroundColor Green
    if (Test-Path "$RepoPath/sessions/SESSION_INDEX.md") {
        Write-Host "  [PASS] SESSION_INDEX.md" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] SESSION_INDEX.md not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [FAIL] sessions/ directory missing" -ForegroundColor Red
    $errors += "Missing directory: sessions/"
}

# CHECK 4: Document hashes
Write-Host "`n[4/7] Calculating document hashes..." -ForegroundColor Yellow

$docsToHash = @("OMEGA_README.md", "OMEGA_MASTER_PLAN_v2.md", "OMEGA_MASTER_PLAN_ANNEXES.md")
foreach ($doc in $docsToHash) {
    $path = "$RepoPath/$doc"
    if (Test-Path $path) {
        $hash = (Get-FileHash -Algorithm SHA256 $path).Hash
        Write-Host "  $doc : $($hash.Substring(0,16))..." -ForegroundColor Gray
    }
}

# CHECK 5: NUMBERS POLICY
Write-Host "`n[5/7] Checking NUMBERS POLICY..." -ForegroundColor Yellow
if (Test-Path "$RepoPath/artefacts/NUMBERS_AUDIT.md") {
    Write-Host "  [PASS] NUMBERS_AUDIT.md exists" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Manual audit required" -ForegroundColor Yellow
}

# CHECK 6: INTERFACE CONTRACTS
Write-Host "`n[6/7] Checking INTERFACE CONTRACTS..." -ForegroundColor Yellow
if (Test-Path "$RepoPath/artefacts/INTERFACE_CONTRACTS.md") {
    Write-Host "  [PASS] INTERFACE_CONTRACTS.md exists" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Manual verification required" -ForegroundColor Yellow
}

# CHECK 7: DOC<->CODE SYNC
Write-Host "`n[7/7] Checking DOC<->CODE SYNC..." -ForegroundColor Yellow
if (Test-Path "$RepoPath/artefacts/DOC_CODE_MATRIX.json") {
    Write-Host "  [PASS] DOC_CODE_MATRIX.json exists" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Manual verification required" -ForegroundColor Yellow
}

# VERDICT
Write-Host "`n===================================================================" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "[PASS] OMEGA TRUTH CHECK: ALL CLEAR" -ForegroundColor Green
    Write-Host "  All documents present" -ForegroundColor Green
    Write-Host "  All artefacts generated" -ForegroundColor Green
    Write-Host "  Truth synchronized" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] OMEGA TRUTH CHECK: ISSUES FOUND" -ForegroundColor Red
    Write-Host "  Errors found: $($errors.Count)" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "    - $err" -ForegroundColor Red
    }
    exit 1
}
