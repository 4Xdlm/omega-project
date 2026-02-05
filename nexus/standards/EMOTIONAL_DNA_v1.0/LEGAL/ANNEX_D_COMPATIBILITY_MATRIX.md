# ANNEX D: COMPATIBILITY MATRIX

**Standard**: Emotional DNA IR v1.0
**Document**: Version Compatibility Rules

---

## D.1 VERSIONING SCHEME

### D.1.1 Semantic Versioning

The Standard follows Semantic Versioning 2.0.0:

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Incompatible changes to required fields
- **MINOR**: Backward-compatible additions (new optional fields)
- **PATCH**: Bug fixes, documentation updates

### D.1.2 Current Version

**v1.0.0** - Initial release

---

## D.2 COMPATIBILITY RULES

### D.2.1 Forward Compatibility

| Producer Version | Consumer Version | Compatible |
|-----------------|------------------|------------|
| 1.0.x | 1.0.x | YES |
| 1.0.x | 1.1.x | YES (consumer ignores new) |
| 1.0.x | 2.0.x | NO (major change) |

### D.2.2 Backward Compatibility

| Producer Version | Consumer Version | Compatible |
|-----------------|------------------|------------|
| 1.1.x | 1.0.x | YES (old consumer works) |
| 1.2.x | 1.0.x | YES |
| 2.0.x | 1.0.x | NO |

---

## D.3 MIGRATION PATHS

### D.3.1 From v1.0.x to v1.1.x (Future)

**Expected Changes**:
- New optional fields only
- No removal of existing fields
- No type changes to existing fields

**Migration**: None required

### D.3.2 From v1.x to v2.0 (Future)

**Potential Changes**:
- New required fields
- Type changes
- Field removals

**Migration**: Conversion tool will be provided

---

## D.4 DEPRECATION POLICY

### D.4.1 Deprecation Timeline

1. **Announcement**: Feature marked deprecated in MINOR release
2. **Warning Period**: 2 MINOR releases minimum
3. **Removal**: Next MAJOR release

### D.4.2 Deprecated Features (None Currently)

| Feature | Deprecated In | Removed In | Migration |
|---------|---------------|------------|-----------|
| (none) | - | - | - |

---

## D.5 IMPLEMENTATION REQUIREMENTS

### D.5.1 Producers

- MUST produce valid IR per current schema
- MUST include version field
- SHOULD support compatibility field for version hints

### D.5.2 Consumers

- MUST accept all v1.0.x IR
- MUST ignore unknown fields (forward compat)
- SHOULD warn on deprecated fields

---

## D.6 COMPATIBILITY TESTING

### D.6.1 Test Matrix

| Test | v1.0.0 | v1.0.1+ |
|------|--------|---------|
| Minimal IR | PASS | PASS |
| Full IR | PASS | PASS |
| Unknown field | IGNORE | IGNORE |

### D.6.2 Reference Implementation

The reference validator in `validator.ts` defines canonical behavior.

---

## D.7 ECOSYSTEM COMPATIBILITY

### D.7.1 OMEGA Modules

| Module | IR Version | Status |
|--------|------------|--------|
| genome | 1.0.x | Compatible |
| mycelium | 1.0.x | Compatible |
| mycelium-bio | 1.0.x | Compatible |

### D.7.2 External Systems

IR can be consumed by any system that:
- Parses JSON
- Validates against JSON Schema
- Ignores unknown fields

---

*ANNEX D - Compatibility Matrix - OMEGA Standard v1.0*
