# ═══════════════════════════════════════════════════════════════════════
# OMEGA — CC-STEP-1 : Enrichissement Corpus Public
# Script PowerShell de déploiement
# ═══════════════════════════════════════════════════════════════════════

$PROJECT = "C:\Users\elric\omega-project\omega-autopsie"
$ZIP_SOURCE = "C:\Users\elric\Downloads\omega_corpus_cc_v3.zip"

# 1. Extraire le ZIP
Expand-Archive -Path $ZIP_SOURCE -DestinationPath "$PROJECT\cc_step1" -Force

# 2. Copier les scripts dans omega-autopsie
Copy-Item "$PROJECT\cc_step1\autopsie_v3.py"       $PROJECT -Force
Copy-Item "$PROJECT\cc_step1\extract_selector_v3.py" $PROJECT -Force
Copy-Item "$PROJECT\cc_step1\baseline_analyzer.py"  $PROJECT -Force

# 3. Aller dans le dossier projet
cd $PROJECT

# 4. Activer l'environnement Python
.\.venv\Scripts\Activate.ps1

# 5. ÉTAPE A : Extraire les scènes S4-S10
python extract_selector_v3.py

# 6. ÉTAPE B : Analyser avec v3.0 (F19 + F20 inclus)
python autopsie_v3.py

# 7. ÉTAPE C : Analyser les baselines
python baseline_analyzer.py

# 8. Vérifier les résultats
Write-Host ""
Write-Host "=== RÉSULTATS ===" -ForegroundColor Cyan
$summary = Get-Content "results_v3\00_MASTER_SUMMARY_v3.json" | ConvertFrom-Json
Write-Host "Traités  : $($summary.global.total_processed)"
Write-Host "Échecs   : $($summary.global.total_failed)"
Write-Host "Baselines: $($summary.global.baseline_works) auteurs"
Write-Host "SHA256   : $($summary.sha256.Substring(0,24))"
