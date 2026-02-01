# PHASE E — DRIFT DETECTION — MANIFEST

## Commits (3)
- a243cce6 (E-SPEC)
- d0dd7b1f (E.1)
- 345df546 (E.2)

## Tags (3)
- phase-e-spec-sealed → a243cce6
- phase-e.1-sealed → d0dd7b1f
- phase-e.2-sealed → 345df546

## Tests progression
- Baseline: 4888
- E-SPEC: +19 → 4907
- E.1: +18 → 4925
- E.2: +16 → 4941
- TOTAL: +53 tests

## Files created (11)
### E-SPEC (5)
- docs/governance/DRIFT_STRATEGY.md
- docs/governance/DRIFT_INVARIANTS.md
- docs/governance/DRIFT_LINKAGE.md
- schemas/DRIFT_REPORT_SCHEMA.json
- templates/drift/DRIFT_REPORT.template.json

### E.1 (3)
- src/governance/drift/detector.ts
- tests/governance/drift_spec.test.ts
- tests/governance/drift_detector.test.ts

### E.2 (3)
- src/governance/drift/decisional.ts
- src/governance/drift/usage.ts
- tests/governance/drift_decisional_usage.test.ts

## Invariants (7)
- INV-DRIFT-001: Read-only detector
- INV-DRIFT-002: Policy-driven thresholds
- INV-DRIFT-003: Deterministic detection
- INV-DRIFT-004: Chain break → HALT
- INV-DRIFT-005: Manifest_ref required
- INV-DRIFT-006: New category detection (decisional)
- INV-DRIFT-007: Repetition threshold (usage)

## Policy (E_POLICY.json v1.1.0)
{
  "structural": { ... },
  "decisional": {
    "allowNewCategories": false,
    "τ_max_ratio_shift": 0.20
  },
  "usage": {
    "τ_max_repetitions": 3,
    "knownMisusePatterns": ["SKIP:3+", "FAIL:5+"]
  }
}

## SHA-256
- a243cce6: [full SHA à compléter après BLOC 2]
- d0dd7b1f: [full SHA à compléter]
- 345df546: [full SHA à compléter]

## Certification
Date: 2026-02-01
Standard: NASA-Grade L4
Audit: ChatGPT (hostile review)
