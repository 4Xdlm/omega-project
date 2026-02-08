/**
 * OMEGA Creation Pipeline — Adversarial Fuzz Generator
 * Phase C.4 — C4-INV-11: Adversarial resilience
 * Generates deterministic fuzzed IntentPacks for chaos testing
 */

import { sha256 } from '@omega/canon-kernel';
import type { IntentPack, FuzzCategory, FuzzedIntentPack } from '../types.js';

function fuzzContradiction(base: IntentPack, index: number): FuzzedIntentPack {
  const mutatedCanon = {
    entries: [
      ...base.canon.entries,
      {
        id: `CANON-FUZZ-${index}`,
        category: 'rule' as const,
        statement: 'The light must always be off',
        immutable: true,
      },
    ],
  };
  return {
    fuzz_id: `FUZZ-CONTRA-${index}`,
    category: 'contradiction',
    mutation: 'Added contradicting canon entry',
    pack: { ...base, canon: mutatedCanon },
  };
}

function fuzzAmbiguity(base: IntentPack, index: number): FuzzedIntentPack {
  const mutatedIntent = {
    ...base.intent,
    themes: ['everything', 'nothing', 'maybe'],
    premise: 'Something happens somewhere to someone.',
  };
  return {
    fuzz_id: `FUZZ-AMBIG-${index}`,
    category: 'ambiguity',
    mutation: 'Vague intent with contradictory themes',
    pack: { ...base, intent: mutatedIntent },
  };
}

function fuzzImpossibleConstraints(base: IntentPack, index: number): FuzzedIntentPack {
  const mutatedConstraints = {
    ...base.constraints,
    min_scenes: 100,
    max_scenes: 2,
  };
  return {
    fuzz_id: `FUZZ-IMPOSSIBLE-${index}`,
    category: 'impossible_constraints',
    mutation: 'min_scenes > max_scenes',
    pack: { ...base, constraints: mutatedConstraints },
  };
}

function fuzzEmptyFields(base: IntentPack, index: number): FuzzedIntentPack {
  const mutatedIntent = {
    ...base.intent,
    title: '',
    themes: [],
  };
  return {
    fuzz_id: `FUZZ-EMPTY-${index}`,
    category: 'empty_fields',
    mutation: 'Empty title and themes',
    pack: { ...base, intent: mutatedIntent },
  };
}

function fuzzOverflow(base: IntentPack, index: number): FuzzedIntentPack {
  const themes: string[] = [];
  for (let i = 0; i < 100; i++) {
    themes.push(`theme-${i}-${sha256(String(i)).slice(0, 8)}`);
  }
  const mutatedIntent = {
    ...base.intent,
    themes,
    target_word_count: Number.MAX_SAFE_INTEGER,
  };
  return {
    fuzz_id: `FUZZ-OVERFLOW-${index}`,
    category: 'overflow',
    mutation: '100 themes and MAX_SAFE_INTEGER word count',
    pack: { ...base, intent: mutatedIntent },
  };
}

function fuzzTypeMismatch(base: IntentPack, index: number): FuzzedIntentPack {
  const mutatedGenome = {
    ...base.genome,
    target_burstiness: -1,
    target_lexical_richness: 999,
  };
  return {
    fuzz_id: `FUZZ-TYPE-${index}`,
    category: 'type_mismatch',
    mutation: 'Negative burstiness, richness > 1',
    pack: { ...base, genome: mutatedGenome },
  };
}

function fuzzCircularReference(base: IntentPack, index: number): FuzzedIntentPack {
  const mutatedCanon = {
    entries: [
      ...base.canon.entries,
      {
        id: 'CANON-CIRC-A',
        category: 'rule' as const,
        statement: 'Rule A depends on Rule B',
        immutable: true,
      },
      {
        id: 'CANON-CIRC-B',
        category: 'rule' as const,
        statement: 'Rule B depends on Rule A',
        immutable: true,
      },
    ],
  };
  return {
    fuzz_id: `FUZZ-CIRC-${index}`,
    category: 'circular_reference',
    mutation: 'Canon entries with circular dependency',
    pack: { ...base, canon: mutatedCanon },
  };
}

function fuzzHostileContent(base: IntentPack, index: number): FuzzedIntentPack {
  const mutatedIntent = {
    ...base.intent,
    title: '<script>alert("xss")</script>',
    premise: 'Test\x00null\x01bytes\x02here \u200B\u200C\u200D',
  };
  return {
    fuzz_id: `FUZZ-HOSTILE-${index}`,
    category: 'hostile_content',
    mutation: 'XSS injection + null bytes + zero-width chars',
    pack: { ...base, intent: mutatedIntent },
  };
}

type FuzzFn = (base: IntentPack, index: number) => FuzzedIntentPack;

const FUZZ_MAP: Readonly<Record<FuzzCategory, FuzzFn>> = {
  contradiction: fuzzContradiction,
  ambiguity: fuzzAmbiguity,
  impossible_constraints: fuzzImpossibleConstraints,
  empty_fields: fuzzEmptyFields,
  overflow: fuzzOverflow,
  type_mismatch: fuzzTypeMismatch,
  circular_reference: fuzzCircularReference,
  hostile_content: fuzzHostileContent,
};

export function generateFuzzedPacks(
  basePack: IntentPack,
  count: number,
  categories: readonly FuzzCategory[],
): readonly FuzzedIntentPack[] {
  const packs: FuzzedIntentPack[] = [];
  let index = 0;

  while (packs.length < count) {
    for (const cat of categories) {
      if (packs.length >= count) break;
      const fuzzFn = FUZZ_MAP[cat];
      packs.push(fuzzFn(basePack, index));
      index++;
    }
  }

  return packs;
}
