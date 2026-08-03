/**
 * OMEGA — OPPORTUNITY_ALLOCATOR : le plafond devient une allocation, jamais un quota.
 *
 * SPEC (amendement ChatGPT ratifié 2026-08-03, HOLD levé par cette implémentation) :
 *   1. filtrer les scènes ÉLIGIBLES (le planificateur décide de l'éligibilité
 *      narrative — fn de scène compatible, pas de climax d'action, etc.) ;
 *   2. budget du livre = floor(éligibles × plafond) — le plafond est une
 *      PROPENSION MAXIMALE (CONTROL_POLICY), pas une part à atteindre ;
 *   3. classer par adéquation narrative (affinity, fournie par le plan) ;
 *   4. départage DÉTERMINISTE par hash stable (bookSeed + index de scène) —
 *      jamais de tirage aléatoire indépendant par scène ;
 *   5. une scène sans justification (affinity ≤ 0) n'est JAMAIS ouverte,
 *      même si le budget n'est pas consommé ;
 *   6. la décision est JOURNALISÉE (à verser dans PLAN_LOCK).
 *
 * Exemple de la spec : 20 éligibles × 0,50 = budget 10, mais si 6 scènes
 * seulement ont une justification narrative → 6 ouvertures, pas 10 forcées.
 *
 * Aucun de ces nombres n'atteint jamais le modèle : l'ouverture se traduit en
 * OPPORTUNITÉ dans le PLAN (FORBID-006 v2 §5), le texte de la directive reste
 * celui de scribe-v2 (sans chiffre).
 */

export interface SceneForAllocation {
  readonly chapterIndex: number;
  /** Décidé par le planificateur : la scène peut-elle porter une période ? */
  readonly eligible: boolean;
  /** Adéquation narrative [0..1] fournie par le plan. ≤ 0 = jamais ouverte. */
  readonly affinity: number;
}

export interface AllocationEntry {
  readonly chapterIndex: number;
  readonly opened: boolean;
  readonly reason:
    | 'OPENED_BY_AFFINITY'
    | 'NOT_ELIGIBLE'
    | 'NO_NARRATIVE_JUSTIFICATION'
    | 'BUDGET_EXHAUSTED';
  readonly affinity: number;
}

export interface AllocationResult {
  /** Chapitres ouverts, triés par index. */
  readonly opened: readonly number[];
  readonly budget: number;
  readonly eligibleCount: number;
  /** Journal complet — à verser dans PLAN_LOCK. */
  readonly journal: readonly AllocationEntry[];
}

/** FNV-1a 32 bits — hash stable, sans dépendance, suffisant pour un départage. */
export function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function allocateOpportunities(
  scenes: readonly SceneForAllocation[],
  ceiling: number,
  bookSeed: string,
): AllocationResult {
  const clamped = Math.min(1, Math.max(0, ceiling));
  const eligible = scenes.filter((s) => s.eligible);
  const budget = Math.floor(eligible.length * clamped);

  // Classement : adéquation décroissante, départage par hash stable —
  // deux exécutions avec le même bookSeed rendent la même allocation.
  const ranked = eligible
    .filter((s) => s.affinity > 0)
    .map((s) => ({ s, tie: stableHash(`${bookSeed}:${s.chapterIndex}`) }))
    .sort((a, b) => b.s.affinity - a.s.affinity || a.tie - b.tie || a.s.chapterIndex - b.s.chapterIndex);

  const openedSet = new Set(ranked.slice(0, budget).map((r) => r.s.chapterIndex));

  const journal: AllocationEntry[] = scenes.map((s) => {
    if (!s.eligible) {
      return { chapterIndex: s.chapterIndex, opened: false, reason: 'NOT_ELIGIBLE', affinity: s.affinity };
    }
    if (s.affinity <= 0) {
      return {
        chapterIndex: s.chapterIndex,
        opened: false,
        reason: 'NO_NARRATIVE_JUSTIFICATION',
        affinity: s.affinity,
      };
    }
    if (openedSet.has(s.chapterIndex)) {
      return { chapterIndex: s.chapterIndex, opened: true, reason: 'OPENED_BY_AFFINITY', affinity: s.affinity };
    }
    return { chapterIndex: s.chapterIndex, opened: false, reason: 'BUDGET_EXHAUSTED', affinity: s.affinity };
  });

  return {
    opened: [...openedSet].sort((a, b) => a - b),
    budget,
    eligibleCount: eligible.length,
    journal,
  };
}
