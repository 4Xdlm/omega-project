/**
 * OMEGA Forge — Report Tests
 * Phase C.5 — 8 tests for buildForgeMetrics, buildForgeReport, forgeReportToMarkdown
 */

import { describe, it, expect } from 'vitest';
import { buildForgeMetrics, buildForgeReport, forgeReportToMarkdown } from '../src/report.js';
import { DEFAULT_F5_CONFIG, TIMESTAMP } from './fixtures.js';
import type {
  TrajectoryAnalysis, LawComplianceReport, QualityEnvelope,
  ForgeProfile, ForgeScore, Prescription, F5InvariantId,
} from '../src/types.js';

const ALL_INVARIANTS: F5InvariantId[] = [
  'F5-INV-01', 'F5-INV-02', 'F5-INV-03', 'F5-INV-04',
  'F5-INV-05', 'F5-INV-06', 'F5-INV-07', 'F5-INV-08',
  'F5-INV-09', 'F5-INV-10', 'F5-INV-11', 'F5-INV-12',
  'F5-INV-13', 'F5-INV-14',
];

const mockTrajectory: TrajectoryAnalysis = {
  paragraph_states: [
    { paragraph_index: 0, paragraph_hash: 'a'.repeat(64), state_14d: {} as any, omega_state: { X: 0, Y: 0, Z: 0 }, dominant_emotion: 'fear', valence: -0.5, arousal: 0.7 },
  ],
  prescribed_states: [],
  deviations: [],
  avg_cosine_distance: 0.1,
  avg_euclidean_distance: 0.5,
  max_deviation_index: 0,
  compliant_ratio: 0.85,
  trajectory_hash: 'a'.repeat(64),
};

const mockLaws: LawComplianceReport = {
  transitions: [],
  organic_decay_segments: [],
  flux_conservation: { phi_transferred: 0, phi_stored: 0, phi_dissipated: 0, phi_total: 0, balance_error: 0.01, compliant: true },
  total_transitions: 0,
  forced_transitions: 0,
  feasibility_failures: 0,
  law4_violations: 0,
  law5_compliant: true,
  overall_compliance: 0.9,
  compliance_hash: 'b'.repeat(64),
};

const mockQuality: QualityEnvelope = {
  metrics: {
    M1_contradiction_rate: 0,
    M2_canon_compliance: 1,
    M3_coherence_span: 100,
    M4_arc_maintenance: 3,
    M5_memory_integrity: 0.9,
    M6_style_emergence: 0.8,
    M7_author_fingerprint: 0.6,
    M8_sentence_necessity: 0.98,
    M9_semantic_density: 0.45,
    M10_reading_levels: 3,
    M11_discomfort_index: 0.5,
    M12_superiority_index: 0,
  },
  quality_score: 0.85,
  quality_hash: 'c'.repeat(64),
};

const mockPrescription: Prescription = {
  prescription_id: 'RX-001',
  domain: 'dead_zone',
  priority: 'MEDIUM',
  paragraph_indices: [2, 3],
  law_violated: null,
  metric_violated: null,
  diagnostic: 'Dead zone detected at paragraphs 2-3',
  action: 'Introduce emotional contrast or narrative tension',
  current_value: 0.1,
  target_value: 0.5,
};

const mockScore: ForgeScore = { emotion_compliance: 0.87, quality_score: 0.85, composite: 0.862 };

const mockProfile: ForgeProfile = {
  score: mockScore,
  trajectory_compliance: 0.85,
  law_compliance: 0.9,
  canon_compliance: 1,
  necessity_score: 0.98,
  style_emergence: 0.8,
  strengths: ['Strong trajectory compliance'],
  weaknesses: [],
  profile_hash: 'd'.repeat(64),
};

