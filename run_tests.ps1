Set-Location "C:\Users\elric\omega-project\packages\sovereign-engine"
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
$outFile = "C:\Users\elric\omega-project\vitest_results.txt"

$proc = Start-Process -FilePath "C:\Users\elric\omega-project\packages\sovereign-engine\node_modules\.bin\vitest.cmd" `
    -ArgumentList "run" `
    -WorkingDirectory "C:\Users\elric\omega-project\packages\sovereign-engine" `
    -RedirectStandardOutput $outFile `
    -RedirectStandardError "C:\Users\elric\omega-project\vitest_err2.txt" `
    -Wait -PassThru -NoNewWindow

Write-Output "EXIT: $($proc.ExitCode)"
Write-Output "OutFile size: $((Get-Item $outFile -ErrorAction SilentlyContinue).Length)"
