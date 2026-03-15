# ═══════════════════════════════════════════════════════════════════════
# OMEGA — CC-STEP-2 : Corpus Contemporain
# ═══════════════════════════════════════════════════════════════════════

$PROJECT = "C:\Users\elric\omega-project\omega-autopsie"
$LIVRES  = "C:\Users\elric\Downloads\livres_payants"
$ZIP     = "C:\Users\elric\Downloads\omega_corpus_cc2_v1.zip"

# 1. Extraire et copier le script
Expand-Archive -Path $ZIP -DestinationPath "$PROJECT\cc_step2" -Force
Copy-Item "$PROJECT\cc_step2\cc_step2_contemporain.py" $PROJECT -Force

# 2. Activer l'environnement
cd $PROJECT
.\.venv\Scripts\Activate.ps1

# 3. Installer pymupdf si absent
pip install pymupdf --quiet

# 4. Lancer CC-STEP-2 (passe le chemin des PDFs en argument)
python cc_step2_contemporain.py "$LIVRES"

# 5. Afficher résultats
$summary = Get-Content "results_cc2\00_MASTER_SUMMARY_CC2.json" | ConvertFrom-Json
Write-Host ""
Write-Host "=== CC-STEP-2 RÉSULTATS ===" -ForegroundColor Cyan
Write-Host "Traités  : $($summary.global.total_processed)"
Write-Host "Baselines: $($summary.authors.Count) œuvres"
Write-Host "SHA256   : $($summary.sha256.Substring(0,24))"
