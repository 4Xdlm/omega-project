# A0 BASELINE_FREEZE — launcher détaché (Windows, Ollama réel)
# Usage : powershell -ExecutionPolicy Bypass -File _a0_launch.ps1
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\elric\omega-project\packages\book-factory'

$env:A0_MODEL = 'gemma4:31b'
$env:A0_RUNS = '3'
$env:A0_CANDIDATES = '7'
$env:OLLAMA_URL = 'http://localhost:11434'

$log = 'runs\a0_baseline\_A0_RUN.log'
New-Item -ItemType Directory -Force -Path 'runs\a0_baseline' | Out-Null
"[A0] start $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8

$tsx = 'C:\Users\elric\omega-project\node_modules\tsx\dist\cli.mjs'
if (-not (Test-Path $tsx)) { "[A0] TSX INTROUVABLE: $tsx" | Out-File -Append -FilePath $log -Encoding utf8; exit 1 }

& node $tsx 'src\c7\a0-baseline-freeze.ts' *>&1 | Out-File -Append -FilePath $log -Encoding utf8
$code = $LASTEXITCODE
"[A0] end $(Get-Date -Format o) EXIT=$code" | Out-File -Append -FilePath $log -Encoding utf8
exit $code
