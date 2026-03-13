/**
 * OMEGA Phase V — Context Distillation Engine (CDE)
 * Sprint V-PROTO — Public Exports
 * Standard: NASA-Grade L4 / DO-178C
 */

export type {
  HotElement,
  CanonFact,
  DebtEntry,
  ArcState,
  CDEInput,
  SceneBrief,
  StateDelta,
} from './types.js';

export { CDEError } from './types.js';

export {
  distillBrief,
  BRIEF_TOKEN_MAX,
  FIELD_BUDGET_MUST_REMAIN_TRUE,
  FIELD_BUDGET_IN_TENSION,
  FIELD_BUDGET_MUST_MOVE,
  FIELD_BUDGET_MUST_NOT_BREAK,
} from './distiller.js';

export { extractDelta } from './delta-extractor.js';
export type { DeltaContext } from './delta-extractor.js';

// V-PROTO exports
export {
  runCDEScene,
  formatBriefText,
  injectBriefIntoForgeInput,
} from './cde-pipeline.js';
export type { CDESceneResult, CDEPipelineConfig } from './cde-pipeline.js';

export {
  runSceneChain,
  propagateDelta,
  ChainError,
  CHAIN_N_MIN,
  CHAIN_N_MAX,
} from './scene-chain.js';
export type { SceneChainConfig, SceneChainReport } from './scene-chain.js';
