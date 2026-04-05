/**
 * delta-extractor.ts — Context Distillation Engine : extractDelta()
 * Sprint V-INIT → R2 enrichment
 *
 * Extrait le StateDelta depuis la prose produite.
 * Approche : analyse lexicale + heuristiques (zero LLM call).
 *
 * R2 additions:
 *   - normalizeFR(): accent stripping + apostrophe normalization
 *   - Expanded debt signals (conjugated French forms)
 *   - Expanded arc transition keywords
 *   - Character presence detection from arc_states
 *   - Simple motif detection (recurring nouns, 3+ occurrences)
 *   - scene_summary: top fact-dense sentences extracted
 *   - modified_facts: canon fact contradiction with new value
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

// ── R2: French text normalization ───────────────────────────────────────────

const ACCENT_MAP: Record<string, string> = {
  '\u00e0': 'a', '\u00e1': 'a', '\u00e2': 'a', '\u00e3': 'a', '\u00e4': 'a',
  '\u00e8': 'e', '\u00e9': 'e', '\u00ea': 'e', '\u00eb': 'e',
  '\u00ec': 'i', '\u00ed': 'i', '\u00ee': 'i', '\u00ef': 'i',
  '\u00f2': 'o', '\u00f3': 'o', '\u00f4': 'o', '\u00f5': 'o', '\u00f6': 'o',
  '\u00f9': 'u', '\u00fa': 'u', '\u00fb': 'u', '\u00fc': 'u',
  '\u00ff': 'y', '\u00e7': 'c', '\u0153': 'oe',
};

/**
 * Normalize French text: strip accents, normalize apostrophes, lowercase.
 * Deterministic, pure function.
 */
export function normalizeFR(text: string): string {
  let result = text.toLowerCase();
  // Normalize apostrophes (typographic → straight)
  result = result.replace(/[\u2018\u2019\u0060\u00B4]/g, "'");
  // Strip accents
  for (const [accented, plain] of Object.entries(ACCENT_MAP)) {
    // Use split+join for global replace without regex special chars
    while (result.includes(accented)) {
      result = result.replace(accented, plain);
    }
  }
  return result;
}

// ── French stop words (filtered from motif detection) ───────────────────────

const FR_STOP_WORDS = new Set([
  'les', 'des', 'une', 'dans', 'pour', 'avec', 'sur', 'par', 'qui', 'que',
  'est', 'son', 'ses', 'aux', 'pas', 'mais', 'plus', 'tout', 'tous', 'elle',
  'lui', 'ils', 'nous', 'vous', 'eux', 'cette', 'ces', 'cet', 'leur', 'leurs',
  'dont', 'sans', 'sous', 'vers', 'chez', 'entre', 'comme', 'avant', 'apres',
  'depuis', 'encore', 'aussi', 'bien', 'tres', 'trop', 'peu', 'assez', 'autre',
  'autres', 'meme', 'puis', 'quand', 'comment', 'alors', 'donc', 'car', 'avoir',
  'etre', 'faire', 'dire', 'aller', 'voir', 'venir', 'pouvoir', 'vouloir',
  'falloir', 'devoir', 'savoir', 'the', 'and', 'was', 'had', 'not', 'but',
  'his', 'her', 'its', 'she', 'they', 'that', 'this', 'from', 'with', 'been',
]);

// ── Arc phase transition keywords (R2: expanded) ───────────────────────────

const ARC_TRANSITION_KEYWORDS: Record<string, string[]> = {
  setup: [
    'decouvr', 'appren', 'realis', 'compri', 'discover', 'learn', 'realiz',
    // R2: expanded FR conjugations
    'apprend', 'apprit', 'comprend', 'comprit', 'decouvrit', 'apercu',
    'remarqu', 'constat', 'observ', 'entrev', 'soupconn',
  ],
  confrontation: [
    'affront', 'combat', 'resist', 'oppos', 'lutt', 'fight', 'struggl', 'confront',
    // R2: expanded FR
    'affronter', 'combattit', 'combattr', 'luttait', 'batail', 'defi',
    'brave', 'bravait', 'tenait tete', 'refus', 'repouss',
  ],
  resolution: [
    'accept', 'pardonne', 'reconcili', 'abandon', 'resolv', 'forgiv', 'surrender',
    // R2: expanded FR
    'accepta', 'pardonna', 'reconcili', 'abandonna', 'renon', 'renonca',
    'ceda', 'capitula', 'resigna', 'consentit', 'lach', 'laissa',
    'apaisa', 'calma', 'trouva la paix',
  ],
};

