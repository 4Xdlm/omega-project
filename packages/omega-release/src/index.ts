/**
 * OMEGA Release — Public API
 * Phase G.0 — Production Hardening & Release
 *
 * @module @omega/release
 */

// Version
export type { SemVer, VersionBump, VersionInfo, VersionFile } from './version/types.js';
export { parseSemVer, parseVersionInfo, formatSemVer, isSemVer } from './version/parser.js';
export { validateVersion, validatePrerelease } from './version/validator.js';
export { bumpVersion, bumpSemVer, setVersion } from './version/bumper.js';
export { compareSemVer, isGreaterThan, isEqual, sortVersions } from './version/comparator.js';
export { readVersionFile, writeVersionFile, extractVersionFromFilename } from './version/file.js';

// Changelog
export type { ChangeType, ChangelogEntry, ChangelogVersion, Changelog } from './changelog/types.js';
export { parseChangelog, findVersion } from './changelog/parser.js';
export { createEntry, createVersionSection, generateReleaseDate } from './changelog/generator.js';
export { validateChangelog, validateChangelogContent } from './changelog/validator.js';
export { renderChangelog, addVersionToChangelog } from './changelog/writer.js';

// Release
export type { Platform, ArchiveFormat, ReleaseConfig, ReleaseArtifact, ReleaseManifest, SBOM, SBOMComponent, ReleaseResult } from './release/types.js';
export { ALL_PLATFORMS, PLATFORM_FORMAT } from './release/types.js';
export { sha256File, sha512File, sha256String, generateChecksumFile, verifyChecksum, parseChecksumFile } from './release/hasher.js';
export { generateArtifactFilename, createArtifact } from './release/packager.js';
export { generateManifest, validateManifest } from './release/manifest.js';
export { generateSBOM, validateSBOM } from './release/sbom.js';
export { generateReleaseNotes } from './release/notes.js';
export { buildRelease } from './release/builder.js';

// Install
export type { InstallConfig, InstallResult, InstallCheck } from './install/types.js';
export { verifyArchive, verifySingleFile } from './install/verifier.js';
export { extractArchive } from './install/extractor.js';

// Self-Test
export type { CheckId, CheckStatus, TestCheck, SelfTestResult } from './selftest/types.js';
export { runSelfTest, runSingleCheck } from './selftest/runner.js';
export { formatSelfTestText, formatSelfTestJSON, selfTestSummary } from './selftest/reporter.js';

// Policy
export type { SupportStatus, SupportPolicy, RollbackStep, RollbackPlan } from './policy/types.js';
export { calculateSupportStatus, createSupportPolicy, isSupported, formatSupportStatus } from './policy/support.js';
export { generateRollbackPlan, formatRollbackPlan, requiresDataMigration } from './policy/rollback.js';

// Invariants
export type { InvariantResult, InvariantContext, InvariantStatus } from './invariants/types.js';
export {
  invVersionCoherence,
  invSemVerValidity,
  invVersionMonotonicity,
  invChangelogConsistency,
  invArtifactIntegrity,
  invSelfTestGate,
  invChecksumDeterminism,
  invPlatformCoverage,
  invBuildDeterminism,
  invManifestIntegrity,
  runAllInvariants,
} from './invariants/release-invariants.js';

// CLI
export { executeCLI, EXIT_OK, EXIT_ERROR, EXIT_USAGE } from './cli/main.js';
export { parseArgs, isValidCommand, COMMANDS } from './cli/parser.js';
