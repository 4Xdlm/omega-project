# OMEGA Phase 7 — Render Contract

**Version**: 1.2
**Standard**: NASA-Grade L4 / DO-178C Level A
**Status**: SEALED

---

## Overview

This contract defines the rendering pipeline for OMEGA Phase 7. The renderer transforms a `TrunkSignature` (from the frozen V4.4 core) into a deterministic visual representation.

## Contract Rules

### 1. Core Immutability

```
╔══════════════════════════════════════════════════════════════════╗
║  THE V4.4 CORE (PHASES 1-6) IS FROZEN AND EXTERNAL              ║
║                                                                  ║
║  Phase 7 = CLIENT of the core, NEVER modifier                   ║
║  trunk_signature comes from core (import-only)                  ║
║                                                                  ║
║  ❌ No modification to Phases 1-6                                ║
║  ❌ No H/S/L calculation on UI side                              ║
║  ❌ No oxygen.frequency calculation on UI side                   ║
╚══════════════════════════════════════════════════════════════════╝
```

### 2. Determinism Guarantee

- **Pixel-perfect**: Guaranteed ONLY within RCE-01 Premium environment
- **Certification**: Docker digest + lockfiles + render_report.json
- **No promise**: "rebuild bit-for-bit" outside RCE-01
- **Reproducibility**: Via immutable Docker digest

### 3. Zero Magic Numbers

- No arbitrary numbers hardcoded in source
- All parameters from: `render_profile` (post-calibration) OR `trunk_signature`
- Build MUST fail if `${...}` symbols remain unsubstituted

### 4. Schema Freeze

- `render_report.json` schema is FROZEN
- No additional fields allowed
- No "improvements" permitted
- Test TR-07 validates schema strictly

### 5. UI = Read Only

The UI displays ONLY what the core provides:
- ❌ No text labels
- ❌ No legends
- ❌ No grids
- ❌ No scores
- ❌ No percentages
- ❌ No interpretations
- ✅ Pure visualization

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OMEGA V4.4 CORE                             │
│                        (FROZEN - Phases 1-6)                        │
│                                                                     │
│  CoreEngine → Snapshot → Sentinel → Mycelium → TrunkSignature      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ trunk_signature (import-only)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PHASE 7 RENDERER                            │
│                        (CLIENT - Read Only)                         │
│                                                                     │
│  TrunkSignature + RenderParams → renderTrunk() → SVG               │
│                                                                     │
│  SVG → exportPng() (via RCE-01) → PNG                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Forbidden Elements

### In SVG Output

| Element | Status | Reason |
|---------|--------|--------|
| `<text>` | ❌ FORBIDDEN | UI = pure visualization |
| `<circle>` for O₂ | ❌ FORBIDDEN | O₂ is integrated deformation |
| Grid lines | ❌ FORBIDDEN | Even for debug |
| Annotations | ❌ FORBIDDEN | No interpretation |

### In Code

| Pattern | Status | Reason |
|---------|--------|--------|
| `Math.random()` | ❌ FORBIDDEN | Non-deterministic |
| `Date.now()` in render | ❌ FORBIDDEN | Non-deterministic |
| Hardcoded numbers | ❌ FORBIDDEN | Use params |
| H/S/L calculation | ❌ FORBIDDEN | From signature only |

---

## Certification Artifacts

Every render produces:

1. `trunk.svg` - Raw SVG output
2. `trunk.png` - Rasterized PNG (512×512)
3. `trunk.png.sha256` - Hash for verification
4. `render_report.json` - Full traceability report

---

## Verification

```powershell
# Verify determinism (100 runs)
./scripts/run-rce01-render.ps1 -Verify

# Expected: All 100 runs produce identical trunk.png.sha256
```

---

*Contract Version: 1.2 | SEALED*
