// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — PROOF CRYSTALLIZER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION: LE MOTEUR DE CRISTALLISATION
//
// Le Crystallizer orchestre:
//   1. L'exécution du scénario
//   2. La capture des événements dans le Merkle tree
//   3. La construction de la matrice de causalité
//   4. Les runs de déterminisme
//   5. Le profiling statistique
//   6. La validation des invariants
//   7. La cristallisation finale
//
// Le résultat est un ProofCrystal — une preuve cryptographique portable.
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusEnvelope, NexusResult, Clock } from '../types.js';
import { ok, fail, isOk, isErr } from '../types.js';
import type { Chronicle, ChronicleRecord } from '../orchestrator/chronicle.js';
import { Orchestrator, createOrchestrator } from '../orchestrator/orchestrator.js';
import { HandlerRegistry } from '../orchestrator/registry.js';
import { InMemoryChronicle } from '../orchestrator/chronicle.js';
import { ReplayGuard, InMemoryReplayStore } from '../orchestrator/replay_guard.js';
import {
  ProofCrystal,
  MerkleTreeBuilder,
  CausalityMatrixBuilder,
  StatisticalProfiler,
  DeterminismProver,
  sha256,
  hashObject,
  MerkleNode,
} from './crystal.js';
import { canonicalStringify } from '../canonical_json.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration du Crystallizer
 */
export interface CrystallizerConfig {
  /** Clock injectable */
  clock: Clock;
  /** Registry de handlers */
  registry: HandlerRegistry;
  /** Nombre de runs pour prouver le déterminisme */
  determinismRuns?: number;
  /** Nombre de runs pour le profiling de performance */
  performanceRuns?: number;
  /** Tags par défaut */
  defaultTags?: string[];
}

/**
 * Scénario à cristalliser
 */
export interface CrystalScenario {
  /** Nom unique du scénario */
  name: string;
  /** Description */
  description: string;
  /** Tags */
  tags?: string[];
  /** Générateur d'envelopes (appelé à chaque run) */
  envelopeGenerator: (runIndex: number) => NexusEnvelope;
  /** Invariants à vérifier */
  invariants?: Array<{
    id: string;
    name: string;
    check: (result: NexusResult<unknown>, chronicle: ChronicleRecord[]) => boolean;
  }>;
  /** Validation custom du résultat */
  validateResult?: (result: NexusResult<unknown>) => boolean;
}

/**
 * Options de cristallisation
 */
export interface CrystallizeOptions {
  /** Override du nombre de runs de déterminisme */
  determinismRuns?: number;
  /** Override du nombre de runs de performance */
  performanceRuns?: number;
  /** Activer le mode verbose (pour debug) */
  verbose?: boolean;
}

/**
 * Résultat intermédiaire d'un run
 */
interface RunResult {
  inputHash: string;
  outputHash: string;
  traceHash: string;
  chronicle: ChronicleRecord[];
  result: NexusResult<unknown>;
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF CRYSTALLIZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Le Crystallizer — Moteur de cristallisation des preuves E2E
 */
export class ProofCrystallizer {
  private readonly clock: Clock;
  private readonly registry: HandlerRegistry;
  private readonly determinismRuns: number;
  private readonly performanceRuns: number;
  private readonly defaultTags: string[];

  private readonly profiler = new StatisticalProfiler();
  private readonly causalityBuilder = new CausalityMatrixBuilder();
  private readonly determinismProver = new DeterminismProver();

  private crystalCounter = 0;

  constructor(config: CrystallizerConfig) {
    this.clock = config.clock;
    this.registry = config.registry;
    this.determinismRuns = config.determinismRuns ?? 3;
    this.performanceRuns = config.performanceRuns ?? 100;
    this.defaultTags = config.defaultTags ?? [];
  }

