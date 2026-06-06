/**
 * OMEGA Book-Factory — book-canon-adapter  (P0.6b — epistemic hardening)
 *
 * Thin Anti-Corruption Layer over the PROVEN epistemic core:
 *   - canon-kernel : dual-rail (truth | interpretation) + PROMOTE + deterministic ids
 *   - truth-gate   : the douanier (validates every transaction)
 *
 * P0.6b corrects the 4 model-level weaknesses found in adversarial review of the model:
 *   #1  knows = JUSTIFIED true belief (Gettier-safe): believing the truth by luck is NOT knowing.
 *   #2  revelation REQUIRES evidence (no knowledge without proof).
 *   #3  readerState is SEPARATE from truthState (suspense): fed only by READER_REVEAL events.
 *   #4  promotion REFERENCES its source interpretation tx (a PROMOTE is not a disguised SET truth).
 *
 * Design laws enforced:
 *   L1 Causality = TRUTH rail only.          truthState() folds the truth rail ONLY.
 *   L2 No truth without proof.               PROMOTE requires an EvidenceRef (gate-enforced).
 *   L3 No truth by repetition.               beliefs live on interpretation; a rumor never reaches truthState.
 *   L4 No knowledge without justification.    knows() requires a REVELATION-with-evidence.
 *   L5 The reader is not omniscient.          readerState() ≠ truthState().
 *   L6 Every promotion references a source.   promote() rejects a missing/non-interpretation source.
 *
 * ZERO mutation of canon-kernel / truth-gate. Everything is additive and read-only wrt consumed packages.
 */

import {
  createCanonTx,
  createCanonOp,
  createDeterministicId,
  GENESIS_HASH,
  TEST_CALIBRATION,
  type CanonTx,
  type EntityId,
  type TxId,
  type OpId,
  type RailType,
  type OpType,
  type EvidenceRef,
} from '@omega/canon-kernel';
import {
  createTruthGate,
  PolicyManager,
  createAllValidators,
  ALL_VALIDATOR_IDS,
  type TruthGateConfig,
} from '@omega/truth-gate';

const SEED = 'book-factory-p0.6b';
const NAMESPACE = 'epistemic-probe';
const READER = '__reader__';

export type EpistemicEventType =
  | 'WORLD_FACT'
  | 'BELIEF'
  | 'REVELATION'
  | 'ASSERTION'
  | 'READER_REVEAL'
  | 'PROMOTION';

export type Verdict = 'ALLOW' | 'DENY' | 'DEFER';

export interface SubmitResult {
  readonly allowed: boolean;
  readonly verdict: Verdict;
  /** Set when allowed — the canonical transaction id (used to reference a belief in promote()). */
  readonly tx_id?: TxId;
}

interface LogEntry {
  readonly rail: RailType;
  readonly type: EpistemicEventType;
  readonly actor: string;
  readonly key: string; // `${subject}.${predicate}`
  readonly value: string;
  readonly justified: boolean; // true only for REVELATION-with-evidence (the basis of `knows`)
  readonly source?: string; // who the actor heard it from (rumor provenance)
  readonly source_tx?: string; // for PROMOTION: the interpretation tx it elevates
  readonly tx_id: TxId;
}

export class BookCanonAdapter {
  private readonly gate: ReturnType<typeof createTruthGate>;
  private readonly log: LogEntry[] = [];
  private counter = 0;

  constructor() {
    const policy = new PolicyManager().createPolicy({
      name: 'BOOK-FACTORY-P06B',
      version: '1.0.0',
      validators_enabled: ALL_VALIDATOR_IDS,
      rules: { max_drift_score: 0.3, max_toxicity_score: 0.1 },
    });
    const config: TruthGateConfig = {
      default_policy: policy,
      calibration: TEST_CALIBRATION,
      strict_mode: true,
      enable_proof_carrying: false,
    };
    this.gate = createTruthGate(config);
    for (const validator of createAllValidators()) {
      this.gate.registerValidator(validator);
    }
  }

  private nextTxId(): TxId {
    return createDeterministicId('tx', SEED, NAMESPACE, { name: `tx-${++this.counter}` });
  }

  private nextOpId(): OpId {
    return createDeterministicId('op', SEED, NAMESPACE, { name: `op-${this.counter}` });
  }

  private entityId(subject: string): EntityId {
    return createDeterministicId('ent', SEED, NAMESPACE, { name: subject });
  }

