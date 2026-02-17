/**
 * OMEGA GENIUS ENGINE — SSOT LOADER
 * Sprint: GENIUS-03 | NASA-Grade L4 / DO-178C Level A
 *
 * Loads normative constants from GENIUS_SSOT.json.
 * All calibrator thresholds and weights MUST come from this loader.
 * If SSOT is not found → explicit FAIL (no silent fallback).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SSOTCalibratorConfig {
  readonly T_base: number;
  readonly P_base: number;
  readonly sigma_max: number;
  readonly S_cible: number;
  readonly h_denominator: number;
  readonly benchmark_version: string;
  readonly honesty_weights: {
    readonly H1: number;
    readonly H2: number;
    readonly H3: number;
    readonly H4: number;
    readonly H5: number;
  };
  readonly stopword_showTell_threshold: number;
  readonly incoh_penalty_factor: number;
  readonly incoh_penalty_max: number;
  readonly piloting: {
    readonly mono_min: number;
    readonly multi_min: number;
  };
}

function findSSOTPath(): string {
  const candidates = [
    resolve(process.cwd(), 'docs/GENIUS-00-SPEC/GENIUS_SSOT.json'),
    resolve(process.cwd(), '../../docs/GENIUS-00-SPEC/GENIUS_SSOT.json'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `GENIUS_SSOT.json not found. No silent fallback. Searched:\n${candidates.join('\n')}`
  );
}

let cached: SSOTCalibratorConfig | null = null;

export function loadSSOTCalibrator(): SSOTCalibratorConfig {
  if (cached) return cached;

  const filePath = findSSOTPath();
  const raw = readFileSync(filePath, 'utf-8');
  const ssot = JSON.parse(raw);

  const c = ssot.C_llm;
  if (!c) {
    throw new Error('GENIUS_SSOT.json: missing C_llm section');
  }

  const required = [
    'T_base', 'P_base', 'sigma_max', 'S_cible', 'h_denominator',
    'honesty_weights', 'stopword_showTell_threshold',
    'incoh_penalty_factor', 'incoh_penalty_max',
  ];
  for (const field of required) {
    if (c[field] === undefined) {
      throw new Error(`GENIUS_SSOT.json: C_llm.${field} is missing`);
    }
  }

  cached = {
    T_base: c.T_base,
    P_base: c.P_base,
    sigma_max: c.sigma_max,
    S_cible: c.S_cible,
    h_denominator: c.h_denominator,
    benchmark_version: c.benchmark.core_version,
    honesty_weights: {
      H1: c.honesty_weights.H1,
      H2: c.honesty_weights.H2,
      H3: c.honesty_weights.H3,
      H4: c.honesty_weights.H4,
      H5: c.honesty_weights.H5,
    },
    stopword_showTell_threshold: c.stopword_showTell_threshold,
    incoh_penalty_factor: c.incoh_penalty_factor,
    incoh_penalty_max: c.incoh_penalty_max,
    piloting: {
      mono_min: c.piloting.mono_pass.C_llm_min,
      multi_min: c.piloting.multi_pass.C_llm_range[0],
    },
  };

  return cached;
}
