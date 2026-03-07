# OMEGA - PIERRE DE ROSETTE v2.1 - Run P1 (Proust APEX)
# Troisieme pole - ramification, tenue longue, flux maîtrisé
# Usage: $env:ANTHROPIC_API_KEY = "sk-ant-..."; powershell -ExecutionPolicy Bypass -File run_pierre_rosette_P1.ps1

$ROOT = "C:\Users\elric\omega-project"

$candidates = @(
    "$ROOT\omega-autopsie\scenes_v4\proust\Du_cote_de_chez_APEX.txt",
    "$ROOT\omega-autopsie\scenes_v4\proust\Du_côté_de_chez_APEX.txt",
    "$ROOT\omega-autopsie\scenes_v4\proust\Du_c_t__de_chez_APEX.txt"
)
$extractPath = $null
foreach ($c in $candidates) { if (Test-Path $c) { $extractPath = $c; break } }
if (-not $extractPath) {
    $found = Get-ChildItem "$ROOT\omega-autopsie\scenes_v4\proust\" -ErrorAction SilentlyContinue |
             Where-Object { $_.Name -like "*APEX*" } | Select-Object -First 1
    if ($found) { $extractPath = $found.FullName }
}
if (-not $extractPath) {
    $found = Get-ChildItem "$ROOT\omega-autopsie\scenes_v4\" -Recurse -ErrorAction SilentlyContinue |
             Where-Object { $_.Name -like "*Proust*APEX*" -or ($_.Name -like "*cote*" -and $_.Name -like "*APEX*") } |
             Select-Object -First 1
    if ($found) { $extractPath = $found.FullName }
}
if (-not $extractPath) { Write-Error "Fichier Proust APEX introuvable"; exit 1 }
Write-Output "Fichier trouve: $extractPath"

& powershell -ExecutionPolicy Bypass -File "$ROOT\run_pierre_rosette_GENERIC.ps1" `
    -ExtractPath $extractPath `
    -AuthorLabel "Marcel Proust - Du cote de chez Swann - APEX" `
    -OutputPath  "$ROOT\PIERRE_ROSETTE_P1_RESULTS.txt"
