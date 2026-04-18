/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA BENCH P1 ROBUSTNESS — 24 runs (4 archétypes × 2 modes × 3 seeds)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Objectif (ChatGPT protocol post-commit 7e89f95f) :
 *
 *   Confirmer empiriquement (LLM Ollama qwen3:32b) que le gating archétypal
 *   câblé en PRODUCTION dans `planAdaptiveChunkingV2B2` + `pickPacingDirective`
 *   (P1, R-D.1 ADOPT_A) est équivalent au mode M3_gated_A simulé du bench
 *   R-D.1 (48 runs, gain INTERIOR ΔI=+5.379).
 *
 *   Le smoke test v2 a déjà prouvé l'équivalence CALC-pure (gating rate 100%
 *   INTERIOR, zéro leak non-INTERIOR). Ce bench ajoute la preuve LLM empirique.
 *
 * Matrice 4 archétypes × 2 modes × 3 seeds = 24 cellules (1h Ollama estimé).
 *
 * Modes :
 *   M1_baseline   : directive fixe = REGISTER_TABLE['litteraire']['baseline']
 *                   (contrôle, reproduit M1 du bench R-D.1)
 *   M_prod_p1     : production pipeline post-P1 — utilise planAdaptiveChunkingV2B2
 *                   qui propage detectArchetype dans pickPacingDirective
 *                   via le wiring scellé commit 7e89f95f
 *
 * Critères PASS ex-ante (ChatGPT B1-B4) :
 *   B1 INTERIOR gain      : μ(M_prod_p1 INTERIOR) − μ(M1_baseline INTERIOR) ≥ 3.0
 *                           (reproduction gain R-D.1)
 *   B2 ACTION/SENSORY     : μ(M_prod_p1 X) − μ(M1_baseline X) ≥ -0.5 (X ∈ {ACTION, SENSORY})
 *   B3 CATHEDRAL invariance: μ(M_prod_p1 CATHEDRAL) − μ(M1_baseline CATHEDRAL) ≥ -0.5
 *   B4 CATHEDRAL reprod.   : |μ(M1_baseline CATHEDRAL) − 0.503| ≤ 2.0
 *                           (seuil R-D.1 scellé : μ_baseline bench précédent = 0.503,
 *                            acceptable dérive ≤ 2.0 points score CALC V3.4)
 *
 * Matrix bench R-D.1 cell_mean pour référence :
 *   Mode              ACTION  INTERIOR SENSORY  CATHEDRAL
 *   M1_baseline       2.329   6.559    6.290    1.137
 *   M3_gated_A        1.140   7.084    4.696    0.498
 *
 * Invariants (cohérence cross-bench) :
 *   - Scoring CALC V3.4 identique (COEFFICIENTS_V3_4)
 *   - SYSTEM_PROMPT, briefs, contracts, signature_words IDENTIQUES à R-D.1
 *   - Seeds déterministes : hashSeed(mode|scene|chunk|seed_idx) FNV-1a 32 bits
 *   - Plan V2B2 réel (N=4, word_targets variables) pour M_prod_p1
 *   - Plan V2B2 pseudo (même plan, directive forcée baseline) pour M1
 *
 * Usage :
 *   cd packages/sovereign-engine
 *   $env:OMEGA_OLLAMA_MODEL="qwen3:32b"
 *   npx tsx scripts/bench-p1-robustness-v1.ts
 *
 * Env vars :
 *   OMEGA_OLLAMA_URL          (default: http://localhost:11434)
 *   OMEGA_OLLAMA_MODEL        (default: qwen3:32b)
 *   OMEGA_P1_BENCH_OUTPUT     (default: ./bench-p1-robustness-results.json)
 *   OMEGA_P1_BENCH_RESUME     (default: 0)
 *   OMEGA_P1_BENCH_SEEDS      (default: 3)
 *   OMEGA_P1_BENCH_TIMEOUT_MS (default: 600000)
 *
 * Output :
 *   - bench-p1-robustness-results.json          (24 runs incrementally persisted)
 *   - bench-p1-robustness-results-report.md     (verdict B1-B4)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  planAdaptiveChunkingV2B2,
  pickPacingDirective,
  detectArchetype,
  type AdaptiveChunkConfig,
  type ChunkPlan,
  type PacingRegister,
  type PacingState,
  type Archetype,
} from '../src/generation/adaptive-chunker.js';
import type { EmotionContract, EmotionQuartile } from '../src/types.js';
import { extractDispatcherFeatures } from '../src/scoring/dispatcher/features-provenance.js';
import {
  COEFFICIENTS_V3_4,
  type LangKey,
  type LangModel,
} from '../src/scoring/dispatcher/coefficients-v3-4.js';
import { DISPATCHER_FEATURE_NAMES } from '../src/scoring/dispatcher/features-provenance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const OLLAMA_URL = process.env.OMEGA_OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OMEGA_OLLAMA_MODEL ?? 'qwen3:32b';
const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../bench-p1-robustness-results.json');
const OUTPUT_PATH = process.env.OMEGA_P1_BENCH_OUTPUT ?? DEFAULT_OUTPUT_PATH;
const REPORT_PATH = OUTPUT_PATH.replace(/\.json$/, '-report.md');
const RESUME = process.env.OMEGA_P1_BENCH_RESUME === '1';
const SEEDS_PER_CELL = Math.max(1, Number(process.env.OMEGA_P1_BENCH_SEEDS) || 3);
const CALL_TIMEOUT_MS = Number(process.env.OMEGA_P1_BENCH_TIMEOUT_MS) || 600_000;
const MIN_PROSE_LENGTH = 200;

