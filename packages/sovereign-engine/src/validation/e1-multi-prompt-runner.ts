/**
 * ===============================================================================
 * OMEGA SOVEREIGN STYLE ENGINE — E1 MULTI-PROMPT RUNNER (W5b)
 * ===============================================================================
 *
 * Module: validation/e1-multi-prompt-runner.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Phase T — W5b: Multi-prompt runner for E1_continuity_impossible.
 *
 * Architecture 3 etages:
 *   Etage 1: planPrompt -> ContinuityPlanJSON (LLM generates plan)
 *   Etage 2: loop i=0..9 -> scene prose + state_delta DSL
 *   Etage 3: computeChecksum -> verify -> retry max 2 -> fallback one-shot
 *
 * Fallback global: try/catch -> generateDraft() one-shot
 *
 * ===============================================================================
 */

import type { ForgePacket } from '../types.js';
import type { LLMProvider, LLMProviderResult } from './validation-types.js';
import {
  type ContinuityPlanJSON,
  type ContinuityState,
  type StateDelta,
  validateContinuityPlan,
  computeChecksum,
  createInitialState,
  applyStateDelta,
  validateStateDelta,
} from './continuity-plan.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

// ===============================================================================
// CONFIG
// ===============================================================================

const SCENE_COUNT = 10;
const MAX_RETRIES_PER_SCENE = 2;
const PLAN_MAX_TOKENS = 1500;
const SCENE_MAX_TOKENS = 800;

// ===============================================================================
// PROMPTS
// ===============================================================================

function buildPlanPrompt(packet: ForgePacket): string {
  return `Tu es un architecte narratif. Planifie une sequence de ${SCENE_COUNT} scenes liees pour cette histoire.

CONTEXTE:
- Objectif: ${packet.intent.story_goal}
- Scene principale: ${packet.intent.scene_goal}
- Conflit: ${packet.intent.conflict_type}
- POV: ${packet.intent.pov}

CONTRAINTES:
- Exactement ${SCENE_COUNT} scenes
- Tension croissante globale (courbe de 0.0 a 1.0)
- Chaque scene a: emotional_target, narrative_beat, sensory_anchor, tension_target

Reponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de commentaire) au format:
{
  "plan_id": "plan_<uuid_court>",
  "experiment_id": "E1_continuity_impossible",
  "scene_count": ${SCENE_COUNT},
  "tension_curve": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  "scenes": [
    {
      "scene_index": 0,
      "emotional_target": "inquietude latente",
      "narrative_beat": "decouverte initiale",
      "sensory_anchor": "bruit metallique",
      "tension_target": 0.1
    }
  ],
  "global_arc": "description de l'arc narratif global"
}

Les ${SCENE_COUNT} scenes doivent etre presentes dans le tableau "scenes".`;
}

function buildScenePrompt(
  packet: ForgePacket,
  plan: ContinuityPlanJSON,
  state: ContinuityState,
  sceneIndex: number,
): string {
  const scenePlan = plan.scenes[sceneIndex];
  const previousProse = state.accumulated_prose.length > 0
    ? state.accumulated_prose[state.accumulated_prose.length - 1]
    : '(premiere scene)';

  const openThreads = state.open_threads.length > 0
    ? state.open_threads.join(', ')
    : 'aucun';

  const charStates = Object.entries(state.character_states).length > 0
    ? Object.entries(state.character_states).map(([k, v]) => `${k}: ${v}`).join(', ')
    : 'non definis';

  return `Tu es un auteur litteraire exigeant. Ecris la scene ${sceneIndex + 1}/${SCENE_COUNT}.

ARC GLOBAL: ${plan.global_arc}

SCENE ${sceneIndex + 1}:
- Cible emotionnelle: ${scenePlan.emotional_target}
- Beat narratif: ${scenePlan.narrative_beat}
- Ancre sensorielle: ${scenePlan.sensory_anchor}
- Tension cible: ${scenePlan.tension_target}

ETAT COURANT:
- Fils narratifs ouverts: ${openThreads}
- Etats personnages: ${charStates}
- Scene precedente (extrait): ${previousProse.slice(0, 300)}

CONTRAINTES:
- Mots-signature a utiliser: ${packet.style_genome.lexicon.signature_words.slice(0, 5).join(', ')}
- Cliches interdits: ${packet.kill_lists.banned_cliches.join(', ')}
- Max 200 mots de prose

Reponds UNIQUEMENT avec un JSON valide (pas de markdown) au format:
{
  "prose": "ta prose ici...",
  "state_delta": {
    "advance_scene": true,
    "set": {"personnage_principal": "etat_emotionnel"},
    "push_thread": "nouveau_fil_ou_null",
    "close_thread": "fil_resolu_ou_null"
  }
}`;
}

// ===============================================================================
// PARSERS
// ===============================================================================

