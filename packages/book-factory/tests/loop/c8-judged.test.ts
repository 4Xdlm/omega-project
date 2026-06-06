/**
 * C8+ — ÉTAGE B OUVERT (APPROVED signé Architecte 2026-06-06) :
 * Power-On Self-Test du prompt figé, judgedSelect (étage A intact), profils signés.
 */
import { describe, expect, it } from 'vitest';

import { sha256 } from '@omega/canon-kernel';

import { PERSONA_PROMPT, PERSONA_PROMPT_EXPECTED_SHA256 } from '../../src/c7/persona-prompt.js';
import { OllamaPairwiseJudge } from '../../src/c7/ollama-judge.js';
import { judgedSelect, openJudgePort, runTournament } from '../../src/loop/judge-port.js';
import type { PairwiseJudge } from '../../src/loop/judge-port.js';
import type { AdmissionRecord } from '../../src/loop/r6-core.js';
import type { Sha256Hex } from '../../src/identity/identity-types.js';

describe('Étage B — instrument figé + sélection juge-pondérée', () => {
  it('Power-On Self-Test : le hash BRUT du PERSONA_PROMPT égale la constante du registre', () => {
    expect(sha256(PERSONA_PROMPT)).toBe(PERSONA_PROMPT_EXPECTED_SHA256);
    expect(() => new OllamaPairwiseJudge('gemma4:31b')).not.toThrow(); // POST vérifié à la construction
  });

  it('profils APPROVED signés acceptés par le port (gemma + qwen3.5)', () => {
    for (const model of ['gemma4:31b', 'qwen3.5:35b-a3b']) {
      const r = openJudgePort({
        status: 'APPROVED', model,
        promptSha256: PERSONA_PROMPT_EXPECTED_SHA256 as Sha256Hex,
        temperature: 0, approvedBy: 'Francky (Architecte), dispatch 2026-06-06',
      });
      expect(r.ok).toBe(true);
    }
  });

  it('judgedSelect : le juge re-classe les ÉLIGIBLES seulement — étage A intact', async () => {
    const record: AdmissionRecord = {
      chapter: 9, mode: 'BOOST',
      candidates: [
        { profile: 'canon-strict', proseHash: 'h1' as Sha256Hex, eligible: true, expScore: 700, gates: [] },
        { profile: 'sensoriel', proseHash: 'h2' as Sha256Hex, eligible: true, expScore: 690, gates: [] },
        { profile: 'dialogue', proseHash: 'h3' as Sha256Hex, eligible: false, expScore: 990, gates: [] }, // inéligible : ne peut JAMAIS gagner
      ],
      winner: { kind: 'WINNER', profile: 'canon-strict' },
      admissionHash: 'a'.repeat(64) as Sha256Hex,
    };
    // tournoi stub : le juge préfère 'sensoriel' partout (concordant)
    const judge: PairwiseJudge = { compare: async (a, b) => (a.includes('SENS') ? 'A' : b.includes('SENS') ? 'B' : 'TIE') };
    const t = await runTournament(judge, [
      { profile: 'canon-strict', prose: 'texte CANON' },
      { profile: 'sensoriel', prose: 'texte SENS' },
    ]);
    const sel = judgedSelect(record, t);
    expect(sel.changedWinner).toBe(true);
    expect(sel.winner.kind === 'WINNER' && sel.winner.profile === 'sensoriel').toBe(true); // 690+40 > 700
    expect(sel.adjusted.every((a) => a.profile !== 'dialogue')).toBe(true); // l'inéligible exclu
  });

  it('aucun éligible ⇒ judgedSelect conserve le fallback flaggé (jamais de promotion par juge)', async () => {
    const record: AdmissionRecord = {
      chapter: 9, mode: 'BOOST',
      candidates: [{ profile: 'dialogue', proseHash: 'h' as Sha256Hex, eligible: false, expScore: 999, gates: [] }],
      winner: { kind: 'NONE_ELIGIBLE_FLAGGED', bestUnderGates: 'dialogue' },
      admissionHash: 'b'.repeat(64) as Sha256Hex,
    };
    const t = await runTournament({ compare: async () => 'TIE' }, []);
    const sel = judgedSelect(record, t);
    expect(sel.winner.kind).toBe('NONE_ELIGIBLE_FLAGGED');
  });
});
