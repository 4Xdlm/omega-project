/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Resilience Crystal - Builder
 * 
 * Phase 23 - Sprint 23.4
 * 
 * Constructs Resilience Crystals from component proofs.
 */

import {
  ResilienceCrystal,
  Proof,
  ProofStatus,
  ProofCategory,
  ProofEvidence,
  CoverageMatrix,
  CoverageCell,
  CrystalSummary,
  CrystalMetadata,
  CrystalStatus,
  crystalId,
  proofId,
  crystalSeal,
  CrystalId,
  ProofId,
  CrystalSeal,
  CRITICAL_INVARIANTS,
  ALL_PROOF_CATEGORIES,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build individual proofs
 */
export class ProofBuilder {
  private _name: string = '';
  private _category: ProofCategory = ProofCategory.INTEGRATION;
  private _invariantId: string = '';
  private _status: ProofStatus = ProofStatus.PENDING;
  private _evidence: Partial<ProofEvidence> = {};
  private _details: string = '';

  name(name: string): this {
    this._name = name;
    return this;
  }

  category(category: ProofCategory): this {
    this._category = category;
    return this;
  }

  invariant(invariantId: string): this {
    this._invariantId = invariantId;
    return this;
  }

  status(status: ProofStatus): this {
    this._status = status;
    return this;
  }

  proven(): this {
    this._status = ProofStatus.PROVEN;
    return this;
  }

  failed(): this {
    this._status = ProofStatus.FAILED;
    return this;
  }

  withTestResults(results: ProofEvidence['testResults']): this {
    this._evidence.testResults = results;
    return this;
  }

  withFormalVerification(results: ProofEvidence['formalVerification']): this {
    this._evidence.formalVerification = results;
    return this;
  }

  withStressResults(results: ProofEvidence['stressResults']): this {
    this._evidence.stressResults = results;
    return this;
  }

  details(details: string): this {
    this._details = details;
    return this;
  }

  build(): Proof {
    if (!this._name) {
      throw new Error('Proof name is required');
    }
    if (!this._invariantId) {
      throw new Error('Invariant ID is required');
    }

    const evidenceHash = this.computeEvidenceHash();

    return {
      id: proofId(`${this._category}_${this._invariantId}`),
      name: this._name,
      category: this._category,
      invariantId: this._invariantId,
      status: this._status,
      evidence: {
        ...this._evidence,
        evidenceHash,
      },
      timestamp: new Date(),
      details: this._details,
    };
  }

  private computeEvidenceHash(): string {
    const data = JSON.stringify(this._evidence);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
  }
}

/**
 * Create a new proof builder
 */
export function createProof(): ProofBuilder {
  return new ProofBuilder();
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE MATRIX BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build coverage matrices
 */
export class CoverageMatrixBuilder {
  private _name: string = '';
  private _rows: string[] = [];
  private _columns: string[] = [];
  private _cells: CoverageCell[] = [];

  name(name: string): this {
    this._name = name;
    return this;
  }

  rows(rows: string[]): this {
    this._rows = [...rows];
    return this;
  }

  columns(columns: string[]): this {
    this._columns = [...columns];
    return this;
  }

  addCoverage(row: string, column: string, proofIds: ProofId[]): this {
    this._cells.push({
      row,
      column,
      covered: proofIds.length > 0,
      proofIds,
    });
    return this;
  }

  fromProofs(proofs: Proof[], rowExtractor: (p: Proof) => string): this {
    for (const proof of proofs) {
      const row = rowExtractor(proof);
      if (this._rows.includes(row) && this._columns.includes(proof.invariantId)) {
        const existing = this._cells.find(c => c.row === row && c.column === proof.invariantId);
        if (existing) {
          (existing.proofIds as ProofId[]).push(proof.id);
        } else {
          this._cells.push({
            row,
            column: proof.invariantId,
            covered: proof.status === ProofStatus.PROVEN,
            proofIds: [proof.id],
          });
        }
      }
    }
    return this;
  }

  build(): CoverageMatrix {
    // Find gaps (uncovered combinations)
    const gaps: Array<{ row: string; column: string }> = [];
    const coveredCount = this._cells.filter(c => c.covered).length;
    const totalCombinations = this._rows.length * this._columns.length;

    for (const row of this._rows) {
      for (const column of this._columns) {
        const cell = this._cells.find(c => c.row === row && c.column === column);
        if (!cell || !cell.covered) {
          gaps.push({ row, column });
        }
      }
    }

    return {
      name: this._name,
      rows: [...this._rows],
      columns: [...this._columns],
      cells: [...this._cells],
      coverage: totalCombinations > 0 ? (coveredCount / totalCombinations) * 100 : 100,
      gaps,
    };
  }
}

/**
 * Create a coverage matrix builder
 */
export function createCoverageMatrix(): CoverageMatrixBuilder {
  return new CoverageMatrixBuilder();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTAL BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resilience Crystal Builder
 */
export class CrystalBuilder {
  private _id: CrystalId;
  private _version: string = '1.0.0';
  private _proofs: Proof[] = [];
  private _metadata: Partial<CrystalMetadata> = {};
  private _chaosRows: string[] = [];
  private _adversarialRows: string[] = [];
  private _temporalRows: string[] = [];
  private _invariantColumns: string[] = [];

  constructor() {
    this._id = crystalId();
  }

  id(id: string): this {
    this._id = crystalId(id);
    return this;
  }

  version(version: string): this {
    this._version = version;
    return this;
  }

  addProof(proof: Proof): this {
    this._proofs.push(proof);
    return this;
  }

  addProofs(proofs: Proof[]): this {
    this._proofs.push(...proofs);
    return this;
  }

  chaosVectors(vectors: string[]): this {
    this._chaosRows = [...vectors];
    return this;
  }

  adversarialVectors(vectors: string[]): this {
    this._adversarialRows = [...vectors];
    return this;
  }

  temporalProperties(properties: string[]): this {
    this._temporalRows = [...properties];
    return this;
  }

  invariants(invariants: string[]): this {
    this._invariantColumns = [...invariants];
    return this;
  }

  metadata(metadata: Partial<CrystalMetadata>): this {
    this._metadata = { ...this._metadata, ...metadata };
    return this;
  }

  /**
   * Build the crystal (unsealed)
   */
  build(): ResilienceCrystal {
    const summary = this.computeSummary();
    const coverageMatrices = this.buildCoverageMatrices();
    const fullMetadata = this.buildMetadata();

    return {
      id: this._id,
      version: this._version,
      createdAt: new Date(),
      status: CrystalStatus.BUILDING,
      proofs: [...this._proofs],
      coverageMatrices,
      summary,
      metadata: fullMetadata,
    };
  }

  /**
   * Build and seal the crystal
   */
  seal(): ResilienceCrystal {
    const crystal = this.build();
    const sealHash = this.computeSealHash(crystal);

    return {
      ...crystal,
      status: CrystalStatus.SEALED,
      seal: crystalSeal(sealHash),
    };
  }

  private computeSummary(): CrystalSummary {
    const totalProofs = this._proofs.length;
    const provenCount = this._proofs.filter(p => p.status === ProofStatus.PROVEN).length;
    const failedCount = this._proofs.filter(p => p.status === ProofStatus.FAILED).length;
    const pendingCount = this._proofs.filter(p => p.status === ProofStatus.PENDING).length;

    const byCategory = {} as CrystalSummary['byCategory'];
    for (const category of ALL_PROOF_CATEGORIES) {
      const categoryProofs = this._proofs.filter(p => p.category === category);
      byCategory[category] = {
        total: categoryProofs.length,
        proven: categoryProofs.filter(p => p.status === ProofStatus.PROVEN).length,
        failed: categoryProofs.filter(p => p.status === ProofStatus.FAILED).length,
      };
    }

    // Check critical invariants
    const criticalInvariantsProven = CRITICAL_INVARIANTS.every(inv => {
      const proof = this._proofs.find(p => p.invariantId === inv);
      return proof && proof.status === ProofStatus.PROVEN;
    });

    const overallCoverage = totalProofs > 0 ? (provenCount / totalProofs) * 100 : 0;
    const isComplete = criticalInvariantsProven && failedCount === 0 && pendingCount === 0;

    return {
      totalProofs,
      provenCount,
      failedCount,
      pendingCount,
      byCategory,
      overallCoverage,
      criticalInvariantsProven,
      isComplete,
    };
  }

  private buildCoverageMatrices(): ResilienceCrystal['coverageMatrices'] {
    const chaosProofs = this._proofs.filter(p => p.category === ProofCategory.CHAOS);
    const adversarialProofs = this._proofs.filter(p => p.category === ProofCategory.ADVERSARIAL);
    const temporalProofs = this._proofs.filter(p => p.category === ProofCategory.TEMPORAL);

    const chaosInvariants = createCoverageMatrix()
      .name('Chaos × Invariants')
      .rows(this._chaosRows.length > 0 ? this._chaosRows : ['CLOCK', 'NETWORK', 'MEMORY', 'LOGIC', 'RESOURCE'])
      .columns(this._invariantColumns.length > 0 ? this._invariantColumns : CRITICAL_INVARIANTS.map(i => i))
      .fromProofs(chaosProofs, p => p.details.split(':')[0] ?? 'UNKNOWN')
      .build();

    const adversarialInvariants = createCoverageMatrix()
      .name('Adversarial × Invariants')
      .rows(this._adversarialRows.length > 0 ? this._adversarialRows : ['ENVELOPE', 'REPLAY', 'BYPASS', 'RESOURCE', 'TIMING', 'INJECTION'])
      .columns(this._invariantColumns.length > 0 ? this._invariantColumns : CRITICAL_INVARIANTS.map(i => i))
      .fromProofs(adversarialProofs, p => p.details.split(':')[0] ?? 'UNKNOWN')
      .build();

    const temporalInvariants = createCoverageMatrix()
      .name('Temporal × Invariants')
      .rows(this._temporalRows.length > 0 ? this._temporalRows : ['SAFETY', 'LIVENESS', 'FAIRNESS', 'CAUSALITY', 'RECOVERY'])
      .columns(this._invariantColumns.length > 0 ? this._invariantColumns : CRITICAL_INVARIANTS.map(i => i))
      .fromProofs(temporalProofs, p => p.details.split(':')[0] ?? 'UNKNOWN')
      .build();

    // Full coverage: all rows × all columns
    const allRows = [...new Set([...this._chaosRows, ...this._adversarialRows, ...this._temporalRows])];
    const fullCoverage = createCoverageMatrix()
      .name('Full Coverage Matrix')
      .rows(allRows.length > 0 ? allRows : ['CHAOS', 'ADVERSARIAL', 'TEMPORAL', 'STRESS'])
      .columns(this._invariantColumns.length > 0 ? this._invariantColumns : CRITICAL_INVARIANTS.map(i => i))
      .fromProofs(this._proofs, p => p.category)
      .build();

    return {
      chaosInvariants,
      adversarialInvariants,
      temporalInvariants,
      fullCoverage,
    };
  }

  private buildMetadata(): CrystalMetadata {
    return {
      omegaVersion: this._metadata.omegaVersion ?? '3.23.0',
      buildId: this._metadata.buildId ?? `BUILD_${Date.now()}`,
      commitHash: this._metadata.commitHash ?? 'HEAD',
      environment: this._metadata.environment ?? 'development',
      builder: this._metadata.builder ?? 'CrystalBuilder',
      tags: this._metadata.tags ?? [],
    };
  }

  private computeSealHash(crystal: ResilienceCrystal): string {
    // Compute deterministic hash of crystal content
    const content = JSON.stringify({
      id: crystal.id,
      version: crystal.version,
      proofs: crystal.proofs.map(p => ({
        id: p.id,
        invariantId: p.invariantId,
        status: p.status,
        evidenceHash: p.evidence.evidenceHash,
      })),
      summary: crystal.summary,
    });

    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < content.length; i++) {
      hash ^= content.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }

    return `SEAL_${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
  }
}

/**
 * Create a crystal builder
 */
export function createCrystal(): CrystalBuilder {
  return new CrystalBuilder();
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Verify a crystal's seal
 */
export function verifyCrystalSeal(crystal: ResilienceCrystal): boolean {
  if (!crystal.seal) {
    return false;
  }

  // Recompute the seal and compare
  const content = JSON.stringify({
    id: crystal.id,
    version: crystal.version,
    proofs: crystal.proofs.map(p => ({
      id: p.id,
      invariantId: p.invariantId,
      status: p.status,
      evidenceHash: p.evidence.evidenceHash,
    })),
    summary: crystal.summary,
  });

  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  const expectedSeal = `SEAL_${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
  return crystal.seal === expectedSeal;
}

/**
 * Check if crystal is complete
 */
export function isCrystalComplete(crystal: ResilienceCrystal): boolean {
  return crystal.summary.isComplete;
}

/**
 * Get missing proofs for critical invariants
 */
export function getMissingCriticalProofs(crystal: ResilienceCrystal): string[] {
  const missing: string[] = [];
  
  for (const inv of CRITICAL_INVARIANTS) {
    const proof = crystal.proofs.find(p => p.invariantId === inv);
    if (!proof || proof.status !== ProofStatus.PROVEN) {
      missing.push(inv);
    }
  }
  
  return missing;
}
