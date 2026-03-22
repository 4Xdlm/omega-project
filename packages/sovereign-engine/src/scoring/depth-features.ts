/**
 * OMEGA Depth Features — Phase P0-BIS realignment
 * Date: 2026-03-22
 *
 * CLONED from feature_dump.py compute_depth_features().
 * THIS is the source of truth (generates the Python parity dumps).
 *
 * Key differences from r7_multiscale_scorer_v2.py:
 * - f_subordination_depth = ratio of SUB words per sentence (not count)
 * - f_clause_per_sentence = sub_count + 1 (not verb patterns)
 * - f_pov_shift_rate = consecutive POV transitions (not intra-sentence)
 *
 * Pure TypeScript — no dependencies.
 */

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=[.!?\u2026\u00bb])\s+/);
  return raw.map(s => s.trim()).filter(s => s.length > 5);
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ═══════════════════════════════════════════════════════════════════════
// ALL_SUB — exact copy from feature_dump.py (word-level membership)
// ═══════════════════════════════════════════════════════════════════════

const ALL_SUB = new Set([
  'que', 'qui', 'dont', 'ou', 'lequel', 'laquelle', 'lesquels', 'lesquelles',
  'quand', 'comme', 'si', 'puisque', 'parce', 'bien', 'quoique', 'malgre',
  'tandis', 'alors', 'lorsque', 'des', 'avant', 'apres', 'pendant', 'jusqu',
  'that', 'which', 'who', 'whom', 'whose', 'where', 'when', 'although',
  'because', 'since', 'while', 'until', 'unless', 'whether', 'after',
  'before', 'though', 'even', 'whereas', 'provided',
]);

// ═══════════════════════════════════════════════════════════════════════
// DEPTH FEATURES — cloned from feature_dump.py
// ═══════════════════════════════════════════════════════════════════════

function cleanWord(w: string): string {
  return w.replace(/[.,;:!?]/g, '');
}

/**
 * Computes the 3 GB-critical depth features.
 * CLONED from feature_dump.py compute_depth_features().
 */
export function computeDepthFeatures(text: string): Record<string, number> {
  const sents = splitSentences(text);
  if (sents.length === 0) {
    return { f_pov_shift_rate: 0, f_subordination_depth: 0, f_clause_per_sentence: 0 };
  }

  // ── POV classification per sentence (1st vs 3rd, majority wins) ──
  // Unicode-aware word boundaries: \b in JS doesn't treat accented chars as \w
  // so we use lookbehind/lookahead with Unicode letter ranges to match Python behavior
  const UB = '(?<![a-zA-Z\\u00c0-\\u024f])';
  const UE = '(?![a-zA-Z\\u00c0-\\u024f])';
  const fp = new RegExp(UB + "(?:je|j'|me|m'|moi|nous|my|mine|i|we|us|our)" + UE, 'gi');
  const tp = new RegExp(UB + "(?:il|elle|ils|elles|lui|leur|on|he|she|they|them|his|her|its|their)" + UE, 'gi');

  const povs: string[] = [];
  for (const s of sents) {
    fp.lastIndex = 0; tp.lastIndex = 0;
    const c1 = (s.toLowerCase().match(fp) || []).length;
    const c3 = (s.toLowerCase().match(tp) || []).length;
    fp.lastIndex = 0; tp.lastIndex = 0;
    povs.push(c1 > c3 ? '1st' : c3 > c1 ? '3rd' : 'neutral');
  }

  // f_pov_shift_rate = consecutive transitions (excluding neutral pairs)
  let shifts = 0;
  for (let i = 1; i < povs.length; i++) {
    if (povs[i] !== povs[i - 1] && povs[i] !== 'neutral' && povs[i - 1] !== 'neutral') {
      shifts++;
    }
  }
  const f_pov_shift_rate = r4(shifts / Math.max(sents.length - 1, 1));

  // ── Subordination depth = ratio of SUB words / total words per sentence ──
  const subRatios: number[] = [];
  for (const s of sents) {
    const ws = s.toLowerCase().split(/\s+/);
    const subCount = ws.filter(w => ALL_SUB.has(cleanWord(w))).length;
    subRatios.push(subCount / Math.max(ws.length, 1));
  }
  const f_subordination_depth = r4(mean(subRatios));

  // ── Clause per sentence = sub_count + 1, then mean ──
  const clauseCounts: number[] = [];
  for (const s of sents) {
    const ws = s.toLowerCase().split(/\s+/);
    const subCount = ws.filter(w => ALL_SUB.has(cleanWord(w))).length;
    clauseCounts.push(Math.max(1, subCount + 1));
  }
  const f_clause_per_sentence = r4(mean(clauseCounts));

  return { f_pov_shift_rate, f_subordination_depth, f_clause_per_sentence };
}

export { splitSentences };