  private submit(
    rail: RailType,
    opType: OpType,
    subject: string,
    predicate: string,
    value: string,
    actor: string,
    reason: string,
    evidence: readonly EvidenceRef[],
    type: EpistemicEventType,
    justified: boolean,
    source?: string,
    sourceTx?: string,
  ): SubmitResult {
    const op = createCanonOp(this.nextOpId(), opType, this.entityId(subject), {
      field_path: [predicate],
      value,
      evidence_refs: evidence,
    });
    const tx: CanonTx = createCanonTx(this.nextTxId(), [op], actor, reason, GENESIS_HASH, rail);
    const verdict = this.gate.validate(tx).final_verdict as Verdict;
    const allowed = verdict === 'ALLOW';
    if (allowed) {
      this.log.push({
        rail, type, actor, key: `${subject}.${predicate}`, value, justified, source,
        source_tx: sourceTx, tx_id: tx.tx_id,
      });
      return { allowed, verdict, tx_id: tx.tx_id };
    }
    return { allowed, verdict };
  }

  // ───────────────────────── writes ─────────────────────────

  /** Objective world fact → TRUTH rail. The narrator is the oracle of reality. */
  recordTruth(subject: string, predicate: string, value: string): SubmitResult {
    return this.submit('truth', 'SET', subject, predicate, value, 'narrator', 'world fact', [], 'WORLD_FACT', true);
  }

  /** A character's UNJUSTIFIED belief (guess / hearsay) → INTERPRETATION rail. */
  recordBelief(actor: string, subject: string, predicate: string, value: string, source?: string): SubmitResult {
    return this.submit(
      'interpretation', 'SET', subject, predicate, value, actor,
      source ? `belief inherited from ${source}` : 'belief', [], 'BELIEF', false, source,
    );
  }

  /**
   * A character gains JUSTIFIED knowledge by seeing PROOF.
   * #2 — evidence is REQUIRED. An evidence-less "revelation" is rejected (it is not knowledge).
   */
  recordRevelation(
    actor: string, subject: string, predicate: string, value: string, evidence: readonly EvidenceRef[],
  ): SubmitResult {
    if (evidence.length === 0) {
      return { allowed: false, verdict: 'DENY' }; // not a revelation without proof
    }
    return this.submit('interpretation', 'SET', subject, predicate, value, actor, 'revelation (proof seen)', evidence, 'REVELATION', true);
  }

  /** A public statement by a character (may differ from belief → lie/bluff). Does not change belief. */
  recordAssertion(actor: string, subject: string, predicate: string, value: string): SubmitResult {
    return this.submit('interpretation', 'SET', subject, predicate, value, actor, 'public assertion', [], 'ASSERTION', false);
  }

  /** #3 — what the NARRATION discloses to the reader. Feeds ReaderState ONLY (never truthState). */
  readerReveal(subject: string, predicate: string, value: string): SubmitResult {
    return this.submit('interpretation', 'SET', subject, predicate, value, READER, 'revealed to reader', [], 'READER_REVEAL', true);
  }

  /** Raw PROMOTE straight to the gate (used to exhibit the gate-level no-evidence DENY). */
  rawPromote(subject: string, predicate: string, value: string, evidence: readonly EvidenceRef[]): SubmitResult {
    return this.submit('truth', 'PROMOTE', subject, predicate, value, 'narrator', 'raw promote', evidence, 'PROMOTION', true);
  }

  /**
   * #4 — Promote a SPECIFIC interpretation (belief/revelation) to truth.
   * Rejects if the source tx is missing or not on the interpretation rail, or if evidence is empty.
   */
  promote(
    sourceInterpretationTxId: string, subject: string, predicate: string, value: string, evidence: readonly EvidenceRef[],
  ): SubmitResult {
    const source = this.log.find((e) => e.tx_id === sourceInterpretationTxId && e.rail === 'interpretation');
    if (source === undefined) return { allowed: false, verdict: 'DENY' }; // no source belief → reject
    if (evidence.length === 0) return { allowed: false, verdict: 'DENY' }; // no proof → reject
    return this.submit(
      'truth', 'PROMOTE', subject, predicate, value, 'narrator',
      `promote of ${sourceInterpretationTxId}`, evidence, 'PROMOTION', true, undefined, sourceInterpretationTxId,
    );
  }

  // ───────────────────────── projections (pure folds of the ALLOWED log) ─────────────────────────

  /** Reality. Folds the TRUTH rail ONLY — beliefs/rumors can never appear here (L1, L3). */
  truthState(): ReadonlyMap<string, string> {
    const m = new Map<string, string>();
    for (const e of this.log) if (e.rail === 'truth') m.set(e.key, e.value);
    return m;
  }

