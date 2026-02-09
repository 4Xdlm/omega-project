/**
 * OMEGA Governance — CLI Command: Replay
 * Phase F — Replay comparison CLI
 */

import { replayCompare } from '../../ci/replay/engine.js';
import { DEFAULT_CI_CONFIG } from '../../ci/config.js';
import { CI_EXIT_PASS, CI_EXIT_FAIL, CI_EXIT_USAGE } from '../../ci/types.js';

export interface ReplayArgs {
  readonly baselineDir: string;
  readonly candidateDir: string;
  readonly seed?: string;
  readonly format?: 'json' | 'md';
}

export function executeReplay(args: ReplayArgs): number {
  if (!args.baselineDir || !args.candidateDir) {
    console.error('replay requires --baseline and --candidate');
    return CI_EXIT_USAGE;
  }

  const result = replayCompare(args.baselineDir, args.candidateDir, {
    seed: args.seed ?? DEFAULT_CI_CONFIG.DEFAULT_SEED,
    timeout_ms: DEFAULT_CI_CONFIG.REPLAY_TIMEOUT_MS,
  });

  console.log(JSON.stringify(result, null, 2));
  return result.identical ? CI_EXIT_PASS : CI_EXIT_FAIL;
}
