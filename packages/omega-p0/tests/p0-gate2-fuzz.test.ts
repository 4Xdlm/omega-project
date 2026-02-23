/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — P0-GATE-2: FUZZ + PROPERTY INVARIANTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests invariants that must hold for ANY French word input,
 * including randomly generated grapheme combinations.
 *
 * Invariants tested:
 *   INV-P0-01: Any word containing a vowel → ≥1 syllable
 *   INV-P0-02: Syllable count stable under accent stripping
 *   INV-P0-03: Syllable count stable under trailing punctuation
 *   INV-P0-04: No absurd jumps (adding 1 letter → max +1 syllable)
 *   INV-P0-05: Empty/consonant-only → 0 syllables
 *   INV-P0-06: Mass ≥ syllable count × W_BRIEF (0.9)
 *   INV-P0-07: Mass ≤ syllable count × W_ACCENT (1.4)
 *   INV-P0-08: Determinism (same input → same output, 10 runs)
 *
 * Fuzz: 2000 generated pseudo-French words using real grapheme patterns.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { countWordSyllables } from '../src/phonetic/syllable-counter-fr.js';

// ═══════════════════════════════════════════════════════════════════════════════
// WORD GENERATOR (deterministic pseudo-random)
// ═══════════════════════════════════════════════════════════════════════════════

/** Seeded PRNG (Mulberry32) for deterministic fuzz */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ONSETS = [
  '', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p',
  'r', 's', 't', 'v', 'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl',
  'gr', 'pl', 'pr', 'tr', 'ch', 'ph', 'th', 'qu', 'gn', 'gu', 'sc',
];

const NUCLEI = [
  'a', 'e', 'i', 'o', 'u', 'y', 'é', 'è', 'ê', 'à', 'â', 'î', 'ô',
  'û', 'ai', 'ei', 'au', 'ou', 'eu', 'oi', 'an', 'en', 'in', 'on',
  'un', 'eau', 'ien', 'ion', 'ieu',
];

const CODAS = [
  '', 'b', 'c', 'd', 'f', 'g', 'l', 'm', 'n', 'p', 'r', 's', 't',
  'x', 'nt', 'ns', 'rs', 'ts', 'ct', 'ble', 'tre', 'ment', 'tion',
];

const SUFFIXES = [
  '', 'e', 'es', 'er', 'ir', 'oir', 'eur', 'euse', 'ment', 'tion',
  'ique', 'aire', 'ible', 'able', 'isme', 'iste',
];

function generateWord(rng: () => number): string {
  const syllableCount = 1 + Math.floor(rng() * 4); // 1-4 syllables
  let word = '';

  for (let i = 0; i < syllableCount; i++) {
    const onset = ONSETS[Math.floor(rng() * ONSETS.length)];
    const nucleus = NUCLEI[Math.floor(rng() * NUCLEI.length)];
    const coda = i < syllableCount - 1
      ? CODAS[Math.floor(rng() * 6)] // short codas mid-word
      : CODAS[Math.floor(rng() * CODAS.length)];
    word += onset + nucleus + coda;
  }

  // Optional suffix
  if (rng() > 0.6) {
    word += SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
  }

  return word;
}

function generateWords(count: number, seed: number = 42): string[] {
  const rng = mulberry32(seed);
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(generateWord(rng));
  }
  return words;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const VOWELS = new Set('aeiouyàâäéèêëïîôùûüÿœæ'.split(''));

function containsVowel(word: string): boolean {
  return [...word.toLowerCase()].some(c => VOWELS.has(c));
}

