#!/usr/bin/env node
/**
 * OMEGA — PR-5 PROOFPACK CLI
 * Builds exportable proof packages for E2E and stress runs.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildProofPack, generateReplayScript, generateVerifyPowershell } from '../packages/scribe-engine/dist/pr/proofpack.js';

// ============================================================================
// CLI
// ============================================================================

function printUsage() {
  console.log(`
OMEGA Proofpack CLI — PR-5

Usage:
  node scripts/pr/proofpack-cli.ts --source <dir> --output <dir> --type <run-type> --verdict <PASS|FAIL>

Options:
  --source <dir>    Source directory containing run artifacts
  --output <dir>    Output directory for proofpack
  --type <type>     Run type (e2e, stress100, concurrency10, etc.)
  --verdict <v>     Run verdict (PASS or FAIL)

Example:
  node scripts/pr/proofpack-cli.ts \\
    --source metrics/pr/PR_RUNS/stress100_001 \\
    --output proofpacks/stress100_001 \\
    --type stress100 \\
    --verdict PASS
  `);
}

function parseArgs(args: string[]): { source: string; output: string; type: string; verdict: string } | null {
  const source = args.find((a) => a.startsWith('--source='))?.split('=')[1];
  const output = args.find((a) => a.startsWith('--output='))?.split('=')[1];
  const type = args.find((a) => a.startsWith('--type='))?.split('=')[1];
  const verdict = args.find((a) => a.startsWith('--verdict='))?.split('=')[1];

  if (!source || !output || !type || !verdict) {
    return null;
  }

  return { source, output, type, verdict };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const config = parseArgs(args);
  if (!config) {
    console.error('Error: Missing required arguments');
    printUsage();
    process.exit(1);
  }

  console.log('=== OMEGA PROOFPACK BUILDER ===');
  console.log(`Source:  ${config.source}`);
  console.log(`Output:  ${config.output}`);
  console.log(`Type:    ${config.type}`);
  console.log(`Verdict: ${config.verdict}`);
  console.log('');

  if (!existsSync(config.source)) {
    console.error(`Error: Source directory not found: ${config.source}`);
    process.exit(1);
  }

  try {
    console.log('Building proofpack...');
    const manifest = buildProofPack({
      sourceDir: config.source,
      outputDir: config.output,
      runType: config.type,
      verdict: config.verdict,
    });

    console.log(`✓ Proofpack built: ${manifest.pack_id}`);
    console.log(`✓ Files: ${manifest.files.length}`);
    console.log(`✓ SHA256SUMS.txt: ${join(config.output, manifest.sha256_manifest)}`);
    console.log(`✓ Toolchain: ${join(config.output, manifest.toolchain)}`);
    console.log('');

    // Generate replay scripts
    console.log('Generating replay scripts...');

    const bashScript = generateReplayScript(manifest);
    const bashPath = join(config.output, 'replay.sh');
    writeFileSync(bashPath, bashScript, 'utf8');
    console.log(`✓ Bash replay: ${bashPath}`);

    const ps1Script = generateVerifyPowershell(manifest);
    const ps1Path = join(config.output, 'verify.ps1');
    writeFileSync(ps1Path, ps1Script, 'utf8');
    console.log(`✓ PowerShell verify: ${ps1Path}`);

    console.log('');
    console.log('=== PROOFPACK COMPLETE ===');
    console.log(`Pack ID: ${manifest.pack_id}`);
    console.log(`Location: ${config.output}`);

    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err}`);
    process.exit(1);
  }
}

main();
