/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — CHUNKED GENERATOR INTÉGRATION DÉDALE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Étape 8 NCR_DEDALE_RESET_HEALTH v1.2 §8 (2026-04-23).
 *
 * Cible la faiblesse F-E6-1 : le re-throw `if (err instanceof
 * DedaleResetFailedError) throw err;` dans le catch `generateChunkedDraft`
 * ligne 818-828 doit être exercé runtime pour prouver que :
 *
 *   A. Un DedaleResetFailedError levé dans le try block (ex. depuis V2-B-LOOP
 *      sur verdict='reset_failed') traverse bien le catch générique et
 *      remonte vers les call-sites appelants (engine.ts:316 /
 *      duel-engine.ts:151). Sans absorption silencieuse.
 *
 *   B. Une Error non-Dédale (ex. planAdaptive fail) reste absorbée par le
 *      fallback legacy 4×750w — préservation du comportement historique
 *      hors-scope Dédale.
 *
 *   C. Le payload (code + context) de DedaleResetFailedError est préservé
 *      intact lors du re-throw (pas de wrap/unwrap).
 *
 * Stratégie : mocker `adaptive-chunker.js` pour contrôler `planAdaptive` et
 * `getAdaptiveMode`. Le throw se déclenche AVANT d'atteindre V2-B-LOOP, donc
 * ce test couvre uniquement la Brique C Point 2 (re-throw catch). La Brique
 * C Point 1 (throw V2-B-LOOP sur verdict='reset_failed') reste couverte par
 * inspection + non-régression des 89 tests dedale existants.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DedaleResetFailedError } from '../../src/dedale/types.js';

// ──────────────────────────────────────────────────────────────────────────────
// MOCKS — adaptive-chunker.js (intercepte planAdaptive pour forcer throw ciblé)
// ──────────────────────────────────────────────────────────────────────────────

vi.mock('../../src/generation/adaptive-chunker.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/generation/adaptive-chunker.js')>(
    '../../src/generation/adaptive-chunker.js',
  );
  return {
    ...actual,
    // planAdaptive surchargée par test via mockImplementation.
    planAdaptive: vi.fn(actual.planAdaptive),
    // getAdaptiveMode force '1' pour activer le path adaptive.
    getAdaptiveMode: vi.fn(() => '1'),
    // loadAdaptiveConfigFromEnv renvoie la config réelle pour ne pas casser la logique.
    loadAdaptiveConfigFromEnv: vi.fn(actual.loadAdaptiveConfigFromEnv),
    getAdaptiveVariant: vi.fn(actual.getAdaptiveVariant),
  };
});

// Import APRÈS vi.mock (ESM hoisting nécessite que vi.mock soit parsé avant)
const { generateChunkedDraft } = await import('../../src/generation/chunked-generator.js');
const adaptiveChunker = await import('../../src/generation/adaptive-chunker.js');

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES — input + provider minimalistes
// ──────────────────────────────────────────────────────────────────────────────

/** EmotionContract minimal valide pour déclencher le path adaptive. */
function buildMinimalEmotionContract(): Record<string, unknown> {
  // La valeur exacte est peu importante car planAdaptive sera mocké pour throw
  // AVANT de consommer ce contract. On fournit juste un objet non-null.
  return {
    axes: {
      necessity: 60,
      interiority: 55,
      impact: 50,
    },
    archetype: 'intimate',
    pacing: 'slow',
  };
}

function buildInput(): Parameters<typeof generateChunkedDraft>[0] {
  return {
    sceneBrief: 'Test scene brief for Dédale integration',
    signatureWords: ['silence', 'lumière', 'regard'],
    language: 'fr',
    seed: 'test-dedale-integration-seed',
    emotionContract: buildMinimalEmotionContract() as Parameters<typeof generateChunkedDraft>[0]['emotionContract'],
  };
}

function buildMockProvider(): Parameters<typeof generateChunkedDraft>[1] {
  return {
    generateDraft: vi.fn().mockResolvedValue('<prose>mock prose</prose>'),
  } as unknown as Parameters<typeof generateChunkedDraft>[1];
}

// ──────────────────────────────────────────────────────────────────────────────
// SETUP — reset mocks + env between tests
// ──────────────────────────────────────────────────────────────────────────────

const ORIGINAL_DEDALE_MODE = process.env.OMEGA_DEDALE_MODE;

beforeEach(() => {
  vi.clearAllMocks();
  // Désactive Dédale pour les tests qui mockent planAdaptive (on teste le
  // catch block indépendamment du path Dédale interne).
  delete process.env.OMEGA_DEDALE_MODE;
});

