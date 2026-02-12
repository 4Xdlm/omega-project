# OMEGA — PR-1 CONCURRENCY TEST (10 PARALLEL WRITERS)
param(
    [int]$Workers = 10
)

$ErrorActionPreference = "Stop"
$rootDir = "C:\Users\elric\omega-project"
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$fullCacheDir = Join-Path $rootDir ".test-cache-concurrent"
$fullOutputDir = Join-Path $rootDir "metrics\pr\PR_RUNS\concurrency10_$ts"

Write-Host "=== OMEGA PR-1 CONCURRENCY TEST ===" -ForegroundColor Cyan
Write-Host "Workers: $Workers"
Write-Host ""

# Cleanup
if (Test-Path $fullCacheDir) { Remove-Item -Recurse -Force $fullCacheDir }
New-Item -ItemType Directory -Path $fullCacheDir | Out-Null
New-Item -ItemType Directory -Path $fullOutputDir -Force | Out-Null

# Write worker to TEMP as .cjs (outside ESM project scope)
$workerPath = Join-Path $env:TEMP "omega_concurrent_worker.cjs"

$workerCode = @'
const fs = require('fs');
const path = require('path');

const workerId = process.argv[2];
const cacheDir = process.argv[3];
const filePath = path.join(cacheDir, 'concurrent-test.json');
const lockPath = filePath + '.lock';

function acquireLock() {
    const start = Date.now();
    while (true) {
        try {
            fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
            return;
        } catch (e) {
            try {
                const stat = fs.statSync(lockPath);
                if (Date.now() - stat.mtimeMs > 30000) {
                    fs.unlinkSync(lockPath);
                    continue;
                }
            } catch (_) {}
            if (Date.now() - start > 10000) throw new Error('Lock timeout');
            const end = Date.now() + 50;
            while (Date.now() < end) {}
        }
    }
}

try {
    acquireLock();
    const data = JSON.stringify({ writer_id: workerId, timestamp: Date.now(), pid: process.pid }, null, 2);
    const tmpPath = filePath + '.tmp.' + process.pid;
    fs.writeFileSync(tmpPath, data, 'utf-8');
    fs.renameSync(tmpPath, filePath);
    try { fs.unlinkSync(lockPath); } catch (_) {}
    console.log('SUCCESS:' + workerId);
    process.exit(0);
} catch (err) {
    try { fs.unlinkSync(lockPath); } catch (_) {}
    console.error('FAIL:' + workerId + ':' + err.message);
    process.exit(1);
}
'@

Set-Content -Path $workerPath -Value $workerCode -Encoding UTF8
Write-Host "Worker: $workerPath"
Write-Host "Spawning $Workers concurrent writers..." -ForegroundColor Yellow

$jobs = @()
for ($i = 1; $i -le $Workers; $i++) {
    $job = Start-Job -ScriptBlock {
        param($w, $id, $cd)
        & node $w $id $cd 2>&1
    } -ArgumentList $workerPath, $i, $fullCacheDir
    $jobs += $job
}

$jobs | Wait-Job -Timeout 60 | Out-Null

$successes = 0
$failures = 0
foreach ($job in $jobs) {
    $out = (Receive-Job -Job $job 2>&1 | Out-String).Trim()
    if ($out -match "SUCCESS") {
        $successes++
        Write-Host "  Worker $($out -replace 'SUCCESS:',''): OK" -ForegroundColor Green
    } else {
        $failures++
        Write-Host "  $out" -ForegroundColor Red
    }
    Remove-Job -Job $job -Force
}

Write-Host ""
Write-Host "Results: $successes/$Workers success, $failures failures"

# Cache integrity
$cacheFile = Join-Path $fullCacheDir "concurrent-test.json"
$cacheValid = $false
if (Test-Path $cacheFile) {
    try {
        $null = Get-Content $cacheFile -Raw | ConvertFrom-Json
        $cacheValid = $true
        Write-Host "Cache JSON: VALID" -ForegroundColor Green
    } catch {
        Write-Host "Cache JSON: CORRUPT" -ForegroundColor Red
    }
} else {
    Write-Host "Cache JSON: MISSING" -ForegroundColor Red
}

$lockCount = @(Get-ChildItem $fullCacheDir -Filter "*.lock" -EA SilentlyContinue).Count
$tmpCount = @(Get-ChildItem $fullCacheDir -Filter "*.tmp.*" -EA SilentlyContinue).Count
Write-Host "Residual locks: $lockCount | tmps: $tmpCount"

$verdict = if ($successes -eq $Workers -and $cacheValid -and $lockCount -eq 0 -and $tmpCount -eq 0) { "PASS" } else { "FAIL" }
Write-Host ""
Write-Host "=== VERDICT: $verdict ===" -ForegroundColor $(if ($verdict -eq "PASS") { "Green" } else { "Red" })

# Report
$report = @{ schema_version="PR-CONCURRENCY-1.0"; timestamp=(Get-Date -Format "o"); workers=$Workers; successes=$successes; failures=$failures; cache_valid=$cacheValid; residual_locks=$lockCount; residual_tmps=$tmpCount; verdict=$verdict } | ConvertTo-Json
$reportPath = Join-Path $fullOutputDir "concurrency10.report.json"
[System.IO.File]::WriteAllText($reportPath, $report, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Report: $reportPath"

Remove-Item $workerPath -Force -EA SilentlyContinue
exit $(if ($verdict -eq "PASS") { 0 } else { 1 })
