/**
 * DEC-019 — Tests unitaires bge-m3 Radar (logique PURE + orchestration via mock provider).
 * Déterministes, hors Ollama. Couvre cosinus, score advisory, bandes, flag no-op, shadow safe.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  cosineSim, radarAdvisoryScore, interpretRadar, bgem3RadarMode,
  radarScore, shadowLogBgem3Radar, type RadarProvider, type RadarCentroids,
} from '../../src/oracle/intrinsic-quality/bgem3-radar.js';

const C: RadarCentroids = { master_centroid: [1, 0, 0], low_centroid: [0, 1, 0] };

describe('cosineSim', () => {
  it('vecteurs identiques -> 1', () => { expect(cosineSim([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6); });
  it('orthogonaux -> 0', () => { expect(cosineSim([1, 0], [0, 1])).toBe(0); });
  it('opposés -> -1', () => { expect(cosineSim([1, 0], [-1, 0])).toBeCloseTo(-1, 6); });
  it('dims incompatibles -> 0', () => { expect(cosineSim([1, 2, 3], [1, 2])).toBe(0); });
  it('vecteur nul -> 0', () => { expect(cosineSim([0, 0], [1, 1])).toBe(0); });
});

describe('radarAdvisoryScore', () => {
  it('emb proche master -> score > 0', () => { expect(radarAdvisoryScore([1, 0, 0], C)).toBeGreaterThan(0); });
  it('emb proche low -> score < 0', () => { expect(radarAdvisoryScore([0, 1, 0], C)).toBeLessThan(0); });
  it('emb équidistant -> score ~ 0', () => { expect(radarAdvisoryScore([1, 1, 0], C)).toBeCloseTo(0, 6); });
  it('dims incompatibles -> NaN', () => { expect(Number.isNaN(radarAdvisoryScore([1, 0], C))).toBe(true); });
});

describe('interpretRadar', () => {
  it('bandes', () => {
    expect(interpretRadar(0.5)).toBe('master-like');
    expect(interpretRadar(-0.5)).toBe('low-like');
    expect(interpretRadar(0)).toBe('mixed');
    expect(interpretRadar(Number.NaN)).toBe('invalid');
  });
});

describe('bgem3RadarMode (flag, défaut inactif)', () => {
  afterEach(() => { delete process.env.OMEGA_BGEM3_RADAR; });
  it('défaut -> 0', () => { delete process.env.OMEGA_BGEM3_RADAR; expect(bgem3RadarMode()).toBe('0'); });
  it('shadow', () => { process.env.OMEGA_BGEM3_RADAR = 'shadow'; expect(bgem3RadarMode()).toBe('shadow'); });
  it('valeur inconnue -> 0', () => { process.env.OMEGA_BGEM3_RADAR = '1'; expect(bgem3RadarMode()).toBe('0'); });
});

describe('radarScore (orchestration, mock provider)', () => {
  it('appelle embed et calcule', async () => {
    const provider: RadarProvider = { embed: async () => [1, 0, 0] };
    const r = await radarScore('texte', C, provider);
    expect(r.dim).toBe(3); expect(r.score).toBeGreaterThan(0); expect(r.band).toBe('master-like');
  });
});

describe('shadowLogBgem3Radar (no-op par défaut, ne lève jamais)', () => {
  afterEach(() => { delete process.env.OMEGA_BGEM3_RADAR; vi.restoreAllMocks(); });

  it('flag inactif -> AUCUN appel embed', async () => {
    delete process.env.OMEGA_BGEM3_RADAR;
    const embed = vi.fn(async () => [1, 0, 0]);
    await shadowLogBgem3Radar('texte', C, 'sc1', { embed });
    expect(embed).not.toHaveBeenCalled();
  });

  it('shadow -> appelle embed + logue', async () => {
    process.env.OMEGA_BGEM3_RADAR = 'shadow';
    const embed = vi.fn(async () => [1, 0, 0]);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await shadowLogBgem3Radar('texte', C, 'sc1', { embed });
    expect(embed).toHaveBeenCalledOnce();
    expect(err).toHaveBeenCalled();
  });

  it('shadow + provider qui throw -> ne lève PAS', async () => {
    process.env.OMEGA_BGEM3_RADAR = 'shadow';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const provider: RadarProvider = { embed: async () => { throw new Error('ollama down'); } };
    await expect(shadowLogBgem3Radar('texte', C, 'sc1', provider)).resolves.toBeUndefined();
  });
});
