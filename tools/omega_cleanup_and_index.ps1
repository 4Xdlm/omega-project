<#
================================================================
  OMEGA - NETTOYAGE PHASE 1 + INDEX DOCUMENTAIRE DETERMINISTE
  Version: 1.0
  Standard: NASA-Grade L4
================================================================
#>

param(
  [string]$RepoRoot = "C:\Users\elric\omega-project",
  [switch]$SkipCleanup,
  [switch]$SkipIndex,
  [switch]$SkipTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $RepoRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  OMEGA - NETTOYAGE + INDEXATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ================================================================
# PHASE 1 - NETTOYAGE SAFE
# ================================================================

if (-not $SkipCleanup) {
  Write-Host "[PHASE 1] Nettoyage des artefacts generes..." -ForegroundColor Yellow

  $dirsToRemove = @("coverage", "dist", "out", ".warmup", ".claude")
  foreach ($d in $dirsToRemove) {
    $p = Join-Path $RepoRoot $d
    if (Test-Path $p) {
      $size = [math]::Round((Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB, 1)
      Remove-Item -Recurse -Force $p
      Write-Host "  [DEL] $d/ ($size MB)" -ForegroundColor Red
    }
  }

  $filesToRemove = @(
    "crystal_proof_100.log",
    "gateway_resilience.log",
    "dump_analysis.json",
    "test_output.txt",
    "test_input.txt",
    "fix_export.txt",
    "nul",
    "vitest_config.ts",
    "scan_baseline_run1.json",
    "scan_baseline_run1.log",
    "scan_baseline_run2.json",
    "scan_baseline_run2.log",
    "scan_baseline_run3.json",
    "scan_baseline_run3.log"
  )
  foreach ($f in $filesToRemove) {
    $p = Join-Path $RepoRoot $f
    if (Test-Path $p) {
      $kb = [math]::Round((Get-Item $p).Length / 1KB, 1)
      Remove-Item -Force $p
      Write-Host "  [DEL] $f ($kb KB)" -ForegroundColor Red
    }
  }

  Get-ChildItem -Path (Join-Path $RepoRoot "nexus\blueprint") -Filter "*.zip" -ErrorAction SilentlyContinue | ForEach-Object {
    $kb = [math]::Round($_.Length / 1KB, 1)
    Remove-Item -Force $_.FullName
    Write-Host "  [DEL] nexus/blueprint/$($_.Name) ($kb KB)" -ForegroundColor Red
  }
  Get-ChildItem -Path (Join-Path $RepoRoot "nexus\standards") -Filter "*.zip" -ErrorAction SilentlyContinue | ForEach-Object {
    $kb = [math]::Round($_.Length / 1KB, 1)
    Remove-Item -Force $_.FullName
    Write-Host "  [DEL] nexus/standards/$($_.Name) ($kb KB)" -ForegroundColor Red
  }
  @("EXPORT_FULL_PACK_30_60.zip","OMEGA_GATEWAY_DOCS_v2.5.0.zip") | ForEach-Object {
    $p = Join-Path $RepoRoot $_
    if (Test-Path $p) {
      Remove-Item -Force $p
      Write-Host "  [DEL] $_ (root ZIP)" -ForegroundColor Red
    }
  }

  Write-Host ""
  Write-Host "[PHASE 1] Nettoyage termine." -ForegroundColor Green
  Write-Host ""
}

# ================================================================
# GATE - npm test
# ================================================================

if (-not $SkipTests) {
  Write-Host "[GATE] Execution npm test..." -ForegroundColor Yellow
  & npm test
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[GATE] FAIL - npm test a echoue" -ForegroundColor Red
    exit 1
  }
  Write-Host "[GATE] PASS - npm test reussi" -ForegroundColor Green
  Write-Host ""
}

# ================================================================
# PHASE 2 - INDEX DOCUMENTAIRE DETERMINISTE
# ================================================================

if (-not $SkipIndex) {
  Write-Host "[PHASE 2] Generation de l'index documentaire..." -ForegroundColor Yellow

  $excludeDirs = @("node_modules",".git","dist","coverage","out",".warmup",".claude")
  $includeExt = @(".md",".txt",".json",".yaml",".yml",".sha256",".ps1",".ndjson",".jsonl",".mmd",".mjs",".proof")

  $outDir = Join-Path $RepoRoot "docs\INDEX"
  New-Item -Force -ItemType Directory $outDir | Out-Null

  function Test-ExcludedPath([string]$fullPath) {
    foreach ($d in $excludeDirs) {
      if ($fullPath -match ("[\\/]" + [Regex]::Escape($d) + "([\\/]|$)")) { return $true }
    }
    return $false
  }

  function Get-Category([string]$rel) {
    if ($rel -like "sessions/*")               { return "SESSION_SAVES" }
    if ($rel -like "evidence/*")               { return "EVIDENCE" }
    if ($rel -like "certificates/*")           { return "CERTIFICATES" }
    if ($rel -like "nexus/proof/*")            { return "PROOF" }
    if ($rel -like "nexus/blueprint/*")        { return "BLUEPRINT" }
    if ($rel -like "nexus/standards/*")        { return "STANDARDS" }
    if ($rel -like "nexus/ledger/*")           { return "LEDGER" }
    if ($rel -like "nexus/bench/*")            { return "BENCHMARKS" }
    if ($rel -like "packages/*/tests/*")       { return "TESTS" }
    if ($rel -like "packages/*/src/*")         { return "PACKAGES_SRC" }
    if ($rel -like "packages/*")               { return "PACKAGES" }
    if ($rel -like "gateway/*")                { return "GATEWAY" }
    if ($rel -like "genesis-forge/*")          { return "GENESIS_FORGE" }
    if ($rel -like "src/*")                    { return "SRC_LEGACY" }
    if ($rel -like "docs/*")                   { return "DOCS" }
    if ($rel -like "tools/*")                  { return "TOOLS" }
    if ($rel -like "GOVERNANCE/*")             { return "GOVERNANCE" }
    if ($rel -like "ROADMAP/*")                { return "ROADMAP" }
    if ($rel -like "config/*")                 { return "CONFIG" }
    if ($rel -like "scripts/*")                { return "SCRIPTS" }
    if ($rel -like "manifests/*")              { return "MANIFESTS" }
    if ($rel -like "archives/*")               { return "ARCHIVES" }
    if ($rel -like "history/*")                { return "HISTORY" }
    if ($rel -like "schemas/*")                { return "SCHEMAS" }
    if ($rel -like ".ci/*")                    { return "CI" }
    if ($rel -like ".github/*")                { return "CI" }
    if ($rel -like "OMEGA_PHASE*")             { return "LEGACY_PHASES" }
    if ($rel -like "omega-phase*")             { return "LEGACY_PHASES" }
    if ($rel -like "sprint*")                  { return "LEGACY_PHASES" }
    if ($rel -like "OMEGA_MASTER_DOSSIER*")    { return "LEGACY_DOSSIERS" }
    if ($rel -like "OMEGA_SENTINEL*")          { return "LEGACY_SENTINEL" }
    if ($rel -like "omega-ui*")                { return "LEGACY_UI" }
    if ($rel -like "omega-v44*")               { return "LEGACY_V44" }
    if ($rel -like "omega-nexus*")             { return "LEGACY_NEXUS" }
    if ($rel -like "omega-narrative*")         { return "LEGACY_NARRATIVE" }
    if ($rel -like "EXPORT_FULL*")             { return "LEGACY_EXPORTS" }
    if ($rel -like "apps/*")                   { return "APPS" }
    return "ROOT"
  }

  function Get-Importance([string]$rel) {
    $criticalFiles = @(
      "README.md","CLAUDE.md","CHANGELOG.md","package.json",
      "00_INDEX_MASTER.md","CERTIFICATION.md","FROZEN_MODULES.md",
      "LICENSE","SECURITY.md","POLICY.yml","RUNBOOK_GOLD.md",
      "SESSION_SAVE_20260205_CERTIFICATION_COMPLETE.md",
      "vitest.config.ts","tsconfig.json","tsconfig.base.json"
    )
    $name = Split-Path $rel -Leaf
    if ($criticalFiles -contains $name) { return "CRITICAL" }
    if ($rel -like "nexus/*") { return "HIGH" }
    if ($rel -like "packages/*") { return "HIGH" }
    if ($rel -like "sessions/*") { return "HIGH" }
    if ($rel -like "evidence/*") { return "MEDIUM" }
    if ($rel -like "certificates/*") { return "MEDIUM" }
    if ($rel -match "LEGACY") { return "LOW" }
    return "NORMAL"
  }

  Write-Host "  Scanning files..." -ForegroundColor Gray
  $allFiles = Get-ChildItem -Path $RepoRoot -Recurse -File | Where-Object {
    (-not (Test-ExcludedPath $_.FullName)) -and ($includeExt -contains $_.Extension.ToLower())
  }

  Write-Host "  Found $($allFiles.Count) documents. Computing SHA-256..." -ForegroundColor Gray

  $counter = 0
  $total = $allFiles.Count
  $items = foreach ($f in $allFiles) {
    $counter++
    if ($counter % 200 -eq 0) { Write-Host "  [$counter/$total]..." -ForegroundColor Gray }

    $rel = $f.FullName.Substring($RepoRoot.Length).TrimStart("\", "/") -replace "\\", "/"
    $cat = Get-Category $rel
    $imp = Get-Importance $rel

    $h = (Get-FileHash -Algorithm SHA256 -Path $f.FullName).Hash.ToLower()

    [pscustomobject]@{
      path       = $rel
      sha256     = $h
      bytes      = [int64]$f.Length
      category   = $cat
      importance = $imp
    }
  }

  $items = $items | Sort-Object -Property category, path

  Write-Host "  Generating JSON index..." -ForegroundColor Gray

  # JSON
  $jsonPath = Join-Path $outDir "OMEGA_DOCS_INDEX.json"
  $jsonObj = [ordered]@{
    schema_version = "1.0.0"
    generator      = "OMEGA doc-indexer v1.0"
    invariants     = @(
      "INV-IDX-01: deterministic sort (category then path)",
      "INV-IDX-02: excludes node_modules .git dist coverage out .warmup .claude",
      "INV-IDX-03: reproducible on same tree (no timestamps)",
      "INV-IDX-04: SHA-256 per file",
      "INV-IDX-05: zero timestamps in index"
    )
    summary        = [ordered]@{
      total_files  = $items.Count
      total_bytes  = ($items | Measure-Object -Property bytes -Sum).Sum
      categories   = @($items | Group-Object category | ForEach-Object {
        [ordered]@{ name = $_.Name; count = $_.Count; bytes = ($_.Group | Measure-Object bytes -Sum).Sum }
      })
    }
    documents = @($items | ForEach-Object {
      [ordered]@{ path = $_.path; sha256 = $_.sha256; bytes = $_.bytes; category = $_.category; importance = $_.importance }
    })
  }
  ($jsonObj | ConvertTo-Json -Depth 5) | Set-Content -Encoding UTF8 $jsonPath

  Write-Host "  Generating Markdown index..." -ForegroundColor Gray

  # MARKDOWN
  $mdPath = Join-Path $outDir "OMEGA_DOCS_INDEX.md"
  $sb = New-Object System.Text.StringBuilder

  [void]$sb.AppendLine("# OMEGA - INDEX DOCUMENTAIRE (SOURCE-OF-TRUTH)")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("**Document ID** : OMEGA-DOCS-INDEX-v1.0")
  [void]$sb.AppendLine("**Standard** : NASA-Grade L4")
  [void]$sb.AppendLine("**Invariants** : INV-IDX-01 a INV-IDX-05 (tri deterministe, SHA-256, zero timestamp)")
  [void]$sb.AppendLine("**Usage** : consulter cet index AVANT de scanner le repo.")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("---")
  [void]$sb.AppendLine("")

  $totalMB = [math]::Round(($items | Measure-Object bytes -Sum).Sum / 1MB, 2)
  [void]$sb.AppendLine("## Resume")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("| Metrique | Valeur |")
  [void]$sb.AppendLine("|----------|--------|")
  [void]$sb.AppendLine("| Documents indexes | $($items.Count) |")
  [void]$sb.AppendLine("| Taille totale | $totalMB MB |")
  $critCount = ($items | Where-Object { $_.importance -eq "CRITICAL" }).Count
  $highCount = ($items | Where-Object { $_.importance -eq "HIGH" }).Count
  [void]$sb.AppendLine("| Documents CRITICAL | $critCount |")
  [void]$sb.AppendLine("| Documents HIGH | $highCount |")
  [void]$sb.AppendLine("")

  [void]$sb.AppendLine("## Categories")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("| Categorie | Fichiers | MB |")
  [void]$sb.AppendLine("|-----------|-------:|----:|")

  $groups = $items | Group-Object category | Sort-Object Name
  foreach ($g in $groups) {
    $mb = [math]::Round(($g.Group | Measure-Object bytes -Sum).Sum / 1MB, 2)
    [void]$sb.AppendLine("| $($g.Name) | $($g.Count) | $mb |")
  }
  [void]$sb.AppendLine("")

  # CRITICAL docs
  [void]$sb.AppendLine("---")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("## Documents essentiels (CRITICAL)")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("| Fichier | KB | SHA-256 (16 car.) |")
  [void]$sb.AppendLine("|---------|---:|-------------------|")
  $critical = $items | Where-Object { $_.importance -eq "CRITICAL" } | Sort-Object path
  foreach ($c in $critical) {
    $kb = [math]::Round($c.bytes / 1KB, 1)
    $sh = $c.sha256.Substring(0, 16)
    [void]$sb.AppendLine("| ``$($c.path)`` | $kb | ``$sh`` |")
  }
  [void]$sb.AppendLine("")

  # Full listing by category
  [void]$sb.AppendLine("---")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("## Index complet par categorie")
  [void]$sb.AppendLine("")

  foreach ($g in $groups) {
    [void]$sb.AppendLine("### $($g.Name) ($($g.Count) fichiers)")
    [void]$sb.AppendLine("")

    if ($g.Count -le 50) {
      [void]$sb.AppendLine("| Fichier | KB | SHA-256 (16 car.) |")
      [void]$sb.AppendLine("|---------|---:|-------------------|")
      foreach ($it in ($g.Group | Sort-Object path)) {
        $kb = [math]::Round($it.bytes / 1KB, 1)
        $sh = $it.sha256.Substring(0, 16)
        [void]$sb.AppendLine("| ``$($it.path)`` | $kb | ``$sh`` |")
      }
    } else {
      [void]$sb.AppendLine("*$($g.Count) fichiers (hash complet dans le JSON)*")
      [void]$sb.AppendLine("")
      foreach ($it in ($g.Group | Sort-Object path)) {
        $kb = [math]::Round($it.bytes / 1KB, 1)
        [void]$sb.AppendLine("- ``$($it.path)`` ($kb KB)")
      }
    }
    [void]$sb.AppendLine("")
  }

  [void]$sb.AppendLine("---")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("**FIN DE L'INDEX**")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("*Index machine complet avec SHA-256 : OMEGA_DOCS_INDEX.json*")

  $sb.ToString() | Set-Content -Encoding UTF8 $mdPath

  # SHA-256 manifest
  $shaPath = Join-Path $outDir "OMEGA_DOCS_INDEX.sha256"
  $mdHash = (Get-FileHash -Algorithm SHA256 $mdPath).Hash.ToLower()
  $jsHash = (Get-FileHash -Algorithm SHA256 $jsonPath).Hash.ToLower()
  @(
    "$mdHash  docs/INDEX/OMEGA_DOCS_INDEX.md",
    "$jsHash  docs/INDEX/OMEGA_DOCS_INDEX.json"
  ) | Set-Content -Encoding UTF8 $shaPath

  Write-Host ""
  Write-Host "  [OK] $mdPath" -ForegroundColor Green
  Write-Host "  [OK] $jsonPath" -ForegroundColor Green
  Write-Host "  [OK] $shaPath" -ForegroundColor Green
  Write-Host "  [OK] $($items.Count) documents indexes" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  TERMINE - Pret pour commit" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Commandes de commit :" -ForegroundColor Yellow
Write-Host "  git add -A" -ForegroundColor White
Write-Host '  git commit -m "chore(repo): phase-1 cleanup + deterministic docs index [INV-IDX-01..05]"' -ForegroundColor White
Write-Host "  git push origin master --tags" -ForegroundColor White
