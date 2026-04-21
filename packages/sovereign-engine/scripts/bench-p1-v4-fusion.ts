/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA P1 ROBUSTNESS BENCH — V4 FUSION (PRIO1 ANTI_REPEAT × PRIO2 GATING EFFECT)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Design doc : /sessions/serene-happy-turing/mnt/OMEGA/outputs/BENCH_V4_FUSION_DESIGN_v1.md
 *
 * Objectif : produire SIMULTANÉMENT deux preuves différentielles :
 *   (PRIO 1) ANTI_REPEAT OFF vs ON → Δ timeouts ≥ 6 sur REPRO C1+C2 × M2
 *   (PRIO 2) M_prod_p1 vs M2_adaptive (ON only) → ΔI composite ≥ +0.5 sur REPRO
 *
 * Total : 42 runs séquentiels (§3.3 design scellé), ~2h30 GPU qwen3:32b.
 *
 * HÉRITAGE STRICT v3 (preuve T1/T2 bytes-equivalence cryptographique) :
 *   import { buildOllamaOptions, hashOptions, repeatPatternScore }
 *     depuis bench-p1-robustness-v3.js
 *   → garantit OFF V4 ≡ OFF v3 baseline (T1)
 *   → garantit ON V4  ≡ ON A.1 phase1 (T2)
 *
 * DIVERGENCE design §3.4 vs code v3 (DOCUMENTÉE) :
 *   Design propose : temperature=0.7, top_p=0.9, num_ctx=8192
 *   Code v3 utilise : temperature=0.8, top_p=0.92, num_predict=2048
 *   DÉCISION : import strict de v3.buildOllamaOptions pour préserver
 *              la tautologie T1/T2 (référence cryptographique unique).
 *              La divergence design n'est pas appliquée — elle invaliderait T1/T2.
 *
 * Modes V4 (sous-ensemble de v3) :
 *   M2_adaptive  → reproduction stricte R-D.1 M2 (3-arg sans archetype)
 *   M_prod_p1    → production post-7e89f95f (4-arg avec archetype gating)
 *
 * Conditions :
 *   OFF → buildOllamaOptions(seed, false) — bytes-equivalent v3 baseline
 *   ON  → buildOllamaOptions(seed, true)  — anti-repeat penalties P8-FIX
 *
 * Scènes (verbatim v3) :
 *   maison_enfance   → REPRO C1 (1/4 gated attendu pour M_prod_p1)
 *   veillee_funebre  → REPRO C2 (4/4 gated attendu pour M_prod_p1)
 *   meditation_aube  → CTRL C3 (4/4 silence — ancre stabilité)
 *
 * Séquence 42 runs (§3.3 hardcodée ex-ante, exportée pour tests) :
 *   01-12 : OFF/ON pair-matched M2_adaptive × maison_enfance × 6 seeds
 *   13-18 : ON M_prod_p1 × maison_enfance × 6 seeds
 *   19-30 : OFF/ON pair-matched M2_adaptive × veillee_funebre × 6 seeds
 *   31-36 : ON M_prod_p1 × veillee_funebre × 6 seeds
 *   37-39 : ON M2_adaptive × meditation_aube × 3 seeds
 *   40-42 : ON M_prod_p1  × meditation_aube × 3 seeds
 *
 * Invariants protégés (§2 design) :
 *   - V1-R-D.1-PROD SHADOW permanent (jamais activé)
 *   - FROZEN modules (gateway/sentinel, packages/genome) — pas touchés
 *   - Gate G1 = +3.0 CALC dispatcher V3.4 — pas remplacé
 *   - Contrat pickPacingDirective(archetype, chunkIdx, totalChunks, config) 4-arg
 *   - Déterminisme seed+hash — strictement préservé
 *   - OMEGA_V1_SEAL_CERTIFICATE.md — pas modifié
 *
 * Usage :
 *   cd packages/sovereign-engine
 *   $env:OMEGA_OLLAMA_MODEL="qwen3:32b"
 *   npx tsx scripts/bench-p1-v4-fusion.ts
 *
 * Env vars :
 *   OMEGA_OLLAMA_URL         (default: http://localhost:11434)
 *   OMEGA_OLLAMA_MODEL       (default: qwen3:32b)
 *   OMEGA_P1V4_OUTPUT        (default: ./bench-p1-v4-fusion-results.json)
 *   OMEGA_P1V4_RESUME        (default: 0 — si 1, reprend depuis OUTPUT)
 *   OMEGA_P1V4_TIMEOUT_MS    (default: 600000)
 *
 * Output :
 *   - bench-p1-v4-fusion-results.json (incremental persist après chaque run)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// ─── HÉRITAGE STRICT v3 (preuve T1/T2 bytes-equivalence) ─────────────────────
import {
  buildOllamaOptions,
  hashOptions,
  repeatPatternScore,
} from './bench-p1-robustness-v3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const OLLAMA_URL = process.env.OMEGA_OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OMEGA_OLLAMA_MODEL ?? 'qwen3:32b';
const DEFAULT_OUTPUT_PATH = path.resolve(
  __dirname,
  '../bench-p1-v4-fusion-results.json',
);
const OUTPUT_PATH = process.env.OMEGA_P1V4_OUTPUT ?? DEFAULT_OUTPUT_PATH;
const RESUME = process.env.OMEGA_P1V4_RESUME === '1';
const CALL_TIMEOUT_MS = Number(process.env.OMEGA_P1V4_TIMEOUT_MS) || 600_000;
const MIN_PROSE_LENGTH = 200;

const REGISTER: PacingRegister = 'litteraire';

// V2-B.2 config — VERBATIM v3 / R-D.1
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

const LITTERAIRE_BASELINE_DIRECTIVE =
  'rythme équilibré, alternance mesurée, respiration classique';

// ──────────────────────────────────────────────────────────────────────────────
// MODES V4 (sous-ensemble v3 : 2 modes uniquement)
// ──────────────────────────────────────────────────────────────────────────────

export type ModeV4Id = 'M2_adaptive' | 'M_prod_p1';

interface ModeV4Spec {
  readonly id: ModeV4Id;
  readonly label: string;
}

export const MODES_V4: readonly ModeV4Spec[] = [
  { id: 'M2_adaptive', label: 'adaptive 3-arg sans gating (replay R-D.1 M2)' },
  { id: 'M_prod_p1', label: 'production P1 — pickPacingDirective 4-arg avec archetype' },
];

// ──────────────────────────────────────────────────────────────────────────────
// SCÈNES V4 (3 scènes — sous-ensemble verbatim v3)
// ──────────────────────────────────────────────────────────────────────────────

interface BenchSceneV4 {
  readonly id: string;
  readonly lang: 'fr' | 'en';
  readonly archetype: Archetype;
  readonly brief: string;
  readonly signature_words: readonly string[];
  readonly contract: EmotionContract;
  readonly role: 'REPRO' | 'CTRL';
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

export const SCENES_V4: readonly BenchSceneV4[] = [
  // ─── REPRO C1 : verbatim v3 ───
  {
    id: 'fr_interior_maison_enfance',
    lang: 'fr',
    archetype: 'INTERIOR',
    role: 'REPRO',
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
  // ─── REPRO C2 : verbatim v3 (engineered 4/4 gated INTERIOR) ───
  {
    id: 'fr_interior_veillee_funebre',
    lang: 'fr',
    archetype: 'INTERIOR',
    role: 'REPRO',
    brief: `Une femme veille le corps de son père dans la chambre du fond. Les voisins sont partis. Il reste la bougie, le drap blanc, et le grain du bois sur la table de nuit. Troisième personne, focalisation interne, passé simple/imparfait. Émotion cible : deuil silencieux qui s'installe — la perte se dit par les matières, pas par les pensées.`,
    signature_words: ['cire', 'drap', 'grain', 'bougie', 'main', 'souffle', 'ombre'],
    contract: makeContract(
      [0.25, 0.2, 0.3, 0.15],
      [-0.4, -0.5, -0.6, -0.7],
      0.0,
      0.0,
      [
        { start_pct: 0.0, end_pct: 0.3 },
        { start_pct: 0.8, end_pct: 1.0 },
      ],
      'darkening',
    ),
  },
  // ─── CTRL C3 : verbatim v3 (engineered 4/4 silence — ancre stabilité) ───
  {
    id: 'fr_interior_meditation_aube',
    lang: 'fr',
    archetype: 'INTERIOR',
    role: 'CTRL',
    brief: `Une femme s'est levée avant l'aube. Elle est assise sur le bord du lit et regarde la pièce émerger de l'obscurité. Aucune action, aucun dialogue. Une heure. Le jour se lève. Troisième personne, focalisation interne, passé simple/imparfait. Émotion cible : présence pure, attention sans objet.`,
    signature_words: ['aube', 'drap', 'mur', 'souffle', 'bord', 'gris', 'lumière'],
    contract: makeContract(
      [0.15, 0.15, 0.2, 0.15],
      [-0.1, 0.0, 0.1, 0.2],
      0.0,
      0.0,
      [{ start_pct: 0.0, end_pct: 1.0 }],
      'brightening',
    ),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// V4 SEQUENCE — 42 runs hardcodés ex-ante (§3.3 design)
// ──────────────────────────────────────────────────────────────────────────────

export interface V4RunSpec {
  readonly index: number;            // 1..42
  readonly condition: 'OFF' | 'ON';
  readonly mode: ModeV4Id;
  readonly scene: string;
  readonly seed: number;
  readonly role: 'REPRO' | 'CTRL';
}

const SEEDS_REPRO = [42, 123, 456, 789, 1024, 2048] as const;
const SEEDS_CTRL = [42, 123, 456] as const;

/**
 * V4_SEQUENCE — séquence verbatim §3.3 design, scellée ex-ante.
 * Indices 1-42 ordonnés bloc par bloc (§3.3 colonnes Index/Condition/Mode/Scene/Seed/Rôle).
 */
export const V4_SEQUENCE: readonly V4RunSpec[] = (() => {
  const seq: V4RunSpec[] = [];
  let idx = 1;

  // ─── Bloc 01-12 : REPRO C1 maison_enfance × M2_adaptive × OFF/ON pair-matched ───
  for (const seed of SEEDS_REPRO) {
    seq.push({
      index: idx++,
      condition: 'OFF',
      mode: 'M2_adaptive',
      scene: 'fr_interior_maison_enfance',
      seed,
      role: 'REPRO',
    });
    seq.push({
      index: idx++,
      condition: 'ON',
      mode: 'M2_adaptive',
      scene: 'fr_interior_maison_enfance',
      seed,
      role: 'REPRO',
    });
  }

  // ─── Bloc 13-18 : REPRO C1 maison_enfance × M_prod_p1 × ON only ───
  for (const seed of SEEDS_REPRO) {
    seq.push({
      index: idx++,
      condition: 'ON',
      mode: 'M_prod_p1',
      scene: 'fr_interior_maison_enfance',
      seed,
      role: 'REPRO',
    });
  }

  // ─── Bloc 19-30 : REPRO C2 veillee_funebre × M2_adaptive × OFF/ON pair-matched ───
  for (const seed of SEEDS_REPRO) {
    seq.push({
      index: idx++,
      condition: 'OFF',
      mode: 'M2_adaptive',
      scene: 'fr_interior_veillee_funebre',
      seed,
      role: 'REPRO',
    });
    seq.push({
      index: idx++,
      condition: 'ON',
      mode: 'M2_adaptive',
      scene: 'fr_interior_veillee_funebre',
      seed,
      role: 'REPRO',
    });
  }

  // ─── Bloc 31-36 : REPRO C2 veillee_funebre × M_prod_p1 × ON only ───
  for (const seed of SEEDS_REPRO) {
    seq.push({
      index: idx++,
      condition: 'ON',
      mode: 'M_prod_p1',
      scene: 'fr_interior_veillee_funebre',
      seed,
      role: 'REPRO',
    });
  }

  // ─── Bloc 37-39 : CTRL C3 meditation_aube × M2_adaptive × ON only × 3 seeds ───
  for (const seed of SEEDS_CTRL) {
    seq.push({
      index: idx++,
      condition: 'ON',
      mode: 'M2_adaptive',
      scene: 'fr_interior_meditation_aube',
      seed,
      role: 'CTRL',
    });
  }

  // ─── Bloc 40-42 : CTRL C3 meditation_aube × M_prod_p1 × ON only × 3 seeds ───
  for (const seed of SEEDS_CTRL) {
    seq.push({
      index: idx++,
      condition: 'ON',
      mode: 'M_prod_p1',
      scene: 'fr_interior_meditation_aube',
      seed,
      role: 'CTRL',
    });
  }

  return seq;
})();

// ──────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — VERBATIM v3 / R-D.1
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

const LEGACY_CHUNK_WORDS = 750;

// ──────────────────────────────────────────────────────────────────────────────
// DIRECTIVE RESOLVER (2 modes uniquement — sous-ensemble verbatim v3)
// ──────────────────────────────────────────────────────────────────────────────

function pseudoState(contract: EmotionContract, chunkIdx: number): PacingState {
  const pseudoPlan = planAdaptiveChunkingV2B2(contract, V2B2_CONFIG);
  if (pseudoPlan.length === 0) return 'baseline';
  return pseudoPlan[chunkIdx % pseudoPlan.length].pacing_state;
}

interface DirectiveResolution {
  readonly directive: string;
  readonly effective_state: PacingState;
  readonly gated: boolean;
  readonly archetype: Archetype | null;
}

function resolveDirective(
  mode: ModeV4Id,
  scene: BenchSceneV4,
  chunkIdx: number,
): DirectiveResolution {
  const state = pseudoState(scene.contract, chunkIdx);

  if (mode === 'M2_adaptive') {
    // Reproduction stricte v3 M2 : appel 3-arg SANS archetype (pas de gating)
    const directive = pickPacingDirective(REGISTER, state, 'adaptive');
    return {
      directive,
      effective_state: state,
      gated: false,
      archetype: null,
    };
  }

  // M_prod_p1 — appel PROD avec archetype détecté (4-arg post-7e89f95f)
  const archetype = detectArchetype(scene.contract);
  const directive = pickPacingDirective(REGISTER, state, undefined, archetype);
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
// PROMPT BUILDER — plan V1 static 4×750w (VERBATIM v3 / R-D.1)
// ──────────────────────────────────────────────────────────────────────────────

function buildStaticChunkPrompt(
  scene: BenchSceneV4,
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
// OLLAMA CALL — pattern v3 enrichi avec antiRepeat explicit param V4
// ──────────────────────────────────────────────────────────────────────────────

let CACHED_OLLAMA_VERSION: string | null | undefined;
function getOllamaVersion(): string | null {
  if (CACHED_OLLAMA_VERSION !== undefined) return CACHED_OLLAMA_VERSION;
  try {
    const script = `
      const http = require('http');
      const url = new URL(process.argv[1] + '/api/version');
      const req = http.request({
        hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET',
      }, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => process.stdout.write(data));
      });
      req.on('error', () => process.exit(1));
      req.setTimeout(3000, () => { req.destroy(); process.exit(1); });
      req.end();
    `.replace(/\n/g, ' ');
    const nodeBin = JSON.stringify(process.execPath);
    const urlArg = JSON.stringify(OLLAMA_URL);
    const raw = execSync(`${nodeBin} -e "${script.replace(/"/g, '\\"')}" ${urlArg}`, {
      encoding: 'utf8',
      timeout: 4000,
      maxBuffer: 64 * 1024,
    });
    const parsed = JSON.parse(raw.trim()) as { version?: unknown };
    CACHED_OLLAMA_VERSION = typeof parsed.version === 'string' ? parsed.version : null;
  } catch (_e) {
    CACHED_OLLAMA_VERSION = null;
  }
  return CACHED_OLLAMA_VERSION;
}

type FinishMode = 'ok' | 'timeout' | 'http_error' | 'exec_error' | 'parse_error';

interface OllamaCallResult {
  readonly content: string;
  readonly finish_mode: FinishMode;
  readonly duration_ms: number;
  readonly chars_out: number;
  readonly has_closing_prose_tag: boolean;
  readonly stderr_excerpt: string;
  readonly exit_code: number;
  readonly options_hash: string;
}

/**
 * Wrapper Ollama avec antiRepeat explicit param (V4 différentiel).
 * Pattern v3 verbatim (script enfant POST /api/chat via execSync) — seul
 * changement : options = buildOllamaOptions(seed, antiRepeat) au lieu de
 * lecture de l'env var module-level ANTI_REPEAT.
 */
function callOllamaV4(
  systemPrompt: string,
  userPrompt: string,
  seed: number,
  antiRepeat: boolean,
): OllamaCallResult {
  const isQwen = OLLAMA_MODEL.toLowerCase().includes('qwen');
  const options = buildOllamaOptions(seed, antiRepeat);
  const options_hash = hashOptions(options);
  const requestBody = JSON.stringify({
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    ...(isQwen ? { think: false } : {}),
    options,
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
  const nodeBin = JSON.stringify(process.execPath);
  const startMs = Date.now();
  let raw = '';
  let stderrBuf = '';
  let finish_mode: FinishMode = 'ok';
  let exit_code = 0;
  try {
    raw = execSync(`${nodeBin} -e "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: CALL_TIMEOUT_MS,
      maxBuffer: 20 * 1024 * 1024,
      input: stdinPayload,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    const e = err as {
      status?: number | null;
      signal?: string | null;
      code?: string;
      stderr?: Buffer | string;
      stdout?: Buffer | string;
      message?: string;
    };
    const errStderr = e.stderr
      ? (typeof e.stderr === 'string' ? e.stderr : e.stderr.toString('utf8'))
      : '';
    const errStdout = e.stdout
      ? (typeof e.stdout === 'string' ? e.stdout : e.stdout.toString('utf8'))
      : '';
    stderrBuf = errStderr;
    raw = errStdout;
    exit_code = typeof e.status === 'number' ? e.status : -1;
    if (e.code === 'ETIMEDOUT' || e.signal === 'SIGTERM') {
      finish_mode = 'timeout';
    } else if (/Ollama error/i.test(errStderr)) {
      finish_mode = 'http_error';
    } else {
      finish_mode = 'exec_error';
    }
  }
  const duration_ms = Date.now() - startMs;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const has_closing_prose_tag = /<\/prose>/.test(cleaned);
  const stderr_excerpt = stderrBuf
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, 200);
  return {
    content: cleaned,
    finish_mode,
    duration_ms,
    chars_out: cleaned.length,
    has_closing_prose_tag,
    stderr_excerpt,
    exit_code,
    options_hash,
  };
}

function extractProse(raw: string): string {
  const m = raw.match(/<prose>([\s\S]*?)<\/prose>/);
  if (m) return m[1].trim();
  return raw.trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// SCORING Ridge V3.4 (VERBATIM v3 / R-D.1)
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
// UTILITAIRES (VERBATIM v3 / R-D.1)
// ──────────────────────────────────────────────────────────────────────────────

function hashSeed(
  mode: ModeV4Id,
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

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────────
// RUNNER V4 — instrumentation 15 champs §5
// ──────────────────────────────────────────────────────────────────────────────

interface ChunkTraceV4 {
  readonly chunk_index: number;
  readonly pacing_state: PacingState;
  readonly archetype: Archetype | null;
  readonly directive: string;
  readonly directive_sha256: string;
  readonly gated: boolean;
  readonly words: number;
}

interface ChunkCallMetaV4 {
  readonly chunk_index: number;
  readonly finish_mode: FinishMode;
  readonly duration_ms: number;
  readonly chars_out: number;
  readonly has_closing_prose_tag: boolean;
  readonly stderr_excerpt: string;
  readonly exit_code: number;
  readonly options_hash: string;
}

/**
 * BenchRunV4 — 15 champs instrumentation §5 design + 5 champs persistence.
 * Champs §5 : run_id, index, condition, mode, scene, seed, finish_mode,
 *             elapsed_ms, options_hash, anti_repeat_enabled,
 *             repeat_pattern_score, has_closing_prose_tag, prompt_hash,
 *             output_hash, composite_score
 */
export interface BenchRunV4 {
  // ─── §5 instrumentation 15 champs ───
  readonly run_id: string;
  readonly index: number;
  readonly condition: 'OFF' | 'ON';
  readonly mode: ModeV4Id;
  readonly scene: string;
  readonly seed: number;
  readonly finish_mode: FinishMode;
  readonly elapsed_ms: number;
  readonly options_hash: string;
  readonly anti_repeat_enabled: boolean;
  readonly repeat_pattern_score: number;
  readonly has_closing_prose_tag: boolean;
  readonly prompt_hash: string;
  readonly output_hash: string;
  readonly composite_score: number;
  // ─── persistence + traçabilité ───
  readonly role: 'REPRO' | 'CTRL';
  readonly archetype_declared: Archetype;
  readonly archetype_detected: Archetype;
  readonly lang: 'fr' | 'en';
  readonly n_chunks: number;
  readonly total_words: number;
  readonly ollama_calls: number;
  readonly status: 'ok' | 'skipped' | 'error';
  readonly error?: string;
  readonly prose_excerpt?: string;
  readonly features_raw?: Record<string, number>;
  readonly chunk_trace?: readonly ChunkTraceV4[];
  readonly chunk_calls?: readonly ChunkCallMetaV4[];
  readonly model_name: string;
  readonly ollama_version: string | null;
}

function buildRunId(spec: V4RunSpec): string {
  const idxPad = String(spec.index).padStart(2, '0');
  const sceneShort = spec.scene.replace(/^fr_interior_/, '').replace(/^fr_/, '');
  return `${idxPad}_${sceneShort}_${spec.mode}_${spec.condition}_s${spec.seed}`;
}

async function runCellV4(spec: V4RunSpec): Promise<BenchRunV4> {
  const startMs = Date.now();
  const run_id = buildRunId(spec);
  const scene = SCENES_V4.find((s) => s.id === spec.scene);
  if (!scene) {
    throw new Error(`scene_not_found: ${spec.scene}`);
  }
  const modeSpec = MODES_V4.find((m) => m.id === spec.mode);
  if (!modeSpec) {
    throw new Error(`mode_not_found: ${spec.mode}`);
  }

  const antiRepeat = spec.condition === 'ON';
  const ollama_version = getOllamaVersion();
  const archetype_detected = detectArchetype(scene.contract);

  const chunksProse: string[] = [];
  const trace: ChunkTraceV4[] = [];
  const chunkCalls: ChunkCallMetaV4[] = [];
  const promptParts: string[] = [];
  let fullProse = '';
  let totalChunks = 0;
  let aggFinishMode: FinishMode = 'ok';
  let lastOptionsHash = '';

  try {
    const plans = buildStaticPlan(V2B2_CONFIG);
    totalChunks = plans.length;

    for (let i = 0; i < plans.length; i++) {
      const last_tail =
        i === 0 ? null : fullProse.split(/\s+/).slice(-80).join(' ').trim() || null;

      const resolved = resolveDirective(spec.mode, scene, i);
      const prompt = buildStaticChunkPrompt(
        scene,
        i,
        totalChunks,
        last_tail,
        resolved.directive,
      );
      promptParts.push(prompt);

      const seed = hashSeed(spec.mode, scene.id, i, spec.seed);
      const call = callOllamaV4(SYSTEM_PROMPT, prompt, seed, antiRepeat);
      lastOptionsHash = call.options_hash;
      chunkCalls.push({
        chunk_index: i,
        finish_mode: call.finish_mode,
        duration_ms: call.duration_ms,
        chars_out: call.chars_out,
        has_closing_prose_tag: call.has_closing_prose_tag,
        stderr_excerpt: call.stderr_excerpt,
        exit_code: call.exit_code,
        options_hash: call.options_hash,
      });
      if (call.finish_mode !== 'ok') {
        aggFinishMode = call.finish_mode;
        throw new Error(
          `ollama_call_failed: finish_mode=${call.finish_mode} chunk=${i} exit=${call.exit_code} stderr="${call.stderr_excerpt}"`,
        );
      }
      const prose = extractProse(call.content);
      chunksProse.push(prose);
      fullProse = (fullProse + '\n\n' + prose).trim();
      trace.push({
        chunk_index: i,
        pacing_state: resolved.effective_state,
        archetype: resolved.archetype,
        directive: resolved.directive,
        directive_sha256: sha256(resolved.directive),
        gated: resolved.gated,
        words: wordCount(prose),
      });
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const elapsed_ms = Date.now() - startMs;
    const lastChunkOk = chunkCalls.find((c) => c.has_closing_prose_tag) !== undefined;
    return {
      run_id,
      index: spec.index,
      condition: spec.condition,
      mode: spec.mode,
      scene: spec.scene,
      seed: spec.seed,
      finish_mode: aggFinishMode !== 'ok' ? aggFinishMode : 'exec_error',
      elapsed_ms,
      options_hash: lastOptionsHash || hashOptions(buildOllamaOptions(0, antiRepeat)),
      anti_repeat_enabled: antiRepeat,
      repeat_pattern_score: fullProse.length > 0 ? repeatPatternScore(fullProse) : 0,
      has_closing_prose_tag: lastChunkOk,
      prompt_hash: sha256(promptParts.join('\n---\n')),
      output_hash: sha256(fullProse),
      composite_score: 0,
      role: scene.role,
      archetype_declared: scene.archetype,
      archetype_detected,
      lang: scene.lang,
      n_chunks: totalChunks,
      total_words: wordCount(fullProse),
      ollama_calls: chunksProse.length,
      status: 'error',
      error: errMsg,
      chunk_trace: trace,
      chunk_calls: chunkCalls,
      model_name: OLLAMA_MODEL,
      ollama_version,
    };
  }

  const elapsed_ms = Date.now() - startMs;
  const score = scoreProse(fullProse, scene.lang);
  const composite = score.status === 'ok' ? score.tier_score : 0;

  return {
    run_id,
    index: spec.index,
    condition: spec.condition,
    mode: spec.mode,
    scene: spec.scene,
    seed: spec.seed,
    finish_mode: 'ok',
    elapsed_ms,
    options_hash: lastOptionsHash,
    anti_repeat_enabled: antiRepeat,
    repeat_pattern_score: repeatPatternScore(fullProse),
    has_closing_prose_tag: chunkCalls.every((c) => c.has_closing_prose_tag),
    prompt_hash: sha256(promptParts.join('\n---\n')),
    output_hash: sha256(fullProse),
    composite_score: composite,
    role: scene.role,
    archetype_declared: scene.archetype,
    archetype_detected,
    lang: scene.lang,
    n_chunks: totalChunks,
    total_words: wordCount(fullProse),
    ollama_calls: chunksProse.length,
    status: score.status === 'ok' ? 'ok' : 'skipped',
    error: score.skip_reason,
    prose_excerpt: fullProse.slice(0, 400),
    features_raw: score.features_raw,
    chunk_trace: trace,
    chunk_calls: chunkCalls,
    model_name: OLLAMA_MODEL,
    ollama_version,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// STATE / PERSISTENCE
// ──────────────────────────────────────────────────────────────────────────────

interface BenchStateV4 {
  readonly started_at: string;
  readonly model: string;
  readonly register: PacingRegister;
  readonly v2b2_config: AdaptiveChunkConfig;
  readonly total_runs_planned: number;
  readonly design_version: string;
  readonly sequence: readonly V4RunSpec[];
  readonly runs: BenchRunV4[];
}

function loadOrInit(): BenchStateV4 {
  if (RESUME && fs.existsSync(OUTPUT_PATH)) {
    try {
      const raw = fs.readFileSync(OUTPUT_PATH, 'utf8');
      const parsed = JSON.parse(raw) as BenchStateV4;
      console.log(`[V4] resumed from ${OUTPUT_PATH} (${parsed.runs.length} runs done)`);
      return parsed;
    } catch (e) {
      console.warn(`[V4] resume failed: ${e instanceof Error ? e.message : String(e)}, init fresh`);
    }
  }
  return {
    started_at: new Date().toISOString(),
    model: OLLAMA_MODEL,
    register: REGISTER,
    v2b2_config: V2B2_CONFIG,
    total_runs_planned: V4_SEQUENCE.length,
    design_version: 'v4_fusion_42_runs_anti_repeat_x_gating',
    sequence: V4_SEQUENCE,
    runs: [],
  };
}

function saveState(state: BenchStateV4): void {
  const tmp = `${OUTPUT_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, OUTPUT_PATH);
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function mainV4(): Promise<void> {
  console.log('[V4] starting bench-p1-v4-fusion');
  console.log(`[V4] model=${OLLAMA_MODEL} url=${OLLAMA_URL}`);
  console.log(`[V4] output=${OUTPUT_PATH}`);
  console.log(`[V4] sequence=${V4_SEQUENCE.length} runs (resume=${RESUME})`);

  const state = loadOrInit();
  const doneIndices = new Set(state.runs.map((r) => r.index));

  for (const spec of V4_SEQUENCE) {
    if (doneIndices.has(spec.index)) {
      console.log(`[V4] skip ${spec.index}/${V4_SEQUENCE.length} (already done)`);
      continue;
    }
    const tag = `${String(spec.index).padStart(2, '0')}/${V4_SEQUENCE.length}`;
    console.log(
      `[V4] ${tag} run cond=${spec.condition} mode=${spec.mode} scene=${spec.scene} seed=${spec.seed}`,
    );
    const t0 = Date.now();
    const run = await runCellV4(spec);
    const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[V4] ${tag} done status=${run.status} finish=${run.finish_mode} score=${run.composite_score.toFixed(3)} rps=${run.repeat_pattern_score.toFixed(3)} ${elapsedSec}s`,
    );
    state.runs.push(run);
    saveState(state);
  }

  console.log(`[V4] complete — ${state.runs.length} runs persisted to ${OUTPUT_PATH}`);
}

// Gated par import.meta.url pour que main NE tourne PAS lors d'imports tests
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  mainV4().catch((e) => {
    console.error(`[V4] FATAL: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