const REGISTER: PacingRegister = 'litteraire';

// Config V2-B.2 production (identique bench R-D.1)
const V2B2_CONFIG: AdaptiveChunkConfig = {
  alpha: 0.3,
  beta: 0.3,
  gamma: 0.2,
  delta: 0.2,
  l_ref: 750,
  l_min: 300,
  l_max: 1200,
  w_ref: 3000,
  w_min: 2500,
  w_max: 4500,
  pivot_enabled: true,
  register: REGISTER,
  arousal_action_threshold: 0.8,
  arousal_introspective_threshold: 0.3,
  silence_threshold: 0.5,
  pivot_word_target: 400,
};

// Baseline directive de référence (via pickPacingDirective avec state='baseline')
const BASELINE_DIRECTIVE = pickPacingDirective(REGISTER, 'baseline', 'adaptive');

// ──────────────────────────────────────────────────────────────────────────────
// MODES
// ──────────────────────────────────────────────────────────────────────────────

type ModeId = 'M1_baseline' | 'M_prod_p1';

interface ModeSpec {
  readonly id: ModeId;
  readonly label: string;
}

const MODES: readonly ModeSpec[] = [
  { id: 'M1_baseline', label: 'baseline directive fixe (contrôle, reproduit R-D.1 M1)' },
  {
    id: 'M_prod_p1',
    label: 'production pipeline post-P1 (gating câblé commit 7e89f95f)',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// SCÈNES — 4 archétypes verbatim bench R-D.1
// ──────────────────────────────────────────────────────────────────────────────

interface BenchScene {
  readonly id: string;
  readonly lang: 'fr' | 'en';
  readonly archetype_label: Archetype;
  readonly brief: string;
  readonly signature_words: readonly string[];
  readonly contract: EmotionContract;
}

function makeQuartile(
  q: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  arousal: number,
  valence: number,
): EmotionQuartile {
  return {
    quartile: q,
    target_14d: {},
    valence,
    arousal,
    dominant: 'neutral',
    narrative_instruction: '',
  };
}

function makeContract(
  arousals: readonly [number, number, number, number],
  valences: readonly [number, number, number, number],
  pic: number,
  faille: number,
  silence_zones: readonly { readonly start_pct: number; readonly end_pct: number }[],
  direction: 'darkening' | 'brightening' | 'stable' | 'oscillating',
): EmotionContract {
  return {
    curve_quartiles: [
      makeQuartile('Q1', arousals[0], valences[0]),
      makeQuartile('Q2', arousals[1], valences[1]),
      makeQuartile('Q3', arousals[2], valences[2]),
      makeQuartile('Q4', arousals[3], valences[3]),
    ],
    intensity_range: { min: Math.min(...arousals), max: Math.max(...arousals) },
    tension: {
      slope_target:
        arousals[3] > arousals[0] ? 'ascending' : arousals[3] < arousals[0] ? 'descending' : 'arc',
      pic_position_pct: pic,
      faille_position_pct: faille,
      silence_zones,
    },
    terminal_state: {
      target_14d: {},
      valence: valences[3],
      arousal: arousals[3],
      dominant: 'neutral',
      reader_state: '',
    },
    rupture: {
      exists: true,
      position_pct: pic,
      before_dominant: 'neutral',
      after_dominant: 'neutral',
      delta_valence: valences[3] - valences[0],
    },
    valence_arc: { start: valences[0], end: valences[3], direction },
  };
}

const SCENES: readonly BenchScene[] = [
  {
    id: 'fr_action_poursuite',
    lang: 'fr',
    archetype_label: 'ACTION',
    brief: `Un homme court dans les ruelles d'un port méditerranéen à l'aube. Quelqu'un le suit. Les pavés sont mouillés, les pêcheurs commencent à sortir. Troisième personne, focalisation interne, passé simple/imparfait. Émotion cible : urgence physique, peur contrôlée — montrée par le corps, jamais nommée.`,
    signature_words: ['pavés', 'souffle', 'pas', 'ruelle', 'aube', 'proue', 'sueur'],
    contract: makeContract(
      [0.6, 0.85, 0.9, 0.5],
      [-0.2, -0.5, -0.4, 0.1],
      0.65,
      0.3,
      [{ start_pct: 0.85, end_pct: 1.0 }],
      'oscillating',
    ),
  },
  {
    id: 'fr_interior_maison_enfance',
    lang: 'fr',
    archetype_label: 'INTERIOR',
    brief: `Une femme de soixante ans entre dans la maison de son enfance, vidée par les déménageurs. Il ne reste que les marques au sol là où les meubles se tenaient. Fin d'après-midi, lumière rasante par les volets entrouverts. Troisième personne, focalisation interne, passé simple/imparfait. Émotion cible : mélancolie contenue — la perte se lit dans les détails physiques, pas dans les pensées.`,
    signature_words: ['cire', 'parquet', 'volet', 'poussière', 'empreinte', 'lumière', 'silence'],
    contract: makeContract(
      [0.3, 0.4, 0.5, 0.2],
      [-0.1, -0.3, -0.5, -0.4],
      0.5,
      0.85,
      [
        { start_pct: 0.0, end_pct: 0.2 },
        { start_pct: 0.7, end_pct: 1.0 },
      ],
      'darkening',
    ),
  },
  {
    id: 'fr_sensory_cuisine_nuit',
    lang: 'fr',
    archetype_label: 'SENSORY',
    brief: `Un cuisinier prépare un repas seul dans sa cuisine professionnelle, la nuit. Le restaurant est fermé. Il cuisine pour lui-même pour la première fois depuis des années. Chaque geste est un souvenir. Troisième personne, focalisation interne, passé simple/imparfait. Émotion cible : solitude qui se transforme en réconciliation silencieuse. Les 5 sens présents, goût et odorat dominants.`,
    signature_words: ['huile', 'cuivre', 'lame', 'ail', 'tiède', 'sel', 'braise'],
    contract: makeContract(
      [0.4, 0.3, 0.55, 0.35],
      [-0.3, -0.2, 0.2, 0.4],
      0.6,
      0.2,
      [{ start_pct: 0.15, end_pct: 0.3 }],
      'brightening',
    ),
  },
  {
    id: 'fr_cathedral_gardien_nuit',
    lang: 'fr',
    archetype_label: 'CATHEDRAL',
    brief: `Un gardien de nuit dans un musée d'art contemporain fait sa dernière ronde. Demain il prend sa retraite. Il s'arrête devant une œuvre qu'il n'a jamais comprise en trente ans. Cette nuit, quelque chose change. Troisième personne, focalisation interne, passé simple/imparfait. Émotion cible : épiphanie silencieuse — le sens arrive par le corps, pas par l'intellect.`,
    signature_words: ['béton', 'écho', 'pas', 'verre', 'néon', 'seuil', 'lumière'],
    contract: makeContract(
      [0.25, 0.35, 0.5, 0.3],
      [-0.2, -0.1, 0.3, 0.5],
      0.55,
      0.1,
      [
        { start_pct: 0.3, end_pct: 0.45 },
        { start_pct: 0.8, end_pct: 1.0 },
      ],
      'brightening',
    ),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT (verbatim R-D.1)
// ──────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un moteur de prose littéraire française. Tu produis de la fiction de qualité publication.

LOIS SUPRÊMES :
1. Montre par le corps, jamais par la pensée. Les personnages ne "ressentent" pas — la peur se manifeste en doigts blanchis, respiration coupée, goût de cuivre.
2. Chaque phrase gagne son existence. Avancer l'intrigue, révéler un personnage, approfondir l'atmosphère.
3. Le sous-texte est l'histoire réelle. Ce que les personnages disent ≠ ce qu'ils veulent dire.
4. Architecture sensorielle : minimum 4 sens par scène. Superposer.
5. Le rythme est une architecture : alterner phrases brèves qui tranchent et phrases longues qui portent.
6. Asymétrie d'information : ce qui est retenu crée la pression.
7. Le non-dit > le dit.

INTERDITS : mots-filtres ("il vit", "elle sentit"), constructions paresseuses, émotions nommées ("il était terrifié"), points d'exclamation dans la narration, points de suspension dramatiques.

Retourne UNIQUEMENT la prose. Pas de titres, pas de balises, pas de commentaires. Paragraphes séparés par des lignes vides.`;

// ──────────────────────────────────────────────────────────────────────────────
// DIRECTIVE RESOLVER — deux modes
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Pour M_prod_p1, nous utilisons le plan production : planAdaptiveChunkingV2B2
 * qui lui-même appelle pickPacingDirective(register, state, 'adaptive', archetype)
 * via le wiring P1 scellé. Les directives sont DANS le plan : chunk.pacing_directive.
 */
function planAndDirectives(mode: ModeId, scene: BenchScene): {
  plan: readonly ChunkPlan[];
  directives: readonly string[];
  archetype_detected: Archetype;
} {
  const plan = planAdaptiveChunkingV2B2(scene.contract, V2B2_CONFIG);
  const detected = detectArchetype(scene.contract);

  if (mode === 'M1_baseline') {
    // Override : directive = baseline partout (contrôle)
    const directives = plan.map(() => BASELINE_DIRECTIVE);
    return { plan, directives, archetype_detected: detected };
  }

  // M_prod_p1 : utilise directives du plan (wiring P1 actif)
  const directives = plan.map((c) => c.pacing_directive);
  return { plan, directives, archetype_detected: detected };
}

// ──────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER (verbatim R-D.1 mais paramétré par word_target du plan réel)
// ──────────────────────────────────────────────────────────────────────────────

function buildChunkPrompt(
  scene: BenchScene,
  chunkIdx: number,
  totalChunks: number,
  wordTarget: number,
  lastTail: string | null,
  directive: string,
): string {
  const position = `chunk ${chunkIdx + 1}/${totalChunks}`;
  const sigLine =
    chunkIdx === 0 && scene.signature_words.length > 0
      ? `\nMots à tisser naturellement dans la prose : ${scene.signature_words.slice(0, 7).join(', ')}.`
      : '';
  const pacing = `Pacing : ${directive}.`;
  const target = `Longueur cible : ${wordTarget} mots (±10 %).`;

  if (chunkIdx === 0) {
    return `Tu écris le DÉBUT d'une scène littéraire (${position}).\n\nSITUATION :\n${scene.brief}\n${sigLine}\n\n${pacing}\n${target}\n\nPas de préambule. Retourne UNIQUEMENT la prose, entre les balises <prose> et </prose>.`;
  }
  const isLast = chunkIdx === totalChunks - 1;
  const header = isLast
    ? `Tu TERMINES cette scène littéraire (${position}).`
    : `Tu CONTINUES cette scène littéraire (${position}).`;
  return `${header}\n\nSITUATION GÉNÉRALE :\n${scene.brief}\n\nDERNIERS MOTS DU CHUNK PRÉCÉDENT (continuer naturellement) :\n"${lastTail ?? ''}"\n\n${pacing}\n${target}\n\nRetourne UNIQUEMENT la prose, entre les balises <prose> et </prose>.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// OLLAMA CALL (pattern R-D.1)
// ──────────────────────────────────────────────────────────────────────────────

function callOllama(systemPrompt: string, userPrompt: string, seed: number): string {
  const isQwen = OLLAMA_MODEL.toLowerCase().includes('qwen');
  const requestBody = JSON.stringify({
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    ...(isQwen ? { think: false } : {}),
    options: { temperature: 0.8, num_predict: 2048, top_p: 0.92, seed },
  });

  const script = `
    const http = require('http');
    let stdinBuf = '';
    process.stdin.on('data', (chunk) => stdinBuf += chunk);
    process.stdin.on('end', () => {
      const { body, url } = JSON.parse(stdinBuf);
      const parsed = new URL(url + '/api/chat');
      const req = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            process.stderr.write('Ollama error ' + res.statusCode + ': ' + data);
            process.exit(1);
          }
          const parsed = JSON.parse(data);
          process.stdout.write(parsed.message.content || '');
        });
      });
      req.on('error', (e) => { process.stderr.write(e.message); process.exit(1); });
      req.write(body);
      req.end();
    });
  `.replace(/\n/g, ' ');

  const stdinPayload = JSON.stringify({ body: requestBody, url: OLLAMA_URL });
  const raw = execSync(`node -e "${script.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    timeout: CALL_TIMEOUT_MS,
    maxBuffer: 20 * 1024 * 1024,
    input: stdinPayload,
  });
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return cleaned;
}

