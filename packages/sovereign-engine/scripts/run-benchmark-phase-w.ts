/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — W-BENCHMARK: Damage Gate Validation (8 scènes)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Sprint W.INT-4 — Benchmark SEAL réel avec Damage Gate activé
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npm run benchmark:phase-w
 *
 * Modes:
 *   $env:BENCH_MICRO = "1"        → 3 scènes seulement (vérification rapide)
 *   $env:DAMAGE_GATE_OFF = "1"    → Bypass Damage Gate (comparaison A/B)
 *
 * Livrables:
 *   sessions/BenchW_<mode>_<date>_<head>/
 *     config.json    — provider, model, gate_enabled, scene_count
 *     runs.jsonl     — 1 ligne par scène (verdict, composite, axes, gate_stats)
 *     summary.json   — taux SEAL, medians, comparaison baseline
 *     SHA256SUMS.txt — intégrité du pack
 *
 * Critère SEAL: composite ≥ 93.0, ALL FLOORS GREEN
 * Baseline Phase V: composite 92.0
 *
 * Standard: NASA-Grade L4 / DO-178C
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { runSovereignForge } from '../src/engine.js';
import type { ForgePacketInput } from '../src/input/forge-packet-assembler.js';
import type { Beat, GenesisPlan, Scene, Arc } from '@omega/genesis-planner';
import type { StyleProfile, KillLists, CanonEntry, ForgeContinuity, SovereignProvider } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_DIR   = path.resolve(__dirname, '../../..');

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL_ID       = 'claude-sonnet-4-20250514';
const ROOT_SEED      = 'omega-validation-2026-phase-w-int4';
const OUT_DIR        = path.join(__dirname, '..', 'sessions');
const BASELINE_COMP  = 92.0;   // Phase V Sprint3C best
const TARGET_COMP    = 93.0;   // SEAL_ATOMIC
const TARGET_FLOOR   = 85.0;   // min_axis floor

const IS_MICRO       = process.env.BENCH_MICRO === '1';
const GATE_OFF       = process.env.DAMAGE_GATE_OFF === '1';

