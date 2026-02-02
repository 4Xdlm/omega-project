# LR0 — ENVIRONMENT CAPTURE

## Toolchain Versions

| Tool | Version | Command |
|------|---------|---------|
| Node.js | v24.12.0 | `node -v` |
| npm | 11.6.2 | `npm -v` |
| Git | 2.52.0.windows.1 | `git --version` |
| PowerShell | 7.5.4 | `pwsh --version` |

## Operating System

| Property | Value |
|----------|-------|
| OS | Microsoft Windows 11 Famille |
| Version | 10.0.26200 |
| Platform | win32 |

## Working Directory

```
C:\Users\elric\omega-project
```

## Verification Commands Executed

```powershell
node -v                          # v24.12.0
npm -v                           # 11.6.2
git --version                    # git version 2.52.0.windows.1
pwsh --version                   # PowerShell 7.5.4
Get-CimInstance Win32_OperatingSystem | Select Caption,Version
```

## Integrity Statement

All version outputs captured directly from shell execution.
No interpolation or assumptions made.
