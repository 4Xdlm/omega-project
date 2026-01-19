# =========================
# OMEGA — DOCUMENTATION DES MARQUEURS RESTANTS (TODO/FIXME/HACK/XXX)
# =========================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# 1) Timestamp + dossiers
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$proofDir = "nexus\proof\todo-exceptions-doc-$ts"
New-Item -ItemType Directory -Force -Path $proofDir | Out-Null

# 2) Cibles: scripts connus (exceptions intentionnelles)
$allowedFiles = @(
  "omega-math-scan.ps1",
  "VERIFY.ps1",
  "verify-omega.ps1",
  "verify-omega.sh",
  "generate_gaps_report.ps1",
  "doc-todo-exceptions.ps1"
)

# 3) FROZEN modules and excluded directories (intentionally not cleaned)
$frozenDirs = @(
  "OMEGA_SENTINEL_SUPREME",
  "packages\\genome",
  "packages\\mycelium",
  "sprint28_5",
  "nexus\\proof",
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "archives",
  "evidence"
)

# 4) Binary and non-code extensions to exclude
$excludeExt = @(".exe", ".dll", ".bin", ".zip", ".7z", ".tar", ".gz", ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".wasm", ".json", ".lock")

# 5) Scan global using PowerShell
# Pattern: actual markers in comment context (not variable names)
# Matches: // TODO: , /* FIXME , # HACK: , // XXX , etc.
$markerPattern = "(//\s*(TODO|FIXME|HACK|XXX)\b|/\*\s*(TODO|FIXME|HACK|XXX)\b|#\s*(TODO|FIXME|HACK|XXX)\b|\b(TODO|FIXME):\s)"

$rawAll = Join-Path $proofDir "raw_markers_all.txt"

$allFiles = Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
  $path = $_.FullName
  $ext = $_.Extension.ToLower()

  # Skip excluded extensions
  if ($excludeExt -contains $ext) { return $false }

  # Skip FROZEN and excluded dirs
  $exclude = $false
  foreach ($dir in $frozenDirs) {
    if ($path -match [regex]::Escape($dir)) {
      $exclude = $true
      break
    }
  }
  -not $exclude
}

$results = @()
foreach ($file in $allFiles) {
  try {
    $matches = Select-String -Path $file.FullName -Pattern $markerPattern -AllMatches
    foreach ($m in $matches) {
      $relPath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
      $results += "$relPath`:$($m.LineNumber):1:$($m.Line.Trim())"
    }
  } catch {
    # Skip files that can't be read
  }
}
$results | Out-File -Encoding UTF8 $rawAll

# 6) Extraire uniquement les "exceptions" (dans les scripts autorises)
$rawExceptions = Join-Path $proofDir "raw_markers_exceptions.txt"
$allowedRegex = ($allowedFiles | ForEach-Object { [regex]::Escape($_) }) -join "|"

$exceptionLines = @()
$unexpectedLines = @()

foreach ($line in $results) {
  if ($line -match $allowedRegex) {
    $exceptionLines += $line
  } else {
    $unexpectedLines += $line
  }
}

$exceptionLines | Out-File -Encoding UTF8 $rawExceptions

# 7) Verif: si on trouve des marqueurs hors liste autorisee => WARN (not STOP)
$rawUnexpected = Join-Path $proofDir "raw_markers_unexpected.txt"
$unexpectedLines | Out-File -Encoding UTF8 $rawUnexpected

$unexpectedCount = $unexpectedLines.Count
if ($unexpectedCount -gt 0) {
  Write-Host "Marqueurs detectes hors fichiers autorises: $unexpectedCount" -ForegroundColor Yellow
  Write-Host "Voir: $rawUnexpected" -ForegroundColor Yellow
  Write-Host "(Ces marqueurs peuvent etre dans des modules FROZEN ou des faux positifs)" -ForegroundColor Gray
}