function getGitHead(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch { return 'unknown'; }
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// ── Shared style / kill_lists / canon ─────────────────────────────────────────

const BASE_STYLE: StyleProfile = {
  version: '1.0.0',
  universe: 'literary_contemporary',
  lexicon: {
    signature_words: ['silence', 'lumière', 'ombre', 'chair', 'souffle',
                      'pierre', 'métal', 'vide', 'froid', 'bruit'],
    forbidden_words: ['soudain', 'soudainement', 'tout à coup', 'brusquement'],
    register: 'literary',
  },
  rhythm: {
    target_sentence_length: { min: 8, max: 35, mean: 18 },
    paragraph_count: { min: 4, max: 12 },
    variation_coefficient: 0.35,
  },
  tone: {
    formality: 0.7,
    emotional_range: [0.3, 0.9],
    irony_allowed: true,
  },
};

const BASE_KILL_LISTS: KillLists = {
  cliches: [
    'un frisson parcourut', 'son cœur battait la chamade',
    'le temps semblait suspendu', 'une boule dans la gorge',
    'des larmes perlèrent', 'un silence pesant',
    'la tension était palpable', 'son sang ne fit qu\'un tour',
    'un voile de tristesse', 'les mots lui manquaient',
  ],
  weak_verbs: ['être', 'avoir', 'faire', 'dire', 'aller', 'mettre', 'prendre'],
  forbidden_patterns: [
    'il/elle sentit que', 'il/elle réalisa que', 'il/elle comprit que',
    'c\'était comme si', 'on aurait dit que',
  ],
};

const BASE_CANON: readonly CanonEntry[] = [
  {
    id: 'char-elena',
    type: 'character',
    name: 'Elena Vasquez',
    facts: {
      age: 34,
      profession: 'architecte navale',
      trait_dominant: 'précision obsessionnelle',
      faille: 'incapacité à déléguer le contrôle',
      physique: 'mains calleuses, cicatrice au poignet gauche, cheveux courts',
    },
  },
  {
    id: 'char-marcus',
    type: 'character',
    name: 'Marcus Delacroix',
    facts: {
      age: 41,
      profession: 'ancien chirurgien reconverti sculpteur',
      trait_dominant: 'calme apparent masquant une rage froide',
      faille: 'culpabilité liée à un patient perdu',
      physique: 'grand, voûté, doigts longs et précis',
    },
  },
  {
    id: 'loc-atelier',
    type: 'location',
    name: 'L\'atelier du port',
    facts: {
      description: 'Ancien entrepôt maritime reconverti, verrières sales, odeur de sel et de métal',
      atmosphere: 'lumière rasante, poussière en suspension, bruits du port',
    },
  },
];

const BASE_CONTINUITY: ForgeContinuity = {
  previous_scene_id: null,
  carried_threads: [],
  unresolved_tensions: [],
  character_states: {},
};

// ── 8 Scènes W.INT-4 ─────────────────────────────────────────────────────────

interface SceneTemplate {
  id: string;
  label: string;
  archetype: string;              // BALANCED | BRUTAL | CATHEDRAL | INTERIOR | SENSORY
  narrative_shape: string;
  emotion_primary: string;
  emotion_intensity: number;
  conflict_type: string;
  expected_dominant_axes: string[];
  beats: Beat[];
}

const SCENE_TEMPLATES: SceneTemplate[] = [
  // ── S1: Confrontation (tension haute) ──
  {
    id: 'w4-confrontation',
    label: 'Confrontation',
    archetype: 'BRUTAL',
    narrative_shape: 'ThreatReveal',
    emotion_primary: 'anger',
    emotion_intensity: 0.85,
    conflict_type: 'relational',
    expected_dominant_axes: ['TENSION', 'INTÉRIORITÉ'],
    beats: [
      { beat_id: 'b1', type: 'setup', content: 'Elena découvre que Marcus a menti sur l\'origine de la commande navale. Elle entre dans l\'atelier, le contrat froissé à la main.' },
      { beat_id: 'b2', type: 'escalation', content: 'Marcus tente de justifier — Elena refuse chaque argument. La tension monte entre précision factuelle et déni émotionnel.' },
      { beat_id: 'b3', type: 'climax', content: 'Elena pose le contrat sur l\'établi. Silence. Marcus comprend qu\'elle sait aussi pour le patient.' },
      { beat_id: 'b4', type: 'resolution', content: 'Pas de réconciliation. Elena sort. Marcus reste seul avec le métal froid.' },
    ],
  },

  // ── S2: Élégie (émotion, intériorité) ──
  {
    id: 'w4-elegie',
    label: 'Élégie',
    archetype: 'INTERIOR',
    narrative_shape: 'Contemplative',
    emotion_primary: 'sadness',
    emotion_intensity: 0.75,
    conflict_type: 'internal',
    expected_dominant_axes: ['INTÉRIORITÉ', 'MUSICALITÉ'],
    beats: [
      { beat_id: 'b1', type: 'setup', content: 'Marcus dans l\'atelier vide au crépuscule. Il retrouve un moulage en plâtre de la main d\'un enfant — celle du patient qu\'il n\'a pas sauvé.' },
      { beat_id: 'b2', type: 'development', content: 'Souvenirs fragmentés: le bloc opératoire, l\'odeur du désinfectant, la lumière froide des néons. Le plâtre est intact, la chair ne l\'est plus.' },
      { beat_id: 'b3', type: 'deepening', content: 'Marcus sculpte autour du moulage. Chaque geste est une prière laïque, une tentative de reconstruire ce qui ne reviendra pas.' },
      { beat_id: 'b4', type: 'resolution', content: 'Il pose la sculpture terminée face à la verrière. La lumière du port la traverse. Il ne pleure pas. Il n\'a plus besoin de pleurer.' },
    ],
  },

  // ── S3: Panique (rythme rapide, tension) ──
  {
    id: 'w4-panique',
    label: 'Panique',
    archetype: 'BRUTAL',
    narrative_shape: 'ThreatReveal',
    emotion_primary: 'fear',
    emotion_intensity: 0.90,
    conflict_type: 'external',
    expected_dominant_axes: ['TENSION', 'SENSORIEL'],
    beats: [
      { beat_id: 'b1', type: 'trigger', content: 'Bruit de craquement dans la structure du bâtiment. Elena sent le sol vibrer sous ses pieds. L\'entrepôt maritime est instable.' },
      { beat_id: 'b2', type: 'escalation', content: 'La verrière se fissure. Poussière, bruit de métal tordu. Elena calcule: combien de temps avant l\'effondrement. Son expertise la sauve et la paralyse.' },
      { beat_id: 'b3', type: 'peak', content: 'Un pilier cède. Elena doit choisir: sauver les plans du navire ou sortir. Ses mains de calcul deviennent des mains de survie.' },
      { beat_id: 'b4', type: 'aftermath', content: 'Dehors. Vivante. Les mains vides. Le port continue son activité indifférente.' },
    ],
  },

  // ── S4: Contemplation (sensoriel, musicalité) ──
  {
    id: 'w4-contemplation',
    label: 'Contemplation',
    archetype: 'SENSORY',
    narrative_shape: 'Contemplative',
    emotion_primary: 'trust',
    emotion_intensity: 0.60,
    conflict_type: 'internal',
    expected_dominant_axes: ['MUSICALITÉ', 'SENSORIEL'],
    beats: [
      { beat_id: 'b1', type: 'observation', content: 'Aube sur le port. Elena marche entre les coques retournées. Odeur de goudron, cri des mouettes, vibration des câbles dans le vent.' },
      { beat_id: 'b2', type: 'immersion', content: 'Elle pose la main sur la coque d\'un chalutier. Le bois est chaud malgré l\'heure. Elle sent les années de sel dans les fibres.' },
      { beat_id: 'b3', type: 'reflection', content: 'Le port est un organisme. Chaque bateau est un organe, chaque quai une artère. Elena pense en structures, même face à la beauté.' },
      { beat_id: 'b4', type: 'acceptance', content: 'Elle reste. Pas pour calculer. Pour être là, dans la lumière qui se lève sur le métal et le bois.' },
    ],
  },

  // ── S5: Dialogue tendu (tension + intériorité) ──
  {
    id: 'w4-dialogue-tendu',
    label: 'Dialogue tendu',
    archetype: 'BALANCED',
    narrative_shape: 'ThreatReveal',
    emotion_primary: 'anticipation',
    emotion_intensity: 0.80,
    conflict_type: 'relational',
    expected_dominant_axes: ['TENSION', 'INTÉRIORITÉ'],
    beats: [
      { beat_id: 'b1', type: 'setup', content: 'Elena et Marcus dans un café du port. Conversation apparemment banale sur un projet commun. Sous-texte: chacun sait que l\'autre cache quelque chose.' },
      { beat_id: 'b2', type: 'probing', content: 'Questions indirectes. Marcus parle de « précision dans le geste ». Elena entend « précision dans le mensonge ». Chaque phrase a deux lectures.' },
      { beat_id: 'b3', type: 'breaking', content: 'Un silence trop long. Marcus pose sa tasse avec une exactitude chirurgicale. Elena reconnaît le geste — celui d\'un homme qui posait des scalpels.' },
      { beat_id: 'b4', type: 'aftermath', content: 'Ils se quittent sans rien résoudre. Mais quelque chose a changé dans la géométrie de leur relation.' },
    ],
  },

  // ── S6: Description lyrique (musicalité + sensoriel) ──
  {
    id: 'w4-lyrique',
    label: 'Description lyrique',
    archetype: 'CATHEDRAL',
    narrative_shape: 'Contemplative',
    emotion_primary: 'joy',
    emotion_intensity: 0.65,
    conflict_type: 'internal',
    expected_dominant_axes: ['MUSICALITÉ', 'LEXICAL'],
    beats: [
      { beat_id: 'b1', type: 'opening', content: 'La cale sèche au soleil couchant. Le métal rouillé devient cuivre, les flaques d\'eau deviennent des miroirs de feu.' },
      { beat_id: 'b2', type: 'development', content: 'Marcus installe son chevalet devant la proue du cargo échoué. Il ne peint pas — il traduit la lumière en volume, le temps en matière.' },
      { beat_id: 'b3', type: 'expansion', content: 'Les ombres s\'allongent comme des doigts sur le béton. Le port entier devient une sculpture que personne n\'a commandée.' },
      { beat_id: 'b4', type: 'closing', content: 'La dernière lumière. Marcus range ses outils. La cale retourne à l\'obscurité ordinaire. Mais pendant vingt minutes, le monde a été un atelier.' },
    ],
  },

  // ── S7: Action pure (tension maximale) ──
  {
    id: 'w4-action',
    label: 'Action pure',
    archetype: 'BRUTAL',
    narrative_shape: 'ThreatReveal',
    emotion_primary: 'fear',
    emotion_intensity: 0.95,
    conflict_type: 'external',
    expected_dominant_axes: ['TENSION', 'SENSORIEL'],
    beats: [
      { beat_id: 'b1', type: 'trigger', content: 'Incendie dans l\'atelier. Le métal en fusion, les solvants qui s\'embrasent. Elena est à l\'étage supérieur avec les plans du prototype.' },
      { beat_id: 'b2', type: 'action', content: 'Descente par l\'escalier métallique brûlant. Chaque marche est un calcul: résistance de l\'acier à la chaleur, temps avant rupture.' },
      { beat_id: 'b3', type: 'crisis', content: 'L\'escalier cède au troisième palier. Elena saute. Réception sur les genoux. Les plans serrés contre sa poitrine. La fumée aveugle.' },
      { beat_id: 'b4', type: 'escape', content: 'Sortie par le quai de chargement. L\'air marin frappe comme un coup. Derrière elle, la verrière explose.' },
    ],
  },

  // ── S8: Monologue intérieur (intériorité + lexique) ──
  {
    id: 'w4-monologue',
    label: 'Monologue intérieur',
    archetype: 'INTERIOR',
    narrative_shape: 'Contemplative',
    emotion_primary: 'disgust',
    emotion_intensity: 0.70,
    conflict_type: 'internal',
    expected_dominant_axes: ['INTÉRIORITÉ', 'LEXICAL'],
    beats: [
      { beat_id: 'b1', type: 'entry', content: 'Marcus devant le miroir de l\'atelier. Il regarde ses mains. Ces mains qui ont tenu des scalpels et qui tiennent maintenant des burins.' },
      { beat_id: 'b2', type: 'descent', content: 'Flux de conscience: la frontière entre réparer et créer. Chaque sculpture est-elle une compensation? Chaque forme taillée dans le bronze est-elle un corps qu\'il n\'a pas sauvé?' },
      { beat_id: 'b3', type: 'confrontation', content: 'Il se souvient du dernier patient. Pas de l\'opération — de l\'après. Du silence dans le couloir. Du néon qui grésillait. De ses mains propres, trop propres.' },
      { beat_id: 'b4', type: 'emergence', content: 'Il frappe le bronze. Le son résonne. Ce n\'est pas de la guérison. Ce n\'est pas du pardon. C\'est autre chose, qui n\'a pas encore de nom.' },
    ],
  },
];

// ── Build ForgePacketInputs ───────────────────────────────────────────────────

function buildArc(): Arc {
  return {
    arc_id: 'arc-w-bench',
    title: 'Le port des formes perdues',
    theme: 'La frontière entre détruire et construire',
    chapters: [],
  };
}

function buildPlan(scene: Scene): GenesisPlan {
  return {
    plan_id: 'plan-w-bench',
    title: 'Le port des formes perdues',
    arcs: [buildArc()],
    scenes: [scene],
    current_scene_index: 0,
  };
}

function buildScene(template: SceneTemplate): Scene {
  return {
    scene_id: template.id,
    arc_id: 'arc-w-bench',
    narrative_shape: template.narrative_shape,
    setting: {
      location: 'L\'atelier du port / Port industriel',
      time: 'Variable selon scène',
      atmosphere: 'Maritime, industriel, lumière changeante',
    },
    characters: ['char-elena', 'char-marcus'],
    emotion: {
      primary: template.emotion_primary,
      intensity: template.emotion_intensity,
    },
    conflict: {
      type: template.conflict_type,
      description: `Scène ${template.label} — archétype ${template.archetype}`,
    },
    beats: template.beats,
    constraints: {
      word_count: { min: 400, max: 800 },
      pov: 'third_limited',
      tense: 'past',
    },
  };
}

function makeForgePacket(template: SceneTemplate, index: number): ForgePacketInput {
  const scene = buildScene(template);
  const plan  = buildPlan(scene);

  return {
    plan,
    scene,
    style_profile: BASE_STYLE,
    kill_lists: BASE_KILL_LISTS,
    canon: BASE_CANON,
    continuity: BASE_CONTINUITY,
    run_id: `bench-w4-${index}-${template.id}`,
    language: 'fr',
    // Archetype hint for micro-surgeon / damage-gate
    archetype: template.archetype,
  };
}

function buildInputs(): Array<{ template: SceneTemplate; input: ForgePacketInput }> {
  const templates = IS_MICRO
    ? SCENE_TEMPLATES.slice(0, 3)  // Micro: S1 Confrontation, S2 Élégie, S3 Panique
    : SCENE_TEMPLATES;

  return templates.map((t, i) => ({
    template: t,
    input: makeForgePacket(t, i),
  }));
}

// ── Seed generation ───────────────────────────────────────────────────────────

function generateSeed(rootSeed: string, index: number): string {
  return createHash('sha256').update(`${rootSeed}:w-bench:${index}`).digest('hex');
}

// ── Run record ────────────────────────────────────────────────────────────────

interface WBenchRunRecord {
  readonly scene_index:     number;
  readonly scene_id:        string;
  readonly scene_label:     string;
  readonly archetype:       string;
  readonly seed:            string;
  readonly input_hash:      string;
  readonly output_hash:     string;
  readonly verdict:         'SEAL' | 'REJECT' | 'ERROR';
  readonly s_composite:     number;
  readonly s_axes:          Record<string, number>;
  readonly min_axis:        { name: string; value: number };
  readonly gate_enabled:    boolean;
  readonly gate_stats:      { blocked: number; passed: number; total: number } | null;
  readonly elapsed_ms:      number;
  readonly error?:          string;
}

interface WBenchSummary {
  readonly mode:              string;
  readonly gate_enabled:      boolean;
  readonly scene_count:       number;
  readonly seal_count:        number;
  readonly seal_rate:         number;
  readonly reject_count:      number;
  readonly error_count:       number;
  readonly composite_median:  number;
  readonly composite_mean:    number;
  readonly composite_min:     number;
  readonly composite_max:     number;
  readonly min_axis_global:   { name: string; value: number };
  readonly all_floors_green:  boolean;
  readonly vs_baseline:       { baseline: number; delta: number; improved: boolean };
  readonly vs_target:         { target: number; reached: boolean };
  readonly per_scene:         Array<{
    scene_id: string;
    label: string;
    archetype: string;
    verdict: string;
    composite: number;
    min_axis: { name: string; value: number };
  }>;
}

interface WBenchConfig {
  readonly version:       string;
  readonly gate_enabled:  boolean;
  readonly micro_mode:    boolean;
  readonly scene_count:   number;
  readonly model:         string;
  readonly git_head:      string;
  readonly root_seed:     string;
  readonly created_at:    string;
  readonly baseline:      number;
  readonly target:        number;
}

// ── Execution ─────────────────────────────────────────────────────────────────

async function runScene(
  input: ForgePacketInput,
  provider: SovereignProvider,
  seed: string,
): Promise<{
  verdict: 'SEAL' | 'REJECT' | 'ERROR';
  composite: number;
  axes: Record<string, number>;
  min_axis: { name: string; value: number };
  gate_stats: { blocked: number; passed: number; total: number } | null;
  prose: string;
  error?: string;
}> {
  try {
    const inputWithSeed = {
      ...input,
      seeds: { ...(input as Record<string, unknown>).seeds as object || {}, generation: seed },
    } as ForgePacketInput;

    const result = await runSovereignForge(inputWithSeed, provider) as {
      verdict: 'SEAL' | 'REJECT';
      final_prose: string;
      s_score: {
        composite: number;
        axes?: Record<string, number>;
        sub_scores?: Record<string, { score: number }>;
      };
      microsurgery_report?: {
        gate_blocked?: number;
        gate_passed?: number;
        interventions_attempted?: number;
      };
    };

    // Extract axes from s_score
    const axes: Record<string, number> = {};
    if (result.s_score.axes) {
      Object.assign(axes, result.s_score.axes);
    } else if (result.s_score.sub_scores) {
      for (const [k, v] of Object.entries(result.s_score.sub_scores)) {
        axes[k] = v.score;
      }
    }

    // Find min axis
    let minAxis = { name: 'unknown', value: 100 };
    for (const [name, value] of Object.entries(axes)) {
      if (value < minAxis.value) {
        minAxis = { name, value };
      }
    }

    // Gate stats
    let gateStats = null;
    if (result.microsurgery_report) {
      const r = result.microsurgery_report;
      gateStats = {
        blocked: r.gate_blocked ?? 0,
        passed: r.gate_passed ?? 0,
        total: r.interventions_attempted ?? 0,
      };
    }

    return {
      verdict: result.verdict,
      composite: result.s_score.composite,
      axes,
      min_axis: minAxis,
      gate_stats: gateStats,
      prose: result.final_prose,
    };
  } catch (err) {
    return {
      verdict: 'ERROR',
      composite: 0,
      axes: {},
      min_axis: { name: 'error', value: 0 },
      gate_stats: null,
      prose: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ── Write ValidationPack ──────────────────────────────────────────────────────

function writeWBenchPack(
  config: WBenchConfig,
  runs: WBenchRunRecord[],
  summary: WBenchSummary,
  outDir: string,
): string {
  const modeLabel = config.gate_enabled ? 'gate-ON' : 'gate-OFF';
  const microLabel = config.micro_mode ? '_micro' : '';
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const dirName = `BenchW_${modeLabel}${microLabel}_${dateStr}_${config.git_head}`;
  const packDir = path.join(outDir, dirName);

  fs.mkdirSync(packDir, { recursive: true });

  // config.json
  const configPath = path.join(packDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // runs.jsonl
  const runsPath = path.join(packDir, 'runs.jsonl');
  const runsContent = runs.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(runsPath, runsContent);

  // summary.json
  const summaryPath = path.join(packDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // SHA256SUMS.txt
  const files = ['config.json', 'runs.jsonl', 'summary.json'];
  const sums = files.map(f => {
    const content = fs.readFileSync(path.join(packDir, f));
    const hash = createHash('sha256').update(content).digest('hex');
    return `${hash}  ${f}`;
  });
  fs.writeFileSync(path.join(packDir, 'SHA256SUMS.txt'), sums.join('\n') + '\n');

  return packDir;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[FATAL] ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const gitHead = getGitHead();
  const gateEnabled = !GATE_OFF;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA W-BENCH — Damage Gate Validation');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`[W-BENCH] HEAD=${gitHead}`);
  console.log(`[W-BENCH] Model: ${MODEL_ID}`);
  console.log(`[W-BENCH] Damage Gate: ${gateEnabled ? 'ON' : 'OFF (A/B bypass)'}`);
  console.log(`[W-BENCH] Mode: ${IS_MICRO ? 'MICRO (3 scènes)' : 'FULL (8 scènes)'}`);
  console.log(`[W-BENCH] Baseline: ${BASELINE_COMP} | Target: ${TARGET_COMP}`);
  console.log('');

  // Set gate bypass env if needed
  if (GATE_OFF) {
    process.env.OMEGA_DAMAGE_GATE_BYPASS = '1';
    console.log('[W-BENCH] ⚠️  DAMAGE_GATE_OFF=1 → gate bypass active');
  }

  const inputs = buildInputs();
  console.log(`[W-BENCH] Built ${inputs.length} ForgePacketInputs`);

  const provider = createAnthropicProvider({
    apiKey,
    model: MODEL_ID,
    judgeStable: true,
    draftTemperature: 1.0,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 200,
  });

  console.log(`[W-BENCH] Starting execution — ${inputs.length} scenes...`);
  console.log(`[W-BENCH] Estimated: ~${inputs.length * 15}-${inputs.length * 25} API calls`);
  console.log('');

  const runs: WBenchRunRecord[] = [];
  const startTotal = Date.now();

  for (let i = 0; i < inputs.length; i++) {
    const { template, input } = inputs[i];
    const seed = generateSeed(ROOT_SEED, i);
    const inputHash = sha256(JSON.stringify(input));

    console.log(`[SCENE ${i + 1}/${inputs.length}] ${template.label} (${template.archetype}) ...`);
    const startScene = Date.now();

    const result = await runScene(input, provider, seed);

    const elapsedMs = Date.now() - startScene;
    const outputHash = sha256(result.prose || '');

    const record: WBenchRunRecord = {
      scene_index: i,
      scene_id: template.id,
      scene_label: template.label,
      archetype: template.archetype,
      seed,
      input_hash: inputHash,
      output_hash: outputHash,
      verdict: result.verdict,
      s_composite: result.composite,
      s_axes: result.axes,
      min_axis: result.min_axis,
      gate_enabled: gateEnabled,
      gate_stats: result.gate_stats,
      elapsed_ms: elapsedMs,
      error: result.error,
    };

    runs.push(record);

    const statusIcon = result.verdict === 'SEAL' ? '✅' : result.verdict === 'REJECT' ? '❌' : '💥';
    console.log(
      `  ${statusIcon} ${result.verdict} | composite=${result.composite.toFixed(1)} ` +
      `| min_axis=${result.min_axis.name}:${result.min_axis.value.toFixed(1)} ` +
      `| ${(elapsedMs / 1000).toFixed(1)}s` +
      (result.gate_stats ? ` | gate: ${result.gate_stats.passed}/${result.gate_stats.total} passed` : '') +
      (result.error ? ` | ERROR: ${result.error}` : ''),
    );

    // Rate limiting pause (3s between scenes)
    if (i < inputs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  const totalElapsed = Math.round((Date.now() - startTotal) / 1000);

  // ── Build summary ───────────────────────────────────────────────────────

  const composites   = runs.filter(r => r.verdict !== 'ERROR').map(r => r.s_composite);
  const sealRuns     = runs.filter(r => r.verdict === 'SEAL');
  const rejectRuns   = runs.filter(r => r.verdict === 'REJECT');
  const errorRuns    = runs.filter(r => r.verdict === 'ERROR');

  // Global min axis
  let globalMinAxis = { name: 'none', value: 100 };
  for (const r of runs.filter(r => r.verdict !== 'ERROR')) {
    if (r.min_axis.value < globalMinAxis.value) {
      globalMinAxis = r.min_axis;
    }
  }

  const compMedian = median(composites);
  const compMean   = mean(composites);
  const compMin    = composites.length > 0 ? Math.min(...composites) : 0;
  const compMax    = composites.length > 0 ? Math.max(...composites) : 0;

  const allFloorsGreen = runs
    .filter(r => r.verdict !== 'ERROR')
    .every(r => r.min_axis.value >= TARGET_FLOOR);

  const summary: WBenchSummary = {
    mode: IS_MICRO ? 'micro' : 'full',
    gate_enabled: gateEnabled,
    scene_count: inputs.length,
    seal_count: sealRuns.length,
    seal_rate: inputs.length > 0 ? sealRuns.length / inputs.length : 0,
    reject_count: rejectRuns.length,
    error_count: errorRuns.length,
    composite_median: compMedian,
    composite_mean: compMean,
    composite_min: compMin,
    composite_max: compMax,
    min_axis_global: globalMinAxis,
    all_floors_green: allFloorsGreen,
    vs_baseline: {
      baseline: BASELINE_COMP,
      delta: compMedian - BASELINE_COMP,
      improved: compMedian > BASELINE_COMP,
    },
    vs_target: {
      target: TARGET_COMP,
      reached: compMedian >= TARGET_COMP && allFloorsGreen,
    },
    per_scene: runs.map(r => ({
      scene_id: r.scene_id,
      label: r.scene_label,
      archetype: r.archetype,
      verdict: r.verdict,
      composite: r.s_composite,
      min_axis: r.min_axis,
    })),
  };

  // ── Output ──────────────────────────────────────────────────────────────

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  W-BENCH RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Gate:          ${gateEnabled ? 'ON' : 'OFF'}`);
  console.log(`  Scenes:        ${inputs.length}`);
  console.log(`  SEAL:          ${sealRuns.length}/${inputs.length} (${(summary.seal_rate * 100).toFixed(1)}%)`);
  console.log(`  REJECT:        ${rejectRuns.length}`);
  console.log(`  ERROR:         ${errorRuns.length}`);
  console.log(`  Composite:     median=${compMedian.toFixed(1)} mean=${compMean.toFixed(1)} [${compMin.toFixed(1)}..${compMax.toFixed(1)}]`);
  console.log(`  Min axis:      ${globalMinAxis.name}=${globalMinAxis.value.toFixed(1)}`);
  console.log(`  All floors ≥${TARGET_FLOOR}: ${allFloorsGreen ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  vs baseline:   ${compMedian.toFixed(1)} vs ${BASELINE_COMP} → Δ=${summary.vs_baseline.delta > 0 ? '+' : ''}${summary.vs_baseline.delta.toFixed(1)}`);
  console.log(`  vs target:     ${summary.vs_target.reached ? 'REACHED ✅' : 'NOT REACHED ❌'}`);
  console.log(`  Duration:      ${totalElapsed}s`);
  console.log('');

  // Per-scene table
  console.log('  Per-scene:');
  for (const r of runs) {
    const icon = r.verdict === 'SEAL' ? '✅' : r.verdict === 'REJECT' ? '❌' : '💥';
    console.log(
      `    ${icon} ${r.scene_label.padEnd(20)} ${r.archetype.padEnd(10)} ` +
      `comp=${r.s_composite.toFixed(1).padStart(5)} ` +
      `min=${r.min_axis.name}:${r.min_axis.value.toFixed(1)}`,
    );
  }

  // ── Write pack ──────────────────────────────────────────────────────────

  const config: WBenchConfig = {
    version: '1.0.0',
    gate_enabled: gateEnabled,
    micro_mode: IS_MICRO,
    scene_count: inputs.length,
    model: MODEL_ID,
    git_head: gitHead,
    root_seed: ROOT_SEED,
    created_at: new Date().toISOString(),
    baseline: BASELINE_COMP,
    target: TARGET_COMP,
  };

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const packDir = writeWBenchPack(config, runs, summary, OUT_DIR);

  console.log('');
  console.log(`[W-BENCH] ValidationPack: ${packDir}`);
  console.log('[W-BENCH] SHA256SUMS.txt: OK');

  // ── Verdict ─────────────────────────────────────────────────────────────

  if (summary.vs_target.reached) {
    console.log('');
    console.log('🏆 W-BENCH VERDICT: TARGET REACHED — composite ≥ 93.0, ALL FLOORS GREEN');
    console.log('   → Phase W SEAL candidat. Comparaison A/B gate ON vs OFF requise.');
  } else if (summary.vs_baseline.improved) {
    console.log('');
    console.log('📈 W-BENCH VERDICT: IMPROVED vs baseline — mais target non atteint');
    console.log(`   → Δ = +${summary.vs_baseline.delta.toFixed(1)} vs Phase V (${BASELINE_COMP})`);
    console.log('   → Sprint W.INT-5 requis (raffinements)');
  } else {
    console.log('');
    console.log('⚠️  W-BENCH VERDICT: NO IMPROVEMENT — diagnostic requis');
    console.log('   → Analyser les runs REJECT, vérifier gate stats');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
