/**
 * Tests: Cacophony Detector (Sprint 15.1)
 * Invariant: ART-PHON-01
 */

import { describe, it, expect } from 'vitest';
import { detectCacophony } from '../../src/phonetic/cacophony-detector.js';

describe('CacophonyDetector (ART-PHON-01)', () => {
  it('CACO-01: prose fluide → peu ou pas de cacophonies', () => {
    const prose = `Le vent caressait les feuilles mortes. La lumière dorée filtrait entre les branches. Un silence apaisant régnait dans la clairière.`;

    const result = detectCacophony(prose);

    // Fluid prose should have low severity
    expect(result.severity_score).toBeLessThan(30);
  });

  it('CACO-02: sibilant chain détectée ("ses six chats chassèrent")', () => {
    const prose = `Ses six chats chassèrent sans cesse les souris.`;

    const result = detectCacophony(prose);

    // Should detect sibilant chain (s, ch, s, s)
    const sibilants = result.cacophonies.filter(c => c.type === 'sibilant_chain');
    expect(sibilants.length).toBeGreaterThan(0);
  });

  it('CACO-03: hiatus détecté ("a à")', () => {
    const prose = `Il a à peine commencé. Elle a aussi apporté sa contribution.`;

    const result = detectCacophony(prose);

    const hiatus = result.cacophonies.filter(c => c.type === 'hiatus');
    expect(hiatus.length).toBeGreaterThan(0);
  });

  it('CACO-04: repeated onset détecté (3+ mots même consonne)', () => {
    const prose = `Pierre porta patiemment plusieurs paquets pesants.`;

    const result = detectCacophony(prose);

    const onsets = result.cacophonies.filter(c => c.type === 'repeated_onset');
    expect(onsets.length).toBeGreaterThan(0);
  });

  it('CACO-05: déterminisme — même prose = même résultat', () => {
    const prose = `Le chat chassait les souris dans ses chaussettes.`;

    const r1 = detectCacophony(prose);
    const r2 = detectCacophony(prose);

    expect(r1.total_count).toBe(r2.total_count);
    expect(r1.severity_score).toBe(r2.severity_score);
  });
});
