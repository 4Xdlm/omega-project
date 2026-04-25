/**
 * OMEGA Semantic Depth Features — Phase P0-BIS realignment
 * Date: 2026-03-22
 *
 * CLONED from feature_dump.py compute_semantic_features().
 * THIS is the source of truth (generates the Python parity dumps).
 *
 * Pure TypeScript — no dependencies.
 */

// ═══════════════════════════════════════════════════════════════════════
// UTILS — cloned from feature_dump.py
// ═══════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=[.!?\u2026\u00bb])\s+/);
  return raw.map(s => s.trim()).filter(s => s.length > 5);
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function stdev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
}

// ═══════════════════════════════════════════════════════════════════════
// STOP_FR — exact copy from feature_dump.py
// ═══════════════════════════════════════════════════════════════════════

const STOP_FR = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
  'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'en', 'y',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'entre',
  'vers', 'chez', 'contre', 'apres', 'avant', 'pendant', 'depuis',
  'que', 'qui', 'dont', 'quand', 'comme', 'si',
  'ne', 'pas', 'plus', 'jamais', 'rien',
  'est', 'sont', 'etait', 'etaient', 'etre', 'avoir', 'avait', 'avaient',
  'fait', 'faire', 'dit', 'dire', 'peut', 'pouvoir', 'doit', 'devoir',
  'tout', 'tous', 'toute', 'toutes', 'autre', 'autres',
  'meme', 'aussi', 'tres', 'bien', 'peu', 'trop', 'assez',
  'alors', 'encore', 'deja', 'la', 'ici', 'puis',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'from', 'by', 'is', 'was', 'were', 'are', 'been', 'be',
  'has', 'had', 'have', 'do', 'did', 'does', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'must',
  'it', 'its', 'he', 'she', 'they', 'them', 'their', 'his', 'her',
  'this', 'that', 'these', 'those', 'not', 'no', 'so', 'if', 'as',
]);

// ═══════════════════════════════════════════════════════════════════════
// getLowerWords — clone of feature_dump.py lw computation
// Strip non-alpha (a-z + latin-1 range), remove stop words
// ═══════════════════════════════════════════════════════════════════════

function getLowerWords(text: string): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const result: string[] = [];
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-z\u00e0-\u00ff]/g, '');
    if (lower && !STOP_FR.has(lower)) result.push(lower);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// REGEX CONSTANTS — exact copies from feature_dump.py
// ═══════════════════════════════════════════════════════════════════════

