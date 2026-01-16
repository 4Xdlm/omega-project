/**
 * Oracle Package Exports
 * @module @omega/oracle
 * @description OMEGA Oracle - AI-Powered Emotional Analysis Engine
 */

export {
  type OracleConfig,
  type OracleRequest,
  type OracleResponse,
  type OracleStatus,
  type EmotionalInsight,
  type NarrativeAnalysis,
  type OracleErrorType,
  DEFAULT_CONFIG,
  OracleError,
} from './types';

export { Oracle, createOracle } from './oracle';
