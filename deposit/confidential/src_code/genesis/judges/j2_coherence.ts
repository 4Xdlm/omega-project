// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — J2 COHERENCE
// ═══════════════════════════════════════════════════════════════════════════════
// Detecte contradictions, ruptures timeline, erreurs coreference
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  GenesisConfig,
  JudgeScore,
} from '../core/types';

/**
 * Patterns de contradiction courants
 */
const CONTRADICTION_PATTERNS = [
  // Negations directes
  /\b(is|was|were|are)\s+not\s+.{1,30}\b(is|was|were|are)\s+(?!not)/gi,
  /\b(never|always)\b.{1,50}\b(always|never)\b/gi,
  // Temps contradictoires
  /\b(yesterday|today|tomorrow)\b.{1,100}\b(yesterday|today|tomorrow)\b/gi,
];

/**
 * Patterns de rupture temporelle
 */
const TIMELINE_BREAK_PATTERNS = [
  // Marqueurs temporels incoherents
  /\bbefore\b.{1,50}\bafter\b.{1,50}\bbefore\b/gi,
  /\b(earlier|later)\b.{1,50}\b(earlier|later)\b.{1,50}\b(earlier|later)\b/gi,
];

/**
 * Evalue la coherence d'un draft
 */
export function evaluateCoherence(
  draft: Draft,
  config: GenesisConfig
): JudgeScore {
  const text = draft.text;
  const metrics: Record<string, number> = {};
  const thresholds = config.judges.coherence;

  // 1. Detection des contradictions
  let contradictions = 0;
  for (const pattern of CONTRADICTION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      contradictions += matches.length;
    }
  }
  metrics['contradictions'] = contradictions;

  // 2. Detection des ruptures timeline
  let timelineBreaks = 0;
  for (const pattern of TIMELINE_BREAK_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      timelineBreaks += matches.length;
    }
  }
  metrics['timeline_breaks'] = timelineBreaks;

  // 3. Detection des erreurs de coreference
  const corefErrors = detectCorefErrors(text);
  metrics['coref_errors'] = corefErrors;

  // 4. Evaluer le verdict
  const pass =
    contradictions <= thresholds.MAX_CONTRADICTIONS &&
    timelineBreaks <= thresholds.MAX_TIMELINE_BREAKS &&
    corefErrors <= thresholds.MAX_COREF_ERRORS;

  return {
    verdict: pass ? 'PASS' : 'FAIL',
    metrics,
    threshold: {
      MAX_CONTRADICTIONS: thresholds.MAX_CONTRADICTIONS,
      MAX_TIMELINE_BREAKS: thresholds.MAX_TIMELINE_BREAKS,
      MAX_COREF_ERRORS: thresholds.MAX_COREF_ERRORS,
    },
    details: pass
      ? undefined
      : `Failed: contradictions=${contradictions}, timeline_breaks=${timelineBreaks}, coref_errors=${corefErrors}`,
  };
}

/**
 * Detecte les erreurs de coreference basiques
 * STUB: Heuristique simple basee sur pronoms
 */
function detectCorefErrors(text: string): number {
  let errors = 0;

  // Verifier les pronoms sans antecedent clair au debut du texte
  const sentences = text.split(/[.!?]+/);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim().toLowerCase();

    // Pronoms qui ne devraient pas apparaitre en premiere phrase sans contexte
    const danglingPronouns = ['he', 'she', 'it', 'they', 'him', 'her', 'them'];
    for (const pronoun of danglingPronouns) {
      // Verifier si le pronom est au debut (pas de nom propre avant)
      const regex = new RegExp(`^${pronoun}\\b`, 'i');
      if (regex.test(firstSentence)) {
        errors++;
      }
    }
  }

  // Verifier les changements de genre incoherents
  // Ex: "John... she" ou "Mary... he"
  const maleNames = ['john', 'james', 'michael', 'david', 'robert'];
  const femaleNames = ['mary', 'sarah', 'jennifer', 'lisa', 'emily'];
  const textLower = text.toLowerCase();

  for (const name of maleNames) {
    if (textLower.includes(name)) {
      // Verifier si "she" apparait apres sans autre nom feminin entre
      const nameIdx = textLower.indexOf(name);
      const afterName = textLower.slice(nameIdx);
      if (/\bshe\b/.test(afterName) && !femaleNames.some(f => afterName.indexOf(f) < afterName.indexOf('she'))) {
        errors++;
      }
    }
  }

  for (const name of femaleNames) {
    if (textLower.includes(name)) {
      const nameIdx = textLower.indexOf(name);
      const afterName = textLower.slice(nameIdx);
      if (/\bhe\b/.test(afterName) && !maleNames.some(m => afterName.indexOf(m) < afterName.indexOf('he'))) {
        errors++;
      }
    }
  }

  return errors;
}

export default evaluateCoherence;
