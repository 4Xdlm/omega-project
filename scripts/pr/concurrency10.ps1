# OMEGA — PR-1 CONCURRENCY TEST (10 PARALLEL WRITERS)
# Tests atomic cache locking with 10 simultaneous processes writing to same cache key

param(
    [int]$Workers = 10,
    [string]$CacheDir = ".test-cache-concurrent",
    [string]$OutputDir = "metrics/pr/PR_RUNS/concurrency10_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

$ErrorActionPreference = "Stop"

Write-Host "=== OMEGA PR-1 CONCURRENCY TEST ===" -ForegroundColor Cyan
Write-Host "Workers: $Workers"
Write-Host "Cache Dir: $CacheDir"
Write-Host "Output Dir: $OutputDir"
Write-Host ""

# Cleanup previous test
if (Test-Path $CacheDir) {
    Remove-Item -Recurse -Force $CacheDir
}
New-Item -ItemType Directory -Path $CacheDir | Out-Null
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# Worker script (inline)
$workerScript = @"
const { writeCacheAtomic } = require('./packages/scribe-engine/dist/pr/atomic-cache.js');
const workerId = process.argv[2];
const cacheDir = process.argv[3];
const filePath = `\${cacheDir}/concurrent-test.json`;

const data = {
    writer_id: workerId,
    timestamp: Date.now(),
    random: Math.random()
};

try {
    writeCacheAtomic(filePath, data);
    console.log(`Worker \${workerId}: SUCCESS`);
    process.exit(0);
} catch (err) {
    console.error(`Worker \${workerId}: FAIL - \${err.message}`);
    process.exit(1);
}
"@

$workerPath = Join-Path $CacheDir "worker.js"
Set-Content -Path $workerPath -Value $workerScript

Write-Host "Spawning $Workers concurrent writers..." -ForegroundColor Yellow

$jobs = @()
for ($i = 1; $i -le $Workers; $i++) {
    $job = Start-Job -ScriptBlock {
        param($workerId, $workerPath, $cacheDir)
        node $workerPath $workerId $cacheDir
    } -ArgumentList $i, $workerPath, $CacheDir
    $jobs += $job
}

Write-Host "Waiting for workers to complete..." -ForegroundColor Yellow
$jobs | Wait-Job | Out-Null

$successes = 0
$failures = 0

foreach ($job in $jobs) {
    $output = Receive-Job -Job $job
    Write-Host $output

    if ($job.State -eq "Completed") {
        $successes++
    } else {
        $failures++
    }

    Remove-Job -Job $job
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Successes: $successes / $Workers" -ForegroundColor Green
Write-Host "Failures: $failures / $Workers" -ForegroundColor $(if ($failures -eq 0) { "Green" } else { "Red" })

# Check for residual lock files
$lockFiles = Get-ChildItem -Path $CacheDir -Filter "*.lock" -ErrorAction SilentlyContinue
$tmpFiles = Get-ChildItem -Path $CacheDir -Filter "*.tmp*" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Residual .lock files: $($lockFiles.Count)" -ForegroundColor $(if ($lockFiles.Count -eq 0) { "Green" } else { "Red" })
Write-Host "Residual .tmp files: $($tmpFiles.Count)" -ForegroundColor $(if ($tmpFiles.Count -eq 0) { "Green" } else { "Red" })

# Validate final cache file
$cachePath = Join-Path $CacheDir "concurrent-test.json"
if (Test-Path $cachePath) {
    try {
        $content = Get-Content $cachePath -Raw | ConvertFrom-Json
        Write-Host "Final cache file: VALID JSON" -ForegroundColor Green
        Write-Host "  Writer ID: $($content.writer_id)"
    } catch {
        Write-Host "Final cache file: CORRUPT JSON" -ForegroundColor Red
        $failures++
    }
} else {
    Write-Host "Final cache file: NOT FOUND" -ForegroundColor Red
    $failures++
}

# Generate report
$report = @{
    schema_version = "CONCURRENCY10-1.0"
    workers = $Workers
    successes = $successes
    failures = $failures
    residual_locks = $lockFiles.Count
    residual_tmps = $tmpFiles.Count
    cache_valid = (Test-Path $cachePath)
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    verdict = if ($failures -eq 0 -and $lockFiles.Count -eq 0 -and $tmpFiles.Count -eq 0) { "PASS" } else { "FAIL" }
}

$reportPath = Join-Path $OutputDir "concurrency10-report.json"
$report | ConvertTo-Json | Set-Content $reportPath

Write-Host ""
Write-Host "=== VERDICT: $($report.verdict) ===" -ForegroundColor $(if ($report.verdict -eq "PASS") { "Green" } else { "Red" })
Write-Host "Report: $reportPath"

if ($report.verdict -eq "FAIL") {
    exit 1
}

exit 0