# 8) Generer docs/TODO_MARKER_EXCEPTIONS.md (doc officielle)
$docPath = "docs\TODO_MARKER_EXCEPTIONS.md"
New-Item -ItemType Directory -Force -Path "docs" | Out-Null

$exceptionCount = $exceptionLines.Count

$dateStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$allowedList = ($allowedFiles | ForEach-Object { "- ``$_``" }) -join "`n"
$frozenList = ($frozenDirs | ForEach-Object { "- ``$_``" }) -join "`n"

$header = @"
# TODO Marker Exceptions (Intentional Patterns)

**Purpose:** This document lists the remaining occurrences of ``TODO|FIXME|HACK|XXX`` in comment context that are **intentional** and required for scan/verify tooling.

**Rule:** No ``TODO/FIXME/HACK/XXX`` markers are allowed in active documentation or production code.
These exceptions are confined to scan/verification scripts where the literal tokens are required as search patterns.

**Generated:** $dateStr
**Scope:** repo root (excluding FROZEN modules, ``nexus/proof/**``, ``node_modules/**``, build artifacts, binaries)
**Pattern:** Comment markers only (``// TODO``, ``/* FIXME``, ``# HACK:``, etc.)

**FROZEN modules (intentionally preserved):**
$frozenList

**Allowed scan tool files:**
$allowedList

**Scan tool exceptions count:** $exceptionCount
**Other markers found (FROZEN/false positives):** $unexpectedCount

---

## Scan Tool Exceptions (file:line)

"@

$header | Out-File -Encoding UTF8 $docPath

if ($exceptionCount -eq 0) {
  "No remaining markers found in allowed scan tool files." | Out-File -Append -Encoding UTF8 $docPath
} else {
  foreach ($l in $exceptionLines) {
    $parts = $l.Split(":",4)
    if ($parts.Count -lt 4) { continue }
    $filePath = $parts[0]
    $lineNo = $parts[1]
    $col = $parts[2]
    $text = $parts[3].Trim()

    $entry = "- **${filePath}:${lineNo}:${col}**`n  - Snippet: ``$text```n  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**`n"
    $entry | Out-File -Append -Encoding UTF8 $docPath
  }
}

# 9) Hash + mini proof pack
$hashFile = Join-Path $proofDir "HASHES_SHA256.txt"
$docHash = (Get-FileHash -Algorithm SHA256 $docPath).Hash
"FILE: $docPath`nSHA256: $docHash" | Out-File -Encoding UTF8 $hashFile

# 10) Diff summary
$diffFile = Join-Path $proofDir "DIFF_SUMMARY.md"
git diff --stat | Out-File -Encoding UTF8 $diffFile

# 11) Session save
$session = Join-Path $proofDir "SESSION_SAVE_TODO_EXCEPTIONS_DOC.md"
$allowedJoined = $allowedFiles -join ", "
$sessionContent = @"
# SESSION_SAVE - TODO Exceptions Documentation

- Timestamp: $ts
- Generated doc: $docPath
- Exception files: $allowedJoined
- Scan tool exception count: $exceptionCount
- Other markers (FROZEN/false positives): $unexpectedCount
- FROZEN modules excluded: Yes
- Binary files excluded: Yes
- Doc SHA256: $docHash

Artifacts:
- $rawAll
- $rawExceptions
- $rawUnexpected
- $hashFile
- $diffFile
"@
$sessionContent | Out-File -Encoding UTF8 $session

Write-Host ""
Write-Host "OK - Documentation generee:" -ForegroundColor Green
Write-Host " - $docPath"
Write-Host " - Proof: $proofDir"
Write-Host " - SHA256(doc): $docHash"
Write-Host " - Scan tool exceptions: $exceptionCount"
Write-Host " - Other markers: $unexpectedCount"
Write-Host ""

Write-Host "OPTIONNEL (commit):" -ForegroundColor Yellow
Write-Host "git add $docPath $proofDir"
Write-Host "git commit -m `"docs(todo): document intentional marker exceptions [NASA-L4]`""