function extractProse(raw: string): string {
  const m = raw.match(/<prose>([\s\S]*?)<\/prose>/);
  if (m) return m[1].trim();
  return raw.trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// SCORING Ridge V3.4
// ──────────────────────────────────────────────────────────────────────────────

interface CalcScore {
  readonly tier_score: number;
  readonly route: string;
  readonly status: 'ok' | 'skipped';
  readonly skip_reason?: string;
  readonly features_raw?: Record<string, number>;
}

function scoreProse(prose: string, lang: 'fr' | 'en'): CalcScore {
  if (prose.length < MIN_PROSE_LENGTH) {
    return { tier_score: 0, route: 'SKIPPED', status: 'skipped', skip_reason: 'prose_too_short' };
  }
  const langKey: LangKey = lang;
  const model: LangModel = COEFFICIENTS_V3_4[langKey];
  const rawFeatures = extractDispatcherFeatures(prose);
  for (const name of DISPATCHER_FEATURE_NAMES) {
    const v = rawFeatures[name];
    if (!Number.isFinite(v)) {
      return {
        tier_score: 0,
        route: 'SKIPPED',
        status: 'skipped',
        skip_reason: `nan_feature:${name}`,
      };
    }
  }
  let score = model.intercept;
  for (const name of DISPATCHER_FEATURE_NAMES) {
    const stats = model.features[name];
    const raw = rawFeatures[name];
    const z = (raw - stats.mean) / stats.std;
    score += stats.coef * z;
  }
  return { tier_score: score, route: lang.toUpperCase(), status: 'ok', features_raw: rawFeatures };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

// ──────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────────────────────────

function hashSeed(
  mode: ModeId,
  scene_id: string,
  chunk_index: number,
  seed_idx: number,
): number {
  let h = 2166136261;
  const s = `${mode}|${scene_id}|${chunk_index}|${seed_idx}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 2_147_483_647;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, x) => s + x, 0) / values.length;
}

function stdev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

// ──────────────────────────────────────────────────────────────────────────────
// RUNNER
// ──────────────────────────────────────────────────────────────────────────────

interface ChunkTrace {
  readonly chunk_index: number;
  readonly pacing_state: PacingState;
  readonly directive: string;
  readonly gated: boolean;
  readonly word_target: number;
  readonly words: number;
}

interface BenchRun {
  readonly mode: ModeId;
  readonly scene_id: string;
  readonly archetype_label: Archetype;
  readonly archetype_detected: Archetype;
  readonly lang: 'fr' | 'en';
  readonly seed_idx: number;
  readonly n_chunks: number;
  readonly total_words: number;
  readonly duration_ms: number;
  readonly ollama_calls: number;
  readonly tier_score: number;
  readonly status: 'ok' | 'skipped' | 'error';
  readonly error?: string;
  readonly prose_excerpt?: string;
  readonly features_raw?: Record<string, number>;
  readonly chunk_trace?: readonly ChunkTrace[];
}

async function runCell(
  mode: ModeSpec,
  scene: BenchScene,
  seedIdx: number,
): Promise<BenchRun> {
  const t0 = Date.now();
  const { plan, directives, archetype_detected } = planAndDirectives(mode.id, scene);

  const trace: ChunkTrace[] = [];
  let concatenated = '';
  let lastTail: string | null = null;
  let ollamaCalls = 0;

  try {
    for (let i = 0; i < plan.length; i++) {
      const chunk = plan[i];
      const directive = directives[i];
      const seed = hashSeed(mode.id, scene.id, i, seedIdx);
      const userPrompt = buildChunkPrompt(
        scene,
        i,
        plan.length,
        chunk.word_target,
        lastTail,
        directive,
      );
      const raw = callOllama(SYSTEM_PROMPT, userPrompt, seed);
      ollamaCalls++;
      const prose = extractProse(raw);
      const words = wordCount(prose);
      const tail = prose.split(/\s+/).slice(-25).join(' ');

      // Gated detection : si M_prod_p1 ∧ INTERIOR ∧ state∈{silence, introspective}
      // et directive == BASELINE → gated effectivement
      const isGatableState = chunk.pacing_state === 'silence' || chunk.pacing_state === 'introspective';
      const gated =
        mode.id === 'M_prod_p1' &&
        archetype_detected === 'INTERIOR' &&
        isGatableState &&
        directive === BASELINE_DIRECTIVE;

      trace.push({
        chunk_index: i,
        pacing_state: chunk.pacing_state,
        directive,
        gated,
        word_target: chunk.word_target,
        words,
      });
      concatenated += (concatenated.length > 0 ? '\n\n' : '') + prose;
      lastTail = tail;
    }

    const fullProse = concatenated;
    const totalWords = wordCount(fullProse);
    const score = scoreProse(fullProse, scene.lang);
    const duration = Date.now() - t0;

    return {
      mode: mode.id,
      scene_id: scene.id,
      archetype_label: scene.archetype_label,
      archetype_detected,
      lang: scene.lang,
      seed_idx: seedIdx,
      n_chunks: plan.length,
      total_words: totalWords,
      duration_ms: duration,
      ollama_calls: ollamaCalls,
      tier_score: score.tier_score,
      status: score.status,
      prose_excerpt: fullProse.slice(0, 400),
      features_raw: score.features_raw,
      chunk_trace: trace,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      mode: mode.id,
      scene_id: scene.id,
      archetype_label: scene.archetype_label,
      archetype_detected,
      lang: scene.lang,
      seed_idx: seedIdx,
      n_chunks: plan.length,
      total_words: 0,
      duration_ms: Date.now() - t0,
      ollama_calls: ollamaCalls,
      tier_score: 0,
      status: 'error',
      error: err,
      chunk_trace: trace,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// VERDICT B1-B4
// ──────────────────────────────────────────────────────────────────────────────

interface Verdict {
  readonly b1_interior_gain: { delta: number; pass: boolean; threshold: number };
  readonly b2_action_nonreg: { delta: number; pass: boolean; threshold: number };
  readonly b2_sensory_nonreg: { delta: number; pass: boolean; threshold: number };
  readonly b3_cathedral_inv: { delta: number; pass: boolean; threshold: number };
  readonly b4_cathedral_reprod: {
    mu_baseline: number;
    reference: number;
    gap: number;
    pass: boolean;
    threshold: number;
  };
  readonly overall_pass: boolean;
  readonly cell_means: Record<string, Record<string, number>>; // mode -> label -> mu
}

function computeVerdict(runs: readonly BenchRun[]): Verdict {
  const validRuns = runs.filter((r) => r.status === 'ok');
  const byModeArch: Record<string, Record<string, number[]>> = {
    M1_baseline: { ACTION: [], INTERIOR: [], SENSORY: [], CATHEDRAL: [] },
    M_prod_p1: { ACTION: [], INTERIOR: [], SENSORY: [], CATHEDRAL: [] },
  };

  for (const r of validRuns) {
    // Critère : archetype_label (conforme design R-D.1 — cellule matrix)
    byModeArch[r.mode][r.archetype_label].push(r.tier_score);
  }

  const cellMeans: Record<string, Record<string, number>> = {
    M1_baseline: {
      ACTION: mean(byModeArch.M1_baseline.ACTION),
      INTERIOR: mean(byModeArch.M1_baseline.INTERIOR),
      SENSORY: mean(byModeArch.M1_baseline.SENSORY),
      CATHEDRAL: mean(byModeArch.M1_baseline.CATHEDRAL),
    },
    M_prod_p1: {
      ACTION: mean(byModeArch.M_prod_p1.ACTION),
      INTERIOR: mean(byModeArch.M_prod_p1.INTERIOR),
      SENSORY: mean(byModeArch.M_prod_p1.SENSORY),
      CATHEDRAL: mean(byModeArch.M_prod_p1.CATHEDRAL),
    },
  };

  const b1 = cellMeans.M_prod_p1.INTERIOR - cellMeans.M1_baseline.INTERIOR;
  const b2a = cellMeans.M_prod_p1.ACTION - cellMeans.M1_baseline.ACTION;
  const b2s = cellMeans.M_prod_p1.SENSORY - cellMeans.M1_baseline.SENSORY;
  const b3 = cellMeans.M_prod_p1.CATHEDRAL - cellMeans.M1_baseline.CATHEDRAL;
  const muCathBaseline = cellMeans.M1_baseline.CATHEDRAL;
  const b4gap = Math.abs(muCathBaseline - 0.503);

  const verdict: Verdict = {
    b1_interior_gain: { delta: b1, pass: b1 >= 3.0, threshold: 3.0 },
    b2_action_nonreg: { delta: b2a, pass: b2a >= -0.5, threshold: -0.5 },
    b2_sensory_nonreg: { delta: b2s, pass: b2s >= -0.5, threshold: -0.5 },
    b3_cathedral_inv: { delta: b3, pass: b3 >= -0.5, threshold: -0.5 },
    b4_cathedral_reprod: {
      mu_baseline: muCathBaseline,
      reference: 0.503,
      gap: b4gap,
      pass: b4gap <= 2.0,
      threshold: 2.0,
    },
    overall_pass:
      b1 >= 3.0 && b2a >= -0.5 && b2s >= -0.5 && b3 >= -0.5 && b4gap <= 2.0,
    cell_means: cellMeans,
  };

  return verdict;
}

// ──────────────────────────────────────────────────────────────────────────────
// PERSISTENCE + REPORT
// ──────────────────────────────────────────────────────────────────────────────

interface BenchState {
  started_at: string;
  finished_at?: string;
  ollama_model: string;
  seeds_per_cell: number;
  runs: BenchRun[];
  verdict?: Verdict;
}

function loadState(): BenchState | null {
  if (!fs.existsSync(OUTPUT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveState(state: BenchState): void {
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(state, null, 2));
}

function renderReport(state: BenchState): string {
  const v = state.verdict;
  if (!v) return '# bench-p1-robustness — INCOMPLET\n';
  const flag = (b: boolean) => (b ? '✅ PASS' : '❌ FAIL');
  const lines: string[] = [];
  lines.push(`# bench-p1-robustness — verdict (commit ref 7e89f95f)`);
  lines.push('');
  lines.push(`**Generated**: ${state.finished_at ?? state.started_at}`);
  lines.push(`**Model**: ${state.ollama_model}`);
  lines.push(`**Seeds/cell**: ${state.seeds_per_cell}`);
  lines.push(`**Runs OK**: ${state.runs.filter((r) => r.status === 'ok').length}/${state.runs.length}`);
  lines.push('');
  lines.push('## Matrice cell_mean');
  lines.push('');
  lines.push('| Mode          | ACTION  | INTERIOR | SENSORY | CATHEDRAL |');
  lines.push('|---------------|---------|----------|---------|-----------|');
  for (const mode of ['M1_baseline', 'M_prod_p1']) {
    const m = v.cell_means[mode];
    lines.push(
      `| ${mode.padEnd(13)} | ${m.ACTION.toFixed(3).padStart(7)} | ${m.INTERIOR.toFixed(3).padStart(8)} | ${m.SENSORY.toFixed(3).padStart(7)} | ${m.CATHEDRAL.toFixed(3).padStart(9)} |`,
    );
  }
  lines.push('');
  lines.push('## Gates B1-B4');
  lines.push('');
  lines.push(
    `- **B1** INTERIOR gain : Δ = ${v.b1_interior_gain.delta.toFixed(3)} (seuil ≥ ${v.b1_interior_gain.threshold}) → ${flag(v.b1_interior_gain.pass)}`,
  );
  lines.push(
    `- **B2-ACTION** non-régression : Δ = ${v.b2_action_nonreg.delta.toFixed(3)} (seuil ≥ ${v.b2_action_nonreg.threshold}) → ${flag(v.b2_action_nonreg.pass)}`,
  );
  lines.push(
    `- **B2-SENSORY** non-régression : Δ = ${v.b2_sensory_nonreg.delta.toFixed(3)} (seuil ≥ ${v.b2_sensory_nonreg.threshold}) → ${flag(v.b2_sensory_nonreg.pass)}`,
  );
  lines.push(
    `- **B3** CATHEDRAL invariance : Δ = ${v.b3_cathedral_inv.delta.toFixed(3)} (seuil ≥ ${v.b3_cathedral_inv.threshold}) → ${flag(v.b3_cathedral_inv.pass)}`,
  );
  lines.push(
    `- **B4** CATHEDRAL reproductibilité : μ_baseline = ${v.b4_cathedral_reprod.mu_baseline.toFixed(3)}, |gap vs 0.503| = ${v.b4_cathedral_reprod.gap.toFixed(3)} (seuil ≤ ${v.b4_cathedral_reprod.threshold}) → ${flag(v.b4_cathedral_reprod.pass)}`,
  );
  lines.push('');
  lines.push(`## VERDICT GLOBAL : ${flag(v.overall_pass)}`);
  lines.push('');
  lines.push('## Runs (résumé)');
  lines.push('');
  lines.push('| mode | scene | label | detected | seed | words | score | status |');
  lines.push('|------|-------|-------|----------|------|-------|-------|--------|');
  for (const r of state.runs) {
    lines.push(
      `| ${r.mode} | ${r.scene_id} | ${r.archetype_label} | ${r.archetype_detected} | ${r.seed_idx} | ${r.total_words} | ${r.tier_score.toFixed(3)} | ${r.status} |`,
    );
  }
  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let state: BenchState = RESUME
    ? (loadState() ?? {
        started_at: new Date().toISOString(),
        ollama_model: OLLAMA_MODEL,
        seeds_per_cell: SEEDS_PER_CELL,
        runs: [],
      })
    : {
        started_at: new Date().toISOString(),
        ollama_model: OLLAMA_MODEL,
        seeds_per_cell: SEEDS_PER_CELL,
        runs: [],
      };

  const done = new Set<string>(state.runs.map((r) => `${r.mode}|${r.scene_id}|${r.seed_idx}`));

  const total = MODES.length * SCENES.length * SEEDS_PER_CELL;
  console.log(`[bench-p1-robustness] model=${OLLAMA_MODEL} total=${total} resume=${RESUME}`);
  console.log(`[bench-p1-robustness] baseline ref: "${BASELINE_DIRECTIVE.slice(0, 60)}..."`);

  let idx = 0;
  for (const mode of MODES) {
    for (const scene of SCENES) {
      for (let seedIdx = 0; seedIdx < SEEDS_PER_CELL; seedIdx++) {
        idx++;
        const key = `${mode.id}|${scene.id}|${seedIdx}`;
        if (done.has(key)) {
          console.log(`[${idx}/${total}] SKIP (done) ${key}`);
          continue;
        }
        console.log(`[${idx}/${total}] RUN ${key}`);
        const run = await runCell(mode, scene, seedIdx);
        state.runs.push(run);
        saveState(state);
        console.log(
          `  → status=${run.status} words=${run.total_words} score=${run.tier_score.toFixed(3)} detected=${run.archetype_detected} calls=${run.ollama_calls}`,
        );
      }
    }
  }

  state.verdict = computeVerdict(state.runs);
  state.finished_at = new Date().toISOString();
  saveState(state);

  const report = renderReport(state);
  fs.writeFileSync(REPORT_PATH, report);

  console.log('');
  console.log('═'.repeat(78));
  console.log(report);
  console.log('═'.repeat(78));
  console.log(`[bench-p1-robustness] report: ${REPORT_PATH}`);
  console.log(`[bench-p1-robustness] data  : ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error('[bench-p1-robustness] FATAL', e);
  process.exit(1);
});
