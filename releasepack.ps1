$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Die($msg) { Write-Host "FATAL: $msg" -ForegroundColor Red; exit 1 }

$repo = "C:\Users\elric\omega-project"
if (-not (Test-Path $repo)) { Die "Repo introuvable: $repo" }

Push-Location $repo
try {
  Write-Host "== OMEGA RELEASEPACK ==" -ForegroundColor Cyan

  $status = (& "C:\Program Files\Git\cmd\git.exe" status --porcelain)
  if ($status -ne $null -and $status.Trim().Length -gt 0) {
    Write-Host $status
    Die "Working tree pas clean. Commit/stash avant de packager."
  }

  $head = (& "C:\Program Files\Git\cmd\git.exe" rev-parse HEAD).Trim()
  $short = (& "C:\Program Files\Git\cmd\git.exe" rev-parse --short HEAD).Trim()
  Write-Host "HEAD: $head" -ForegroundColor Green

  $tagsOnHead = (& "C:\Program Files\Git\cmd\git.exe" tag --points-at HEAD) -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
  $preferred = $tagsOnHead | Where-Object { $_ -eq "v3.0.0-art" } | Select-Object -First 1
  $tag = if ($preferred) { $preferred } else { ($tagsOnHead | Select-Object -First 1) }
  if (-not $tag) { $tag = "untagged" }
  Write-Host "TAG: $tag" -ForegroundColor Yellow

  Write-Host "`n-- Tests sovereign-engine (vitest) --" -ForegroundColor Cyan
  $pkg = Join-Path $repo "packages\sovereign-engine"
  if (-not (Test-Path $pkg)) { Die "Package introuvable: $pkg" }

  Push-Location $pkg
  try { npm test } finally { Pop-Location }

  Write-Host "`n-- Verif preuve disque (RULE-SEAL-01) --" -ForegroundColor Cyan
  $seal1 = Join-Path $pkg "proofpacks\sprint-20\Sprint20_SEAL_REPORT.md"
  $seal2 = Join-Path $pkg "proofpacks\sprint-20\20.6\npm_test.txt"
  if (-not (Test-Path $seal1)) { Die "Manque: $seal1" }
  if (-not (Test-Path $seal2)) { Die "Manque: $seal2" }
  if ((Get-Item $seal1).Length -le 0) { Die "Fichier vide: $seal1" }
  if ((Get-Item $seal2).Length -le 0) { Die "Fichier vide: $seal2" }
  Write-Host "Proofpacks OK" -ForegroundColor Green

  Write-Host "`n-- Staging + ZIP --" -ForegroundColor Cyan
  $dl = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
  $outDir = Join-Path $dl ("OMEGA_ART_RELEASE_{0}_{1}" -f $tag, $short)
  if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
  New-Item -ItemType Directory -Path $outDir | Out-Null

  $include = @(
    "packages\sovereign-engine\proofpacks",
    "packages\sovereign-engine\docs",
    "packages\sovereign-engine\src",
    "packages\sovereign-engine\tests",
    "packages\sovereign-engine\package.json",
    "packages\sovereign-engine\tsconfig.json",
    "package.json",
    "README.md",
    ".gitignore"
  )

  $manifestPath = Join-Path $outDir "manifest.txt"
  "OMEGA ART ReleasePack" | Out-File $manifestPath -Encoding UTF8
  ("TAG={0}" -f $tag) | Out-File $manifestPath -Append -Encoding UTF8
  ("HEAD={0}" -f $head) | Out-File $manifestPath -Append -Encoding UTF8
  ("DATE_UTC={0}" -f ([DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"))) | Out-File $manifestPath -Append -Encoding UTF8
  "" | Out-File $manifestPath -Append -Encoding UTF8

  foreach ($item in $include) {
    $src = Join-Path $repo $item
    if (Test-Path $src) {
      $dst = Join-Path $outDir $item
      $dstParent = Split-Path $dst -Parent
      if (-not (Test-Path $dstParent)) { New-Item -ItemType Directory -Path $dstParent -Force | Out-Null }
      if ((Get-Item $src).PSIsContainer) { Copy-Item -Recurse -Force $src $dst }
      else { Copy-Item -Force $src $dst }
      ("OK  {0}" -f $item) | Out-File $manifestPath -Append -Encoding UTF8
    } else {
      ("SKIP {0}" -f $item) | Out-File $manifestPath -Append -Encoding UTF8
    }
  }

  $zipPath = Join-Path $dl ("OMEGA_ART_RELEASE_{0}_{1}.zip" -f $tag, $short)
  if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
  Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zipPath -Force

  $shaPath = $zipPath + ".sha256"
  $hash = (Get-FileHash -Algorithm SHA256 -Path $zipPath).Hash.ToLower()
  ("{0}  {1}" -f $hash, (Split-Path $zipPath -Leaf)) | Out-File $shaPath -Encoding ASCII

  Write-Host "`nDONE" -ForegroundColor Green
  Write-Host ("ZIP:    {0}" -f $zipPath)
  Write-Host ("SHA256: {0}" -f $shaPath)
  Write-Host ("TAG:    {0} / {1}" -f $short, $tag)

} finally { Pop-Location }
