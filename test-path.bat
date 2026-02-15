@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\elric\omega-project\packages\sovereign-engine
"C:\Program Files\nodejs\node.exe" ..\..\node_modules\tsx\dist\cli.mjs scripts/test-path.ts
