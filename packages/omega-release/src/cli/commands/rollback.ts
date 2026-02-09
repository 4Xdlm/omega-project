/**
 * OMEGA Release — CLI Rollback Command
 * Phase G.0
 */

import type { ParsedArgs } from '../parser.js';
import { generateRollbackPlan, formatRollbackPlan } from '../../policy/rollback.js';
import { readVersionFile } from '../../version/file.js';
import { join } from 'node:path';

/** Handle rollback command */
export function handleRollback(parsed: ParsedArgs, projectRoot: string): string {
  const targetVersion = parsed.args[0];

  if (!targetVersion) {
    return 'ERROR: Target version required. Usage: omega-release rollback <version>';
  }

  const versionFilePath = join(projectRoot, 'VERSION');
  const vf = readVersionFile(versionFilePath);

  if (!vf) return 'ERROR: VERSION file not found';

  const plan = generateRollbackPlan(vf.version, targetVersion);

  if (plan.steps.length === 0) {
    return `Cannot rollback: ${vf.version} -> ${targetVersion} (not a downgrade or invalid versions)`;
  }

  if (parsed.flags['json'] === true) {
    return JSON.stringify(plan, null, 2);
  }

  return formatRollbackPlan(plan);
}
