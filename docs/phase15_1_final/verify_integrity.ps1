# ===========================================================================
#                    OMEGA Phase 15.1 - Verification Integrite
#                    DEFENSE GRADE — v3.0.0-FINAL
# ===========================================================================

param(
    [switch]$Full,
    [switch]$Quick
)

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "   OMEGA PHASE 15.1 - VERIFICATION INTEGRITE (DEFENSE GRADE)      " -ForegroundColor Cyan
Write-Host "                    v3.0.0-FINAL                                  " -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ProjectPath = "C:\Users\elric\omega-project"
$DocsPath = "C:\Users\elric\omega-project\docs\phase15_1_final"
$ExpectedTag = "v3.15.0-NEXUS_CORE"
$ExpectedCommit = "49da34bb4f62eb8f5c810ab7e2bf109a75e156cf"

# Fichiers append-only a verifier
$AppendOnlyFiles = @(
    "OBS_TERRAIN_LOG_APPEND_ONLY.md",
    "PATTERN_EXTRACTION_MIL_GRADE.md",
    "NO_EVENT_LOG.md",
    "BACKLOG_TENTATION.md",
    "NO_GO_ZONE.md"
)

# Compteurs
$Passed = 0
$Failed = 0
$Warnings = 0

# Stockage des lignes count pour verification append-only
$LineCountFile = "$DocsPath\.line_counts.json"

function Test-Check {
    param($Name, $Condition, $SuccessMsg, $FailMsg, $IsCritical = $true)
    
    if ($Condition) {
        Write-Host "      [OK] $Name" -ForegroundColor Green
        Write-Host "          $SuccessMsg" -ForegroundColor Gray
        $script:Passed++
        return $true
    } else {
        if ($IsCritical) {
            Write-Host "      [FAIL] $Name" -ForegroundColor Red
            Write-Host "          $FailMsg" -ForegroundColor Red
            $script:Failed++
        } else {
            Write-Host "      [WARN] $Name" -ForegroundColor Yellow
            Write-Host "          $FailMsg" -ForegroundColor Yellow
            $script:Warnings++
        }
        return $false
    }
}

# ===========================================================================
# SECTION 1 - VERIFICATION REPERTOIRE
# ===========================================================================

Write-Host "[1/7] VERIFICATION REPERTOIRE" -ForegroundColor Yellow
Write-Host ""

$PathExists = Test-Path $ProjectPath
Test-Check -Name "Repertoire projet" `
           -Condition $PathExists `
           -SuccessMsg "Trouve: $ProjectPath" `
           -FailMsg "NON TROUVE: $ProjectPath"

if (-not $PathExists) {
    Write-Host ""
    Write-Host "ERREUR FATALE: Repertoire projet introuvable" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectPath

# ===========================================================================
# SECTION 2 - VERIFICATION GIT STATUS
# ===========================================================================

Write-Host ""
Write-Host "[2/7] VERIFICATION GIT STATUS (GARDE-FOU GF-01 a GF-06)" -ForegroundColor Yellow
Write-Host ""

$gitStatus = git status --porcelain 2>$null
$IsClean = [string]::IsNullOrWhiteSpace($gitStatus)

Test-Check -Name "Working tree clean" `
           -Condition $IsClean `
           -SuccessMsg "Aucune modification detectee" `
           -FailMsg "MODIFICATIONS DETECTEES - VIOLATION GARDE-FOU"

