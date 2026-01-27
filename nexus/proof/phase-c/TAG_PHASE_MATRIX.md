# Tag Phase Matrix
Generated: 2026-01-27T14:10:00Z

## Phases vs Git Reality

| Phase | Roadmap v2.0 | Git Tag | Commit | Evidence File |
|-------|--------------|---------|--------|---------------|
| A-INFRA | Core Cert | phase-a-v1 | 2aa5e5f | nexus/proof/phase-a/ |
| B-FORGE | Determinism | phase-b-sealed | 6e9b684 | nexus/proof/phase-b/ |
| C | Cleanup & Audit | [NONE] | 6c906ec (HEAD) | This prompt |

## Commande de vérification
```bash
git tag -l "phase-*" --format="%(refname:short) %(objectname:short)"
```

Output:
```
phase-a-v1 2aa5e5f
phase-b-sealed 6e9b684
```

## Écarts
- Phase C has no tag yet (in progress)
- Phase 0 (Foundation) has no explicit tag

## Note
Aucun tag créé par ce prompt — documentation uniquement.

## Tag Details

### phase-a-v1
```bash
git show phase-a-v1 --oneline --no-patch
```
Commit: 2aa5e5f
Phase: A-INFRA (Core Infrastructure Certification)

### phase-b-sealed
```bash
git show phase-b-sealed --oneline --no-patch
```
Commit: 6e9b684
Phase: B-FORGE (Determinism & Forge)
Status: SEALED (frozen, no modifications allowed)
