import { analyzeEmotionFromText, computeArousal, cosineSimilarity14D } from '@omega/omega-forge';
import type { EmotionState14D } from '@omega/omega-forge';
import { EMOTION_14_KEYS } from '@omega/omega-forge';
import { readFileSync } from 'fs';

// Load LIVE1 FR prose
const prose = readFileSync('../../metrics/s/LIVE1_FR/run_000/final_prose.txt', 'utf8');
const paragraphs = prose.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);

console.log(`Total paragraphs: ${paragraphs.length}`);

// Analyze each paragraph
for (let i = 0; i < paragraphs.length; i++) {
  const state = analyzeEmotionFromText(paragraphs[i]);
  const arousal = computeArousal(state);
  const nonZero = Object.entries(state).filter(([_k, v]) => (v as number) > 0);
  console.log(`P${i}: arousal=${arousal.toFixed(3)}, dims=${nonZero.length} [${nonZero.map(([k,v]) => `${k}=${(v as number).toFixed(2)}`).join(', ')}]`);
}

// Simulate tension_14d quartile analysis
console.log('\n=== QUARTILE ANALYSIS (like tension_14d) ===');
const total = paragraphs.length;
const bounds: Record<string, [number, number]> = {
  Q1: [0, 0.25], Q2: [0.25, 0.5], Q3: [0.5, 0.75], Q4: [0.75, 1.0]
};

// Build trust target (what the genesis plan prescribes)
const trustTarget: Record<string, number> = {};
for (const key of EMOTION_14_KEYS) { trustTarget[key] = 0; }
trustTarget['trust'] = 0.3;

for (const [q, [startFrac, endFrac]] of Object.entries(bounds)) {
  const startIdx = Math.floor(startFrac * total);
  const endIdx = Math.ceil(endFrac * total);
  const quartileText = paragraphs.slice(startIdx, endIdx).join('\n\n');
  const actualState = analyzeEmotionFromText(quartileText);
  const similarity = cosineSimilarity14D(trustTarget as EmotionState14D, actualState as EmotionState14D);
  const nonZero = Object.entries(actualState).filter(([_k, v]) => (v as number) > 0);
  console.log(`${q} [p${startIdx}-${endIdx}]: sim=${(similarity * 100).toFixed(1)}%, dims=[${nonZero.map(([k,v]) => `${k}=${(v as number).toFixed(2)}`).join(', ')}]`);
}
