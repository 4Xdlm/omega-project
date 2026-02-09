/**
 * OMEGA Runner — CLI: run report
 * Phase D.1 — Generate consolidated report from existing run
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ParsedArgs, Manifest } from '../../types.js';
import { EXIT_SUCCESS, EXIT_IO_ERROR, EXIT_GENERIC_ERROR } from '../../types.js';
import { buildReportFromManifest } from '../../orchestrator/runReport.js';

/** Execute the run-report command */
export function executeRunReport(args: ParsedArgs): number {
  try {
    const manifestPath = join(args.dir!, 'manifest.json');
    const manifestRaw = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw) as Manifest;

    const { reportJson, reportMd } = buildReportFromManifest(manifest, []);

    const outPath = args.out!;
    if (outPath.endsWith('.md')) {
      writeFileSync(outPath, reportMd, 'utf8');
    } else {
      writeFileSync(outPath, reportJson, 'utf8');
    }

    return EXIT_SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ENOENT') || msg.includes('no such file')) return EXIT_IO_ERROR;
    return EXIT_GENERIC_ERROR;
  }
}
