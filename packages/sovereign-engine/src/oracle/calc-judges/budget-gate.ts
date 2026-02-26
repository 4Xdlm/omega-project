// src/oracle/calc-judges/budget-gate.ts
// INV-BUDGET-01: révélation prématurée information critique → REJECT fatal
// INV-RETEN-01: information withheld doit être révélée en Q3 (pas avant, pas après)

export interface BudgetGateResult {
  readonly passed: boolean;
  readonly verdict: 'PASS' | 'REJECT';
  readonly violation_type: 'PREMATURE_REVELATION' | 'MISSING_REVELATION' | null;
  readonly violation_quartile: number | null;  // 1-4
  readonly penalty: number;   // 0 ou -25 (fatal)
}

// Découper la prose en 4 quartiles
export function splitIntoQuartiles(prose: string): [string, string, string, string] {
  const len = prose.length;
  const q = Math.floor(len / 4);
  return [
    prose.slice(0, q),
    prose.slice(q, q * 2),
    prose.slice(q * 2, q * 3),
    prose.slice(q * 3),
  ];
}

// Détecter révélation prématurée (information critique en Q1 ou Q2)
// Heuristique: patterns "il avait [secret]", "elle savait que", "la vérité était"
// en Q1/Q2 → REJECT
export function applyBudgetGate(prose: string, _config?: unknown): BudgetGateResult {
  const quartiles = splitIntoQuartiles(prose);

  // NOTE: (?=\W|$) remplace \b en fin de pattern — JS \b broken pour accents français (é, è, à)
  const REVELATION_PATTERNS = [
    /\b(la\s+vérité\s+(était|est)|il\s+(avait\s+toujours\s+su|savait\s+que)|elle\s+savait\s+que|le\s+secret\s+(était|est))(?=\W|$)/gi,
    /\b(en\s+réalité|au\s+fond|il\s+faut\s+dire\s+que|ce\s+que\s+personne\s+ne\s+savait)(?=\W|$)/gi,
  ];

  // Vérifier Q1 et Q2 pour révélation prématurée
  for (let qi = 0; qi < 2; qi++) {
    for (const pattern of REVELATION_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(quartiles[qi])) {
        return {
          passed: false,
          verdict: 'REJECT',
          violation_type: 'PREMATURE_REVELATION',
          violation_quartile: qi + 1,
          penalty: -25,
        };
      }
    }
  }

  return {
    passed: true,
    verdict: 'PASS',
    violation_type: null,
    violation_quartile: null,
    penalty: 0,
  };
}
