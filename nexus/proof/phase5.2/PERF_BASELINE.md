# PERF_BASELINE.md
# Phase 5.2 - Performance Baseline

**Date**: 2026-01-17
**Node**: v24.12.0
**Platform**: win32

---

## BASELINE MEASUREMENTS

| Benchmark | Iterations | Mean (ms) | P95 (ms) |
|-----------|------------|-----------|----------|
| tokenize(short) | 10000 | 0.0014 | 0.0022 |
| tokenize(medium) | 5000 | 0.0082 | 0.0156 |
| tokenize(long) | 1000 | 0.0864 | 0.0914 |
| parse(query1) | 5000 | 0.0010 | 0.0020 |
| parse(query2) | 5000 | 0.0014 | 0.0027 |
| parse(query3) | 5000 | 0.0011 | 0.0019 |
| parse(query4) | 5000 | 0.0020 | 0.0029 |
| parse(query5) | 5000 | 0.0021 | 0.0031 |
| search(simple) | 2000 | 0.0177 | 0.0249 |
| search(multi-term) | 2000 | 0.0126 | 0.0124 |
| search(fuzzy) | 500 | 0.0721 | 0.0852 |

---

## OPTIMIZATION TARGETS

### Target 1: SearchEngine.tokenize()

**Current Code** (packages/search/src/engine.ts:295-312):
```typescript
tokenize(text: string): string[] {
  const raw = text.toLowerCase().split(/\W+/).filter(Boolean);

  let tokens = raw.filter(
    (t) =>
      t.length >= this.config.minTokenLength &&
      !this.config.stopWords.includes(t)  // <-- O(n) lookup
  );

  if (this.config.stemming) {
    tokens = tokens.map((t) => this.stem(t));
  }

  return tokens;
}
```

**Issue**: `stopWords.includes(t)` is O(n) per token. With 40+ stop words and many tokens, this adds up.

**Optimization**: Convert stopWords to Set for O(1) lookup.

### Target 2: SearchEngine.stem()

**Current Code** (packages/search/src/engine.ts:317-328):
```typescript
private stem(word: string): string {
  const suffixes = ['ing', 'ed', 'ly', 'es', 's', 'ment', 'ness', 'tion', 'able', 'ible'];
  // <-- Array created on EVERY call

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}
```

**Issue**: Array literal created on every stem() call.

**Optimization**: Move suffixes to module-level constant.

---

## TEST DATA

**Short text**: "The quick brown fox jumps over the lazy dog." (44 chars)

**Medium text**: Lorem ipsum paragraph (464 chars)

**Long text**: 20x medium text (~9KB)

**100 documents** indexed for search tests.

---

## EXPECTED GAINS

| Target | Expected Gain |
|--------|---------------|
| tokenize (Set optimization) | 10-30% |
| stem (constant array) | 5-10% |

If gains < 10%, optimization will be REVERTED.