// ── Debt signal keywords (R2: expanded with conjugated forms) ──────────────

const DEBT_OPEN_SIGNALS = [
  // V-INIT originals
  'promesse', 'secret', 'serment', 'jurait', 'promise', 'swore', 'vow', 'oath',
  // R2: conjugated French forms
  'promit', 'promis', 'promet', 'promettr', 'jura', 'jure', 'jurant',
  'secretement', 'dissimul', 'celait', 'cachait', 'cach',
  'pacte', 'engage', 'engagea', 'pact',
  'mysterieusement', 'mystere', 'enigme',
  'complot', 'conspir', 'manigan',
];

const DEBT_CLOSE_SIGNALS = [
  // V-INIT originals
  'revele', 'avoue', 'confess', 'devoile', 'tenu sa', 'reveal', 'confess', 'unveil', 'kept',
  // R2: conjugated French forms
  'revela', 'revelait', 'revelant',
  'avoua', 'avouait', 'avouant',
  'confessa', 'confessait',
  'devoila', 'devoilait', 'devoilant',
  'trahit', 'trahiss', 'trahison',
  'rompit le silence', 'brisa le secret',
  'demasqu', 'denon', 'divulgu',
  'mit a nu', 'eclata la verite', 'verite eclata',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Split prose into sentences (basic heuristic). */
function splitSentences(prose: string): string[] {
  return prose
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Check if text contains a keyword (uses normalized FR matching).
 * R2: now normalizes both sides to handle accents.
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeFR(text);
  return keywords.some(kw => normalized.includes(kw));
}

/**
 * Extract assertive sentences as potential new facts.
 * Heuristic: sentences that are declarative (not questions, not exclamations)
 * and contain state-establishing patterns.
 * R2: patterns also match accented forms via normalizeFR.
 */
function extractNewFacts(sentences: string[]): string[] {
  // Patterns are checked against normalized text (no accents)
  const factPatterns = [
    /\betait\b/, /\best\b/, /\bfut\b/, /\bdevint\b/, /\bdevenu\b/,
    /\bwas\b/, /\bis\b/, /\bbecame\b/, /\bhad become\b/,
    /\bdesormais\b/, /\bhenceforth\b/, /\bnow\b/,
    // R2: additional FR state-establishing patterns
    /\bdemeurait\b/, /\brestait\b/, /\bsavait\b/, /\bportait\b/,
    /\bpossedait\b/, /\bappartenait\b/, /\bhabitait\b/,
    /\bn'etait plus\b/, /\bne serait plus\b/, /\bcessait\b/,
  ];
  const facts: string[] = [];
  for (const s of sentences) {
    if (s.endsWith('?')) continue; // skip questions
    const normalized = normalizeFR(s);
    if (factPatterns.some(p => p.test(normalized))) {
      facts.push(s); // return original sentence (with accents)
    }
  }
  return facts;
}

/**
 * R2: Detect characters present in the prose from arc_states.
 * Pure CALC: checks if character_id appears in normalized prose.
 */
function detectCharactersPresent(
  proseNorm: string,
  arcStates: readonly ArcState[],
): string[] {
  const present: string[] = [];
  for (const arc of arcStates) {
    const charNorm = normalizeFR(arc.character_id);
    if (proseNorm.includes(charNorm)) {
      present.push(arc.character_id);
    }
  }
  return present;
}

/**
 * R2: Simple motif detection — recurring content words (3+ occurrences).
 * Filters stop words, short words (<4 chars), returns sorted by frequency desc.
 * Deterministic: sort by frequency desc, then alphabetically.
 */
function detectMotifs(proseNorm: string): string[] {
  const words = proseNorm.split(/\s+/).filter(w => w.length >= 4);
  const freq = new Map<string, number>();
  for (const w of words) {
    // Strip trailing punctuation
    const clean = w.replace(/[.,;:!?'"()]/g, '');
    if (clean.length < 4) continue;
    if (FR_STOP_WORDS.has(clean)) continue;
    freq.set(clean, (freq.get(clean) ?? 0) + 1);
  }
  // Filter: 3+ occurrences
  const motifs: Array<[string, number]> = [];
  for (const [word, count] of freq) {
    if (count >= 3) {
      motifs.push([word, count]);
    }
  }
  // Deterministic sort: frequency desc, then alpha asc
  motifs.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return motifs.map(([w]) => w);
}

/**
 * R2: Extract scene_summary — top 2 most fact-dense sentences.
 * "Fact-dense" = contains the most state-establishing patterns.
 * Deterministic: scored by pattern count, ties broken by position (earlier wins).
 */
function extractSceneSummary(sentences: string[]): string {
  if (sentences.length === 0) return '';
  if (sentences.length <= 2) return sentences.join(' ');

  const summaryPatterns = [
    /\betait\b/, /\best\b/, /\bfut\b/, /\bdevint\b/, /\bdevenu\b/,
    /\bdesormais\b/, /\bdemeurait\b/, /\brestait\b/, /\bsavait\b/,
    /\bn'etait plus\b/, /\bne serait plus\b/,
    // Action-establishing patterns
    /\bdecida\b/, /\bchoisit\b/, /\bcomprit\b/, /\bdecouvrit\b/,
    /\bpromit\b/, /\bavoua\b/, /\brevela\b/, /\bconfessa\b/,
    /\baffronta\b/, /\baccepta\b/, /\bpardonna\b/, /\babandonna\b/,
  ];

  const scored = sentences.map((s, idx) => {
    const norm = normalizeFR(s);
    let score = 0;
    for (const p of summaryPatterns) {
      if (p.test(norm)) score++;
    }
    // Bonus for longer sentences (more substance)
    if (s.length > 80) score += 1;
    return { sentence: s, score, idx };
  });

  // Deterministic sort: score desc, then position asc
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  // Take top 2 with score > 0, re-order by position
  const top = scored
    .filter(e => e.score > 0)
    .slice(0, 2)
    .sort((a, b) => a.idx - b.idx);

  if (top.length === 0) {
    // Fallback: first sentence
    return sentences[0];
  }
  return top.map(e => e.sentence).join(' ');
}

// ── Main function ───────────────────────────────────────────────────────────

/**
 * extractDelta() — Extrait le StateDelta depuis la prose produite.
 * R2: enriched with normalizeFR, character detection, motifs, scene_summary.
 *
 * @throws CDEError EMPTY_PROSE if prose is empty or whitespace only
 */
export function extractDelta(
  prose: string,
  context: DeltaContext,
): StateDelta {
  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!prose || prose.trim().length === 0) {
    throw new CDEError('EMPTY_PROSE', 'prose is empty or whitespace only');
  }

  const proseHash  = sha256(prose);
  const sentences  = splitSentences(prose);
  const proseNorm  = normalizeFR(prose);

  // ── 1. New facts (assertive sentences) ────────────────────────────────────
  const newFacts = extractNewFacts(sentences);

  // ── 2. Canon conflict detection — INV-CDE-03 ─────────────────────────────
  const driftFlags: string[] = [];
  const modifiedFacts: Array<{ id: string; new_value: string }> = [];

  for (const canon of context.canon_facts) {
    const factNorm = normalizeFR(canon.fact);
    const factWords = factNorm.split(/\s+/).filter(w => w.length > 3);
    const factMentioned = factWords.some(w => proseNorm.includes(w));
    if (!factMentioned) continue;

    // Check for negation patterns near the fact mention
    const negations = ['ne pas', "n'etait plus", "n'est plus", 'jamais', 'plus de',
                       'not', 'no longer', 'never', "wasn't", "isn't"];
    for (const neg of negations) {
      if (!proseNorm.includes(neg)) continue;
      for (const w of factWords) {
        const factIdx = proseNorm.indexOf(w);
        const negIdx  = proseNorm.indexOf(neg);
        if (factIdx >= 0 && negIdx >= 0 && Math.abs(factIdx - negIdx) < 80) {
          driftFlags.push(`CANON_CONFLICT[${canon.id}]: negation of "${canon.fact}" detected`);
          // R2: extract the contradicting sentence as modified_fact
          const contradicting = sentences.find(s => {
            const sNorm = normalizeFR(s);
            return factWords.some(fw => sNorm.includes(fw))
              && negations.some(n => sNorm.includes(n));
          });
          if (contradicting) {
            modifiedFacts.push({ id: canon.id, new_value: contradicting });
          }
          break;
        }
      }
    }
  }

  // ── 3. Debt detection — INV-CDE-04 / INV-CDE-05 ─────────────────────────
  const debtsOpened:   Array<{ content: string; evidence: string }> = [];
  const debtsResolved: Array<{ id: string; evidence: string }>      = [];

  // Check for new debts opened (INV-CDE-04) — R2: uses normalizeFR
  for (const sentence of sentences) {
    if (containsKeyword(sentence, DEBT_OPEN_SIGNALS)) {
      debtsOpened.push({
        content:  sentence,
        evidence: sentence,
      });
    }
  }

  // Check for existing debts resolved (INV-CDE-05) — R2: uses normalizeFR
  for (const debt of context.open_debts) {
    if (debt.resolved) continue;
    const debtNorm  = normalizeFR(debt.content);
    const debtWords = debtNorm.split(/\s+/).filter(w => w.length > 3);
    const mentioned = debtWords.some(w => proseNorm.includes(w));
    if (mentioned && containsKeyword(prose, DEBT_CLOSE_SIGNALS)) {
      const evidence = sentences.find(s => {
        const sNorm = normalizeFR(s);
        return debtWords.some(w => sNorm.includes(w)) && containsKeyword(s, DEBT_CLOSE_SIGNALS);
      });
      if (evidence) {
        debtsResolved.push({ id: debt.id, evidence });
      }
    }
  }

  // ── 4. Arc movements — R2: uses normalizeFR ──────────────────────────────
  const arcMovements: Array<{ character_id: string; movement: string }> = [];

  for (const arc of context.arc_states) {
    const charNorm = normalizeFR(arc.character_id);
    if (!proseNorm.includes(charNorm)) continue;

    for (const [phase, keywords] of Object.entries(ARC_TRANSITION_KEYWORDS)) {
      if (phase === arc.arc_phase) continue;
      if (containsKeyword(prose, keywords)) {
        arcMovements.push({
          character_id: arc.character_id,
          movement:     `${arc.arc_phase} -> ${phase}`,
        });
        break;
      }
    }
  }

  // ── 5. R2: Characters present ─────────────────────────────────────────────
  const charactersPresent = detectCharactersPresent(proseNorm, context.arc_states);

  // ── 6. R2: Motif detection ────────────────────────────────────────────────
  const motifs = detectMotifs(proseNorm);

  // ── 7. R2: Scene summary (top fact-dense sentences) ───────────────────────
  const sceneSummary = extractSceneSummary(sentences);

  // ── 8. Build StateDelta ───────────────────────────────────────────────────
  return {
    new_facts:           newFacts,
    modified_facts:      modifiedFacts,
    debts_opened:        debtsOpened,
    debts_resolved:      debtsResolved,
    arc_movements:       arcMovements,
    drift_flags:         driftFlags,
    prose_hash:          proseHash,
    // R2 extensions
    scene_summary:       sceneSummary,
    characters_present:  charactersPresent,
    motifs,
  };
}
