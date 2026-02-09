/**
 * OMEGA Governance — JSON Reporter
 * Phase F — Generate JSON CI report
 *
 * INV-F-07: Report is a pure function of gate results (no side effects).
 */

import type { CIResult, CIReport } from '../types.js';
import type { ReportOutput } from './types.js';
import { buildSummary, buildRecommendations } from './summary.js';

/** Generate JSON CI report */
export function generateJSONReport(result: CIResult): ReportOutput {
  const summary = buildSummary(result);
  const recommendations = buildRecommendations(result);

  const report: CIReport = { result, summary, recommendations };

  return {
    format: 'json',
    content: JSON.stringify(report, null, 2),
    filename: `ci-report-${result.run_id}.json`,
  };
}
