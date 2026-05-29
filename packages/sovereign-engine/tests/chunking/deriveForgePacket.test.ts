/**
 * V2.3-A P1 — tests buildForgePacketFromSegment (P1-a, construction directe).
 * 8 tests Tribunal : no-ghost-field, injection emotion_contract, no-14d, no-assembleForgePacket,
 * beats>=1, forgePacketToSceneBrief compat, low-confidence, déterminisme.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildForgePacketFromSegment } from '../../src/chunking/deriveForgePacket.js';
import { deriveEmotionContractFromSegment } from '../../src/chunking/deriveEmotionContract.js';
import { forgePacketToSceneBrief } from '../../src/generation/forge-to-brief.js';

const FORGEPACKET_KEYS = [
  'packet_id', 'packet_hash', 'scene_id', 'run_id', 'quality_tier', 'language',
  'intent', 'emotion_contract', 'beats', 'subtext', 'sensory', 'style_genome',
  'kill_lists', 'canon', 'continuity', 'seeds', 'generation',
].sort();

const SEGMENT =
  'La maison de pierre dressait ses murs gris près de la route. Un cri déchira la nuit, ' +
  'le sang, la peur. Elle courut, le cœur battant, vers la lumière lointaine et froide. ' +
  'Le silence retomba, lourd, sur le jardin endormi sous la lune pâle et lente.';
const SHORT = 'Une porte. Un mur.';

function candidateOf(seg: string) {
  return deriveEmotionContractFromSegment(seg);
}

describe('V2.3-A P1 buildForgePacketFromSegment', () => {
  it('no-ghost-field : ForgePacket = 17 clés canoniques exactes', () => {
    const r = buildForgePacketFromSegment(SEGMENT, candidateOf(SEGMENT));
    expect(Object.keys(r.packet).sort()).toEqual(FORGEPACKET_KEYS);
  });

  it('injection emotion_contract : packet.emotion_contract === candidate.contract (même référence)', () => {
    const c = candidateOf(SEGMENT);
    const r = buildForgePacketFromSegment(SEGMENT, c);
    expect(r.packet.emotion_contract).toBe(c.contract);
  });

  it('no 14d resurrection : target_14d reste {} (quartiles + terminal)', () => {
    const r = buildForgePacketFromSegment(SEGMENT, candidateOf(SEGMENT));
    for (const q of r.packet.emotion_contract.curve_quartiles) expect(q.target_14d).toEqual({});
    expect(r.packet.emotion_contract.terminal_state.target_14d).toEqual({});
  });

  it('no assembleForgePacket / no generation import dans le module P1', () => {
    const src = readFileSync('src/chunking/deriveForgePacket.ts', 'utf8');
    // import OU appel reel (pas les simples mentions en commentaire)
    expect(src).not.toMatch(/import[^\n]*assembleForgePacket/);
    expect(src).not.toMatch(/assembleForgePacket\s*\(/);
    expect(src).not.toMatch(/import[^\n]*from\s+'\.\.\/generation\//);
    expect(src).not.toMatch(/generateChunkedDraft\s*\(/);
  });

  it('beats non vide : >= 1 beat déterministe typé', () => {
    const r = buildForgePacketFromSegment(SEGMENT, candidateOf(SEGMENT));
    expect(r.packet.beats.length).toBeGreaterThanOrEqual(1);
    expect(typeof r.packet.beats[0]!.action).toBe('string');
    expect(r.packet.beats[0]!.action.length).toBeGreaterThan(0);
    expect(typeof r.packet.beats[0]!.beat_order).toBe('number');
  });

  it('forgePacketToSceneBrief compatibility : brief non vide exploitable', () => {
    const r = buildForgePacketFromSegment(SEGMENT, candidateOf(SEGMENT));
    const brief = forgePacketToSceneBrief(r.packet);
    expect(typeof brief).toBe('string');
    expect(brief.trim().length).toBeGreaterThan(0);
  });

  it('low confidence : segment court → confidence propagée + warnings P0 conservés', () => {
    const c = candidateOf(SHORT);
    const r = buildForgePacketFromSegment(SHORT, c);
    expect(r.confidence).toBe(c.confidence);
    expect(r.confidence).toBeLessThanOrEqual(0.4);
    expect(r.warning_codes).toEqual(c.warning_codes);
    expect(r.warning_codes).toContain('SHORT_SEGMENT');
  });

  it('déterminisme : même (segment, candidate) → même packet_id/packet_hash', () => {
    const a = buildForgePacketFromSegment(SEGMENT, candidateOf(SEGMENT));
    const b = buildForgePacketFromSegment(SEGMENT, candidateOf(SEGMENT));
    expect(b.packet.packet_id).toBe(a.packet.packet_id);
    expect(b.packet.packet_hash).toBe(a.packet.packet_hash);
    expect(b.packet.generation.timestamp).toBe(a.packet.generation.timestamp); // sentinelle, pas wall-clock
  });

  it('source_segment_hash = candidate.segment_hash', () => {
    const c = candidateOf(SEGMENT);
    const r = buildForgePacketFromSegment(SEGMENT, c);
    expect(r.source_segment_hash).toBe(c.segment_hash);
  });
});
