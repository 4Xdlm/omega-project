/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA P1 ROBUSTNESS BENCH — v3 (Q_REPRO + Q_POWER, 6 scènes, 4 modes, 6 gates)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Design doc : outputs/BENCH_P1_V3_DESIGN.md (2026-04-18 soir)
 *
 * Raison d'être : bench v2 FAIL 4/5 = artefact méthodologique (deux drifts).
 *   Drift 1 (v1) : plan V2B2 vs plan V1 static de R-D.1 — résolu en v2.
 *   Drift 2 (v2) : gates G2/G3 mal-spécifiés (demandent perf cross-archetype
 *                  sur arch où gating INTERIOR-scoped n'engage jamais) + ΔI
 *                  INTERIOR instable inter-session (+5.379 → -0.083).
 *
 * v3 résout les deux drifts simultanément via :
 *   - 6 scènes :
 *       REPRO  = fr_interior_maison_enfance (verbatim R-D.1, 1/4 gated attendu)
 *       DEEP_1 = fr_interior_veillee_funebre (engineered 4/4 gated attendu)
 *       DEEP_2 = fr_interior_dialogue_interieur (engineered 3/4 gated + 1 pivot)
 *       DEEP_3 = fr_interior_meditation_aube (engineered 4/4 silence)
 *       CTRL_1 = fr_cathedral_silence_nef (invariant non-gating)
 *       CTRL_2 = fr_action_poursuite (verbatim v2)
 *   - 4 modes :
 *       M1_baseline         (LITTERAIRE_BASELINE_DIRECTIVE verbatim)
 *       M2_adaptive         (pickPacingDirective 3-arg 'adaptive', pas d'archetype)
 *       M3_gated_A_inline   (reproduction inline R-D.1 — test Q_REPRO)
 *       M_prod_p1           (pickPacingDirective 4-arg prod post-7e89f95f)
 *   - 6 gates scellés ex-ante :
 *       G1_REPRO_R_D_1             Δ(M3_inline−M2) REPRO ≥ +3.0
 *       G2_POWER_DEEP              mean(Δ(M_prod−M2)) sur DEEP_1/2/3 ≥ +1.0
 *       G3_SANITY_GATING           ratio gated chunks INTERIOR×{sil,intr} ≥ 0.95
 *       G4_EQUIV_INLINE_PROD       SHA256 directives M3_inline ≡ M_prod sur REPRO = 100%
 *       G5_CONTROL_NO_GATING       gated count sur CTRL_1 CATHEDRAL = 0
 *       G6_REPRODUCIBILITY_BASE    |μ(M1 CTRL_1) − 0.503| ≤ 3.0
 *
 * Total : 6 × 4 × 6 = 144 runs, ~4h qwen3:32b.
 *
 * Invariants :
 *   - SYSTEM_PROMPT, baseline directive, V2B2_CONFIG IDENTIQUES à R-D.1 / v2
 *   - Plan V1 static 4×750w pour tous les modes (pattern R-D.1)
 *   - Scoring CALC V3.4 identique
 *   - directive_sha256 persisté par chunk (preuve G4)
 *
 * Usage :
 *   cd packages/sovereign-engine
 *   $env:OMEGA_OLLAMA_MODEL="qwen3:32b"
 *   npx tsx scripts/bench-p1-robustness-v3.ts
 *
 * Env vars :
 *   OMEGA_OLLAMA_URL         (default: http://localhost:11434)
 *   OMEGA_OLLAMA_MODEL       (default: qwen3:32b)
 *   OMEGA_P1V3_OUTPUT        (default: ./bench-p1-robustness-v3-results.json)
 *   OMEGA_P1V3_RESUME        (default: 0 — si 1, reprend depuis OUTPUT)
 *   OMEGA_P1V3_SEEDS         (default: 6)
 *   OMEGA_P1V3_TIMEOUT_MS    (default: 600000)
 *   OMEGA_P1V3_DRY_RUN       (default: 0 — si 1, exécute seulement DEEP_3 × M1_baseline × 3 seeds)
 *
 * Output :
 *   - bench-p1-robustness-v3-results.json       (incremental persist)
 *   - bench-p1-robustness-v3-results-report.md  (verdict par gate + matrices)
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const OLLAMA_URL = process.env.OMEGA_OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OMEGA_OLLAMA_MODEL ?? 'qwen3:32b';
const DEFAULT_OUTPUT_PATH = path.resolve(
  __dirname,
  '../bench-p1-robustness-v3-results.json',
);
const OUTPUT_PATH = process.env.OMEGA_P1V3_OUTPUT ?? DEFAULT_OUTPUT_PATH;
const REPORT_PATH = OUTPUT_PATH.replace(/\.json$/, '-report.md');
const RESUME = process.env.OMEGA_P1V3_RESUME === '1';
const SEEDS_PER_CELL = Math.max(1, Number(process.env.OMEGA_P1V3_SEEDS) || 6);
const CALL_TIMEOUT_MS = Number(process.env.OMEGA_P1V3_TIMEOUT_MS) || 600_000;
const DRY_RUN = process.env.OMEGA_P1V3_DRY_RUN === '1';
const MIN_PROSE_LENGTH = 200;

const REGISTER: PacingRegister = 'litteraire';

// Config V2-B.2 — utilisée UNIQUEMENT pour dériver pseudo-states (pas pour plan).
// Plan réel = buildStaticPlan(V2B2_CONFIG) qui produit 4×750w. IDENTIQUE R-D.1 / v2.
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

// Baseline directive IDENTIQUE R-D.1 (LITTERAIRE_BASELINE_DIRECTIVE dans
// REGISTER_TABLE.litteraire.baseline). La chaîne littérale ci-dessous DOIT
// matcher exactement celle retournée par pickPacingDirective(reg,'baseline'),
// sinon invariant G4 casse.
const LITTERAIRE_BASELINE_DIRECTIVE =
  'rythme équilibré, alternance mesurée, respiration classique';

// Référence G6 : μ(M1 CATHEDRAL) scène R-D.1 originale (fr_cathedral_gardien_nuit)
// — utilisée comme ancre stabilité LLM inter-session, PAS comme reproduction stricte.
const CATHEDRAL_REF_MEAN_RD1 = 0.503;

// ──────────────────────────────────────────────────────────────────────────────
// MODES (4 variants)
// ──────────────────────────────────────────────────────────────────────────────

type ModeId = 'M1_baseline' | 'M2_adaptive' | 'M3_gated_A_inline' | 'M_prod_p1';

interface ModeSpec {
  readonly id: ModeId;
  readonly label: string;
}

const MODES: readonly ModeSpec[] = [
  { id: 'M1_baseline', label: 'baseline directive fixe (contrôle, replay R-D.1/v2)' },
  { id: 'M2_adaptive', label: 'adaptive 3-arg sans gating (replay R-D.1 M2 toxique)' },
  {
    id: 'M3_gated_A_inline',
    label: 'gating inline R-D.1 — INTERIOR×{silence,intro}→baseline (test Q_REPRO)',
  },
  {
    id: 'M_prod_p1',
    label: 'production P1 — pickPacingDirective(reg,state,undefined,archetype) 4-arg',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// SCÈNES V3 (6 scènes — 1 REPRO + 3 DEEP engineered + 2 CTRL)
// ──────────────────────────────────────────────────────────────────────────────

interface BenchScene {
  readonly id: string;
  readonly lang: 'fr' | 'en';
  readonly archetype: Archetype;
  readonly brief: string;
  readonly signature_words: readonly string[];
  readonly contract: EmotionContract;
  readonly role: 'REPRO' | 'DEEP' | 'CTRL';
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
  // ─────── REPRO : verbatim R-D.1 / v2 ───────
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
  // ─────── DEEP_1 : engineered 4/4 gated (tous quartiles introspective ou silence) ───────
  // Note : silence_zones ajustées vs design doc pour garantir detectArchetype → INTERIOR.
  // Avec arousals [0.25,0.2,0.3,0.15] a_mean=0.225 ; sans silence_zones, R2 FAIL (silence_total<0.30).
  // Silence zones [0, 0.3] + [0.8, 1.0] = silence_total 0.5 → R2 INTERIOR ✓
  // États attendus : Q1 silence (overlap 1.0), Q2 introspective (arousal 0.2), Q3 introspective (arousal 0.3),
  // Q4 silence (overlap 0.8). 4/4 gated sur INTERIOR × {silence, introspective}.
  {
    id: 'fr_interior_veillee_funebre',
    lang: 'fr',
    archetype: 'INTERIOR',
    role: 'DEEP',
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
  // ─────── DEEP_2 : engineered 3/4 gated + 1 pivot Q3 ───────
  // arousals [0.2,0.25,0.55,0.2] a_mean=0.3 ; silence_total=0.3 → R2 INTERIOR ✓
  // pic=0.6 → pivot en Q3
  // États attendus : Q1 silence (overlap 0.8), Q2 introspective, Q3 pivot, Q4 introspective
  // 3/4 gated (Q3 pivot exempt)
  {
    id: 'fr_interior_dialogue_interieur',
    lang: 'fr',
    archetype: 'INTERIOR',
    role: 'DEEP',
    brief: `Un homme de cinquante ans écoute un enregistrement de la voix de sa mère morte depuis deux ans. Il a retrouvé la cassette dans un carton. Il appuie sur PLAY, puis STOP avant la fin. Troisième personne, focalisation interne, passé simple/imparfait. Émotion cible : contemplation, puis un pic bref au milieu, puis retombée.`,
    signature_words: ['cassette', 'voix', 'pli', 'table', 'cire', 'main', 'silence'],
    contract: makeContract(
      [0.2, 0.25, 0.55, 0.2],
      [-0.3, -0.4, -0.7, -0.5],
      0.6,
      0.0,
      [
        { start_pct: 0.0, end_pct: 0.2 },
        { start_pct: 0.9, end_pct: 1.0 },
      ],
      'darkening',
    ),
  },
  // ─────── DEEP_3 : engineered 4/4 silence ───────
  // arousals [0.15,0.15,0.2,0.15] a_mean=0.1625 ; silence_zones [0,1] → silence_total=1.0
  // R2 INTERIOR ✓. Tous quartiles silence (overlap 1.0 partout).
  {
    id: 'fr_interior_meditation_aube',
    lang: 'fr',
    archetype: 'INTERIOR',
    role: 'DEEP',
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
  // ─────── CTRL_1 : CATHEDRAL invariant non-gating ───────
  // Note : design doc propose arousals [0.2,0.25,0.3,0.2] a_mean=0.2375 qui hit R2 INTERIOR.
  // Correction : arousals ajustées pour a_mean dans (0.35, 0.60) → R3 CATHEDRAL ✓
  // arousals [0.4, 0.45, 0.5, 0.4] a_mean=0.4375, silence_total=0.7 → R3 CATHEDRAL
  // États attendus : Q1 silence (overlap 1.0), Q2 silence (overlap 0.6), Q3 pivot (pic=0.55 in Q3),
  // Q4 silence (overlap 1.0). Mais archetype=CATHEDRAL → gated=false partout.
  {
    id: 'fr_cathedral_silence_nef',
    lang: 'fr',
    archetype: 'CATHEDRAL',
    role: 'CTRL',
    brief: `Un visiteur entre dans une cathédrale romane vide. Fin d'après-midi. Il traverse la nef jusqu'au chœur. Rien ne se passe. Il s'arrête, repart. Troisième personne, focalisation interne, passé simple/imparfait. Émotion cible : saisissement devant l'espace, sans affect dramatique.`,
    signature_words: ['pierre', 'dalle', 'voûte', 'vitrail', 'froid', 'pas', 'silence'],
    contract: makeContract(
      [0.4, 0.45, 0.5, 0.4],
      [0.1, 0.2, 0.3, 0.4],
      0.55,
      0.15,
      [
        { start_pct: 0.0, end_pct: 0.4 },
        { start_pct: 0.7, end_pct: 1.0 },
      ],
      'brightening',
    ),
  },
  // ─────── CTRL_2 : ACTION (verbatim v2 / R-D.1) ───────
  // Note : detectArchetype peut retourner SENSORY (a_mean=0.7125 ≥ 0.65 mais silence_total=0.15 > 0.10
  // → R1 FAIL → R4 SENSORY). Le scene.archetype 'ACTION' est display-only ; detectArchetype domine
  // pour le call prod. Invariant attendu : gated=false partout (pas INTERIOR).
  {
    id: 'fr_action_poursuite',
    lang: 'fr',
    archetype: 'ACTION',
    role: 'CTRL',
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
];

// Filtrage dry-run : DEEP_3 uniquement, M1_baseline uniquement, 3 seeds.
const DRY_SCENES: readonly BenchScene[] = DRY_RUN
  ? SCENES.filter((s) => s.id === 'fr_interior_meditation_aube')
  : SCENES;
const DRY_MODES: readonly ModeSpec[] = DRY_RUN
  ? MODES.filter((m) => m.id === 'M1_baseline')
  : MODES;
const DRY_SEEDS = DRY_RUN ? 3 : SEEDS_PER_CELL;

// ──────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — VERBATIM R-D.1 / v2
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

// V1 static chunk config — IDENTIQUE R-D.1 / v2
const LEGACY_CHUNK_WORDS = 750;

// ──────────────────────────────────────────────────────────────────────────────
// DIRECTIVE RESOLVERS (4 modes)
// ──────────────────────────────────────────────────────────────────────────────

/** Dérive pseudo-état adaptive pour chunk i sur plan V1 static. IDENTIQUE R-D.1 / v2. */
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
  mode: ModeId,
  scene: BenchScene,
  chunkIdx: number,
): DirectiveResolution {
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

  if (mode === 'M3_gated_A_inline') {
    // Reproduction inline R-D.1 ADOPT_A : archetype check INLINE (pas via API 4-arg).
    // Si INTERIOR × {silence, introspective} → baseline directive.
    // Sinon → pickPacingDirective 3-arg 'adaptive' (équivalent M2).
    const archetype = detectArchetype(scene.contract);
    const gated =
      archetype === 'INTERIOR' && (state === 'silence' || state === 'introspective');
    const directive = gated
      ? LITTERAIRE_BASELINE_DIRECTIVE
      : pickPacingDirective(REGISTER, state, 'adaptive');
    return {
      directive,
      effective_state: state,
      gated,
      archetype,
    };
  }

  // M_prod_p1 — appel PROD avec archetype détecté (4-arg post-P1, commit 7e89f95f).
  // Le gating INTERIOR × {silence, introspective} est géré en interne par
  // pickPacingDirective (condition ligne 306-311 de adaptive-chunker.ts).
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
// PROMPT BUILDER — plan V1 static 4×750w pour TOUS les modes (VERBATIM R-D.1 / v2)
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
// OLLAMA CALL (pattern R-D.1 / v2 verbatim)
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
  // Use absolute node path to avoid PATH lookup failures in child shells
  const nodeBin = JSON.stringify(process.execPath);
  const raw = execSync(`${nodeBin} -e "${script.replace(/"/g, '\\"')}"`, {
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
// SCORING Ridge V3.4 (VERBATIM R-D.1 / v2)
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
// UTILITAIRES (VERBATIM R-D.1 / v2)
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

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
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
  readonly directive_sha256: string;
  readonly gated: boolean;
  readonly words: number;
}

interface BenchRun {
  readonly mode: ModeId;
  readonly scene_id: string;
  readonly archetype_declared: Archetype;
  readonly archetype_detected: Archetype;
  readonly role: 'REPRO' | 'DEEP' | 'CTRL';
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

  const archetype_detected = detectArchetype(scene.contract);

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
        directive_sha256: sha256(resolved.directive),
        gated: resolved.gated,
        words: wordCount(prose),
      });
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return {
      mode: mode.id,
      scene_id: scene.id,
      archetype_declared: scene.archetype,
      archetype_detected,
      role: scene.role,
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
    archetype_declared: scene.archetype,
    archetype_detected,
    role: scene.role,
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
  readonly dry_run: boolean;
  runs: BenchRun[];
  finished_at?: string;
}

function loadOrInit(planned: number): BenchState {
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
    seeds_per_cell: DRY_SEEDS,
    total_runs_planned: planned,
    design_version: DRY_RUN
      ? 'v3_dry_run_deep3_m1_n3'
      : 'v3_6scenes_4modes_6gates_n6',
    dry_run: DRY_RUN,
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
// AGGREGATION
// ──────────────────────────────────────────────────────────────────────────────

interface CellAgg {
  readonly mode: ModeId;
  readonly scene_id: string;
  readonly archetype_declared: Archetype;
  readonly archetype_detected: Archetype;
  readonly role: 'REPRO' | 'DEEP' | 'CTRL';
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
      const detected = cellRuns.length > 0 ? cellRuns[0].archetype_detected : scene.archetype;
      out.push({
        mode: mode.id,
        scene_id: scene.id,
        archetype_declared: scene.archetype,
        archetype_detected: detected,
        role: scene.role,
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

function getCell(
  aggs: readonly CellAgg[],
  mode: ModeId,
  scene_id: string,
): CellAgg | undefined {
  return aggs.find((a) => a.mode === mode && a.scene_id === scene_id);
}

// ──────────────────────────────────────────────────────────────────────────────
// GATES V3 (6 gates scellés ex-ante — cf. BENCH_P1_V3_DESIGN.md §5)
// ──────────────────────────────────────────────────────────────────────────────

const G1_THRESHOLD = 3.0; // Δ(M3_inline − M2) sur REPRO ≥ +3.0
const G2_THRESHOLD = 1.0; // mean Δ(M_prod − M2) sur DEEP_1/2/3 ≥ +1.0
const G3_THRESHOLD = 0.95; // ratio gated chunks ≥ 0.95 sur INTERIOR × {silence, introspective}
const G4_THRESHOLD = 1.0; // 100% equivalence sha256 M3_inline ≡ M_prod sur REPRO
const G5_THRESHOLD = 0; // count gated CTRL_1 = 0
const G6_THRESHOLD = 3.0; // |μ(M1 CTRL_1) − 0.503| ≤ 3.0

interface GateResult {
  readonly gate: string;
  readonly value: number;
  readonly threshold: number;
  readonly op: '>=' | '<=' | '==';
  readonly pass: boolean;
  readonly rationale: string;
}

function evalG1(aggs: readonly CellAgg[]): GateResult {
  const m3 = getCell(aggs, 'M3_gated_A_inline', 'fr_interior_maison_enfance');
  const m2 = getCell(aggs, 'M2_adaptive', 'fr_interior_maison_enfance');
  const muM3 = m3?.cell_mean ?? NaN;
  const muM2 = m2?.cell_mean ?? NaN;
  const delta = muM3 - muM2;
  return {
    gate: 'G1_REPRO_R_D_1',
    value: delta,
    threshold: G1_THRESHOLD,
    op: '>=',
    pass: Number.isFinite(delta) && delta >= G1_THRESHOLD,
    rationale: `μ(M3_inline REPRO)=${muM3.toFixed(3)} − μ(M2 REPRO)=${muM2.toFixed(3)} = ${delta.toFixed(3)}. Test falsifiable H1 small-n luck.`,
  };
}

function evalG2(aggs: readonly CellAgg[]): GateResult {
  const deepScenes = ['fr_interior_veillee_funebre', 'fr_interior_dialogue_interieur', 'fr_interior_meditation_aube'];
  const deltas: number[] = [];
  const parts: string[] = [];
  for (const sid of deepScenes) {
    const prod = getCell(aggs, 'M_prod_p1', sid);
    const m2 = getCell(aggs, 'M2_adaptive', sid);
    const muProd = prod?.cell_mean ?? NaN;
    const muM2 = m2?.cell_mean ?? NaN;
    const d = muProd - muM2;
    if (Number.isFinite(d)) {
      deltas.push(d);
      parts.push(`${sid}: ${muProd.toFixed(2)}−${muM2.toFixed(2)}=${d.toFixed(2)}`);
    } else {
      parts.push(`${sid}: NaN`);
    }
  }
  const meanDelta = deltas.length > 0 ? mean(deltas) : NaN;
  return {
    gate: 'G2_POWER_DEEP',
    value: meanDelta,
    threshold: G2_THRESHOLD,
    op: '>=',
    pass: Number.isFinite(meanDelta) && meanDelta >= G2_THRESHOLD,
    rationale: `mean Δ(M_prod−M2) sur DEEP_1/2/3 = ${meanDelta.toFixed(3)}. Détails : ${parts.join(' | ')}.`,
  };
}

function evalG3(runs: readonly BenchRun[]): GateResult {
  // Sur INTERIOR runs M_prod_p1 : proportion de chunks où state ∈ {silence, introspective}
  // ET gated=true.
  const interiorScenes = ['fr_interior_maison_enfance', 'fr_interior_veillee_funebre', 'fr_interior_dialogue_interieur', 'fr_interior_meditation_aube'];
  const relevant = runs.filter(
    (r) => r.mode === 'M_prod_p1' && interiorScenes.includes(r.scene_id) && r.chunk_trace,
  );
  let gatedChunks = 0;
  let elegibleChunks = 0;
  for (const r of relevant) {
    for (const t of r.chunk_trace ?? []) {
      if (t.pacing_state === 'silence' || t.pacing_state === 'introspective') {
        elegibleChunks++;
        if (t.gated) gatedChunks++;
      }
    }
  }
  const ratio = elegibleChunks > 0 ? gatedChunks / elegibleChunks : NaN;
  return {
    gate: 'G3_SANITY_GATING',
    value: ratio,
    threshold: G3_THRESHOLD,
    op: '>=',
    pass: Number.isFinite(ratio) && ratio >= G3_THRESHOLD,
    rationale: `${gatedChunks}/${elegibleChunks} chunks gated sur INTERIOR × {silence,introspective} en M_prod_p1 = ${(Number.isFinite(ratio) ? ratio : 0).toFixed(3)}.`,
  };
}

function evalG4(runs: readonly BenchRun[]): GateResult {
  // Sur REPRO : pour chaque (seed_idx, chunk_idx), sha256 M3_inline == sha256 M_prod_p1 ?
  const reproRuns = runs.filter((r) => r.scene_id === 'fr_interior_maison_enfance');
  const m3Map = new Map<string, string>(); // "seed|chunk" → sha256
  const prodMap = new Map<string, string>();
  for (const r of reproRuns) {
    if (!r.chunk_trace) continue;
    for (const t of r.chunk_trace) {
      const key = `${r.seed_idx}|${t.chunk_index}`;
      if (r.mode === 'M3_gated_A_inline') m3Map.set(key, t.directive_sha256);
      if (r.mode === 'M_prod_p1') prodMap.set(key, t.directive_sha256);
    }
  }
  let compared = 0;
  let matches = 0;
  const mismatches: string[] = [];
  for (const [key, sh3] of m3Map) {
    const shP = prodMap.get(key);
    if (shP === undefined) continue;
    compared++;
    if (sh3 === shP) matches++;
    else if (mismatches.length < 3) mismatches.push(`${key}: m3=${sh3.slice(0, 10)}, prod=${shP.slice(0, 10)}`);
  }
  const ratio = compared > 0 ? matches / compared : NaN;
  const mismatchStr = mismatches.length > 0 ? ` Mismatches(sample): ${mismatches.join('; ')}` : '';
  return {
    gate: 'G4_EQUIV_INLINE_PROD',
    value: ratio,
    threshold: G4_THRESHOLD,
    op: '==',
    pass: Number.isFinite(ratio) && ratio === G4_THRESHOLD,
    rationale: `${matches}/${compared} paires (seed×chunk) avec SHA256 directive identique M3_inline ≡ M_prod_p1 sur REPRO.${mismatchStr}`,
  };
}

function evalG5(runs: readonly BenchRun[]): GateResult {
  // Sur CTRL_1 CATHEDRAL : count chunks gated=true en M_prod_p1.
  const ctrlRuns = runs.filter(
    (r) => r.mode === 'M_prod_p1' && r.scene_id === 'fr_cathedral_silence_nef' && r.chunk_trace,
  );
  let gatedCount = 0;
  let totalChunks = 0;
  for (const r of ctrlRuns) {
    for (const t of r.chunk_trace ?? []) {
      totalChunks++;
      if (t.gated) gatedCount++;
    }
  }
  return {
    gate: 'G5_CONTROL_NO_GATING',
    value: gatedCount,
    threshold: G5_THRESHOLD,
    op: '==',
    pass: gatedCount === G5_THRESHOLD,
    rationale: `${gatedCount} / ${totalChunks} chunks gated=true sur CTRL_1 CATHEDRAL × M_prod_p1 (invariant INTERIOR-scoped).`,
  };
}

function evalG6(aggs: readonly CellAgg[]): GateResult {
  const m1 = getCell(aggs, 'M1_baseline', 'fr_cathedral_silence_nef');
  const muM1 = m1?.cell_mean ?? NaN;
  const gap = Math.abs(muM1 - CATHEDRAL_REF_MEAN_RD1);
  return {
    gate: 'G6_REPRODUCIBILITY_BASELINE',
    value: gap,
    threshold: G6_THRESHOLD,
    op: '<=',
    pass: Number.isFinite(gap) && gap <= G6_THRESHOLD,
    rationale: `|μ(M1 CTRL_1)=${muM1.toFixed(3)} − 0.503| = ${gap.toFixed(3)}. Détection drift LLM massif.`,
  };
}

function evaluateGates(
  runs: readonly BenchRun[],
  aggs: readonly CellAgg[],
): { gates: GateResult[]; overall_pass: boolean } {
  const gates = [
    evalG1(aggs),
    evalG2(aggs),
    evalG3(runs),
    evalG4(runs),
    evalG5(runs),
    evalG6(aggs),
  ];
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
  lines.push('# P1 Robustness Bench v3 — Q_REPRO + Q_POWER (6 scènes, 4 modes, 6 gates)');
  lines.push('');
  lines.push(`**Started** : ${state.started_at}`);
  if (state.finished_at) lines.push(`**Finished** : ${state.finished_at}`);
  lines.push(`**Model** : ${state.model}`);
  lines.push(`**Design** : ${state.design_version}`);
  lines.push(`**Runs** : ${state.runs.length} / ${state.total_runs_planned}`);
  lines.push(`**Seeds/cell** : ${state.seeds_per_cell}`);
  lines.push(`**Register** : ${state.register}`);
  lines.push(`**Dry-run** : ${state.dry_run ? 'YES (DEEP_3 × M1 × n=3)' : 'no'}`);
  lines.push('');
  lines.push('## Modes');
  lines.push('');
  lines.push('| Mode | Label |');
  lines.push('|------|-------|');
  for (const m of MODES) lines.push(`| ${m.id} | ${m.label} |`);
  lines.push('');
  lines.push('## Scènes');
  lines.push('');
  lines.push('| Scène | Role | Archetype déclaré | Archetype détecté |');
  lines.push('|---|---|---|---|');
  for (const s of SCENES) {
    const detected = detectArchetype(s.contract);
    lines.push(`| ${s.id} | ${s.role} | ${s.archetype} | ${detected} |`);
  }
  lines.push('');
  lines.push('## Matrice cell_mean (mode × scène)');
  lines.push('');
  lines.push('| Mode \\ Scène | REPRO | DEEP_1 | DEEP_2 | DEEP_3 | CTRL_1 | CTRL_2 |');
  lines.push('|---|---|---|---|---|---|---|');
  const sceneOrder = [
    'fr_interior_maison_enfance',
    'fr_interior_veillee_funebre',
    'fr_interior_dialogue_interieur',
    'fr_interior_meditation_aube',
    'fr_cathedral_silence_nef',
    'fr_action_poursuite',
  ];
  for (const m of MODES) {
    const row: string[] = [`| ${m.id} |`];
    for (const sid of sceneOrder) {
      const cell = getCell(aggs, m.id, sid);
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
  lines.push('| Mode | Scene | Role | ArchDet | n | μ | med | σ | scores | dur_ms |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const c of aggs) {
    lines.push(
      `| ${c.mode} | ${c.scene_id} | ${c.role} | ${c.archetype_detected} | ${c.n_ok}/${c.n_total} | ${c.cell_mean.toFixed(3)} | ${c.cell_median.toFixed(3)} | ${c.cell_std.toFixed(3)} | ${c.scores.map((x) => x.toFixed(2)).join(', ')} | ${c.cell_mean_duration_ms.toFixed(0)} |`,
    );
  }
  lines.push('');

  lines.push('## Gates G1-G6 (seuils scellés ex-ante)');
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
    lines.push('**PASS** — P1 wiring empiriquement confirmé, Q_REPRO et Q_POWER positifs.');
    lines.push('');
    lines.push('Actions suivantes :');
    lines.push('- Archiver artefacts');
    lines.push('- Clôturer NCR_GATING_EFFECT_SIZE_UNSTABLE (CLOSED_FIX)');
    lines.push('- Clôturer NCR_BENCH_METHOD_DRIFT (FIX_VALIDATED)');
  } else {
    lines.push('**FAIL** — investigation requise (cf. decision tree §6 design doc).');
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
  const plannedRuns = DRY_SCENES.length * DRY_MODES.length * DRY_SEEDS;

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA P1 ROBUSTNESS BENCH v3 — Q_REPRO + Q_POWER');
  console.log(
    `  (${DRY_SCENES.length} scènes × ${DRY_MODES.length} modes × ${DRY_SEEDS} seeds = ${plannedRuns} runs)`,
  );
  if (DRY_RUN) console.log('  *** DRY RUN : DEEP_3 × M1_baseline × n=3 uniquement ***');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Model  : ${OLLAMA_MODEL}`);
  console.log(`  URL    : ${OLLAMA_URL}`);
  console.log(`  Output : ${OUTPUT_PATH}`);
  console.log('');
  console.log('  Modes :');
  for (const m of DRY_MODES) console.log(`    ${m.id} — ${m.label}`);
  console.log('');
  console.log('  Scènes :');
  for (const s of DRY_SCENES) {
    const det = detectArchetype(s.contract);
    console.log(`    ${s.role}  ${s.id}  (decl=${s.archetype}, detected=${det})`);
  }
  console.log('');

  const state = loadOrInit(plannedRuns);
  const done = new Set<string>(state.runs.map(doneKey));
  let completed = state.runs.length;

  for (const mode of DRY_MODES) {
    for (const scene of DRY_SCENES) {
      for (let s = 0; s < DRY_SEEDS; s++) {
        const key = `${mode.id}|${scene.id}|${s}`;
        if (done.has(key)) continue;
        const cellStart = Date.now();
        console.log(
          `  → [${completed + 1}/${state.total_runs_planned}] mode=${mode.id} scene=${scene.id} seed=${s}`,
        );
        const run = await runCell(mode, scene, s);
        state.runs.push(run);
        completed++;
        saveState(state);
        const duration = ((Date.now() - cellStart) / 1000).toFixed(1);
        console.log(
          `      status=${run.status} score=${run.tier_score.toFixed(2)} chunks=${run.n_chunks} words=${run.total_words} dur=${duration}s archDet=${run.archetype_detected}`,
        );
      }
    }
  }

  state.finished_at = new Date().toISOString();
  saveState(state);

  const aggs = aggregateByCell(state.runs);
  const evaluation = evaluateGates(state.runs, aggs);
  writeReport(state, aggs, evaluation);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  FINAL VERDICT : ${evaluation.overall_pass ? 'PASS' : 'FAIL'}`);
  console.log('═══════════════════════════════════════════════════════════════════════');
  for (const g of evaluation.gates) {
    const flag = g.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${flag}  ${g.gate.padEnd(32)} ${g.value.toFixed(3)} ${g.op} ${g.threshold.toFixed(3)}`);
  }
  console.log('');
  console.log(`  Report : ${REPORT_PATH}`);
  console.log(`  JSON   : ${OUTPUT_PATH}`);
  console.log('');
}

// Module guard 2026-05-17: empêche main() de tourner en test (ncr-m2-v4-fusion.test.ts importait ce module et lançait le bench 144 runs ~6h+).
// Pattern aligné sur bench-p1-v4-fusion.ts:1051.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('[bench-p1-robustness-v3] FATAL:', err);
    process.exit(2);
  });
}