function cleanJsonResponse(raw: string): string {
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function parsePlanResponse(raw: string): ContinuityPlanJSON | null {
  const cleaned = cleanJsonResponse(raw);
  try {
    const parsed = JSON.parse(cleaned);
    const errors = validateContinuityPlan(parsed);
    if (errors.length > 0) {
      console.log(`[E1-MP] Plan validation errors: ${errors.map(e => `${e.field}: ${e.message}`).join('; ')}`);
      return null;
    }
    // Compute and verify checksum
    const expectedChecksum = computeChecksum(parsed);
    return { ...parsed, checksum: expectedChecksum };
  } catch (e) {
    console.log(`[E1-MP] Plan JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

interface SceneResponse {
  readonly prose: string;
  readonly state_delta: StateDelta;
}

function parseSceneResponse(raw: string): SceneResponse | null {
  const cleaned = cleanJsonResponse(raw);
  try {
    const parsed = JSON.parse(cleaned);

    if (!parsed.prose || typeof parsed.prose !== 'string' || parsed.prose.trim().length === 0) {
      console.log('[E1-MP] Scene response missing prose');
      return null;
    }

    if (!parsed.state_delta) {
      console.log('[E1-MP] Scene response missing state_delta');
      return null;
    }

    const deltaErrors = validateStateDelta(parsed.state_delta);
    if (deltaErrors.length > 0) {
      console.log(`[E1-MP] state_delta validation errors: ${deltaErrors.map(e => `${e.field}: ${e.message}`).join('; ')}`);
      return null;
    }

    return {
      prose: parsed.prose.trim(),
      state_delta: parsed.state_delta as StateDelta,
    };
  } catch (e) {
    console.log(`[E1-MP] Scene JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

// ===============================================================================
// MAIN RUNNER
// ===============================================================================

/**
 * Run E1 multi-prompt pipeline.
 * Returns LLMProviderResult with concatenated prose from all 10 scenes.
 *
 * Fallback: if any stage fails beyond retry cap, falls back to one-shot generateDraft.
 */
export async function runE1MultiPrompt(
  packet: ForgePacket,
  provider: LLMProvider,
): Promise<LLMProviderResult> {
  try {
    // ═══════════════════════════════════════════════════════════════════
    // ETAGE 1: Plan generation
    // ═══════════════════════════════════════════════════════════════════
    console.log('[E1-MP] Etage 1: generation du plan de continuite...');

    const planPrompt = buildPlanPrompt(packet);
    let plan: ContinuityPlanJSON | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_SCENE; attempt++) {
      const planRaw = await provider.generateText(planPrompt, PLAN_MAX_TOKENS, `plan_attempt_${attempt}`);
      plan = parsePlanResponse(planRaw);
      if (plan) {
        console.log(`[E1-MP] Plan valide (checksum: ${plan.checksum.slice(0, 12)}...)`);
        break;
      }
      console.log(`[E1-MP] Plan invalide, retry ${attempt + 1}/${MAX_RETRIES_PER_SCENE + 1}`);
    }

    if (!plan) {
      console.log('[E1-MP] Plan: echec apres retries -> fallback one-shot');
      return provider.generateDraft(packet, 'fallback_plan_failed');
    }

    // ═══════════════════════════════════════════════════════════════════
    // ETAGE 2: Scene-by-scene generation
    // ═══════════════════════════════════════════════════════════════════
    console.log('[E1-MP] Etage 2: generation scene par scene...');

    let state = createInitialState();
    const allProse: string[] = [];

    for (let i = 0; i < SCENE_COUNT; i++) {
      console.log(`[E1-MP] Scene ${i + 1}/${SCENE_COUNT}...`);

      const scenePrompt = buildScenePrompt(packet, plan, state, i);
      let sceneResult: SceneResponse | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES_PER_SCENE; attempt++) {
        const sceneRaw = await provider.generateText(scenePrompt, SCENE_MAX_TOKENS, `scene_${i}_attempt_${attempt}`);
        sceneResult = parseSceneResponse(sceneRaw);
        if (sceneResult) break;
        console.log(`[E1-MP] Scene ${i + 1} invalide, retry ${attempt + 1}/${MAX_RETRIES_PER_SCENE + 1}`);
      }

      if (!sceneResult) {
        console.log(`[E1-MP] Scene ${i + 1}: echec apres retries -> fallback one-shot`);
        return provider.generateDraft(packet, `fallback_scene_${i}_failed`);
      }

      allProse.push(sceneResult.prose);
      state = applyStateDelta(state, sceneResult.state_delta);
      state.accumulated_prose.push(sceneResult.prose);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ETAGE 3: Checksum verification + assembly
    // ═══════════════════════════════════════════════════════════════════
    console.log('[E1-MP] Etage 3: verification checksum et assemblage...');

    const finalChecksum = computeChecksum(plan);
    if (finalChecksum !== plan.checksum) {
      console.log(`[E1-MP] ERREUR: checksum mismatch (${finalChecksum.slice(0, 12)} !== ${plan.checksum.slice(0, 12)}) -> fallback one-shot`);
      return provider.generateDraft(packet, 'fallback_checksum_mismatch');
    }

    const concatenatedProse = allProse.join('\n\n---\n\n');
    const promptHash = sha256(canonicalize({
      model_id: provider.model_id,
      plan_checksum: plan.checksum,
      scene_count: SCENE_COUNT,
    }));

    console.log(`[E1-MP] Multi-prompt termine: ${allProse.length} scenes, ${concatenatedProse.length} chars`);

    return {
      prose: concatenatedProse,
      prompt_hash: promptHash,
    };

  } catch (error) {
    // Global fallback: any unexpected error -> one-shot
    console.log(`[E1-MP] ERREUR globale: ${error instanceof Error ? error.message : String(error)} -> fallback one-shot`);
    return provider.generateDraft(packet, 'fallback_global_error');
  }
}
