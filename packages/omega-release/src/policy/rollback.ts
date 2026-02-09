/**
 * OMEGA Release — Rollback Planning
 * Phase G.0 — Generate rollback plans
 */

import type { RollbackPlan, RollbackStep } from './types.js';
import { compareSemVer } from '../version/comparator.js';
import { parseSemVer } from '../version/parser.js';

/** Generate standard rollback steps */
function standardRollbackSteps(fromVersion: string, toVersion: string): RollbackStep[] {
  return [
    {
      order: 1,
      action: 'BACKUP',
      description: `Backup current installation (v${fromVersion})`,
      command: `omega-release backup --version ${fromVersion}`,
      critical: true,
    },
    {
      order: 2,
      action: 'STOP',
      description: 'Stop running processes',
      command: 'omega-release stop',
      critical: true,
    },
    {
      order: 3,
      action: 'INSTALL',
      description: `Install target version (v${toVersion})`,
      command: `omega-release install --version ${toVersion}`,
      critical: true,
    },
    {
      order: 4,
      action: 'VERIFY',
      description: 'Run self-test on rolled-back version',
      command: 'omega-release selftest',
      critical: true,
    },
    {
      order: 5,
      action: 'START',
      description: 'Restart processes',
      command: 'omega-release start',
      critical: false,
    },
  ];
}

/** Check if rollback requires data migration (major version change) */
export function requiresDataMigration(fromVersion: string, toVersion: string): boolean {
  try {
    const from = parseSemVer(fromVersion);
    const to = parseSemVer(toVersion);
    return from.major !== to.major;
  } catch {
    return true;
  }
}

/** Generate a rollback plan */
export function generateRollbackPlan(fromVersion: string, toVersion: string): RollbackPlan {
  let from, to;
  try {
    from = parseSemVer(fromVersion);
    to = parseSemVer(toVersion);
  } catch {
    return {
      fromVersion,
      toVersion,
      steps: [],
      estimatedDowntime: 'unknown',
      requiresDataMigration: true,
    };
  }

  const cmp = compareSemVer(from, to);
  if (cmp <= 0) {
    return {
      fromVersion,
      toVersion,
      steps: [],
      estimatedDowntime: '0m',
      requiresDataMigration: false,
    };
  }

  const steps = standardRollbackSteps(fromVersion, toVersion);
  const needsMigration = requiresDataMigration(fromVersion, toVersion);

  if (needsMigration) {
    steps.splice(2, 0, {
      order: 3,
      action: 'MIGRATE',
      description: 'Run data migration for major version rollback',
      command: `omega-release migrate --from ${fromVersion} --to ${toVersion}`,
      critical: true,
    });
    // Re-number
    steps.forEach((step, i) => {
      (step as { order: number }).order = i + 1;
    });
  }

  const downtime = needsMigration ? '15-30m' : '5-10m';

  return {
    fromVersion,
    toVersion,
    steps,
    estimatedDowntime: downtime,
    requiresDataMigration: needsMigration,
  };
}

/** Format rollback plan as text */
export function formatRollbackPlan(plan: RollbackPlan): string {
  const lines: string[] = [];
  lines.push(`Rollback Plan: v${plan.fromVersion} -> v${plan.toVersion}`);
  lines.push(`Estimated Downtime: ${plan.estimatedDowntime}`);
  lines.push(`Data Migration Required: ${plan.requiresDataMigration ? 'YES' : 'NO'}`);
  lines.push('');
  lines.push('Steps:');
  for (const step of plan.steps) {
    const tag = step.critical ? '[CRITICAL]' : '[optional]';
    lines.push(`  ${step.order}. ${tag} ${step.action}: ${step.description}`);
    if (step.command) {
      lines.push(`     $ ${step.command}`);
    }
  }
  return lines.join('\n');
}
