# @omega/genome

Narrative Genome - Fingerprint for narrative works.

## Version

**1.2.0** (SPEC v1.2)

## Standard

NASA-Grade L4

## Canonicalization Rules (FROZEN)

```
╔════════════════════════════════════════════════════════════════════════════╗
║  FINGERPRINT = SHA256(canonicalBytes(payloadSansMetadata))                 ║
║                                                                            ║
║  Rules:                                                                    ║
║  - Key ordering: lexicographic (Unicode code point)                        ║
║  - Float quantization: 1e-6 (6 decimal places)                             ║
║  - Encoding: UTF-8 strict                                                  ║
║  - Whitespace: none                                                        ║
║  - NaN/Infinity: REJECTED                                                  ║
║  - Metadata: EXCLUDED from hash                                            ║
║                                                                            ║
║  Golden Hash: 172f970a3b2bb5713743d0cd3ecf2d7537699cba5694a3e6946b786...   ║
╚════════════════════════════════════════════════════════════════════════════╝
```

## Usage

```typescript
import { analyze, compare, isValidFingerprint } from "@omega/genome";

// Analyze a work
const genome = analyze(omegaDNA, { seed: 42 });

// Get fingerprint
console.log(genome.fingerprint); // SHA-256 hex

// Compare two works
const result = compare(genomeA, genomeB);
console.log(result.score);    // [0, 1]
console.log(result.verdict);  // IDENTICAL | VERY_SIMILAR | SIMILAR | DIFFERENT | UNIQUE
```

## Invariants (14)

| ID | Description |
|----|-------------|
| INV-GEN-01 | Déterminisme |
| INV-GEN-02 | Fingerprint = SHA256(canonical) |
| INV-GEN-03 | Axes bornés [0,1] |
| INV-GEN-04 | Distribution somme = 1.0 |
| INV-GEN-05 | Similarité symétrique |
| INV-GEN-06 | Similarité bornée [0,1] |
| INV-GEN-07 | Auto-similarité = 1.0 |
| INV-GEN-08 | Version tracée |
| INV-GEN-09 | Source tracée |
| INV-GEN-10 | Read-only |
| INV-GEN-11 | Metadata hors fingerprint |
| INV-GEN-12 | Emotion14 sanctuarisé |
| INV-GEN-13 | Sérialisation canonique |
| INV-GEN-14 | Float quantifié 1e-6 |

## License

PROPRIETARY - OMEGA Project
