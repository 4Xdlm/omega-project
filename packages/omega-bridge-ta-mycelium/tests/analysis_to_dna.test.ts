import { describe, it, expect } from 'vitest';
import { prepareDNABuild, validateDNAInputs, vectorToIntensityRecord, analyzeResultToSegments, DNABuildInput } from '../src/bridge/analysis_to_dna';
import { buildBridgeData, ZERO_VECTOR_14D, EmotionVector14D } from '../src/bridge/text_analyzer_bridge';
import { AnalyzeResult, OMEGA_EMOTIONS_14D } from '../src/bridge/types';

const VALID_ANALYSIS: AnalyzeResult = {
  run_id: "2026-01-02_19-56-30",
  timestamp: "2026-01-02T18:56:30.060637900+00:00",
  duration_ms: 0,
  source: "test.txt",
  word_count: 47,
  char_count: 284,
  line_count: 4,
  total_emotion_hits: 4,
  emotions: [
    { emotion: "fear", intensity: 0.5, occurrences: 2, keywords: ["peur", "terreur"], keyword_counts: [{ word: "peur", count: 1 }, { word: "terreur", count: 1 }] },
    { emotion: "joy", intensity: 0.5, occurrences: 2, keywords: ["heureuse", "joie"], keyword_counts: [{ word: "heureuse", count: 1 }, { word: "joie", count: 1 }] }
  ],
  dominant_emotion: "fear",
  version: "0.8.0-HYBRID",
  segmentation: null,
  segments: null,
  analysis_meta: { mode: "deterministic", provider: null, ai_calls: 0, deterministic: true, fallback_used: false }
};

describe('vectorToIntensityRecord', () => {
  it('convertit un vecteur 14D en record partiel', () => {
    const vector: EmotionVector14D = { ...ZERO_VECTOR_14D, joy: 0.5, fear: 0.3 };
    const record = vectorToIntensityRecord(vector);
    expect(record.joy).toBe(0.5);
    expect(record.fear).toBe(0.3);
  });
  it('exclut les valeurs a zero', () => {
    const vector: EmotionVector14D = { ...ZERO_VECTOR_14D, joy: 0.5 };
    const record = vectorToIntensityRecord(vector);
    expect(record.joy).toBe(0.5);
    expect(record.anger).toBeUndefined();
  });
  it('conserve toutes les emotions non-nulles', () => {
    const vector: EmotionVector14D = { joy: 0.1, fear: 0.2, anger: 0.3, sadness: 0.4, surprise: 0.5, disgust: 0.6, trust: 0.7, anticipation: 0.8, love: 0.9, guilt: 0.1, shame: 0.2, pride: 0.3, hope: 0.4, despair: 0.5 };
    const record = vectorToIntensityRecord(vector);
    expect(Object.keys(record).length).toBe(14);
  });
});

describe('analyzeResultToSegments', () => {
  it('cree au moins un segment global', () => {
    const bridgeData = buildBridgeData(VALID_ANALYSIS);
    const segments = analyzeResultToSegments(VALID_ANALYSIS, bridgeData);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0].kind).toBe('paragraph');
  });
  it('cree des segments pour chaque emotion detectee', () => {
    const bridgeData = buildBridgeData(VALID_ANALYSIS);
    const segments = analyzeResultToSegments(VALID_ANALYSIS, bridgeData);
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });
  it('segments ont des emotions valides 14D', () => {
    const bridgeData = buildBridgeData(VALID_ANALYSIS);
    const segments = analyzeResultToSegments(VALID_ANALYSIS, bridgeData);
    for (const seg of segments) {
      for (const emotion of Object.keys(seg.emotions)) {
        expect(OMEGA_EMOTIONS_14D).toContain(emotion);
      }
    }
  });
});

describe('prepareDNABuild', () => {
  it('retourne des inputs valides', () => {
    const inputs = prepareDNABuild(VALID_ANALYSIS);
    expect(inputs.segments.length).toBeGreaterThan(0);
    expect(inputs.options.seed).toBe(42);
  });
  it('respecte le seed custom', () => {
    const inputs = prepareDNABuild(VALID_ANALYSIS, { seed: 123 });
    expect(inputs.options.seed).toBe(123);
  });
  it('respecte le titre custom', () => {
    const inputs = prepareDNABuild(VALID_ANALYSIS, { title: "Mon Livre" });
    expect(inputs.options.title).toBe("Mon Livre");
  });
  it('est deterministe', () => {
    const inputs1 = prepareDNABuild(VALID_ANALYSIS, { seed: 42 });
    const inputs2 = prepareDNABuild(VALID_ANALYSIS, { seed: 42 });
    expect(inputs1.bridgeData.contentHash).toBe(inputs2.bridgeData.contentHash);
  });
});

describe('validateDNAInputs', () => {
  it('valide des inputs corrects', () => {
    const inputs = prepareDNABuild(VALID_ANALYSIS);
    const result = validateDNAInputs(inputs);
    expect(result.valid).toBe(true);
  });
  it('rejette segments vides', () => {
    const inputs: DNABuildInput = { segments: [], options: { seed: 42, title: "Test", segmentDurationMs: 5000 }, bridgeData: buildBridgeData(VALID_ANALYSIS) };
    const result = validateDNAInputs(inputs);
    expect(result.valid).toBe(false);
  });
  it('rejette seed negatif', () => {
    const inputs = prepareDNABuild(VALID_ANALYSIS);
    inputs.options.seed = -1;
    const result = validateDNAInputs(inputs);
    expect(result.valid).toBe(false);
  });
});

describe('Pipeline Integration', () => {
  it('pipeline complet fonctionne', () => {
    const inputs = prepareDNABuild(VALID_ANALYSIS, { seed: 42 });
    const validation = validateDNAInputs(inputs);
    expect(validation.valid).toBe(true);
    expect(inputs.bridgeData.emotionVector.fear).toBeGreaterThan(0);
  });
  it('meme analyse meme segments', () => {
    const inputs1 = prepareDNABuild(VALID_ANALYSIS);
    const inputs2 = prepareDNABuild(VALID_ANALYSIS);
    expect(inputs1.segments.length).toBe(inputs2.segments.length);
  });
});
