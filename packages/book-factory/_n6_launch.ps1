$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\elric\omega-project\packages\book-factory'
$env:N6_MODEL = 'gemma4:31b'
$env:N6_RUNS = '3'
$env:N6_CANDIDATES = '7'
$env:N6_ARMS = 'N6nu,N6plan'
$log = 'runs\n6_replication\_N6_RUN.log'
New-Item -ItemType Directory -Force -Path 'runs\n6_replication' | Out-Null
"[N6] start $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8
& node 'C:\Users\elric\omega-project\node_modules\tsx\dist\cli.mjs' 'src\c7\n6-replication-other-scene.ts' *>&1 |
  Out-File -Append -FilePath $log -Encoding utf8
"[N6] end $(Get-Date -Format o) EXIT=$LASTEXITCODE" | Out-File -Append -FilePath $log -Encoding utf8