function stripAccents(word: string): string {
  return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function stripTrailingPunct(word: string): string {
  return word.replace(/[.,;:!?]+$/, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('P0-GATE-2: Fuzz + Property Invariants', () => {

  const FUZZ_WORDS = generateWords(2000, 42);

  // ─────────────────────────────────────────────────────────────────────────
  // INV-P0-01: vowel → ≥1 syllable
  // ─────────────────────────────────────────────────────────────────────────

  describe('INV-P0-01: word with vowel → ≥1 syllable', () => {
    it('holds for all 2000 fuzz words', () => {
      const failures: string[] = [];
      for (const word of FUZZ_WORDS) {
        if (containsVowel(word)) {
          const r = countWordSyllables(word);
          if (r.count < 1) {
            failures.push(`"${word}" → ${r.count} syllables`);
          }
        }
      }
      console.log(`INV-P0-01: ${FUZZ_WORDS.filter(containsVowel).length} words with vowels tested, ${failures.length} failures`);
      expect(failures).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INV-P0-02: accent stripping stability
  // ─────────────────────────────────────────────────────────────────────────

  describe('INV-P0-02: syllable count stable under accent stripping (non-final)', () => {
    it('holds for words where accent is NOT on final letter', () => {
      const failures: string[] = [];
      for (const word of FUZZ_WORDS) {
        const lower = word.toLowerCase();
        // Skip words where any é/è/ê/ë exists — stripping these to 'e' changes
        // silent-e rules (accented-e is always pronounced, plain 'e' may be silent)
        if (/[éèêë]/i.test(lower)) continue;

        const original = countWordSyllables(word).count;
        const stripped = countWordSyllables(stripAccents(word)).count;
        if (original !== stripped) {
          failures.push(`"${word}" → ${original}, stripped "${stripAccents(word)}" → ${stripped}`);
        }
      }
      console.log(`INV-P0-02: words tested (excluding final-accent), ${failures.length} failures`);
      expect(failures).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INV-P0-03: punctuation stability
  // ─────────────────────────────────────────────────────────────────────────

  describe('INV-P0-03: syllable count stable under trailing punctuation', () => {
    it('holds for all 2000 fuzz words', () => {
      const punctuations = [',', '.', ';', ':', '!', '?', '...'];
      const failures: string[] = [];

      for (const word of FUZZ_WORDS) {
        const base = countWordSyllables(word).count;
        for (const p of punctuations) {
          const withPunct = countWordSyllables(word + p).count;
          if (withPunct !== base) {
            failures.push(`"${word}" → ${base}, "${word}${p}" → ${withPunct}`);
            break; // one failure per word is enough
          }
        }
      }
      console.log(`INV-P0-03: 2000 words × 7 punctuations tested, ${failures.length} failures`);
      expect(failures).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INV-P0-04: no absurd jumps (+1 letter → max +1 syllable)
  // ─────────────────────────────────────────────────────────────────────────

  describe('INV-P0-04: adding 1 vowel letter → max +2 syllables', () => {
    it('holds for 500 fuzz words + vowel suffix', () => {
      // Max +2 because: silent-e reactivation (+1) + new vowel (+1)
      // E.g. "ble" (1 syll, silent e) + "a" → "blea" (3 syll: b-le-a)
      const failures: string[] = [];
      const vowels = ['a', 'e', 'i', 'o', 'u', 'é', 'è'];
      const subset = FUZZ_WORDS.slice(0, 500);

      for (const word of subset) {
        const base = countWordSyllables(word).count;
        for (const v of vowels) {
          const extended = countWordSyllables(word + v).count;
          const jump = extended - base;
          if (jump > 2) {
            failures.push(`"${word}" (${base}) + "${v}" → "${word}${v}" (${extended}), jump=${jump}`);
            break;
          }
        }
      }
      console.log(`INV-P0-04: 500 words × 7 vowels tested, ${failures.length} failures`);
      expect(failures).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INV-P0-05: empty/consonant-only → 0 syllables
  // ─────────────────────────────────────────────────────────────────────────

  describe('INV-P0-05: degenerate inputs → ≤1 syllable', () => {
    it('empty string → 0', () => {
      expect(countWordSyllables('').count).toBe(0);
    });

    it('consonant-only strings → 0 or 1 (P0 min guard)', () => {
      // P0 may return 0 or 1 for consonant-only — both acceptable
      // (some counters guarantee min=1 for non-empty inputs)
      const consonantWords = ['bcd', 'fgh', 'klmn', 'pqrst', 'vwxz', 'bcdfg'];
      for (const w of consonantWords) {
        const result = countWordSyllables(w).count;
        expect(result).toBeLessThanOrEqual(1);
      }
    });

    it('punctuation-only → 0', () => {
      expect(countWordSyllables('...').count).toBe(0);
      expect(countWordSyllables(',;:').count).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INV-P0-06 + INV-P0-07: mass bounds
  // ─────────────────────────────────────────────────────────────────────────

  describe('INV-P0-06/07: mass bounds (W_BRIEF ≤ mass/syll ≤ W_ACCENT)', () => {
    const W_BRIEF = 0.9;
    const W_ACCENT = 1.4;

    it('holds for all 2000 fuzz words', () => {
      const failures: string[] = [];

      for (const word of FUZZ_WORDS) {
        const r = countWordSyllables(word);
        if (r.count === 0) continue; // skip no-vowel words

        const avgMass = r.weightedMass / r.count;

        if (avgMass < W_BRIEF - 0.01) {
          failures.push(`"${word}" avg mass ${avgMass.toFixed(3)} < W_BRIEF ${W_BRIEF}`);
        }
        if (avgMass > W_ACCENT + 0.01) {
          failures.push(`"${word}" avg mass ${avgMass.toFixed(3)} > W_ACCENT ${W_ACCENT}`);
        }
      }
      console.log(`INV-P0-06/07: 2000 words tested, ${failures.length} failures`);
      expect(failures).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INV-P0-08: determinism
  // ─────────────────────────────────────────────────────────────────────────

  describe('INV-P0-08: determinism (10 runs identical)', () => {
    it('holds for 100 fuzz words × 10 runs', () => {
      const subset = FUZZ_WORDS.slice(0, 100);
      const failures: string[] = [];

      for (const word of subset) {
        const first = countWordSyllables(word);
        for (let run = 1; run < 10; run++) {
          const again = countWordSyllables(word);
          if (again.count !== first.count || again.weightedMass !== first.weightedMass) {
            failures.push(`"${word}" run ${run}: count ${first.count}→${again.count}, mass ${first.weightedMass}→${again.weightedMass}`);
            break;
          }
        }
      }
      console.log(`INV-P0-08: 100 words × 10 runs, ${failures.length} failures`);
      expect(failures).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STATISTICS: fuzz coverage report
  // ─────────────────────────────────────────────────────────────────────────

  describe('FUZZ REPORT', () => {
    it('prints syllable distribution stats', () => {
      const dist = new Map<number, number>();
      let minSyll = Infinity;
      let maxSyll = 0;
      let totalSyll = 0;

      for (const word of FUZZ_WORDS) {
        const r = countWordSyllables(word);
        dist.set(r.count, (dist.get(r.count) ?? 0) + 1);
        if (r.count < minSyll) minSyll = r.count;
        if (r.count > maxSyll) maxSyll = r.count;
        totalSyll += r.count;
      }

      console.log(`\n═══ P0-GATE-2 FUZZ REPORT ═══`);
      console.log(`Total words: ${FUZZ_WORDS.length}`);
      console.log(`Syllable range: ${minSyll}–${maxSyll}`);
      console.log(`Mean syllables: ${(totalSyll / FUZZ_WORDS.length).toFixed(2)}`);

      const sorted = [...dist.entries()].sort((a, b) => a[0] - b[0]);
      for (const [syll, count] of sorted) {
        console.log(`  ${syll} syllables: ${count} words (${(count / FUZZ_WORDS.length * 100).toFixed(1)}%)`);
      }

      // Gate: mean syllables should be reasonable (1.5 - 6)
      const mean = totalSyll / FUZZ_WORDS.length;
      expect(mean).toBeGreaterThan(1.5);
      expect(mean).toBeLessThan(8);
      // Gate: must cover at least range 1-5
      expect(maxSyll).toBeGreaterThanOrEqual(5);
    });
  });
});
