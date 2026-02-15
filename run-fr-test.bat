@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\elric\omega-project\packages\sovereign-engine
"C:\Program Files\nodejs\node.exe" ..\..\node_modules\tsx\dist\cli.mjs test-fr-quick.ts > C:\Users\elric\omega-project\fr-test-out.txt 2>&1
echo EXITCODE=%errorlevel% >> C:\Users\elric\omega-project\fr-test-out.txt
