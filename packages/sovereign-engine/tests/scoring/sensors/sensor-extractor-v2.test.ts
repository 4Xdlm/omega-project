/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SENSOR EXTRACTOR V2 — Additional Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests V2-specific features:
 *   - Audit mode (full trace)
 *   - Distance-weighted anchor scoring
 *   - Collision audit
 *   - Config injection
 *   - assertSensorResults invariant checker
 *   - Cache reset
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractSensoryFeatures,
  __tokenizeForTest,
  __rawDetectionCountForTest,
  __getCollisionAuditForTest,
  __computeAnchorScoreForTest,
  __resetCacheForTest,
} from '../../../src/scoring/sensors/sensor-extractor.js';
import { assertSensorResults } from '../../../src/scoring/sensors/sensor-types.js';
import { DEFAULT_SENSOR_CONFIG } from '../../../src/scoring/sensors/sensor-config.js';
import type { SensorConfig } from '../../../src/scoring/sensors/sensor-config.js';
import type { SensorResults, SensorTriplet } from '../../../src/scoring/sensors/sensor-types.js';

// ────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ────────────────────────────────────────────────────────────────────────────

const FR_SENSORY = `
  La lumière dorée traversait le verre de la fenêtre, projetant des éclats
  sur la table de chêne. Ses doigts effleuraient la surface rugueuse du bois,
  sentant chaque grain sous la paume. L'odeur âcre de la cire montait du
  parquet ciré. Un murmure lointain résonnait contre les murs de pierre.
  Le goût amer du café restait sur sa langue, mêlé à la douceur du miel.
  Elle frissonna quand le courant d'air froid caressa sa nuque.
  La rouille couvrait la serrure de fer, écaillée par le temps.
  Un craquement sourd monta de l'escalier de bois.
  La chaleur du poêle irradiait dans sa poitrine.
  Ses yeux suivaient le scintillement des gouttes de rosée sur la vitre.
  Le parfum lourd des roses envahissait la pièce depuis le vase de porcelaine.
  Un grincement métallique perçait le silence quand la porte pivota sur ses gonds.
  La texture soyeuse du velours glissait entre ses doigts.
  Le sel piquait ses lèvres gercées par le vent glacial.
  Une vibration sourde traversait le sol de marbre sous ses pieds nus.
`;

