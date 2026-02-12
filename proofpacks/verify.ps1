# OMEGA Proof Pack Verification Script (PowerShell)
# Pack ID: stress100-1770905645240
# Generated: 2026-02-12T14:14:05.240Z

Write-Host "=== OMEGA Proof Pack Verification ===" -ForegroundColor Cyan
Write-Host "Pack ID: stress100-1770905645240"
Write-Host "Run Type: stress100"
Write-Host "Verdict: PASS"
Write-Host ""

# Verify SHA256SUMS
Write-Host "Verifying file integrity..." -ForegroundColor Yellow
$sums = Get-Content SHA256SUMS.txt

foreach ($line in $sums) {
  if ($line -match '^([a-f0-9]{64})  (.+)$') {
    $expectedHash = $matches[1]
    $file = $matches[2]

    if (Test-Path $file) {
      $actualHash = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()

      if ($actualHash -eq $expectedHash) {
        Write-Host "✓ $file" -ForegroundColor Green
      } else {
        Write-Host "✗ $file (hash mismatch)" -ForegroundColor Red
        exit 1
      }
    } else {
      Write-Host "✗ $file (not found)" -ForegroundColor Red
      exit 1
    }
  }
}

Write-Host ""
Write-Host "✓ All files verified successfully" -ForegroundColor Green

Write-Host ""
Write-Host "=== Toolchain ===" -ForegroundColor Cyan
Get-Content toolchain.json | ConvertFrom-Json | Format-List

Write-Host "Verification complete." -ForegroundColor Green
