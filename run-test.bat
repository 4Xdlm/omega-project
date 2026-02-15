@echo off
cd /d C:\Users\elric\omega-project\packages\sovereign-engine
set "NODEPATH=C:\Program Files\nodejs\node.exe"
"%NODEPATH%" node_modules\vitest\vitest.mjs run
