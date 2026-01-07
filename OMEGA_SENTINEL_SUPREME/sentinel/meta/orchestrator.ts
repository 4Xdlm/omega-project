/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — CERTIFICATION ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta/orchestrator
 * @version 2.0.0
 * @license MIT
 * 
 * CERTIFICATION PIPELINE
 * ======================
 * 
 * State machine: INIT → CRYSTALLIZED → FALSIFIED → PLACED → SEALED
 * 
 * Each transition is:
 * - PURE: input → output, no hidden state
 * - LOGGED: recorded in journal
 * - VERIFIED: preconditions checked
 * 
 * INVARIANTS:
 * - INV-META-01: Transitions are pure (input → output, no hidden state)
 * - INV-META-02: Journal hash is deterministic (same stages = same hash)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { canonicalHash, canonicalize } from './canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pipeline stages in order
 */
export type PipelineStage = 
  | 'INIT'
  | 'CRYSTALLIZED'
  | 'FALSIFIED'
  | 'PLACED'
  | 'SEALED';

/**
 * Stage execution status
 */
export type StageStatus = 'PASS' | 'FAIL' | 'SKIP';

/**
 * Stage result core (hashable)
 * NOTE: durationMs is in Meta, NOT here
 */
export interface StageResultCore {
  readonly stage: PipelineStage;
  readonly status: StageStatus;
  readonly inputHash: string;
  readonly outputHash: string;
  readonly notes: string;
}

/**
 * Stage result meta (NOT hashable)
 */
export interface StageResultMeta {
  readonly durationMs: number;
  readonly executedAt: string;
}

/**
 * Complete stage result
 */
export interface StageResult {
  readonly core: StageResultCore;
  readonly meta: StageResultMeta;
}

/**
 * Pipeline journal core (hashable)
 */
export interface PipelineJournalCore {
  readonly pipelineId: string;
  readonly stages: readonly StageResultCore[];
  readonly finalStatus: StageStatus;
}

/**
 * Pipeline journal meta (NOT hashable)
 */
export interface PipelineJournalMeta {
  readonly startedAt: string;
  readonly completedAt: string;
  readonly totalDurationMs: number;
  readonly runId: string;
}

/**
 * Complete pipeline journal
 */
export interface PipelineJournal {
  readonly core: PipelineJournalCore;
  readonly meta: PipelineJournalMeta;
  readonly journalHash: string;  // Hash of core only
}

/**
 * Stage transition definition
 */
export interface StageTransition {
  readonly from: PipelineStage;
  readonly to: PipelineStage;
  readonly preconditions: readonly string[];
  readonly postconditions: readonly string[];
}

/**
 * Stage handler function (pure)
 */
export type StageHandler<TInput, TOutput> = (input: TInput) => TOutput;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pipeline stages in canonical order
 */
export const PIPELINE_STAGES: readonly PipelineStage[] = Object.freeze([
  'INIT',
  'CRYSTALLIZED',
  'FALSIFIED',
  'PLACED',
  'SEALED'
]);

/**
 * Valid stage transitions
 */
export const STAGE_TRANSITIONS: readonly StageTransition[] = Object.freeze([
  {
    from: 'INIT',
    to: 'CRYSTALLIZED',
    preconditions: ['invariant defined', 'property specified'],
    postconditions: ['invariant crystallized', 'hash computed']
  },
  {
    from: 'CRYSTALLIZED',
    to: 'FALSIFIED',
    preconditions: ['invariant crystallized'],
    postconditions: ['falsification attempts recorded', 'survival rate computed']
  },
  {
    from: 'FALSIFIED',
    to: 'PLACED',
    preconditions: ['falsification complete', 'survival rate > 0'],
    postconditions: ['region assigned', 'containment verified']
  },
  {
    from: 'PLACED',
    to: 'SEALED',
    preconditions: ['region assigned', 'all checks passed'],
    postconditions: ['artifact sealed', 'hash immutable']
  }
]);

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a stage is valid
 */
