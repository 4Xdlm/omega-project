/**
 * OMEGA Governance — CLI Command: Badge
 * Phase F — Generate CI badge
 */

import { generateBadge, generateUnknownBadge } from '../../ci/badge/generator.js';
import { CI_EXIT_PASS } from '../../ci/types.js';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import type { CIResult } from '../../ci/types.js';

export interface BadgeArgs {
  readonly resultFile?: string;
  readonly out?: string;
}

export function executeBadge(args: BadgeArgs): number {
  let badge;

  if (args.resultFile && existsSync(args.resultFile)) {
    const raw = readFileSync(args.resultFile, 'utf-8');
    const parsed = JSON.parse(raw) as { result: CIResult };
    badge = generateBadge(parsed.result);
  } else {
    badge = generateUnknownBadge();
  }

  if (args.out) {
    writeFileSync(args.out, badge.svg, 'utf-8');
    console.log(`Badge written to ${args.out}`);
  } else {
    console.log(badge.svg);
  }

  return CI_EXIT_PASS;
}
