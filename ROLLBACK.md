# Rollback Procedure

## When to Rollback

Rollback to a previous version when:
- Self-test fails after upgrade
- Critical functionality broken
- Invariant violations detected

## Quick Rollback

```bash
# Generate rollback plan
omega-release rollback <target-version>

# Example: rollback from 1.1.0 to 1.0.0
omega-release rollback 1.0.0
```

## Manual Rollback Steps

1. **Backup** current installation
2. **Stop** running processes
3. **Install** target version from archive
4. **Verify** with `omega-release selftest`
5. **Restart** processes

## Major Version Rollback

Rolling back across major versions may require data migration.
The rollback plan will indicate this automatically.

## Verification

After rollback, verify:
- `omega-release selftest` — all 5 checks PASS
- `omega-release version show` — correct version
- `omega-release changelog validate` — changelog valid
