Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Run($cmd, $label) {
  Write-Host "
> $label" -ForegroundColor Cyan
  Write-Host $cmd -ForegroundColor DarkGray
  & powershell -NoProfile -ExecutionPolicy Bypass -Command $cmd
  if ($LASTEXITCODE -ne 0) { throw "$label failed (exit=$LASTEXITCODE)" }
}

$RepoPath = 'C:\Users\elric\omega-project'
Set-Location $RepoPath

$dePkg = Join-Path $RepoPath 'packages\decision-engine\package.json'
$deCfg = Join-Path $RepoPath 'packages\decision-engine\vitest.config.ts'

if (!(Test-Path $dePkg)) { throw 'decision-engine package.json missing' }
if (!(Test-Path $deCfg)) { throw 'decision-engine vitest.config.ts missing' }

# Patch decision-engine package.json scripts
$pkg = Get-Content $dePkg -Raw | ConvertFrom-Json
if (-not $pkg.PSObject.Properties.Match('scripts')) {
  $pkg | Add-Member -NotePropertyName scripts -NotePropertyValue (@{})
}
$pkg.scripts.test = 'vitest run --config vitest.config.ts --root .'
$pkg.scripts.typecheck = 'tsc -p tsconfig.json --noEmit'
($pkg | ConvertTo-Json -Depth 50) | Out-File -Encoding UTF8 -NoNewline $dePkg

# Ensure vitest config has root: __dirname
$cfg = Get-Content $deCfg -Raw
if ($cfg -notmatch 'root:\s*__dirname') {
  if ($cfg -match 'defineConfig\(\{\s*test:\s*\{') {
    $cfg = [regex]::Replace($cfg, 'defineConfig\(\{\s*test:\s*\{', "defineConfig({
  root: __dirname,
  test: {", 1)
  } elseif ($cfg -match 'defineConfig\(\{') {
    $cfg = [regex]::Replace($cfg, 'defineConfig\(\{', "defineConfig({
  root: __dirname,", 1)
  } else {
    throw 'Unexpected vitest.config.ts format'
  }
  $cfg | Out-File -Encoding UTF8 -NoNewline $deCfg
}

# Add decision-engine to root vitest workspace if a workspace file exists
$wsCandidates = @('vitest.workspace.ts','vitest.workspace.mts','vitest.workspace.js','vitest.workspace.mjs')
$ws = $wsCandidates | Where-Object { Test-Path (Join-Path $RepoPath $_) } | Select-Object -First 1

if ($ws) {
  $wsPath = Join-Path $RepoPath $ws
  $wsTxt = Get-Content $wsPath -Raw
  $projPath = 'packages/decision-engine/vitest.config.ts'

  if ($wsTxt -notmatch [regex]::Escape($projPath)) {
    if ($wsTxt -match 'projects\s*:\s*\[') {
      $wsTxt = [regex]::Replace($wsTxt, 'projects\s*:\s*\[', "projects: [
  '$projPath',", 1)
      $wsTxt | Out-File -Encoding UTF8 -NoNewline $wsPath
    } else {
      throw ("vitest workspace file found but no projects[]: " + $ws)
    }
  }
}

Write-Host "
--- WORKSPACE decision-engine tests (must NOT show 202/4941) ---" -ForegroundColor Cyan
Run "cd '$RepoPath'; npm test --workspace=@omega/decision-engine" "workspace @omega/decision-engine tests"

Write-Host "
--- BASELINE full tests (must PASS) ---" -ForegroundColor Cyan
Run "cd '$RepoPath'; npm test" "baseline full tests"

Write-Host "
OK: wiring patched and tests executed" -ForegroundColor Green