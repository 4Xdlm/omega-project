# OMEGA Repository Hygiene

## Overview

This document defines the repository hygiene standards for the OMEGA project.
All contributors must follow these guidelines to maintain NASA-Grade L4 compliance.

## Version

- Document Version: 3.90.0
- Phase: 90
- Standard: NASA-Grade L4 / DO-178C Level A

## .gitignore Rules

The `.gitignore` file is the source of truth for excluded files. Key categories:

| Category | Patterns | Rationale |
|----------|----------|-----------|
| Node | `node_modules/`, `npm-debug.log*` | Dependencies not versioned |
| Build | `dist/`, `out/`, `build/` | Generated artifacts |
| Test | `coverage/`, `.vitest/`, `.vite/` | Test artifacts |
| IDE | `.idea/`, `.vscode/` | Editor-specific |
| AI Tools | `.claude/`, `tmpclaude-*` | AI assistant temp files |
| OS | `.DS_Store`, `Thumbs.db` | OS metadata |
| Secrets | `.env*`, `*.pem`, `*.key` | Security sensitive |
| Temp | `tmp/`, `*.tmp`, `.cache/` | Temporary files |

## .gitattributes Rules

Cross-platform EOL handling for deterministic hashes:

| File Type | EOL | Rationale |
|-----------|-----|-----------|
| `*.ts`, `*.js`, `*.json` | LF | Cross-platform code |
| `*.md`, `*.yml`, `*.yaml` | LF | Documentation/config |
| `*.sh` | LF | Unix shell scripts |
| `*.ps1`, `*.psm1` | CRLF | PowerShell scripts |
| `*.bat`, `*.cmd` | CRLF | Windows batch |
| Binary files | binary | No conversion |

## Working Tree Requirements

Before any commit:

```powershell
# Must return empty (except ?? for untracked ignored files)
git status --porcelain
```

## Cleanup Script

Location: `scripts/cleanup/cleanup-repo.ps1`

Usage:
```powershell
# Preview what would be cleaned
.\scripts\cleanup\cleanup-repo.ps1 -DryRun

# Execute cleanup
.\scripts\cleanup\cleanup-repo.ps1
```

## Protected Paths (Sanctuaries)

These paths are READ-ONLY and must NEVER be modified:

- `packages/sentinel/`
- `packages/genome/`
- `packages/mycelium/`
- `gateway/`

Verification command:
```bash
git diff --name-only packages/sentinel packages/genome packages/mycelium gateway
# Must return empty
```

## Compliance Checklist

- [ ] `.gitignore` covers all temp/cache patterns
- [ ] `.gitattributes` defines EOL for all file types
- [ ] `git status --porcelain` returns empty after commit
- [ ] No files in sanctuaries modified
- [ ] Cleanup script passes without errors

## References

- Phase 90: Repo Hygiene Complete
- Tag: v3.90.0
- Certificate: `certificates/phase90_0/CERT_PHASE_90_0.md`
