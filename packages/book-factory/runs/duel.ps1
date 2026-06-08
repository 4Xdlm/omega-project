Set-Location C:\Users\elric\omega-project\packages\book-factory
$env:C7_MODE='full'; $env:C7_CHAPTERS='50'; $env:C7_WORDS='88000'; $env:C7_EXTEND='1'
$env:C7_DIRECTIVE_PACKS='runs/next_book/DIRECTIVE_PACKS.json'; $env:C7_PLAN_LOCK='runs/next_book/PLAN_LOCK.json'
$env:C7_V2='1'; $env:C7_MAX_CH='50'
"DUEL_START $(Get-Date -Format o)" | Out-File runs/duel_driver.log
$env:C7_MODEL='gemma4:31b'; $env:C7_OUT='runs/duel_gemma'
"GEMMA_START $(Get-Date -Format o)" | Out-File runs/duel_driver.log -Append
npx vite-node -c vitest.config.ts src/c7/c7-runner.ts *> runs/duel_gemma_run.log
"GEMMA_DONE $(Get-Date -Format o)" | Out-File runs/duel_driver.log -Append
$env:C7_MODEL='mistral-small:24b'; $env:C7_OUT='runs/duel_mistral'
"MISTRAL_START $(Get-Date -Format o)" | Out-File runs/duel_driver.log -Append
npx vite-node -c vitest.config.ts src/c7/c7-runner.ts *> runs/duel_mistral_run.log
"MISTRAL_DONE $(Get-Date -Format o)" | Out-File runs/duel_driver.log -Append
"DUEL_ALL_DONE $(Get-Date -Format o)" | Out-File runs/duel_driver.log -Append
