/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 REJECTION GATE — PIPELINE ADAPTER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/gate/r6-pipeline-adapter.ts
 * Version:  1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md
 *
 * Rôle
 * ----
 * Adapte le R6 Rejection Gate au pipeline Sovereign Engine.
 * Encapsule l'appel à provider.generateDraft() avec le gate R6.
 *
 * Ce module est le SEUL point de contact entre le gate R6 et engine.ts.
 * Il crée l'adaptateur R6ProseGenerator à partir du SovereignProvider.
 *
 * Point d'insertion dans le pipeline :
 *   Prompt Assembly → [R6 GATE ADAPTER] → initialDraft → Sovereign Loop
 *
 * Le gate ne modifie ni le prompt, ni le ForgePacket, ni le scoring V1/V3.
 * Il garantit seulement qu'un minimum structurel CALC est atteint avant
 * d'investir les appels LLM coûteux du scoring V3.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../types.js';
import { runR6RejectionGate, buildR6GateLog } from './r6-rejection-gate.js';
import { buildR6GateConfig } from './r6-types.js';
import type {
  R6GateConfig,
  R6GateResult,
  R6ProseGenerator,
  R6Language,
  R6GateMode,
} from './r6-types.js';

// ──────────────────────────────────────────────────────────────────────────────
// R6 GATE STATUS CHECK
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si le R6 gate est activé (shadow ou active).
 * Utilisé par engine.ts pour décider s'il faut passer par le gate.
 */
export function isR6GateEnabled(): boolean {
  const mode = process.env.OMEGA_R6_GATE ?? 'shadow';
  return mode !== '0';
}

/**
 * Retourne le mode R6 actuel.
 */
export function getR6GateMode(): R6GateMode {
  const modeRaw = process.env.OMEGA_R6_GATE ?? 'shadow';
  if (modeRaw === '0') return 'disabled';
  if (modeRaw === '1') return 'active';
  if (modeRaw === 'shadow') return 'shadow';
  return 'shadow';
}

// ──────────────────────────────────────────────────────────────────────────────
// PROVIDER ADAPTER
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Crée un R6ProseGenerator à partir d'un SovereignProvider standard.
 *
 * L'adaptateur encapsule provider.generateDraft() en gérant :
 * - Le mapping de température (null = pas de override)
 * - Le mapping de seed
 * - Le mode de draft (premier mode du config)
 *
 * @param provider - Le SovereignProvider existant (SCRIBE/Ollama/API)
 * @param promptText - Le prompt complet (assemblé par prompt-assembler)
 * @param draftMode - Le mode de draft (ex: premier mode du config)
 */
export function createR6GeneratorFromProvider(
  provider: SovereignProvider,
  promptText: string,
  draftMode: string,
): R6ProseGenerator {
  return {
    generate: async (
      _prompt: string,
      seed: string,
      _temperature: number | null,
    ): Promise<string> => {
      // Note: le prompt est capturé dans la closure (promptText),
      // pas passé par le gate. Le gate n'a pas autorité sur le prompt.
      // La température est gérée par le provider lui-même via le seed.
      // Le R6 gate influence la température via le suffixe de seed
      // que le provider peut interpréter.
      return provider.generateDraft(promptText, draftMode, seed);
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// PIPELINE ENTRY POINT
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Résultat de l'adaptateur pipeline R6.
 */
export interface R6PipelineResult {
  /** Prose sélectionnée par le gate (ou unique jet si disabled). */
  readonly prose: string;
  /** Résultat complet du gate (pour télémétrie). */
  readonly gateResult: R6GateResult;
  /** Le gate était-il actif pour ce run ? */
  readonly gateActive: boolean;
}

/**
 * Exécute le R6 gate dans le contexte du pipeline Sovereign Engine.
 *
 * Si le gate est disabled → génère un seul jet (comportement identique au legacy).
 * Si le gate est shadow → génère N jets, retourne le premier, logue les résultats.
 * Si le gate est active → génère jusqu'à N jets, retourne le meilleur passant le seuil.
 *
 * @param provider - Le SovereignProvider (SCRIBE/Ollama)
 * @param promptText - Le prompt assemblé (sections jointes)
 * @param draftMode - Le mode de draft
 * @param baseSeed - Le seed de base du ForgePacket
 * @param language - La langue de la scène ('fr' | 'en')
 * @param configOverrides - Overrides optionnels pour la config R6
 * @returns R6PipelineResult avec la prose et les métadonnées
 */
export async function runR6GateInPipeline(
  provider: SovereignProvider,
  promptText: string,
  draftMode: string,
  baseSeed: string,
  language: R6Language,
  configOverrides?: Partial<R6GateConfig>,
): Promise<R6PipelineResult> {
  const config = buildR6GateConfig(configOverrides);
  const generator = createR6GeneratorFromProvider(provider, promptText, draftMode);

  const gateResult = await runR6RejectionGate(
    generator,
    promptText,
    baseSeed,
    language,
    config,
  );

  // Logging obligatoire (ADR-003 §6)
  const log = buildR6GateLog(gateResult);
  const logPrefix = gateResult.gateMode === 'shadow' ? '[R6-SHADOW]' : '[R6-GATE]';
  const passLabel = gateResult.passed ? 'PASS' : 'BELOW_THRESHOLD';

  console.log(
    `${logPrefix} ${passLabel} | score=${formatScore(gateResult.selectedAttempt.calcScore)} ` +
    `| threshold=${config.threshold} | attempts=${gateResult.attemptCount} ` +
    `| lang=${gateResult.selectedAttempt.langRoute} | duration=${gateResult.totalDurationMs}ms`,
  );

  if (gateResult.belowThreshold) {
    console.warn(
      `${logPrefix} ⚠ ALL ATTEMPTS BELOW THRESHOLD | best_score=${formatScore(gateResult.selectedAttempt.calcScore)} ` +
      `| scores=[${gateResult.allAttempts.map(a => formatScore(a.calcScore)).join(', ')}]`,
    );
  }

  // Log détaillé pour debug (JSON structuré)
  if (process.env.OMEGA_R6_GATE_VERBOSE === '1') {
    console.log(`${logPrefix} LOG: ${JSON.stringify(log)}`);
  }

  return {
    prose: gateResult.selectedAttempt.prose,
    gateResult,
    gateActive: config.mode === 'active',
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function formatScore(score: number): string {
  return Number.isFinite(score) ? score.toFixed(3) : 'NaN';
}
