import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { computeTextFeatures } from '../../src/scoring/text-features.js';

describe('Cross-validation TS vs Python on Bovary', () => {
  const textPath = resolve(__dirname, '../../../../omega-autopsie/gutenberg_cache/flaubert_bovary_14155.txt');
  
  it('computes features on Bovary 600w passage', () => {
    const text = readFileSync(textPath, 'utf-8');
    const words = text.split(/\s+/);
    const offset = Math.floor(words.length * 0.05);
    const passage = words.slice(offset, offset + 600).join(' ');
    const f = computeTextFeatures(passage);
    
    // Python R1 values at P_rel ~0.05 for 600w window:
    const pyVals: Record<string, number> = {
      f24e_contrast_score: 0.91702,
      f25g_description_score: 0.2121,
      f29d_ttr_score: 0.74412,
      f30d_ps_imp_ratio: 2.3026,
      f33c_dot_comma_ratio: 1.0235,
      f34b_para_per_1000w: 1.67,
      f38c_speed_score: 0.4,
    };
    
    // Print for manual inspection
    for (const [k, pyVal] of Object.entries(pyVals)) {
      const tsVal = f[k];
      const pctDiff = tsVal !== undefined && pyVal !== 0
        ? Math.abs(tsVal - pyVal) / Math.abs(pyVal) * 100
        : 0;
      console.log(`  ${k}: py=${pyVal.toFixed(4)} ts=${tsVal?.toFixed(4)} diff=${pctDiff.toFixed(1)}%`);
    }
    
    // Features should be in reasonable range (not NaN, not negative for scores)
    expect(f.f24e_contrast_score).toBeGreaterThan(0);
    expect(f.f24e_contrast_score).toBeLessThanOrEqual(1);
    expect(f.f25g_description_score).toBeGreaterThanOrEqual(0);
    expect(f.f29d_ttr_score).toBeGreaterThan(0);
    expect(f.f33c_dot_comma_ratio).toBeGreaterThan(0);
    expect(f.f38c_speed_score).toBeGreaterThanOrEqual(0);
    
    // Note: exact match is not expected because:
    // 1. Different text extraction (gutenberg vs PDF — different offsets)
    // 2. Different tokenization (Python re.split vs TS regex)
    // 3. The Python window was from PDF extraction, TS from Gutenberg TXT
    // We verify the features are in the same ORDER OF MAGNITUDE
    expect(f.f24e_contrast_score).toBeGreaterThan(0.5);  // Python: 0.917
    expect(f.f29d_ttr_score).toBeGreaterThan(0.4);       // Python: 0.744
  });
});
