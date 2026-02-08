import { describe, it, expect } from 'vitest';
import { traceParagraph, traceAllParagraphs } from '../../src/evidence/paragraph-trace.js';
import { sha256, canonicalize } from '@omega/canon-kernel';
import { INTENT_PACK_A, TIMESTAMP, runPipeline } from '../fixtures.js';

describe('ParagraphTrace', () => {
  const snap = runPipeline(INTENT_PACK_A);
  const intentHash = sha256(canonicalize(INTENT_PACK_A));

  it('traces single paragraph', () => {
    const para = snap.styleOutput.paragraphs[0];
    const trace = traceParagraph(para.paragraph_id, para.text, snap.plan, snap.scribeOutput, intentHash);
    expect(trace.paragraph_id).toBe(para.paragraph_id);
    expect(trace.text_hash).toHaveLength(64);
  });

  it('traces all paragraphs', () => {
    const traces = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    expect(traces.length).toBe(snap.styleOutput.paragraphs.length);
  });

  it('intent hash propagated', () => {
    const traces = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    for (const t of traces) {
      expect(t.intent_hash).toBe(intentHash);
    }
  });

  it('plan hash propagated', () => {
    const traces = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    for (const t of traces) {
      expect(t.plan_hash).toBe(snap.plan.plan_hash);
    }
  });

  it('proof path is non-empty', () => {
    const traces = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    for (const t of traces) {
      expect(t.proof_path.length).toBeGreaterThan(0);
    }
  });

  it('text_hash matches sha256 of text', () => {
    const para = snap.styleOutput.paragraphs[0];
    const trace = traceParagraph(para.paragraph_id, para.text, snap.plan, snap.scribeOutput, intentHash);
    expect(trace.text_hash).toBe(sha256(para.text));
  });

  it('arc_ids populated', () => {
    const traces = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    const hasArcs = traces.some(t => t.arc_ids.length > 0);
    expect(hasArcs).toBe(true);
  });

  it('scene_ids populated', () => {
    const traces = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    const hasScenes = traces.some(t => t.scene_ids.length > 0);
    expect(hasScenes).toBe(true);
  });

  it('deterministic', () => {
    const t1 = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    const t2 = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    expect(t1).toEqual(t2);
  });

  it('proof path starts with intent hash', () => {
    const traces = traceAllParagraphs(snap.styleOutput, snap.plan, snap.scribeOutput, intentHash);
    for (const t of traces) {
      expect(t.proof_path[0]).toBe(intentHash);
    }
  });
});
