// src/oracle/genesis-v2/genesis-runner.ts
// GENESIS_V2=1 → active Step 0 (plan) + paradox gates + LOT3
// Le Diffusion Runner (worst-2) est préparé mais activé en W3b via DIFFUSION_V2=1

export const GENESIS_V2_ENABLED = process.env.GENESIS_V2 === '1';
export const DIFFUSION_V2_ENABLED = process.env.DIFFUSION_V2 === '1';

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
