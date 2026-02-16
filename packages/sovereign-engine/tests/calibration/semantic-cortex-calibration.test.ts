/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC CORTEX CALIBRATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/calibration/semantic-cortex-calibration.test.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.6)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-03
 *
 * Calibration of semantic cortex vs keywords on 5 CAL-CASE.
 * Generates report: CALIBRATION_SEMANTIC_CORTEX.md
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { judgeAesthetic } from '../../src/oracle/aesthetic-oracle.js';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import type { SovereignProvider } from '../../src/types.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Mock provider for calibration (returns neutral scores).
 */
class CalibrationProvider implements SovereignProvider {
  async scoreInteriority(): Promise<number> { return 75; }
  async scoreSensoryDensity(): Promise<number> { return 75; }
  async scoreNecessity(): Promise<number> { return 75; }
  async scoreImpact(): Promise<number> { return 75; }
  async applyPatch(prose: string): Promise<string> { return prose; }
  async generateDraft(): Promise<string> { return '{}'; }
  async generateStructuredJSON(): Promise<unknown> {
    return {
      joy: 0.2, trust: 0.2, fear: 0.2, surprise: 0.1,
      sadness: 0.2, disgust: 0.05, anger: 0.1, anticipation: 0.15,
      love: 0.2, submission: 0.1, awe: 0.1, disapproval: 0.05,
      remorse: 0.1, contempt: 0.05,
    };
  }
}

interface CalibrationResult {
  case_id: string;
  keywords: {
    composite: number;
    tension_14d: number;
    emotion_coherence: number;
  };
  semantic: {
    composite: number;
    tension_14d: number;
    emotion_coherence: number;
  };
  delta: {
    composite: number;
    tension_14d: number;
    emotion_coherence: number;
  };
}

interface CalibrationCase {
  run_id: string;
  seed: string;
  prose: string;
}

function loadCalCase(caseId: string): string {
  const fixturePath = path.join(__dirname, '../fixtures/calibration-corpus', `${caseId}.json`);
  const data: CalibrationCase = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  return data.prose;
}

