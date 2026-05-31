<#
  OMEGA OVERNIGHT RUN v2 — self-contained, self-gating (runs DETACHED).
  ============================================================================
  Bakes the Architect's anti-blind protocol INTO the script so no blind Ollama
  launch is possible:
    1. HYGIENE  : kill orphan node.exe ; unload Ollama models ; re-check VRAM.
    2. GATE     : Ollama phases run ONLY if free VRAM >= GateGB (default 20).
    3. If GATE PASS : warmup keep_alive 24h ; Phase 1 ECC restore (canonical
                      ecc-dedicated-bench.ts, prose=sovereign,scribe) — crash-safe
                      (writes JSON per run), then Phase 2.
       If GATE FAIL : Option-3 fallback — SKIP Ollama, Phase 2 (CALC) + report only.
    4. ALWAYS   : Phase 2 RCI recompute (CALC, 0 GPU) + OVERNIGHT_VERDICT.md (try/finally).
  READ-ONLY engine code. 0 floor change. 0 destitution. Ollama-only (0 paid API).
  NB: judge temp 0 ⇒ ECC deterministic (stdev 0) ⇒ N kept modest (no value in more).
#>
[CmdletBinding()]
param(
  [string]$RepoRoot  = "C:\Users\elric\omega-project",
  [int]   $GateGB    = 20,
  [int]   $EccN      = 3,
  [string]$Prose     = "sovereign,scribe",
  [string]$Model     = "qwen3:32b",
  [string]$KeepAlive = "24h",
  [string]$OllamaUrl = "http://localhost:11434"
)
$ErrorActionPreference = "Continue"
Set-Location $RepoRoot
function Stamp { (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") }
function Say([string]$m) { Write-Output ("[{0}] {1}" -f (Stamp), $m) }
function FreeGB {
  try { $f = (& nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>$null | Select-Object -First 1); return [math]::Round([double]$f / 1024, 1) } catch { return -1 }
}

Say "=== OMEGA OVERNIGHT RUN v2 START === repo=$RepoRoot model=$Model gateGB=$GateGB eccN=$EccN prose=$Prose"

# ---------- 1. HYGIENE ----------
$nodes = Get-Process node -ErrorAction SilentlyContinue
if ($nodes) { Say "HYGIENE kill node.exe x$($nodes.Count) [ids: $($nodes.Id -join ',')]"; $nodes | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 800 }
else { Say "HYGIENE node.exe: none" }
Say "HYGIENE VRAM free before unload: $(FreeGB) GB"
# unload all Ollama models (free VRAM); prefer CLI, fallback to keep_alive:0 API
try { & ollama stop $Model 2>$null | Out-Null; Say "HYGIENE ollama stop $Model issued" } catch { Say "HYGIENE ollama stop warn: $($_.Exception.Message)" }
try {
  $loaded = (Invoke-RestMethod -Uri "$OllamaUrl/api/ps" -TimeoutSec 10).models
  foreach ($m in $loaded) { $b = @{ model=$m.name; keep_alive=0 } | ConvertTo-Json -Compress; Invoke-RestMethod -Uri "$OllamaUrl/api/generate" -Method Post -Body $b -ContentType "application/json" -TimeoutSec 60 | Out-Null; Say "HYGIENE unloaded $($m.name)" }
} catch { Say "HYGIENE unload-api warn: $($_.Exception.Message)" }
Start-Sleep -Seconds 3
$free = FreeGB
Say "HYGIENE VRAM free after unload: $free GB"

# ---------- 2. GATE ----------
$go = ($free -ge $GateGB)
Say "GATE free=$free GB >= $GateGB GB ? -> $(if($go){'PASS — Ollama phases enabled'}else{'FAIL — Option 3 DOC_ONLY (no Ollama)'})"

try {
  if ($go) {
    # warmup: reload model, pin keep_alive 24h
    try { $w = @{ model=$Model; prompt="."; stream=$false; keep_alive=$KeepAlive; options=@{ num_predict=1 } } | ConvertTo-Json -Compress; Invoke-RestMethod -Uri "$OllamaUrl/api/generate" -Method Post -Body $w -ContentType "application/json" -TimeoutSec 600 | Out-Null; Say "warmup OK keep_alive=$KeepAlive" } catch { Say "warmup WARN: $($_.Exception.Message)" }

    # ---------- PHASE 1: ECC dedicated (canonical bench, restore full sovereign+scribe) ----------
    Say "--- PHASE 1: ECC DEDICATED (canonical) prose=$Prose N=$EccN ---"
    $env:ECC_PROSE = $Prose; $env:ECC_N = "$EccN"; $env:ECC_MODEL = $Model; $env:ECC_OLLAMA_URL = $OllamaUrl
    Remove-Item Env:\ECC_SMOKE -ErrorAction SilentlyContinue
    & npx tsx scripts/metrology/ecc-dedicated-bench.ts 2>&1 | ForEach-Object { Say "ecc> $_" }
    Say "PHASE 1 exit=$LASTEXITCODE"
  } else {
    Say "PHASE 1 SKIPPED (gate fail) — no Ollama tonight."
  }

  # ---------- PHASE 2: Literary RCI recompute (CALC, 0 GPU) — ALWAYS ----------
  Say "--- PHASE 2: LITERARY RCI RECOMPUTE (CALC) ---"
  & npx tsx scripts/metrology/minaxis-literary-recompute.ts 2>&1 | ForEach-Object { Say "rci> $_" }
  Say "PHASE 2 exit=$LASTEXITCODE"
}
finally {
  # ---------- FINAL REPORT — ALWAYS ----------
  Say "--- FINAL REPORT (always) ---"
  & npx tsx scripts/metrology/overnight-report-v2.ts 2>&1 | ForEach-Object { Say "report> $_" }
  Say "report exit=$LASTEXITCODE"
  Say "=== OMEGA OVERNIGHT RUN v2 END ==="
}