if (-not $IsClean) {
    Write-Host ""
    Write-Host "      Fichiers modifies:" -ForegroundColor Red
    git status --short | ForEach-Object { Write-Host "         $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "      WARNING: Phase 15.1 interdit toute modification CODE" -ForegroundColor Red
    Write-Host "      Note: Les fichiers docs/phase15_1_final/*.md sont autorises" -ForegroundColor Yellow
}

# ===========================================================================
# SECTION 3 - VERIFICATION COMMIT ET TAG
# ===========================================================================

Write-Host ""
Write-Host "[3/7] VERIFICATION COMMIT ET TAG" -ForegroundColor Yellow
Write-Host ""

$currentCommit = git log -1 --format="%H" 2>$null
$currentTag = git describe --tags --exact-match 2>$null
$commitDate = git log -1 --format="%ci" 2>$null

Write-Host "      Commit: $currentCommit" -ForegroundColor Gray
Write-Host "      Date:   $commitDate" -ForegroundColor Gray
Write-Host ""

$CommitCorrect = ($currentCommit -eq $ExpectedCommit)
Test-Check -Name "Commit reference" `
           -Condition $CommitCorrect `
           -SuccessMsg "Hash intact: $currentCommit" `
           -FailMsg "Hash different! Attendu: $ExpectedCommit"

$TagCorrect = ($currentTag -eq $ExpectedTag)
Test-Check -Name "Tag version" `
           -Condition $TagCorrect `
           -SuccessMsg "Tag correct: $currentTag" `
           -FailMsg "Tag incorrect: $currentTag (attendu: $ExpectedTag)" `
           -IsCritical $false

# ===========================================================================
# SECTION 4 - VERIFICATION BRANCHES
# ===========================================================================

Write-Host ""
Write-Host "[4/7] VERIFICATION BRANCHES" -ForegroundColor Yellow
Write-Host ""

$currentBranch = git branch --show-current 2>$null
$IsMaster = ($currentBranch -eq "master")

Test-Check -Name "Branch master" `
           -Condition $IsMaster `
           -SuccessMsg "Sur branch master" `
           -FailMsg "Sur branch: $currentBranch (attendu: master)" `
           -IsCritical $false

# ===========================================================================
# SECTION 5 - VERIFICATION FICHIERS APPEND-ONLY (INTEGRITE PROCESSUS)
# ===========================================================================

Write-Host ""
Write-Host "[5/7] VERIFICATION INTEGRITE PROCESSUS (APPEND-ONLY)" -ForegroundColor Yellow
Write-Host ""

$DocsExists = Test-Path $DocsPath
if (-not $DocsExists) {
    Write-Host "      [WARN] Repertoire docs non trouve: $DocsPath" -ForegroundColor Yellow
    Write-Host "          Les fichiers append-only seront crees lors des observations" -ForegroundColor Gray
    $Warnings++
} else {
    # Charger les comptes de lignes precedents
    $previousCounts = @{}
    if (Test-Path $LineCountFile) {
        $previousCounts = Get-Content $LineCountFile | ConvertFrom-Json -AsHashtable
    }
    
    $currentCounts = @{}
    $appendOnlyViolation = $false
    
    foreach ($file in $AppendOnlyFiles) {
        $filePath = Join-Path $DocsPath $file
        if (Test-Path $filePath) {
            $lineCount = (Get-Content $filePath | Measure-Object -Line).Lines
            $currentCounts[$file] = $lineCount
            
            # Verifier que le nombre de lignes n'a pas diminue
            if ($previousCounts.ContainsKey($file)) {
                $prevCount = $previousCounts[$file]
                if ($lineCount -lt $prevCount) {
                    Write-Host "      [FAIL] $file" -ForegroundColor Red
                    Write-Host "          SUPPRESSION DETECTEE: $prevCount -> $lineCount lignes" -ForegroundColor Red
                    $appendOnlyViolation = $true
                    $script:Failed++
                } else {
                    Write-Host "      [OK] $file" -ForegroundColor Green
                    Write-Host "          Lignes: $lineCount (precedent: $prevCount)" -ForegroundColor Gray
                    $script:Passed++
                }
            } else {
                Write-Host "      [OK] $file" -ForegroundColor Green
                Write-Host "          Lignes: $lineCount (premiere verification)" -ForegroundColor Gray
                $script:Passed++
            }
        } else {
            Write-Host "      [--] $file" -ForegroundColor Gray
            Write-Host "          Non encore cree" -ForegroundColor Gray
        }
    }
    
    # Sauvegarder les comptes actuels
    $currentCounts | ConvertTo-Json | Set-Content $LineCountFile
    
    if ($appendOnlyViolation) {
        Write-Host ""
        Write-Host "      VIOLATION APPEND-ONLY DETECTEE!" -ForegroundColor Red
        Write-Host "      Les fichiers d'observation ne doivent JAMAIS diminuer." -ForegroundColor Red
    }
}

# ===========================================================================
# SECTION 6 - VERIFICATION TESTS (optionnel avec -Full)
# ===========================================================================

Write-Host ""
Write-Host "[6/7] VERIFICATION TESTS" -ForegroundColor Yellow
Write-Host ""

if ($Full) {
    Write-Host "      Execution des tests (mode Full)..." -ForegroundColor Gray
    $testResult = npm test 2>&1
    $testSuccess = $LASTEXITCODE -eq 0
    
    Test-Check -Name "Tests passent" `
               -Condition $testSuccess `
               -SuccessMsg "Tous les tests passent" `
               -FailMsg "ECHEC DES TESTS"
    
    if (-not $testSuccess) {
        Write-Host ""
        Write-Host "      Sortie tests:" -ForegroundColor Red
        $testResult | Select-Object -Last 20 | ForEach-Object { Write-Host "         $_" -ForegroundColor Red }
    }
} else {
    Write-Host "      [SKIP] Tests non executes (utiliser -Full)" -ForegroundColor Gray
    Write-Host "      -> npm test" -ForegroundColor Gray
}

