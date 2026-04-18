/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA P1 ROBUSTNESS BENCH — v2 (strict R-D.1 reproduction, plan V1 static)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Raison d'être : bench v1 (bench-p1-robustness-v1.ts) a produit FAIL 4/5 gates.
 * Autopsie (outputs/BENCH_P1_AUTOPSY_v1.md + NCR_BENCH_METHOD_DRIFT.md) a révélé
 * divergence méthodologique avec R-D.1 :
 *   - v1 utilise planAdaptiveChunkingV2B2 (word_targets variables)
 *   - R-D.1 utilise plan V1 static 4×750w
 *   - v1 absent M2_adaptive, donc seuil B1=3.0 (calibré sur M3−M2 R-D.1) comparé
 *     à M_prod_p1 − M1 (référence interne ≈ +0.525 seulement)
 *
 * v2 corrige :
 *   1. Plan V1 static 4 × 750w pour TOUS les modes (comme R-D.1).
 *   2. 3 modes : M1_baseline, M2_adaptive, M_prod_p1 (tests la PROD real).
 *   3. M_prod_p1 appelle pickPacingDirective(register, state, undefined, archetype)
 *      — signature 4-arg post-P1 scellée au commit 7e89f95f.
 *   4. Gates G1-G4 recalibrés :
 *      - G1 : Δ(M_prod_p1 − M2_adaptive) INTERIOR ≥ +3.0 (reproduction R-D.1 +5.379)
 *      - G2a : Δ(M_prod_p1 − M1_baseline) ACTION ≥ −0.5 (non-régression vs baseline)
 *      - G2b : Δ(M_prod_p1 − M1_baseline) SENSORY ≥ −0.5
 *      - G3 : Δ(M_prod_p1 − M1_baseline) CATHEDRAL ≥ −0.5 (invariance)
 *      - G4 : |μ(M1 CATHEDRAL) − 0.503| ≤ 2.0 (reproductibilité R-D.1)
 *   5. n = 6 seeds par cellule → 72 runs (4 arch × 3 modes × 6 seeds)
 *      Reduction variance vs v1 (n=3) : IC 95% ±0.85 au lieu de ±1.35.
 *
 * Test réel : M_prod_p1 appelle VRAI pickPacingDirective avec archetype détecté
 * par detectArchetype(contract). Ce qui tourne en PROD V2 depuis 7e89f95f.
 *
 * Invariants (cohérence cross-bench) :
 *   - SYSTEM_PROMPT, briefs, signature_words, contracts IDENTIQUES à R-D.1
 *   - Scoring CALC V3.4 identique
 *   - Seeds déterministes : hashSeed(mode|scene|chunk|seed_idx) FNV-1a 32 bits
 *   - Aucune modification src/ ; toutes overrides locales au script
 *
 * Usage :
 *   cd packages/sovereign-engine
 *   $env:OMEGA_OLLAMA_MODEL="qwen3:32b"
 *   npx tsx scripts/bench-p1-robustness-v2.ts
 *
 * Env vars :
 *   OMEGA_OLLAMA_URL         (default: http://localhost:11434)
 *   OMEGA_OLLAMA_MODEL       (default: qwen3:32b)
 *   OMEGA_P1V2_OUTPUT        (default: ./bench-p1-robustness-v2-results.json)
 *   OMEGA_P1V2_RESUME        (default: 0 — si 1, reprend depuis OUTPUT)
 *   OMEGA_P1V2_SEEDS         (default: 6)
 *   OMEGA_P1V2_TIMEOUT_MS    (default: 600000)
 *
 * Output :
 *   - bench-p1-robustness-v2-results.json       (incremental persist)
 *   - bench-p1-robustness-v2-results-report.md  (verdict PASS/FAIL par gate)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  planAdaptiveChunkingV2B2,
  buildStaticPlan,
  pickPacingDirective,
  detectArchetype,
  type AdaptiveChunkConfig,
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
const DEFAULT_OUTPUT_PATH = path.resolve(
  __dirname,
  '../bench-p1-robustness-v2-results.json',
);
const OUTPUT_PATH = process.env.OMEGA_P1V2_OUTPUT ?? DEFAULT_OUTPUT_PATH;
const REPORT_PATH = OUTPUT_PATH.replace(/\.json$/, '-report.md');
const RESUME = process.env.OMEGA_P1V2_RESUME === '1';
const SEEDS_PER_CELL = Math.max(1, Number(process.env.OMEGA_P1V2_SEEDS) || 6);
const CALL_TIMEOUT_MS = Number(process.env.OMEGA_P1V2_TIMEOUT_MS) || 600_000;
const MIN_PROSE_LENGTH = 200;

const REGISTER: PacingRegister = 'litteraire';

// Config V2-B.2 — utilisée UNIQUEMENT pour dériver pseudo-states (pas pour plan).
// Plan réel = buildStaticPlan(V2B2_CONFIG) qui produit 4×750w.
// IDENTIQUE à R-D.1 pour cohérence méthodologique stricte.
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

// Baseline directive fixe, identique à R-D.1 (LITTERAIRE_BASELINE_DIRECTIVE)
const LITTERAIRE_BASELINE_DIRECTIVE =
  'rythme équilibré, alternance mesurée, respiration classique';

// ──────────────────────────────────────────────────────────────────────────────
// MODES (3 variants)
// ──────────────────────────────────────────────────────────────────────────────

type ModeId = 'M1_baseline' | 'M2_adaptive' | 'M_prod_p1';

interface ModeSpec {
  readonly id: ModeId;
  readonly label: string;
}

const MODES: readonly ModeSpec[] = [
  { id: 'M1_baseline', label: 'baseline directive fixe (contrôle, replay R-D.1 M1)' },
  { id: 'M2_adaptive', label: 'adaptive directive sans gating (replay R-D.1 M2 toxique)' },
  {
    id: 'M_prod_p1',
    label: 'production P1 — pickPacingDirective(reg, state, undefined, archetype) 4-arg',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// SCÈNES — VERBATIM R-D.1 (4 archétypes, identiques à bench-ab-v1-v2b.ts)
// ──────────────────────────────────────────────────────────────────────────────

interface BenchScene {
  readonly id: string;
  readonly lang: 'fr' | 'en';
  readonly archetype: Archetype;
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
    archetype: 'ACTION',
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
    archetype: 'INTERIOR',
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
    archetype: 'SENSORY',
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
    archetype: 'CATHEDRAL',
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
// SYSTEM PROMPT — VERBATIM R-D.1 / bench-ab-v1-v2b / bench-ablation-directive
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

// V1 static chunk config — IDENTIQUE R-D.1
const LEGACY_CHUNK_WORDS = 750;

// ──────────────────────────────────────────────────────────────────────────────
// DIRECTIVE RESOLVERS (3 modes)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Dérive pseudo-état adaptive pour chunk i sur plan V1 static (4 chunks).
 * Utilise planAdaptiveChunkingV2B2 pour obtenir les pacing_state par quartile.
 * IDENTIQUE à R-D.1.
 */
function pseudoState(contract: EmotionContract, chunkIdx: number): PacingState {
  const pseudoPlan = planAdaptiveChunkingV2B2(contract, V2B2_CONFIG);
  if (pseudoPlan.length === 0) return 'baseline';
  return pseudoPlan[chunkIdx % pseudoPlan.length].pacing_state;
}

function resolveDirective(
  mode: ModeId,
  scene: BenchScene,
  chunkIdx: number,
): { directive: string; effective_state: PacingState; gated: boolean; archetype: Archetype | null } {
  const state = pseudoState(scene.contract, chunkIdx);

  if (mode === 'M1_baseline') {
    return {
      directive: LITTERAIRE_BASELINE_DIRECTIVE,
      effective_state: 'baseline',
      gated: false,
      archetype: null,
    };
  }

  if (mode === 'M2_adaptive') {
    // Reproduction stricte R-D.1 M2 : appel 3-arg SANS archetype (pas de gating)
    const directive = pickPacingDirective(REGISTER, state, 'adaptive');
    return {
      directive,
      effective_state: state,
      gated: false,
      archetype: null,
    };
  }

  // M_prod_p1 — appel PROD avec archetype détecté (4-arg post-P1)
  const archetype = detectArchetype(scene.contract);
  // NOTE : pickPacingDirective 4-arg gère le gating INTERIOR × {silence, introspective}
  // en interne via la branche REGISTER_TABLE[reg].baseline (code adaptive-chunker.ts
  // post commit 7e89f95f). Le bench ne l'émule pas ; il appelle la vraie fonction.
  const directive = pickPacingDirective(REGISTER, state, undefined, archetype);

  // Détection du "gated" pour diagnostic : condition reproduite depuis le code prod
  const gated =
    archetype === 'INTERIOR' && (state === 'silence' || state === 'introspective');

  return {
    directive,
    effective_state: state,
    gated,
    archetype,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER — plan V1 static 4×750w pour TOUS les modes (VERBATIM R-D.1)
// ──────────────────────────────────────────────────────────────────────────────

function buildStaticChunkPrompt(
  scene: BenchScene,
  chunkIdx: number,
  totalChunks: number,
  lastTail: string | null,
  directive: string,
): string {
  const position = `chunk ${chunkIdx + 1}/${totalChunks}`;
  const sigLine =
    chunkIdx === 0 && scene.signature_words.length > 0
      ? `\nMots à tisser naturellement dans la prose : ${scene.signature_words.slice(0, 7).join(', ')}.`
      : '';
  const pacing = `Pacing : ${directive}.`;
  const target = `Longueur cible : ${LEGACY_CHUNK_WORDS} mots (±10 %).`;

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
// OLLAMA CALL (pattern R-D.1 verbatim)
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
    options: {
      temperature: 0.8,
      num_predict: 2048,
      top_p: 0.92,
      seed,
    },
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
// SCORING Ridge V3.4 (VERBATIM R-D.1)
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
// UTILITAIRES (VERBATIM R-D.1)
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

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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
  readonly archetype: Archetype | null;
  readonly directive: string;
  readonly gated: boolean;
  readonly words: number;
}

interface BenchRun {
  readonly mode: ModeId;
  readonly scene_id: string;
  readonly archetype: Archetype;
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
  seed_idx: number,
): Promise<BenchRun> {
  const startMs = Date.now();
  const chunksProse: string[] = [];
  const trace: ChunkTrace[] = [];
  let fullProse = '';
  let totalChunks = 0;

  try {
    const plans = buildStaticPlan(V2B2_CONFIG);
    totalChunks = plans.length;

    for (let i = 0; i < plans.length; i++) {
      const last_tail =
        i === 0 ? null : fullProse.split(/\s+/).slice(-80).join(' ').trim() || null;

      const resolved = resolveDirective(mode.id, scene, i);
      const prompt = buildStaticChunkPrompt(
        scene,
        i,
        totalChunks,
        last_tail,
        resolved.directive,
      );

      const seed = hashSeed(mode.id, scene.id, i, seed_idx);
      const raw = callOllama(SYSTEM_PROMPT, prompt, seed);
      const prose = extractProse(raw);
      chunksProse.push(prose);
      fullProse = (fullProse + '\n\n' + prose).trim();
      trace.push({
        chunk_index: i,
        pacing_state: resolved.effective_state,
        archetype: resolved.archetype,
        directive: resolved.directive,
        gated: resolved.gated,
        words: wordCount(prose),
      });
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return {
      mode: mode.id,
      scene_id: scene.id,
      archetype: scene.archetype,
      lang: scene.lang,
      seed_idx,
      n_chunks: totalChunks,
      total_words: wordCount(fullProse),
      duration_ms: Date.now() - startMs,
      ollama_calls: chunksProse.length,
      tier_score: 0,
      status: 'error',
      error: errMsg,
      chunk_trace: trace,
    };
  }

  const durationMs = Date.now() - startMs;
  const score = scoreProse(fullProse, scene.lang);

  return {
    mode: mode.id,
    scene_id: scene.id,
    archetype: scene.archetype,
    lang: scene.lang,
    seed_idx,
    n_chunks: totalChunks,
    total_words: wordCount(fullProse),
    duration_ms: durationMs,
    ollama_calls: chunksProse.length,
    tier_score: score.status === 'ok' ? score.tier_score : 0,
    status: score.status === 'ok' ? 'ok' : 'skipped',
    error: score.skip_reason,
    prose_excerpt: fullProse.slice(0, 400),
    features_raw: score.features_raw,
    chunk_trace: trace,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// STATE / PERSISTENCE
// ──────────────────────────────────────────────────────────────────────────────

interface BenchState {
  readonly started_at: string;
  readonly model: string;
  readonly register: PacingRegister;
  readonly v2b2_config: AdaptiveChunkConfig;
  readonly seeds_per_cell: number;
  readonly total_runs_planned: number;
  readonly design_version: string;
  runs: BenchRun[];
  finished_at?: string;
}

function loadOrInit(): BenchState {
  if (RESUME && fs.existsSync(OUTPUT_PATH)) {
    try {
      const raw = fs.readFileSync(OUTPUT_PATH, 'utf8');
      const parsed = JSON.parse(raw) as BenchState;
      console.log(`[RESUME] ${parsed.runs.length} runs déjà complétés depuis ${OUTPUT_PATH}`);
      return parsed;
    } catch (_e) {
      console.warn(`[RESUME] Échec lecture ${OUTPUT_PATH}, nouveau state`);
    }
  }
  return {
    started_at: new Date().toISOString(),
    model: OLLAMA_MODEL,
    register: REGISTER,
    v2b2_config: V2B2_CONFIG,
    seeds_per_cell: SEEDS_PER_CELL,
    total_runs_planned: MODES.length * SCENES.length * SEEDS_PER_CELL,
    design_version: 'v2_strict_rd1_replay_3modes_n6',
    runs: [],
  };
}

function saveState(state: BenchState): void {
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function doneKey(r: BenchRun): string {
  return `${r.mode}|${r.scene_id}|${r.seed_idx}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// AGGREGATION (mode × archetype)
// ──────────────────────────────────────────────────────────────────────────────

interface CellAgg {
  readonly mode: ModeId;
  readonly archetype: Archetype;
  readonly scene_id: string;
  readonly n_ok: number;
  readonly n_total: number;
  readonly scores: readonly number[];
  readonly cell_mean: number;
  readonly cell_median: number;
  readonly cell_std: number;
  readonly cell_mean_duration_ms: number;
}

function aggregateByCell(runs: readonly BenchRun[]): CellAgg[] {
  const out: CellAgg[] = [];
  for (const mode of MODES) {
    for (const scene of SCENES) {
      const cellRuns = runs.filter((r) => r.mode === mode.id && r.scene_id === scene.id);
      const okRuns = cellRuns.filter((r) => r.status === 'ok');
      const scores = okRuns.map((r) => r.tier_score);
      out.push({
        mode: mode.id,
        archetype: scene.archetype,
        scene_id: scene.id,
        n_ok: okRuns.length,
        n_total: cellRuns.length,
        scores,
        cell_mean: mean(scores),
        cell_median: median(scores),
        cell_std: stdev(scores),
        cell_mean_duration_ms: okRuns.length > 0 ? mean(okRuns.map((r) => r.duration_ms)) : 0,
      });
    }
  }
  return out;
}

function getCell(aggs: readonly CellAgg[], mode: ModeId, archetype: Archetype): CellAgg | undefined {
  return aggs.find((a) => a.mode === mode && a.archetype === archetype);
}

// ──────────────────────────────────────────────────────────────────────────────
// GATES G1-G4 (seuils RECALIBRÉS — voir NCR_BENCH_METHOD_DRIFT §3 Option A)
// ──────────────────────────────────────────────────────────────────────────────

const G1_INTERIOR_GAIN_THRESHOLD = 3.0; // M_prod_p1 − M2_adaptive sur INTERIOR
const G2_NON_REG_THRESHOLD = -0.5; // M_prod_p1 − M1_baseline sur ACTION/SENSORY
const G3_CATHEDRAL_INV_THRESHOLD = -0.5; // M_prod_p1 − M1_baseline sur CATHEDRAL
const G4_CATHEDRAL_REPRO_GAP = 2.0; // |μ(M1 CATHEDRAL) − 0.503| ≤ 2.0
const CATHEDRAL_REF_MEAN = 0.503; // Référence R-D.1 / bench ablation 24 runs

interface GateResult {
  readonly gate: string;
  readonly value: number;
  readonly threshold: number;
  readonly op: '>=' | '<=';
  readonly pass: boolean;
  readonly rationale: string;
}

function evaluateGates(aggs: readonly CellAgg[]): {
  gates: GateResult[];
  overall_pass: boolean;
} {
  const gates: GateResult[] = [];

  const prodI = getCell(aggs, 'M_prod_p1', 'INTERIOR')?.cell_mean ?? NaN;
  const m2I = getCell(aggs, 'M2_adaptive', 'INTERIOR')?.cell_mean ?? NaN;
  const prodA = getCell(aggs, 'M_prod_p1', 'ACTION')?.cell_mean ?? NaN;
  const m1A = getCell(aggs, 'M1_baseline', 'ACTION')?.cell_mean ?? NaN;
  const prodS = getCell(aggs, 'M_prod_p1', 'SENSORY')?.cell_mean ?? NaN;
  const m1S = getCell(aggs, 'M1_baseline', 'SENSORY')?.cell_mean ?? NaN;
  const prodC = getCell(aggs, 'M_prod_p1', 'CATHEDRAL')?.cell_mean ?? NaN;
  const m1C = getCell(aggs, 'M1_baseline', 'CATHEDRAL')?.cell_mean ?? NaN;

  const g1Delta = prodI - m2I;
  gates.push({
    gate: 'G1_INTERIOR_gain_vs_M2',
    value: g1Delta,
    threshold: G1_INTERIOR_GAIN_THRESHOLD,
    op: '>=',
    pass: Number.isFinite(g1Delta) && g1Delta >= G1_INTERIOR_GAIN_THRESHOLD,
    rationale: `μ(M_prod_p1 INTERIOR)=${prodI.toFixed(3)} − μ(M2_adaptive INTERIOR)=${m2I.toFixed(3)} = ${g1Delta.toFixed(3)}. Seuil +3.0 calibré sur R-D.1 ΔI(M3−M2)=+5.379.`,
  });

  const g2aDelta = prodA - m1A;
  gates.push({
    gate: 'G2a_ACTION_non_regression_vs_M1',
    value: g2aDelta,
    threshold: G2_NON_REG_THRESHOLD,
    op: '>=',
    pass: Number.isFinite(g2aDelta) && g2aDelta >= G2_NON_REG_THRESHOLD,
    rationale: `μ(M_prod_p1 ACTION)=${prodA.toFixed(3)} − μ(M1_baseline ACTION)=${m1A.toFixed(3)} = ${g2aDelta.toFixed(3)}. Non-régression vs baseline littéraire.`,
  });

  const g2bDelta = prodS - m1S;
  gates.push({
    gate: 'G2b_SENSORY_non_regression_vs_M1',
    value: g2bDelta,
    threshold: G2_NON_REG_THRESHOLD,
    op: '>=',
    pass: Number.isFinite(g2bDelta) && g2bDelta >= G2_NON_REG_THRESHOLD,
    rationale: `μ(M_prod_p1 SENSORY)=${prodS.toFixed(3)} − μ(M1_baseline SENSORY)=${m1S.toFixed(3)} = ${g2bDelta.toFixed(3)}.`,
  });

  const g3Delta = prodC - m1C;
  gates.push({
    gate: 'G3_CATHEDRAL_invariance_vs_M1',
    value: g3Delta,
    threshold: G3_CATHEDRAL_INV_THRESHOLD,
    op: '>=',
    pass: Number.isFinite(g3Delta) && g3Delta >= G3_CATHEDRAL_INV_THRESHOLD,
    rationale: `μ(M_prod_p1 CATHEDRAL)=${prodC.toFixed(3)} − μ(M1_baseline CATHEDRAL)=${m1C.toFixed(3)} = ${g3Delta.toFixed(3)}. Invariance (gating ne doit pas toucher CATHEDRAL).`,
  });

  const g4Gap = Math.abs(m1C - CATHEDRAL_REF_MEAN);
  gates.push({
    gate: 'G4_CATHEDRAL_reproducibility',
    value: g4Gap,
    threshold: G4_CATHEDRAL_REPRO_GAP,
    op: '<=',
    pass: Number.isFinite(g4Gap) && g4Gap <= G4_CATHEDRAL_REPRO_GAP,
    rationale: `|μ(M1 CATHEDRAL)=${m1C.toFixed(3)} − réf=${CATHEDRAL_REF_MEAN.toFixed(3)}| = ${g4Gap.toFixed(3)}. Reproductibilité R-D.1.`,
  });

  const overall_pass = gates.every((g) => g.pass);
  return { gates, overall_pass };
}

// ──────────────────────────────────────────────────────────────────────────────
// REPORT
// ──────────────────────────────────────────────────────────────────────────────

function writeReport(
  state: BenchState,
  aggs: readonly CellAgg[],
  evaluation: { gates: GateResult[]; overall_pass: boolean },
): void {
  const lines: string[] = [];
  lines.push('# P1 Robustness Bench v2 — strict R-D.1 replay (plan V1 static, 3 modes, n=6)');
  lines.push('');
  lines.push(`**Started** : ${state.started_at}`);
  if (state.finished_at) lines.push(`**Finished** : ${state.finished_at}`);
  lines.push(`**Model** : ${state.model}`);
  lines.push(`**Design** : ${state.design_version}`);
  lines.push(`**Runs** : ${state.runs.length} / ${state.total_runs_planned}`);
  lines.push(`**Seeds/cell** : ${state.seeds_per_cell}`);
  lines.push(`**Register** : ${state.register}`);
  lines.push('');
  lines.push('## Modes');
  lines.push('');
  lines.push('| Mode | Label |');
  lines.push('|------|-------|');
  for (const m of MODES) lines.push(`| ${m.id} | ${m.label} |`);
  lines.push('');
  lines.push('## Matrice cell_mean (mode × archétype)');
  lines.push('');
  lines.push('| Mode \\ Archetype | ACTION | INTERIOR | SENSORY | CATHEDRAL |');
  lines.push('|---|---|---|---|---|');
  for (const m of MODES) {
    const row: string[] = [`| ${m.id} |`];
    for (const a of ['ACTION', 'INTERIOR', 'SENSORY', 'CATHEDRAL'] as Archetype[]) {
      const cell = getCell(aggs, m.id, a);
      if (cell && cell.n_ok > 0) {
        row.push(
          ` ${cell.cell_mean.toFixed(3)} (σ=${cell.cell_std.toFixed(2)}, n=${cell.n_ok}/${cell.n_total}) |`,
        );
      } else {
        row.push(' — |');
      }
    }
    lines.push(row.join(''));
  }
  lines.push('');

  lines.push('## Détail cellules');
  lines.push('');
  lines.push('| Mode | Archetype | Scene | n | μ | med | σ | scores | dur_ms |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const c of aggs) {
    lines.push(
      `| ${c.mode} | ${c.archetype} | ${c.scene_id} | ${c.n_ok}/${c.n_total} | ${c.cell_mean.toFixed(3)} | ${c.cell_median.toFixed(3)} | ${c.cell_std.toFixed(3)} | ${c.scores.map((x) => x.toFixed(2)).join(', ')} | ${c.cell_mean_duration_ms.toFixed(0)} |`,
    );
  }
  lines.push('');

  lines.push('## Gates G1-G4 (seuils recalibrés vs R-D.1)');
  lines.push('');
  lines.push('| Gate | Value | Op | Threshold | Pass | Rationale |');
  lines.push('|---|---|---|---|---|---|');
  for (const g of evaluation.gates) {
    const passStr = g.pass ? '✓' : '✗';
    lines.push(
      `| ${g.gate} | ${g.value.toFixed(3)} | ${g.op} | ${g.threshold.toFixed(3)} | ${passStr} | ${g.rationale} |`,
    );
  }
  lines.push('');

  lines.push('## VERDICT GLOBAL');
  lines.push('');
  if (evaluation.overall_pass) {
    lines.push('**PASS** — P1 wiring empiriquement confirmé vs R-D.1 replay.');
    lines.push('');
    lines.push('Actions suivantes :');
    lines.push('- Archiver artefacts');
    lines.push('- Ouvrir P2 NCR_SCORER_STYLE_BIAS');
    lines.push('- Fermer NCR_BENCH_METHOD_DRIFT (FIX_VALIDATED)');
  } else {
    lines.push('**FAIL** — investigation requise.');
    lines.push('');
    lines.push('Gates échoués :');
    for (const g of evaluation.gates) {
      if (!g.pass) lines.push(`- ${g.gate} : ${g.value.toFixed(3)} ${g.op} ${g.threshold.toFixed(3)} — ${g.rationale}`);
    }
  }
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA P1 ROBUSTNESS BENCH v2 — strict R-D.1 replay');
  console.log('  (plan V1 static 4×750w, 3 modes, n=6 seeds/cell → 72 runs)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Model  : ${OLLAMA_MODEL}`);
  console.log(`  URL    : ${OLLAMA_URL}`);
  console.log(`  Seeds  : ${SEEDS_PER_CELL} per cell`);
  console.log(
    `  Runs   : ${MODES.length} × ${SCENES.length} × ${SEEDS_PER_CELL} = ${MODES.length * SCENES.length * SEEDS_PER_CELL}`,
  );
  console.log(`  Output : ${OUTPUT_PATH}`);
  console.log('');
  console.log('  Modes :');
  for (const m of MODES) console.log(`    ${m.id} — ${m.label}`);
  console.log('');

  const state = loadOrInit();
  const done = new Set<string>(state.runs.map(doneKey));
  let completed = state.runs.length;

  for (const mode of MODES) {
    for (const scene of SCENES) {
      for (let s = 0; s < SEEDS_PER_CELL; s++) {
        const key = `${mode.id}|${scene.id}|${s}`;
        if (done.has(key)) continue;
        const cellStart = Date.now();
        console.log(
          `  → [${completed + 1}/${state.total_runs_planned}] mode=${mode.id} arch=${scene.archetype} scene=${scene.id} seed=${s}`,
        );
        const run = await runCell(mode, scene, s);
        state.runs.push(run);
        completed++;
        saveState(state);
        const duration = ((Date.now() - cellStart) / 1000).toFixed(1);
        console.log(
          `      status=${run.status} score=${run.tier_score.toFixed(2)} chunks=${run.n_chunks} words=${run.total_words} dur=${duration}s`,
        );
      }
    }
  }

  state.finished_at = new Date().toISOString();
  saveState(state);

  const aggs = aggregateByCell(state.runs);
  const evaluation = evaluateGates(aggs);
  writeReport(state, aggs, evaluation);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  FINAL VERDICT : ${evaluation.overall_pass ? 'PASS' : 'FAIL'}`);
  console.log('═══════════════════════════════════════════════════════════════════════');
  for (const g of evaluation.gates) {
    const flag = g.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${flag}  ${g.gate.padEnd(40)} ${g.value.toFixed(3)} ${g.op} ${g.threshold.toFixed(3)}`);
  }
  console.log('');
  console.log(`  Report : ${REPORT_PATH}`);
  console.log(`  JSON   : ${OUTPUT_PATH}`);
  console.log('');
}

main().catch((err) => {
  console.error('[bench-p1-robustness-v2] FATAL:', err);
  process.exit(2);
});
