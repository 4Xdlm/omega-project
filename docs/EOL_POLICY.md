# OMEGA EOL Policy - Cross-Platform Line Endings

## Overview
Line ending consistency is critical for cross-platform development and git integrity.

## Version
- Version: 3.95.0
- Phase: 95
- Standard: NASA-Grade L4

## EOL Rules

### LF (Unix) - `\n`
All source code and documentation files:
- `.ts`, `.js`, `.cjs`, `.mjs`
- `.json`, `.yaml`, `.yml`
- `.md`, `.html`, `.css`
- `.sh` (shell scripts)
- `.vue`, `.tsx`, `.jsx`

### CRLF (Windows) - `\r\n`
Windows-specific scripts only:
- `.ps1`, `.psm1`, `.psd1` (PowerShell)
- `.bat`, `.cmd` (Batch)

### Binary (Unchanged)
Never modify:
- Images: `.png`, `.jpg`, `.gif`, `.ico`
- Archives: `.zip`, `.tar`, `.gz`
- Documents: `.pdf`, `.doc`

## Commands

```bash
# Check compliance
node scripts/eol/normalize.cjs check

# Analyze all files
node scripts/eol/normalize.cjs analyze

# Fix issues (dry-run)
node scripts/eol/normalize.cjs fix --dry-run

# Fix issues (apply)
node scripts/eol/normalize.cjs fix
```

## Git Configuration

The `.gitattributes` file enforces EOL on checkout:
- `text=auto` for most files
- `eol=lf` for source code
- `eol=crlf` for PowerShell/Batch

## References
- Tag: v3.95.0
- Phase: 95
