# OMEGA Segment Engine v1.0.0

> **NASA-Grade Deterministic Text Segmentation**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║   SEGMENT ENGINE v1.0.0                                                       ║
║   Standard: NASA-Grade L4 / AS9100D / DO-178C Level A                         ║
║   Tests: 45+ | Invariants: 8 | Déterminisme: 100%                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## 🎯 Objectif

Découper un texte en **segments déterministes** avec :
- Offsets exacts (reconstruction possible)
- Hash stable (même input = même output)
- Gestion des abréviations FR/EN
- 3 modes : sentence, paragraph, scene

## 📦 Installation

```bash
npm install @omega/segment-engine
```

## 🚀 Usage

```typescript
import { segmentText } from "@omega/segment-engine";

// Mode sentence (par défaut)
const result = segmentText("Bonjour. Comment ça va?", { mode: "sentence" });

console.log(result.segments);
// [
//   { id: "seg_0_...", text: "Bonjour.", start: 0, end: 8, ... },
//   { id: "seg_1_...", text: "Comment ça va?", start: 9, end: 23, ... }
// ]

console.log(result.segmentation_hash);
// "a1b2c3d4..." (64 hex chars, déterministe)
```

## 🔧 Modes de segmentation

### Sentence (défaut)

Découpe sur ponctuation finale : `.` `!` `?` `…`

```typescript
segmentText("Dr. Watson entra. Il faisait froid.", { mode: "sentence" });
// → 2 segments (Dr. n'est pas coupé car abréviation)
```

### Paragraph

Découpe sur lignes vides (≥2 newlines)

```typescript
segmentText("Paragraphe 1\n\nParagraphe 2", { mode: "paragraph" });
// → 2 segments
```

### Scene

Découpe sur séparateurs explicites

```typescript
segmentText("Scene 1\n###\nScene 2", { mode: "scene" });
// → 2 segments (### exclu)
```

## ⚙️ Options

```typescript
interface SegmentationOptions {
  mode: "sentence" | "paragraph" | "scene";
  newline_policy?: "preserve" | "normalize_lf";  // défaut: normalize_lf
  abbreviations?: string[];                       // défaut: FR+EN
  sentence_break_on_double_newline?: boolean;     // défaut: true
  scene_separators?: string[];                    // défaut: ["###", "***", "---"]
}
```

## 📊 Résultat

```typescript
interface SegmentationResult {
  mode: SegmentMode;
  newline_policy: NewlinePolicy;
  input_char_count: number;
  segments: Segment[];
  segment_count: number;
  total_segment_char_count: number;
  segmentation_hash: string;      // SHA-256 déterministe
  coverage_ratio: number;
}

interface Segment {
  id: string;           // "seg_{index}_{hash12}"
  index: number;        // 0-based
  start: number;        // Offset char
  end: number;          // Offset char
  text: string;         // Slice exacte
  word_count: number;
  char_count: number;
  line_count: number;
}
```

## ✅ Invariants L4 (8/8)

| ID | Nom | Assertion |
|----|-----|-----------|
| INV-SEG-01 | Offsets valides | 0 ≤ start < end ≤ input.length |
| INV-SEG-02 | Slice exacte | text === input.slice(start, end) |
| INV-SEG-03 | Non-vide | text.trim().length > 0 |
| INV-SEG-04 | Index monotone | segments[i].index === i |
| INV-SEG-05 | Hash déterministe | N runs → même hash |
| INV-SEG-06 | Char count | char_count === text.length |
| INV-SEG-07 | Word count | word_count ≥ 1 si text non vide |
| INV-SEG-08 | Newline stable | normalize_lf → pas de \r |

## 🧪 Tests

```bash
npm test              # 45+ tests
npm test:coverage     # Avec couverture
```

## 📋 Abréviations supportées

### Français
M., Mme., Mlle., Dr., Pr., Me., Mgr., St., Ste., cf., ex., fig., vol., p., pp., n°, art., chap., etc., env., réf., tél., av., bd., p.-ex., c.-à-d., J.-C.

### Anglais
Mr., Mrs., Ms., Dr., Prof., Jr., Sr., Inc., Ltd., Co., Corp., vs., e.g., i.e., approx., Ph.D., M.D., No., Vol., Fig., Ch., Rev., St., Ave., Blvd.

## 🔗 Intégration Pipeline OMEGA

```typescript
import { segmentText } from "@omega/segment-engine";
import { buildMyceliumDNA } from "@omega/mycelium-bio";

// 1. Segmenter le texte
const segResult = segmentText(rawText, { mode: "sentence" });

// 2. Analyser chaque segment
for (const seg of segResult.segments) {
  const analysis = analyzeText(seg.text);
  // ...
}

// 3. Agréger en DNA global
// (module omega-aggregate-dna)
```

## 📜 License

MIT — Francky (4Xdlm) + Claude

---

**OMEGA Project** — NASA-Grade Text Analysis Engine
