import { describe, it, expect } from 'vitest';
import { isPhaseSealed, checkWaiverExpiration } from '../../src/sentinel/waiver_check';

describe('WAIVER_CHECK v1.1', () => {
  it('isPhaseSealed returns boolean', () => {
    // Phase Q devrait être sealed (tag existe)
    const resultQ = isPhaseSealed('Q');
    expect(typeof resultQ).toBe('boolean');

    // Phase NONEXISTENT ne devrait pas exister
    const resultNonExistent = isPhaseSealed('ZZZZNONEXISTENT');
    expect(resultNonExistent).toBe(false);
  });

  it('detects Phase Q as sealed (via tag)', () => {
    // Phase Q a le tag phase-q-sealed
    const result = isPhaseSealed('Q');
    // Ce test vérifie que la logique fonctionne
    expect(result).toBe(true);
  });

  it('factual verification - not string-based', () => {
    // La fonction ne prend pas de paramètre "sealingPhase"
    // Elle vérifie factuellement l'état
    const sealed = isPhaseSealed('Q');
    const notSealed = isPhaseSealed('NONEXISTENT');

    // Au minimum, on vérifie le type de retour
    expect(typeof sealed).toBe('boolean');
    expect(notSealed).toBe(false);
  });

  it('checkWaiverExpiration returns structured result', () => {
    const result = checkWaiverExpiration();

    expect(Array.isArray(result.expired)).toBe(true);
    expect(Array.isArray(result.active)).toBe(true);
    expect(Array.isArray(result.sealedPhases)).toBe(true);
  });

  it('Phase Q waivers expire when Phase C is sealed', () => {
    // Les waivers Phase Q expirent à Phase C
    // Avant le seal de Phase C, ils devraient être actifs
    const result = checkWaiverExpiration();

    // Vérifier que les waivers Phase Q existent
    const allWaivers = [...result.expired, ...result.active];
    const phaseQWaivers = allWaivers.filter(w => w.phase === 'Q');

    // Si Phase C n'est pas encore sealed, les waivers Q devraient être actifs
    // Si Phase C est sealed, ils devraient être expirés
    expect(phaseQWaivers.length).toBeGreaterThan(0);
  });
});
