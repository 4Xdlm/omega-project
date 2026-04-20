/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 REJECTION GATE — INTEGRATION TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests d'intégration vérifiant que le R6 gate s'intègre correctement
 * avec le pipeline Sovereign Engine via le pipeline adapter.
 *
 * Couvre :
 * - Pipeline adapter (createR6GeneratorFromProvider)
 * - isR6GateEnabled / getR6GateMode
 * - runR6GateInPipeline avec un mock provider
 * - Logging structuré
 * - Feature flag behavior
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isR6GateEnabled,
  getR6GateMode,
  runR6GateInPipeline,
  createR6GeneratorFromProvider,
} from '../../src/gate/r6-pipeline-adapter.js';
import { buildR6GateConfig } from '../../src/gate/r6-types.js';
import type { SovereignProvider } from '../../src/types.js';

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ──────────────────────────────────────────────────────────────────────────────

const LONG_PROSE_FR =
  'Le soleil déclinait sur les toits de la ville, projetant des ombres longues ' +
  'et dorées sur les pavés humides. Marie marchait sans se presser, les mains ' +
  'enfoncées dans les poches de son manteau. Elle pensait à cette lettre, celle ' +
  'qu\'elle n\'avait jamais envoyée, celle qui dormait encore dans le tiroir de ' +
  'sa commode. Les mots lui revenaient par fragments, brisés par le temps et ' +
  'l\'oubli. Chaque syllabe portait le poids d\'une décision mûrie pendant des ' +
  'mois, une décision qui changerait tout. Le vent soufflait, froid et insistant. ' +
  'Elle s\'arrêta devant la boulangerie, hésita, puis poussa la porte. L\'odeur ' +
  'du pain chaud l\'enveloppa, chaude et réconfortante, comme un souvenir d\'enfance.';

/**
 * Mock minimal d'un SovereignProvider.
 * Seul generateDraft est implémenté (le R6 gate n'utilise rien d'autre).
 */
function createMockProvider(prose: string): SovereignProvider {
  return {
    generateDraft: async (
      _prompt: string,
      _mode: string,
      _seed: string,
    ): Promise<string> => prose,
    // Les autres méthodes ne sont pas appelées par le R6 gate
    scoreInteriority: async () => 80,
    scoreSensory: async () => 80,
    scoreNecessity: async () => 80,
    scoreImpact: async () => 80,
    applyPatch: async (_prose: string) => _prose,
  } as unknown as SovereignProvider;
}

// ──────────────────────────────────────────────────────────────────────────────
// ENV VAR MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────────

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {
    OMEGA_R6_GATE: process.env.OMEGA_R6_GATE,
    OMEGA_R6_GATE_THRESHOLD: process.env.OMEGA_R6_GATE_THRESHOLD,
    OMEGA_R6_GATE_VERBOSE: process.env.OMEGA_R6_GATE_VERBOSE,
  };
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// isR6GateEnabled
// ──────────────────────────────────────────────────────────────────────────────

