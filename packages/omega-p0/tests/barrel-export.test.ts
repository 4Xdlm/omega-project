/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — BARREL EXPORT TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates that the public API surface is complete and stable.
 * This is the "API snapshot" — if an export disappears, this test fails.
 */

import { describe, it, expect } from 'vitest';
import {
  // Constants
  VERSION,
  SCORER_SCHEMA_VERSION,
  MODULE_COUNT,
  // P8 — primary API
  scoreGenius,
  // P0
  countWordSyllables,
  // P1
  segmentProse,
  // P2
  analyzeRhythm,
  analyzeRhythmFromSegments,
  // P3
  analyzeEuphony,
  // P4
  analyzeCalques,
  // P5
  analyzeDensity,
  // P6
  analyzeSurprise,
  // P7
  analyzeInevitability,
} from '../src/index.js';

describe('Barrel Export — Public API Surface', () => {

  describe('Constants', () => {

    it('VERSION is semver string', () => {
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('SCORER_SCHEMA_VERSION is defined', () => {
      expect(SCORER_SCHEMA_VERSION).toBe('GENIUS_SCHEMA_V1');
    });

    it('MODULE_COUNT = 10', () => {
      expect(MODULE_COUNT).toBe(10);
    });
  });

  describe('All exports are functions', () => {

    it('scoreGenius is a function', () => {
      expect(typeof scoreGenius).toBe('function');
    });

    it('countWordSyllables is a function', () => {
      expect(typeof countWordSyllables).toBe('function');
    });

    it('segmentProse is a function', () => {
      expect(typeof segmentProse).toBe('function');
    });

    it('analyzeRhythm is a function', () => {
      expect(typeof analyzeRhythm).toBe('function');
    });

    it('analyzeRhythmFromSegments is a function', () => {
      expect(typeof analyzeRhythmFromSegments).toBe('function');
    });

    it('analyzeEuphony is a function', () => {
      expect(typeof analyzeEuphony).toBe('function');
    });

    it('analyzeCalques is a function', () => {
      expect(typeof analyzeCalques).toBe('function');
    });

    it('analyzeDensity is a function', () => {
      expect(typeof analyzeDensity).toBe('function');
    });

    it('analyzeSurprise is a function', () => {
      expect(typeof analyzeSurprise).toBe('function');
    });

    it('analyzeInevitability is a function', () => {
      expect(typeof analyzeInevitability).toBe('function');
    });
  });

  describe('End-to-end via barrel', () => {

    const TEXT = 'Le crépuscule mordoré enveloppait les collines lointaines.';

    it('scoreGenius returns valid GeniusAnalysis', () => {
      const r = scoreGenius(TEXT);
      expect(r.geniusScore).toBeGreaterThanOrEqual(0);
      expect(r.geniusScore).toBeLessThanOrEqual(100);
      expect(r.axes.density).toBeDefined();
      expect(r.axes.surprise).toBeDefined();
      expect(r.axes.inevitability).toBeDefined();
      expect(r.axes.resonance).toBeDefined();
      expect(r.axes.voice).toBeDefined();
    });

    it('countWordSyllables returns syllable data', () => {
      const r = countWordSyllables('crépuscule');
      expect(r.count).toBeGreaterThan(0);
    });

    it('segmentProse returns segments', () => {
      const r = segmentProse(TEXT);
      expect(r.segments.length).toBeGreaterThan(0);
    });

    it('analyzeRhythm returns rhythm data', () => {
      const r = analyzeRhythm(TEXT);
      expect(r.npvi_raw).toBeGreaterThanOrEqual(0);
    });

    it('analyzeEuphony returns euphony data', () => {
      const r = analyzeEuphony(TEXT);
      expect(r.euphonyScore).toBeGreaterThanOrEqual(0);
    });

    it('analyzeCalques returns calque data', () => {
      const r = analyzeCalques(TEXT);
      expect(r.penalty).toBeGreaterThanOrEqual(0);
    });

    it('analyzeDensity returns density data', () => {
      const r = analyzeDensity(TEXT);
      expect(r.lexicalDensity).toBeGreaterThan(0);
    });

    it('analyzeSurprise returns surprise data', () => {
      const r = analyzeSurprise(TEXT);
      expect(r.shannonEntropy).toBeGreaterThan(0);
    });

    it('analyzeInevitability returns inevitability data', () => {
      const r = analyzeInevitability(TEXT);
      expect(r.sentenceCount).toBeGreaterThan(0);
    });

    it('determinism: scoreGenius same input → same output', () => {
      const r1 = scoreGenius(TEXT);
      const r2 = scoreGenius(TEXT);
      expect(r1.geniusScore).toBe(r2.geniusScore);
    });
  });
});
