/**
 * OMEGA V4.4 — Phase 1: Zod Validation Schemas
 *
 * REFERENCE: VISION_FINALE_SCELLEE v1.0
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Runtime validation with Zod schemas.
 * Bounds are injected at runtime - schemas use dynamic refinements.
 */

import { z } from 'zod';
import { EMOTION_IDS } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME BOUNDS (injected values for validation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default bounds - these are the standard V4.4 values
 * Injected at runtime, not hardcoded in contract layer
 */
export interface ValidationBounds {
  X: { min: number; max: number };
  Y: { min: number; max: number };
  Z: { min: number; max: number };
  M: { min: number; max: number; exclusiveMin: boolean };
  kappa: { min: number; max: number };
  mu: { min: number; max: number };
}

/**
 * Create schema factory that uses injected bounds
 */
export function createSchemas(bounds: ValidationBounds) {
  // ═══════════════════════════════════════════════════════════════════════
  // AXIS SCHEMAS
  // ═══════════════════════════════════════════════════════════════════════

  const AxisXSchema = z.number()
    .min(bounds.X.min, `X must be >= ${bounds.X.min}`)
    .max(bounds.X.max, `X must be <= ${bounds.X.max}`);

  const AxisYSchema = z.number()
    .min(bounds.Y.min, `Y must be >= ${bounds.Y.min}`)
    .max(bounds.Y.max, `Y must be <= ${bounds.Y.max}`);

  const AxisZSchema = z.number()
    .min(bounds.Z.min, `Z must be >= ${bounds.Z.min}`)
    .max(bounds.Z.max, `Z must be <= ${bounds.Z.max}`);

  // ═══════════════════════════════════════════════════════════════════════
  // POSITION SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const EmotionPositionSchema = z.object({
    x: AxisXSchema,
    y: AxisYSchema,
    z: AxisZSchema,
  }).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // EMOTION ID SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const EmotionIdSchema = z.enum(EMOTION_IDS);

  // ═══════════════════════════════════════════════════════════════════════
  // PARAMS CANON SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const MSchema = bounds.M.exclusiveMin
    ? z.number().gt(bounds.M.min).lte(bounds.M.max)
    : z.number().gte(bounds.M.min).lte(bounds.M.max);

  const EmotionParamsCanonSchema = z.object({
    M: MSchema,
    lambda: z.number().positive(),
    kappa: z.number().min(bounds.kappa.min).max(bounds.kappa.max),
    E0: z.number(),
    zeta: z.number().nonnegative(),
    mu: z.number().min(bounds.mu.min).max(bounds.mu.max),
  }).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // PARAMS RUNTIME SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const EmotionParamsRuntimeSchema = z.object({
    C: z.number().positive(),
    omega: z.number().nonnegative(),
    phi: z.number(),
  }).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // EMOTION STATE SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const EmotionStateSchema = z.object({
    id: EmotionIdSchema,
    position: EmotionPositionSchema,
    paramsCanon: EmotionParamsCanonSchema,
    paramsRuntime: EmotionParamsRuntimeSchema,
    timestamp: z.number().nonnegative(),
  }).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // EMOTION VECTOR MAP SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const emotionVectorEntries = Object.fromEntries(
    EMOTION_IDS.map(id => [id, EmotionStateSchema])
  ) as Record<typeof EMOTION_IDS[number], typeof EmotionStateSchema>;

  const EmotionVectorMapSchema = z.object(emotionVectorEntries).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // RAW AXES SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const RawAxesSchema = z.object({
    X: z.number(),
    Y: z.number(),
    Z: z.number(),
  }).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // TRAJECTORY SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const TrajectoryPointSchema = z.object({
    t: z.number().nonnegative(),
    position: EmotionPositionSchema,
    intensity: z.number(),
  }).strict();

  const EmotionTrajectorySchema = z.object({
    emotionId: EmotionIdSchema,
    points: z.array(TrajectoryPointSchema),
    startTime: z.number().nonnegative(),
    endTime: z.number().nonnegative(),
  }).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // CORE OUTPUT SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const ValidationStatusSchema = z.enum(['VALID', 'INVALID']);

  const CoreOutputSchema = z.object({
    emotionalState: EmotionVectorMapSchema,
    axes: RawAxesSchema,
    timestamp: z.number().nonnegative(),
    configHash: z.string().min(1),
    validationStatus: ValidationStatusSchema,
  }).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // RUNTIME CONFIG SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const RuntimeConfigSchema = z.object({
    defaultC: z.number().positive(),
    defaultOmega: z.number().nonnegative(),
    defaultPhi: z.number(),
  }).strict();

  // ═══════════════════════════════════════════════════════════════════════
  // INJECTED CONFIG SCHEMA
  // ═══════════════════════════════════════════════════════════════════════

  const BoundsSchema = z.object({
    X: z.object({ min: z.number(), max: z.number() }).strict(),
    Y: z.object({ min: z.number(), max: z.number() }).strict(),
    Z: z.object({ min: z.number(), max: z.number() }).strict(),
  }).strict();

  const InjectedConfigSchema = z.object({
    configHash: z.string().min(1),
    bounds: BoundsSchema,
    runtimeDefaults: RuntimeConfigSchema,
    timestamp: z.number().nonnegative(),
  }).strict();

  return {
    AxisXSchema,
    AxisYSchema,
    AxisZSchema,
    EmotionPositionSchema,
    EmotionIdSchema,
    EmotionParamsCanonSchema,
    EmotionParamsRuntimeSchema,
    EmotionStateSchema,
    EmotionVectorMapSchema,
    RawAxesSchema,
    TrajectoryPointSchema,
    EmotionTrajectorySchema,
    CoreOutputSchema,
    RuntimeConfigSchema,
    InjectedConfigSchema,
    ValidationStatusSchema,
  };
}

/**
 * Schema types for TypeScript inference
 */
export type SchemaCollection = ReturnType<typeof createSchemas>;
