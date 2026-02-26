// src/oracle/calc-judges/soma-gate.ts
// INV-SOMA-01: 0 occurrence anatomie générique → Hard Gate REJECT

import { calculateShowTellScore } from './show-tell-detector.js';

export interface SomaGateResult {
  readonly passed: boolean;        // true = aucune anatomie générique
  readonly violations_count: number;
  readonly verdict: 'PASS' | 'REJECT';
  readonly blocking_patterns: readonly string[];
}

export function applySomaGate(prose: string): SomaGateResult {
  const result = calculateShowTellScore(prose);
  const passed = result.violations_soma === 0;
  return {
    passed,
    violations_count: result.violations_soma,
    verdict: passed ? 'PASS' : 'REJECT',
    blocking_patterns: passed ? [] : extractSomaPatterns(prose),
  };
}

function extractSomaPatterns(prose: string): string[] {
  // Retourner les passages matchés pour audit forensic
  const GENERIC_ANATOMY = [
    /cœur\s+qui\s+(bat|battait|s'emballe)/gi,
    /mains?\s+(tremblaient?|tremblantes?)/gi,
    /jambes?\s+flageo(laient?|lantes?)/gi,
    /yeux\s+s'écarquill(èrent|aient)/gi,
    /gorge\s+(serrée|nouée)/gi,
    /ventre\s+noué/gi,
  ];
  const matches: string[] = [];
  for (const pattern of GENERIC_ANATOMY) {
    const found = prose.match(pattern);
    if (found) matches.push(...found);
  }
  return matches;
}
