# OMEGA — Benchmark Launcher avec DRY-RUN obligatoire
# RÈGLE: Jamais de run complet sans audit de coût préalable
$ErrorActionPreference = "Stop"

# Charger le .env
$envFile = Get-Content "C:\Users\elric\omega-project\packages\sovereign-engine\.env"
foreach ($line in $envFile) {
    if ($line -match "^([^=]+)=(.*)$") {
        $name = $Matches[1].Trim()
        $val  = $Matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $val, "Process")
    }
}

$env:BENCH_MICRO = ""
Remove-Item Env:BENCH_MICRO -ErrorAction SilentlyContinue
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Set-Location "C:\Users\elric\omega-project\packages\sovereign-engine"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗"
Write-Host "║  OMEGA BENCHMARK — AUDIT PRÉALABLE OBLIGATOIRE           ║"
Write-Host "╚══════════════════════════════════════════════════════════╝"
Write-Host ""

# ── PHASE 1 : DRY-RUN 1 run × K=1 pour mesurer la durée réelle ──
Write-Host "[DRY-RUN] Lancement 1 run x K=1 pour mesure de durée..."
$env:BENCH_MICRO = "1"
$env:K_OVERRIDE  = "1"

$t0 = Get-Date
& "C:\Program Files\nodejs\node.exe" --import tsx/esm scripts/run-benchmark-phase-u.ts 2>&1 | Out-File "C:\Users\elric\omega-project\bench_dryrun.txt"
$t1 = Get-Date

$env:BENCH_MICRO = ""
Remove-Item Env:BENCH_MICRO -ErrorAction SilentlyContinue
Remove-Item Env:K_OVERRIDE  -ErrorAction SilentlyContinue

$dryrun_s = ($t1 - $t0).TotalSeconds
$dryrun_min = [math]::Round($dryrun_s / 60, 1)

# Lire les résultats du dry-run
$dryContent = Get-Content "C:\Users\elric\omega-project\bench_dryrun.txt" -Encoding Unicode -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "[DRY-RUN] Résultat (1 run x K=1):"
$dryContent | Select-String -Pattern "ONE-SHOT|TOP-K|ERROR|SEAL|composite|ecc|rci|sii" | ForEach-Object { Write-Host "  $_" }

# ── PHASE 2 : CALCUL COÛT RÉEL ──
$K_FULL       = 8
$RUNS_FULL    = 30
$LLM_PER_VAR  = 11   # mesuré dans macro-axes.ts

# Durée extrapolée
$topk_1run_s  = $dryrun_s   # 1 run × K=1 ≈ base (TOP-K sera K× plus long)
$topk_full_s  = $topk_1run_s * $K_FULL * $RUNS_FULL
$total_est_h  = [math]::Round($topk_full_s / 3600, 1)

# Appels API estimés
$total_calls  = ($LLM_PER_VAR * 1 * $RUNS_FULL) + ($LLM_PER_VAR * $K_FULL * $RUNS_FULL)
$cost_per_call_eur = 0.0035  # ~$3.5/M input + $15/M output, ~2000 tokens in + 500 out
$total_cost_eur = [math]::Round($total_calls * $cost_per_call_eur, 0)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗"
Write-Host "║  AUDIT COÛT — FULL RUN 30 × K=8                         ║"
Write-Host "╠══════════════════════════════════════════════════════════╣"
Write-Host "║  Durée 1 run dry-run : $([math]::Round($dryrun_s,0))s ($dryrun_min min)"
Write-Host "║  Durée estimée full  : ~$total_est_h heures"
Write-Host "║  Appels API estimés  : $total_calls"
Write-Host "║  Coût estimé         : ~$total_cost_eur EUR"
Write-Host "╚══════════════════════════════════════════════════════════╝"
Write-Host ""
Write-Host "CONFIRMES-TU LE LANCEMENT DU FULL RUN ?"
Write-Host "  Tape 'oui' pour continuer, autre chose pour annuler."
$confirm = Read-Host "Réponse"

if ($confirm -ne "oui") {
    Write-Host "[OMEGA] Run annulé par l'Architecte. Aucun crédit consommé."
    exit 0
}

# ── PHASE 3 : FULL RUN ──
Write-Host ""
Write-Host "[OMEGA] Architecte confirmé — lancement full run 30 × K=8..."
& "C:\Program Files\nodejs\node.exe" --import tsx/esm scripts/run-benchmark-phase-u.ts 2>&1 | Tee-Object -FilePath "C:\Users\elric\omega-project\bench_full.txt"
