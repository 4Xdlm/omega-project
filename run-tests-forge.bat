@echo off
set NODE_OPTIONS=--experimental-vm-modules
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\elric\omega-project\packages\omega-forge
echo Running omega-forge tests...
"C:\Program Files\nodejs\node.exe" ..\..\node_modules\vitest\vitest.mjs run
echo EXIT=%errorlevel%
