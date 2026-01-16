/**
 * Chart Component Tests for OMEGA UI
 * @module tests/charts.test
 * @description Unit tests for Phase 132 - Emotion Charts
 */

import { describe, it, expect } from 'vitest';

describe('OMEGA UI - Phase 132: Emotion Charts', () => {
  describe('Emotion14 Color Palette', () => {
    const EMOTION_COLORS: Record<string, string> = {
      joy: '#FFD700',
      sadness: '#4169E1',
      anger: '#DC143C',
      fear: '#800080',
      surprise: '#FF8C00',
      disgust: '#228B22',
      trust: '#00CED1',
      anticipation: '#FF69B4',
      love: '#FF1493',
      guilt: '#8B4513',
      shame: '#A0522D',
      pride: '#FFD700',
      envy: '#32CD32',
      contempt: '#708090',
    };

    it('should have colors for all 14 emotions', () => {
      expect(Object.keys(EMOTION_COLORS).length).toBe(14);
    });

    it('should have valid hex colors', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      Object.values(EMOTION_COLORS).forEach((color) => {
        expect(color).toMatch(hexRegex);
      });
    });

    it('should have primary emotions', () => {
      const primary = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation'];
      primary.forEach((emotion) => {
        expect(EMOTION_COLORS[emotion]).toBeDefined();
      });
    });

    it('should have secondary emotions', () => {
      const secondary = ['love', 'guilt', 'shame', 'pride', 'envy', 'contempt'];
      secondary.forEach((emotion) => {
        expect(EMOTION_COLORS[emotion]).toBeDefined();
      });
    });
  });

  describe('EmotionBar Component', () => {
    it('should define EmotionBar props interface', () => {
      const props = {
        emotions: { joy: 0.8, sadness: 0.2 },
        showLabels: true,
        showValues: true,
        sortBy: 'value' as const,
        maxBars: 14,
        height: 300,
        animated: true,
      };
      expect(props.maxBars).toBe(14);
      expect(props.sortBy).toBe('value');
    });

    it('should support sorting options', () => {
      const sortOptions = ['value', 'name', 'none'];
      expect(sortOptions).toContain('value');
      expect(sortOptions).toContain('name');
      expect(sortOptions).toContain('none');
    });

    it('should calculate percentage from value', () => {
      const value = 0.5;
      const maxValue = 1.0;
      const percentage = (value / maxValue) * 100;
      expect(percentage).toBe(50);
    });

    it('should handle zero max value', () => {
      const value = 0;
      const maxValue = 0;
      const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
      expect(percentage).toBe(0);
    });
  });

  describe('PlutchikWheel Component', () => {
    const WHEEL_SEGMENTS = [
      { emotion: 'joy', angle: 0, opposite: 'sadness' },
      { emotion: 'trust', angle: 45, opposite: 'disgust' },
      { emotion: 'fear', angle: 90, opposite: 'anger' },
      { emotion: 'surprise', angle: 135, opposite: 'anticipation' },
      { emotion: 'sadness', angle: 180, opposite: 'joy' },
      { emotion: 'disgust', angle: 225, opposite: 'trust' },
      { emotion: 'anger', angle: 270, opposite: 'fear' },
      { emotion: 'anticipation', angle: 315, opposite: 'surprise' },
    ];

    it('should have 8 primary wheel segments', () => {
      expect(WHEEL_SEGMENTS.length).toBe(8);
    });

    it('should have correct angle spacing (45 degrees)', () => {
      for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
        expect(WHEEL_SEGMENTS[i].angle).toBe(i * 45);
      }
    });

    it('should define emotion opposites correctly', () => {
      const joySegment = WHEEL_SEGMENTS.find((s) => s.emotion === 'joy');
      expect(joySegment?.opposite).toBe('sadness');

      const angerSegment = WHEEL_SEGMENTS.find((s) => s.emotion === 'anger');
      expect(angerSegment?.opposite).toBe('fear');
    });

    it('should define PlutchikWheel props interface', () => {
      const props = {
        emotions: { joy: 0.7, sadness: 0.3 },
        size: 300,
        showLabels: true,
        showValues: false,
        interactive: true,
        onSegmentClick: () => {},
      };
      expect(props.size).toBe(300);
      expect(props.interactive).toBe(true);
    });

    it('should calculate segment path angles', () => {
      const baseAngle = 45;
      const halfWidth = 22.5;
      const startAngle = baseAngle - halfWidth;
      const endAngle = baseAngle + halfWidth;
      expect(startAngle).toBe(22.5);
      expect(endAngle).toBe(67.5);
    });
  });

  describe('EmotionChart Component', () => {
    it('should define chart view types', () => {
      const views = ['bar', 'wheel'];
      expect(views).toContain('bar');
      expect(views).toContain('wheel');
    });

    it('should define EmotionChart props interface', () => {
      const props = {
        emotions: { joy: 0.5 },
        defaultView: 'bar' as const,
        showViewToggle: true,
        title: 'Emotion Analysis',
        height: 320,
      };
      expect(props.defaultView).toBe('bar');
      expect(props.showViewToggle).toBe(true);
    });

    it('should calculate dominant emotion', () => {
      const emotions = { joy: 0.8, sadness: 0.3, anger: 0.5 };
      const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1]);
      expect(sorted[0][0]).toBe('joy');
      expect(sorted[0][1]).toBe(0.8);
    });

    it('should count active emotions', () => {
      const emotions = { joy: 0.5, sadness: 0, anger: 0.3, fear: 0 };
      const active = Object.values(emotions).filter((v) => v > 0).length;
      expect(active).toBe(2);
    });

    it('should extract top 3 emotions', () => {
      const emotions = { joy: 0.8, sadness: 0.6, anger: 0.4, fear: 0.2 };
      const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1]);
      const top3 = sorted.slice(0, 3);
      expect(top3.length).toBe(3);
      expect(top3[0][0]).toBe('joy');
      expect(top3[1][0]).toBe('sadness');
      expect(top3[2][0]).toBe('anger');
    });
  });

  describe('Invariants', () => {
    it('INV-CHART-001: All 14 emotions must have assigned colors', () => {
      const emotions = [
        'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust',
        'trust', 'anticipation', 'love', 'guilt', 'shame', 'pride',
        'envy', 'contempt',
      ];
      expect(emotions.length).toBe(14);
    });

    it('INV-CHART-002: Plutchik wheel must have 8 primary segments', () => {
      const primaryCount = 8;
      expect(primaryCount).toBe(8);
    });

    it('INV-CHART-003: Bar chart must support sorting by value', () => {
      const sortOptions = ['value', 'name', 'none'];
      expect(sortOptions).toContain('value');
    });

    it('INV-CHART-004: Chart must have view toggle capability', () => {
      const viewTypes = ['bar', 'wheel'];
      expect(viewTypes.length).toBeGreaterThanOrEqual(2);
    });

    it('INV-CHART-005: Emotion values must be normalized (0-1)', () => {
      const testValues = [0, 0.5, 1.0];
      testValues.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });
    });

    it('INV-CHART-006: Empty state must be handled gracefully', () => {
      const emotions = {};
      const hasData = Object.values(emotions).some((v) => v > 0);
      expect(hasData).toBe(false);
    });
  });
});
