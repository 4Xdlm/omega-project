# B0_SYNTACTIC_CAUSAL_MATRIX — launcher detache (Windows, Ollama reel)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\elric\omega-project\packages\book-factory'
$env:B0_MODEL = 'gemma4:31b'
$env:B0_RUNS = '3'
$env:B0_CANDIDATES = '7'
$env:B0_ARMS = 'B1,B2,B3'
$log = 'runs\b0_causal\_B0_RUN.log'
New-Item -ItemType Directory -Force -Path 'runs\b0_causal' | Out-Null
"[B0] start $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8
& node 'C:\Users\elric\omega-project\node_modules\tsx\dist\cli.mjs' 'src\c7\b0-syntactic-causal-matrix.ts' *>&1 |
  Out-File -Append -FilePath $log -Encoding utf8
"[B0] end $(Get-Date -Format o) EXIT=$LASTEXITCODE" | Out-File -Append -FilePath $log -Encoding utf8
