@echo off
set PATH=C:\Program Files\nodejs;%PATH%
set NODE_OPTIONS=--experimental-vm-modules
cd /d C:\Users\elric\omega-project
node node_modules\tsx\dist\cli.mjs test-fr-emotion.ts
