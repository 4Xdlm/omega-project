Set-Location C:\Users\elric\omega-project\packages\book-factory
$deadline = (Get-Date).AddMinutes(90)
while (-not (Test-Path runs\cp_pack\CP1_MANIFEST.json)) {
  if ((Get-Date) -gt $deadline) { Add-Content runs\cp_pack\_CP1_RUN.log "WATCHER TIMEOUT 90min"; exit 1 }
  Start-Sleep -Seconds 30
}
Start-Sleep -Seconds 5
npx tsx src/c7/cp1-replay.ts *>> runs\cp_pack\_CP1_REPLAY.log
Add-Content runs\cp_pack\_CP1_RUN.log "REPLAY TERMINE $(Get-Date -Format s)"
