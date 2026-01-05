# ═══════════════════════════════════════════════════════════════════════════════
#                    OMEGA Phase 15.1 — Vérification Intégrité
#                         MIL-GRADE VERSION
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$Full,
    [switch]$Quick
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "     OMEGA PHASE 15.1 — VÉRIFICATION INTÉGRITÉ (MIL-GRADE)        " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
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
        Write-Host "      ✅ $Name" -ForegroundColor Green
        Write-Host "         $SuccessMsg" -ForegroundColor Gray
        $script:Passed++
        return $true
    } else {
        if ($IsCritical) {
            Write-Host "      ❌ $Name" -ForegroundColor Red
            Write-Host "         $FailMsg" -ForegroundColor Red
            $script:Failed++
        } else {
            Write-Host "      ⚠️  $Name" -ForegroundColor Yellow
            Write-Host "         $FailMsg" -ForegroundColor Yellow
            $script:Warnings++
        }
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — VÉRIFICATION RÉPERTOIRE
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[1/6] VÉRIFICATION RÉPERTOIRE" -ForegroundColor Yellow
Write-Host ""

$PathExists = Test-Path $ProjectPath
Test-Check -Name "Répertoire projet" `
           -Condition $PathExists `
           -SuccessMsg "Trouvé: $ProjectPath" `
           -FailMsg "NON TROUVÉ: $ProjectPath"

if (-not $PathExists) {
    Write-Host ""
    Write-Host "ERREUR FATALE: Répertoire projet introuvable" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectPath

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — VÉRIFICATION GIT STATUS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[2/6] VÉRIFICATION GIT STATUS (GARDE-FOU GF-01 à GF-06)" -ForegroundColor Yellow
Write-Host ""

$gitStatus = git status --porcelain 2>$null
$IsClean = [string]::IsNullOrWhiteSpace($gitStatus)

Test-Check -Name "Working tree clean" `
           -Condition $IsClean `
           -SuccessMsg "Aucune modification détectée" `
           -FailMsg "MODIFICATIONS DÉTECTÉES — VIOLATION GARDE-FOU"

if (-not $IsClean) {
    Write-Host ""
    Write-Host "      Fichiers modifiés:" -ForegroundColor Red
    git status --short | ForEach-Object { Write-Host "         $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "      ⚠️  VIOLATION: Phase 15.1 interdit toute modification" -ForegroundColor Red
    Write-Host "      → Pour restaurer: git checkout ." -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — VÉRIFICATION TAG/COMMIT
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[3/6] VÉRIFICATION TAG ET COMMIT" -ForegroundColor Yellow
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

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — VÉRIFICATION BRANCHES
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[4/6] VÉRIFICATION BRANCHES" -ForegroundColor Yellow
Write-Host ""

$currentBranch = git branch --show-current 2>$null
$IsMaster = ($currentBranch -eq "master")

Test-Check -Name "Branch master" `
           -Condition $IsMaster `
           -SuccessMsg "Sur branch master" `
           -FailMsg "Sur branch: $currentBranch (attendu: master)" `
           -IsCritical $false

# Vérifier sync avec origin
$aheadBehind = git rev-list --count --left-right origin/master...HEAD 2>$null
if ($aheadBehind -match "(\d+)\s+(\d+)") {
    $behind = [int]$matches[1]
    $ahead = [int]$matches[2]
    $InSync = ($behind -eq 0) -and ($ahead -eq 0)
    
    Test-Check -Name "Sync avec origin" `
               -Condition $InSync `
               -SuccessMsg "Synchronisé avec origin/master" `
               -FailMsg "Désynchronisé: $behind behind, $ahead ahead" `
               -IsCritical $false
}

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — VÉRIFICATION TESTS (optionnel avec -Full)
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[5/6] VÉRIFICATION TESTS" -ForegroundColor Yellow
Write-Host ""

if ($Full) {
    Write-Host "      Exécution des tests (mode Full)..." -ForegroundColor Gray
    $testResult = npm test 2>&1
    $testSuccess = $LASTEXITCODE -eq 0
    
    Test-Check -Name "Tests passent" `
               -Condition $testSuccess `
               -SuccessMsg "Tous les tests passent" `
               -FailMsg "ÉCHEC DES TESTS"
    
    if (-not $testSuccess) {
        Write-Host ""
        Write-Host "      Sortie tests:" -ForegroundColor Red
        $testResult | Select-Object -Last 20 | ForEach-Object { Write-Host "         $_" -ForegroundColor Red }
    }
} else {
    Write-Host "      ⏭️  Skipped (utiliser -Full pour exécuter)" -ForegroundColor Gray
    Write-Host "      → npm test" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — RAPPEL DES RÈGLES
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[6/6] RAPPEL RÈGLES PHASE 15.1 (MIL-GRADE)" -ForegroundColor Yellow
Write-Host ""

Write-Host "      GARDE-FOUS INVIOLABLES:" -ForegroundColor Magenta
Write-Host "      GF-01: Aucun fichier .ts modifié" -ForegroundColor White
Write-Host "      GF-02: Aucun fichier .test.ts modifié" -ForegroundColor White
Write-Host "      GF-03: Aucun git commit" -ForegroundColor White
Write-Host "      GF-04: Aucun git push" -ForegroundColor White
Write-Host "      GF-05: Aucun npm install" -ForegroundColor White
Write-Host "      GF-06: Aucune création module" -ForegroundColor White
Write-Host ""
Write-Host "      DISCIPLINE MENTALE:" -ForegroundColor Magenta
Write-Host "      • Ce qui est observé, pas ce qui est compris" -ForegroundColor White
Write-Host "      • Notes append-only (aucune modification)" -ForegroundColor White
Write-Host "      • Minimum 3 occurrences pour pattern confirmé" -ForegroundColor White
Write-Host "      • G3/G4 = Arrêt d'urgence + Escalade Architecte" -ForegroundColor White

# ═══════════════════════════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                         RÉSUMÉ VÉRIFICATION                       " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "      Checks passés:   $Passed" -ForegroundColor Green
Write-Host "      Checks échoués:  $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Green" })
Write-Host "      Warnings:        $Warnings" -ForegroundColor $(if ($Warnings -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($Failed -eq 0) {
    Write-Host "  ✅ INTÉGRITÉ OK — Système prêt pour observation" -ForegroundColor Green
    Write-Host ""
    Write-Host "  → Prêt pour Phase 15.1 OBSERVATION TERRAIN" -ForegroundColor White
    $exitCode = 0
} else {
    Write-Host "  ❌ INTÉGRITÉ COMPROMISE — Corrections requises" -ForegroundColor Red
    Write-Host ""
    Write-Host "  → STOP: Restaurer l'état avant de continuer" -ForegroundColor Yellow
    Write-Host "  → Commande: git checkout ." -ForegroundColor Yellow
    $exitCode = 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

exit $exitCode
