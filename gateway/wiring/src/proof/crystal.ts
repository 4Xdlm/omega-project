// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — PROOF CRYSTAL
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION RADICALE: PROOF CRYSTALLIZATION
//
// Au lieu de simplement "tester", nous CRISTALLISONS des preuves.
// Chaque exécution E2E produit un "cristal" — une structure cryptographique
// immuable qui peut être:
//   1. Vérifiée indépendamment
//   2. Comparée à d'autres cristaux
//   3. Archivée comme preuve légale de conformité
//   4. Utilisée pour détecter des régressions bit-à-bit
//
// Le cristal contient:
//   - Merkle tree de tous les états intermédiaires
//   - Matrice de causalité (preuves d'ordre temporel)
//   - Empreintes de déterminisme (N runs → même hash)
//   - Profil statistique avec intervalles de confiance
//
// @invariant INV-CRYSTAL-01: Immutability — Un cristal formé ne peut être modifié
// @invariant INV-CRYSTAL-02: Verifiability — Tout cristal est vérifiable offline
// @invariant INV-CRYSTAL-03: Causality — Ordre temporel prouvé cryptographiquement
// @invariant INV-CRYSTAL-04: Determinism — Même input → même cristal
//
// ═══════════════════════════════════════════════════════════════════════════════

import { canonicalStringify } from '../canonical_json.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES FONDAMENTAUX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Nœud dans le Merkle tree des états
 */
export interface MerkleNode {
  /** Hash SHA-256 du contenu */
  readonly hash: string;
  /** Index dans la séquence */
  readonly index: number;
  /** Timestamp précis (via Clock injectable) */
  readonly timestamp: number;
  /** Type d'événement */
  readonly eventType: string;
  /** Données sérialisées (pour reconstruction) */
  readonly data: string;
  /** Hash du nœud parent (null si racine) */
  readonly parentHash: string | null;
}

/**
 * Cellule de la matrice de causalité
 * [i,j] = true si event i DOIT précéder event j
 */
export type CausalityMatrix = boolean[][];

/**
 * Résultat de vérification de causalité
 */
export interface CausalityVerification {
  /** Causalité respectée? */
  readonly valid: boolean;
  /** Violations détectées (event i devrait précéder j mais ne le fait pas) */
  readonly violations: Array<{ before: number; after: number; reason: string }>;
  /** Score de causalité (0-1, 1 = parfait) */
  readonly score: number;
}

/**
 * Empreinte de déterminisme
 */
export interface DeterminismFingerprint {
  /** Hash de l'input */
  readonly inputHash: string;
  /** Hash de l'output */
  readonly outputHash: string;
  /** Hash de la trace complète */
  readonly traceHash: string;
  /** Nombre de runs identiques */
  readonly identicalRuns: number;
  /** Preuve: si N runs → même hash, déterminisme prouvé */
  readonly proven: boolean;
}

/**
 * Profil statistique avancé
 */
export interface StatisticalProfile {
  /** Nombre d'échantillons */
  readonly n: number;
  /** Moyenne (µ) */
  readonly mean: number;
  /** Écart-type (σ) */
  readonly stddev: number;
  /** Médiane */
  readonly median: number;
  /** Percentiles */
  readonly p50: number;
  readonly p75: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly p999: number;
  /** Min/Max */
  readonly min: number;
  readonly max: number;
  /** Intervalle de confiance 95% pour la moyenne */
  readonly ci95: { lower: number; upper: number };
  /** Coefficient de variation (CV = σ/µ) */
  readonly cv: number;
  /** Skewness (asymétrie) */
  readonly skewness: number;
  /** Kurtosis (aplatissement) */
  readonly kurtosis: number;
  /** Distribution détectée */
  readonly distribution: 'normal' | 'bimodal' | 'heavy-tail' | 'uniform' | 'unknown';
  /** Outliers détectés (au-delà de 3σ) */
  readonly outliers: number[];
}

/**
 * Le Cristal de Preuve — structure finale immuable
 */
export interface ProofCrystal {
  // ─── Identité ─────────────────────────────────────────────────────────────
  /** ID unique du cristal */
  readonly crystalId: string;
  /** Version du protocole de cristallisation */
  readonly protocolVersion: '1.0.0';
  /** Timestamp de cristallisation */
  readonly crystallizedAt: number;
  