  /**
   * Cristallise un scénario en ProofCrystal
   */
  async crystallize(
    scenario: CrystalScenario,
    options?: CrystallizeOptions
  ): Promise<ProofCrystal> {
    const startTime = this.clock.nowMs();
    const crystalId = `crystal-${++this.crystalCounter}-${Date.now().toString(36)}`;

    const detRuns = options?.determinismRuns ?? this.determinismRuns;
    const perfRuns = options?.performanceRuns ?? this.performanceRuns;

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1: RUNS DE DÉTERMINISME
    // ═══════════════════════════════════════════════════════════════════════════
    const determinismResults: RunResult[] = [];

    for (let i = 0; i < detRuns; i++) {
      const result = await this.executeRun(scenario, i, true);
      determinismResults.push(result);
    }

    // Vérifier le déterminisme
    const determinismFingerprint = this.determinismProver.prove(
      determinismResults.map(r => ({
        inputHash: r.inputHash,
        outputHash: r.outputHash,
        traceHash: r.traceHash,
      }))
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2: RUNS DE PERFORMANCE
    // ═══════════════════════════════════════════════════════════════════════════
    const performanceTimes: number[] = [];

    for (let i = 0; i < perfRuns; i++) {
      const result = await this.executeRun(scenario, detRuns + i, false);
      performanceTimes.push(result.durationMs);
    }

    const performanceProfile = this.profiler.profile(performanceTimes);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 3: CONSTRUCTION DU MERKLE TREE
    // ═══════════════════════════════════════════════════════════════════════════
    const referenceRun = determinismResults[0];
    const merkleBuilder = new MerkleTreeBuilder(this.clock);

    // Ajouter chaque événement du chronicle au Merkle tree
    for (const record of referenceRun.chronicle) {
      merkleBuilder.append(record.event_type, record);
    }

    const merkleNodes = merkleBuilder.getNodes();
    const merkleRoot = merkleBuilder.computeRoot();

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 4: VÉRIFICATION DE CAUSALITÉ
    // ═══════════════════════════════════════════════════════════════════════════
    const causalityMatrix = this.causalityBuilder.buildMatrix(merkleNodes);
    const causalityVerification = this.causalityBuilder.verify(merkleNodes, causalityMatrix);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 5: VÉRIFICATION DES INVARIANTS
    // ═══════════════════════════════════════════════════════════════════════════
    const invariants = this.verifyInvariants(
      scenario,
      referenceRun.result,
      referenceRun.chronicle
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 6: VERDICT
    // ═══════════════════════════════════════════════════════════════════════════
    const allInvariantsPass = invariants.every(inv => inv.status === 'PASS');
    const causalityValid = causalityVerification.valid;
    const determinismProven = determinismFingerprint.proven;
    const resultOk = isOk(referenceRun.result);

    let verdict: 'CRYSTALLIZED' | 'CONTAMINATED' = 'CRYSTALLIZED';
    let contaminationReason: string | undefined;

    if (!allInvariantsPass) {
      verdict = 'CONTAMINATED';
      contaminationReason = 'Invariant(s) failed';
    } else if (!causalityValid) {
      verdict = 'CONTAMINATED';
      contaminationReason = `Causality violations: ${causalityVerification.violations.length}`;
    } else if (!determinismProven) {
      verdict = 'CONTAMINATED';
      contaminationReason = 'Non-deterministic execution detected';
    } else if (!resultOk) {
      verdict = 'CONTAMINATED';
      contaminationReason = 'Execution failed';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 7: CRISTALLISATION FINALE
    // ═══════════════════════════════════════════════════════════════════════════
    const crystalWithoutHash: Omit<ProofCrystal, 'crystalHash'> = {
      crystalId,
      protocolVersion: '1.0.0',
      crystallizedAt: this.clock.nowMs(),
      scenarioName: scenario.name,
      description: scenario.description,
      tags: [...this.defaultTags, ...(scenario.tags ?? [])],
      merkleNodes,
      merkleRoot,
      causalityMatrix,
      causalityVerification,
      determinismFingerprint,
      performanceProfile,
      invariants,
      verdict,
      contaminationReason,
    };

    // Hash final du cristal
    const crystalHash = hashObject(crystalWithoutHash);

    const crystal: ProofCrystal = {
      ...crystalWithoutHash,
      crystalHash,
    };

    return crystal;
  }

  /**
   * Exécute un run unique
   */
  private async executeRun(
    scenario: CrystalScenario,
    runIndex: number,
    captureChronicle: boolean
  ): Promise<RunResult> {
    // Créer un orchestrator frais pour chaque run
    const chronicle = new InMemoryChronicle();
    const replayStore = new InMemoryReplayStore();
    const replayGuard = new ReplayGuard(replayStore, { defaultStrategy: 'reject' });

    const orchestrator = createOrchestrator({
      clock: this.clock,
      registry: this.registry,
      chronicle,
      replayGuard,
    });

    // Générer l'envelope
    const envelope = scenario.envelopeGenerator(runIndex);
    const inputHash = hashObject(envelope);

    // Exécuter
    const startTime = performance.now();
    const dispatchResult = await orchestrator.dispatch(envelope);
    const endTime = performance.now();

    // Capturer les résultats
    const chronicleRecords = captureChronicle ? chronicle.snapshot() : [];
    const outputHash = hashObject(dispatchResult.result);
    const traceHash = hashObject(chronicleRecords);

    return {
      inputHash,
      outputHash,
      traceHash,
      chronicle: chronicleRecords,
      result: dispatchResult.result,
      durationMs: endTime - startTime,
    };
  }

  /**
   * Vérifie les invariants
   */
  private verifyInvariants(
    scenario: CrystalScenario,
    result: NexusResult<unknown>,
    chronicle: ChronicleRecord[]
  ): ProofCrystal['invariants'] {
    const invariants: ProofCrystal['invariants'] = [];

    // Invariants par défaut
    const defaultInvariants: Array<{
      id: string;
      name: string;
      check: (result: NexusResult<unknown>, chronicle: ChronicleRecord[]) => boolean;
    }> = [
      {
        id: 'INV-E2E-01',
        name: 'Chronicle has start event',
        check: (_, chr) => chr.some(r => r.event_type === 'DISPATCH_RECEIVED'),
      },
      {
        id: 'INV-E2E-02',
        name: 'Chronicle has terminal event',
        check: (_, chr) => chr.some(r => 
          r.event_type === 'DISPATCH_COMPLETE' ||
          r.event_type === 'VALIDATION_FAILED' ||
          r.event_type === 'POLICY_REJECTED' ||
          r.event_type === 'REPLAY_REJECTED'
        ),
      },
      {
        id: 'INV-E2E-03',
        name: 'Result is typed (ok or error)',
        check: (res) => res !== null && typeof res === 'object' && 'ok' in res,
      },
    ];

    // Vérifier les invariants par défaut
    for (const inv of defaultInvariants) {
      try {
        const pass = inv.check(result, chronicle);
        invariants.push({
          id: inv.id,
          name: inv.name,
          status: pass ? 'PASS' : 'FAIL',
          evidence: pass ? 'Check passed' : 'Check failed',
        });
      } catch (e) {
        invariants.push({
          id: inv.id,
          name: inv.name,
          status: 'FAIL',
          evidence: `Exception: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    // Vérifier les invariants custom du scénario
    if (scenario.invariants) {
      for (const inv of scenario.invariants) {
        try {
          const pass = inv.check(result, chronicle);
          invariants.push({
            id: inv.id,
            name: inv.name,
            status: pass ? 'PASS' : 'FAIL',
            evidence: pass ? 'Check passed' : 'Check failed',
          });
        } catch (e) {
          invariants.push({
            id: inv.id,
            name: inv.name,
            status: 'FAIL',
            evidence: `Exception: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
    }

    // Invariant de validation custom
    if (scenario.validateResult) {
      try {
        const pass = scenario.validateResult(result);
        invariants.push({
          id: 'INV-CUSTOM-RESULT',
          name: 'Custom result validation',
          status: pass ? 'PASS' : 'FAIL',
          evidence: pass ? 'Validation passed' : 'Validation failed',
        });
      } catch (e) {
        invariants.push({
          id: 'INV-CUSTOM-RESULT',
          name: 'Custom result validation',
          status: 'FAIL',
          evidence: `Exception: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    return invariants;
  }

  /**
   * Vérifie un cristal (vérification offline)
   */
  static verifyCrystal(crystal: ProofCrystal): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 1. Vérifier le hash du cristal
    const { crystalHash, ...rest } = crystal;
    const recomputedHash = hashObject(rest);
    if (recomputedHash !== crystalHash) {
      errors.push(`Crystal hash mismatch: expected ${crystalHash}, got ${recomputedHash}`);
    }

    // 2. Vérifier le Merkle root
    const allHashes = crystal.merkleNodes.map(n => n.hash).join('');
    const expectedRoot = sha256(allHashes);
    if (expectedRoot !== crystal.merkleRoot) {
      errors.push(`Merkle root mismatch: expected ${crystal.merkleRoot}, got ${expectedRoot}`);
    }

    // 3. Vérifier la chaîne de hashes des nœuds
    for (let i = 1; i < crystal.merkleNodes.length; i++) {
      const node = crystal.merkleNodes[i];
      const expectedParent = crystal.merkleNodes[i - 1].hash;
      if (node.parentHash !== expectedParent) {
        errors.push(`Node ${i} parent hash mismatch`);
      }
    }

    // 4. Vérifier la causalité
    if (!crystal.causalityVerification.valid) {
      errors.push(`Causality violations: ${crystal.causalityVerification.violations.length}`);
    }

    // 5. Vérifier le déterminisme
    if (!crystal.determinismFingerprint.proven) {
      errors.push('Determinism not proven');
    }

    // 6. Vérifier les invariants
    const failedInvariants = crystal.invariants.filter(inv => inv.status === 'FAIL');
    if (failedInvariants.length > 0) {
      errors.push(`Failed invariants: ${failedInvariants.map(i => i.id).join(', ')}`);
    }

    return {
      valid: errors.length === 0 && crystal.verdict === 'CRYSTALLIZED',
      errors,
    };
  }

  /**
   * Formate un cristal pour affichage humain
   */
  static formatCrystal(crystal: ProofCrystal): string {
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════════════════════════════╗');
    lines.push(`║  PROOF CRYSTAL — ${crystal.scenarioName.padEnd(55)}║`);
    lines.push('╠═══════════════════════════════════════════════════════════════════════════════╣');
    lines.push(`║  ID:           ${crystal.crystalId.padEnd(55)}║`);
    lines.push(`║  Protocol:     ${crystal.protocolVersion.padEnd(55)}║`);
    lines.push(`║  Verdict:      ${(crystal.verdict === 'CRYSTALLIZED' ? '✅ CRYSTALLIZED' : '❌ CONTAMINATED').padEnd(55)}║`);
    if (crystal.contaminationReason) {
      lines.push(`║  Reason:       ${crystal.contaminationReason.padEnd(55)}║`);
    }
    lines.push('╠═══════════════════════════════════════════════════════════════════════════════╣');
    lines.push(`║  Merkle Root:  ${crystal.merkleRoot.substring(0, 40).padEnd(55)}║`);
    lines.push(`║  Crystal Hash: ${crystal.crystalHash.substring(0, 40).padEnd(55)}║`);
    lines.push('╠═══════════════════════════════════════════════════════════════════════════════╣');
    lines.push('║  PERFORMANCE                                                                  ║');
    lines.push(`║    p50:  ${crystal.performanceProfile.p50.toFixed(3).padStart(10)}ms                                                ║`);
    lines.push(`║    p95:  ${crystal.performanceProfile.p95.toFixed(3).padStart(10)}ms                                                ║`);
    lines.push(`║    p99:  ${crystal.performanceProfile.p99.toFixed(3).padStart(10)}ms                                                ║`);
    lines.push(`║    p999: ${crystal.performanceProfile.p999.toFixed(3).padStart(10)}ms                                                ║`);
    lines.push(`║    Distribution: ${crystal.performanceProfile.distribution.padEnd(52)}║`);
    lines.push('╠═══════════════════════════════════════════════════════════════════════════════╣');
    lines.push('║  INVARIANTS                                                                   ║');
    for (const inv of crystal.invariants) {
      const status = inv.status === 'PASS' ? '✅' : '❌';
      lines.push(`║    ${status} ${inv.id}: ${inv.name.substring(0, 50).padEnd(50)}║`);
    }
    lines.push('╠═══════════════════════════════════════════════════════════════════════════════╣');
    lines.push(`║  Causality Score: ${(crystal.causalityVerification.score * 100).toFixed(1)}%                                              ║`);
    lines.push(`║  Determinism: ${crystal.determinismFingerprint.proven ? '✅ PROVEN' : '❌ NOT PROVEN'} (${crystal.determinismFingerprint.identicalRuns} identical runs)          ║`);
    lines.push('╚═══════════════════════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createCrystallizer(config: CrystallizerConfig): ProofCrystallizer {
  return new ProofCrystallizer(config);
}
