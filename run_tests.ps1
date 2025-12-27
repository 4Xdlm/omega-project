Write-Host "OMEGA Windows Test - 7 Tests"
Write-Host ""

$bin = ".\omega-bridge-win.exe"

Write-Host "[1/7] Health Check"
cmd /c "$bin "{`"command`":`"health`"}""

Write-Host "[2/7] Version"
cmd /c "$bin "{`"command`":`"version`"}""

Write-Host "Tests complete!"