  private latestBelief(actor: string, key: string): LogEntry | undefined {
    for (let i = this.log.length - 1; i >= 0; i--) {
      const e = this.log[i];
      if (e !== undefined && e.actor === actor && e.key === key && (e.type === 'BELIEF' || e.type === 'REVELATION')) {
        return e;
      }
    }
    return undefined;
  }

  /** What a given character holds true (latest belief/revelation per claim). */
  beliefState(actor: string): ReadonlyMap<string, string> {
    const m = new Map<string, string>();
    for (const e of this.log) {
      if (e.actor === actor && (e.type === 'BELIEF' || e.type === 'REVELATION')) m.set(e.key, e.value);
    }
    return m;
  }

  /** #1 — a belief is justified iff its latest basis is a REVELATION-with-evidence. */
  justified(actor: string, subject: string, predicate: string): boolean {
    const e = this.latestBelief(actor, `${subject}.${predicate}`);
    return e !== undefined && e.justified;
  }

  /** #1 — knowledge = JUSTIFIED true belief. Believing the truth by luck is NOT knowing. */
  knows(actor: string, subject: string, predicate: string): boolean {
    const key = `${subject}.${predicate}`;
    const truth = this.truthState().get(key);
    const belief = this.beliefState(actor).get(key);
    return truth !== undefined && belief === truth && this.justified(actor, subject, predicate);
  }

  /** #3 — what the reader has been told (fed by READER_REVEAL only; independent of truth). */
  readerState(): ReadonlyMap<string, string> {
    const m = new Map<string, string>();
    for (const e of this.log) if (e.type === 'READER_REVEAL') m.set(e.key, e.value);
    return m;
  }

  readerKnows(subject: string, predicate: string): boolean {
    return this.readerState().has(`${subject}.${predicate}`);
  }

  /** Distinct characters carrying a given claim value (rumor weight) — NEVER affects truth. */
  rumorCarriers(subject: string, predicate: string, value: string): number {
    const key = `${subject}.${predicate}`;
    const who = new Set<string>();
    for (const e of this.log) {
      if (
        e.actor !== READER && e.rail === 'interpretation' &&
        (e.type === 'BELIEF' || e.type === 'ASSERTION' || e.type === 'REVELATION') &&
        e.key === key && e.value === value
      ) {
        who.add(e.actor);
      }
    }
    return who.size;
  }

  private latestAssertion(actor: string, key: string): string | undefined {
    for (let i = this.log.length - 1; i >= 0; i--) {
      const e = this.log[i];
      if (e !== undefined && e.type === 'ASSERTION' && e.actor === actor && e.key === key) return e.value;
    }
    return undefined;
  }

  /** Lie = asserts A, believes B≠A, AND knows the truth (his justified belief equals reality). */
  isLie(actor: string, subject: string, predicate: string): boolean {
    const key = `${subject}.${predicate}`;
    const asserted = this.latestAssertion(actor, key);
    if (asserted === undefined) return false;
    const believed = this.beliefState(actor).get(key);
    return asserted !== believed && this.knows(actor, subject, predicate);
  }

  /** Bluff = asserts A against his own belief B≠A, but WITHOUT knowing the truth. */
  isBluff(actor: string, subject: string, predicate: string): boolean {
    const key = `${subject}.${predicate}`;
    const asserted = this.latestAssertion(actor, key);
    if (asserted === undefined) return false;
    const believed = this.beliefState(actor).get(key);
    return asserted !== believed && !this.knows(actor, subject, predicate);
  }

  /** Sincere mistake = asserts his own belief A==B, but reality is ¬B. */
  isMistake(actor: string, subject: string, predicate: string): boolean {
    const key = `${subject}.${predicate}`;
    const asserted = this.latestAssertion(actor, key);
    if (asserted === undefined) return false;
    const believed = this.beliefState(actor).get(key);
    const truth = this.truthState().get(key);
    return asserted === believed && truth !== undefined && believed !== truth;
  }

  /** Dramatic irony = the reader has been told the truth while some character does not know it. */
  dramaticIrony(actor: string, subject: string, predicate: string): boolean {
    const key = `${subject}.${predicate}`;
    const truth = this.truthState().get(key);
    const readerVal = this.readerState().get(key);
    return truth !== undefined && readerVal === truth && !this.knows(actor, subject, predicate);
  }
}
