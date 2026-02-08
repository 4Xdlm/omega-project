import { describe, it, expect } from 'vitest';
import { validateEmotionTarget } from '../../src/validators/emotion-validator.js';
import { TIMESTAMP, SCENARIO_A_EMOTION } from '../fixtures.js';

describe('Emotion Validator', () => {
  it('should FAIL when target is null', () => {
    const result = validateEmotionTarget(null, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when only 1 waypoint', () => {
    const result = validateEmotionTarget({
      ...SCENARIO_A_EMOTION,
      waypoints: [{ position: 0, emotion: 'fear', intensity: 0.5 }],
    }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when positions are not sorted', () => {
    const result = validateEmotionTarget({
      ...SCENARIO_A_EMOTION,
      waypoints: [
        { position: 0.5, emotion: 'fear', intensity: 0.5 },
        { position: 0.2, emotion: 'joy', intensity: 0.3 },
      ],
    }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when position > 1', () => {
    const result = validateEmotionTarget({
      ...SCENARIO_A_EMOTION,
      waypoints: [
        { position: 0.0, emotion: 'fear', intensity: 0.5 },
        { position: 1.5, emotion: 'joy', intensity: 0.3 },
      ],
    }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when intensity > 1', () => {
    const result = validateEmotionTarget({
      ...SCENARIO_A_EMOTION,
      waypoints: [
        { position: 0.0, emotion: 'fear', intensity: 1.5 },
        { position: 1.0, emotion: 'joy', intensity: 0.3 },
      ],
    }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when climax_position out of bounds', () => {
    const result = validateEmotionTarget({ ...SCENARIO_A_EMOTION, climax_position: 2.0 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should PASS with 3 valid waypoints', () => {
    const result = validateEmotionTarget({
      arc_emotion: 'fear',
      waypoints: [
        { position: 0.0, emotion: 'trust', intensity: 0.3 },
        { position: 0.5, emotion: 'fear', intensity: 0.7 },
        { position: 1.0, emotion: 'sadness', intensity: 0.5 },
      ],
      climax_position: 0.7,
      resolution_emotion: 'sadness',
    }, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('should PASS with 10 valid waypoints (scenario C pattern)', () => {
    const result = validateEmotionTarget(SCENARIO_A_EMOTION, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });
});
