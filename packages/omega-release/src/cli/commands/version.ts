/**
 * OMEGA Release — CLI Version Command
 * Phase G.0
 */

import type { ParsedArgs } from '../parser.js';
import { readVersionFile, writeVersionFile } from '../../version/file.js';
import { bumpVersion } from '../../version/bumper.js';
import { validateVersion } from '../../version/validator.js';
import { join } from 'node:path';
import type { VersionBump } from '../../version/types.js';

/** Handle version command */
export function handleVersion(parsed: ParsedArgs, projectRoot: string): string {
  const versionFilePath = join(projectRoot, 'VERSION');
  const subcommand = parsed.args[0] ?? 'show';

  switch (subcommand) {
    case 'show': {
      const vf = readVersionFile(versionFilePath);
      if (!vf) return 'ERROR: VERSION file not found';
      return vf.version;
    }
    case 'bump': {
      const bumpType = (parsed.args[1] ?? 'patch') as VersionBump;
      if (!['major', 'minor', 'patch'].includes(bumpType)) {
        return `ERROR: Invalid bump type: ${bumpType}`;
      }
      const vf = readVersionFile(versionFilePath);
      if (!vf) return 'ERROR: VERSION file not found';
      const newVersion = bumpVersion(vf.version, bumpType);
      if (!newVersion) return 'ERROR: Cannot bump version';
      writeVersionFile(versionFilePath, newVersion);
      return `Bumped: ${vf.version} -> ${newVersion}`;
    }
    case 'validate': {
      const vf = readVersionFile(versionFilePath);
      if (!vf) return 'ERROR: VERSION file not found';
      const result = validateVersion(vf.version);
      return result.valid ? `VALID: ${vf.version}` : `INVALID: ${result.errors.join(', ')}`;
    }
    case 'set': {
      const newVersion = parsed.args[1];
      if (!newVersion) return 'ERROR: No version specified';
      const result = validateVersion(newVersion);
      if (!result.valid) return `INVALID: ${result.errors.join(', ')}`;
      writeVersionFile(versionFilePath, newVersion);
      return `Set version: ${newVersion}`;
    }
    default:
      return `Unknown version subcommand: ${subcommand}`;
  }
}
