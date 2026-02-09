# Support Policy

## Version Lifecycle

Each OMEGA release follows a three-phase support lifecycle:

### CURRENT (12 months from release)
- Active development
- Bug fixes
- Security patches
- New features in minor versions

### MAINTENANCE (6 months after CURRENT)
- Critical bug fixes only
- Security patches
- No new features

### EOL (End of Life)
- No further updates
- Users should upgrade to a supported version

## Current Support Status

| Version | Status      | Released   | Maintenance | EOL        |
|---------|-------------|------------|-------------|------------|
| 1.0.x   | CURRENT     | 2026-02-10 | 2027-02-10  | 2027-08-10 |

## Upgrade Path

When upgrading between major versions:
1. Review CHANGELOG.md for breaking changes
2. Run `omega-release selftest` after upgrade
3. Verify all invariants pass
