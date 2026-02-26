// src/utils/math-utils.ts — utilitaires mathematiques partages OMEGA
// Extrait de arc-progression-evaluator.ts (W0.3) — source unique

export function calculateVariance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
}

export function pearsonCorrelation(x: readonly number[], y: readonly number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((a, b, i) => a + (b - meanX) * (y[i] - meanY), 0);
  const denX = Math.sqrt(x.reduce((a, b) => a + Math.pow(b - meanX, 2), 0));
  const denY = Math.sqrt(y.reduce((a, b) => a + Math.pow(b - meanY, 2), 0));
  if (denX === 0 || denY === 0) return 0;
  return num / (denX * denY);
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const nA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (nA === 0 || nB === 0) return 0;
  return dot / (nA * nB);
}
