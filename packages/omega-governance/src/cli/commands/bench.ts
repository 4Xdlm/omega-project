/**
 * OMEGA Governance — CLI Bench Command
 * Phase D.2
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { GovParsedArgs } from '../parser.js';
import { createConfig } from '../../core/config.js';
import { loadSuite } from '../../bench/suite-loader.js';
import { buildBenchReport } from '../../bench/threshold-checker.js';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR, EXIT_IO_ERROR } from '../../core/types.js';

/** Execute bench command */
export function executeBench(args: GovParsedArgs): number {
  if (!args.suite) {
    console.error('Error: --suite is required');
    return EXIT_USAGE_ERROR;
  }

  try {
    const config = createConfig();
    const suite = loadSuite(args.suite);

    const report = buildBenchReport(suite.name, [], suite.thresholds, config);
    const output = JSON.stringify(report, null, 2);

    if (args.out) {
      mkdirSync(args.out, { recursive: true });
      writeFileSync(join(args.out, 'bench-report.json'), output, 'utf-8');
      console.log(`Bench report written to ${args.out}/bench-report.json`);
    } else {
      console.log(output);
    }

    return EXIT_SUCCESS;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_IO_ERROR;
  }
}
