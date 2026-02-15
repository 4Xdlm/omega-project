$env:PATH = "C:\Program Files\nodejs;C:\Windows\system32;C:\Windows;" + $env:PATH
Set-Location C:\Users\elric\omega-project\packages\sovereign-engine
node node_modules/.bin/vitest run 2>&1 | Tee-Object -FilePath C:\Users\elric\omega-project\test-output.txt
