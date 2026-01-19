# ═════════════════════════════════════════════════════════════════════
# OMEGA AUTO-FINISH v1.1 — Verification Script (CORRIG)
# Standard: NASA-Grade L4
# ═════════════════════════════════════════════════════════════════════

param(
    [string]$ZipPath = "OMEGA_AUTO_FINISH_v1.1_20260119.zip",
    [string]$ExpectedHash = "098EC10817631F9EFCB34F8443B2031D16C9657317AE206DF76C172EE678A960"
)

Write-Host "═══════════════════════════════════════════════════════"
Write-Host "OMEGA AUTO-FINISH v1.1 — VERIFICATION (CORRIG)"
Write-Host "═══════════════════════════════════════════════════════"
Write-Host ""

# 1. Verify ZIP hash
Write-Host "1. Verifying ZIP integrity..."
$ActualHash = (Get-FileHash -Algorithm SHA256 $ZipPath).Hash
if ($ActualHash -ne $ExpectedHash) {
    Write-Host "FAIL: Hash mismatch" -ForegroundColor Red
    Write-Host "   Expected: $ExpectedHash"
    Write-Host "   Actual:   $ActualHash"
    exit 1
}
Write-Host "ZIP integrity OK" -ForegroundColor Green
Write-Host ""

# 2. Extract
Write-Host "2. Extracting..."
$ExtractPath = "omega-auto-finish-v1.1-verify"
if (Test-Path $ExtractPath) {
    Remove-Item -Recurse -Force $ExtractPath
}
Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
Write-Host "Extracted to $ExtractPath" -ForegroundColor Green
Write-Host ""

# 3. Install dependencies and run tests
Write-Host "3. Installing dependencies and running tests..."
Write-Host ""

$modules = @(
    @{Name="ledger"; Path="nexus/ledger"},
    @{Name="atlas"; Path="nexus/atlas"},
    @{Name="raw"; Path="nexus/raw"},
    @{Name="proof-utils"; Path="nexus/proof-utils"}
)

$allPassed = $true

foreach ($module in $modules) {
    $modulePath = Join-Path $ExtractPath $module.Path
    Write-Host "  Testing $($module.Name)..." -NoNewline

    Push-Location $modulePath
    try {
        npm install --silent 2>$null | Out-Null
        $testResult = npm test 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " PASS" -ForegroundColor Green
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            Write-Host $testResult
            $allPassed = $false
        }
    } finally {
        Pop-Location
    }
}

Write-Host ""

# 4. Final status
Write-Host "═══════════════════════════════════════════════════════"
if ($allPassed) {
    Write-Host "VERIFICATION COMPLETE v1.1 — ALL PASS (CORRIG)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "VERIFICATION FAILED — SEE ERRORS ABOVE" -ForegroundColor Red
    exit 1
}
Write-Host "═══════════════════════════════════════════════════════"
