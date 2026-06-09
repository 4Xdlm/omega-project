/** OMEGA — AP-5 : la Constitution V4 est CÂBLÉE (readiness prouvée), génération HOLD. */
import { describe, expect, it } from 'vitest';

import { checkV4Constitution, V4_CONSTITUTION } from '../src/c7/v4-constitution.js';

describe('AP-5 — Constitution V4 readiness', () => {
  it('CV4-001 — tous les composants câblés ⇒ ready', () => {
    const r = checkV4Constitution();
    const notReady = r.checks.filter((c) => !c.ready).map((c) => c.component);
    expect(notReady).toEqual([]);
    expect(r.ready).toBe(true);
  });

  it('CV4-002 — les 6 piliers présents (rythme, escalade, exemplars, vitalité, identité, lang)', () => {
    const comps = checkV4Constitution().checks.map((c) => c.component);
    for (const p of ['RHYTHM_SOFT_CALIBRATED', 'ESCALATION_FEWSHOT_GEMMA4', 'SUBTEXT_EXEMPLARS', 'GATE_VITALITY_ENFORCEABLE', 'GATE_IDENTITY_ENFORCEABLE', 'GATE_LANG_CLEAN']) {
      expect(comps).toContain(p);
    }
  });

  it('CV4-003 — la génération reste HOLD (pas d\'auto-V4)', () => {
    expect(V4_CONSTITUTION.status).toBe('GENERATION_HOLD_ARCHITECT');
    expect(V4_CONSTITUTION.buildGates.enforceAuthorRules).toBe(true);
  });
});
