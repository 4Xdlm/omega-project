$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\elric\omega-project\packages\book-factory'
$env:B1P_MODEL = 'gemma4:31b'
$env:B1P_RUNS = '3'
$env:B1P_CANDIDATES = '7'
$env:B1P_ARMS = 'B1a,B1b'
$log = 'runs\b1p_antitemplate\_B1P_RUN.log'
New-Item -ItemType Directory -Force -Path 'runs\b1p_antitemplate' | Out-Null
"[B1P] start $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8
& node 'C:\Users\elric\omega-project\node_modules\tsx\dist\cli.mjs' 'src\c7\b1p-antitemplate-bench.ts' *>&1 |
  Out-File -Append -FilePath $log -Encoding utf8
"[B1P] end $(Get-Date -Format o) EXIT=$LASTEXITCODE" | Out-File -Append -FilePath $log -Encoding utf8
