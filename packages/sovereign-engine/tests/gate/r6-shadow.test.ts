/**
 * Tests — R6 COMPOSITE SHADOW HOOK (V4.4->R6 bridge).
 * Batterie imposee (tribunal 2026-07-21) :
 *  - flag off => resultat IDENTIQUE (aucun compositeShadow) ;
 *  - flag shadow + scoreurs => compositeShadow present, selectedAttempt INCHANGE ;
 *  - divergence detectee ; non-divergence ; no-op sans scoreurs ; determinisme.
 */
import { describe, it, expect } from 'vitest';
import { attachCompositeShadow, isCompositeShadowEnabled, type EmotionalShadowScorers } from '../../src/gate/emotional/r6-shadow.js';
import { runR6RejectionGate } from '../../src/gate/r6-rejection-gate.js';
import type { R6GateResult, R6GateAttempt, R6ProseGenerator } from '../../src/gate/r6-types.js';

const SHADOW_ENV = { OMEGA_R6_COMPOSITE: 'shadow' } as NodeJS.ProcessEnv;
const OFF_ENV = {} as NodeJS.ProcessEnv;

function mkAttempt(i: number, calcScore: number, prose: string): R6GateAttempt {
  return {
    attemptIndex: i, prose, calcScore,
    features: {} as R6GateAttempt['features'],
    temperature: null, seed: `seed_${i}`, durationMs: 1, langRoute: 'fr', passedGate: false,
  };
}
function mkResult(attempts: R6GateAttempt[], selectedIndex: number): R6GateResult {
  return {
    passed: false, selectedAttempt: attempts[selectedIndex], allAttempts: attempts,
    attemptCount: attempts.length, selectedAttemptIndex: selectedIndex, gateThreshold: 4.2,
    belowThreshold: true, gateMode: 'shadow', totalDurationMs: 3,
  };
}

// Scoreurs : emotion depend de la prose (mappe par contenu). Logic absent => 0.5.
const scorers: EmotionalShadowScorers = {
  scoreEmotion: (prose: string): number => (prose.includes('EMO') ? 95 : 20),
};

describe('isCompositeShadowEnabled', () => {
  it('vrai seulement pour la valeur exacte "shadow"', () => {
    expect(isCompositeShadowEnabled(SHADOW_ENV)).toBe(true);
    expect(isCompositeShadowEnabled(OFF_ENV)).toBe(false);
    expect(isCompositeShadowEnabled({ OMEGA_R6_COMPOSITE: 'active' } as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('attachCompositeShadow', () => {
  const attempts = [
    mkAttempt(0, 6.4, 'style haut, emotion basse'),   // style01 ~0.98, emo 20
    mkAttempt(1, 4.3, 'EMO emotion haute style moyen'), // style01 ~0.56, emo 95
  ];
  const result = mkResult(attempts, 0);

  it('flag OFF => resultat identique, aucun compositeShadow', async () => {
    const r = await attachCompositeShadow(result, scorers, OFF_ENV);
    expect(r).toBe(result);
    expect(r.compositeShadow).toBeUndefined();
  });

  it('sans scoreurs => no-op meme si flag on', async () => {
    const r = await attachCompositeShadow(result, undefined, SHADOW_ENV);
    expect(r.compositeShadow).toBeUndefined();
  });

  it('flag shadow + scoreurs => compositeShadow present, selection PROD inchangee', async () => {
    const r = await attachCompositeShadow(result, scorers, SHADOW_ENV);
    expect(r.compositeShadow).toBeDefined();
    // selection production STRICTEMENT inchangee
    expect(r.selectedAttempt).toBe(result.selectedAttempt);
    expect(r.selectedAttemptIndex).toBe(0);
    expect(r.compositeShadow?.productionPickId).toBe('0');
  });

  it('DETECTE la divergence (style->0, composite->1)', async () => {
    const r = await attachCompositeShadow(result, scorers, SHADOW_ENV);
    const cs = r.compositeShadow!;
    expect(cs.full.styleOnlyPickId).toBe('0');
    expect(cs.full.compositePickId).toBe('1');
    expect(cs.full.diverged).toBe(true);
    expect(cs.emotionStyle.diverged).toBe(true);
    expect(cs.emotionGainIfDivergedFull).toBeGreaterThan(0);
    expect(cs.perAttempt).toHaveLength(2);
  });

  it('PAS de divergence quand le meme jet domine', async () => {
    const a = [mkAttempt(0, 6.4, 'EMO fort partout'), mkAttempt(1, 3.0, 'faible')];
    const r = await attachCompositeShadow(mkResult(a, 0), scorers, SHADOW_ENV);
    expect(r.compositeShadow?.full.diverged).toBe(false);
    expect(r.compositeShadow?.emotionGainIfDivergedFull).toBe(0);
  });

  it('est deterministe', async () => {
    const r1 = await attachCompositeShadow(result, scorers, SHADOW_ENV);
    const r2 = await attachCompositeShadow(result, scorers, SHADOW_ENV);
    expect(r1.compositeShadow).toEqual(r2.compositeShadow);
  });
});

describe('runR6RejectionGate (integration wrapper)', () => {
  // Generateur mock : prose deterministe par seed. Shadow mode => 3 tentatives.
  const gen: R6ProseGenerator = {
    generate: (_p: string, seed: string): Promise<string> =>
      Promise.resolve(`Ker-Morvan. Le port dormait sous la pluie grise et lourde. Garcia marcha. ${seed} ${'x'.repeat(300)}`),
  };

  it('flag OFF => aucun compositeShadow, selection prod normale', async () => {
    const r = await runR6RejectionGate(gen, 'prompt', 'base', 'fr', { mode: 'shadow' }, scorers);
    // flag non arme dans process.env de test => pas de shadow
    if (process.env.OMEGA_R6_COMPOSITE !== 'shadow') {
      expect(r.compositeShadow).toBeUndefined();
    }
    expect(r.selectedAttempt).toBeDefined();
  });

  it('sans scoreurs injectes => aucun compositeShadow (retro-compat)', async () => {
    const r = await runR6RejectionGate(gen, 'prompt', 'base', 'fr', { mode: 'shadow' });
    expect(r.compositeShadow).toBeUndefined();
    expect(r.allAttempts.length).toBeGreaterThanOrEqual(1);
  });
});
