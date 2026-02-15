@echo off
cd /d C:\Users\elric\omega-project

echo === GIT STATUS ===
"C:\Program Files\Git\cmd\git.exe" status --short

echo === GIT ADD ===
"C:\Program Files\Git\cmd\git.exe" add -A

echo === GIT COMMIT ===
"C:\Program Files\Git\cmd\git.exe" commit -m "feat(S3): FR emotion keywords + language field + node PATH fix [LIVE1-FR 92.35 PITCH]"

echo === GIT LOG ===
"C:\Program Files\Git\cmd\git.exe" log --oneline -3

echo EXIT=%errorlevel%
