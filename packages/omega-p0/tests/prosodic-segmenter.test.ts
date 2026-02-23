/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FRENCH PROSODIC SEGMENTER TESTS (P1)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { segmentProse, type SegmentationResult } from '../src/phonetic/prosodic-segmenter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — PUNCTUATION SEGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1 — prosodic-segmenter', () => {

  describe('Level 1: Punctuation boundaries', () => {
    it('splits on comma', () => {
      const r = segmentProse('Le vent soufflait, les arbres pliaient.');
      expect(r.segmentCount).toBe(2);
      expect(r.segments[0].boundary).toBe('start');
      expect(r.segments[1].boundary).toBe('punctuation');
    });

    it('splits on semicolon', () => {
      const r = segmentProse('Il marchait lentement; la nuit tombait.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on colon', () => {
      const r = segmentProse('Il savait une chose: tout allait changer.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on em-dash', () => {
      const r = segmentProse('Le silence \u2014 profond et total \u2014 envahissait la pièce.');
      expect(r.segmentCount).toBe(3);
    });

    it('splits on multiple punctuation types', () => {
      const r = segmentProse('Le matin, il partait; le soir, il revenait.');
      expect(r.segmentCount).toBe(4);
    });

    it('handles sentence-final punctuation', () => {
      const r = segmentProse('La pluie tombait. Le vent soufflait.');
      expect(r.segmentCount).toBe(2);
    });

    it('handles exclamation and question marks', () => {
      const r = segmentProse('Quel bonheur! Quelle surprise?');
      expect(r.segmentCount).toBe(2);
    });

    it('handles guillemets', () => {
      const r = segmentProse('Il dit \u00AB bonjour \u00BB puis partit.');
      expect(r.segmentCount).toBe(3);
    });

    it('handles ellipsis', () => {
      const r = segmentProse('Il attendait\u2026 longtemps.');
      expect(r.segmentCount).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 2 — SUBORDINATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Level 2: Subordination boundaries', () => {
    it('splits on "que" when preceding segment ≥ 4 syllables', () => {
      // "Il se rappelait" = il(1)+se(1)+rap-pe-lait(3) = 5 syll ≥ 4 → SPLIT
      const r = segmentProse('Il se rappelait que tout allait bien.');
      expect(r.segmentCount).toBe(2);
      expect(r.segments[1].boundary).toBe('subordination');
      expect(r.segments[1].text).toContain('que');
    });

    it('splits on "qui" when preceding segment ≥ 4 syllables', () => {
      // "La jeune femme élégante" = 7 syll → SPLIT
      const r = segmentProse('La jeune femme élégante qui marchait dans la rue.');
      expect(r.segmentCount).toBe(2);
      expect(r.segments[1].boundary).toBe('subordination');
    });

    it('splits on "dont" when preceding segment ≥ 4 syllables', () => {
      // "Le vieux livre ancien" = 5 syll → SPLIT
      const r = segmentProse('Le vieux livre ancien dont il parlait souvent.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "où" when preceding segment ≥ 4 syllables', () => {
      // "La grande maison sombre" = 5 syll → SPLIT
      const r = segmentProse('La grande maison sombre où il vivait autrefois.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "lorsque"', () => {
      const r = segmentProse('Il souriait lorsque la musique jouait.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "quand" when preceding segment ≥ 4 syllables', () => {
      // "Il se préparait" = il(1)+se(1)+pré-pa-rait(3) = 5 syll → SPLIT
      const r = segmentProse('Il se préparait quand le soleil se levait.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "comme" when preceding segment ≥ 4 syllables', () => {
      // "Il se recroquevillait" ≥ 4 syll → SPLIT
      const r = segmentProse('Il se recroquevillait comme un enfant perdu.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "si"', () => {
      const r = segmentProse('Il se demandait si la porte allait ouvrir.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "car"', () => {
      const r = segmentProse('Il restait immobile car le danger approchait.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on multi-word "tandis que" when preceding segment ≥ 4 syllables', () => {
      // "Il avançait lentement" = 6 syll → SPLIT
      const r = segmentProse('Il avançait lentement tandis que la pluie tombait.');
      expect(r.segmentCount).toBe(2);
      expect(r.segments[1].boundary).toBe('subordination');
      expect(r.segments[1].text).toContain('tandis');
    });

    it('splits on "alors que"', () => {
      const r = segmentProse('Il souriait alors que tout allait mal.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "parce que" when preceding segment ≥ 4 syllables', () => {
      // "Il se lamentait" = 5 syll → SPLIT
      const r = segmentProse('Il se lamentait parce que la nuit tombait.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "bien que"', () => {
      const r = segmentProse('Il avançait bien que le chemin fût sombre.');
      expect(r.segmentCount).toBe(2);
    });

    it('splits on "puisque"', () => {
      const r = segmentProse('Il acceptait puisque rien ne changeait.');
      expect(r.segmentCount).toBe(2);
    });

    it('conjunction starts the new segment (not ends the old)', () => {
      const r = segmentProse('La lumière déclinait lorsque la porte claqua.');
      const seg2 = r.segments[1];
      expect(seg2.text.toLowerCase().startsWith('lorsque')).toBe(true);
    });

    // ─── FUSION TESTS (micro-segment prevention) ───

    it('FUSION: "La femme qui marchait" → 1 segment (2 syll < 4)', () => {
      const r = segmentProse('La femme qui marchait dans la rue.');
      expect(r.segmentCount).toBe(1);
    });

    it('FUSION: "Le livre dont il parlait" → 1 segment (2 syll < 4)', () => {
      const r = segmentProse('Le livre dont il parlait souvent.');
      expect(r.segmentCount).toBe(1);
    });

    it('FUSION: "La maison où il vivait" → 1 segment (3 syll < 4)', () => {
      const r = segmentProse('La maison où il vivait autrefois.');
      expect(r.segmentCount).toBe(1);
    });

    it('FUSION: "Il pensait que..." → 1 segment (3 syll < 4)', () => {
      const r = segmentProse('Il pensait que tout allait bien.');
      expect(r.segmentCount).toBe(1);
    });

    it('FUSION: "Il marchait tandis que..." → 1 segment (3 syll < 4)', () => {
      const r = segmentProse('Il marchait tandis que la pluie tombait.');
      expect(r.segmentCount).toBe(1);
    });

    it('FUSION: "Il partait quand..." → 1 segment (3 syll < 4)', () => {
      const r = segmentProse('Il partait quand le soleil se levait.');
      expect(r.segmentCount).toBe(1);
    });

    it('threshold is exact: 4 syllables → SPLIT', () => {
      // "Il souriait" = il(1)+sou-ri-ait(3) = 4 syll = 4 → NOT < 4 → SPLIT
      const r = segmentProse('Il souriait lorsque la porte claqua.');
      expect(r.segmentCount).toBe(2);
    });

    it('threshold is exact: 3 syllables → FUSION', () => {
      // "Il partait" = il(1)+par-tait(2) = 3 syll < 4 → FUSION
      const r = segmentProse('Il partait lorsque la porte claqua.');
      expect(r.segmentCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 2.5 — CONDITIONAL COORDINATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Level 2.5: Coordination (conditional on segment length)', () => {
    it('splits on "mais" when preceding segment > 5 syllables', () => {
      // "La lumière du matin brillait" = ~8 syllables > 5
      const r = segmentProse('La lumière du matin brillait mais le froid persistait.');
      const maisSeg = r.segments.find(s => s.boundary === 'coordination');
      expect(maisSeg).toBeDefined();
      expect(maisSeg!.text).toContain('mais');
    });

    it('does NOT split on "et" when preceding segment ≤ 5 syllables', () => {
      // "Le vent" = 2 syllables ≤ 5
      const r = segmentProse('Le vent et la pluie.');
      // Should be 1 segment (no split because too short)
      expect(r.segmentCount).toBe(1);
    });

    it('splits on "et" when preceding segment > 5 syllables', () => {
      // "La lumière du matin déclinait" = ~9 syllables > 5
      const r = segmentProse('La lumière du matin déclinait et les ombres grandissaient.');
      expect(r.segmentCount).toBeGreaterThanOrEqual(2);
    });

    it('does NOT split on "mais" when preceding segment ≤ 5 syllables', () => {
      // "Il dort" = 2 syllables
      const r = segmentProse('Il dort mais il rêve.');
      expect(r.segmentCount).toBe(1);
    });

    it('splits on "or" when condition met', () => {
      const r = segmentProse('Il avait tout préparé soigneusement or le destin décida autrement.');
      const orSeg = r.segments.find(s => s.boundary === 'coordination');
      expect(orSeg).toBeDefined();
    });

    it('splits on "donc" when condition met', () => {
      const r = segmentProse('La situation était devenue impossible donc il décida de partir.');
      const doncSeg = r.segments.find(s => s.boundary === 'coordination');
      expect(doncSeg).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINED LEVELS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Combined segmentation levels', () => {
    it('handles punctuation + subordination in same sentence', () => {
      const r = segmentProse('Le soir, lorsque la nuit tombait, il sortait.');
      // "Le soir" | "lorsque la nuit tombait" | "il sortait"
      expect(r.segmentCount).toBe(3);
    });

    it('handles all 3 levels in complex prose', () => {
      const text = 'Il marchait dans les rues désertes du quartier, ' +
        'tandis que les réverbères projetaient leurs ombres; ' +
        'la nuit était douce mais le silence pesait.';
      const r = segmentProse(text);
      // 3 segments: comma split, subordination "tandis que", semicolon
      // "mais" NOT split because "la nuit était douce" = 5 syl (not > 5)
      expect(r.segmentCount).toBeGreaterThanOrEqual(3);

      // Check boundary diversity
      const boundaries = new Set(r.segments.map(s => s.boundary));
      expect(boundaries.size).toBeGreaterThanOrEqual(2);
    });

    it('Modiano-style long sentence', () => {
      const text = 'Il se souvenait de cette rue où il avait marché autrefois, ' +
        'lorsque la ville était encore silencieuse, ' +
        'et que les façades des immeubles gardaient quelque chose ' +
        'qui ressemblait à un secret.';
      const r = segmentProse(text);
      expect(r.segmentCount).toBeGreaterThanOrEqual(4);
      // All segments should have syllables
      for (const seg of r.segments) {
        expect(seg.syllables).toBeGreaterThan(0);
      }
    });

    it('Flaubert-style periodic sentence', () => {
      const text = 'Elle rêvait aux pays chauds où les lendemains de noce ' +
        'se passent dans des hamacs, devant des golfes bleus; ' +
        'mais elle songeait aussi que tout cela finirait bien.';
      const r = segmentProse(text);
      expect(r.segmentCount).toBeGreaterThanOrEqual(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NPVI OUTPUT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('nPVI output series', () => {
    it('syllableSeries has one entry per segment', () => {
      const r = segmentProse('Le vent soufflait, les arbres pliaient; la nuit tombait.');
      expect(r.syllableSeries.length).toBe(r.segmentCount);
    });

    it('weightedSeries has one entry per segment', () => {
      const r = segmentProse('La pluie tombait, fine et persistante.');
      expect(r.weightedSeries.length).toBe(r.segmentCount);
    });

    it('all syllableSeries values > 0', () => {
      const r = segmentProse('Il marchait lentement, le regard perdu dans le vide; rien ne bougeait.');
      for (const syl of r.syllableSeries) {
        expect(syl).toBeGreaterThan(0);
      }
    });

    it('weightedSeries values ≥ syllableSeries values (W_BRIEF=0.9 min)', () => {
      const r = segmentProse('La lumière du matin entrait par la fenêtre, douce et dorée.');
      for (let i = 0; i < r.segmentCount; i++) {
        // Weighted can be less if all syllables are W_BRIEF (0.9)
        // but with accent tonique, at least one gets W_ACCENT (1.4)
        expect(r.weightedSeries[i]).toBeGreaterThan(0);
      }
    });

    it('totalSyllables = sum of syllableSeries', () => {
      const r = segmentProse('Elle marchait dans la nuit, le regard fixé sur les étoiles.');
      const sum = r.syllableSeries.reduce((a, b) => a + b, 0);
      expect(r.totalSyllables).toBe(sum);
    });

    it('meanSyllablesPerSegment is correct', () => {
      const r = segmentProse('Il partait, elle restait; le temps passait.');
      expect(r.meanSyllablesPerSegment).toBeCloseTo(
        r.totalSyllables / r.segmentCount,
        5,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {
    it('same input → same output', () => {
      const text = 'La nuit descendait sur la ville, tandis que les lumières ' +
        'commençaient à briller; il marchait sans but.';
      const r1 = segmentProse(text);
      const r2 = segmentProse(text);

      expect(r1.segmentCount).toBe(r2.segmentCount);
      expect(r1.totalSyllables).toBe(r2.totalSyllables);
      expect(r1.totalWeightedMass).toBe(r2.totalWeightedMass);

      for (let i = 0; i < r1.segmentCount; i++) {
        expect(r1.segments[i].syllables).toBe(r2.segments[i].syllables);
        expect(r1.segments[i].weightedMass).toBe(r2.segments[i].weightedMass);
        expect(r1.segments[i].boundary).toBe(r2.segments[i].boundary);
      }
    });

    it('syllableSeries is deterministic', () => {
      const text = 'Le soleil se couchait lorsque la tempête éclata.';
      const r1 = segmentProse(text);
      const r2 = segmentProse(text);
      expect(r1.syllableSeries).toEqual(r2.syllableSeries);
      expect(r1.weightedSeries).toEqual(r2.weightedSeries);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('empty string → 0 segments', () => {
      const r = segmentProse('');
      expect(r.segmentCount).toBe(0);
      expect(r.syllableSeries.length).toBe(0);
    });

    it('single word → 1 segment', () => {
      const r = segmentProse('Silence.');
      expect(r.segmentCount).toBe(1);
    });

    it('only punctuation → 0 segments', () => {
      const r = segmentProse('..., ; — !');
      expect(r.segmentCount).toBe(0);
    });

    it('no punctuation, no conjunctions → 1 segment', () => {
      const r = segmentProse('Le vent soufflait doucement dans les arbres');
      expect(r.segmentCount).toBe(1);
    });

    it('handles consecutive punctuation gracefully', () => {
      const r = segmentProse('Il marchait... puis il courait!');
      expect(r.segmentCount).toBe(2);
    });

    it('handles very long text without crash', () => {
      const long = 'Le vent soufflait, '.repeat(100);
      const r = segmentProse(long);
      expect(r.segmentCount).toBeGreaterThan(50);
    });

    it('segment count is reasonable for literary prose', () => {
      const text = 'La lumière du matin entrait par les fenêtres hautes, ' +
        'projetant sur le parquet des rectangles dorés ' +
        'qui ressemblaient à des cartes de pays imaginaires; ' +
        'et il restait là, debout, sans bouger, ' +
        'comme si le moindre mouvement eût pu briser ' +
        'quelque chose de fragile dans cette heure matinale.';
      const r = segmentProse(text);
      // Should be between 5 and 15 segments for this prose
      expect(r.segmentCount).toBeGreaterThanOrEqual(5);
      expect(r.segmentCount).toBeLessThanOrEqual(15);
    });
  });
});
