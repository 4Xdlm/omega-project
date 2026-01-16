param([string]$SessionFile)

if (-not (Test-Path $SessionFile)) {
  Write-Host "Session file not found" -ForegroundColor Red
  exit 1
}

$content = Get-Content $SessionFile -Raw

if ($content -notmatch "Phase Declaration") {
  Write-Host "ERROR: Phase Declaration missing" -ForegroundColor Red
  exit 1
}

if ($content -match "Phase Number\s*:\s*$") {
  Write-Host "ERROR: Phase Number is empty" -ForegroundColor Red
  exit 1
}

Write-Host "Phase declaration OK" -ForegroundColor Green
exit 0