const TENSION_RE = /\b(?:soudain|brusquement|tout a coup|alors|aussitot|suddenly|abruptly|immediately)\b/gi;
const DESIR_RE = /\b(?:voulait|desirait|esperait|souhaitait|revait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b/gi;
const NEG_SEM = /\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guere|point|not|n't|never|nothing|neither|nor|without)\b/gi;
const PERC_RE = /\b(?:voyait|sentait|entendait|regardait|ecoutait|touchait|percevait|apercut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b/gi;
const PERC_CONFLICT_RE = /\b(?:mais|pourtant|cependant|yet|but|however)\b/gi;
const CAUS_RE = /\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|des que|a cause|grace a|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|caused|led to|resulted)\b/gi;
const TEMP_RE = /\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitot|tout a coup|apres|avant|pendant|des|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b/gi;

function findAll(re: RegExp, text: string): number {
  re.lastIndex = 0;
  const m = text.match(re);
  re.lastIndex = 0;
  return m ? m.length : 0;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN — cloned from feature_dump.py compute_semantic_features()
// ═══════════════════════════════════════════════════════════════════════

export function computeSemanticDepthFeatures(text: string): Record<string, number> {
  const sents = splitSentences(text);
  const tl = text.toLowerCase();
  const ns = Math.max(sents.length, 1);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const lw = getLowerWords(text);
  const nlw = Math.max(lw.length, 1);
  const f: Record<string, number> = {};
  const W = 50;

  // ─── 1. f_referent_continuity = overlap between consecutive W-word chunks ──
  if (lw.length >= W * 2) {
    const chunks: string[][] = [];
    for (let i = 0; i <= lw.length - W; i += Math.floor(W / 2)) {
      chunks.push(lw.slice(i, i + W));
    }
    if (chunks.length >= 2) {
      const overlaps: number[] = [];
      for (let i = 0; i < chunks.length - 1; i++) {
        const s1 = new Set(chunks[i]);
        const s2 = new Set(chunks[i + 1]);
        let overlap = 0;
        for (const w of s1) if (s2.has(w)) overlap++;
        overlaps.push(overlap / W);
      }
      f.f_referent_continuity = r4(mean(overlaps));
    } else { f.f_referent_continuity = 0; }
  } else { f.f_referent_continuity = 0; }

  // ─── 2. f_referent_orphan_rate = hapax / total content words ──
  const seen = new Set<string>();
  const hapax = new Set<string>();
  for (const w of lw) {
    if (seen.has(w)) hapax.delete(w);
    else { seen.add(w); hapax.add(w); }
  }
  f.f_referent_orphan_rate = r4(hapax.size / nlw);

  // ─── 3. f_entity_persistence = capitalized words appearing >=2 times ──
  const capWords = words.filter(w => w.length > 2 && /^[A-Z\u00c0-\u00dc]/.test(w) && !/^[A-Z\u00c0-\u00dc]+$/.test(w));
  if (capWords.length > 0) {
    const capSet = new Set(capWords.map(w => w.toLowerCase()));
    const capFreq: Record<string, number> = {};
    for (const w of capWords) { const lo = w.toLowerCase(); capFreq[lo] = (capFreq[lo] || 0) + 1; }
    f.f_entity_persistence = r4(
      Object.values(capFreq).filter(c => c >= 2).length / Math.max(capSet.size, 1)
    );
  } else { f.f_entity_persistence = 0; }

  // ─── 4. f_lexical_progression, f_semantic_stagnation, f_novelty_curve_slope ──
  if (lw.length >= W * 3) {
    const chunks2: Set<string>[] = [];
    for (let i = 0; i <= lw.length - W; i += W) {
      chunks2.push(new Set(lw.slice(i, i + W)));
    }
    const nr: number[] = [];
    for (let i = 1; i < chunks2.length; i++) {
      let newCount = 0;
      for (const w of chunks2[i]) if (!chunks2[i - 1].has(w)) newCount++;
      nr.push(newCount / W);
    }
    f.f_lexical_progression = r4(nr.length > 0 ? mean(nr) : 0);
    f.f_semantic_stagnation = r4(
      nr.length > 1
        ? nr.slice(1).filter(r => r < 0.10).length / Math.max(nr.length - 1, 1)
        : 0
    );
    if (nr.length >= 2) {
      const xs = nr.map((_, i) => i);
      const xm = mean(xs); const ym = mean(nr);
      let num = 0, den = 0;
      for (let i = 0; i < nr.length; i++) { num += (i - xm) * (nr[i] - ym); den += (i - xm) ** 2; }
      f.f_novelty_curve_slope = r4(den > 0 ? num / den : 0);
    } else { f.f_novelty_curve_slope = 0; }
  } else { f.f_lexical_progression = 0; f.f_semantic_stagnation = 0; f.f_novelty_curve_slope = 0; }

  // ─── 5. f_contextual_precision, f_rare_word_isolation ──
  if (lw.length >= W) {
    const windows: string[][] = [];
    for (let i = 0; i <= lw.length - W; i += W) {
      windows.push(lw.slice(i, i + W));
    }
    const rarities: number[] = [];
    for (const win of windows) {
      const wf: Record<string, number> = {};
      for (const w of win) wf[w] = (wf[w] || 0) + 1;
      const hapaxCount = Object.values(wf).filter(c => c === 1).length;
      rarities.push(hapaxCount / win.length);
    }
    f.f_contextual_precision = r4(mean(rarities));
    f.f_rare_word_isolation = r4(rarities.length > 1 ? stdev(rarities) : 0);
  } else { f.f_contextual_precision = 0; f.f_rare_word_isolation = 0; }

  // ─── 6. f_hapax_contextual_rate ──
  f.f_hapax_contextual_rate = r4(hapax.size / nlw);

  // ─── 7. f_vocabulary_depth = unique / total content words ──
  f.f_vocabulary_depth = r4(new Set(lw).size / nlw);

  // ─── 8. f_tension_density = tension markers in full text / n_sentences ──
  f.f_tension_density = r4(findAll(TENSION_RE, tl) / ns);

  // ─── 9. f_desire_negation_rate = sentences with desire AND negation ──
  let dn = 0;
  for (const s of sents) {
    DESIR_RE.lastIndex = 0; NEG_SEM.lastIndex = 0;
    if (DESIR_RE.test(s) && NEG_SEM.test(s)) dn++;
    DESIR_RE.lastIndex = 0; NEG_SEM.lastIndex = 0;
  }
  f.f_desire_negation_rate = r4(dn / ns);

  // ─── 10. f_perception_conflict_rate ──
  let pc = 0;
  for (const s of sents) {
    PERC_RE.lastIndex = 0; PERC_CONFLICT_RE.lastIndex = 0;
    if (PERC_RE.test(s) && PERC_CONFLICT_RE.test(s)) pc++;
    PERC_RE.lastIndex = 0; PERC_CONFLICT_RE.lastIndex = 0;
  }
  f.f_perception_conflict_rate = r4(pc / ns);

  // ─── 11. POV drift / rupture / stability ──
  // Unicode-aware word boundaries (JS \b doesn't treat accented chars as \w)
  const UB = '(?<![a-zA-Z\\u00c0-\\u024f])';
  const UE = '(?![a-zA-Z\\u00c0-\\u024f])';
  const pov1Re = new RegExp(UB + "(?:je|j'|me|m'|moi|nous|my|mine|i|we|us|our)" + UE, 'gi');
  const pov3Re = new RegExp(UB + "(?:il|elle|ils|elles|lui|leur|on|he|she|they|them|his|her|its|their)" + UE, 'gi');
  const povs: string[] = [];
  for (const s of sents) {
    pov1Re.lastIndex = 0; pov3Re.lastIndex = 0;
    const c1 = (s.toLowerCase().match(pov1Re) || []).length;
    const c3 = (s.toLowerCase().match(pov3Re) || []).length;
    pov1Re.lastIndex = 0; pov3Re.lastIndex = 0;
    povs.push(c1 > c3 ? '1st' : c3 > c1 ? '3rd' : 'neutral');
  }
  // drift = all transitions (including to/from neutral)
  let transitions = 0;
  for (let i = 1; i < povs.length; i++) {
    if (povs[i] !== povs[i - 1]) transitions++;
  }
  f.f_pov_drift_rate = r4(transitions / Math.max(sents.length - 1, 1));
  // rupture = 1st<->3rd transitions only (no neutral)
  let ruptures = 0;
  for (let i = 1; i < povs.length; i++) {
    if (povs[i] !== povs[i - 1] && povs[i] !== 'neutral' && povs[i - 1] !== 'neutral') ruptures++;
  }
  f.f_pov_rupture_rate = r4(ruptures / Math.max(sents.length - 1, 1));
  // stability = max class / total
  if (povs.length >= 4) {
    const mc: Record<string, number> = { '1st': 0, '3rd': 0, 'neutral': 0 };
    for (const p of povs) mc[p] = (mc[p] || 0) + 1;
    f.f_pov_stability = r4(Math.max(...Object.values(mc)) / povs.length);
  } else { f.f_pov_stability = 1.0; }

  // ─── 12. f_causal_density = CAUS_RE matches in full text / n_sentences ──
  f.f_causal_density = r4(findAll(CAUS_RE, tl) / ns);

  // ─── 13. f_causal_chain_length = max consecutive causal sentences ──
  let chains = 0, cur = 0;
  for (const s of sents) {
    CAUS_RE.lastIndex = 0;
    if (CAUS_RE.test(s)) { cur++; chains = Math.max(chains, cur); }
    else { cur = 0; }
    CAUS_RE.lastIndex = 0;
  }
  f.f_causal_chain_length = chains;

  // ─── 14. f_temporal_anchor_rate = TEMP_RE matches in full text / n_sentences ──
  f.f_temporal_anchor_rate = r4(findAll(TEMP_RE, tl) / ns);

  // ─── 15. f_echo_density, f_lexical_callback_rate, f_motif_concentration ──
  if (lw.length >= 100) {
    const first50 = new Set(lw.slice(0, 50));
    const last50 = new Set(lw.slice(-50));
    const first50NoStop = new Set([...first50].filter(w => !STOP_FR.has(w)));
    // echo = intersection of first50 and last50 (without stops) / first50 size
    let echoCount = 0;
    for (const w of first50) if (last50.has(w) && !STOP_FR.has(w)) echoCount++;
    f.f_echo_density = r4(echoCount / Math.max(first50NoStop.size, 1));

    // callback = words in first50 AND last50 but NOT in middle
    const midStart = Math.floor(lw.length / 4);
    const midEnd = Math.floor(3 * lw.length / 4);
    const midSet = new Set(lw.slice(midStart, midEnd));
    let cbCount = 0;
    for (const w of first50) {
      if (last50.has(w) && !midSet.has(w) && !STOP_FR.has(w)) cbCount++;
    }
    f.f_lexical_callback_rate = r4(cbCount / Math.max(first50NoStop.size, 1));

    // motif_concentration = mean gap between chunk appearances / 20, capped at 1
    const chunkSz = Math.max(Math.floor(lw.length / 5), 10);
    const chunks3: Set<string>[] = [];
    for (let i = 0; i < lw.length; i += chunkSz) {
      chunks3.push(new Set(lw.slice(i, i + chunkSz)));
    }
    const gv: number[] = [];
    for (const w of first50NoStop) {
      const gaps: number[] = [];
      let lastSeen = 0;
      for (let ci = 0; ci < chunks3.length; ci++) {
        if (chunks3[ci].has(w)) {
          if (lastSeen > 0) gaps.push(ci - lastSeen);
          lastSeen = ci;
        }
      }
      if (gaps.length > 0) gv.push(mean(gaps));
    }
    f.f_motif_concentration = r4(gv.length > 0 ? Math.min(1, mean(gv) / 20) : 0);
  } else {
    f.f_echo_density = 0;
    f.f_lexical_callback_rate = 0;
    f.f_motif_concentration = 0;
  }

  return f;
}

export const SEMANTIC_FEATURE_NAMES = [
  'f_referent_continuity', 'f_referent_orphan_rate', 'f_entity_persistence',
  'f_lexical_progression', 'f_semantic_stagnation', 'f_novelty_curve_slope',
  'f_contextual_precision', 'f_rare_word_isolation',
  'f_hapax_contextual_rate', 'f_vocabulary_depth',
  'f_tension_density', 'f_desire_negation_rate', 'f_perception_conflict_rate',
  'f_pov_drift_rate', 'f_pov_rupture_rate', 'f_pov_stability',
  'f_causal_density', 'f_causal_chain_length', 'f_temporal_anchor_rate',
  'f_echo_density', 'f_lexical_callback_rate', 'f_motif_concentration',
];

export { splitSentences };
