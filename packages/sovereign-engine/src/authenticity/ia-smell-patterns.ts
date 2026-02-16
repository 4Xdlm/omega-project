/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — IA SMELL PATTERNS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: authenticity/ia-smell-patterns.ts
 * Version: 1.0.0 (Sprint 11)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-AUTH-01
 *
 * 15 patterns CALC déterministes détectant les "IA smells" (indices d'écriture IA).
 * Chaque pattern retourne found (bool), count (nombre), evidence (exemples).
 *
 * Scoring: 100 = très authentique / 0 = IA évidente
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface IASmellPattern {
  readonly id: string;
  readonly name: string;
  readonly detect: (prose: string) => { found: boolean; count: number; evidence: readonly string[] };
  readonly weight: number; // contribution au score final
}

/**
 * 15 patterns IA-smell CALC (pas de LLM ici).
 * ART-AUTH-01: Détection déterministe des indices typiques d'écriture IA.
 */
export const IA_SMELL_PATTERNS: readonly IASmellPattern[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. OVER_ADJECTIVATION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'OVER_ADJECTIVATION',
    name: 'Sur-adjectivation',
    weight: 8,
    detect: (prose: string) => {
      const words = prose.split(/\s+/);
      const adjectivePattern = /\b(magnifique|splendide|extraordinaire|incroyable|remarquable|exceptionnel|merveilleux|fantastique)\b/gi;
      const adjectives = words.filter((w) => adjectivePattern.test(w));
      const nouns = words.filter((w) => /\b\w+tion\b|\b\w+ment\b|\b\w+eur\b/i.test(w)); // approximation noms
      const ratio = nouns.length > 0 ? adjectives.length / nouns.length : 0;
      const found = ratio > 0.3; // seuil arbitraire
      return { found, count: adjectives.length, evidence: adjectives.slice(0, 3) };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PERFECT_TRANSITIONS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'PERFECT_TRANSITIONS',
    name: 'Transitions parfaites systématiques',
    weight: 10,
    detect: (prose: string) => {
      const transitions = prose.match(/\b(Cependant|Ainsi|De plus|Par ailleurs|Néanmoins|Toutefois|En outre|De surcroît)\b/gi) || [];
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const found = transitions.length >= 3 && sentences.length > 0 && transitions.length / sentences.length > 0.3;
      return { found, count: transitions.length, evidence: transitions.slice(0, 3) };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. LIST_STRUCTURE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'LIST_STRUCTURE',
    name: 'Structures énumératives rigides',
    weight: 7,
    detect: (prose: string) => {
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      let listCount = 0;
      const evidence: string[] = [];

      // Détecter 3+ phrases commençant par même pattern
      const starters = sentences.map((s) => {
        const match = s.trim().match(/^(\w+\s+\w+)/);
        return match ? match[1].toLowerCase() : null;
      });

      const starterCounts: Record<string, number> = {};
      for (const starter of starters) {
        if (starter) {
          starterCounts[starter] = (starterCounts[starter] || 0) + 1;
          if (starterCounts[starter] === 3) {
            listCount++;
            evidence.push(`Répétition: "${starter}"`);
          }
        }
      }

      return { found: listCount > 0, count: listCount, evidence };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. NO_INTERRUPTION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'NO_INTERRUPTION',
    name: 'Zéro rupture syntaxique',
    weight: 6,
    detect: (prose: string) => {
      const interruptions = prose.match(/\b(—|\.\.\.|\?!|…|--)\b/g) || [];
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const found = sentences.length > 5 && interruptions.length === 0;
      return { found, count: 0, evidence: found ? ['Aucune rupture sur 5+ phrases'] : [] };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GENERIC_WISDOM
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'GENERIC_WISDOM',
    name: 'Sagesse générique creuse',
    weight: 9,
    detect: (prose: string) => {
      const wisdomPattern = /\b(la vie est|il faut comprendre|en fin de compte|au fond|dans ce monde)\b/gi;
      const matches = prose.match(wisdomPattern) || [];
      const found = matches.length >= 2;
      return { found, count: matches.length, evidence: matches.slice(0, 3) };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. BALANCED_SYMMETRY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'BALANCED_SYMMETRY',
    name: 'Symétrie excessive paragraphes',
    weight: 7,
    detect: (prose: string) => {
      const paragraphs = prose.split(/\n\n+/).filter((p) => p.trim().length > 0);
      if (paragraphs.length < 3) return { found: false, count: 0, evidence: [] };

      const lengths = paragraphs.map((p) => p.length);
      const avg = lengths.reduce((s, l) => s + l, 0) / lengths.length;
      const symmetric = lengths.filter((l) => Math.abs(l - avg) <= avg * 0.1).length;

      const found = symmetric >= paragraphs.length * 0.8; // 80%+ des paragraphes même longueur ±10%
      return { found, count: symmetric, evidence: found ? [`${symmetric}/${paragraphs.length} paragraphes symétriques`] : [] };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SAFE_VAGUENESS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'SAFE_VAGUENESS',
    name: 'Flou sécuritaire',
    weight: 8,
    detect: (prose: string) => {
      const vaguePattern = /\b(inspirant|profond|riche|complexe|nuancé|subtil)\b/gi;
      const matches = prose.match(vaguePattern) || [];
      const words = prose.split(/\s+/).length;
      const found = matches.length >= 3 && words > 50;
      return { found, count: matches.length, evidence: matches.slice(0, 3) };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. HYPER_POLITE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'HYPER_POLITE',
    name: 'Ton trop lisse, aucune aspérité',
    weight: 7,
    detect: (prose: string) => {
      const harsh = prose.match(/\b(merde|putain|con|salaud|crétin)\b/gi) || [];
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const found = sentences.length > 8 && harsh.length === 0;
      return { found, count: 0, evidence: found ? ['Aucune aspérité sur 8+ phrases'] : [] };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. TOO_MANY_EM_DASHES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'TOO_MANY_EM_DASHES',
    name: 'Tirets longs répétés (IA signature)',
    weight: 5,
    detect: (prose: string) => {
      const emDashes = prose.match(/—/g) || [];
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const found = emDashes.length >= 5 && sentences.length < 20;
      return { found, count: emDashes.length, evidence: found ? [`${emDashes.length} tirets longs`] : [] };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. RHETORICAL_OVERUSE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'RHETORICAL_OVERUSE',
    name: 'Questions rhétoriques répétées',
    weight: 6,
    detect: (prose: string) => {
      const questions = prose.match(/\?\s/g) || [];
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const found = questions.length >= 4 && sentences.length < 15;
      return { found, count: questions.length, evidence: found ? [`${questions.length} questions`] : [] };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. TEMPLATE_OPENING
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'TEMPLATE_OPENING',
    name: 'Ouverture cliché IA',
    weight: 9,
    detect: (prose: string) => {
      const openings = /^(Dans un monde|Il était une fois|Au cœur de|Dans le contexte|Imaginez un instant)/i;
      const found = openings.test(prose.trim());
      return { found, count: found ? 1 : 0, evidence: found ? [prose.split(/[.!?]/)[0]] : [] };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. TEMPLATE_CLOSING
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'TEMPLATE_CLOSING',
    name: 'Conclusion cliché IA',
    weight: 8,
    detect: (prose: string) => {
      const closings = /\b(en somme|en définitive|en conclusion|pour conclure|au final)\b/gi;
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const lastSentence = sentences[sentences.length - 1] || '';
      const found = closings.test(lastSentence);
      return { found, count: found ? 1 : 0, evidence: found ? [lastSentence.substring(0, 60)] : [] };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. LOW_SPECIFICITY_NOUNS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'LOW_SPECIFICITY_NOUNS',
    name: 'Noms vagues excessifs',
    weight: 7,
    detect: (prose: string) => {
      const vagueNouns = prose.match(/\b(chose|situation|moment|élément|aspect|fait|point)\b/gi) || [];
      const words = prose.split(/\s+/).length;
      const found = vagueNouns.length >= 5 && words > 50;
      return { found, count: vagueNouns.length, evidence: vagueNouns.slice(0, 3) };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. ZERO_SENSORY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ZERO_SENSORY',
    name: 'Aucun sensoriel concret',
    weight: 10,
    detect: (prose: string) => {
      const sensory = /\b(odeur|parfum|bruit|chaleur|froid|toucher|goût|texture|rugosité|doux|âcre)\b/gi;
      const matches = prose.match(sensory) || [];
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const found = sentences.length > 8 && matches.length === 0;
      return { found, count: 0, evidence: found ? ['Aucun sensoriel sur 8+ phrases'] : [] };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. OVER_EXPLAINING
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'OVER_EXPLAINING',
    name: 'Sur-explication au lieu d\'action',
    weight: 8,
    detect: (prose: string) => {
      const explanations = prose.match(/\b(parce que|car|en effet|c'est pourquoi|ainsi donc)\b/gi) || [];
      const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const found = explanations.length >= 4 && sentences.length < 12;
      return { found, count: explanations.length, evidence: explanations.slice(0, 3) };
    },
  },
];

/**
 * Calcule un score d'authenticité basé sur les 15 patterns IA-smell.
 * Score ∈ [0..100] : 100 = très authentique, 0 = IA évidente.
 *
 * @param prose - Texte à analyser
 * @returns Score [0-100] et patterns détectés
 */
export function computeIASmellScore(prose: string): {
  score: number;
  pattern_hits: readonly string[];
  details: readonly { id: string; found: boolean; count: number }[];
} {
  const results = IA_SMELL_PATTERNS.map((pattern) => {
    const result = pattern.detect(prose);
    return {
      id: pattern.id,
      found: result.found,
      count: result.count,
      weight: pattern.weight,
    };
  });

  // Score = 100 - (somme des poids des patterns détectés)
  const totalWeightDetected = results.filter((r) => r.found).reduce((sum, r) => {
    const pattern = IA_SMELL_PATTERNS.find((p) => p.id === r.id);
    return sum + (pattern?.weight || 0);
  }, 0);

  // Normaliser : poids max théorique = somme de tous les poids
  const maxWeight = IA_SMELL_PATTERNS.reduce((sum, p) => sum + p.weight, 0);
  const score = Math.max(0, Math.min(100, 100 - (totalWeightDetected / maxWeight) * 100));

  const pattern_hits = results.filter((r) => r.found).map((r) => r.id);

  return {
    score: Math.round(score),
    pattern_hits,
    details: results.map((r) => ({ id: r.id, found: r.found, count: r.count })),
  };
}
