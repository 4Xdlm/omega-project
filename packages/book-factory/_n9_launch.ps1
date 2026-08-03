$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\elric\omega-project\packages\book-factory'
$env:N9_MODEL = 'gemma4:31b'
$env:N9_CANDIDATES = '5'
$log = 'runs\n9_scribe_book\_N9_RUN.log'
New-Item -ItemType Directory -Force -Path 'runs\n9_scribe_book' | Out-Null
"[N9] start $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8
& node 'C:\Users\elric\omega-project\node_modules\tsx\dist\cli.mjs' 'src\c7\n9-scribe-e2e-book.ts' *>&1 |
  Out-File -Append -FilePath $log -Encoding utf8
"[N9] end $(Get-Date -Format o) EXIT=$LASTEXITCODE" | Out-File -Append -FilePath $log -Encoding utf8
