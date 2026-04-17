/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NCR_DIRECTIVE_BLOAT — BENCH ABLATION DIRECTIVE (P1)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Objectif : isoler CAUSALEMENT l'effet de la directive de silence (et plus
 * généralement des directives adaptatives) sur la régression INTERIOR/CATHEDRAL
 * observée dans les benches V2-B.2 et V2-C.
 *
 * Hypothèse (NCR_DIRECTIVE_BLOAT §Plan 6) : la directive
 *   "prose ralentie, pauses ostensibles, syntaxe qui se raréfie, vide tangible..."
 * injectée par `pickPacingDirective('litteraire', 'silence')` sur-contraint
 * le LLM vers un registre minimaliste incompatible avec l'amplitude prosodique
 * attendue sur INTERIOR (volutes, feuilletage subordonné) et CATHEDRAL
 * (épiphanie silencieuse). Effet indépendant de la modulation word_target.
 *
 * Design factoriel 2×2 (plan × directive) :
 *
 *   ┌─────────────┬───────────────────────┬───────────────────────┐
 *   │             │ directives baseline   │ directives adaptives  │
 *   ├─────────────┼───────────────────────┼───────────────────────┤
 *   │ V1 static   │ A — contrôle pur V1   │ B — V1 + directives   │
 *   │ V2-B.2      │ C — V2-B.2 sans dir   │ D — V2-B.2 full       │
 *   └─────────────┴───────────────────────┴───────────────────────┘
 *
 * Deltas causaux :
 *   - Δ(A vs B) = effet directive seule (sur plan static V1)
 *   - Δ(C vs D) = effet directive en contexte word_target modulé
 *   - Δ(A vs C) = effet word_target seul (sur directives baseline)
 *   - Δ(B vs D) = effet word_target en contexte directives adaptives
 *
 * Décision (NCR_DIRECTIVE_BLOAT §Plan 6.2) :
 *   - |Δ(A vs B)| ≥ 1.0 → directive_bloat CONFIRMÉ
 *       → chemin critique : redesign pacing_directive ou désactivation
 *         conditionnelle pour pacing_state='silence'
 *   - |Δ(A vs B)| < 0.5  → directive_bloat REJETÉ
 *       → cause résiduelle ailleurs (seam tokenization, variance LLM,
 *         biais scoring scène-dépendant NCR_ACTION_BIAS)
 *   - 0.5 ≤ |Δ(A vs B)| < 1.0 → INCONCLUSIF (runs supplémentaires requis)
 *
 * Scope réduit : 2 scènes (INTERIOR + CATHEDRAL uniquement — scènes où la
 * régression est documentée). ACTION/SENSORY exclues (tracking séparé
 * via NCR_ACTION_BIAS). Total : 4 variants × 2 scènes × 3 seeds = 24 runs.
 *
 * Usage :
 *   cd packages/sovereign-engine
 *   $env:OMEGA_OLLAMA_MODEL="qwen3:32b"
 *   npx tsx scripts/bench-ablation-directive.ts
 *
 * Env vars :
 *   OMEGA_OLLAMA_URL                (default: http://localhost:11434)
 *   OMEGA_OLLAMA_MODEL              (default: qwen3:32b)
 *   OMEGA_BENCH_ABLATION_OUTPUT     (default: ./bench-ablation-directive-results.json)
 *   OMEGA_BENCH_ABLATION_RESUME     (default: 0 — reprend depuis OUTPUT si 1)
 *   OMEGA_BENCH_ABLATION_SEEDS      (default: 3)
 *   OMEGA_BENCH_ABLATION_TIMEOUT_MS (default: 600000)
 *
 * Invariants :
 *   - Scoring CALC V3.4 scellé (même dispatcher que bench-ab-v1-v2b).
 *   - SYSTEM_PROMPT identique à bench-ab-v1-v2b (cohérence cross-bench).
 *   - EmotionContract des scènes INTERIOR/CATHEDRAL identique à bench V2-C.
 *   - Seeds déterministes : hash(variant, scene_id, chunk_idx, seed_idx).
 *   - Le script NE MODIFIE PAS process.env durablement (scoped mutation).
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
  type AdaptiveChunkConfig,
  type ChunkPlan,
  type PacingRegister,
  type DirectiveMode,
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
  '../bench-ablation-directive-results.json',
);
const OUTPUT_PATH = process.env.OMEGA_BENCH_ABLATION_OUTPUT ?? DEFAULT_OUTPUT_PATH;
const REPORT_PATH = OUTPUT_PATH.replace(/\.json$/, '-report.md');
const RESUME = process.env.OMEGA_BENCH_ABLATION_RESUME === '1';
const SEEDS_PER_CELL = Math.max(1, Number(process.env.OMEGA_BENCH_ABLATION_SEEDS) || 3);
const CALL_TIMEOUT_MS = Number(process.env.OMEGA_BENCH_ABLATION_TIMEOUT_MS) || 600_000;
const MIN_PROSE_LENGTH = 200;

