@echo off
set PATH=C:\Program Files\nodejs;C:\Windows\System32;%PATH%
cd /d C:\Users\elric\omega-project\packages\omega-forge
echo === REBUILDING OMEGA-FORGE ===
"C:\Program Files\nodejs\npx.cmd" tsc
echo BUILD EXIT=%errorlevel%
echo.
echo === VERIFYING FR KEYWORDS IN DIST ===
C:\Windows\System32\findstr /C:"EMOTION_KEYWORDS_FR" dist\physics\trajectory-analyzer.js
C:\Windows\System32\findstr /C:"normalizeToken" dist\physics\trajectory-analyzer.js
echo.
echo === DONE ===
