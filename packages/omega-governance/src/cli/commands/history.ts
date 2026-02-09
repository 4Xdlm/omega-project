/**
 * OMEGA Governance — CLI History Command
 * Phase D.2
 */

import { writeFileSync } from 'node:fs';
import type { GovParsedArgs } from '../parser.js';
import { createConfig } from '../../core/config.js';
import { readEvents } from '../../history/logger.js';
import { queryEvents } from '../../history/query-engine.js';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR, EXIT_IO_ERROR } from '../../core/types.js';

/** Execute history command */
export function executeHistory(args: GovParsedArgs): number {
  if (!args.log) {
    console.error('Error: --log is required');
    return EXIT_USAGE_ERROR;
  }

  try {
    const config = createConfig();
    const events = readEvents(args.log);

    const filtered = queryEvents(events, {
      since: args.since,
      until: args.until,
    }, config);

    const output = JSON.stringify(filtered, null, 2);

    if (args.out) {
      writeFileSync(args.out, output, 'utf-8');
      console.log(`History written to ${args.out}`);
    } else {
      console.log(output);
    }

    return EXIT_SUCCESS;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_IO_ERROR;
  }
}