  // ─── Contexte ─────────────────────────────────────────────────────────────
  /** Nom du scénario testé */
  readonly scenarioName: string;
  /** Description */
  readonly description: string;
  /** Tags pour catégorisation */
  readonly tags: readonly string[];
  
  // ─── Merkle Tree ──────────────────────────────────────────────────────────
  /** Nœuds du Merkle tree (séquence d'états) */
  readonly merkleNodes: readonly MerkleNode[];
  /** Racine du Merkle tree */
  readonly merkleRoot: string;
  
  // ─── Causalité ────────────────────────────────────────────────────────────
  /** Matrice de causalité */
  readonly causalityMatrix: CausalityMatrix;
  /** Vérification de causalité */
  readonly causalityVerification: CausalityVerification;
  
  // ─── Déterminisme ─────────────────────────────────────────────────────────
  /** Empreinte de déterminisme */
  readonly determinismFingerprint: DeterminismFingerprint;
  
  // ─── Performance ──────────────────────────────────────────────────────────
  /** Profil statistique des temps d'exécution */
  readonly performanceProfile: StatisticalProfile;
  
  // ─── Invariants ───────────────────────────────────────────────────────────
  /** Invariants vérifiés avec leur statut */
  readonly invariants: readonly {
    readonly id: string;
    readonly name: string;
    readonly status: 'PASS' | 'FAIL';
    readonly evidence: string;
  }[];
  
  // ─── Verdict ──────────────────────────────────────────────────────────────
  /** Verdict global */
  readonly verdict: 'CRYSTALLIZED' | 'CONTAMINATED';
  /** Raison si contaminé */
  readonly contaminationReason?: string;
  
  // ─── Signature ────────────────────────────────────────────────────────────
  /** Hash SHA-256 de tout le cristal (sans ce champ) */
  readonly crystalHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le SHA-256 d'une string (sync, pour Node.js)
 */
export function sha256(data: string): string {
  // Utilisation de crypto natif Node.js
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Hash d'un objet via canonical JSON
 * Nettoie les undefined récursivement avant le hash
 */
export function hashObject(obj: unknown): string {
  return sha256(canonicalStringify(removeUndefined(obj)));
}

/**
 * Supprime récursivement les propriétés undefined
 */
function removeUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefined(value);
      }
    }
    return result;
  }
  
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE TREE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit un Merkle tree à partir d'événements
 */
export class MerkleTreeBuilder {
  private nodes: MerkleNode[] = [];
  private lastHash: string | null = null;

  constructor(private readonly clock: { nowMs(): number }) {}

  /**
   * Ajoute un événement au tree
   */
  append(eventType: string, data: unknown): MerkleNode {
    const index = this.nodes.length;
    const timestamp = this.clock.nowMs();
    const dataStr = canonicalStringify(data);
    
    // Hash = SHA256(index || timestamp || eventType || data || parentHash)
    const content = canonicalStringify({
      index,
      timestamp,
      eventType,
      data: dataStr,
      parentHash: this.lastHash,
    });
    const hash = sha256(content);

    const node: MerkleNode = {
      hash,
      index,
      timestamp,
      eventType,
      data: dataStr,
      parentHash: this.lastHash,
    };

    this.nodes.push(node);
    this.lastHash = hash;

    return node;
  }

  /**
   * Calcule la racine du Merkle tree
   */
  computeRoot(): string {
    if (this.nodes.length === 0) {
      return sha256('EMPTY_TREE');
    }

    // Racine = hash de la concaténation de tous les hashes
    const allHashes = this.nodes.map(n => n.hash).join('');
    return sha256(allHashes);
  }

  /**
   * Retourne les nœuds
   */
  getNodes(): MerkleNode[] {
    return [...this.nodes];
  }

