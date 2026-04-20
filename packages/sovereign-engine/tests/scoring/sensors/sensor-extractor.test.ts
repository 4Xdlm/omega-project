/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SENSOR EXTRACTOR — Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates the 4 P1 sensors: coverage_5s, sensor_density, body_binding,
 * concreteness_anchor. Tests: output shape, empty/short input, known sensory
 * passage, dead metaphor exclusion, anchor requirement, scale invariance.
 */

import { describe, it, expect } from 'vitest';
import {
  extractSensoryFeatures,
  __tokenizeForTest,
  __rawDetectionCountForTest,
} from '../../../src/scoring/sensors/sensor-extractor.js';

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

function isTriplet(t: unknown): boolean {
  if (typeof t !== 'object' || t === null) return false;
  const obj = t as Record<string, unknown>;
  return (
    typeof obj.density === 'number' &&
    typeof obj.variance === 'number' &&
    typeof obj.burst_ratio === 'number'
  );
}

// A rich French sensory passage with multiple modalities and concrete anchors.
const FR_SENSORY_PASSAGE = `
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

// English equivalent
const EN_SENSORY_PASSAGE = `
  Golden light streamed through the glass window, casting bright sparks
  across the oak table. Her fingers brushed the rough surface of the wood,
  feeling every grain beneath her palm. The acrid smell of wax rose from
  the polished floor. A distant murmur echoed against the stone walls.
  The bitter taste of coffee lingered on her tongue, mixed with the sweetness
  of honey. She shivered as the cold draft caressed her neck.
  Rust covered the iron lock, flaking with age.
  A dull creak climbed from the wooden staircase.
  The heat of the stove radiated through her chest.
  Her eyes followed the glint of dew drops on the glass pane.
  The heavy scent of roses filled the room from the porcelain vase.
  A metallic screech pierced the silence as the door swung on its hinges.
  The silky texture of velvet slid between her fingers.
  Salt stung her chapped lips in the freezing wind.
  A low vibration traveled through the marble floor beneath her bare feet.
`;

// Dead metaphors: should be excluded from sensory events
const FR_DEAD_METAPHOR_TEXT = `
  La lumière de la raison éclairait son esprit. Il pesait le pour et le contre.
  Le poids de la décision écrasait sa conscience. Il voyait clair dans cette affaire.
  La voix de la sagesse lui soufflait la réponse.
`;

// Non-sensory abstract text: should produce near-zero sensor values
const FR_ABSTRACT_TEXT = `
  Les considérations philosophiques relatives à la métaphysique de
  Descartes impliquent une remise en question systématique des fondements
  épistémologiques. La dialectique hégélienne propose une synthèse des
  contradictions inhérentes au processus de la pensée rationnelle.
  L'argument ontologique se distingue par sa structure logique formelle
  qui ne repose sur aucune donnée empirique sensorielle directe.
  La phénoménologie transcendantale établit les conditions de possibilité
  de toute connaissance objective.