// ────────────────────────────────────────────────────────────────────────────
// TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('sensor-extractor-v2', () => {

  beforeEach(() => {
    __resetCacheForTest();
  });

  // ── AUDIT MODE ───────────────────────────────────────────────────────────

  describe('audit mode', () => {
    it('returns audit object when audit=true', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      expect(r.audit).toBeDefined();
      expect(r.audit!.rawDetections).toBeDefined();
      expect(r.audit!.collisions).toBeDefined();
      expect(r.audit!.validEvents).toBeDefined();
    });

    it('audit.rawDetections count matches raw_events', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      expect(r.audit!.rawDetections.length).toBe(r.raw_events);
    });

    it('audit.validEvents count matches valid_events', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      expect(r.audit!.validEvents.length).toBe(r.valid_events);
    });

    it('excludedCount + noAnchorCount + validEvents = rawDetections', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      const a = r.audit!;
      expect(a.excludedCount + a.noAnchorCount + a.validEvents.length).toBe(a.rawDetections.length);
    });

    it('does NOT return audit when audit=false (default)', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr');
      expect(r.audit).toBeUndefined();
    });

    it('audit rawDetections have bestAnchor with score and distance', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      const withAnchor = r.audit!.rawDetections.filter(d => d.bestAnchor !== null);
      expect(withAnchor.length).toBeGreaterThan(0);
      for (const d of withAnchor) {
        expect(d.bestAnchor!.score).toBeGreaterThan(0);
        expect(d.bestAnchor!.distance).toBeGreaterThanOrEqual(1);
        expect(['backward', 'forward']).toContain(d.bestAnchor!.direction);
      }
    });

    it('audit rawDetections have anchorCandidates sorted by score desc', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      for (const d of r.audit!.rawDetections) {
        if (d.anchorCandidates.length >= 2) {
          for (let i = 1; i < d.anchorCandidates.length; i++) {
            expect(d.anchorCandidates[i - 1].score).toBeGreaterThanOrEqual(d.anchorCandidates[i].score);
          }
        }
      }
    });
  });

  // ── DISTANCE-WEIGHTED ANCHOR SCORING ─────────────────────────────────────

  describe('distance-weighted anchor scoring', () => {
    it('closer anchors score higher than distant ones (same weight)', () => {
      const close = __computeAnchorScoreForTest(1.0, 1, 'backward');
      const far = __computeAnchorScoreForTest(1.0, 7, 'backward');
      expect(close).toBeGreaterThan(far);
    });

    it('distance=0 is maximum score', () => {
      const d0 = __computeAnchorScoreForTest(1.0, 0, 'backward');
      const d1 = __computeAnchorScoreForTest(1.0, 1, 'backward');
      expect(d0).toBeGreaterThan(d1);
    });

    it('forward penalty reduces score vs backward', () => {
      const backward = __computeAnchorScoreForTest(1.0, 3, 'backward');
      const forward = __computeAnchorScoreForTest(1.0, 3, 'forward');
      // Default config: backward penalty = 1.0, forward = 0.95
      expect(backward).toBeGreaterThanOrEqual(forward);
    });

    it('higher weight anchor can beat closer lower weight', () => {
      // weight 1.6 at distance 5 vs weight 1.0 at distance 2
      const heavy = __computeAnchorScoreForTest(1.6, 5, 'backward');
      const light = __computeAnchorScoreForTest(1.0, 2, 'backward');
      // This depends on λ, but with default λ=0.22, 1.6/(1+0.22*5) = 0.762 vs 1.0/(1+0.22*2) = 0.694
      expect(heavy).toBeGreaterThan(light);
    });

    it('score formula is correct: weight / (1 + λ*d) * dirPenalty', () => {
      const config = DEFAULT_SENSOR_CONFIG;
      const w = 1.3;
      const d = 4;
      const expected = (w / (1 + config.ANCHOR_DISTANCE_LAMBDA * d)) * config.ANCHOR_FORWARD_PENALTY;
      const actual = __computeAnchorScoreForTest(w, d, 'forward', config);
      expect(actual).toBeCloseTo(expected, 10);
    });
  });

  // ── COLLISION AUDIT ──────────────────────────────────────────────────────

  describe('collision audit', () => {
    it('returns collision audit for FR', () => {
      const ca = __getCollisionAuditForTest('fr');
      expect(ca).toHaveProperty('markerCollisions');
      expect(ca).toHaveProperty('anchorCollisions');
      expect(ca).toHaveProperty('totalCollisions');
      expect(ca.totalCollisions).toBe(ca.markerCollisions.length + ca.anchorCollisions.length);
    });

    it('returns collision audit for EN', () => {
      const ca = __getCollisionAuditForTest('en');
      expect(ca).toHaveProperty('totalCollisions');
    });

    it('collision entries have valid structure', () => {
      const ca = __getCollisionAuditForTest('fr');
      for (const c of ca.markerCollisions) {
        expect(c.word).toBeTruthy();
        expect(c.categories.length).toBeGreaterThan(1);
        expect(c.resolvedTo).toBeTruthy();
      }
    });
  });

  // ── CONFIG INJECTION ─────────────────────────────────────────────────────

  describe('config injection', () => {
    it('respects MIN_TOKENS override', () => {
      const strictConfig: SensorConfig = { ...DEFAULT_SENSOR_CONFIG, MIN_TOKENS: 1000 };
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', strictConfig);
      // FR_SENSORY is ~150 tokens, so with MIN_TOKENS=1000 it should return empty
      expect(r.valid_events).toBe(0);
      expect(r.raw_events).toBe(0);
    });

    it('respects ANCHOR_WINDOW override', () => {
      // With ANCHOR_WINDOW=1, very few anchors will be found
      const tightConfig: SensorConfig = { ...DEFAULT_SENSOR_CONFIG, ANCHOR_WINDOW: 1 };
      const rTight = extractSensoryFeatures(FR_SENSORY, 'fr', tightConfig);
      const rNormal = extractSensoryFeatures(FR_SENSORY, 'fr');
      // Tighter window should find fewer or equal valid events
      expect(rTight.valid_events).toBeLessThanOrEqual(rNormal.valid_events);
    });

    it('respects DENSITY_SCALE override', () => {
      const config2x: SensorConfig = { ...DEFAULT_SENSOR_CONFIG, DENSITY_SCALE: 2000 };
      const r1x = extractSensoryFeatures(FR_SENSORY, 'fr');
      const r2x = extractSensoryFeatures(FR_SENSORY, 'fr', config2x);
      // Density should scale proportionally (approximately 2x)
      if (r1x.sensor_density.density > 0) {
        const ratio = r2x.sensor_density.density / r1x.sensor_density.density;
        expect(ratio).toBeCloseTo(2.0, 0);
      }
    });
  });

  // ── assertSensorResults ──────────────────────────────────────────────────

  describe('assertSensorResults', () => {
    it('does not throw for valid results from extractSensoryFeatures', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr');
      expect(() => assertSensorResults(r)).not.toThrow();
    });

    it('does not throw for empty results', () => {
      const r = extractSensoryFeatures('', 'fr');
      expect(() => assertSensorResults(r)).not.toThrow();
    });

    it('throws when valid_events > raw_events', () => {
      const bad: SensorResults = {
        token_count: 100,
        valid_events: 10,
        raw_events: 5,   // invalid: valid > raw
        coverage_5s: { density: 0.2, variance: 0, burst_ratio: 1.0 },
        sensor_density: { density: 5, variance: 0, burst_ratio: 1.0 },
        body_binding: { density: 0.3, variance: 0, burst_ratio: 1.0 },
        concreteness_anchor: { density: 1.2, variance: 0, burst_ratio: 1.0 },
        diag: {
          anchor_ratio: 0.5,
          modality_counts: { visual: 4, auditory: 2, kinesthetic: 2, olfactory: 1, gustatory: 1 },
          density_raw: 50,
          binding_passive: 0.3,
          binding_reactive: 0.2,
          binding_interactive: 0.1,
          concreteness_by_level: { material: 0.3, object: 0.3, micro_detail: 0.2 },
        },
      };
      expect(() => assertSensorResults(bad)).toThrow('invariant violation');
    });

    it('throws when coverage_5s.density > 1.0', () => {
      const bad: SensorResults = {
        token_count: 100,
        valid_events: 5,
        raw_events: 10,
        coverage_5s: { density: 1.5, variance: 0, burst_ratio: 1.0 },
        sensor_density: { density: 5, variance: 0, burst_ratio: 1.0 },
        body_binding: { density: 0.3, variance: 0, burst_ratio: 1.0 },
        concreteness_anchor: { density: 1.2, variance: 0, burst_ratio: 1.0 },
        diag: {
          anchor_ratio: 0.5,
          modality_counts: { visual: 2, auditory: 1, kinesthetic: 1, olfactory: 1, gustatory: 0 },
          density_raw: 100,
          binding_passive: 0.3,
          binding_reactive: 0.2,
          binding_interactive: 0.1,
          concreteness_by_level: { material: 0.3, object: 0.3, micro_detail: 0.2 },
        },
      };
      expect(() => assertSensorResults(bad)).toThrow('invariant violation');
    });

    it('throws when burst_ratio < 1.0', () => {
      const bad: SensorResults = {
        token_count: 100,
        valid_events: 5,
        raw_events: 10,
        coverage_5s: { density: 0.2, variance: 0, burst_ratio: 0.5 },
        sensor_density: { density: 5, variance: 0, burst_ratio: 1.0 },
        body_binding: { density: 0.3, variance: 0, burst_ratio: 1.0 },
        concreteness_anchor: { density: 1.2, variance: 0, burst_ratio: 1.0 },
        diag: {
          anchor_ratio: 0.5,
          modality_counts: { visual: 2, auditory: 1, kinesthetic: 1, olfactory: 1, gustatory: 0 },
          density_raw: 100,
          binding_passive: 0.3,
          binding_reactive: 0.2,
          binding_interactive: 0.1,
          concreteness_by_level: { material: 0.3, object: 0.3, micro_detail: 0.2 },
        },
      };
      expect(() => assertSensorResults(bad)).toThrow('invariant violation');
    });
  });

  // ── VALID EVENTS HAVE anchor_distance AND anchor_score ──────────────────

  describe('SensoryEvent V2 fields', () => {
    it('valid events have anchor_distance > 0', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      for (const e of r.audit!.validEvents) {
        expect(e.anchor_distance).toBeGreaterThanOrEqual(1);
      }
    });

    it('valid events have anchor_score > 0', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      for (const e of r.audit!.validEvents) {
        expect(e.anchor_score).toBeGreaterThan(0);
      }
    });

    it('event_score = rarity_weight × anchor_score', () => {
      const r = extractSensoryFeatures(FR_SENSORY, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      for (const e of r.audit!.validEvents) {
        const expected = Math.round(e.rarity_weight * e.anchor_score * 10000) / 10000;
        expect(e.event_score).toBeCloseTo(expected, 3);
      }
    });
  });

  // ── CACHE RESET ──────────────────────────────────────────────────────────

  describe('cache reset', () => {
    it('produces identical results after cache reset', () => {
      const r1 = extractSensoryFeatures(FR_SENSORY, 'fr');
      __resetCacheForTest();
      const r2 = extractSensoryFeatures(FR_SENSORY, 'fr');
      expect(r1).toEqual(r2);
    });
  });

  // ── DEAD METAPHOR AUDIT ──────────────────────────────────────────────────

  describe('dead metaphor audit', () => {
    it('detects dead metaphors in audit mode', () => {
      const textWithDeadMetaphors = `
        Il voyait clair dans cette affaire. Le poids de la responsabilité
        écrasait ses épaules. La lumière du jour filtrait par la fenêtre de verre.
        Un silence éloquent régnait dans la pièce.
        Le goût du succès était sur ses lèvres.
        L'odeur de scandale planait dans l'air.
        Encore du texte pour dépasser les vingt tokens minimum nécessaires.
      `;
      const r = extractSensoryFeatures(textWithDeadMetaphors, 'fr', DEFAULT_SENSOR_CONFIG, { audit: true });
      expect(r.audit!.deadMetaphorCount).toBeGreaterThan(0);
      expect(r.audit!.deadMetaphorHits.length).toBe(r.audit!.deadMetaphorCount);
    });
  });
});
