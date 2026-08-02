# A3 CONFORMITY_VERIFY — launcher detache (Windows, Ollama reel)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\elric\omega-project\packages\book-factory'
$env:A3_MODEL = 'gemma4:31b'
$log = 'runs\a3_conformity\_A3_RUN.log'
New-Item -ItemType Directory -Force -Path 'runs\a3_conformity' | Out-Null
"[A3] start $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8
& node 'C:\Users\elric\omega-project\node_modules\tsx\dist\cli.mjs' 'src\c7\a3-conformity-verify.ts' *>&1 |
  Out-File -Append -FilePath $log -Encoding utf8
"[A3] end $(Get-Date -Format o) EXIT=$LASTEXITCODE" | Out-File -Append -FilePath $log -Encoding utf8
