/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — TRANSLATORS INDEX
 * Version: 0.3.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Input Translator
export {
  InputTranslator,
  createInputTranslator,
  translateInput,
  DEFAULT_INPUT_OPTIONS,
  MAX_LINE_LENGTH,
  DEFAULT_ENCODING
} from "./input.js";
// 2026-05-17 FRONT 1: InputMetadata retire (TS2308 ambiguity avec contracts/io.ts:59 même nom).
// Le InputMetadata canonique reste celui de ./contracts/io.ts. Translators/input.ts::InputMetadata est private au module input.ts.
export type {
  InputTranslationOptions,
  InputTranslationResult,
} from "./input.js";

// Output Translator
export {
  OutputTranslator,
  createOutputTranslator,
  formatOutput,
  OUTPUT_FORMAT_VERSION,
  DEFAULT_OUTPUT_OPTIONS
} from "./output.js";
export type {
  OutputFormat,
  OutputOptions,
  FormattedOutput,
  FormattedError,
  OutputSummary,
  OutputMetadata
} from "./output.js";

// Module Translator
export {
  ModuleTranslator,
  createModuleTranslator,
  getModuleTranslator,
  GENOME_TO_BIO_EMOTION,
  BIO_TO_GENOME_EMOTION
} from "./module.js";
export type { NormalizedFingerprint } from "./module.js";