const REGISTER: PacingRegister = 'litteraire';

// V2-B.2 config (identique à bench-ab-v1-v2b top3)
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

// V1 LEGACY : 4 chunks × 750w (pas de plan adaptatif)
const LEGACY_CHUNK_COUNT = 4;
const LEGACY_CHUNK_WORDS = 750;

// ──────────────────────────────────────────────────────────────────────────────
// VARIANTS (factoriel plan × directive)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Design factoriel 2×2 :
 *   A = V1 static + directives baseline   (contrôle pur — ref)
 *   B = V1 static + directives adaptives  (isole effet directives)
 *   C = V2-B.2    + directives baseline   (isole effet word_target)
 *   D = V2-B.2    + directives adaptives  (combiné — réplique V2-B.2 full)
 *
 * Note : "directives adaptives" signifie que pickPacingDirective utilise
 * la table complète (20 entrées), donc la directive 'silence' est active
 * sur les quartiles où pacing_state='silence' (INTERIOR + CATHEDRAL).
 * "directives baseline" force pickPacingDirective à toujours retourner
 * REGISTER_TABLE[register]['baseline'] via OMEGA_DIRECTIVE_MODE=baseline.
 */
type Variant = 'A_v1_baseline' | 'B_v1_adaptive' | 'C_v2b2_baseline' | 'D_v2b2_adaptive';

interface VariantSpec {
  readonly id: Variant;
  readonly plan: 'v1_static' | 'v2b2';
  readonly directive_mode: DirectiveMode;
  readonly label: string;
}