describe('report', () => {
  it('builds a complete report', () => {
    const metrics = buildForgeMetrics(mockTrajectory, mockLaws, mockQuality, [], [mockPrescription], 0.87, 0.86);
    const report = buildForgeReport(
      'FORGE-001', 'a'.repeat(64), 'PASS', metrics, mockProfile,
      [mockPrescription], ALL_INVARIANTS, ALL_INVARIANTS, [], DEFAULT_F5_CONFIG, TIMESTAMP,
    );
    expect(report.forge_id).toBe('FORGE-001');
    expect(report.verdict).toBe('PASS');
    expect(typeof report.report_hash).toBe('string');
    expect(report.report_hash).toHaveLength(64);
  });

  it('populates metrics correctly', () => {
    const metrics = buildForgeMetrics(mockTrajectory, mockLaws, mockQuality, [], [mockPrescription], 0.87, 0.86);
    expect(metrics.total_paragraphs).toBe(1);
    expect(metrics.M1).toBe(0);
    expect(metrics.M2).toBe(1);
    expect(metrics.emotion_score).toBe(0.87);
    expect(metrics.composite_score).toBe(0.86);
    expect(metrics.prescriptions_count).toBe(1);
  });

  it('contains correct verdict', () => {
    const metrics = buildForgeMetrics(mockTrajectory, mockLaws, mockQuality, [], [], 0.87, 0.86);
    const report = buildForgeReport(
      'FORGE-V', 'a'.repeat(64), 'FAIL', metrics, mockProfile,
      [], ALL_INVARIANTS, [], ['F5-INV-01'], DEFAULT_F5_CONFIG, TIMESTAMP,
    );
    expect(report.verdict).toBe('FAIL');
  });

  it('tracks invariants checked/passed/failed', () => {
    const metrics = buildForgeMetrics(mockTrajectory, mockLaws, mockQuality, [], [], 0.87, 0.86);
    const report = buildForgeReport(
      'FORGE-INV', 'a'.repeat(64), 'PASS', metrics, mockProfile,
      [], ALL_INVARIANTS, ALL_INVARIANTS.slice(0, 12), ALL_INVARIANTS.slice(12), DEFAULT_F5_CONFIG, TIMESTAMP,
    );
    expect(report.invariants_checked).toHaveLength(14);
    expect(report.invariants_passed).toHaveLength(12);
    expect(report.invariants_failed).toHaveLength(2);
  });

  it('includes config hash', () => {
    const metrics = buildForgeMetrics(mockTrajectory, mockLaws, mockQuality, [], [], 0.87, 0.86);
    const report = buildForgeReport(
      'FORGE-CFG', 'a'.repeat(64), 'PASS', metrics, mockProfile,
      [], ALL_INVARIANTS, ALL_INVARIANTS, [], DEFAULT_F5_CONFIG, TIMESTAMP,
    );
    expect(typeof report.config_hash).toBe('string');
    expect(report.config_hash).toHaveLength(64);
  });

  it('includes prescriptions summary', () => {
    const metrics = buildForgeMetrics(mockTrajectory, mockLaws, mockQuality, [], [mockPrescription], 0.87, 0.86);
    const report = buildForgeReport(
      'FORGE-RX', 'a'.repeat(64), 'PASS', metrics, mockProfile,
      [mockPrescription], ALL_INVARIANTS, ALL_INVARIANTS, [], DEFAULT_F5_CONFIG, TIMESTAMP,
    );
    expect(report.prescriptions_summary).toHaveLength(1);
    expect(report.prescriptions_summary[0].diagnostic).toBeTruthy();
  });

  it('generates markdown output', () => {
    const metrics = buildForgeMetrics(mockTrajectory, mockLaws, mockQuality, [], [], 0.87, 0.86);
    const report = buildForgeReport(
      'FORGE-MD', 'a'.repeat(64), 'PASS', metrics, mockProfile,
      [], ALL_INVARIANTS, ALL_INVARIANTS, [], DEFAULT_F5_CONFIG, TIMESTAMP,
    );
    const md = forgeReportToMarkdown(report);
    expect(md).toContain('# OMEGA Forge Report');
    expect(md).toContain('FORGE-MD');
    expect(md).toContain('PASS');
    expect(md).toContain('Metrics');
    expect(md).toContain('Invariants');
    expect(md).toContain('Hashes');
  });

  it('is deterministic across calls', () => {
    const metrics = buildForgeMetrics(mockTrajectory, mockLaws, mockQuality, [], [], 0.87, 0.86);
    const a = buildForgeReport(
      'FORGE-DET', 'a'.repeat(64), 'PASS', metrics, mockProfile,
      [], ALL_INVARIANTS, ALL_INVARIANTS, [], DEFAULT_F5_CONFIG, TIMESTAMP,
    );
    const b = buildForgeReport(
      'FORGE-DET', 'a'.repeat(64), 'PASS', metrics, mockProfile,
      [], ALL_INVARIANTS, ALL_INVARIANTS, [], DEFAULT_F5_CONFIG, TIMESTAMP,
    );
    expect(a.report_hash).toBe(b.report_hash);
    expect(a.config_hash).toBe(b.config_hash);
  });
});
