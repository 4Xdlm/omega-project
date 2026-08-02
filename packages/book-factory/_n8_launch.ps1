$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\elric\omega-project\packages\book-factory'
$env:N8_MODEL = 'gemma4:31b'
$env:N8_RUNS = '3'
$env:N8_CANDIDATES = '7'
$env:N8_ARMS = 'B1c,B1d'
$log = 'runs\n8_antirecap\_N8_RUN.log'
New-Item -ItemType Directory -Force -Path 'runs\n8_antirecap' | Out-Null
"[N8] start $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8
& node 'C:\Users\elric\omega-project\node_modules\tsx\dist\cli.mjs' 'src\c7\n8-antirecap-bench.ts' *>&1 |
  Out-File -Append -FilePath $log -Encoding utf8
"[N8] end $(Get-Date -Format o) EXIT=$LASTEXITCODE" | Out-File -Append -FilePath $log -Encoding utf8
