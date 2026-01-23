# OMEGA Phase 7 — Trunk Specification v1.2

**Version**: 1.2
**Standard**: NASA-Grade L4 / DO-178C Level A
**Status**: SEALED

---

## Overview

The "Trunk" (Tronc) is the visual representation of a narrative's emotional signature. It encodes multiple dimensions of the OMEGA analysis into a single, deterministic visual artifact.

## Visual Metaphor

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     ANISOTROPIC DISC                            │
│                                                                 │
│           Shape determined by:                                  │
│           • Orientation (dominant direction)                    │
│           • Amplitude (emotional intensity)                     │
│           • O₂ (narrative oxygen - contour deformation)         │
│                                                                 │
│           Color determined by:                                  │
│           • H/S/L from core signature                           │
│           • Opacity from Z-axis (persistence)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## TrunkSignature Interface

```typescript
interface TrunkSignature {
  // Unique identifier
  id: string;

  // Orientation in radians [0, 2π)
  orientation: number;

  // Emotional amplitude [0, 1]
  amplitude: number;

  // Color (from core - NOT calculated on UI)
  color: {
    h: number;  // Hue [0, 360)
    s: number;  // Saturation [0, 1]
    l: number;  // Lightness [0, 1]
  };

  // Persistence axis [0, 1]
  persistence: number;

  // Oxygen parameters (from core)
  oxygen: {
    level: number;      // O₂ level [0, 100]
    amplitude: number;  // Deformation amplitude [0, 1]
    frequency: number;  // Wave frequency (FROM CORE)
    phase: number;      // Wave phase [0, 2π)
  };

  // Source hash for traceability
  sourceHash: string;
}
```

## Visual Encoding

### 1. Shape (Anisotropic Disc)

| Property | Encodes | Range |
|----------|---------|-------|
| Orientation | Dominant emotional direction | 0° - 360° |
| Elongation | Emotional amplitude | Subtle to pronounced |
| Contour ripple | O₂ level | Smooth to wavy |

### 2. Color

| Property | Encodes | Source |
|----------|---------|--------|
| Hue | Emotional valence | signature.color.h |
| Saturation | Emotional intensity | signature.color.s |
| Lightness | Emotional arousal | signature.color.l |
| Opacity | Persistence | Calculated from signature.persistence |

### 3. O₂ Deformation

| Property | Encodes | Source |
|----------|---------|--------|
| Amplitude | O₂ variation | signature.oxygen.amplitude |
| Frequency | O₂ pattern | signature.oxygen.frequency (FROM CORE) |
| Phase | O₂ starting point | signature.oxygen.phase |

## Rendering Rules

### MUST

- ✅ Use anisotropic disc shape
- ✅ Integrate O₂ as contour deformation
- ✅ Use H/S/L from signature directly
- ✅ Use all parameters from render profile or signature

### MUST NOT

- ❌ Render as line, vector, or arrow
- ❌ Render O₂ as separate circle/ring
- ❌ Calculate H/S/L on UI side
- ❌ Calculate oxygen.frequency on UI side
- ❌ Use hardcoded numeric values
- ❌ Include any text or labels

## Output Specification

### SVG

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 512 512"
     width="512"
     height="512">
  <path d="..." fill="hsl(h, s%, l%)" fill-opacity="opacity"/>
</svg>
```

No other elements allowed (no `<text>`, no `<circle>`, no `<line>`).

### PNG

| Property | Value |
|----------|-------|
| Dimensions | 512×512 pixels |
| Color depth | 24-bit RGB + 8-bit alpha |
| Color space | sRGB |
| Compression | PNG default |

## Test Fixtures

Test fixtures cover:

1. **Orientations**: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
2. **Amplitudes**: 0 (neutral), 0.5 (medium), 1.0 (maximum)
3. **O₂ levels**: 0 (depleted), 50 (stable), 100 (saturated)
4. **Extremes**: All boundary conditions

Minimum 20 fixtures required.

## Validation

| Test | Validates |
|------|-----------|
| TR-01 | Determinism (100 runs identical) |
| TR-02 | No magic numbers in code |
| TR-03 | Extreme values handled |
| TR-04 | All 8 orientations |
| TR-05 | Schema validation |
| TR-06 | No forbidden SVG elements |
| TR-07 | render_report.json schema freeze |

---

*Trunk Specification Version: 1.2 | SEALED*
