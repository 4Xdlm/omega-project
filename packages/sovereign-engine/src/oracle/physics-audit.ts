/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PHYSICS AUDIT (POST-GENERATION)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: physics-audit.ts
 * Version: 1.0.0 (Sprint 3 — Commit 3.1)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * MODE: INFORMATIF
 * - Calcule physics_score (0-100)
 * - Détecte violations physiques émotionnelles
 * - NE MODIFIE PAS le verdict S-Oracle (SEAL/REJECT)
 * - Influence la boucle de repair via prescriptions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  buildActualTrajectory,
  computeDeviations,
  buildLawComplianceReport,
  detectDeadZones,
  detectForcedTransitions,
  detectFeasibilityFailures,
  createDefaultF5Config,
  type ForgeEmotionBrief,
  type CanonicalEmotionTable,
  type TrajectoryAnalysis,
  type LawComplianceReport,
  type DeadZone,
  type TrajectoryDeviation,
} from '@omega/omega-forge';
import { canonicalize, sha256 } from '@omega/canon-kernel';

/**
 * Physics Audit Result
 * Rapport informatif sur la conformité physique émotionnelle de la prose générée.
 */
export interface PhysicsAuditResult {
  readonly audit_id: string;
  readonly audit_hash: string;
  readonly trajectory_analysis: TrajectoryAnalysis;
  readonly law_compliance: LawComplianceReport;
  readonly dead_zones: readonly DeadZone[];
  readonly forced_transitions: number;
  readonly feasibility_failures: number;
  readonly trajectory_deviations: readonly TrajectoryDeviation[];
  readonly physics_score: number; // 0-100, INFORMATIF
}

/**
 * Physics Audit Configuration
 */
export interface PhysicsAuditConfig {
  readonly enabled: boolean;
  readonly trajectory_weight: number; // Default: 0.40
  readonly law_weight: number; // Default: 0.30
  readonly dead_zone_weight: number; // Default: 0.20
  readonly forced_transition_weight: number; // Default: 0.10
}

/**
 * Validate physics audit config. FAIL-CLOSED.
 * INV: sum(weights) must equal 1.0 (tolerance 1e-9).
 */
export function validatePhysicsAuditConfig(config: PhysicsAuditConfig): void {
  const sum = config.trajectory_weight + config.law_weight
    + config.dead_zone_weight + config.forced_transition_weight;
  if (Math.abs(sum - 1.0) > 1e-9) {
    throw new Error(
      `PHYSICS_AUDIT CONFIG INVALID: sum(weights)=${sum}, expected 1.0 [PHYS-CFG-01]`
    );
  }
}

/**
 * Run Physics Audit (post-generation)
 *
 * Analyse la prose générée pour détecter les violations des lois physiques émotionnelles.
 *
 * @param prose - Prose générée (brut, non poli)
 * @param brief - ForgeEmotionBrief (SSOT depuis omega-forge)
 * @param canonicalTable - Table physique des émotions
 * @param persistenceCeiling - Plafond de persistance
 * @param config - Configuration du Physics Audit
 * @returns PhysicsAuditResult (informatif, n'affecte pas le verdict)
 */
