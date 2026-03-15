# ============================================================
# OMEGA — CC-STEP-3 Deploy & Run
# Etudes E4 (Van Peer 2008) + E5 (Miall&Kuiken 1998) + Graesser 1994 + F19v4
# ============================================================

$base = "C:\Users\elric\omega-project\omega-autopsie"
$zip  = "C:\Users\elric\Downloads\omega_corpus_cc3_v1.zip"

# COMMANDE 1 — Extraire les fichiers v4
Expand-Archive -Path $zip -DestinationPath $base -Force

Write-Host "Fichiers extraits OK"
