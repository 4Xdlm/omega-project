// src/oracle/genesis-v2/genesis-runner.ts
// GENESIS_V2=1 → active Step 0 (plan) + paradox gates + LOT3
// Le Diffusion Runner (worst-2) est préparé mais activé en W3b via DIFFUSION_V2=1

export const GENESIS_V2_ENABLED = process.env.GENESIS_V2 === '1';
export const DIFFUSION_V2_ENABLED = process.env.DIFFUSION_V2 === '1';

// Shapes/experiment IDs exempted from Genesis v2 (LOT3 only, zero paradox overhead)
// Exact match (Set-based) — deterministic, no substring ambiguity
export const GENESIS_V2_EXEMPT_SHAPES: ReadonlySet<string> = new Set(
  (process.env.GENESIS_V2_EXEMPT_SHAPES ?? 'E1_continuity_impossible,absolute_necessity,E3_absolute_necessity')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Returns true if Genesis v2 is active for the given shape/experiment ID.
 * Returns false if GENESIS_V2 is disabled globally, or if the shape matches
 * an exempt entry (exact match, case-insensitive).
 */
export function isGenesisV2Active(shapeOrExpId: string): boolean {
  if (!GENESIS_V2_ENABLED) return false;
  const id = shapeOrExpId.trim().toLowerCase();
  return !GENESIS_V2_EXEMPT_SHAPES.has(id);
}

export interface GenesisRunConfig {
  readonly genesis_v2: boolean;
  readonly diffusion_v2: boolean;
  readonly max_diffusion_steps: number;
  readonly pareto_min_gain: number;
  readonly regress_epsilon: number;
}

export function getGenesisConfig(): GenesisRunConfig {
  return {
    genesis_v2: GENESIS_V2_ENABLED,
    diffusion_v2: DIFFUSION_V2_ENABLED,
    max_diffusion_steps: parseInt(process.env.MAX_DIFFUSION_STEPS ?? '4', 10),
    pareto_min_gain: parseFloat(process.env.PARETO_MIN_GAIN ?? '0.05'),
    regress_epsilon: parseFloat(process.env.REGRESS_EPSILON ?? '0.02'),
  };
}
