Set-Location 'C:\Users\elric\omega-project\packages\sovereign-engine'
$env:OMEGA_OLLAMA_MODEL = 'qwen3:32b'
$env:OMEGA_BENCH_RUNS   = '1'        # 4 scenes x 1 run = 4 archetypes coverage
$env:OMEGA_DUEL_RUNS    = '2'        # production N=7
$env:OMEGA_R6_GATE      = 'shadow'   # observe, no reject
$startedAt = Get-Date
Write-Host "═══════════════════════════════════════════════"
Write-Host " BENCH OVERNIGHT — Option Z1"
Write-Host "═══════════════════════════════════════════════"
Write-Host "Started: $startedAt"
Write-Host "Scope  : 4 scenes (contemplation, menace, revelation, confrontation) x 1 run x N=7 candidates"
Write-Host "Output : C:\Users\elric\omega-project\nexus\proof\P311_BENCH_FULL_OVERNIGHT.log"
Write-Host "Partial: packages/sovereign-engine/sessions/BESTOF3_OLLAMA_qwen3_32b/bestof3_partial.json"
Write-Host "Final  : packages/sovereign-engine/sessions/BESTOF3_OLLAMA_qwen3_32b/bestof3_results.json"
Write-Host ""
npx tsx scripts/bench-bestof3-ollama.ts *>&1 | Tee-Object -FilePath C:\Users\elric\omega-project\nexus\proof\P311_BENCH_FULL_OVERNIGHT.log
$endedAt = Get-Date
$duration = ($endedAt - $startedAt).TotalMinutes
Write-Host ""
Write-Host "═══════════════════════════════════════════════"
Write-Host " BENCH DONE — duration $([math]::Round($duration, 1)) min"
Write-Host "═══════════════════════════════════════════════"
Write-Host "Ended: $endedAt"
