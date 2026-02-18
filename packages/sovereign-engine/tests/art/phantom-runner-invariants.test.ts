/**
 * ART-14 — Phantom Runner Invariant Tests
 * PHANTOM-ART14-01 to PHANTOM-ART14-07
 *
 * Complements PHANTOM-01..04 in tests/phantom/phantom-state.test.ts
 * and RUNNER-01..03 in tests/phantom/phantom-runner.test.ts.
 * Tests trace shape, decay, boost, cognitive load, fatigue, determinism, clamping.
 */
import { describe, it, expect } from 'vitest';
import { runPhantom } from '../../src/phantom/phantom-runner.js';

describe('ART-14: Phantom Runner Invariants', () => {

  it('PHANTOM-ART14-01: returns one state per sentence', () => {
    const prose = 'Phrase un. Phrase deux. Phrase trois.';
    const trace = runPhantom(prose);
    expect(trace.states).toHaveLength(3);
  });

  it('PHANTOM-ART14-02: attention decays over flat monotone text', () => {
    const flat = Array.from({ length: 20 }, () =>
      'La même phrase monotone sans aucune variation particulière dans le texte.'
    ).join(' ');
    const trace = runPhantom(flat);

    // Attention should decay from initial 0.9
    expect(trace.states[trace.states.length - 1].attention).toBeLessThan(
      trace.states[0].attention
    );
    // Average attention should be below initial
    const avgAttention = trace.states.reduce((s, st) => s + st.attention, 0) / trace.states.length;
    expect(avgAttention).toBeLessThan(0.8);
  });

  it('PHANTOM-ART14-03: short punch phrase boosts attention', () => {
    // First a long flat sentence, then a punch
    const prose = 'Le personnage avançait tranquillement dans la rue déserte sans rien remarquer de particulier. Stop!';
    const trace = runPhantom(prose);

    // "Stop!" is short + has ! → should boost attention relative to pure decay
    // Second state attention should not drop much below first (boost counters decay)
    expect(trace.states[1].attention).toBeGreaterThan(
      trace.states[0].attention - 0.10
    );
  });

  it('PHANTOM-ART14-04: long complex sentences accumulate cognitive load', () => {
    // cognitive_load += wordCount × 0.001 - 0.05 per sentence
    // Need sentences with 51+ words for net positive accumulation
    const longSentence =
      "Les considérations philosophiques extraordinairement profondes et manifestement complexes qui émergèrent " +
      "de cette contemplation mélancolique et profondément tourmentée s'avérèrent indiscutablement révélatrices " +
      "d'une intériorité irrémédiablement assujettie aux aléas inextricables d'une existence perpétuellement " +
      "contingente et irrévocablement suspendue entre les méandres obscurs et insondables d'une conscience " +
      "fragmentée et irréductiblement divisée contre elle-même par les forces implacables du temps inexorable " +
      "qui effaçait progressivement toute trace de ce qui avait été autrefois considéré comme immuable.";
    // ~69 words → net +0.019 per sentence
    const complex = Array.from({ length: 10 }, () => longSentence).join(' ');
    const trace = runPhantom(complex);
    const lastState = trace.states[trace.states.length - 1];
    // After 10 sentences of 69 words each, cognitive_load ≈ 0.19
    expect(lastState.cognitive_load).toBeGreaterThan(0);
  });

  it('PHANTOM-ART14-05: fatigue never decreases significantly (monotone increase)', () => {
    const prose = Array.from({ length: 10 }, () =>
      'Le personnage marchait dans la ville sombre et vide.'
    ).join(' ');
    const trace = runPhantom(prose);

    // Fatigue should be monotonically non-decreasing for monotone text (no breath recovery)
    for (let i = 1; i < trace.states.length; i++) {
      // Allow tiny floating point tolerance
      expect(trace.states[i].fatigue).toBeGreaterThanOrEqual(
        trace.states[i - 1].fatigue - 0.001
      );
    }
  });

  it('PHANTOM-ART14-06: deterministic — same text produces same trace', () => {
    const prose = 'Il marchait. La nuit tombait. Un cri retentit!';
    const t1 = runPhantom(prose);
    const t2 = runPhantom(prose);
    expect(t1.states).toEqual(t2.states);
    expect(t1.attention_min).toBe(t2.attention_min);
    expect(t1.fatigue_max).toBe(t2.fatigue_max);
    expect(t1.danger_zones).toEqual(t2.danger_zones);
  });

  it('PHANTOM-ART14-07: all state values clamped [0, 1]', () => {
    const long = Array.from({ length: 100 }, () => 'Phrase test.').join(' ');
    const trace = runPhantom(long);
    for (const s of trace.states) {
      expect(s.attention).toBeGreaterThanOrEqual(0);
      expect(s.attention).toBeLessThanOrEqual(1);
      expect(s.cognitive_load).toBeGreaterThanOrEqual(0);
      expect(s.cognitive_load).toBeLessThanOrEqual(1);
      expect(s.fatigue).toBeGreaterThanOrEqual(0);
      expect(s.fatigue).toBeLessThanOrEqual(1);
    }
  });
});
