@echo off
set PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%
cd /d C:\Users\elric\omega-project\packages\sovereign-engine
"C:\Program Files\nodejs\node.exe" node_modules\.bin\vitest run tests/validation/top-k-selection.test.ts --reporter=verbose > C:\Users\elric\omega-project\test-out.txt 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> C:\Users\elric\omega-project\test-out.txt