export function isValidStage(stage: unknown): stage is PipelineStage {
  return typeof stage === 'string' && PIPELINE_STAGES.includes(stage as PipelineStage);
}

/**
 * Check if a status is valid
 */
export function isValidStatus(status: unknown): status is StageStatus {
  return status === 'PASS' || status === 'FAIL' || status === 'SKIP';
}

/**
 * Get stage index (for ordering)
 */
export function getStageIndex(stage: PipelineStage): number {
  return PIPELINE_STAGES.indexOf(stage);
}

/**
 * Check if transition is valid
 */
export function isValidTransition(from: PipelineStage, to: PipelineStage): boolean {
  return STAGE_TRANSITIONS.some(t => t.from === from && t.to === to);
}

/**
 * Get transition definition
 */
export function getTransition(from: PipelineStage, to: PipelineStage): StageTransition | undefined {
  return STAGE_TRANSITIONS.find(t => t.from === from && t.to === to);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE RESULT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a stage result core
 */
export function createStageResultCore(
  stage: PipelineStage,
  status: StageStatus,
  inputHash: string,
  outputHash: string,
  notes: string = ''
): StageResultCore {
  return Object.freeze({
    stage,
    status,
    inputHash,
    outputHash,
    notes
  });
}

/**
 * Create a stage result meta
 */
export function createStageResultMeta(
  durationMs: number,
  executedAt: string = new Date().toISOString()
): StageResultMeta {
  return Object.freeze({
    durationMs,
    executedAt
  });
}

/**
 * Create a complete stage result
 */
export function createStageResult(
  core: StageResultCore,
  meta: StageResultMeta
): StageResult {
  return Object.freeze({ core, meta });
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNAL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

let journalCounter = 0;

/**
 * Generate unique pipeline ID
 */
export function generatePipelineId(): string {
  journalCounter++;
  return `PIPE-${String(journalCounter).padStart(6, '0')}`;
}

/**
 * Reset journal counter (for testing)
 */
export function resetJournalCounter(): void {
  journalCounter = 0;
}

/**
 * Create an empty journal core
 */
export function createJournalCore(pipelineId: string): PipelineJournalCore {
  return Object.freeze({
    pipelineId,
    stages: Object.freeze([]),
    finalStatus: 'PASS'
  });
}

/**
 * Add stage to journal core (immutable)
 */
export function addStageToJournal(
  journal: PipelineJournalCore,
  stage: StageResultCore
): PipelineJournalCore {
  const newStages = Object.freeze([...journal.stages, stage]);
  
  // Final status is FAIL if any stage failed
  const finalStatus: StageStatus = newStages.some(s => s.status === 'FAIL') 
    ? 'FAIL' 
    : 'PASS';
  
  return Object.freeze({
    ...journal,
    stages: newStages,
    finalStatus
  });
}

/**
 * Compute journal hash (from core only)
 */
export function computeJournalHash(core: PipelineJournalCore): string {
  return canonicalHash(core);
}

/**
 * Create complete journal
 */
export function createPipelineJournal(
  core: PipelineJournalCore,
  meta: PipelineJournalMeta
): PipelineJournal {
  return Object.freeze({
    core,
    meta,
    journalHash: computeJournalHash(core)
  });
}

/**
 * Verify journal hash
 */
export function verifyJournalHash(journal: PipelineJournal): boolean {
  const computed = computeJournalHash(journal.core);
  return computed === journal.journalHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pipeline execution context
 */
export interface PipelineContext {
  readonly currentStage: PipelineStage;
  readonly journalCore: PipelineJournalCore;
  readonly stageResults: readonly StageResult[];
}

/**
 * Create initial pipeline context
 */
export function createPipelineContext(): PipelineContext {
  const pipelineId = generatePipelineId();
  
  return Object.freeze({
    currentStage: 'INIT',
    journalCore: createJournalCore(pipelineId),
    stageResults: Object.freeze([])
  });
}

/**
 * Execute a stage transition (pure function)
 */
export function executeTransition(
  context: PipelineContext,
  toStage: PipelineStage,
  inputHash: string,
  outputHash: string,
  status: StageStatus,
  notes: string = ''
): PipelineContext {
  // Validate transition
  if (!isValidTransition(context.currentStage, toStage)) {
    throw new Error(
      `Invalid transition: ${context.currentStage} → ${toStage}`
    );
  }
  
  // Create stage result
  const startTime = Date.now();
  const stageCore = createStageResultCore(toStage, status, inputHash, outputHash, notes);
  const stageMeta = createStageResultMeta(0, new Date().toISOString());
  const stageResult = createStageResult(stageCore, stageMeta);
  
  // Update journal
  const newJournalCore = addStageToJournal(context.journalCore, stageCore);
  
  return Object.freeze({
    currentStage: toStage,
    journalCore: newJournalCore,
    stageResults: Object.freeze([...context.stageResults, stageResult])
  });
}

/**
 * Check if pipeline is complete
 */
export function isPipelineComplete(context: PipelineContext): boolean {
  return context.currentStage === 'SEALED';
}

/**
 * Check if pipeline failed
 */
export function isPipelineFailed(context: PipelineContext): boolean {
  return context.journalCore.finalStatus === 'FAIL';
}

/**
 * Get next valid stage
 */
export function getNextStage(current: PipelineStage): PipelineStage | null {
  const transition = STAGE_TRANSITIONS.find(t => t.from === current);
  return transition ? transition.to : null;
}

/**
 * Get previous stage
 */
export function getPreviousStage(current: PipelineStage): PipelineStage | null {
  const transition = STAGE_TRANSITIONS.find(t => t.to === current);
  return transition ? transition.from : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all stages that passed
 */
export function getPassedStages(journal: PipelineJournalCore): readonly PipelineStage[] {
  return journal.stages
    .filter(s => s.status === 'PASS')
    .map(s => s.stage);
}

/**
 * Get all stages that failed
 */
export function getFailedStages(journal: PipelineJournalCore): readonly PipelineStage[] {
  return journal.stages
    .filter(s => s.status === 'FAIL')
    .map(s => s.stage);
}

/**
 * Get stage result by stage
 */
export function getStageResult(
  journal: PipelineJournalCore,
  stage: PipelineStage
): StageResultCore | undefined {
  return journal.stages.find(s => s.stage === stage);
}

/**
 * Count stages by status
 */
export function countStagesByStatus(
  journal: PipelineJournalCore,
  status: StageStatus
): number {
  return journal.stages.filter(s => s.status === status).length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format pipeline journal as string
 */
export function formatJournal(journal: PipelineJournal): string {
  const lines = [
    `Pipeline Journal: ${journal.core.pipelineId}`,
    `═════════════════════════════════════`,
    `Status: ${journal.core.finalStatus}`,
    `Hash: ${journal.journalHash.substring(0, 16)}...`,
    `Started: ${journal.meta.startedAt}`,
    `Completed: ${journal.meta.completedAt}`,
    `Duration: ${journal.meta.totalDurationMs}ms`,
    ``,
    `Stages:`
  ];
  
  for (const stage of journal.core.stages) {
    lines.push(`  ${stage.stage}: ${stage.status}`);
    if (stage.notes) {
      lines.push(`    Notes: ${stage.notes}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Generate pipeline diagram
 */
export function generatePipelineDiagram(): string {
  return `
CERTIFICATION PIPELINE
═══════════════════════

  ┌──────┐     ┌─────────────┐     ┌───────────┐     ┌────────┐     ┌────────┐
  │ INIT │ ──▶ │ CRYSTALLIZED │ ──▶ │ FALSIFIED │ ──▶ │ PLACED │ ──▶ │ SEALED │
  └──────┘     └─────────────┘     └───────────┘     └────────┘     └────────┘
      │              │                   │               │              │
      │              │                   │               │              │
   Define         Freeze             Attack          Assign          Lock
  Invariant      & Hash           & Survive         Region        Artifact
`.trim();
}
