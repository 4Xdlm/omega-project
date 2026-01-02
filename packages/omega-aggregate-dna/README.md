# OMEGA Aggregate DNA v1.0.0

> **NASA-Grade DNA Aggregation with Adapter Pattern**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║   AGGREGATE DNA v1.0.0                                                        ║
║   Standard: NASA-Grade L4 / AS9100D / DO-178C Level A                         ║
║   Tests: 27 | Invariants: 6 | Pattern: Adapter                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## 🎯 Objectif

Agréger plusieurs **segments DNA** (issus du SegmentEngine) en un **DNA global** avec :
- Moyenne pondérée par `word_count`
- Merkle root pour preuves d'intégrité
- Déterminisme absolu
- Support de n'importe quel type DNA via **Adapter pattern**

## 📦 Installation

```bash
npm install @omega/aggregate-dna
```

## 🚀 Usage

### Avec MyceliumDNA (adapter fourni)

```typescript
import { aggregateDNA, MyceliumDNAAdapter } from "@omega/aggregate-dna";

const segmentDNAs = [dna1, dna2, dna3]; // MyceliumDNA[]

const result = aggregateDNA(
  {
    seed: 42,
    version: "1.0.0",
    segmentDNAs,
    segmentationHash: "..." // optionnel, du SegmentEngine
  },
  MyceliumDNAAdapter
);

console.log(result.dna.rootHash);           // Hash global
console.log(result.aggregation.merkle_root); // Preuve Merkle
console.log(result.stats.total_words);       // Stats sommées
```

### Avec un type DNA personnalisé

```typescript
import { aggregateDNA, AggregateAdapter } from "@omega/aggregate-dna";

// 1. Définir votre adapter
const MyCustomAdapter: AggregateAdapter<MyCustomDNA> = {
  extractEmotionField(dna) { /* ... */ },
  extractTextStats(dna) { /* ... */ },
  extractRootHash(dna) { return dna.hash; },
  extractSeed(dna) { return dna.seed; },
  makeAggregatedDNA(args) { /* ... */ }
};

// 2. Agréger
const result = aggregateDNA(input, MyCustomAdapter);
```

## 🔧 API

### `aggregateDNA(input, adapter)`

| Paramètre | Type | Description |
|-----------|------|-------------|
| `input.seed` | `number` | Seed (doit être identique pour tous les segments) |
| `input.version` | `string` | Version du format DNA |
| `input.segmentDNAs` | `DNA[]` | DNAs à agréger |
| `input.segmentWeights` | `number[]` | Poids explicites (optionnel) |
| `input.segmentationHash` | `string` | Hash du SegmentEngine (optionnel) |

### Résultat

```typescript
interface AggregateResult<DNA> {
  dna: DNA;                      // DNA agrégé
  aggregation: {
    segment_count: number;
    segment_root_hashes: string[];
    merkle_root: string;
    segmentation_hash: string | null;
    weighting: "word_count";
    aggregator_version: string;
  };
  stats: {
    total_segments: number;
    total_words: number;
    total_chars: number;
    total_lines: number;
    processing_time_ms: number;
  };
}
```

## 🌳 Merkle Tree

```typescript
import { computeMerkleRoot, generateMerkleProof, verifyMerkleProof } from "@omega/aggregate-dna";

// Calculer la racine
const root = computeMerkleRoot(["hash1", "hash2", "hash3"]);

// Générer une preuve pour vérification externe
const proof = generateMerkleProof(leaves, 1);

// Vérifier
const isValid = verifyMerkleProof("hash2", proof); // true
```

## ✅ Invariants L4 (6/6)

| ID | Nom | Assertion |
|----|-----|-----------|
| INV-AGG-01 | Déterminisme | Même segments → même rootHash |
| INV-AGG-02 | Merkle valide | Peut être recalculé |
| INV-AGG-03 | Ordre sensible | [A,B] ≠ [B,A] |
| INV-AGG-04 | Seed aligné | Tous les segments même seed |
| INV-AGG-05 | Stats sommées | word_count = Σ segments |
| INV-AGG-06 | Vide valide | 0 segments → DNA valide |

## 🧪 Tests

```bash
npm test              # 27 tests
npm test:coverage     # Avec couverture
```

## 🔗 Intégration Pipeline OMEGA

```typescript
import { segmentText } from "@omega/segment-engine";
import { buildMyceliumDNA } from "@omega/mycelium-bio";
import { aggregateDNA, MyceliumDNAAdapter } from "@omega/aggregate-dna";

// 1. Segmenter
const segResult = segmentText(rawText, { mode: "sentence" });

// 2. Construire DNA par segment
const segmentDNAs = segResult.segments.map(seg => {
  const analysis = analyzeText(seg.text);
  return buildMyceliumDNA(analysis, { seed: 42 });
});

// 3. Agréger
const globalDNA = aggregateDNA(
  {
    seed: 42,
    version: "1.0.0",
    segmentDNAs,
    segmentationHash: segResult.segmentation_hash
  },
  MyceliumDNAAdapter
);
```

## 📜 License

MIT — Francky (4Xdlm) + Claude

---

**OMEGA Project** — NASA-Grade Text Analysis Engine
