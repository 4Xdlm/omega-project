/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — CONNECTORS INDEX
 * Version: 0.4.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Filesystem Connector
export {
  RealFilesystemConnector,
  MockFilesystemConnector,
  createFilesystemConnector,
  createMockFilesystem
} from "./filesystem.js";
export type {
  FilesystemConnector,
  FileReadResult,
  FileWriteResult
} from "./filesystem.js";

// CLI Connector
export {
  RealCLIConnector,
  MockCLIConnector,
  createCLIConnector,
  createMockCLI,
  parseCommandLineArgs
} from "./cli.js";
export type {
  CLIConnector,
  ParsedArgs,
  CLIOutput
} from "./cli.js";
