/**
 * OMEGA Release — CLI Build Command
 * Phase G.0
 */

import type { ParsedArgs } from '../parser.js';
import { buildRelease } from '../../release/builder.js';
import { readVersionFile } from '../../version/file.js';
import type { Platform, ReleaseConfig } from '../../release/types.js';
import { ALL_PLATFORMS } from '../../release/types.js';
import { join } from 'node:path';

/** Handle build command */
export function handleBuild(parsed: ParsedArgs, projectRoot: string): string {
  const versionFilePath = join(projectRoot, 'VERSION');
  const vf = readVersionFile(versionFilePath);

  if (!vf) return 'ERROR: VERSION file not found';

  const outputDir = (parsed.flags['output'] as string) ?? join(projectRoot, 'releases');
  const platformFlag = parsed.flags['platform'] as string | undefined;
  const commit = (parsed.flags['commit'] as string) ?? 'HEAD';

  let platforms: readonly Platform[];
  if (platformFlag) {
    const p = platformFlag as Platform;
    if (!ALL_PLATFORMS.includes(p)) {
      return `ERROR: Invalid platform: ${platformFlag}. Valid: ${ALL_PLATFORMS.join(', ')}`;
    }
    platforms = [p];
  } else {
    platforms = ALL_PLATFORMS;
  }

  const config: ReleaseConfig = {
    version: vf.version,
    platforms,
    outputDir,
    includeSource: parsed.flags['include-source'] === true,
    generateSbom: parsed.flags['no-sbom'] !== true,
  };

  const result = buildRelease(config, projectRoot, commit);

  const lines: string[] = [];
  lines.push(`Release built: v${result.version}`);
  lines.push(`Artifacts: ${result.artifacts.length}`);
  for (const a of result.artifacts) {
    lines.push(`  ${a.filename} (${a.platform}) — ${a.sha256.slice(0, 16)}...`);
  }
  lines.push(`Checksums: ${result.checksumFile}`);
  return lines.join('\n');
}
