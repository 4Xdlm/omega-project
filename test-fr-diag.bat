@echo off
set NODE_OPTIONS=--experimental-vm-modules
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\elric\omega-project\packages\sovereign-engine
echo Running FR emotion diagnostic...
"C:\Program Files\nodejs\node.exe" ..\..\node_modules\tsx\dist\cli.mjs scripts/test-fr-emotion.ts
echo EXIT_CODE=%errorlevel%
