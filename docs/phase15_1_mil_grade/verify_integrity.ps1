# ===========================================================================
#                    OMEGA Phase 15.1 - Verification Integrite
#                         MIL-GRADE VERSION (ASCII)
# ===========================================================================

param(
    [switch]$Full,
    [switch]$Quick
)

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "     OMEGA PHASE 15.1 - VERIFICATION INTEGRITE (MIL-GRADE)        " -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ProjectPath = "C:\Users\elric\omega-project"
$ExpectedTag = "v3.15.0-NEXUS_CORE"
$ExpectedRootHash = "1028a0340d16fe7cfed1fb5bcfa4adebc0bb489999d19844de7fcfb028a571b5"

# Compteurs
$Passed = 0
$Failed = 0
$Warnings = 0

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

Write-Host "[1/6] VERIFICATION REPERTOIRE" -ForegroundColor Yellow
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
Write-Host "[2/6] VERIFICATION GIT STATUS (GARDE-FOU GF-01 a GF-06)" -ForegroundColor Yellow
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
    Write-Host "      WARNING: Phase 15.1 interdit toute modification" -ForegroundColor Red
    Write-Host "      -> Pour restaurer: git checkout ." -ForegroundColor Yellow
}

# ===========================================================================
# SECTION 3 - VERIFICATION TAG/COMMIT
# ===========================================================================

Write-Host ""
Write-Host "[3/6] VERIFICATION TAG ET COMMIT" -ForegroundColor Yellow
Write-Host ""

$currentCommit = git log -1 --format="%H" 2>$null
$currentTag = git describe --tags --exact-match 2>$null
$commitDate = git log -1 --format="%ci" 2>$null
$commitMsg = git log -1 --format="%s" 2>$null

Write-Host "      Commit: $currentCommit" -ForegroundColor Gray
Write-Host "      Date:   $commitDate" -ForegroundColor Gray
Write-Host "      Msg:    $commitMsg" -ForegroundColor Gray
Write-Host ""

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
Write-Host "[4/6] VERIFICATION BRANCHES" -ForegroundColor Yellow
Write-Host ""

$currentBranch = git branch --show-current 2>$null
$IsMaster = ($currentBranch -eq "master")

Test-Check -Name "Branch master" `
           -Condition $IsMaster `
           -SuccessMsg "Sur branch master" `
           -FailMsg "Sur branch: $currentBranch (attendu: master)" `
           -IsCritical $false

# Verifier sync avec origin
$aheadBehind = git rev-list --count --left-right origin/master...HEAD 2>$null
if ($aheadBehind -match "(\d+)\s+(\d+)") {
    $behind = [int]$matches[1]
    $ahead = [int]$matches[2]
    $InSync = ($behind -eq 0) -and ($ahead -eq 0)
    
    Test-Check -Name "Sync avec origin" `
               -Condition $InSync `
               -SuccessMsg "Synchronise avec origin/master" `
               -FailMsg "Desynchronise: $behind behind, $ahead ahead" `
               -IsCritical $false
}

# ===========================================================================
# SECTION 5 - VERIFICATION TESTS (optionnel avec -Full)
# ===========================================================================

Write-Host ""
Write-Host "[5/6] VERIFICATION TESTS" -ForegroundColor Yellow
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
# SECTION 6 - RAPPEL DES REGLES
# ===========================================================================

Write-Host ""
Write-Host "[6/6] RAPPEL REGLES PHASE 15.1 (MIL-GRADE)" -ForegroundColor Yellow
Write-Host ""

Write-Host "      GARDE-FOUS INVIOLABLES:" -ForegroundColor Magenta
Write-Host "      GF-01: Aucun fichier .ts modifie" -ForegroundColor White
Write-Host "      GF-02: Aucun fichier .test.ts modifie" -ForegroundColor White
Write-Host "      GF-03: Aucun git commit" -ForegroundColor White
Write-Host "      GF-04: Aucun git push" -ForegroundColor White
Write-Host "      GF-05: Aucun npm install" -ForegroundColor White
Write-Host "      GF-06: Aucune creation module" -ForegroundColor White
Write-Host ""
Write-Host "      DISCIPLINE MENTALE:" -ForegroundColor Magenta
Write-Host "      - Ce qui est observe, pas ce qui est compris" -ForegroundColor White
Write-Host "      - Notes append-only (aucune modification)" -ForegroundColor White
Write-Host "      - Minimum 3 occurrences pour pattern confirme" -ForegroundColor White
Write-Host "      - G3/G4 = Arret d'urgence + Escalade Architecte" -ForegroundColor White

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

if ($Failed -eq 0) {
    Write-Host "  [OK] INTEGRITE OK - Systeme pret pour observation" -ForegroundColor Green
    Write-Host ""
    Write-Host "  -> Pret pour Phase 15.1 OBSERVATION TERRAIN" -ForegroundColor White
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
