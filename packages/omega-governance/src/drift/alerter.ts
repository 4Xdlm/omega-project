/**
 * OMEGA Governance — Drift Alerter
 * Phase D.2 — Generate structured alerts from drift reports
 */

import type { DriftReport, DriftAlert } from './types.js';

/** Generate alerts from a drift report */
export function generateAlerts(report: DriftReport): readonly DriftAlert[] {
  const alerts: DriftAlert[] = [];

  for (const detail of report.details) {
    if (detail.rule.includes('identical') || detail.rule.includes('< DRIFT_SOFT')) {
      continue;
    }

    alerts.push({
      level: report.level,
      type: detail.type,
      message: formatAlertMessage(detail.type, detail.path, detail.rule),
      detail,
    });
  }

  return alerts;
}

function formatAlertMessage(type: string, path: string, rule: string): string {
  return `[${type}] Drift at ${path}: ${rule}`;
}

/** Format alerts as human-readable text */
export function formatAlertsText(alerts: readonly DriftAlert[]): string {
  if (alerts.length === 0) return 'No alerts.';

  const lines: string[] = [];
  for (const alert of alerts) {
    lines.push(`[${alert.level}] ${alert.message}`);
  }
  return lines.join('\n');
}
