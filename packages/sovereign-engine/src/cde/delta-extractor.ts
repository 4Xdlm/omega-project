/**
 * delta-extractor.ts — Context Distillation Engine : extractDelta()
 * Sprint V-INIT
 *
 * Extrait le StateDelta depuis la prose produite.
 * Approche : analyse lexicale + heuristiques (zero LLM call).
 *
 * Invariants:
 *   INV-CDE-03 : 0 fait contradictoire avec CanonFacts (conflit -> drift_flag)
 *   INV-CDE-04 : toute dette ouverte dans le delta -> tracee dans debts_opened
 *   INV-CDE-05 : toute dette resolue -> tracee dans debts_resolved avec evidence
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { sha256 } from '@omega/canon-kernel';
import type { CanonFact, DebtEntry, ArcState, StateDelta } from './types.js';
import { CDEError } from './types.js';

// ── Context type for extractDelta ────────────────────────────────────────────

export interface DeltaContext {
  readonly canon_facts: CanonFact[];
  readonly open_debts:  DebtEntry[];
  readonly arc_states:  ArcState[];
}

// ── Arc phase transition keywords ────────────────────────────────────────────

const ARC_TRANSITION_KEYWORDS: Record<string, string[]> = {
  setup:         ['decouvr', 'appren', 'realis', 'compri', 'discover', 'learn', 'realiz'],
  confrontation: ['affront', 'combat', 'resist', 'oppos', 'lutt', 'fight', 'struggl', 'confront'],
  resolution:    ['accept', 'pardonne', 'reconcili', 'abandon', 'resolv', 'forgiv', 'surrender'],
};

// ── Debt signal keywords ─────────────────────────────────────────────────────

const DEBT_OPEN_SIGNALS  = ['promesse', 'secret', 'serment', 'jurait', 'promise', 'swore', 'vow', 'oath'];
const DEBT_CLOSE_SIGNALS = ['revele', 'avoue', 'confess', 'devoile', 'tenu sa', 'reveal', 'confess', 'unveil', 'kept'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Split prose into sentences (basic heuristic). */
function splitSentences(prose: string): string[] {
  return prose
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/** Check if a sentence contains a keyword (case-insensitive, stem match). */
function containsKeyword(sentence: string, keywords: string[]): boolean {
  const lower = sentence.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Extract assertive sentences as potential new facts.
 * Heuristic: sentences that are declarative (not questions, not exclamations)
 * and contain state-establishing patterns.
 */
function extractNewFacts(sentences: string[]): string[] {
  const factPatterns = [
    /\betait\b/i, /\best\b/i, /\bfut\b/i, /\bdevint\b/i, /\bdevenu\b/i,
    /\bwas\b/i, /\bis\b/i, /\bbecame\b/i, /\bhad become\b/i,
    /\bdesormais\b/i, /\bhenceforth\b/i, /\bnow\b/i,
  ];
  const facts: string[] = [];
  for (const s of sentences) {
    if (s.endsWith('?')) continue; // skip questions
    if (factPatterns.some(p => p.test(s))) {
      facts.push(s);
    }
  }
  return facts;
}

// ── Main function ────────────────────────────────────────────────────────────

/**
 * extractDelta() — Extrait le StateDelta depuis la prose produite.
 *
 * @throws CDEError EMPTY_PROSE if prose is empty or whitespace only
 */
export function extractDelta(
  prose: string,
  context: DeltaContext,
): StateDelta {
  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!prose || prose.trim().length === 0) {
    throw new CDEError('EMPTY_PROSE', 'prose is empty or whitespace only');
  }

  const proseHash  = sha256(prose);
  const sentences  = splitSentences(prose);
  const proseLower = prose.toLowerCase();

  // ── 1. New facts (assertive sentences) ─────────────────────────────────────
  const newFacts = extractNewFacts(sentences);

  // ── 2. Canon conflict detection — INV-CDE-03 ──────────────────────────────
  const driftFlags: string[] = [];
  for (const canon of context.canon_facts) {
    // Check for negation of a canon fact in the prose
    const factWords = canon.fact.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const factMentioned = factWords.some(w => proseLower.includes(w));
    if (factMentioned) {
      // Check for negation patterns near the fact mention
      const negations = ['ne pas', 'n\'etait plus', 'n\'est plus', 'jamais', 'plus de',
                         'not', 'no longer', 'never', 'wasn\'t', 'isn\'t'];
      for (const neg of negations) {
        if (proseLower.includes(neg)) {
          // Check proximity: negation near fact keywords
          for (const w of factWords) {
            const factIdx = proseLower.indexOf(w);
            const negIdx  = proseLower.indexOf(neg);
            if (factIdx >= 0 && negIdx >= 0 && Math.abs(factIdx - negIdx) < 80) {
              driftFlags.push(`CANON_CONFLICT[${canon.id}]: negation of "${canon.fact}" detected`);
              break;
            }
          }
        }
      }
    }
  }

  // ── 3. Debt detection — INV-CDE-04 / INV-CDE-05 ──────────────────────────
  const debtsOpened:   Array<{ content: string; evidence: string }> = [];
  const debtsResolved: Array<{ id: string; evidence: string }>      = [];

  // Check for new debts opened (INV-CDE-04)
  for (const sentence of sentences) {
    if (containsKeyword(sentence, DEBT_OPEN_SIGNALS)) {
      debtsOpened.push({
        content:  sentence,
        evidence: sentence,
      });
    }
  }

  // Check for existing debts resolved (INV-CDE-05)
  for (const debt of context.open_debts) {
    if (debt.resolved) continue;
    const debtWords = debt.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const mentioned = debtWords.some(w => proseLower.includes(w));
    if (mentioned && containsKeyword(prose, DEBT_CLOSE_SIGNALS)) {
      // Find the sentence that resolves the debt
      const evidence = sentences.find(s => {
        const sLower = s.toLowerCase();
        return debtWords.some(w => sLower.includes(w)) && containsKeyword(s, DEBT_CLOSE_SIGNALS);
      });
      if (evidence) {
        debtsResolved.push({ id: debt.id, evidence });
      }
    }
  }

  // ── 4. Arc movements ──────────────────────────────────────────────────────
  const arcMovements: Array<{ character_id: string; movement: string }> = [];

  for (const arc of context.arc_states) {
    // Look for character mention + transition keywords
    const charMentioned = proseLower.includes(arc.character_id.toLowerCase());
    if (!charMentioned) continue;

    for (const [phase, keywords] of Object.entries(ARC_TRANSITION_KEYWORDS)) {
      if (phase === arc.arc_phase) continue; // skip current phase
      if (containsKeyword(prose, keywords)) {
        arcMovements.push({
          character_id: arc.character_id,
          movement:     `${arc.arc_phase} -> ${phase}`,
        });
        break; // one movement per character
      }
    }
  }

  // ── 5. Build StateDelta ────────────────────────────────────────────────────
  return {
    new_facts:      newFacts,
    modified_facts: [],  // V-INIT: no fact modification detection (future V-FINAL)
    debts_opened:   debtsOpened,
    debts_resolved: debtsResolved,
    arc_movements:  arcMovements,
    drift_flags:    driftFlags,
    prose_hash:     proseHash,
  };
}
