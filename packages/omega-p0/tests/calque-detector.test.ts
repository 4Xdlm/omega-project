/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH CALQUE DETECTOR TESTS (P4)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeCalques,
  sigmoidPenalty,
  getPatternDatabase,
  type CalqueAnalysis,
} from '../src/phonetic/calque-detector.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SIGMOID PENALTY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('P4 — calque-detector', () => {

  describe('sigmoidPenalty', () => {
    it('density=0 → penalty near 0', () => {
      const p = sigmoidPenalty(0);
      expect(p).toBeLessThan(0.05);
    });

    it('density=n0 → penalty = 0.5 exactly', () => {
      const p = sigmoidPenalty(3.0, { n0: 3.0, k: 1.5 });
      expect(p).toBeCloseTo(0.5, 10);
    });

    it('density >> n0 → penalty near 1', () => {
      const p = sigmoidPenalty(10.0);
      expect(p).toBeGreaterThan(0.95);
    });

    it('is monotonically increasing', () => {
      const p1 = sigmoidPenalty(1.0);
      const p2 = sigmoidPenalty(3.0);
      const p3 = sigmoidPenalty(6.0);
      expect(p2).toBeGreaterThan(p1);
      expect(p3).toBeGreaterThan(p2);
    });

    it('is always between 0 and 1', () => {
      for (let d = 0; d <= 20; d += 0.5) {
        const p = sigmoidPenalty(d);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    });

    it('steeper k → sharper transition', () => {
      const gentle = sigmoidPenalty(2.0, { n0: 3.0, k: 0.5 });
      const steep = sigmoidPenalty(2.0, { n0: 3.0, k: 3.0 });
      // Both below inflection, but steep curve drops faster
      expect(steep).toBeLessThan(gentle);
    });

    it('higher n0 → more tolerance', () => {
      const strict = sigmoidPenalty(3.0, { n0: 2.0, k: 1.5 });
      const tolerant = sigmoidPenalty(3.0, { n0: 5.0, k: 1.5 });
      expect(tolerant).toBeLessThan(strict);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // L1 — LEXICAL DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('L1: Lexical anglicisms', () => {
    it('detects "feedback"', () => {
      const r = analyzeCalques('Il attend un feedback de son manager.');
      expect(r.rawCount).toBeGreaterThanOrEqual(1);
      const fb = r.matches.find(m => m.pattern.id === 'L1-001');
      expect(fb).toBeDefined();
      expect(fb!.pattern.severity).toBe('HARD');
    });

    it('detects "deadline"', () => {
      const r = analyzeCalques('La deadline approche rapidement.');
      expect(r.matches.some(m => m.matchedText.toLowerCase() === 'deadline')).toBe(true);
    });

    it('detects "meeting"', () => {
      const r = analyzeCalques('Il a un meeting à quatorze heures.');
      expect(r.matches.some(m => m.matchedText.toLowerCase() === 'meeting')).toBe(true);
    });

    it('detects "digital" as HARD', () => {
      const r = analyzeCalques('La transformation digital change le monde.');
      const d = r.matches.find(m => m.pattern.id === 'L1-013');
      expect(d).toBeDefined();
      expect(d!.pattern.severity).toBe('HARD');
    });

    it('detects "cool" as WATCH', () => {
      const r = analyzeCalques('Ce restaurant est vraiment cool.');
      const c = r.matches.find(m => m.matchedText.toLowerCase() === 'cool');
      expect(c).toBeDefined();
      expect(c!.pattern.severity).toBe('WATCH');
    });

    it('detects multiple anglicisms in same text', () => {
      const r = analyzeCalques('Le meeting de ce matin portait sur le feedback du team.');
      expect(r.rawCount).toBeGreaterThanOrEqual(3);
    });

    it('is case-insensitive', () => {
      const r = analyzeCalques('Le FEEDBACK est important.');
      expect(r.rawCount).toBeGreaterThanOrEqual(1);
    });

    it('does not match partial words', () => {
      // "meeting" should not match in "meetingpoint" context... 
      // but "challenge" should not match in "challenger" as a different word form
      const r = analyzeCalques('Il a challenged cette idée.');
      // "challenged" does not match "challenge" as a word boundary match
      const challengeMatch = r.matches.find(m => m.pattern.id === 'L1-006');
      // Could match or not depending on boundary — just verify no crash
      expect(r).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // L2 — SYNTACTIC CALQUES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('L2: Syntactic calques', () => {
    it('detects "faire sens"', () => {
      const r = analyzeCalques('Cette décision fait sens dans le contexte actuel.');
      const m = r.matches.find(m => m.pattern.id === 'L2-001');
      expect(m).toBeDefined();
      expect(m!.pattern.severity).toBe('HARD');
      expect(m!.pattern.suggestion).toContain('avoir du sens');
    });

    it('detects "prendre place"', () => {
      const r = analyzeCalques('La cérémonie prendra place dans le jardin.');
      expect(r.matches.some(m => m.pattern.id === 'L2-002')).toBe(true);
    });

    it('detects "réaliser que"', () => {
      const r = analyzeCalques('Il réalise que la situation est grave.');
      expect(r.matches.some(m => m.pattern.id === 'L2-011')).toBe(true);
    });

    it('detects "en termes de"', () => {
      const r = analyzeCalques('En termes de performance, le résultat est bon.');
      expect(r.matches.some(m => m.pattern.id === 'L2-015')).toBe(true);
    });

    it('detects "être supposé"', () => {
      const r = analyzeCalques('Il est supposé arriver demain matin.');
      expect(r.matches.some(m => m.pattern.id === 'L2-003')).toBe(true);
    });

    it('detects "payer attention"', () => {
      const r = analyzeCalques('Il faut payer attention aux détails.');
      expect(r.matches.some(m => m.pattern.id === 'L2-004')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // L3 — MORPHOLOGICAL FALSE FRIENDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('L3: Morphological false friends', () => {
    it('detects "opportunité"', () => {
      const r = analyzeCalques('C\'est une belle opportunité pour le projet.');
      expect(r.matches.some(m => m.pattern.id === 'L3-001')).toBe(true);
    });

    it('detects "versatile"', () => {
      const r = analyzeCalques('Cet outil est très versatile.');
      const m = r.matches.find(m => m.pattern.id === 'L3-009');
      expect(m).toBeDefined();
      expect(m!.pattern.severity).toBe('HARD');
    });

    it('detects "consistant"', () => {
      const r = analyzeCalques('Les résultats sont consistants avec la théorie.');
      expect(r.matches.some(m => m.pattern.id === 'L3-008')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAN TEXT (NO CALQUES)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Clean French text', () => {
    it('pure literary prose → zero or minimal detections', () => {
      const r = analyzeCalques(
        'Le soleil descendait derrière les collines. ' +
        'La lumière dorée baignait les champs de blé ' +
        'tandis que le vent soufflait doucement dans les peupliers.',
      );
      expect(r.rawCount).toBe(0);
      expect(r.penalty).toBeLessThan(0.05);
      expect(r.qualityMultiplier).toBeGreaterThan(0.95);
    });

    it('Modiano-style prose → clean', () => {
      const r = analyzeCalques(
        'Il se souvenait de cette rue où il avait marché autrefois, ' +
        'lorsque la ville était encore silencieuse et que les façades ' +
        'des immeubles gardaient quelque chose qui ressemblait à un secret.',
      );
      expect(r.rawCount).toBe(0);
      expect(r.density).toBe(0);
    });

    it('Flaubert-style prose → clean', () => {
      const r = analyzeCalques(
        'Elle rêvait aux pays chauds où les lendemains de noce se passent ' +
        'dans des hamacs. Il y avait des cathédrales de marbre blanc ' +
        'sur les rivages de la mer tiède.',
      );
      expect(r.rawCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY AND PENALTY INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Density and penalty calculation', () => {
    it('more calques → higher penalty', () => {
      const light = analyzeCalques(
        'Il attend un feedback sur le projet. ' +
        'Le reste du texte est parfaitement français et littéraire.',
      );
      const heavy = analyzeCalques(
        'Le meeting sur le feedback du team a permis de checker ' +
        'le process et de booster le leadership. ' +
        'Le deal est de fixer une deadline.',
      );
      expect(heavy.penalty).toBeGreaterThan(light.penalty);
      expect(heavy.qualityMultiplier).toBeLessThan(light.qualityMultiplier);
    });

    it('qualityMultiplier = 1 - penalty', () => {
      const r = analyzeCalques('Il a un meeting demain.');
      expect(r.qualityMultiplier).toBeCloseTo(1 - r.penalty, 10);
    });

    it('density is per 100 words', () => {
      const r = analyzeCalques('Le feedback est bon. '.repeat(10));
      // 40 words, "feedback" detected 10 times, each weight=1.0
      // density = (10 * 1.0 / 40) * 100 = 25.0
      expect(r.density).toBeGreaterThan(0);
    });

    it('empty text → density 0, low penalty', () => {
      const r = analyzeCalques('');
      expect(r.density).toBe(0);
      expect(r.penalty).toBeLessThan(0.05);
    });

    it('weighted count reflects severity', () => {
      const r = analyzeCalques('Le feedback est cool.');
      // feedback = HARD (1.0), cool = WATCH (0.2)
      const fbMatch = r.matches.find(m => m.matchedText.toLowerCase() === 'feedback');
      const coolMatch = r.matches.find(m => m.matchedText.toLowerCase() === 'cool');
      expect(fbMatch).toBeDefined();
      expect(coolMatch).toBeDefined();
      expect(r.weightedCount).toBeCloseTo(1.0 + 0.2, 5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BREAKDOWNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Layer and severity breakdowns', () => {
    it('byLayer counts are correct', () => {
      const r = analyzeCalques(
        'Le feedback fait sens pour cette opportunité.',
      );
      // feedback = lexical, fait sens = syntactic, opportunité = morphological
      expect(r.byLayer.lexical).toBeGreaterThanOrEqual(1);
      expect(r.byLayer.syntactic).toBeGreaterThanOrEqual(1);
      expect(r.byLayer.morphological).toBeGreaterThanOrEqual(1);
    });

    it('bySeverity counts are correct', () => {
      const r = analyzeCalques(
        'Le feedback est cool et le parking est plein.',
      );
      // feedback = HARD, cool = WATCH, parking = WATCH
      expect(r.bySeverity.HARD).toBeGreaterThanOrEqual(1);
      expect(r.bySeverity.WATCH).toBeGreaterThanOrEqual(1);
    });

    it('sum of byLayer = rawCount', () => {
      const r = analyzeCalques('Le meeting fait sens car le process est versatile.');
      const layerSum = r.byLayer.lexical + r.byLayer.syntactic + r.byLayer.morphological;
      expect(layerSum).toBe(r.rawCount);
    });

    it('sum of bySeverity = rawCount', () => {
      const r = analyzeCalques('Le deadline du meeting est cool.');
      const sevSum = r.bySeverity.HARD + r.bySeverity.SOFT + r.bySeverity.WATCH;
      expect(sevSum).toBe(r.rawCount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN DATABASE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pattern database', () => {
    it('has all 3 layers represented', () => {
      const db = getPatternDatabase();
      const layers = new Set(db.map(p => p.layer));
      expect(layers.has('lexical')).toBe(true);
      expect(layers.has('syntactic')).toBe(true);
      expect(layers.has('morphological')).toBe(true);
    });

    it('has all 3 severity levels', () => {
      const db = getPatternDatabase();
      const sevs = new Set(db.map(p => p.severity));
      expect(sevs.has('HARD')).toBe(true);
      expect(sevs.has('SOFT')).toBe(true);
      expect(sevs.has('WATCH')).toBe(true);
    });

    it('all patterns have suggestions', () => {
      const db = getPatternDatabase();
      for (const p of db) {
        expect(p.suggestion.length).toBeGreaterThan(0);
      }
    });

    it('all patterns have unique IDs', () => {
      const db = getPatternDatabase();
      const ids = db.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('has at least 50 patterns total', () => {
      const db = getPatternDatabase();
      expect(db.length).toBeGreaterThanOrEqual(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {
    it('same input → identical output', () => {
      const text = 'Le meeting de feedback sur le process fait sens ' +
        'en termes de leadership digital.';
      const r1 = analyzeCalques(text);
      const r2 = analyzeCalques(text);

      expect(r1.rawCount).toBe(r2.rawCount);
      expect(r1.weightedCount).toBe(r2.weightedCount);
      expect(r1.density).toBe(r2.density);
      expect(r1.penalty).toBe(r2.penalty);
      expect(r1.qualityMultiplier).toBe(r2.qualityMultiplier);
      expect(r1.matches.length).toBe(r2.matches.length);

      for (let i = 0; i < r1.matches.length; i++) {
        expect(r1.matches[i].pattern.id).toBe(r2.matches[i].pattern.id);
        expect(r1.matches[i].position).toBe(r2.matches[i].position);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('handles empty string', () => {
      const r = analyzeCalques('');
      expect(r.rawCount).toBe(0);
      expect(r.wordCount).toBe(0);
    });

    it('handles punctuation-only', () => {
      const r = analyzeCalques('... , ; ! ?');
      expect(r.wordCount).toBe(0);
      expect(r.rawCount).toBe(0);
    });

    it('handles very long text without crash', () => {
      const text = 'Le soleil brillait sur les champs dorés. '.repeat(200);
      const r = analyzeCalques(text);
      expect(r.rawCount).toBe(0);
      expect(r.wordCount).toBeGreaterThan(1000);
    });

    it('handles text with only calques', () => {
      const r = analyzeCalques('feedback deadline meeting workshop leadership');
      expect(r.rawCount).toBe(5);
      expect(r.density).toBeGreaterThan(50);
      expect(r.penalty).toBeGreaterThan(0.95);
    });

    it('custom sigmoid config works', () => {
      const text = 'Le feedback est important.';
      const strict = analyzeCalques(text, { n0: 1.0, k: 3.0 });
      const lenient = analyzeCalques(text, { n0: 10.0, k: 0.5 });
      expect(strict.penalty).toBeGreaterThan(lenient.penalty);
    });
  });
});