const VARIANTS: readonly VariantSpec[] = [
  {
    id: 'A_v1_baseline',
    plan: 'v1_static',
    directive_mode: 'baseline',
    label: 'V1 static + baseline directives (contrôle pur)',
  },
  {
    id: 'B_v1_adaptive',
    plan: 'v1_static',
    directive_mode: 'adaptive',
    label: 'V1 static + adaptive directives (isole directives)',
  },
  {
    id: 'C_v2b2_baseline',
    plan: 'v2b2',
    directive_mode: 'baseline',
    label: 'V2-B.2 + baseline directives (isole word_target)',
  },
  {
    id: 'D_v2b2_adaptive',
    plan: 'v2b2',
    directive_mode: 'adaptive',
    label: 'V2-B.2 + adaptive directives (combiné)',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// SCÈNES — INTERIOR + CATHEDRAL uniquement (scope NCR_DIRECTIVE_BLOAT)
// ──────────────────────────────────────────────────────────────────────────────

interface BenchScene {
  readonly id: string;
  readonly lang: 'fr' | 'en';
  readonly archetype: 'INTERIOR' | 'CATHEDRAL';
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

// Scènes IDENTIQUES à bench-ab-v1-v2b (cohérence cross-bench requise
// pour comparer directement les scores V2-B.2 / V2-C / ablation)
const SCENES: readonly BenchScene[] = [
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
// SYSTEM PROMPT — strictement identique à bench-ab-v1-v2b
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
// PROMPT BUILDERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Prompt chunk V1 static (tous variants A/C utilisent ce path).
 * Inject la directive pacing_state='baseline' avec le mode demandé.
 */
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

/**
 * Prompt chunk adaptatif V2-B.2 (variants B/D).
 * La directive du plan est SUBSTITUÉE selon le mode demandé (adaptive vs baseline).
 * plan.pacing_directive a été calculée par pickPacingDirective(register, state, mode)
 * — on peut donc l'utiliser directement telle quelle.
 */
function buildAdaptiveChunkPrompt(
  scene: BenchScene,
  plan: ChunkPlan,
  totalChunks: number,
  lastTail: string | null,
): string {
  const position = `chunk ${plan.index + 1}/${totalChunks}`;
  const sigLine =
    plan.index === 0 && scene.signature_words.length > 0
      ? `\nMots à tisser naturellement dans la prose : ${scene.signature_words.slice(0, 7).join(', ')}.`
      : '';
  const pacing = `Pacing : ${plan.pacing_directive}.`;
  const target = `Longueur cible : ${plan.word_target} mots (±10 %).`;

  if (plan.index === 0) {
    return `Tu écris le DÉBUT d'une scène littéraire (${position}).\n\nSITUATION :\n${scene.brief}\n${sigLine}\n\n${pacing}\n${target}\n\nPas de préambule. Retourne UNIQUEMENT la prose, entre les balises <prose> et </prose>.`;
  }
  const isLast = plan.index === totalChunks - 1;
  const header = isLast
    ? `Tu TERMINES cette scène littéraire (${position}).`
    : `Tu CONTINUES cette scène littéraire (${position}).`;
  const pivotHint = plan.is_pivot
    ? "\n\nCE CHUNK EST UN PIVOT NARRATIF : c'est ici que quelque chose bascule. Densité maximale, économie verbale, une phrase qui tranche."
    : '';
  return `${header}\n\nSITUATION GÉNÉRALE :\n${scene.brief}${pivotHint}\n\nDERNIERS MOTS DU CHUNK PRÉCÉDENT (continuer naturellement) :\n"${lastTail ?? ''}"\n\n${pacing}\n${target}\n\nRetourne UNIQUEMENT la prose, entre les balises <prose> et </prose>.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// OLLAMA CALL (pattern bench-ab-v1-v2b)
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
// SCORING Ridge V3.4 (identique bench-ab-v1-v2b)
// ──────────────────────────────────────────────────────────────────────────────

interface CalcScore {
  readonly tier_score: number;
  readonly route: string;
  readonly status: 'ok' | 'skipped';
  readonly skip_reason?: string;
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
  return { tier_score: score, route: lang.toUpperCase(), status: 'ok' };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

// ──────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ──────────────────────────────────────────────────────────────────────────────

function hashSeed(
  variant: Variant,
  scene_id: string,
  chunk_index: number,
  seed_idx: number,
): number {
  let h = 2166136261;
  const s = `${variant}|${scene_id}|${chunk_index}|${seed_idx}`;
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
// PLAN BUILDER (applique le mode directive)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Construit le plan de chunking pour un variant donné.
 * Applique le mode directive en le passant explicitement à pickPacingDirective
 * via un post-processing du plan (pour ne pas muter process.env de façon
 * non-scoped — évite le leak inter-run en cas d'exception).
 */
function buildPlan(variant: VariantSpec, contract: EmotionContract): readonly ChunkPlan[] {
  if (variant.plan === 'v1_static') {
    // V1 static 4×750w — pas de modulation. Directive : baseline systématique
    // (la directive est override plus tard selon le mode).
    return buildStaticPlan(V2B2_CONFIG);
  }
  // V2-B.2 : planAdaptiveChunkingV2B2 appelle pickPacingDirective qui lit
  // process.env. Pour forcer le mode, on scope la mutation env → plan → restore.
  const prev = process.env.OMEGA_DIRECTIVE_MODE;
  process.env.OMEGA_DIRECTIVE_MODE = variant.directive_mode;
  try {
    return planAdaptiveChunkingV2B2(contract, V2B2_CONFIG);
  } finally {
    if (prev === undefined) delete process.env.OMEGA_DIRECTIVE_MODE;
    else process.env.OMEGA_DIRECTIVE_MODE = prev;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// RUNNER
// ──────────────────────────────────────────────────────────────────────────────

interface BenchRun {
  readonly variant: Variant;
  readonly plan_kind: 'v1_static' | 'v2b2';
  readonly directive_mode: DirectiveMode;
  readonly scene_id: string;
  readonly archetype: BenchScene['archetype'];
  readonly lang: 'fr' | 'en';
  readonly seed_idx: number;
  readonly n_chunks: number;
  readonly plan_summary: string;
  readonly total_words: number;
  readonly duration_ms: number;
  readonly ollama_calls: number;
  readonly tier_score: number;
  readonly status: 'ok' | 'skipped' | 'error';
  readonly error?: string;
  readonly prose_excerpt?: string;
}

async function runCell(
  variant: VariantSpec,
  scene: BenchScene,
  seed_idx: number,
): Promise<BenchRun> {
  const startMs = Date.now();
  const chunksProse: string[] = [];
  let fullProse = '';
  let planSummary = '';
  let totalChunks = 0;

  try {
    const plans = buildPlan(variant, scene.contract);
    totalChunks = plans.length;
    planSummary = plans
      .map((p) => `${p.word_target}w${p.is_pivot ? '*' : ''}[${p.pacing_state[0]}]`)
      .join(',');

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const last_tail =
        i === 0 ? null : fullProse.split(/\s+/).slice(-80).join(' ').trim() || null;

      let prompt: string;
      if (variant.plan === 'v1_static') {
        // Plan V1 : directive forcée = pickPacingDirective(register, 'baseline', mode)
        // mode='baseline' → baseline (tautologique)
        // mode='adaptive' → baseline aussi (car state='baseline' en V1 static)
        //
        // ATTENTION : pour isoler l'effet directive en V1 static, on INJECTE
        // la directive de 'silence' sur les chunks où V2-B.2 aurait pacing_state='silence'.
        // Sinon B ≡ A (tautologie) et Δ(A vs B) = 0 toujours.
        //
        // Heuristique : on mappe chunk V1 idx → quartile Qi → pacing_state
        // qu'aurait produit planAdaptiveChunkingV2B2 pour ce quartile.
        const pseudoPlan = planAdaptiveChunkingV2B2(scene.contract, V2B2_CONFIG);
        const state = pseudoPlan[i % pseudoPlan.length].pacing_state;
        const directive = pickPacingDirective(
          V2B2_CONFIG.register,
          state,
          variant.directive_mode,
        );
        prompt = buildStaticChunkPrompt(scene, i, totalChunks, last_tail, directive);
      } else {
        // Plan V2-B.2 : plan.pacing_directive déjà calculée via buildPlan() scope.
        prompt = buildAdaptiveChunkPrompt(scene, plan, plans.length, last_tail);
      }

      const seed = hashSeed(variant.id, scene.id, i, seed_idx);
      const raw = callOllama(SYSTEM_PROMPT, prompt, seed);
      const prose = extractProse(raw);
      chunksProse.push(prose);
      fullProse = (fullProse + '\n\n' + prose).trim();
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return {
      variant: variant.id,
      plan_kind: variant.plan,
      directive_mode: variant.directive_mode,
      scene_id: scene.id,
      archetype: scene.archetype,
      lang: scene.lang,
      seed_idx,
      n_chunks: totalChunks,
      plan_summary: planSummary,
      total_words: wordCount(fullProse),
      duration_ms: Date.now() - startMs,
      ollama_calls: chunksProse.length,
      tier_score: 0,
      status: 'error',
      error: errMsg,
    };
  }

  const durationMs = Date.now() - startMs;
  const score = scoreProse(fullProse, scene.lang);

  return {
    variant: variant.id,
    plan_kind: variant.plan,
    directive_mode: variant.directive_mode,
    scene_id: scene.id,
    archetype: scene.archetype,
    lang: scene.lang,
    seed_idx,
    n_chunks: totalChunks,
    plan_summary: planSummary,
    total_words: wordCount(fullProse),
    duration_ms: durationMs,
    ollama_calls: chunksProse.length,
    tier_score: score.status === 'ok' ? score.tier_score : 0,
    status: score.status === 'ok' ? 'ok' : 'skipped',
    error: score.skip_reason,
    prose_excerpt: fullProse.slice(0, 400),
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
  runs: BenchRun[];
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
    total_runs_planned: VARIANTS.length * SCENES.length * SEEDS_PER_CELL,
    runs: [],
  };
}

function saveState(state: BenchState): void {
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function doneKey(r: BenchRun): string {
  return `${r.variant}|${r.scene_id}|${r.seed_idx}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// AGGREGATION
// ──────────────────────────────────────────────────────────────────────────────

interface VariantAgg {
  readonly variant: Variant;
  readonly n_ok: number;
  readonly n_total: number;
  readonly mean_score: number;
  readonly median_score: number;
  readonly std_score: number;
  readonly mean_duration_ms: number;
  readonly per_scene: readonly {
    readonly scene_id: string;
    readonly archetype: string;
    readonly scores: readonly number[];
    readonly scene_mean: number;
    readonly scene_std: number;
  }[];
}

function aggregate(runs: readonly BenchRun[]): VariantAgg[] {
  const byVariant = new Map<Variant, BenchRun[]>();
  for (const r of runs) {
    const list = byVariant.get(r.variant) ?? [];
    list.push(r);
    byVariant.set(r.variant, list);
  }
  const out: VariantAgg[] = [];
  for (const variant of VARIANTS) {
    const variantRuns = byVariant.get(variant.id) ?? [];
    const okRuns = variantRuns.filter((r) => r.status === 'ok');
    if (okRuns.length === 0) {
      out.push({
        variant: variant.id,
        n_ok: 0,
        n_total: variantRuns.length,
        mean_score: 0,
        median_score: 0,
        std_score: 0,
        mean_duration_ms: 0,
        per_scene: [],
      });
      continue;
    }
    const allScores = okRuns.map((r) => r.tier_score);
    const bySceneMap = new Map<string, BenchRun[]>();
    for (const r of okRuns) {
      const list = bySceneMap.get(r.scene_id) ?? [];
      list.push(r);
      bySceneMap.set(r.scene_id, list);
    }
    const per_scene: VariantAgg['per_scene'][number][] = [];
    for (const [sid, sceneRuns] of bySceneMap.entries()) {
      const scores = sceneRuns.map((r) => r.tier_score);
      per_scene.push({
        scene_id: sid,
        archetype: sceneRuns[0].archetype,
        scores,
        scene_mean: mean(scores),
        scene_std: stdev(scores),
      });
    }
    out.push({
      variant: variant.id,
      n_ok: okRuns.length,
      n_total: variantRuns.length,
      mean_score: mean(allScores),
      median_score: median(allScores),
      std_score: stdev(allScores),
      mean_duration_ms: mean(okRuns.map((r) => r.duration_ms)),
      per_scene,
    });
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// CAUSAL DECISION (Plan 6.2 du NCR)
// ──────────────────────────────────────────────────────────────────────────────

interface CausalVerdict {
  readonly decision: 'DIRECTIVE_BLOAT_CONFIRMED' | 'DIRECTIVE_BLOAT_REJECTED' | 'INCONCLUSIVE';
  readonly rationale: readonly string[];
  readonly deltas: {
    readonly A_vs_B: number; // effet directive seule
    readonly C_vs_D: number; // effet directive en contexte word_target modulé
    readonly A_vs_C: number; // effet word_target seul
    readonly B_vs_D: number; // effet word_target en contexte directives adaptives
  };
}

function get(aggs: readonly VariantAgg[], id: Variant): VariantAgg | undefined {
  return aggs.find((a) => a.variant === id);
}

function computeCausalVerdict(aggs: readonly VariantAgg[]): CausalVerdict {
  const A = get(aggs, 'A_v1_baseline');
  const B = get(aggs, 'B_v1_adaptive');
  const C = get(aggs, 'C_v2b2_baseline');
  const D = get(aggs, 'D_v2b2_adaptive');
  if (!A || !B || !C || !D) {
    return {
      decision: 'INCONCLUSIVE',
      rationale: ['Au moins un variant sans données exploitables.'],
      deltas: { A_vs_B: 0, C_vs_D: 0, A_vs_C: 0, B_vs_D: 0 },
    };
  }
  const dAB = B.mean_score - A.mean_score;
  const dCD = D.mean_score - C.mean_score;
  const dAC = C.mean_score - A.mean_score;
  const dBD = D.mean_score - B.mean_score;

  const rationale: string[] = [];
  rationale.push(`A (V1+baseline) μ=${A.mean_score.toFixed(3)} (n=${A.n_ok})`);
  rationale.push(`B (V1+adaptive) μ=${B.mean_score.toFixed(3)} (n=${B.n_ok})`);
  rationale.push(`C (V2-B.2+baseline) μ=${C.mean_score.toFixed(3)} (n=${C.n_ok})`);
  rationale.push(`D (V2-B.2+adaptive) μ=${D.mean_score.toFixed(3)} (n=${D.n_ok})`);
  rationale.push('---');
  rationale.push(
    `Δ(A→B) = ${dAB.toFixed(3)}  [effet directives SEULES sur plan V1 — signal primaire]`,
  );
  rationale.push(
    `Δ(C→D) = ${dCD.toFixed(3)}  [effet directives en contexte word_target modulé]`,
  );
  rationale.push(`Δ(A→C) = ${dAC.toFixed(3)}  [effet word_target seul (directives OFF)]`);
  rationale.push(
    `Δ(B→D) = ${dBD.toFixed(3)}  [effet word_target en contexte directives ON]`,
  );

  // Décision causale (NCR §Plan 6.2)
  const absAB = Math.abs(dAB);
  let decision: CausalVerdict['decision'];
  if (absAB >= 1.0) {
    decision = 'DIRECTIVE_BLOAT_CONFIRMED';
    rationale.push(
      `|Δ(A→B)| = ${absAB.toFixed(3)} ≥ 1.0 → DIRECTIVE_BLOAT CONFIRMÉ (chemin critique redesign).`,
    );
  } else if (absAB < 0.5) {
    decision = 'DIRECTIVE_BLOAT_REJECTED';
    rationale.push(
      `|Δ(A→B)| = ${absAB.toFixed(3)} < 0.5 → DIRECTIVE_BLOAT REJETÉ (cause résiduelle ailleurs).`,
    );
  } else {
    decision = 'INCONCLUSIVE';
    rationale.push(
      `|Δ(A→B)| = ${absAB.toFixed(3)} ∈ [0.5, 1.0) → INCONCLUSIF (runs supplémentaires requis).`,
    );
  }

  return {
    decision,
    rationale,
    deltas: { A_vs_B: dAB, C_vs_D: dCD, A_vs_C: dAC, B_vs_D: dBD },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// REPORT
// ──────────────────────────────────────────────────────────────────────────────

function writeReport(
  state: BenchState,
  aggs: readonly VariantAgg[],
  verdict: CausalVerdict,
): void {
  const lines: string[] = [];
  lines.push('# NCR_DIRECTIVE_BLOAT — Bench Ablation Directive');
  lines.push('');
  lines.push(`**Started**: ${state.started_at}`);
  lines.push(`**Model**: ${state.model}`);
  lines.push(`**Runs**: ${state.runs.length} / ${state.total_runs_planned}`);
  lines.push(`**Seeds/cell**: ${state.seeds_per_cell}`);
  lines.push(`**Scope**: INTERIOR + CATHEDRAL (scènes où la régression est documentée)`);
  lines.push('');
  lines.push('## Design factoriel 2×2 (plan × directive)');
  lines.push('');
  lines.push('| Variant | Plan | Directive mode | Rôle |');
  lines.push('|---------|------|----------------|------|');
  for (const v of VARIANTS) {
    lines.push(`| ${v.id} | ${v.plan} | ${v.directive_mode} | ${v.label} |`);
  }
  lines.push('');
  lines.push('## Aggregate par variant');
  lines.push('');
  lines.push('| Variant | n | μ | med | σ | dur_ms |');
  lines.push('|---------|---|---|-----|---|--------|');
  for (const a of aggs) {
    lines.push(
      `| ${a.variant} | ${a.n_ok}/${a.n_total} | ${a.mean_score.toFixed(3)} | ${a.median_score.toFixed(3)} | ${a.std_score.toFixed(3)} | ${a.mean_duration_ms.toFixed(0)} |`,
    );
  }
  lines.push('');
  lines.push('## Per-scene per-variant');
  lines.push('');
  lines.push('| Variant | Scene | Archetype | μ | σ | scores |');
  lines.push('|---------|-------|-----------|---|---|--------|');
  for (const a of aggs) {
    for (const s of a.per_scene) {
      lines.push(
        `| ${a.variant} | ${s.scene_id} | ${s.archetype} | ${s.scene_mean.toFixed(3)} | ${s.scene_std.toFixed(3)} | ${s.scores.map((x) => x.toFixed(2)).join(', ')} |`,
      );
    }
  }
  lines.push('');
  lines.push('## Analyse causale (NCR_DIRECTIVE_BLOAT §Plan 6.2)');
  lines.push('');
  for (const r of verdict.rationale) lines.push(`- ${r}`);
  lines.push('');
  lines.push('## Verdict');
  lines.push('');
  lines.push(`**Decision**: \`${verdict.decision}\``);
  lines.push('');
  lines.push('### Règles (scellées ex-ante NCR_DIRECTIVE_BLOAT §Plan 6.2)');
  lines.push('');
  lines.push('- `|Δ(A→B)| ≥ 1.0` → DIRECTIVE_BLOAT CONFIRMÉ (redesign directives)');
  lines.push('- `|Δ(A→B)| < 0.5` → DIRECTIVE_BLOAT REJETÉ (cause résiduelle ailleurs)');
  lines.push('- `0.5 ≤ |Δ(A→B)| < 1.0` → INCONCLUSIF (runs supplémentaires requis)');
  lines.push('');
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA NCR_DIRECTIVE_BLOAT — BENCH ABLATION DIRECTIVE');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Model  : ${OLLAMA_MODEL}`);
  console.log(`  URL    : ${OLLAMA_URL}`);
  console.log(`  Seeds  : ${SEEDS_PER_CELL} per cell`);
  console.log(
    `  Runs   : ${VARIANTS.length} × ${SCENES.length} × ${SEEDS_PER_CELL} = ${VARIANTS.length * SCENES.length * SEEDS_PER_CELL}`,
  );
  console.log(`  Output : ${OUTPUT_PATH}`);
  console.log('');
  console.log('  Design factoriel 2×2 :');
  for (const v of VARIANTS) console.log(`    ${v.id} — ${v.label}`);
  console.log('');

  const state = loadOrInit();
  const done = new Set<string>(state.runs.map(doneKey));
  let completed = state.runs.length;

  for (const variant of VARIANTS) {
    for (const scene of SCENES) {
      for (let s = 0; s < SEEDS_PER_CELL; s++) {
        const key = `${variant.id}|${scene.id}|${s}`;
        if (done.has(key)) continue;
        const cellStart = Date.now();
        console.log(
          `  → [${completed + 1}/${state.total_runs_planned}] variant=${variant.id} scene=${scene.id} seed=${s}`,
        );
        const run = await runCell(variant, scene, s);
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

  const aggs = aggregate(state.runs);
  const verdict = computeCausalVerdict(aggs);
  writeReport(state, aggs, verdict);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  CAUSAL VERDICT : ' + verdict.decision);
  console.log('═══════════════════════════════════════════════════════════════════════');
  for (const r of verdict.rationale) console.log(`  ${r}`);
  console.log('');
  console.log(`  Report : ${REPORT_PATH}`);
  console.log(`  JSON   : ${OUTPUT_PATH}`);
  console.log('');
}

main().catch((err) => {
  console.error('[bench-ablation-directive] FATAL:', err);
  process.exit(2);
});
