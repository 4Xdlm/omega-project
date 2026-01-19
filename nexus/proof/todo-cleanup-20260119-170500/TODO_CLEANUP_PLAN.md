# TODO CLEANUP PLAN
**Standard**: NASA-Grade L4 | **Date**: 2026-01-19
**Baseline**: 260038a | **Mission**: ZERO TODO

---

## A) BASELINE STATS

| Metric | Value |
|--------|-------|
| Total Raw Occurrences | 1397 |
| In nexus/proof/** (EXCLUDED) | 1092 |
| In packages/genome/** (FROZEN) | 0 |
| In packages/mycelium/** (FROZEN) | 0 |
| In OMEGA_SENTINEL_SUPREME/sentinel/** (FROZEN) | 0 |
| **Editable Scope** | **305** |

### Breakdown by Tag (Editable Scope)
| Tag | Count |
|-----|-------|
| TODO | ~150 |
| XXX | ~100 |
| FIXME | ~30 |
| HACK | ~25 |

### Breakdown by File Type (Editable Scope)
| Extension | Count |
|-----------|-------|
| .md | ~200 |
| .ts | ~50 |
| .ps1 | ~30 |
| .sh | ~8 |
| .js | ~8 |
| .json | ~5 |
| .rs | ~3 |

---

## B) SCOPE RULES

### EXCLUDED (NO TOUCH)
1. `packages/genome/**` - FROZEN (Phase 28)
2. `packages/mycelium/**` - FROZEN
3. `OMEGA_SENTINEL_SUPREME/sentinel/**` - FROZEN (Phase 27)
4. `nexus/proof/**` - Historical proofs (immutable)
5. `sprint28_5/**` - Old archive
6. Binary files (png, jpg, pdf, zip)

### EDITABLE
- `docs/**`
- `gateway/**` (source + tests)
- `OMEGA_MASTER_DOSSIER_v*/**`
- `OMEGA_PHASE*/**`
- `omega-*/**`
- `certificates/**`
- `nexus/genesis/**`, `nexus/handover/**`, `nexus/tooling/**`
- Root level `.md`, `.ts`, `.ps1` files

---

## C) REPLACEMENT RULES

### Standard Replacements
| Original | Replacement |
|----------|-------------|
| `TODO:` | `BACKLOG:` |
| `TODO ` | `BACKLOG ` |
| `FIXME:` | `BACKLOG_FIX:` |
| `FIXME ` | `BACKLOG_FIX ` |
| `HACK:` | `BACKLOG_TECHDEBT:` |
| `HACK ` | `BACKLOG_TECHDEBT ` |
| `XXX` (standalone) | `PLACEHOLDER` |

### Special Cases - SCAN PATTERN STRINGS
Files containing regex patterns for scanning (e.g., `omega-math-scan.ps1`):
- Pattern strings like `"(TODO|FIXME|HACK|XXX)"` MUST remain intact
- Add comment above: `# NOTE: INTENTIONAL PATTERN STRING (audit tool)`
- Document each exception

### Preservation Rules
1. Keep surrounding context intact
2. Preserve indentation
3. Preserve line endings
4. Do not reformat content

---

## D) EXECUTION STRATEGY

### Phase 1: Documentation Files (.md)
- Most occurrences are documentation
- Safe replacements, no code impact

### Phase 2: Source Code (.ts, .js, .rs)
- Test files may test TODO detection
- Check if markers are in test assertions

### Phase 3: Scripts (.ps1, .sh)
- Many contain scan patterns
- Careful pattern preservation required

### Phase 4: Config Files (.json)
- May contain enum values like `"TODO"`
- Check context before replacing

---

## E) VALIDATION

1. Run `npm test` after modifications
2. Run AFTER scan - must be 0 occurrences
3. Verify FROZEN modules unchanged
4. Generate proof artifacts

---

## F) FILES TO MODIFY (Editable Scope)

Total unique files: ~100

Key categories:
1. Documentation (docs/, OMEGA_MASTER_DOSSIER_*, root .md) - ~70 files
2. Test files (gateway/tests/) - ~10 files
3. Source files (gateway/src/, omega-*/) - ~10 files
4. Scripts (*.ps1, *.sh) - ~5 files
5. Config (*.json) - ~5 files

---

**Execution**: Automated via `apply_cleanup.cjs`
