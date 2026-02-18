/**
 * OMEGA Sovereign — Quality M1-M12 Bridge
 * Roadmap Sprint 4.1 — INFORMATIF
 *
 * Bridge entre sovereign-engine (prose + ForgePacket) et
 * les M metrics individuelles de omega-forge.
 *
 * Les métriques qui nécessitent des types pipeline complets
 * (StyledOutput, GenesisPlan, ScribeOutput) sont marquées "degraded".
 *
 * SSOT: omega-forge compute*, sovereign-engine consomme.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
// Import INDIVIDUAL M metrics from omega-forge
import {
  computeM1,
  computeM2,
  computeM3,
  computeM5,
  computeM9,
  computeM10,
} from '@omega/omega-forge';

import type { ForgePacket } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QualityM12Report {
  readonly enabled: boolean;
  readonly metrics: QualityM12Metrics;
  readonly computed_count: number; // How many metrics were actually computed
  readonly degraded_count: number; // How many were degraded/skipped
  readonly degraded_signals: readonly string[]; // Which metrics were degraded
  readonly quality_score_partial: number; // Score from computed metrics only (0-1)
  readonly report_hash: string;
}

export interface QualityM12Metrics {
  readonly M1_contradiction_rate: MetricResult;
  readonly M2_canon_compliance: MetricResult;
  readonly M3_coherence_span: MetricResult;
  readonly M4_arc_maintenance: MetricResult;
  readonly M5_memory_integrity: MetricResult;
  readonly M6_style_emergence: MetricResult;
  readonly M7_author_fingerprint: MetricResult;
  readonly M8_sentence_necessity: MetricResult;
  readonly M9_semantic_density: MetricResult;
  readonly M10_reading_levels: MetricResult;
  readonly M11_discomfort_index: MetricResult;
  readonly M12_superiority_index: MetricResult;
}

export interface MetricResult {
  readonly value: number;
  readonly status: 'computed' | 'degraded';
  readonly reason?: string; // Why degraded
}

/**
 * Minimal paragraph structure for omega-forge M metrics.
 * Simplified from StyledParagraph - only includes fields needed by M1-M12.
 */
interface MinimalParagraph {
  readonly paragraph_id: string;
  readonly original_paragraph_id: string;
  readonly text: string;
  readonly word_count: number;
  readonly sentence_count: number;
  readonly selected_variant_id: string;
  readonly style_profile: null;
}

/**
 * Minimal canon structure for omega-forge M metrics.
 * Compatible with omega-forge M1/M2 expectations.
 */
interface MinimalCanon {
  readonly entries: readonly { readonly statement: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRIDGE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build minimal StyledParagraph-like objects from prose.
 * These are compatible with M metrics that only need text + word/sentence counts.
 */
function proseToParagraphs(prose: string): MinimalParagraph[] {
  const rawParagraphs = prose.split(/\n\n+/).filter((p) => p.trim().length > 0);

  return rawParagraphs.map((text, i) => ({
    paragraph_id: `p_${i}`,
    original_paragraph_id: `p_${i}`,
    text: text.trim(),
    word_count: text.trim().split(/\s+/).length,
    sentence_count: text.trim().split(/[.!?]+/).filter((s) => s.trim().length > 0).length,
    selected_variant_id: 'bridge',
    style_profile: null, // Degraded — no style analysis
  }));
}

/**
 * Build Canon object from ForgePacket for M1/M2.
 * omega-forge M metrics expect: { entries: Array<{ statement: string }> }
 */
function packetToCanon(packet: ForgePacket): MinimalCanon {
  return {
    entries: packet.canon.map((c) => ({
      statement: c.statement,
    })),
  };
}

/**
 * Compute Quality M1-M12 metrics from prose + ForgePacket.
 * Calls omega-forge SSOT metrics where possible.
 * Marks degraded where types are insufficient.
 */
export function buildQualityReport(
  prose: string,
  packet: ForgePacket,
  options?: { enabled?: boolean },
): QualityM12Report {
  const isEnabled = options?.enabled ?? SOVEREIGN_CONFIG.QUALITY_M12_ENABLED;
  if (!isEnabled) {
    return {
      enabled: false,
      metrics: buildDisabledMetrics(),
      computed_count: 0,
      degraded_count: 12,
      degraded_signals: ['all_disabled'],
      quality_score_partial: 0,
      report_hash: sha256(canonicalize({ enabled: false })),
    };
  }

  const paragraphs = proseToParagraphs(prose);
  const canon = packetToCanon(packet);

  // Call omega-forge SSOT metrics individually
  // Each call is wrapped in try/catch for fail-closed with degradation
  const metrics: QualityM12Metrics = {
    M1_contradiction_rate: safeCompute('M1', () => computeM1(paragraphs, canon)),
    M2_canon_compliance: safeCompute('M2', () => computeM2(paragraphs, canon)),
    M3_coherence_span: safeCompute('M3', () => computeM3(paragraphs)),
    M4_arc_maintenance: degraded('M4', 'GenesisPlan not available in sovereign-engine'),
    M5_memory_integrity: safeCompute('M5', () => computeM5(paragraphs)),
    M6_style_emergence: degraded('M6', 'StyledOutput not available in sovereign-engine'),
    M7_author_fingerprint: degraded('M7', 'StyledOutput not available in sovereign-engine'),
    M8_sentence_necessity: degraded('M8', 'ScribeOutput not available in sovereign-engine'),
    M9_semantic_density: safeCompute('M9', () => computeM9(paragraphs)),
    M10_reading_levels: safeCompute('M10', () => computeM10(paragraphs)),
    M11_discomfort_index: degraded('M11', 'StyledOutput not available in sovereign-engine'),
    M12_superiority_index: degraded('M12', 'Depends on all M1-M11'),
  };

  const computed = Object.values(metrics).filter((m) => m.status === 'computed');
  const degradedList = Object.entries(metrics)
    .filter(([_, m]) => m.status === 'degraded')
    .map(([k, _]) => k);

  const partialScore =
    computed.length > 0 ? computed.reduce((s, m) => s + m.value, 0) / computed.length : 0;

  return {
    enabled: true,
    metrics,
    computed_count: computed.length,
    degraded_count: degradedList.length,
    degraded_signals: degradedList,
    quality_score_partial: partialScore,
    report_hash: sha256(
      canonicalize({
        metrics: Object.fromEntries(
          Object.entries(metrics).map(([k, v]) => [k, { value: v.value, status: v.status }]),
        ),
      }),
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function safeCompute(name: string, fn: () => number): MetricResult {
  try {
    const value = fn();
    return { value, status: 'computed' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { value: 0, status: 'degraded', reason: `${name} computation failed: ${msg}` };
  }
}

function degraded(name: string, reason: string): MetricResult {
  return { value: 0, status: 'degraded', reason };
}

function buildDisabledMetrics(): QualityM12Metrics {
  const d = (name: string): MetricResult => degraded(name, 'Quality M12 disabled');
  return {
    M1_contradiction_rate: d('M1'),
    M2_canon_compliance: d('M2'),
    M3_coherence_span: d('M3'),
    M4_arc_maintenance: d('M4'),
    M5_memory_integrity: d('M5'),
    M6_style_emergence: d('M6'),
    M7_author_fingerprint: d('M7'),
    M8_sentence_necessity: d('M8'),
    M9_semantic_density: d('M9'),
    M10_reading_levels: d('M10'),
    M11_discomfort_index: d('M11'),
    M12_superiority_index: d('M12'),
  };
}
