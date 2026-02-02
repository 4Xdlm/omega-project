# TOOLCHAIN LOCK

## Runtime Environment

| Component | Version | Verification Command |
|-----------|---------|---------------------|
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
| Architecture | x64 |

## Test Framework

| Component | Version |
|-----------|---------|
| Vitest | 4.0.18 |
| TypeScript | (via vitest) |

## Package Lock

| Property | Value |
|----------|-------|
| Lockfile Version | 3 |
| Integrity | SHA-512 hashes |
| Dependencies (total) | 473 |

## Verification

```powershell
node -v                              # v24.12.0
npm -v                               # 11.6.2
git --version                        # git version 2.52.0.windows.1
pwsh --version                       # PowerShell 7.5.4
npm ls vitest --depth=0              # vitest@4.0.18
```

## Lock Statement

This toolchain configuration is LOCKED for audit reproducibility.
Any environment deviation may produce different results.
