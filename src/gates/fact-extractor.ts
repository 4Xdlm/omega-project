/**
 * OMEGA Truth Gate Fact Extractor v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * F2: string → CanonicalFact[]
 *
 * INVARIANTS:
 * - F2-INV-01: Fact ID is deterministic hash of (sourceSpan, subject, predicate, object, scope)
 * - F2-INV-02: sourceSpan is always provided
 * - F2-INV-03: Output sorted by sourceSpan.start then end
 * - F2-INV-04: No probabilistic extraction (pattern-based only)
 *
 * SPEC: TRUTH_GATE_SPEC v1.0 §F2
 */

import { hashCanonical } from '../shared/canonical';
import { normalizeForCanon } from '../canon';
import type { CanonicalFact, FactId, SourceSpan } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pattern for extracting facts.
 * Each pattern defines a regex and how to map captures to fact fields.
 */
interface ExtractionPattern {
  readonly name: string;
  readonly pattern: RegExp;
  readonly extract: (match: RegExpExecArray, text: string) => Omit<CanonicalFact, 'id'> | null;
}

/**
 * Built-in extraction patterns.
 * These are deterministic regex-based patterns (no ML/NLP).
 */
const EXTRACTION_PATTERNS: readonly ExtractionPattern[] = [
  // Pattern: "X is Y" or "X are Y"
  {
    name: 'is-assertion',
    pattern: /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:is|are)\s+([^.!?]+)/gi,
    extract: (match, text) => {
      const subject = match[1].trim();
      const object = match[2].trim();
      if (!subject || !object) return null;
      return {
        sourceSpan: createSpan(match.index!, match.index! + match[0].length, match[0]),
        subject,
        predicate: 'IS_A',
        object,
      };
    },
  },
  // Pattern: "X has Y" or "X have Y"
  {
    name: 'has-assertion',
    pattern: /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:has|have)\s+([^.!?]+)/gi,
    extract: (match, text) => {
      const subject = match[1].trim();
      const object = match[2].trim();
      if (!subject || !object) return null;
      return {
        sourceSpan: createSpan(match.index!, match.index! + match[0].length, match[0]),
        subject,
        predicate: 'HAS_ATTRIBUTE',
        object,
      };
    },
  },
  // Pattern: "X's Y is Z" (possessive attribute)
  {
    name: 'possessive-assertion',
    pattern: /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)'s\s+(\w+)\s+is\s+([^.!?]+)/gi,
    extract: (match, text) => {
      const subject = match[1].trim();
      const attribute = match[2].trim();
      const value = match[3].trim();
      if (!subject || !attribute || !value) return null;
      return {
        sourceSpan: createSpan(match.index!, match.index! + match[0].length, match[0]),
        subject,
        predicate: `HAS_${attribute.toUpperCase()}`,
        object: value,
      };
    },
  },
  // Pattern: "X named Y" or "X called Y"
  {
    name: 'named-assertion',
    pattern: /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:named|called)\s+([^.!?,]+)/gi,
    extract: (match, text) => {
      const subject = match[1].trim();
      const name = match[2].trim();
      if (!subject || !name) return null;
      return {
        sourceSpan: createSpan(match.index!, match.index! + match[0].length, match[0]),
        subject,
        predicate: 'HAS_NAME',
        object: name,
      };
    },
  },
  // Pattern: "The X of Y is Z"
  {
    name: 'the-of-assertion',
    pattern: /\bThe\s+(\w+)\s+of\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+is\s+([^.!?]+)/gi,
    extract: (match, text) => {
      const attribute = match[1].trim();
      const subject = match[2].trim();
      const value = match[3].trim();
      if (!attribute || !subject || !value) return null;
      return {
        sourceSpan: createSpan(match.index!, match.index! + match[0].length, match[0]),
        subject,
        predicate: `HAS_${attribute.toUpperCase()}`,
        object: value,
      };
    },
  },
  // Pattern: "X knows Y" or "X knows about Y"
  {
    name: 'knows-assertion',
    pattern: /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+knows\s+(?:about\s+)?([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/gi,
    extract: (match, text) => {
      const subject = match[1].trim();
      const object = match[2].trim();
      if (!subject || !object) return null;
      return {
        sourceSpan: createSpan(match.index!, match.index! + match[0].length, match[0]),
        subject,
        predicate: 'KNOWS',
        object,
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a SourceSpan object.
 */
function createSpan(start: number, end: number, text: string): SourceSpan {
  return { start, end, text };
}

/**
 * Computes deterministic fact ID.
 * F2-INV-01: ID = hash(sourceSpan, subject, predicate, object, scope)
 */
function computeFactId(fact: Omit<CanonicalFact, 'id'>): FactId {
  const normalized = normalizeForCanon({
    sourceSpan: fact.sourceSpan,
    subject: fact.subject,
    predicate: fact.predicate,
    object: fact.object,
    scope: fact.scope ?? null,
  });
  return hashCanonical(normalized) as FactId;
}

/**
 * Sorts facts by sourceSpan.start then end.
 * F2-INV-03: Deterministic ordering
 */
function sortFacts(facts: CanonicalFact[]): CanonicalFact[] {
  return [...facts].sort((a, b) => {
    if (a.sourceSpan.start !== b.sourceSpan.start) {
      return a.sourceSpan.start - b.sourceSpan.start;
    }
    return a.sourceSpan.end - b.sourceSpan.end;
  });
}

/**
 * Deduplicates facts by ID.
 * Keeps first occurrence when sorted by position.
 */
function deduplicateFacts(facts: CanonicalFact[]): CanonicalFact[] {
  const seen = new Set<FactId>();
  const result: CanonicalFact[] = [];
  for (const fact of facts) {
    if (!seen.has(fact.id)) {
      seen.add(fact.id);
      result.push(fact);
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts canonical facts from text.
 *
 * F2-INV-01: IDs are deterministic
 * F2-INV-02: All facts have sourceSpan
 * F2-INV-03: Output sorted by position
 * F2-INV-04: Pattern-based, no ML/NLP
 *
 * @param text - Input text to extract facts from
 * @param context - Optional context for scoping
 * @returns Array of extracted facts, sorted by position
 */
export function extractFacts(text: string, context?: string): CanonicalFact[] {
  const facts: CanonicalFact[] = [];

  for (const patternDef of EXTRACTION_PATTERNS) {
    // Reset regex lastIndex for global patterns
    patternDef.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = patternDef.pattern.exec(text)) !== null) {
      const extracted = patternDef.extract(match, text);
      if (extracted) {
        const factWithScope = context ? { ...extracted, scope: context } : extracted;
        const id = computeFactId(factWithScope);
        facts.push({ ...factWithScope, id });
      }
    }
  }

  // Sort by position then deduplicate
  const sorted = sortFacts(facts);
  return deduplicateFacts(sorted);
}

/**
 * Extracts facts with explicit entity markers.
 * Format: [ENTITY:name] or {PREDICATE:value}
 *
 * @param text - Marked-up text
 * @returns Extracted facts
 */
export function extractMarkedFacts(text: string): CanonicalFact[] {
  const facts: CanonicalFact[] = [];

  // Pattern: [SUBJECT:name] PREDICATE [OBJECT:value]
  const markedPattern = /\[SUBJECT:([^\]]+)\]\s*(\w+)\s*\[OBJECT:([^\]]+)\]/gi;

  let match: RegExpExecArray | null;
  while ((match = markedPattern.exec(text)) !== null) {
    const subject = match[1].trim();
    const predicate = match[2].trim();
    const object = match[3].trim();

    const span = createSpan(match.index, match.index + match[0].length, match[0]);
    const factData = { sourceSpan: span, subject, predicate, object };
    const id = computeFactId(factData);
    facts.push({ ...factData, id });
  }

  return sortFacts(deduplicateFacts(facts));
}

/**
 * Extracts a single fact from structured input.
 * Used for testing and direct fact creation.
 *
 * @param subject - Subject entity
 * @param predicate - Predicate type
 * @param object - Object value
 * @param sourceText - Source text for span
 * @param start - Start position (default 0)
 * @returns Single canonical fact
 */
export function createFact(
  subject: string,
  predicate: string,
  object: unknown,
  sourceText: string,
  start: number = 0
): CanonicalFact {
  const span = createSpan(start, start + sourceText.length, sourceText);
  const factData = { sourceSpan: span, subject, predicate, object };
  const id = computeFactId(factData);
  return { ...factData, id };
}

/**
 * Validates that a fact has all required fields.
 * F2-INV-02: sourceSpan required
 */
export function isValidFact(fact: unknown): fact is CanonicalFact {
  if (typeof fact !== 'object' || fact === null) return false;
  const f = fact as Record<string, unknown>;
  return (
    typeof f.id === 'string' &&
    typeof f.sourceSpan === 'object' &&
    f.sourceSpan !== null &&
    typeof (f.sourceSpan as SourceSpan).start === 'number' &&
    typeof (f.sourceSpan as SourceSpan).end === 'number' &&
    typeof (f.sourceSpan as SourceSpan).text === 'string' &&
    typeof f.subject === 'string' &&
    typeof f.predicate === 'string' &&
    f.object !== undefined
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { computeFactId, sortFacts, deduplicateFacts, EXTRACTION_PATTERNS };