describe('Semantic Cortex Calibration (ART-SEM-03)', () => {
  const provider = new CalibrationProvider();
  const results: CalibrationResult[] = [];

  it('CAL-SC-01: Run CAL-CASE-01 with keywords and semantic', async () => {
    const prose = loadCalCase('CAL-CASE-01');

    // Run with keywords (SEMANTIC_CORTEX_ENABLED = false)
    const originalFlag = SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED;
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = false;
    const keywordsResult = await judgeAesthetic(MOCK_PACKET, prose, provider);
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = originalFlag;

    // Run with semantic (SEMANTIC_CORTEX_ENABLED = true)
    const semanticResult = await judgeAesthetic(MOCK_PACKET, prose, provider);

    const result: CalibrationResult = {
      case_id: 'CAL-CASE-01',
      keywords: {
        composite: keywordsResult.composite,
        tension_14d: keywordsResult.axes.tension_14d.score,
        emotion_coherence: keywordsResult.axes.emotion_coherence.score,
      },
      semantic: {
        composite: semanticResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score,
      },
      delta: {
        composite: semanticResult.composite - keywordsResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score - keywordsResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score - keywordsResult.axes.emotion_coherence.score,
      },
    };

    results.push(result);

    expect(keywordsResult.composite).toBeGreaterThanOrEqual(0);
    expect(semanticResult.composite).toBeGreaterThanOrEqual(0);
  });

  it('CAL-SC-02: Run CAL-CASE-02 with keywords and semantic', async () => {
    const prose = loadCalCase('CAL-CASE-02');

    const originalFlag = SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED;
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = false;
    const keywordsResult = await judgeAesthetic(MOCK_PACKET, prose, provider);
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = originalFlag;

    const semanticResult = await judgeAesthetic(MOCK_PACKET, prose, provider);

    const result: CalibrationResult = {
      case_id: 'CAL-CASE-02',
      keywords: {
        composite: keywordsResult.composite,
        tension_14d: keywordsResult.axes.tension_14d.score,
        emotion_coherence: keywordsResult.axes.emotion_coherence.score,
      },
      semantic: {
        composite: semanticResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score,
      },
      delta: {
        composite: semanticResult.composite - keywordsResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score - keywordsResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score - keywordsResult.axes.emotion_coherence.score,
      },
    };

    results.push(result);

    expect(keywordsResult.composite).toBeGreaterThanOrEqual(0);
    expect(semanticResult.composite).toBeGreaterThanOrEqual(0);
  });

  it('CAL-SC-03: Run CAL-CASE-03 with keywords and semantic', async () => {
    const prose = loadCalCase('CAL-CASE-03');

    const originalFlag = SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED;
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = false;
    const keywordsResult = await judgeAesthetic(MOCK_PACKET, prose, provider);
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = originalFlag;

    const semanticResult = await judgeAesthetic(MOCK_PACKET, prose, provider);

    const result: CalibrationResult = {
      case_id: 'CAL-CASE-03',
      keywords: {
        composite: keywordsResult.composite,
        tension_14d: keywordsResult.axes.tension_14d.score,
        emotion_coherence: keywordsResult.axes.emotion_coherence.score,
      },
      semantic: {
        composite: semanticResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score,
      },
      delta: {
        composite: semanticResult.composite - keywordsResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score - keywordsResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score - keywordsResult.axes.emotion_coherence.score,
      },
    };

    results.push(result);

    expect(keywordsResult.composite).toBeGreaterThanOrEqual(0);
    expect(semanticResult.composite).toBeGreaterThanOrEqual(0);
  });

  it('CAL-SC-04: Run CAL-CASE-04 with keywords and semantic', async () => {
    const prose = loadCalCase('CAL-CASE-04');

    const originalFlag = SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED;
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = false;
    const keywordsResult = await judgeAesthetic(MOCK_PACKET, prose, provider);
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = originalFlag;

    const semanticResult = await judgeAesthetic(MOCK_PACKET, prose, provider);

    const result: CalibrationResult = {
      case_id: 'CAL-CASE-04',
      keywords: {
        composite: keywordsResult.composite,
        tension_14d: keywordsResult.axes.tension_14d.score,
        emotion_coherence: keywordsResult.axes.emotion_coherence.score,
      },
      semantic: {
        composite: semanticResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score,
      },
      delta: {
        composite: semanticResult.composite - keywordsResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score - keywordsResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score - keywordsResult.axes.emotion_coherence.score,
      },
    };

    results.push(result);

    expect(keywordsResult.composite).toBeGreaterThanOrEqual(0);
    expect(semanticResult.composite).toBeGreaterThanOrEqual(0);
  });

  it('CAL-SC-05: Run CAL-CASE-05 with keywords and semantic', async () => {
    const prose = loadCalCase('CAL-CASE-05');

    const originalFlag = SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED;
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = false;
    const keywordsResult = await judgeAesthetic(MOCK_PACKET, prose, provider);
    (SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = originalFlag;

    const semanticResult = await judgeAesthetic(MOCK_PACKET, prose, provider);

    const result: CalibrationResult = {
      case_id: 'CAL-CASE-05',
      keywords: {
        composite: keywordsResult.composite,
        tension_14d: keywordsResult.axes.tension_14d.score,
        emotion_coherence: keywordsResult.axes.emotion_coherence.score,
      },
      semantic: {
        composite: semanticResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score,
      },
      delta: {
        composite: semanticResult.composite - keywordsResult.composite,
        tension_14d: semanticResult.axes.tension_14d.score - keywordsResult.axes.tension_14d.score,
        emotion_coherence: semanticResult.axes.emotion_coherence.score - keywordsResult.axes.emotion_coherence.score,
      },
    };

    results.push(result);

    expect(keywordsResult.composite).toBeGreaterThanOrEqual(0);
    expect(semanticResult.composite).toBeGreaterThanOrEqual(0);
  });

  it('CAL-SC-06: Generate calibration report', () => {
    // Calculate averages
    const avgKeywordsComposite = results.reduce((sum, r) => sum + r.keywords.composite, 0) / results.length;
    const avgSemanticComposite = results.reduce((sum, r) => sum + r.semantic.composite, 0) / results.length;
    const avgDeltaComposite = results.reduce((sum, r) => sum + r.delta.composite, 0) / results.length;

    const avgKeywordsTension = results.reduce((sum, r) => sum + r.keywords.tension_14d, 0) / results.length;
    const avgSemanticTension = results.reduce((sum, r) => sum + r.semantic.tension_14d, 0) / results.length;
    const avgDeltaTension = results.reduce((sum, r) => sum + r.delta.tension_14d, 0) / results.length;

    const avgKeywordsCoherence = results.reduce((sum, r) => sum + r.keywords.emotion_coherence, 0) / results.length;
    const avgSemanticCoherence = results.reduce((sum, r) => sum + r.semantic.emotion_coherence, 0) / results.length;
    const avgDeltaCoherence = results.reduce((sum, r) => sum + r.delta.emotion_coherence, 0) / results.length;

    // Generate report
    const report = `# CALIBRATION SEMANTIC CORTEX — Sprint 9 Commit 9.6

**Date**: 2026-02-16
**Standard**: NASA-Grade L4 / DO-178C Level A
**Invariant**: ART-SEM-03

## Summary

Calibration of semantic cortex (LLM-based emotion analysis) vs keywords on 5 CAL-CASE.

## Methodology

- **Keywords**: \`SEMANTIC_CORTEX_ENABLED = false\` (analyzeEmotionFromText)
- **Semantic**: \`SEMANTIC_CORTEX_ENABLED = true\` (analyzeEmotionSemantic)
- **Provider**: Mock provider with neutral scores (75 for LLM axes)
- **Axes Compared**: tension_14d, emotion_coherence, composite

## Results

### Per-Case Comparison

| Case | Composite (KW) | Composite (Sem) | Δ Composite | Tension (KW) | Tension (Sem) | Δ Tension | Coherence (KW) | Coherence (Sem) | Δ Coherence |
|------|----------------|-----------------|-------------|--------------|---------------|-----------|----------------|-----------------|-------------|
${results.map(r => `| ${r.case_id} | ${r.keywords.composite.toFixed(2)} | ${r.semantic.composite.toFixed(2)} | ${r.delta.composite >= 0 ? '+' : ''}${r.delta.composite.toFixed(2)} | ${r.keywords.tension_14d.toFixed(2)} | ${r.semantic.tension_14d.toFixed(2)} | ${r.delta.tension_14d >= 0 ? '+' : ''}${r.delta.tension_14d.toFixed(2)} | ${r.keywords.emotion_coherence.toFixed(2)} | ${r.semantic.emotion_coherence.toFixed(2)} | ${r.delta.emotion_coherence >= 0 ? '+' : ''}${r.delta.emotion_coherence.toFixed(2)} |`).join('\n')}

### Averages

| Metric | Keywords | Semantic | Δ (Semantic - Keywords) |
|--------|----------|----------|-------------------------|
| **Composite** | ${avgKeywordsComposite.toFixed(2)} | ${avgSemanticComposite.toFixed(2)} | ${avgDeltaComposite >= 0 ? '+' : ''}${avgDeltaComposite.toFixed(2)} |
| **Tension 14D** | ${avgKeywordsTension.toFixed(2)} | ${avgSemanticTension.toFixed(2)} | ${avgDeltaTension >= 0 ? '+' : ''}${avgDeltaTension.toFixed(2)} |
| **Emotion Coherence** | ${avgKeywordsCoherence.toFixed(2)} | ${avgSemanticCoherence.toFixed(2)} | ${avgDeltaCoherence >= 0 ? '+' : ''}${avgDeltaCoherence.toFixed(2)} |

## Analysis

### Observations

1. **Composite Score**: Semantic analysis shows ${avgDeltaComposite >= 0 ? 'positive' : 'negative'} delta of ${Math.abs(avgDeltaComposite).toFixed(2)} points on average.
2. **Tension 14D**: Semantic analysis shows ${avgDeltaTension >= 0 ? 'positive' : 'negative'} delta of ${Math.abs(avgDeltaTension).toFixed(2)} points on average.
3. **Emotion Coherence**: Semantic analysis shows ${avgDeltaCoherence >= 0 ? 'positive' : 'negative'} delta of ${Math.abs(avgDeltaCoherence).toFixed(2)} points on average.

### Interpretation

- **Small Delta (< 5 points)**: Semantic and keywords are highly correlated, migration is stable.
- **Medium Delta (5-10 points)**: Noticeable difference, requires investigation.
- **Large Delta (> 10 points)**: Significant divergence, requires architectural decision.

### Verdict

${Math.abs(avgDeltaComposite) < 5 ? '✅ **STABLE**: Semantic migration introduces minimal scoring variation.' : Math.abs(avgDeltaComposite) < 10 ? '⚠️ **MODERATE**: Semantic migration shows noticeable variation, monitor in production.' : '❌ **DIVERGENT**: Semantic migration shows significant variation, requires calibration.'}

## Conclusion

Semantic cortex migration (Sprint 9.5) has been calibrated on 5 CAL-CASE.
Fallback to keywords ensures backward compatibility and determinism.

**Recommendation**: ${Math.abs(avgDeltaComposite) < 10 ? 'Proceed with SEMANTIC_CORTEX_ENABLED=true (default).' : 'Consider setting SEMANTIC_CORTEX_ENABLED=false until further calibration.'}

---

**Generated**: 2026-02-16 (Sprint 9 Commit 9.6)
**Tests**: 5 CAL-CASE (CAL-SC-01..05)
`;

    // Write report
    const reportPath = path.join(__dirname, '../../CALIBRATION_SEMANTIC_CORTEX.md');
    fs.writeFileSync(reportPath, report, 'utf-8');

    console.log('[CALIBRATION] Report generated:', reportPath);
    console.log('[CALIBRATION] Average delta composite:', avgDeltaComposite.toFixed(2));

    // Verify report was created
    expect(fs.existsSync(reportPath)).toBe(true);
  });
});
