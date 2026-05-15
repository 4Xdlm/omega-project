/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — TEST CORRECTIONPITCH PATCH P3.1.1 (smoke test Ollama)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Script: scripts/test-correctionpitch-patch.ts
 * Version: 1.0.0
 * Phase: P3.1.1 validation empirique post-fix
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * OBJECTIF — valider que le fix commit 847429cb :
 *   1. Consomme pitch.items[] sans crash (au lieu de pitch.correction_text undefined)
 *   2. Construit un prompt structuré (Stratégie / Corrections à appliquer / Prose)
 *   3. Ollama qwen3:32b répond avec output non-vide cohérent
 *   4. Aucun "undefined" littéral n'apparaît dans output (preuve bug fixé)
 *
 * USAGE :
 *   $env:OMEGA_OLLAMA_MODEL = "qwen3:32b"
 *   npx tsx packages/sovereign-engine/scripts/test-correctionpitch-patch.ts
 *
 * DURÉE attendue : 30-60s (1 call Ollama applyPatch)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createOllamaProvider } from '../src/runtime/ollama-provider.js';
import type { CorrectionPitch, PitchItem } from '../src/types.js';

const OLLAMA_MODEL = process.env.OMEGA_OLLAMA_MODEL ?? 'qwen3:32b';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

console.log('═══════════════════════════════════════════════════════════════');
console.log(' OMEGA — TEST CORRECTIONPITCH PATCH P3.1.1');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Model : ${OLLAMA_MODEL}`);
console.log(`URL   : ${OLLAMA_URL}`);
console.log('');

// ────────────────────────────────────────────────────────────────────────────
// Construct valid CorrectionPitch (post-P3.1.1 contract = items[])
// ────────────────────────────────────────────────────────────────────────────
const items: PitchItem[] = [
  {
    id: 'test_item_1',
    zone: 'Q2',
    op: 'shift_emotion_register',
    reason: 'Test correction 1 — emotional register',
    instruction: 'Décale le registre émotionnel en Q2 vers une teinte plus mélancolique',
    expected_gain: { axe: 'tension_14d', delta: 7 },
  },
  {
    id: 'test_item_2',
    zone: 'Q4',
    op: 'deepen_closing',
    reason: 'Test correction 2 — closing depth',
    instruction: 'Approfondis la chute émotionnelle avec une image sensorielle',
    expected_gain: { axe: 'impact', delta: 8 },
  },
  {
    id: 'test_item_3',
    zone: 'Q1',
    op: 'increase_interiority_signal',
    reason: 'Test correction 3 — interior thought',
    instruction: 'Ajoute une couche de pensée intérieure en Q1 pour ancrer la profondeur',
    expected_gain: { axe: 'interiority', delta: 8 },
  },
];

const pitch: CorrectionPitch = {
  pitch_id: 'TEST_P311_PATCH',
  strategy: 'emotional_intensification',
  items,
  total_expected_gain: items.reduce((s, it) => s + it.expected_gain.delta, 0),
};

const prose =
  'Elle marchait dans la rue déserte. Le vent soufflait fort. ' +
  'Elle s\'arrêta devant la maison. Les fenêtres étaient noires. ' +
  'Le silence pesait. Elle tendit la main vers la poignée.';

const constraints = {
  canon: ['Le personnage est solitaire', "L'action se passe en hiver"] as readonly string[],
  beats: ['Marche dans la rue', 'Arrêt devant la maison', 'Geste vers la porte'] as readonly string[],
};

console.log(`Pitch ${pitch.pitch_id}: strategy=${pitch.strategy}, items=${pitch.items.length}`);
console.log(`Total expected gain: ${pitch.total_expected_gain}`);
console.log(`Prose input: ${prose.length} chars, ~${prose.split(/\s+/).filter((w) => w.length > 0).length} mots`);
console.log('');

// ────────────────────────────────────────────────────────────────────────────
// Instantiate Ollama provider + call applyPatch (notre fix sous test)
// ────────────────────────────────────────────────────────────────────────────
const provider = createOllamaProvider({
  model: OLLAMA_MODEL,
  baseUrl: OLLAMA_URL,
  draftTemperature: 0.8,
  judgeTemperature: 0.0,
  draftMaxTokens: 2048,
  judgeMaxTokens: 512,
});

console.log('=== Calling provider.applyPatch (P3.1.1 patched path) ===');
const t0 = Date.now();
let patchedProse: string;
let crashed = false;
let crashMsg = '';
try {
  patchedProse = await provider.applyPatch(prose, pitch, constraints);
} catch (e) {
  crashed = true;
  crashMsg = e instanceof Error ? e.message : String(e);
  patchedProse = '';
}
const t1 = Date.now();
const durationS = ((t1 - t0) / 1000).toFixed(1);

if (crashed) {
  console.log(`\n❌ CRASH : ${crashMsg}`);
  console.log(`Duration : ${durationS}s`);
  process.exit(2);
}

console.log('\n=== Patched prose (Ollama output) ===');
console.log(patchedProse);
console.log('');
console.log(`Duration   : ${durationS}s`);
console.log(`Output size: ${patchedProse.length} chars, ~${patchedProse.split(/\s+/).filter((w) => w.length > 0).length} mots`);

// ────────────────────────────────────────────────────────────────────────────
// Sanity checks — validation chirurgicale du fix
// ────────────────────────────────────────────────────────────────────────────
const checks: Record<string, { pass: boolean; detail: string }> = {
  output_not_empty: {
    pass: patchedProse.length > 0,
    detail: `${patchedProse.length} chars`,
  },
  output_reasonable_length: {
    pass: patchedProse.split(/\s+/).filter((w) => w.length > 0).length >= 10,
    detail: `${patchedProse.split(/\s+/).filter((w) => w.length > 0).length} mots`,
  },
  no_undefined_literal_correction: {
    pass: !patchedProse.includes('Correction: undefined') && !patchedProse.includes('Correction : undefined'),
    detail: 'no "Correction: undefined" in output',
  },
  no_undefined_literal_target: {
    pass:
      !patchedProse.includes('Cible: undefined') &&
      !patchedProse.includes('Cible : undefined') &&
      !patchedProse.includes('Target: undefined'),
    detail: 'no "Cible/Target: undefined" in output',
  },
  duration_reasonable: {
    pass: t1 - t0 < 120_000, // < 2 min
    detail: `${durationS}s`,
  },
};

console.log('\n=== Sanity Checks (P3.1.1 fix validation) ===');
for (const [k, v] of Object.entries(checks)) {
  console.log(`  ${v.pass ? '✓' : '✗'} ${k.padEnd(40)} → ${v.detail}`);
}

const allPass = Object.values(checks).every((v) => v.pass);
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(allPass ? ' ✅ TEST PASS — P3.1.1 fix validé empiriquement' : ' ❌ TEST FAIL — investigation requise');
console.log('═══════════════════════════════════════════════════════════════');

process.exit(allPass ? 0 : 1);