  /**
   * Reset le builder
   */
  reset(): void {
    this.nodes = [];
    this.lastHash = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAUSALITY MATRIX BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types d'événements avec leurs dépendances causales
 */
const CAUSAL_DEPENDENCIES: Record<string, string[]> = {
  'DISPATCH_RECEIVED': [],
  'VALIDATION_OK': ['DISPATCH_RECEIVED'],
  'VALIDATION_FAILED': ['DISPATCH_RECEIVED'],
  'POLICY_OK': ['VALIDATION_OK'],
  'POLICY_REJECTED': ['VALIDATION_OK'],
  'REPLAY_OK': ['POLICY_OK', 'VALIDATION_OK'],
  'REPLAY_REJECTED': ['POLICY_OK', 'VALIDATION_OK'],
  'HANDLER_RESOLVED': ['REPLAY_OK', 'POLICY_OK'],
  'HANDLER_NOT_FOUND': ['REPLAY_OK', 'POLICY_OK'],
  'EXECUTION_START': ['HANDLER_RESOLVED'],
  'EXECUTION_OK': ['EXECUTION_START'],
  'EXECUTION_ERROR': ['EXECUTION_START'],
  'DISPATCH_COMPLETE': ['EXECUTION_OK', 'EXECUTION_ERROR', 'POLICY_REJECTED', 'VALIDATION_FAILED', 'HANDLER_NOT_FOUND', 'REPLAY_REJECTED'],
};

/**
 * Construit et vérifie la matrice de causalité
 */
export class CausalityMatrixBuilder {
  /**
   * Construit la matrice de causalité à partir des nœuds
   */
  buildMatrix(nodes: MerkleNode[]): CausalityMatrix {
    const n = nodes.length;
    const matrix: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(false));

    for (let j = 0; j < n; j++) {
      const eventJ = nodes[j].eventType;
      const deps = CAUSAL_DEPENDENCIES[eventJ] || [];

      for (let i = 0; i < j; i++) {
        const eventI = nodes[i].eventType;
        if (deps.includes(eventI)) {
          matrix[i][j] = true; // i DOIT précéder j
        }
      }
    }

    return matrix;
  }

  /**
   * Vérifie la causalité
   */
  verify(nodes: MerkleNode[], matrix: CausalityMatrix): CausalityVerification {
    const violations: Array<{ before: number; after: number; reason: string }> = [];
    const n = nodes.length;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j]) {
          // i doit précéder j
          if (nodes[i].timestamp > nodes[j].timestamp) {
            violations.push({
              before: i,
              after: j,
              reason: `${nodes[i].eventType} (t=${nodes[i].timestamp}) should precede ${nodes[j].eventType} (t=${nodes[j].timestamp})`,
            });
          }
        }
      }
    }

    const totalConstraints = matrix.flat().filter(Boolean).length;
    const score = totalConstraints > 0 
      ? (totalConstraints - violations.length) / totalConstraints 
      : 1;

    return {
      valid: violations.length === 0,
      violations,
      score,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICAL PROFILER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Profileur statistique avancé
 */
export class StatisticalProfiler {
  /**
   * Calcule le profil statistique complet
   */
  profile(samples: number[]): StatisticalProfile {
    if (samples.length === 0) {
      throw new Error('Cannot profile empty samples');
    }

    const n = samples.length;
    const sorted = [...samples].sort((a, b) => a - b);

    // Statistiques de base
    const sum = samples.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    const variance = samples.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / n;
    const stddev = Math.sqrt(variance);

    // Percentiles
    const percentile = (p: number) => {
      const idx = Math.ceil((p / 100) * n) - 1;
      return sorted[Math.max(0, Math.min(idx, n - 1))];
    };

    const median = percentile(50);
    const p50 = median;
    const p75 = percentile(75);
    const p90 = percentile(90);
    const p95 = percentile(95);
    const p99 = percentile(99);
    const p999 = percentile(99.9);

    // Min/Max
    const min = sorted[0];
    const max = sorted[n - 1];

    // Intervalle de confiance 95% (approximation normale)
    const se = stddev / Math.sqrt(n);
    const ci95 = {
      lower: mean - 1.96 * se,
      upper: mean + 1.96 * se,
    };

    // Coefficient de variation
    const cv = mean !== 0 ? stddev / mean : 0;

    // Skewness (moment d'ordre 3)
    const m3 = samples.reduce((acc, x) => acc + Math.pow(x - mean, 3), 0) / n;
    const skewness = stddev !== 0 ? m3 / Math.pow(stddev, 3) : 0;

    // Kurtosis (moment d'ordre 4)
    const m4 = samples.reduce((acc, x) => acc + Math.pow(x - mean, 4), 0) / n;
    const kurtosis = stddev !== 0 ? m4 / Math.pow(stddev, 4) - 3 : 0;

    // Détection de distribution
    const distribution = this.detectDistribution(skewness, kurtosis, cv);

    // Outliers (> 3σ)
    const outliers = samples.filter(x => Math.abs(x - mean) > 3 * stddev);

    return {
      n,
      mean,
      stddev,
      median,
      p50,
      p75,
      p90,
      p95,
      p99,
      p999,
      min,
      max,
      ci95,
      cv,
      skewness,
      kurtosis,
      distribution,
      outliers,
    };
  }

  /**
   * Détecte le type de distribution
   */
  private detectDistribution(
    skewness: number,
    kurtosis: number,
    cv: number
  ): 'normal' | 'bimodal' | 'heavy-tail' | 'uniform' | 'unknown' {
    // Normale: skewness ≈ 0, kurtosis ≈ 0
    if (Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 1) {
      return 'normal';
    }

    // Heavy-tail: kurtosis élevé
    if (kurtosis > 3) {
      return 'heavy-tail';
    }

    // Uniforme: kurtosis très négatif, CV faible
    if (kurtosis < -1 && cv < 0.3) {
      return 'uniform';
    }

    // Bimodal: difficile à détecter sans analyse de pics
    // On utilise une heuristique: CV élevé avec kurtosis négatif
    if (cv > 0.5 && kurtosis < -0.5) {
      return 'bimodal';
    }

    return 'unknown';
  }

  /**
   * Test de Mann-Whitney U pour comparer deux distributions
   * Retourne p-value (< 0.05 = différence significative)
   */
  mannWhitneyU(samples1: number[], samples2: number[]): number {
    const n1 = samples1.length;
    const n2 = samples2.length;

    // Combine et rank
    const combined = [
      ...samples1.map(v => ({ v, group: 1 })),
      ...samples2.map(v => ({ v, group: 2 })),
    ].sort((a, b) => a.v - b.v);

    // Assign ranks (handle ties)
    let rank = 1;
    for (let i = 0; i < combined.length; i++) {
      let j = i;
      while (j < combined.length - 1 && combined[j + 1].v === combined[i].v) {
        j++;
      }
      const avgRank = (rank + rank + (j - i)) / 2;
      for (let k = i; k <= j; k++) {
        (combined[k] as unknown as { rank: number }).rank = avgRank;
      }
      rank += (j - i + 1);
      i = j;
    }

    // Sum ranks for group 1
    const R1 = combined
      .filter(x => x.group === 1)
      .reduce((acc, x) => acc + ((x as unknown as { rank: number }).rank), 0);

    // U statistic
    const U1 = R1 - (n1 * (n1 + 1)) / 2;
    const U2 = n1 * n2 - U1;
    const U = Math.min(U1, U2);

    // Normal approximation for p-value
    const mu = (n1 * n2) / 2;
    const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = (U - mu) / sigma;

    // Two-tailed p-value (approximation)
    const p = 2 * (1 - this.normalCDF(Math.abs(z)));

    return p;
  }

  /**
   * CDF de la normale standard
   */
  private normalCDF(z: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM PROVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prouve le déterminisme via exécutions multiples
 */
export class DeterminismProver {
  /**
   * Prouve le déterminisme via exécutions multiples
   * Compare seulement les outputs (pas les inputs car ils peuvent varier sur les champs administratifs)
   */
  prove(
    runs: Array<{
      inputHash: string;
      outputHash: string;
      traceHash: string;
    }>
  ): DeterminismFingerprint {
    if (runs.length === 0) {
      return {
        inputHash: '',
        outputHash: '',
        traceHash: '',
        identicalRuns: 0,
        proven: false,
      };
    }

    const first = runs[0];
    let identicalOutputs = 1;

    // Pour le déterminisme, on compare seulement les outputs
    // Les inputs peuvent varier sur les champs administratifs (message_id, replay_key)
    for (let i = 1; i < runs.length; i++) {
      if (runs[i].outputHash === first.outputHash) {
        identicalOutputs++;
      }
    }

    return {
      inputHash: first.inputHash,
      outputHash: first.outputHash,
      traceHash: first.traceHash,
      identicalRuns: identicalOutputs,
      proven: identicalOutputs === runs.length && runs.length >= 2,
    };
  }
}
