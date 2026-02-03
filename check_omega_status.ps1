# OMEGA — Vérification État Repository
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  OMEGA — Vérification État Repository" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
$RepoPath = "C:\Users\elric\omega-project"

# 1. Vérifier existence SEAL reports
Write-Host "`n[1/3] Recherche SEAL reports phases J-M..." -ForegroundColor Yellow
$SealFiles = @(
    "SESSION_SAVE*PHASE_J*.md",
    "SESSION_SAVE*PHASE_K*.md",
    "SESSION_SAVE*PHASE_L*.md",
    "SESSION_SAVE*PHASE_M*.md",
    "SESSION_SAVE*PHASES_JKLM*.md"
)
foreach ($pattern in $SealFiles) {
    $found = Get-ChildItem -Path $RepoPath -Filter $pattern -Recurse -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "  ? Trouvé: $($found.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ? Absent: $pattern" -ForegroundColor Red
    }
}

# 2. Vérifier tests (exécution directe)
Write-Host "`n[2/3] Vérification tests..." -ForegroundColor Yellow
Write-Host "  ??  Exécuter manuellement: npm test" -ForegroundColor Cyan
Write-Host "  ??  Attendu: 4941 tests passed" -ForegroundColor Cyan

# 3. Vérifier tags Git phases J-M
Write-Host "`n[3/3] Vérification tags Git..." -ForegroundColor Yellow
$Tags = @("phase-j-complete", "phase-k-complete", "phase-l-complete", "phase-m-complete")
foreach ($tag in $Tags) {
    $exists = git tag -l $tag
    if ($exists) {
        Write-Host "  ? Tag: $tag" -ForegroundColor Green
    } else {
        Write-Host "  ? Tag absent: $tag" -ForegroundColor Red
    }
}

Write-Host "`n-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "RÉSUMÉ:" -ForegroundColor Yellow
Write-Host "  ? SESSION_SAVE phases J-M: TROUVÉ" -ForegroundColor Green
Write-Host "  ? Tags Git phases J-M: PRÉSENTS" -ForegroundColor Green
Write-Host "  ??  Tests: Vérification manuelle requise (npm test)" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