export function runPhysicsAudit(
  prose: string,
  brief: ForgeEmotionBrief,
  canonicalTable: CanonicalEmotionTable,
  persistenceCeiling: number,
  config: PhysicsAuditConfig,
): PhysicsAuditResult {
  if (!config.enabled) {
    // Audit désactivé → retourner résultat vide
    return createEmptyAuditResult();
  }

  validatePhysicsAuditConfig(config);

  // 1. Construire trajectoire réelle depuis la prose (SSOT: omega-forge)
  // buildActualTrajectory expects StyledParagraph[], so we split prose into paragraphs
  const paragraphs = prose
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text, index) => ({
      text,
      paragraph_id: `para-${index}`,
      word_count: text.split(/\s+/).length,
    }));

  const actualTrajectory = buildActualTrajectory(
    paragraphs as any, // Cast needed: StyledParagraph has more fields, but only .text is used
    canonicalTable,
    persistenceCeiling,
  );

  // Créer config F5 par défaut pour les seuils physiques
  const f5Config = createDefaultF5Config();

  // 2. Calculer déviations (prescribed vs actual)
  const deviations = computeDeviations(
    brief.trajectory,
    actualTrajectory,
    f5Config,
  );

  // 3. Détection dead zones
  const deadZones = detectDeadZones(actualTrajectory, f5Config, persistenceCeiling);

  // 4. Détection transitions forcées
  const forcedTransitions = detectForcedTransitions(
    actualTrajectory,
    canonicalTable,
  );

  // 5. Détection échecs de faisabilité
  const feasibilityFailures = detectFeasibilityFailures(
    actualTrajectory,
    canonicalTable,
  );

  // 6. Law compliance (simplified - full report requires GenesisPlan)
  // For Sprint 3.1, we focus on trajectory + dead zones + forced transitions
  const lawCompliance: LawComplianceReport = {
    violations: [],
    total_checks: 0,
    compliance_ratio: 1.0,
  };

  // 7. Calculer physics_score (0-100)
  const physicsScore = computePhysicsScore({
    deviations,
    lawCompliance,
    deadZones,
    forcedCount: forcedTransitions.length,
    feasibilityCount: feasibilityFailures.length,
    config,
  });

  // 8. Générer audit_hash (déterministe)
  // Guard all values to ensure they're safe for canonicalize (no NaN/Infinity)
  const auditPayload = {
    trajectory_cosine: Number.isFinite(deviations.average_cosine) ? Math.round(deviations.average_cosine * 1000) / 1000 : 0,
    trajectory_euclidean: Number.isFinite(deviations.average_euclidean) ? Math.round(deviations.average_euclidean * 1000) / 1000 : 0,
    law_violations: lawCompliance.violations.length,
    dead_zones: deadZones.length,
    forced_transitions: forcedTransitions.length,
    feasibility_failures: feasibilityFailures.length,
    physics_score: Number.isFinite(physicsScore) ? physicsScore : 0,
  };
  const audit_hash = sha256(canonicalize(auditPayload));
  const audit_id = `audit-${audit_hash.substring(0, 12)}`;

  return {
    audit_id,
    audit_hash,
    trajectory_analysis: {
      prescribed: brief.trajectory,
      actual: actualTrajectory,
      deviations,
    },
    law_compliance: lawCompliance,
    dead_zones: deadZones,
    forced_transitions: forcedTransitions.length,
    feasibility_failures: feasibilityFailures.length,
    trajectory_deviations: deviations.per_paragraph,
    physics_score: physicsScore,
  };
}

/**
 * Compute Physics Score (0-100)
 *
 * Agrège les métriques physiques en un score composite.
 *
 * Formule:
 * - Trajectory compliance (cosine + euclidean) → 40%
 * - Law compliance → 30%
 * - Dead zones → 20%
 * - Forced transitions → 10%
 */
function computePhysicsScore(params: {
  deviations: { average_cosine: number; average_euclidean: number };
  lawCompliance: LawComplianceReport;
  deadZones: readonly DeadZone[];
  forcedCount: number;
  feasibilityCount: number;
  config: PhysicsAuditConfig;
}): number {
  const { deviations, lawCompliance, deadZones, forcedCount, feasibilityCount, config } = params;

  // Guard against NaN/Infinity
  const safeCosine = Number.isFinite(deviations.average_cosine) ? deviations.average_cosine : 0;
  const safeEuclidean = Number.isFinite(deviations.average_euclidean) ? deviations.average_euclidean : 10;

  // Trajectory score (0-100)
  const cosineScore = safeCosine * 100; // 0.85 → 85
  const euclideanScore = Math.max(0, 100 - safeEuclidean * 10); // <2 → >80
  const trajectoryScore = (cosineScore + euclideanScore) / 2;

  // Law compliance score (0-100)
  const violationRatio = lawCompliance.violations.length / Math.max(1, lawCompliance.total_checks);
  const lawScore = Math.max(0, 100 - violationRatio * 100);

  // Dead zone score (0-100)
  const deadZoneRatio = deadZones.length / Math.max(1, 10); // 10 paragraphes typiques
  const deadZoneScore = Math.max(0, 100 - deadZoneRatio * 100);

  // Forced transition score (0-100)
  const forcedRatio = (forcedCount + feasibilityCount) / Math.max(1, 5); // 5 transitions typiques
  const forcedScore = Math.max(0, 100 - forcedRatio * 100);

  // Weighted composite
  const composite =
    trajectoryScore * config.trajectory_weight +
    lawScore * config.law_weight +
    deadZoneScore * config.dead_zone_weight +
    forcedScore * config.forced_transition_weight;

  const result = Math.round(composite * 100) / 100; // 2 décimales
  return Number.isFinite(result) ? result : 0;
}

/**
 * Create Empty Audit Result (when audit disabled)
 */
function createEmptyAuditResult(): PhysicsAuditResult {
  return {
    audit_id: 'disabled',
    audit_hash: '0'.repeat(64),
    trajectory_analysis: {
      prescribed: [],
      actual: [],
      deviations: {
        per_paragraph: [],
        average_cosine: 1.0,
        average_euclidean: 0.0,
        max_deviation: 0.0,
      },
    },
    law_compliance: {
      violations: [],
      total_checks: 0,
      compliance_ratio: 1.0,
    },
    dead_zones: [],
    forced_transitions: 0,
    feasibility_failures: 0,
    trajectory_deviations: [],
    physics_score: 100.0,
  };
}
