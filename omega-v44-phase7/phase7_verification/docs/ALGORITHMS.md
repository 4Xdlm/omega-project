# OMEGA Phase 7 — Rendering Algorithms

**Version**: 1.2
**Standard**: NASA-Grade L4 / DO-178C Level A
**Status**: SEALED

---

## Overview

This document specifies the algorithms used in Phase 7 trunk rendering. All algorithms are deterministic and parameter-driven.

## 1. Trunk Shape: Anisotropic Disc

The trunk is rendered as an **anisotropic disc** (NOT a line, vector, or arrow).

### Formula

```
For angle θ ∈ [0, 2π]:
  r(θ) = baseRadius × (1 + anisotropy × cos(2 × (θ - orientation)))
```

Where:
- `baseRadius`: From render profile
- `anisotropy`: Clamped to [ANISO_MIN, ANISO_MAX]
- `orientation`: From trunk_signature (radians)

### Anisotropy Calculation

```typescript
function calculateAnisotropy(amplitude: number, params: RenderParams): number {
  const raw = amplitude * params.anisotropyScale;
  return clamp(raw, params.anisotropyMin, params.anisotropyMax);
}
```

## 2. O₂ Integration: Contour Deformation

O₂ (narrative oxygen) is rendered as **integrated contour deformation** (NOT a separate circle/ring).

### Formula

```
r_final(θ) = r(θ) × (1 + oxygenDeformation(θ))

oxygenDeformation(θ) = oxygenAmplitude × sin(oxygenFrequency × θ + oxygenPhase)
```

Where:
- `oxygenAmplitude`: From trunk_signature, clamped to [0, OXYGEN_AMP_MAX]
- `oxygenFrequency`: From trunk_signature (NOT calculated on UI side)
- `oxygenPhase`: From trunk_signature

### Important Constraints

```
╔══════════════════════════════════════════════════════════════════╗
║  ❌ oxygen.frequency is NEVER calculated on UI side              ║
║  ✅ oxygen.frequency comes from trunk_signature                  ║
║                                                                  ║
║  ❌ O₂ is NEVER a separate <circle> element                      ║
║  ✅ O₂ is integrated into the main shape contour                 ║
╚══════════════════════════════════════════════════════════════════╝
```

## 3. Color Mapping

Colors come **directly** from trunk_signature. No calculation on UI side.

### From Signature

```typescript
interface TrunkSignature {
  color: {
    h: number;  // Hue [0, 360) - FROM CORE
    s: number;  // Saturation [0, 1] - FROM CORE
    l: number;  // Lightness [0, 1] - FROM CORE
  };
  // ...
}
```

### Opacity Calculation

```typescript
function calculateOpacity(z: number, params: RenderParams): number {
  return params.opacityBase + (z * params.opacityZCoefficient);
}
```

Where `z` is the persistence axis value from trunk_signature.

## 4. SVG Path Generation

### Disc Path Algorithm

```typescript
function generateDiscPath(
  cx: number,
  cy: number,
  signature: TrunkSignature,
  params: RenderParams
): string {
  const points: string[] = [];
  const steps = params.pathResolution; // e.g., 360

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const r = calculateRadius(theta, signature, params);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);

    if (i === 0) {
      points.push(`M ${x} ${y}`);
    } else {
      points.push(`L ${x} ${y}`);
    }
  }

  points.push('Z');
  return points.join(' ');
}
```

## 5. Orientation Mapping

Orientation angles map to compass directions:

| Angle | Direction | Emotion Category |
|-------|-----------|------------------|
| 0° (0) | North | Joy/Serenity |
| 45° (π/4) | NE | - |
| 90° (π/2) | East | Anger/Surprise |
| 135° (3π/4) | SE | - |
| 180° (π) | South | Sadness/Grief |
| 225° (5π/4) | SW | - |
| 270° (3π/2) | West | Fear/Anxiety |
| 315° (7π/4) | NW | - |

Test TR-04 verifies all 8 orientations.

## 6. Clamping Functions

All values are clamped to valid ranges:

```typescript
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Specific clamps
const anisotropy = clamp(raw, params.anisotropyMin, params.anisotropyMax);
const opacity = clamp(raw, 0, 1);
const oxygenAmp = clamp(raw, 0, params.oxygenAmplitudeMax);
```

---

## Forbidden Patterns

| Pattern | Status | Alternative |
|---------|--------|-------------|
| `Math.random()` | ❌ | Use signature values |
| `Date.now()` | ❌ | Not needed in render |
| Hardcoded numbers | ❌ | Use params.* |
| H/S/L calculation | ❌ | Use signature.color |
| frequency calculation | ❌ | Use signature.oxygen.frequency |

---

*Algorithm Specification Version: 1.2 | SEALED*