describe('isR6GateEnabled', () => {
  it('returns true when env var is "shadow"', () => {
    process.env.OMEGA_R6_GATE = 'shadow';
    expect(isR6GateEnabled()).toBe(true);
  });

  it('returns true when env var is "1"', () => {
    process.env.OMEGA_R6_GATE = '1';
    expect(isR6GateEnabled()).toBe(true);
  });

  it('returns false when env var is "0"', () => {
    process.env.OMEGA_R6_GATE = '0';
    expect(isR6GateEnabled()).toBe(false);
  });

  it('returns true when env var is unset (default shadow)', () => {
    delete process.env.OMEGA_R6_GATE;
    expect(isR6GateEnabled()).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getR6GateMode
// ──────────────────────────────────────────────────────────────────────────────

describe('getR6GateMode', () => {
  it('returns "disabled" for "0"', () => {
    process.env.OMEGA_R6_GATE = '0';
    expect(getR6GateMode()).toBe('disabled');
  });

  it('returns "active" for "1"', () => {
    process.env.OMEGA_R6_GATE = '1';
    expect(getR6GateMode()).toBe('active');
  });

  it('returns "shadow" for "shadow"', () => {
    process.env.OMEGA_R6_GATE = 'shadow';
    expect(getR6GateMode()).toBe('shadow');
  });

  it('returns "shadow" for unknown values', () => {
    process.env.OMEGA_R6_GATE = 'foo';
    expect(getR6GateMode()).toBe('shadow');
  });

  it('returns "shadow" when unset', () => {
    delete process.env.OMEGA_R6_GATE;
    expect(getR6GateMode()).toBe('shadow');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildR6GateConfig
// ──────────────────────────────────────────────────────────────────────────────

describe('buildR6GateConfig', () => {
  it('reads threshold from env var', () => {
    process.env.OMEGA_R6_GATE_THRESHOLD = '3.8';
    const config = buildR6GateConfig();
    expect(config.threshold).toBe(3.8);
  });

  it('defaults threshold to 4.2', () => {
    delete process.env.OMEGA_R6_GATE_THRESHOLD;
    const config = buildR6GateConfig();
    expect(config.threshold).toBe(4.2);
  });

  it('defaults maxRetries to 2', () => {
    const config = buildR6GateConfig();
    expect(config.maxRetries).toBe(2);
  });

  it('defaults temperatureSchedule to [null, 0.85, 0.90]', () => {
    const config = buildR6GateConfig();
    expect(config.temperatureSchedule).toEqual([null, 0.85, 0.90]);
  });

  it('overrides take precedence over env', () => {
    process.env.OMEGA_R6_GATE_THRESHOLD = '3.0';
    const config = buildR6GateConfig({ threshold: 5.0 });
    expect(config.threshold).toBe(5.0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// createR6GeneratorFromProvider
// ──────────────────────────────────────────────────────────────────────────────

describe('createR6GeneratorFromProvider', () => {
  it('wraps provider.generateDraft correctly', async () => {
    let capturedSeed = '';
    const provider = {
      generateDraft: async (
        _prompt: string,
        _mode: string,
        seed: string,
      ): Promise<string> => {
        capturedSeed = seed;
        return LONG_PROSE_FR;
      },
    } as unknown as SovereignProvider;

    const gen = createR6GeneratorFromProvider(provider, 'test prompt', 'mode1');
    const result = await gen.generate('ignored', 'my_seed', 0.85);

    expect(result).toBe(LONG_PROSE_FR);
    expect(capturedSeed).toBe('my_seed');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// runR6GateInPipeline
// ──────────────────────────────────────────────────────────────────────────────

describe('runR6GateInPipeline', () => {
  it('runs in shadow mode by default', async () => {
    delete process.env.OMEGA_R6_GATE;
    const provider = createMockProvider(LONG_PROSE_FR);

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'fr',
    );

    expect(result.prose).toBe(LONG_PROSE_FR);
    expect(result.gateResult.gateMode).toBe('shadow');
    // Shadow mode runs all attempts
    expect(result.gateResult.attemptCount).toBe(3);
  });

  it('runs in disabled mode when configured', async () => {
    const provider = createMockProvider(LONG_PROSE_FR);

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'fr',
      { mode: 'disabled' },
    );

    expect(result.prose).toBe(LONG_PROSE_FR);
    expect(result.gateResult.gateMode).toBe('disabled');
    expect(result.gateResult.attemptCount).toBe(1);
    expect(result.gateActive).toBe(false);
  });

  it('runs in active mode with low threshold → 1 attempt', async () => {
    const provider = createMockProvider(LONG_PROSE_FR);

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'fr',
      { mode: 'active', threshold: 0.0 }, // impossibly low → immediate pass
    );

    expect(result.gateResult.attemptCount).toBe(1);
    expect(result.gateResult.passed).toBe(true);
    expect(result.gateActive).toBe(true);
  });

  it('returns prose even when all attempts below threshold', async () => {
    const provider = createMockProvider(LONG_PROSE_FR);

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'fr',
      { mode: 'active', threshold: 99.0, maxRetries: 2 },
    );

    // Fallback A: best jet returned even below threshold
    expect(result.prose.length).toBeGreaterThan(0);
    expect(result.gateResult.belowThreshold).toBe(true);
    expect(result.gateResult.attemptCount).toBe(3);
  });

  it('CALC score is a finite number for valid prose', async () => {
    const provider = createMockProvider(LONG_PROSE_FR);

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'fr',
      { mode: 'shadow' },
    );

    expect(Number.isFinite(result.gateResult.selectedAttempt.calcScore)).toBe(true);
  });

  it('works with EN language', async () => {
    const proseEN =
      'The old lighthouse stood at the edge of the cliff, its paint peeling and ' +
      'its light long extinguished. Sarah climbed the narrow path, counting steps. ' +
      'At the top she found what she was looking for: the logbook, leather-bound ' +
      'and weathered. His handwriting was precise, meticulous, recording every storm. ' +
      'She closed the book and looked out through the window at the grey sea below.';

    const provider = createMockProvider(proseEN);

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'en',
      { mode: 'shadow' },
    );

    expect(result.gateResult.selectedAttempt.langRoute).toBe('en');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// INVARIANTS D'INTÉGRATION
// ──────────────────────────────────────────────────────────────────────────────

describe('R6 pipeline integration invariants', () => {
  it('gate never modifies the prose content', async () => {
    const provider = createMockProvider(LONG_PROSE_FR);

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'fr',
      { mode: 'active', threshold: 0.0 },
    );

    // The gate returns exactly what the provider generated
    expect(result.prose).toBe(LONG_PROSE_FR);
  });

  it('gate result contains calibration metadata', async () => {
    const provider = createMockProvider(LONG_PROSE_FR);

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'fr',
      { mode: 'shadow' },
    );

    expect(result.gateResult.gateThreshold).toBe(4.2); // default
    expect(result.gateResult.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('disabled gate produces same result as direct generation', async () => {
    let directProse = '';
    const provider = {
      generateDraft: async (
        _prompt: string,
        _mode: string,
        seed: string,
      ): Promise<string> => {
        directProse = `prose_for_${seed}`;
        return directProse;
      },
    } as unknown as SovereignProvider;

    const result = await runR6GateInPipeline(
      provider,
      'test prompt',
      'mode1',
      'seed_001',
      'fr',
      { mode: 'disabled' },
    );

    expect(result.prose).toBe('prose_for_seed_001');
  });
});
