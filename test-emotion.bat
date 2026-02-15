@echo off
set NODE_OPTIONS=--experimental-vm-modules
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\elric\omega-project
"C:\Program Files\nodejs\node.exe" test-fr-emotion.mjs
echo EXIT=%errorlevel%
