# OMEGA - PIERRE DE ROSETTE v2.1 - Run C2 (Camus INCIPIT)
# Validation stabilite intra-auteur Camus
# Usage: $env:ANTHROPIC_API_KEY = "sk-ant-..."; powershell -ExecutionPolicy Bypass -File run_pierre_rosette_C2.ps1

$ROOT = "C:\Users\elric\omega-project"

# Cherche le fichier Camus INCIPIT
$candidates = @(
    "$ROOT\omega-autopsie\scenes_v4\camus\L_Etranger_INCIPIT.txt",
    "$ROOT\omega-autopsie\scenes_v4\camus\L'Etranger_INCIPIT.txt",
    "$ROOT\omega-autopsie\scenes_v4\camus\L'Etranger_INCIPIT.txt"
)
$extractPath = $null
foreach ($c in $candidates) {
    if (Test-Path $c) { $extractPath = $c; break }
}
if (-not $extractPath) {
    $found = Get-ChildItem "$ROOT\omega-autopsie\scenes_v4\camus\" | Where-Object { $_.Name -like "*INCIPIT*" } | Select-Object -First 1
    if ($found) { $extractPath = $found.FullName }
}
if (-not $extractPath) { Write-Error "Fichier Camus INCIPIT introuvable"; exit 1 }
Write-Output "Fichier trouve: $extractPath"

& powershell -ExecutionPolicy Bypass -File "$ROOT\run_pierre_rosette_GENERIC.ps1" `
    -ExtractPath $extractPath `
    -AuthorLabel "Albert Camus - L Etranger - INCIPIT" `
    -OutputPath  "$ROOT\PIERRE_ROSETTE_C2_RESULTS.txt"
