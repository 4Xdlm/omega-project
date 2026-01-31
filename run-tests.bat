@echo off
cd /d C:\Users\elric\omega-project
echo Running hostile tests...
call npx vitest run tests/auditpack/hostile.test.ts
echo.
echo Exit code: %ERRORLEVEL%
pause
