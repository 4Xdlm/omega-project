// OMEGA BRIDGE INDEX v1.1.0

export { AnalyzeResult, AnalyzeResultSchema, AnalysisMeta, EmotionHit, KeywordCount, OmegaEmotion14D, OMEGA_EMOTIONS_14D, isOmegaEmotion, parseAnalyzeResult, safeParseAnalyzeResult } from './types';
export { EmotionVector14D, MyceliumBridgeData, ZERO_VECTOR_14D, buildBridgeData, areBridgeDataEqual, vectorToArray, vectorMagnitude, findDominantFromVector, clamp, deterministicHash } from './text_analyzer_bridge';
export { TextSegment, AnalysisToDNAOptions, DNABuildInput, vectorToIntensityRecord, analyzeResultToSegments, prepareDNABuild, validateDNAInputs } from './analysis_to_dna';