# ===========================================================================
# SECTION 7 - RAPPEL DES REGLES
# ===========================================================================

Write-Host ""
Write-Host "[7/7] RAPPEL REGLES PHASE 15.1 (DEFENSE GRADE)" -ForegroundColor Yellow
Write-Host ""

Write-Host "      CHAINE DE COMMANDEMENT:" -ForegroundColor Magenta
Write-Host "      -> Toute decision interpretative requiert validation Architecte" -ForegroundColor White
Write-Host ""
Write-Host "      ACTIONS AUTOMATIQUES G0-G4:" -ForegroundColor Magenta
Write-Host "      G0 COSMETIC     -> IGNORER" -ForegroundColor White
Write-Host "      G1 DEGRADED     -> LOG SEULEMENT" -ForegroundColor White
Write-Host "      G2 UNSAFE       -> SURVEILLANCE" -ForegroundColor Yellow
Write-Host "      G3 INTEGRITY    -> INCIDENT REPORT" -ForegroundColor Red
Write-Host "      G4 CATASTROPHIC -> ARRET IMMEDIAT" -ForegroundColor Red
Write-Host ""
Write-Host "      GARDE-FOUS INVIOLABLES:" -ForegroundColor Magenta
Write-Host "      - Aucun fichier .ts modifie" -ForegroundColor White
Write-Host "      - Aucun git commit/push" -ForegroundColor White
Write-Host "      - Notes append-only" -ForegroundColor White
Write-Host "      - Minimum 3 occurrences pour pattern" -ForegroundColor White
Write-Host ""
Write-Host "      REGLE CARDINALE:" -ForegroundColor Magenta
Write-Host "      'CE QUI EST OBSERVE, PAS CE QUI EST COMPRIS.'" -ForegroundColor Cyan

# ===========================================================================
# RESUME FINAL
# ===========================================================================

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "                         RESUME VERIFICATION                       " -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "      Checks passes:   $Passed" -ForegroundColor Green
if ($Failed -gt 0) {
    Write-Host "      Checks echoues:  $Failed" -ForegroundColor Red
} else {
    Write-Host "      Checks echoues:  $Failed" -ForegroundColor Green
}
if ($Warnings -gt 0) {
    Write-Host "      Warnings:        $Warnings" -ForegroundColor Yellow
} else {
    Write-Host "      Warnings:        $Warnings" -ForegroundColor Green
}
Write-Host ""
Write-Host "      Hash reference:  $ExpectedCommit" -ForegroundColor Gray
Write-Host ""

if ($Failed -eq 0) {
    Write-Host "  [OK] INTEGRITE OK - Systeme pret pour observation" -ForegroundColor Green
    Write-Host ""
    Write-Host "  -> Phase 15.1 OBSERVATION TERRAIN active" -ForegroundColor White
    $exitCode = 0
} else {
    Write-Host "  [FAIL] INTEGRITE COMPROMISE - Corrections requises" -ForegroundColor Red
    Write-Host ""
    Write-Host "  -> STOP: Restaurer l'etat avant de continuer" -ForegroundColor Yellow
    Write-Host "  -> Commande: git checkout ." -ForegroundColor Yellow
    $exitCode = 1
}

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

exit $exitCode