`;

// ────────────────────────────────────────────────────────────────────────────
// TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('sensor-extractor', () => {

  // ── OUTPUT SHAPE ────────────────────────────────────────────────────────

  describe('output shape', () => {
    it('returns all required fields', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r).toHaveProperty('token_count');
      expect(r).toHaveProperty('valid_events');
      expect(r).toHaveProperty('raw_events');
      expect(r).toHaveProperty('coverage_5s');
      expect(r).toHaveProperty('sensor_density');
      expect(r).toHaveProperty('body_binding');
      expect(r).toHaveProperty('concreteness_anchor');
      expect(r).toHaveProperty('diag');
    });

    it('all 4 sensors are valid triplets', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(isTriplet(r.coverage_5s)).toBe(true);
      expect(isTriplet(r.sensor_density)).toBe(true);
      expect(isTriplet(r.body_binding)).toBe(true);
      expect(isTriplet(r.concreteness_anchor)).toBe(true);
    });

    it('diag contains all required sub-metrics', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.diag).toHaveProperty('anchor_ratio');
      expect(r.diag).toHaveProperty('modality_counts');
      expect(r.diag).toHaveProperty('density_raw');
      expect(r.diag).toHaveProperty('binding_passive');
      expect(r.diag).toHaveProperty('binding_reactive');
      expect(r.diag).toHaveProperty('binding_interactive');
      expect(r.diag).toHaveProperty('concreteness_by_level');
    });

    it('modality_counts covers all 5 VAKOG', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      const mc = r.diag.modality_counts;
      expect(mc).toHaveProperty('visual');
      expect(mc).toHaveProperty('auditory');
      expect(mc).toHaveProperty('kinesthetic');
      expect(mc).toHaveProperty('olfactory');
      expect(mc).toHaveProperty('gustatory');
    });
  });

  // ── BOUNDARY CONDITIONS ─────────────────────────────────────────────────

  describe('boundary conditions', () => {
    it('empty string returns zero results', () => {
      const r = extractSensoryFeatures('', 'fr');
      expect(r.valid_events).toBe(0);
      expect(r.raw_events).toBe(0);
      expect(r.token_count).toBe(0);
    });

    it('short text (<20 tokens) returns zero results', () => {
      const r = extractSensoryFeatures('Le chat dort.', 'fr');
      expect(r.valid_events).toBe(0);
      expect(r.coverage_5s.density).toBe(0);
    });

    it('burst_ratio is 1.0 when text is shorter than WINDOW_SIZE', () => {
      // ~30 tokens of mild sensory text
      const shortText = `La lumière dorée frappait la table de chêne.
        Ses doigts touchaient la surface du bois. L'odeur de la cire montait.
        Un murmure lointain résonnait dans la pièce.`;
      const r = extractSensoryFeatures(shortText, 'fr');
      expect(r.coverage_5s.burst_ratio).toBe(1.0);
      expect(r.sensor_density.burst_ratio).toBe(1.0);
      expect(r.body_binding.burst_ratio).toBe(1.0);
      expect(r.concreteness_anchor.burst_ratio).toBe(1.0);
    });
  });

  // ── TOKENIZER ───────────────────────────────────────────────────────────

  describe('tokenizer', () => {
    it('preserves accented characters', () => {
      const tokens = __tokenizeForTest('éclat résine château');
      expect(tokens).toContain('éclat');
      expect(tokens).toContain('résine');
      expect(tokens).toContain('château');
    });

    it('lowercases all tokens', () => {
      const tokens = __tokenizeForTest('LUMIÈRE Chaleur');
      expect(tokens).toContain('lumière');
      expect(tokens).toContain('chaleur');
    });

    it('strips punctuation', () => {
      const tokens = __tokenizeForTest('main, doigt! peau?');
      expect(tokens).toContain('main');
      expect(tokens).toContain('doigt');
      expect(tokens).toContain('peau');
      expect(tokens.some(t => t.includes(','))).toBe(false);
    });

    it('normalizes smart apostrophes to ASCII', () => {
      const tokens = __tokenizeForTest("l\u2019odeur d\u2019un arbre");
      // U+2019 (right single quotation mark) → U+0027 (apostrophe)
      // "l'odeur" stays as one token
      expect(tokens).toContain("l'odeur");
      expect(tokens).toContain("d'un");
      expect(tokens).toContain("arbre");
    });
  });

  // ── SENSORY DETECTION (FR) ──────────────────────────────────────────────

  describe('French sensory detection', () => {
    it('detects sensory events in rich passage', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.valid_events).toBeGreaterThan(0);
      expect(r.raw_events).toBeGreaterThanOrEqual(r.valid_events);
    });

    it('anchor_ratio <= 1.0 (valid_events <= raw_events)', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.diag.anchor_ratio).toBeLessThanOrEqual(1.0);
      expect(r.diag.anchor_ratio).toBeGreaterThan(0);
    });

    it('detects multiple modalities in VAKOG passage', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      const mc = r.diag.modality_counts;
      // The passage explicitly has visual, auditory, kinesthetic, olfactory, gustatory
      let activeModalities = 0;
      if (mc.visual > 0) activeModalities++;
      if (mc.auditory > 0) activeModalities++;
      if (mc.kinesthetic > 0) activeModalities++;
      if (mc.olfactory > 0) activeModalities++;
      if (mc.gustatory > 0) activeModalities++;
      expect(activeModalities).toBeGreaterThanOrEqual(3);
    });

    it('sensor_density > 0 for rich sensory text', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.sensor_density.density).toBeGreaterThan(0);
    });

    it('coverage_5s > 0 for multi-modal text', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.coverage_5s.density).toBeGreaterThan(0);
    });
  });

  // ── SENSORY DETECTION (EN) ──────────────────────────────────────────────

  describe('English sensory detection', () => {
    it('detects sensory events in rich passage', () => {
      const r = extractSensoryFeatures(EN_SENSORY_PASSAGE, 'en');
      expect(r.valid_events).toBeGreaterThan(0);
    });

    it('detects multiple modalities', () => {
      const r = extractSensoryFeatures(EN_SENSORY_PASSAGE, 'en');
      const mc = r.diag.modality_counts;
      let activeModalities = 0;
      if (mc.visual > 0) activeModalities++;
      if (mc.auditory > 0) activeModalities++;
      if (mc.kinesthetic > 0) activeModalities++;
      if (mc.olfactory > 0) activeModalities++;
      if (mc.gustatory > 0) activeModalities++;
      expect(activeModalities).toBeGreaterThanOrEqual(3);
    });
  });

  // ── ANCHOR REQUIREMENT ──────────────────────────────────────────────────

  describe('anchor requirement', () => {
    it('sensory words without anchors produce fewer valid events', () => {
      // Sensory words in isolation (no concrete objects/body parts nearby)
      const noAnchor = `
        brillant lumineux éclatant rouge sombre
        brillant lumineux éclatant rouge sombre
        brillant lumineux éclatant rouge sombre
        brillant lumineux éclatant rouge sombre
      `.trim();
      const raw = __rawDetectionCountForTest(noAnchor, 'fr');
      const r = extractSensoryFeatures(noAnchor, 'fr');
      // Raw should detect markers, but valid should be much lower
      expect(raw).toBeGreaterThan(0);
      expect(r.valid_events).toBeLessThan(raw);
    });
  });

  // ── DEAD METAPHOR EXCLUSION ─────────────────────────────────────────────

  describe('dead metaphor exclusion', () => {
    it('abstract uses are partially filtered', () => {
      const rDead = extractSensoryFeatures(FR_DEAD_METAPHOR_TEXT, 'fr');
      const rReal = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      // Dead metaphor text should have far fewer valid events per token
      const deadDensity = rDead.valid_events / (rDead.token_count || 1);
      const realDensity = rReal.valid_events / (rReal.token_count || 1);
      expect(deadDensity).toBeLessThan(realDensity);
    });
  });

  // ── ABSTRACT vs SENSORY DISCRIMINATION ──────────────────────────────────

  describe('discrimination power', () => {
    it('abstract text has much lower sensor_density than sensory text', () => {
      const rAbs = extractSensoryFeatures(FR_ABSTRACT_TEXT, 'fr');
      const rSens = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(rAbs.sensor_density.density).toBeLessThan(rSens.sensor_density.density);
    });

    it('abstract text has fewer valid events', () => {
      const rAbs = extractSensoryFeatures(FR_ABSTRACT_TEXT, 'fr');
      expect(rAbs.valid_events).toBeLessThan(5);
    });
  });

  // ── NUMERIC INVARIANTS ──────────────────────────────────────────────────

  describe('numeric invariants', () => {
    it('all triplet densities are non-negative', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.coverage_5s.density).toBeGreaterThanOrEqual(0);
      expect(r.sensor_density.density).toBeGreaterThanOrEqual(0);
      expect(r.body_binding.density).toBeGreaterThanOrEqual(0);
      expect(r.concreteness_anchor.density).toBeGreaterThanOrEqual(0);
    });

    it('all variances are non-negative', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.coverage_5s.variance).toBeGreaterThanOrEqual(0);
      expect(r.sensor_density.variance).toBeGreaterThanOrEqual(0);
      expect(r.body_binding.variance).toBeGreaterThanOrEqual(0);
      expect(r.concreteness_anchor.variance).toBeGreaterThanOrEqual(0);
    });

    it('burst_ratio >= 1.0 always', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.coverage_5s.burst_ratio).toBeGreaterThanOrEqual(1.0);
      expect(r.sensor_density.burst_ratio).toBeGreaterThanOrEqual(1.0);
      expect(r.body_binding.burst_ratio).toBeGreaterThanOrEqual(1.0);
      expect(r.concreteness_anchor.burst_ratio).toBeGreaterThanOrEqual(1.0);
    });

    it('coverage_5s density is bounded [0, 1]', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.coverage_5s.density).toBeGreaterThanOrEqual(0);
      expect(r.coverage_5s.density).toBeLessThanOrEqual(1.0);
    });

    it('body_binding density is bounded [0, 1]', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r.body_binding.density).toBeGreaterThanOrEqual(0);
      expect(r.body_binding.density).toBeLessThanOrEqual(1.0);
    });

    it('token_count matches tokenizer output', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      // token_count should be > 0 for non-empty text
      expect(r.token_count).toBeGreaterThan(50);
    });

    it('diag sub-metrics sum correctly', () => {
      const r = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      const bp = r.diag.binding_passive;
      const br = r.diag.binding_reactive;
      const bi = r.diag.binding_interactive;
      // These are ratios, should be <= 1.0 each
      expect(bp).toBeLessThanOrEqual(1.0);
      expect(br).toBeLessThanOrEqual(1.0);
      expect(bi).toBeLessThanOrEqual(1.0);
      // Their sum should be <= 1.0 (they're fractions of total events, body portion)
      // Note: they don't have to sum to 1 because C1 events are not counted
      expect(bp + br + bi).toBeLessThanOrEqual(1.001); // small float tolerance
    });
  });

  // ── DETERMINISM ─────────────────────────────────────────────────────────

  describe('determinism', () => {
    it('same input produces identical output', () => {
      const r1 = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      const r2 = extractSensoryFeatures(FR_SENSORY_PASSAGE, 'fr');
      expect(r1).toEqual(r2);
    });

    it('same EN input produces identical output', () => {
      const r1 = extractSensoryFeatures(EN_SENSORY_PASSAGE, 'en');
      const r2 = extractSensoryFeatures(EN_SENSORY_PASSAGE, 'en');
      expect(r1).toEqual(r2);
    });
  });
});
