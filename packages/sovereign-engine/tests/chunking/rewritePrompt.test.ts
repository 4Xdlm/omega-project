/**
 * V2.3-A P3 — tests buildRewritePrompt (CI, ZÉRO qwen).
 * Prouve l'injection source->prompt + contrat, déterminisme, isolation. Aucun appel LLM.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildRewritePrompt,
  REWRITE_GENERATION_MODE,
  type RewritePromptInput,
} from '../../src/chunking/rewritePrompt.js';
import { deriveEmotionContractFromSegment } from '../../src/chunking/deriveEmotionContract.js';
import { buildForgePacketFromSegment } from '../../src/chunking/deriveForgePacket.js';
import { forgePacketToSceneBrief } from '../../src/generation/forge-to-brief.js';

const SEG =
  'La maison de pierre dressait ses murs gris près de la route. Un cri déchira la nuit, le sang, ' +
  'la peur. Elle courut vers la lumière lointaine, le cœur battant, la gorge serrée par l angoisse.';

function inputFor(seg: string, mode: 'rewrite' | 'expand' = 'rewrite', maxWords?: number): RewritePromptInput {
  const cand = deriveEmotionContractFromSegment(seg);
  const fp = buildForgePacketFromSegment(seg, cand);
  const brief = forgePacketToSceneBrief(fp.packet);
  return {
    scene_brief: brief,
    source_segment: seg,
    source_segment_hash: cand.segment_hash,
    emotion_contract: cand.contract,
    rewrite_mode: mode,
    ...(maxWords !== undefined ? { constraints: { max_words: maxWords } } : {}),
  };
}

describe('V2.3-A P3 buildRewritePrompt', () => {
  it('le prompt CONTIENT le texte source (injection — finding P2 résolu)', () => {
    const r = buildRewritePrompt(inputFor(SEG));
    expect(r.prompt).toContain(SEG);
    expect(r.prompt).toContain('[SEGMENT SOURCE]');
  });

  it('le prompt contient le contrat émotionnel (dominants Q1/Q4 + sections)', () => {
    const input = inputFor(SEG);
    const r = buildRewritePrompt(input);
    expect(r.prompt).toContain('[CONTRAT ÉMOTIONNEL]');
    expect(r.prompt).toContain(`Q1=${input.emotion_contract.curve_quartiles[0].dominant}`);
    expect(r.prompt).toContain(`Q4=${input.emotion_contract.curve_quartiles[3].dominant}`);
  });

  it('le prompt contient la CONSIGNE inviolable + le BRIEF scène', () => {
    const r = buildRewritePrompt(inputFor(SEG));
    expect(r.prompt).toContain('[CONSIGNE SYSTÈME]');
    expect(r.prompt).toContain("N'invente PAS");
    expect(r.prompt).toContain('[BRIEF SCÈNE]');
  });

  it('prompt_hash déterministe : même entrée → même hash + même prompt', () => {
    const a = buildRewritePrompt(inputFor(SEG));
    const b = buildRewritePrompt(inputFor(SEG));
    expect(b.prompt_hash).toBe(a.prompt_hash);
    expect(b.prompt).toBe(a.prompt);
  });

  it('source différente → prompt différent (frontière = variable)', () => {
    const a = buildRewritePrompt(inputFor(SEG));
    const b = buildRewritePrompt(inputFor(SEG + ' Et le silence retomba, lourd, définitif.'));
    expect(b.prompt_hash).not.toBe(a.prompt_hash);
  });

  it('mode rewrite vs expand → consigne différente', () => {
    const rw = buildRewritePrompt(inputFor(SEG, 'rewrite'));
    const ex = buildRewritePrompt(inputFor(SEG, 'expand'));
    expect(rw.prompt).toContain('RÉÉCRIS');
    expect(ex.prompt).toContain('ÉTENDS');
    expect(rw.prompt_hash).not.toBe(ex.prompt_hash);
  });

  it('constraints.max_words apparaît dans le prompt si fourni', () => {
    const r = buildRewritePrompt(inputFor(SEG, 'rewrite', 800));
    expect(r.prompt).toMatch(/<= 800 mots/);
  });

  it('source_segment_hash obligatoire (vide → throw)', () => {
    const input = { ...inputFor(SEG), source_segment_hash: '' };
    expect(() => buildRewritePrompt(input)).toThrow(/obligatoire/);
  });

  it("mode génération = 'rewrite_v2_3' (jamais chunked_k2 ex-nihilo)", () => {
    expect(REWRITE_GENERATION_MODE).toBe('rewrite_v2_3');
    expect(REWRITE_GENERATION_MODE).not.toBe('chunked_k2');
  });

  it('isolation : aucun IMPORT runtime LLM/génération (mentions en commentaire OK)', () => {
    const src = readFileSync('src/chunking/rewritePrompt.ts', 'utf8');
    const importLines = src.split('\n').filter((l) => l.trim().startsWith('import'));
    const joined = importLines.join('\n');
    expect(joined).not.toMatch(/generateChunkedDraft|chunked-generator/);
    expect(joined).not.toMatch(/OllamaProvider|createOllamaProvider|ollama-provider/);
    expect(joined).not.toMatch(/generateDraft/);
    // le module n'importe que node:crypto + type EmotionContract
    expect(joined).toMatch(/node:crypto/);
  });
});
