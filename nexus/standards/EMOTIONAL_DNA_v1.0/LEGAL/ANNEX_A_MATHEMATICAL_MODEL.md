# ANNEX A: MATHEMATICAL MODEL

**Standard**: Emotional DNA IR v1.0
**Document**: Mathematical Foundations

---

## A.1 EMOTIONAL VECTOR SPACE

### A.1.1 Definition

The emotional state of a text is represented as a vector in n-dimensional space:

```
E = (e₁, e₂, ..., eₙ) ∈ [-1, 1]ⁿ
```

Where:
- `n` = number of dimensions (default: 14 for Emotion14 model)
- `eᵢ` = intensity of emotion i, normalized to [-1, 1]

### A.1.2 Normalization

All emotional values are normalized using min-max scaling:

```
e_normalized = 2 * (e_raw - min) / (max - min) - 1
```

This ensures:
- Range: [-1, 1]
- Neutral: 0
- Positive extreme: +1
- Negative extreme: -1

---

## A.2 CONFIDENCE CALCULATION

### A.2.1 Formula

Confidence is computed as:

```
C = 1 - (σ / σ_max)
```

Where:
- `σ` = standard deviation of repeated analyses
- `σ_max` = theoretical maximum deviation (calibrated per analyzer)

### A.2.2 Bounds

- `C ∈ [0, 1]`
- `C >= 0.5` recommended for production use
- `C < 0.3` indicates unreliable analysis

---

## A.3 SIMILARITY METRICS

### A.3.1 Cosine Similarity

```
sim(A, B) = (A · B) / (||A|| * ||B||)
```

Used for comparing emotional vectors.

### A.3.2 Distance

```
d(A, B) = 1 - sim(A, B)
```

Normalized distance in [0, 2].

---

## A.4 CONSTANTS

### A.4.1 Calibrated at Runtime

| Constant | Description | Calibration Method |
|----------|-------------|-------------------|
| `σ_max` | Max deviation | Empirical from training set |
| `threshold_low` | Low confidence cutoff | User-configurable |
| `threshold_high` | High confidence cutoff | User-configurable |

### A.4.2 Fixed Constants

| Constant | Value | Justification |
|----------|-------|---------------|
| `DIMENSIONS_DEFAULT` | 14 | Emotion14 model standard |
| `PRECISION_DIGITS` | 6 | IEEE 754 float precision |
| `HASH_LENGTH` | 64 | SHA256 hex digits |

---

## A.5 DETERMINISM REQUIREMENTS

### A.5.1 Floating Point

- Round to 6 decimal places: `Math.round(x * 1e6) / 1e6`
- Use IEEE 754 double precision
- Handle NaN and Infinity as errors

### A.5.2 Ordering

- Sort arrays lexicographically
- Sort object keys alphabetically
- Use stable sort algorithms

---

## A.6 HASH COMPUTATION

### A.6.1 Algorithm

SHA256 is used for all hashing:

```typescript
function computeHash(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data, 'utf8')
    .digest('hex');
}
```

### A.6.2 Canonicalization Before Hashing

1. Remove null/undefined values
2. Sort keys alphabetically
3. Minimize whitespace
4. Encode as UTF-8

---

*ANNEX A - Mathematical Model - OMEGA Standard v1.0*