afterEach(() => {
  if (ORIGINAL_DEDALE_MODE !== undefined) {
    process.env.OMEGA_DEDALE_MODE = ORIGINAL_DEDALE_MODE;
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// TESTS — Brique C Point 2 (re-throw catch générique)
// ──────────────────────────────────────────────────────────────────────────────

describe('generateChunkedDraft — Dédale reset propagation (Étape 8 NCR_DEDALE_RESET_HEALTH)', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TEST A : DedaleResetFailedError traverse le catch → remonte au caller
  // ─────────────────────────────────────────────────────────────────────────
  it('re-throws DedaleResetFailedError from catch block (not absorbed by legacy fallback)', async () => {
    const dedaleErr = new DedaleResetFailedError('reset_outcome_failed', {
      run_id: 'test-run-id-1',
      chunk_index: 1,
      attempt: 0,
      seed: 'test-seed',
      mode: 'on',
      trigger_path: 'v2b',
      resets_used: 1,
    });

    (adaptiveChunker.planAdaptive as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw dedaleErr;
    });

    const input = buildInput();
    const provider = buildMockProvider();

    // F-E6-1 cible : l'erreur doit remonter, PAS être absorbée en fallback legacy
    await expect(generateChunkedDraft(input, provider)).rejects.toThrow(DedaleResetFailedError);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST B : Error non-Dédale reste absorbée en fallback legacy (comportement préservé)
  // ─────────────────────────────────────────────────────────────────────────
  it('preserves legacy fallback for non-Dédale errors (fallback triggered, no throw)', async () => {
    const banalErr = new Error('adaptive plan computation failed — simulated');

    (adaptiveChunker.planAdaptive as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw banalErr;
    });

    const input = buildInput();
    const provider = buildMockProvider();

    // Pas de throw : le catch absorbe + bascule fallback legacy 4×750w
    // provider.generateDraft appelé 4 fois par le fallback legacy
    const result = await generateChunkedDraft(input, provider);
    expect(result).toBeDefined();
    expect(result.adaptive_fallback_triggered).toBe(true);
    // provider appelé pour les 4 chunks legacy
    expect((provider.generateDraft as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST C : Payload DedaleResetFailedError préservé intact lors du re-throw
  // ─────────────────────────────────────────────────────────────────────────
  it('preserves error.code and error.context payload across re-throw', async () => {
    const originalContext = {
      run_id: 'test-run-id-2',
      chunk_index: 3,
      attempt: 1,
      seed: 'payload-preservation-seed',
      mode: 'on',
      trigger_path: 'v2b',
      resets_used: 2,
    };
    const dedaleErr = new DedaleResetFailedError('reset_outcome_failed', originalContext);

    (adaptiveChunker.planAdaptive as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw dedaleErr;
    });

    const input = buildInput();
    const provider = buildMockProvider();

    try {
      await generateChunkedDraft(input, provider);
      expect.fail('generateChunkedDraft should have thrown DedaleResetFailedError');
    } catch (err) {
      expect(err).toBeInstanceOf(DedaleResetFailedError);
      const dedaleCaught = err as DedaleResetFailedError;
      expect(dedaleCaught.code).toBe('reset_outcome_failed');
      expect(dedaleCaught.name).toBe('DedaleResetFailedError');
      // Payload context intact (chunk_index + run_id critiques pour post-mortem)
      expect(dedaleCaught.context.run_id).toBe('test-run-id-2');
      expect(dedaleCaught.context.chunk_index).toBe(3);
      expect(dedaleCaught.context.mode).toBe('on');
      expect(dedaleCaught.context.trigger_path).toBe('v2b');
      // Identité référentielle : le re-throw est bien le même objet
      expect(dedaleCaught).toBe(dedaleErr);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST D : instanceof discrimination — sous-classe ≠ Error banale
  // ─────────────────────────────────────────────────────────────────────────
  it('uses instanceof check, not name string comparison', async () => {
    // Fabrique un Error avec le MÊME name mais qui n'est PAS instanceof DedaleResetFailedError
    const fakeErr = new Error('faux reset_failed');
    Object.defineProperty(fakeErr, 'name', { value: 'DedaleResetFailedError', writable: false });

    (adaptiveChunker.planAdaptive as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw fakeErr;
    });

    const input = buildInput();
    const provider = buildMockProvider();

    // Le fakeErr a le bon .name mais n'est pas instanceof DedaleResetFailedError
    // → doit être absorbé par fallback legacy (pas re-throw)
    const result = await generateChunkedDraft(input, provider);
    expect(result).toBeDefined();
    expect(result.adaptive_fallback_triggered).toBe(true);
  });
});
