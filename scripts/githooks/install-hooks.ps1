Write-Host "Installing OMEGA git hooks..."

Copy-Item scripts\githooks\pre-commit .git\hooks\pre-commit -Force

Write-Host "Hooks installed successfully."
