/**
 * V2.3-A P2 — tests harness routage A/B (mock, zéro qwen).
 * Vérifie : 2 bras routés, K identique, briefs non vides, MOCK utilisé (pas de vrai LLM),
 * injection generate, déterminisme, pas d'import generateChunkedDraft.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  runABRouting,
  naiveSegments,
  scalpelSegments,
  MOCK_GENERATE,
} from '../../src/chunking/abRouting.js';

const TEXT =
  'La maison de pierre dressait ses murs gris près de la route ancienne. Un cri déchira la nuit ; ' +
  'le sang, la peur, la fuite. Elle courut vers la lumière, le cœur battant, la gorge serrée. ' +
  'Le silence retomba, lourd, sur le jardin endormi. La lune pâle éclairait les feuilles mortes. ' +
  'Au loin, un train passait, indifférent, vers des villes que personne ne nommait jamais.';

describe('V2.3-A P2 abRouting', () => {
  it('route les 2 bras avec K identique (frontière = seule variable)', () => {
    const r = runABRouting(TEXT);
    expect(r.control.segment_count).toBeGreaterThanOrEqual(1);
    expect(r.treatment.segment_count).toBe(r.control.segment_count);
    expect(r.identical_segment_count).toBe(true);
    expect(r.k_segments).toBe(r.treatment.segment_count);
  });

  it('les deux bras produisent des briefs non vides', () => {
    const r = runABRouting(TEXT);
    for (const arm of [r.control, r.treatment]) {
      for (const s of arm.segments) expect(s.brief_non_empty).toBe(true);
    }
  });

  it('MOCK par défaut : zéro vrai LLM, sortie [MOCK GENERATION]', () => {
    const r = runABRouting(TEXT);
    for (const arm of [r.control, r.treatment]) {
      for (const s of arm.segments) expect(s.generation).toBe('[MOCK GENERATION]');
    }
    expect(MOCK_GENERATE('x', 'y')).toBe('[MOCK GENERATION]');
  });

  it('generate injecté est bien utilisé (routage des prompts)', () => {
    const r = runABRouting(TEXT, (brief) => `GEN[${brief.length}]`);
    expect(r.treatment.segments[0]!.generation).toMatch(/^GEN\[\d+\]$/);
  });

  it('déterminisme : même texte → mêmes packet_hash par bras', () => {
    const a = runABRouting(TEXT);
    const b = runABRouting(TEXT);
    expect(b.treatment.segments.map((s) => s.packet_hash)).toEqual(
      a.treatment.segments.map((s) => s.packet_hash)
    );
    expect(b.control.segments.map((s) => s.packet_hash)).toEqual(
      a.control.segments.map((s) => s.packet_hash)
    );
  });

  it('naiveSegments(text, k) retourne k segments contigus', () => {
    const segs = naiveSegments(TEXT, 4);
    expect(segs.length).toBe(4);
    for (const s of segs) expect(s.split(' ').length).toBeGreaterThan(0);
  });

  it('scalpelSegments = chunkAdaptive (>=1 segment)', () => {
    expect(scalpelSegments(TEXT).length).toBeGreaterThanOrEqual(1);
  });

  it('isolation : pas import/appel generateChunkedDraft', () => {
    const src = readFileSync('src/chunking/abRouting.ts', 'utf8');
    expect(src).not.toMatch(/generateChunkedDraft\s*\(/);
    expect(src).not.toMatch(/import[^\n]*generateChunkedDraft/);
  });
});
