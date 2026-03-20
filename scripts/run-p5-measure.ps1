# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — P5 COPIE + MESURE AUTOMATIQUE (Riviera/Claude Code)
# ═══════════════════════════════════════════════════════════════════════════════
#
# 1. Copie TOUS les .txt de "test ecriture IA" vers p5_test
# 2. Mesure TOUS les fichiers avec text-features + R6
#
# Usage : .\scripts\run-p5-measure.ps1
# ═══════════════════════════════════════════════════════════════════════════════

$SRC = "C:\Users\elric\Downloads\test ecriture IA"
$DST = "C:\Users\elric\omega-project\omega-autopsie\results_rosetta\s0\p5_test"

# Crée le dossier cible si nécessaire
if (-not (Test-Path $DST)) { New-Item -ItemType Directory -Path $DST -Force | Out-Null }

Write-Host ""
Write-Host "═══ COPIE ═══" -ForegroundColor Cyan

$files = Get-ChildItem -Path $SRC -Filter "*.txt"
Write-Host "  $($files.Count) fichiers dans source" -ForegroundColor Yellow
foreach ($f in $files) {
    # Nettoie le nom : espaces → underscores, minuscules
    $cleanName = $f.Name.ToLower() -replace '\s+', '_'
    $dest = Join-Path $DST $cleanName
    Copy-Item -Path $f.FullName -Destination $dest -Force
    Write-Host "  [OK] $($f.Name) -> $cleanName ($([math]::Round($f.Length/1024, 1)) KB)" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══ FICHIERS DANS p5_test ═══" -ForegroundColor Cyan
Get-ChildItem -Path $DST -Filter "*.txt" | Sort-Object Name | ForEach-Object {
    Write-Host "  $($_.Name)  $([math]::Round($_.Length/1024, 1)) KB"
}

Write-Host ""
Write-Host "═══ MESURE ═══" -ForegroundColor Cyan
Set-Location "C:\Users\elric\omega-project\packages\sovereign-engine"
npx tsx scripts/measure-p5.ts
