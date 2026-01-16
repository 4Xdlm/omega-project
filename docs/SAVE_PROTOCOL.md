# OMEGA Save Protocol

## Overview

The OMEGA Save Protocol provides bulletproof session snapshot functionality with retry logic, rollback, and structured JSONL logging. This document describes the v12 implementation.

## Version

- Script Version: 12.0.0
- Phase: 91
- Standard: NASA-Grade L4 / DO-178C Level A

## Features

### Retry Logic

All critical operations support automatic retry with exponential backoff:

| Operation | Default Retries | Backoff |
|-----------|-----------------|---------|
| File creation | 3 | 2s, 4s, 6s |
| Git add | 3 | 2s, 4s, 6s |
| Git commit | 3 | 2s, 4s, 6s |
| Git push | 3 | 2s, 4s, 6s |

### Rollback

On failure, all created files are automatically rolled back:

1. Track all created files during operation
2. On error, iterate through created files
3. Delete each file safely
4. Log rollback actions

### Push Modes

| Mode | Flag | Behavior |
|------|------|----------|
| No Push | (default) | Commit only, no push |
| Best Effort | `-Push` | Push with retry, warn on failure |
| Strict | `-PushRequired` | Push with retry, fail on error |

### JSONL Logging

All operations are logged to `logs/omega-save.jsonl` with structured format:

```json
{
  "timestamp": "2026-01-16T02:00:00.000+01:00",
  "level": "INFO",
  "message": "Starting save operation",
  "version": "12.0.0",
  "context": {
    "title": "Phase 91 complete",
    "push": false,
    "pushRequired": false,
    "maxRetries": 3
  }
}
```

## Usage

### Basic Save

```powershell
.\scripts\save\omega-save.ps1 -Title "Session description"
```

### Save with Push

```powershell
.\scripts\save\omega-save.ps1 -Title "Important save" -Push
```

### Save with Required Push (Strict Mode)

```powershell
.\scripts\save\omega-save.ps1 -Title "Critical save" -PushRequired
```

### Dry Run

```powershell
.\scripts\save\omega-save.ps1 -Title "Test save" -DryRun
```

### Custom Retry Count

```powershell
.\scripts\save\omega-save.ps1 -Title "Save" -MaxRetries 5
```

## Generated Artifacts

Each save operation creates:

| Artifact | Location | Format |
|----------|----------|--------|
| Session | `nexus/proof/sessions/SES-*.md` | Markdown |
| Seal | `nexus/proof/seals/SEAL-*.yaml` | YAML |
| Manifest | `nexus/proof/snapshots/manifests/MANIFEST-*.json` | JSON |
| Raw Log | `nexus/raw/sessions/SES-*.jsonl` | JSONL |

## Error Handling

### Failure Modes

1. **Atlas Missing**: Script fails if `nexus/atlas/atlas-meta.json` not found
2. **File Creation Failed**: Automatic retry, then rollback on final failure
3. **Git Commit Failed**: Automatic retry, then rollback on final failure
4. **Git Push Failed**:
   - With `-Push`: Warn and continue
   - With `-PushRequired`: Fail and rollback

### Recovery

On failure:
1. All created files are rolled back
2. Final log entry records failure
3. Exit code 1 returned

## Log Analysis

Parse JSONL logs with PowerShell:

```powershell
# Get all errors
Get-Content logs/omega-save.jsonl | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.level -eq "ERROR" }

# Get save history
Get-Content logs/omega-save.jsonl | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.message -eq "Save completed" }
```

## References

- Phase 91: Save Protocol Hardening
- Tag: v3.91.0
- Certificate: `certificates/phase91_0/CERT_PHASE_91_0.md`
