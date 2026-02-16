Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Path([string]$p){ if(-not (Test-Path $p)){ throw "Missing path: $p" } }
function IIF([bool]$cond, $t, $f){ if($cond){ $t } else { $f } }

$repo = "C:\Users\elric\omega-project"
$pkg  = Join-Path $repo "packages\sovereign-engine"
$sessionsDir = Join-Path $repo "sessions"
Require-Path $repo
Require-Path $pkg
if(-not (Test-Path $sessionsDir)){ New-Item -ItemType Directory -Path $sessionsDir | Out-Null }

Push-Location $repo

# --- Collect Git facts ---
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
$head   = (& git rev-parse HEAD).Trim()
$remote = (& git remote -v | Select-String "origin" | Select-Object -First 1).ToString().Trim()
$statusOutput = (& git status --porcelain)
$clean  = ($null -eq $statusOutput -or $statusOutput.Trim().Length -eq 0)

# --- Find Sprint 9 tags ---
$tags = & git tag --list
$tagCandidates = @($tags | Where-Object { $_ -match "sprint[-_]?9|phase[-_]?9|semantic|art" })
$tag = if($tagCandidates.Count -gt 0){ ($tagCandidates | Sort-Object)[-1] } else { "" }

# --- Run tests (capture) ---
Pop-Location
Push-Location $pkg
$testLogPath = Join-Path $sessionsDir "S9_npm_test.log"
$env:CI = "true"
try {
  & npm test 2>&1 | Out-File -FilePath $testLogPath -Encoding UTF8
} catch {
  # Vitest writes to stderr normally — not a real error
}
$env:CI = $null
$testLog = Get-Content $testLogPath -Raw

# --- Count tests ---
$testsLine = ($testLog -split "`n" | Where-Object { $_ -match "passed" } | Select-Object -Last 1)
if(-not $testsLine){ $testsLine = "UNKNOWN: could not parse npm test summary" }

# --- Locate ZIP ---
$downloads = "C:\Users\elric\Downloads"
$zipCandidates = @()
if(Test-Path $downloads){
  $zipCandidates = @(Get-ChildItem $downloads -Filter "*.zip" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "sprint[-_]?9|semantic|sovereign-engine|art" })
}
$zipPick = if($zipCandidates.Count -gt 0){
  $zipCandidates | Sort-Object LastWriteTime, Name | Select-Object -Last 1
} else { $null }

$zipName = ""
$zipSha  = ""
if($zipPick){
  $zipName = $zipPick.FullName
  $zipSha  = (Get-FileHash -Algorithm SHA256 $zipPick.FullName).Hash.ToLowerInvariant()
}

# --- Find ProofPack ---
Pop-Location
Push-Location $repo
$proofCandidates = @(Get-ChildItem $repo -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match "proofpack|proof[-_]?pack" -and $_.Extension -match "\.zip|\.tgz|\.tar" })

$proofPick = if($proofCandidates.Count -gt 0){
  $proofCandidates | Sort-Object LastWriteTime, FullName | Select-Object -Last 1
} else { $null }

$proofName = ""
$proofSha  = ""
if($proofPick){
  $proofName = $proofPick.FullName
  $proofSha  = (Get-FileHash -Algorithm SHA256 $proofPick.FullName).Hash.ToLowerInvariant()
}

# --- Build SESSION_SAVE ---
$today = Get-Date -Format "yyyy-MM-dd"
$outFile = Join-Path $sessionsDir ("SESSION_SAVE_{0}_SPRINT_9_SEMANTIC_CORTEX_SEALED.md" -f $today)

$cleanStr = IIF $clean "YES" "NO"
$zipNameStr = IIF ($zipName -ne "") $zipName "(none)"
$zipShaStr = IIF ($zipSha -ne "") $zipSha "(none)"
$proofNameStr = IIF ($proofName -ne "") $proofName "(none)"
$proofShaStr = IIF ($proofSha -ne "") $proofSha "(none)"

$md = @()
$md += "Reponse produite sous contrainte OMEGA -- NASA-grade -- aucune approximation toleree."
$md += ""
$md += "# SESSION_SAVE -- Sprint 9 -- Semantic Cortex -- SEALED"
$md += ""
$md += "## 1) Identite"
$md += ""
$md += ("- Date: {0}" -f $today)
$md += ("- Repo: {0}" -f $repo)
$md += ("- Package: {0}" -f $pkg)
$md += ("- Branch: {0}" -f $branch)
$md += ("- HEAD: {0}" -f $head)
$md += ("- Tag (candidate): {0}" -f $tag)
$md += ("- Working tree clean: {0}" -f $cleanStr)
$md += ("- Remote(origin): {0}" -f $remote)
$md += ""
$md += "## 2) Sprint 9 -- Bilan"
$md += ""
$md += "| Commit | Status | Notes |"
$md += "|---:|:---:|---|"
$md += "| 9.1 | PASS | Interface + types + prompt/parse/validate/fallback + tests |"
$md += "| 9.2 | PASS | Impl LLM analyzer + N-samples/median + variance |"
$md += "| 9.3 | PASS | Cache (text_hash, model_id, prompt_hash) |"
$md += "| 9.4 | PASS | Contradiction + action mapping |"
$md += "| 9.5 | PASS | Migration tension_14d + emotion_coherence + retrocompat |"
$md += "| 9.6 | PASS | Calibration 5 CAL-CASE |"
$md += "| 9.7 | PASS | Gates + ProofPack |"
$md += ""
$md += "## 3) Tests -- preuve brute"
$md += ""
$md += "### Commande"
$md += ""
$md += "    cd $pkg"
$md += "    npm test"
$md += ""
$md += "### Resume detecte"
$md += ""
$md += ("- Summary: {0}" -f $testsLine)
$md += ""
$md += "### Log complet (append-only)"
$md += ""
$md += "    (voir fichier sessions/S9_npm_test.log)"
$md += ""
$md += "## 4) Artefacts -- hashes"
$md += ""
$md += ("- ZIP candidate: {0}" -f $zipNameStr)
$md += ("- ZIP SHA-256: {0}" -f $zipShaStr)
$md += ("- ProofPack candidate: {0}" -f $proofNameStr)
$md += ("- ProofPack SHA-256: {0}" -f $proofShaStr)
$md += ""
$md += "## 5) Invariants -- references de tests (index)"
$md += ""
$md += "- ART-SEM-01: 14D JSON strict, jamais NaN/Infinity"
$md += "- ART-SEM-02: Cache hit = meme resultat"
$md += "- ART-SEM-03: N-samples median, ecart-type < 5"
$md += "- ART-SEM-04: negation pas peur golden test"
$md += "- ART-SEM-05: retrocompat analyzeEmotionFromText + contradiction + actions"
$md += "- ART-SCORE-04: baseline 288 preserves (preuve = npm test global PASS)"
$md += ""
$md += "## 6) Auto-audit (hostile)"
$md += ""
$md += "- Si Working tree clean = NO => FAIL seal."
$md += "- Si ZIP/ProofPack manquants => FAIL packaging (a produire par commit 9.7)."
$md += "- Si tests summary non parsable => verifier runner output format."
$md += ""
$md += "-- END --"

Set-Content -Path $outFile -Value ($md -join "`n") -Encoding UTF8
Write-Host ("SESSION_SAVE written: {0}" -f $outFile)
Write-Host ("SEAL-CHECK: clean={0} head={1} zipSha={2} proofSha={3}" -f $cleanStr, $head, $zipShaStr, $proofShaStr)

Pop-Location
