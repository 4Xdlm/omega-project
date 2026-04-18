/**
 * Adaptive Chunker — V2-B
 *
 * Plan de découpage d'une scène en chunks variables selon la physique
 * émotionnelle (arousal, silence_zones, pic, faille) fournie par
 * `EmotionContract`. Alternative au découpage statique 4×750w de V1.
 *
 * Doctrine :
 * - 100% CALC. Aucun appel LLM dans ce module.
 * - Valeurs de coefficients exposées via env vars pour grid search Ollama.
 * - Compatibilité V1 préservée : activé UNIQUEMENT si OMEGA_ADAPTIVE_CHUNKING ≠ '0'.
 *
 * Références :
 * - Design : outputs/chunking_adaptive_v1.md (2026-04-16, v1.1 2026-04-17, v2c 2026-04-17)
 * - Dérivation coefficients : outputs/chunking_adaptive_derivation_v1.md
 * - Registres pacing : outputs/pacing_registers_v1.md
 * - Décisions Francky 2026-04-17 : α=0.5, β=0.2, γ=0.2, δ=0.2 (centres d'intervalle)
 */

import type { EmotionContract } from '../types.js';

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export type PacingState = 'action' | 'introspective' | 'silence' | 'pivot' | 'baseline';
export type PacingRegister = 'litteraire' | 'technique' | 'argot' | 'commun';
export type AdaptiveMode = '0' | 'shadow' | '1';

/**
 * Mode de résolution des directives de pacing.
 *
 * - `'adaptive'` (défaut) : lookup table complet — chaque état (`action`,
 *   `introspective`, `silence`, `pivot`, `baseline`) retourne sa directive
 *   propre. Comportement historique, rétrocompatible.
 * - `'baseline'` : la directive baseline est systématiquement retournée,
 *   quel que soit l'état demandé. Utilisé exclusivement par
 *   `scripts/bench-ablation-directive.ts` pour isoler causalement l'effet
 *   des directives adaptatives (en particulier la directive `silence`
 *   suspectée de bloat sur INTERIOR/CATHEDRAL — voir
 *   `nexus/proof/NCR_DIRECTIVE_BLOAT.md`).
 *
 * Activation via env var `OMEGA_DIRECTIVE_MODE=baseline`. Défaut = 'adaptive'.
 */
export type DirectiveMode = 'adaptive' | 'baseline';

/**
 * Variante du chunker adaptatif.
 *
 * - `'v2b1'` : V2-B initial — N dynamique (ceil(w_q/l_target) + pivots en chunk
 *   supplémentaire). Archivé après bench P5 SHADOW_CONTINUE (seam noise).
 *   Exposé pour reproduction scientifique uniquement.
 * - `'v2b2'` : V2-B.2 — N=4 strict, 1 quartile = 1 chunk. α/β/γ/δ modulent
 *   uniquement `word_target`. Seams inter-chunks identiques V1 (3).
 *   **Défaut** depuis 2026-04-17 (DEC-20260417-004 POINT 7/8).
 * - `'v2c'`  : V2-C router archétypal — dispatch par `detectArchetype(contract)`.
 *   SENSORY/ACTION → V2-B.2 adaptive ; INTERIOR/CATHEDRAL → V1 static.
 *   Introduit 2026-04-17 (DEC-20260417-004 POINT 17) suite à l'autopsie
 *   montrant que V2-B.2 régresse sur INTERIOR/CATHEDRAL (δ négatif +
 *   γ composite). Activé uniquement via OMEGA_ADAPTIVE_VARIANT='v2c'.
 */
export type AdaptiveVariant = 'v2b1' | 'v2b2' | 'v2c';

/**
 * Archétype émotionnel détecté à partir de l'`EmotionContract`.
 * Utilisé par le router V2-C pour choisir entre plan adaptatif et plan static.
 * Classification purement CALC (zéro appel LLM).
 */
export type Archetype = 'ACTION' | 'INTERIOR' | 'SENSORY' | 'CATHEDRAL';

export interface ChunkPlan {
  readonly index: number;
  readonly position_pct: number;
  readonly word_target: number;
  readonly pacing_state: PacingState;
  readonly pacing_directive: string;
  readonly arousal: number;
  readonly is_pivot: boolean;
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly silence_overlap: number;
}

export interface AdaptiveChunkConfig {
  readonly alpha: number;
  readonly beta: number;
  readonly gamma: number;
  readonly delta: number;
  readonly l_ref: number;
  readonly l_min: number;
  readonly l_max: number;
  readonly w_ref: number;
  readonly w_min: number;
  readonly w_max: number;
  readonly pivot_enabled: boolean;
  readonly register: PacingRegister;
  readonly arousal_action_threshold: number;
  readonly arousal_introspective_threshold: number;
  readonly silence_threshold: number;
  readonly pivot_word_target: number;
}

// ---------------------------------------------------------------------------
// Defaults et env loading
// ---------------------------------------------------------------------------

const DEFAULTS: AdaptiveChunkConfig = {
  alpha: 0.5,
  beta: 0.2,
  gamma: 0.2,
  delta: 0.2,
  l_ref: 750,
  l_min: 300,
  l_max: 1200,
  w_ref: 3000,
  w_min: 2500,
  w_max: 4500,
  pivot_enabled: true,
  register: 'litteraire',
  arousal_action_threshold: 0.8,
  arousal_introspective_threshold: 0.3,
  silence_threshold: 0.5,
  pivot_word_target: 400,
};

function readFloat(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readInt(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function readRegister(envName: string, fallback: PacingRegister): PacingRegister {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const allowed: ReadonlyArray<PacingRegister> = ['litteraire', 'technique', 'argot', 'commun'];
  return (allowed as ReadonlyArray<string>).includes(raw) ? (raw as PacingRegister) : fallback;
}

export function loadAdaptiveConfigFromEnv(): AdaptiveChunkConfig {
  return {
    alpha: readFloat('OMEGA_ADAPTIVE_ALPHA', DEFAULTS.alpha),
    beta: readFloat('OMEGA_ADAPTIVE_BETA', DEFAULTS.beta),
    gamma: readFloat('OMEGA_ADAPTIVE_GAMMA', DEFAULTS.gamma),
    delta: readFloat('OMEGA_ADAPTIVE_DELTA', DEFAULTS.delta),
    l_ref: readInt('OMEGA_ADAPTIVE_L_REF', DEFAULTS.l_ref),
    l_min: readInt('OMEGA_ADAPTIVE_L_MIN', DEFAULTS.l_min),
    l_max: readInt('OMEGA_ADAPTIVE_L_MAX', DEFAULTS.l_max),
    w_ref: readInt('OMEGA_ADAPTIVE_W_REF', DEFAULTS.w_ref),
    w_min: readInt('OMEGA_ADAPTIVE_W_MIN', DEFAULTS.w_min),
    w_max: readInt('OMEGA_ADAPTIVE_W_MAX', DEFAULTS.w_max),
    pivot_enabled: (process.env.OMEGA_ADAPTIVE_PIVOT ?? '1') !== '0',
    register: readRegister('OMEGA_PACING_REGISTER', DEFAULTS.register),
    arousal_action_threshold: readFloat(
      'OMEGA_PACING_AROUSAL_ACTION',
      DEFAULTS.arousal_action_threshold,
    ),
    arousal_introspective_threshold: readFloat(
      'OMEGA_PACING_AROUSAL_INTROSPECTIVE',
      DEFAULTS.arousal_introspective_threshold,
    ),
    silence_threshold: readFloat('OMEGA_PACING_SILENCE_THRESHOLD', DEFAULTS.silence_threshold),
    pivot_word_target: readInt('OMEGA_ADAPTIVE_PIVOT_WORDS', DEFAULTS.pivot_word_target),
  };
}

export function getAdaptiveMode(): AdaptiveMode {
  const raw = process.env.OMEGA_ADAPTIVE_CHUNKING ?? '0';
  if (raw === 'shadow') return 'shadow';
  if (raw === '1') return '1';
  return '0';
}

/**
 * Lit la variante du chunker adaptatif depuis `OMEGA_ADAPTIVE_VARIANT`.
 * Défaut = 'v2b2' (post-bench P5, 2026-04-17). 'v2b1' conservé pour
 * reproductibilité scientifique du bench d'origine. 'v2c' active le
 * router archétypal (DEC-20260417-004 POINT 17).
 */
export function getAdaptiveVariant(): AdaptiveVariant {
  const raw = process.env.OMEGA_ADAPTIVE_VARIANT ?? 'v2b2';
  if (raw === 'v2b1') return 'v2b1';
  if (raw === 'v2c') return 'v2c';
  return 'v2b2';
}

/**
 * Lit le mode de résolution des directives depuis `OMEGA_DIRECTIVE_MODE`.
 * Défaut = 'adaptive' (comportement historique, rétrocompatible).
 *
 * Toute valeur ≠ 'baseline' est traitée comme 'adaptive' pour limiter
 * le risque de drift silencieux en production. Un log stderr alerte si
 * la valeur brute est non reconnue.
 */
export function getDirectiveMode(): DirectiveMode {
  const raw = process.env.OMEGA_DIRECTIVE_MODE;
  if (raw === undefined || raw === '') return 'adaptive';
  if (raw === 'baseline') return 'baseline';
  if (raw === 'adaptive') return 'adaptive';
  // Valeur non reconnue : fallback adaptive + warning (une seule fois).
  if (!directiveModeWarned) {
    directiveModeWarned = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[adaptive-chunker] OMEGA_DIRECTIVE_MODE='${raw}' non reconnu, fallback='adaptive'. Valeurs valides: 'adaptive'|'baseline'.`,
    );
  }
  return 'adaptive';
}

let directiveModeWarned = false;

// ---------------------------------------------------------------------------
// Registres de pacing (4 × 5 = 20 formulations)
// ---------------------------------------------------------------------------

const REGISTER_TABLE: Readonly<Record<PacingRegister, Readonly<Record<PacingState, string>>>> = {
  litteraire: {
    action:
      'rythme nerveux, phrases brèves en syncope, élisions prosodiques, verbes en attaque',
    introspective:
      'rythme dilaté, phrases amples en volutes, sensations creusées, subordonnées feuilletées',
    silence:
      'prose ralentie, pauses ostensibles, syntaxe qui se raréfie, vide tangible en fin de phrase',
    pivot: 'moment charnière, bascule nue, densité maximale, une phrase qui tranche',
    baseline: 'rythme équilibré, alternance mesurée, respiration classique',
  },
  technique: {
    action: 'phrases courtes (5-10 mots), peu de subordonnées, verbes d\u2019action directs',
    introspective:
      'phrases plus longues (15-25 mots), plus de descriptions internes, structure paragraphée',
    silence: 'phrases séparées par blancs, absence d\u2019adverbes d\u2019intensité, description factuelle',
    pivot: 'phrase courte et marquée, changement de paragraphe, inflexion syntaxique nette',
    baseline: 'phrases de longueur moyenne (10-15 mots), variation modérée',
  },
  argot: {
    action: 'ça cogne, phrases qui giclent, blancs qui claquent, élisions crues',
    introspective: 'ça rumine, ça tourne en boucle, les phrases traînent, le temps s\u2019étire',
    silence: 'vide qui pèse, rien qui bouge, les mots tombent un par un, ça s\u2019éteint',
    pivot: 'tout bascule, un mot qui fait tout basculer, cassure franche',
    baseline: 'rythme de la rue, alternance du vif et du posé, parlé naturel',
  },
  commun: {
    action: 'phrases brèves et nerveuses, rythme qui accélère, verbes directs',
    introspective: 'phrases développées, pensées qui se ramifient, ton réflexif',
    silence: 'prose ralentie, silences marqués, rien ne se passe mais tout se sent',
    pivot: 'moment décisif, phrase qui fait bascule, rythme cassé',
    baseline: 'rythme régulier, phrases de longueur variable, ton posé',
  },
};

/**
 * Retourne la directive de pacing pour un couple (registre, état).
 *
 * **Mode adaptive (défaut)** : lookup table classique — l'état demandé
 * détermine la directive (20 combinaisons 4 registres × 5 états).
 *
 * **Mode baseline** : la directive baseline du registre est retournée
 * systématiquement, quel que soit l'état. Utilisé par le bench d'ablation
 * directive (NCR_DIRECTIVE_BLOAT) pour isoler causalement l'effet
 * des directives adaptatives sur la qualité de prose, indépendamment
 * des autres leviers (word_target, quartile weights, seams).
 *
 * Le mode est soit passé explicitement via `mode`, soit lu depuis
 * `OMEGA_DIRECTIVE_MODE` (défaut = 'adaptive').
 *
 * **Gating archétypal R-D.1 (ADOPT_A — bench 2026-04-18)** : si
 * `archetype === 'INTERIOR'` ET `state ∈ {silence, introspective}`,
 * la directive baseline est retournée à la place de la directive adaptive
 * spécifique. Justification empirique : le bench R-D.1 (48 runs, 4
 * archétypes × 4 modes × 3 seeds) a démontré que les directives `silence`
 * et `introspective` du registre litteraire dégradent INTERIOR de
 * ΔI = +5.379 quand court-circuitées vers baseline (M3_gated_A : μ = 7.084
 * vs M2_adaptive : μ = 1.705), avec non-régression vérifiée sur
 * ACTION/SENSORY/CATHEDRAL (Δ = -0.199 / +0.446 / +1.174). Le gating ne
 * s'applique pas aux autres archétypes (CATHEDRAL × silence reste
 * directive registre — voir NCR_CATHEDRAL_BASELINE pour traitement séparé).
 *
 * Si `archetype` est omis (rétrocompat), aucun gating n'est appliqué.
 *
 * @param register Registre de pacing (litteraire/technique/argot/commun).
 * @param state État demandé (action/introspective/silence/pivot/baseline).
 * @param mode Mode de résolution (optionnel ; fallback sur env var).
 * @param archetype Archétype émotionnel détecté (optionnel ; active le
 *   gating R-D.1 INTERIOR × {silence, introspective} → baseline).
 * @returns La directive textuelle correspondante.
 */
export function pickPacingDirective(
  register: PacingRegister,
  state: PacingState,
  mode: DirectiveMode = getDirectiveMode(),
  archetype?: Archetype,
): string {
  // Mode baseline : court-circuit total (NCR_DIRECTIVE_BLOAT ablation).
  if (mode === 'baseline') {
    return REGISTER_TABLE[register].baseline;
  }
  // Gating archétypal R-D.1 ADOPT_A (2026-04-18) :
  // INTERIOR × {silence, introspective} → baseline du registre.
  if (
    archetype === 'INTERIOR' &&
    (state === 'silence' || state === 'introspective')
  ) {
    return REGISTER_TABLE[register].baseline;
  }
  return REGISTER_TABLE[register][state];
}

// ---------------------------------------------------------------------------
// Helpers publics (testables)
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Calcule le pourcentage du quartile [start_pct, end_pct] couvert par
 * les zones de silence. Résultat dans [0, 1].
 */
export function overlapWithSilenceZones(
  quartile_start_pct: number,
  quartile_end_pct: number,
  silence_zones: readonly { readonly start_pct: number; readonly end_pct: number }[],
): number {
  const span = quartile_end_pct - quartile_start_pct;
  if (span <= 0) return 0;
  let covered = 0;
  for (const zone of silence_zones) {
    const a = Math.max(quartile_start_pct, zone.start_pct);
    const b = Math.min(quartile_end_pct, zone.end_pct);
    if (b > a) covered += b - a;
  }
  return clamp(covered / span, 0, 1);
}

/**
 * Dérive l'état de pacing à partir de l'arousal, du silence et du flag pivot.
 * Priorité : pivot > silence > action > introspective > baseline.
 */
export function derivePacingState(
  arousal: number,
  silence_overlap: number,
  is_pivot: boolean,
  config: AdaptiveChunkConfig = DEFAULTS,
): PacingState {
  if (is_pivot) return 'pivot';
  if (silence_overlap > config.silence_threshold) return 'silence';
  if (arousal >= config.arousal_action_threshold) return 'action';
  if (arousal <= config.arousal_introspective_threshold) return 'introspective';
  return 'baseline';
}

/**
 * Longueur cible d'un chunk selon arousal (équation §3.1 du design).
 * L_target(a) = clamp(L_REF × (1 − α × (a − 0.5)), L_MIN, L_MAX)
 * Ajusté par silence : L × (1 + γ × silence_overlap)
 */
export function computeTargetLength(
  arousal: number,
  silence_overlap: number,
  config: AdaptiveChunkConfig,
): number {
  const base = config.l_ref * (1 - config.alpha * (arousal - 0.5));
  const silenceAdjusted = base * (1 + config.gamma * silence_overlap);
  return clamp(silenceAdjusted, config.l_min, config.l_max);
}

/**
 * Budget total modulé par arousal moyen (décision Francky §2).
 * W_total = W_REF × (1 + δ × (a_mean − 0.5)), clampé sur [w_min, w_max].
 */
export function computeTotalBudget(
  curve_quartiles: readonly { readonly arousal: number }[],
  config: AdaptiveChunkConfig,
): number {
  if (curve_quartiles.length === 0) return config.w_ref;
  let sum = 0;
  for (const q of curve_quartiles) sum += q.arousal;
  const a_mean = sum / curve_quartiles.length;
  const modulated = config.w_ref * (1 + config.delta * (a_mean - 0.5));
  return clamp(modulated, config.w_min, config.w_max);
}

/**
 * Poids de quartile normalisé par β et arousal local.
 * q_weight(i) = (1 + β × (a_i − 0.5)) / Σ_j (1 + β × (a_j − 0.5))
 * Garantit Σ q_weight(i) = 1.
 */
export function computeQuartileWeights(
  curve_quartiles: readonly { readonly arousal: number }[],
  config: AdaptiveChunkConfig,
): readonly number[] {
  const raw: number[] = [];
  for (const q of curve_quartiles) {
    // clamp individual weight ≥ 0.1 pour éviter dérive si β mal réglé
    const w = Math.max(0.1, 1 + config.beta * (q.arousal - 0.5));
    raw.push(w);
  }
  let sum = 0;
  for (const w of raw) sum += w;
  if (sum === 0) return raw.map(() => 1 / raw.length);
  return raw.map((w) => w / sum);
}

// ---------------------------------------------------------------------------
// Fonction principale — planAdaptiveChunking
// ---------------------------------------------------------------------------

/**
 * Construit le plan de chunking adaptatif pour une scène à partir
 * de son EmotionContract. Retourne une liste de ChunkPlan triés par position.
 *
 * Invariants :
 * - plans.length ≥ 3 && ≤ 10 (garde-fous globaux)
 * - somme(plan.word_target) ≥ w_min && ≤ w_max
 * - tous les word_target dans [l_min, l_max]
 * - positions strictement croissantes
 */
export function planAdaptiveChunking(
  emotion_contract: EmotionContract,
  config: AdaptiveChunkConfig = loadAdaptiveConfigFromEnv(),
): readonly ChunkPlan[] {
  const quartiles = emotion_contract.curve_quartiles;
  const silence_zones = emotion_contract.tension.silence_zones;

  // 0. Archétype détecté une seule fois puis propagé aux appels directive
  //    (gating R-D.1 ADOPT_A : INTERIOR × {silence, introspective} → baseline).
  //    CALC pur, déterministe, zéro LLM (cf. detectArchetype).
  const archetype = detectArchetype(emotion_contract);

  // 1. Budget total modulé
  const w_total = computeTotalBudget(quartiles, config);
  const q_weights = computeQuartileWeights(quartiles, config);

  // 2. Identification pics/failles à extraire
  const pivot_positions: Array<{ position_pct: number; kind: 'pic' | 'faille' }> = [];
  if (config.pivot_enabled) {
    const pic = emotion_contract.tension.pic_position_pct;
    const faille = emotion_contract.tension.faille_position_pct;
    if (pic > 0 && pic < 1) pivot_positions.push({ position_pct: pic, kind: 'pic' });
    // Ajouter faille seulement si distincte du pic (≥ 15% d'écart)
    if (faille > 0 && faille < 1 && Math.abs(faille - pic) >= 0.15) {
      pivot_positions.push({ position_pct: faille, kind: 'faille' });
    }
  }

  // 3. Construction des plans par quartile
  const plans: ChunkPlan[] = [];
  const quartile_bounds: Array<{ q: 'Q1' | 'Q2' | 'Q3' | 'Q4'; start: number; end: number }> = [
    { q: 'Q1', start: 0.0, end: 0.25 },
    { q: 'Q2', start: 0.25, end: 0.5 },
    { q: 'Q3', start: 0.5, end: 0.75 },
    { q: 'Q4', start: 0.75, end: 1.0 },
  ];

  let plan_index = 0;

  for (let i = 0; i < 4; i++) {
    const q = quartile_bounds[i];
    const quartile = quartiles[i];
    const arousal = quartile.arousal;

    // Budget de ce quartile
    const w_q = w_total * q_weights[i];

    // Silence overlap
    const silence_overlap = overlapWithSilenceZones(q.start, q.end, silence_zones);

    // Longueur cible
    const l_target = computeTargetLength(arousal, silence_overlap, config);

    // Pivot dans ce quartile ?
    const pivot_in_quartile = pivot_positions.find(
      (p) => p.position_pct >= q.start && p.position_pct < q.end,
    );

    if (pivot_in_quartile) {
      // Budget restant après déduction du pivot
      const pivot_words = Math.min(config.pivot_word_target, Math.floor(w_q * 0.6));
      const w_remaining = w_q - pivot_words;

      // n chunks non-pivot (au moins 1). ceil pour respecter la doctrine "chunk ≈ L_target" :
      // si w_remaining dépasse L_target, on subdivise plutôt que de produire un chunk long.
      const n_rest = Math.max(1, Math.ceil(w_remaining / l_target));
      const chunk_words = Math.round(w_remaining / n_rest);

      // Générer les chunks non-pivot (avant le pivot)
      const pre_count = Math.max(1, Math.round(n_rest / 2));
      const post_count = n_rest - pre_count;
      const pivot_local_pct = (pivot_in_quartile.position_pct - q.start) / (q.end - q.start);

      // Chunks avant pivot
      for (let k = 0; k < pre_count; k++) {
        const local_pct = (k + 0.5) / (pre_count + 1) * pivot_local_pct;
        plans.push({
          index: plan_index++,
          position_pct: q.start + local_pct * (q.end - q.start),
          word_target: chunk_words,
          pacing_state: derivePacingState(arousal, silence_overlap, false, config),
          pacing_directive: pickPacingDirective(
            config.register,
            derivePacingState(arousal, silence_overlap, false, config),
            undefined,
            archetype,
          ),
          arousal,
          is_pivot: false,
          quartile: q.q,
          silence_overlap,
        });
      }

      // Pivot chunk
      plans.push({
        index: plan_index++,
        position_pct: pivot_in_quartile.position_pct,
        word_target: pivot_words,
        pacing_state: 'pivot',
        pacing_directive: pickPacingDirective(
          config.register,
          'pivot',
          undefined,
          archetype,
        ),
        arousal,
        is_pivot: true,
        quartile: q.q,
        silence_overlap,
      });

      // Chunks après pivot
      for (let k = 0; k < post_count; k++) {
        const remaining_span = 1 - pivot_local_pct;
        const local_pct = pivot_local_pct + ((k + 0.5) / (post_count + 1)) * remaining_span;
        plans.push({
          index: plan_index++,
          position_pct: q.start + local_pct * (q.end - q.start),
          word_target: chunk_words,
          pacing_state: derivePacingState(arousal, silence_overlap, false, config),
          pacing_directive: pickPacingDirective(
            config.register,
            derivePacingState(arousal, silence_overlap, false, config),
            undefined,
            archetype,
          ),
          arousal,
          is_pivot: false,
          quartile: q.q,
          silence_overlap,
        });
      }
    } else {
      // Quartile sans pivot : répartition régulière.
      // ceil pour respecter la doctrine "chunk ≈ L_target" : on préfère subdiviser
      // plutôt que de produire un chunk plus long que la longueur cible locale.
      const n = Math.max(1, Math.ceil(w_q / l_target));
      const chunk_words = Math.round(w_q / n);
      const state = derivePacingState(arousal, silence_overlap, false, config);
      const directive = pickPacingDirective(
        config.register,
        state,
        undefined,
        archetype,
      );

      for (let k = 0; k < n; k++) {
        plans.push({
          index: plan_index++,
          position_pct: q.start + ((k + 0.5) / n) * (q.end - q.start),
          word_target: chunk_words,
          pacing_state: state,
          pacing_directive: directive,
          arousal,
          is_pivot: false,
          quartile: q.q,
          silence_overlap,
        });
      }
    }
  }

  // 4. Garde-fous globaux
  if (plans.length < 3) {
    // Pathologique : forcer au moins 3 chunks en divisant le plus gros
    return fallbackMinimumPlans(plans, config);
  }
  if (plans.length > 10) {
    // Trop de chunks : fusionner les plus courts contigus dans le même quartile
    return mergeExcessPlans(plans, 10, config);
  }

  return plans;
}

// ---------------------------------------------------------------------------
// planAdaptiveChunkingV2B2 — N=4 strict, 1 quartile = 1 chunk
// ---------------------------------------------------------------------------

/**
 * V2-B.2 — Plan de chunking adaptatif avec N=4 hard constraint.
 *
 * **Principe** : 1 quartile narratif = 1 chunk de génération. La richesse
 * physique (arousal, silence, pivot) est injectée dans :
 *   - `word_target` via modulation α + β + γ + δ sur un budget total
 *   - `pacing_state` / `pacing_directive` via `derivePacingState`
 *   - pas dans le **nombre** de chunks (qui reste strictement 4).
 *
 * **Mécanisme** : les seams inter-chunks restent à 3 (comme V1), ce qui
 * préserve la résilience du scoring CALC (features f33c/f24c/f1a) pénalisée
 * par V2-B.1 en production (N=6-7 chunks → 5-6 seams → régression -1.033).
 *
 * **Formulation** :
 * ```
 * w_total        = W_REF × (1 + δ × (a_mean − 0.5))
 * q_weights[i]   = (1 + β × (a_i − 0.5)) / Σ_j(1 + β × (a_j − 0.5))
 * alpha_factor   = 1 + α × (a_i − 0.5)
 * gamma_factor   = 1 + γ × silence_overlap_i
 * raw_target[i]  = w_total × q_weights[i] × alpha_factor[i] × gamma_factor[i]
 * word_target[i] = clamp(raw_target[i] × (w_total / Σraw), l_min, l_max)
 * ```
 *
 * **Invariants** :
 * - `plans.length === 4` **toujours** (hard).
 * - `plans[i].quartile === Q(i+1)`.
 * - Σ `word_target[i]` ∈ [w_min, w_max] (post-clamp).
 * - Pivot pic/faille → `pacing_state='pivot'` du quartile hôte, pas de chunk ajouté.
 *
 * Références : DEC-20260417-004 POINT 7 (2026-04-17, post-bench P5).
 */
export function planAdaptiveChunkingV2B2(
  emotion_contract: EmotionContract,
  config: AdaptiveChunkConfig = loadAdaptiveConfigFromEnv(),
): readonly ChunkPlan[] {
  const quartiles = emotion_contract.curve_quartiles;
  const silence_zones = emotion_contract.tension.silence_zones;

  // 0. Archétype détecté une seule fois puis propagé aux appels directive
  //    (gating R-D.1 ADOPT_A : INTERIOR × {silence, introspective} → baseline).
  //    CALC pur, déterministe, zéro LLM (cf. detectArchetype).
  const archetype = detectArchetype(emotion_contract);

  // 1. Budget total modulé par δ
  const w_total = computeTotalBudget(quartiles, config);

  // 2. Poids de quartile (β)
  const q_weights = computeQuartileWeights(quartiles, config);

  // 3. Identification pivots (pic + faille si distinct ≥ 15 %)
  const pivot_positions: Array<{ position_pct: number; kind: 'pic' | 'faille' }> = [];
  if (config.pivot_enabled) {
    const pic = emotion_contract.tension.pic_position_pct;
    const faille = emotion_contract.tension.faille_position_pct;
    if (pic > 0 && pic < 1) pivot_positions.push({ position_pct: pic, kind: 'pic' });
    if (faille > 0 && faille < 1 && Math.abs(faille - pic) >= 0.15) {
      pivot_positions.push({ position_pct: faille, kind: 'faille' });
    }
  }

  // 4. Bornes strictes des quartiles (N=4 fixé)
  const quartile_bounds: ReadonlyArray<{
    q: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    start: number;
    end: number;
  }> = [
    { q: 'Q1', start: 0.0, end: 0.25 },
    { q: 'Q2', start: 0.25, end: 0.5 },
    { q: 'Q3', start: 0.5, end: 0.75 },
    { q: 'Q4', start: 0.75, end: 1.0 },
  ];

  // 5. Calcul raw_target pour chaque quartile
  interface RawEntry {
    readonly raw_target: number;
    readonly state: PacingState;
    readonly silence_overlap: number;
    readonly is_pivot: boolean;
    readonly position_pct: number;
    readonly arousal: number;
    readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  }

  const raw_entries: RawEntry[] = [];

  for (let i = 0; i < 4; i++) {
    const q = quartile_bounds[i];
    const quartile = quartiles[i];
    const arousal = quartile.arousal;

    const silence_overlap = overlapWithSilenceZones(q.start, q.end, silence_zones);

    const pivot_in_quartile = pivot_positions.find(
      (p) => p.position_pct >= q.start && p.position_pct < q.end,
    );
    const is_pivot = Boolean(pivot_in_quartile);

    const state = derivePacingState(arousal, silence_overlap, is_pivot, config);

    const alpha_factor = 1 + config.alpha * (arousal - 0.5);
    const gamma_factor = 1 + config.gamma * silence_overlap;
    const raw_target = w_total * q_weights[i] * alpha_factor * gamma_factor;

    raw_entries.push({
      raw_target,
      state,
      silence_overlap,
      is_pivot,
      position_pct: pivot_in_quartile
        ? pivot_in_quartile.position_pct
        : (q.start + q.end) / 2,
      arousal,
      quartile: q.q,
    });
  }

  // 6. Renormalisation pour préserver w_total après application des facteurs α et γ
  //    (β est déjà normalisé dans q_weights, α+γ introduisent un facteur global).
  const sum_raw = raw_entries.reduce((s, r) => s + r.raw_target, 0);
  const scale = sum_raw > 0 ? w_total / sum_raw : 1;

  // 7. Construction des 4 plans finaux
  const plans: ChunkPlan[] = raw_entries.map((r, i) => ({
    index: i,
    position_pct: r.position_pct,
    word_target: clamp(Math.round(r.raw_target * scale), config.l_min, config.l_max),
    pacing_state: r.state,
    pacing_directive: pickPacingDirective(
      config.register,
      r.state,
      undefined,
      archetype,
    ),
    arousal: r.arousal,
    is_pivot: r.is_pivot,
    quartile: r.quartile,
    silence_overlap: r.silence_overlap,
  }));

  // 8. Invariant hard : 4 chunks exactement
  if (plans.length !== 4) {
    // Cas pathologique impossible en pratique (boucle fixée 0..3).
    // Fallback défensif : plan statique V1-like pour éviter divergence silencieuse.
    return buildStaticPlan(config);
  }

  return plans;
}

// ---------------------------------------------------------------------------
// V2-C — Router archétypal
// ---------------------------------------------------------------------------

/**
 * Détecte l'archétype émotionnel d'une scène à partir de l'`EmotionContract`.
 *
 * Heuristique CALC pure (zéro LLM, déterministe) :
 * - `a_mean` = moyenne arousal sur 4 quartiles.
 * - `silence_total` = somme largeur zones silence (fraction 0..1).
 *
 * Règles ordonnées (R4 = fallback) :
 *   R1 ACTION    : a_mean ≥ 0.65 && silence_total <  0.10
 *   R2 INTERIOR  : a_mean ≤ 0.35 && silence_total ≥  0.30
 *   R3 CATHEDRAL : silence_total ≥ 0.25 && 0.35 < a_mean < 0.60
 *   R4 SENSORY   : défaut
 *
 * Validation 4/4 sur scènes bench (voir
 * outputs/V2C_ARCHETYPE_DETECTION_DESIGN_v1.md).
 * Seuils arousal alignés sur `arousal_action_threshold=0.65` /
 * `arousal_introspective_threshold=0.35` des configs V2-B.2.
 */
export function detectArchetype(emotion_contract: EmotionContract): Archetype {
  const quartiles = emotion_contract.curve_quartiles;
  const a_sum = quartiles.reduce((s, q) => s + q.arousal, 0);
  const a_mean = quartiles.length > 0 ? a_sum / quartiles.length : 0.5;

  const silence_zones = emotion_contract.tension.silence_zones;
  const silence_total = silence_zones.reduce(
    (s, z) => s + Math.max(0, z.end_pct - z.start_pct),
    0,
  );

  // R1 : ACTION = haute activation + peu/pas de silence
  if (a_mean >= 0.65 && silence_total < 0.10) return 'ACTION';

  // R2 : INTERIOR = basse activation + silence élevé
  if (a_mean <= 0.35 && silence_total >= 0.30) return 'INTERIOR';

  // R3 : CATHEDRAL = activation médiane + silence notable
  if (silence_total >= 0.25 && a_mean > 0.35 && a_mean < 0.60) return 'CATHEDRAL';

  // R4 : SENSORY = fallback
  return 'SENSORY';
}

/**
 * Router V2-C : dispatche le plan de chunking selon l'archétype détecté.
 *
 * - ACTION    → `planAdaptiveChunkingV2B2` (gain pratique, NCR_ACTION_BIAS séparé)
 * - SENSORY   → `planAdaptiveChunkingV2B2` (seule archétype gagnante en bench V2-B.2)
 * - INTERIOR  → `buildStaticPlan` (V2-B.2 régresse ; fallback V1)
 * - CATHEDRAL → `buildStaticPlan` (V2-B.2 régresse ; fallback V1)
 *
 * La signature reste compatible `planAdaptive` pour réutiliser le même dispatcher
 * `planAdaptiveChunkingV2B2`. Aucune nouvelle surface de génération introduite.
 */
export function planV2CArchetypal(
  emotion_contract: EmotionContract,
  config: AdaptiveChunkConfig,
): readonly ChunkPlan[] {
  const archetype = detectArchetype(emotion_contract);
  if (archetype === 'INTERIOR' || archetype === 'CATHEDRAL') {
    return buildStaticPlan(config);
  }
  // ACTION et SENSORY → plan adaptatif V2-B.2
  return planAdaptiveChunkingV2B2(emotion_contract, config);
}

// ---------------------------------------------------------------------------
// Dispatcher de variante — planAdaptive
// ---------------------------------------------------------------------------

/**
 * Dispatcher unifié vers la variante active du chunker adaptatif.
 * Lit `OMEGA_ADAPTIVE_VARIANT` (défaut 'v2b2') pour choisir entre :
 * - 'v2b1' → `planAdaptiveChunking` (N dynamique, archivé post-bench P5)
 * - 'v2b2' → `planAdaptiveChunkingV2B2` (N=4 strict, défaut courant)
 * - 'v2c'  → `planV2CArchetypal` (router archétypal, POINT 17)
 *
 * **Toujours préférer ce dispatcher** aux appels directs dans le reste du code,
 * pour éviter le bypass de la variante active.
 */
export function planAdaptive(
  emotion_contract: EmotionContract,
  config: AdaptiveChunkConfig = loadAdaptiveConfigFromEnv(),
  variant: AdaptiveVariant = getAdaptiveVariant(),
): readonly ChunkPlan[] {
  if (variant === 'v2b1') {
    return planAdaptiveChunking(emotion_contract, config);
  }
  if (variant === 'v2c') {
    return planV2CArchetypal(emotion_contract, config);
  }
  return planAdaptiveChunkingV2B2(emotion_contract, config);
}

// ---------------------------------------------------------------------------
// Garde-fous
// ---------------------------------------------------------------------------

function fallbackMinimumPlans(
  _plans: readonly ChunkPlan[],
  config: AdaptiveChunkConfig,
): readonly ChunkPlan[] {
  // Cas pathologique : retour fallback statique proche V1 mais dans [l_min, l_max].
  // _plans est volontairement ignoré — on reconstruit un plan canonique safe.
  const fallback: ChunkPlan[] = [];
  const n = 3;
  const chunk_w = Math.round(config.w_ref / n);
  const directive = pickPacingDirective(config.register, 'baseline');
  for (let i = 0; i < n; i++) {
    fallback.push({
      index: i,
      position_pct: (i + 0.5) / n,
      word_target: clamp(chunk_w, config.l_min, config.l_max),
      pacing_state: 'baseline',
      pacing_directive: directive,
      arousal: 0.5,
      is_pivot: false,
      quartile: (i === 0 ? 'Q1' : i === 1 ? 'Q2' : 'Q3') as 'Q1' | 'Q2' | 'Q3',
      silence_overlap: 0,
    });
  }
  return fallback;
}

function mergeExcessPlans(
  plans: readonly ChunkPlan[],
  max_count: number,
  config: AdaptiveChunkConfig,
): readonly ChunkPlan[] {
  // Fusion naïve : si > max, on retient les pivots + on échantillonne uniformément
  const pivots = plans.filter((p) => p.is_pivot);
  const non_pivots = plans.filter((p) => !p.is_pivot);
  const keep_count = Math.max(1, max_count - pivots.length);
  const step = non_pivots.length / keep_count;
  const kept_non_pivots: ChunkPlan[] = [];
  for (let i = 0; i < keep_count; i++) {
    const idx = Math.min(non_pivots.length - 1, Math.floor(i * step));
    kept_non_pivots.push(non_pivots[idx]);
  }

  // Réajuster word_target pour conserver le budget
  const total_budget =
    pivots.reduce((s, p) => s + p.word_target, 0) +
    kept_non_pivots.reduce((s, p) => s + p.word_target, 0);
  const budget_ratio = config.w_ref / Math.max(1, total_budget);
  const combined = [...pivots, ...kept_non_pivots]
    .map((p) => ({
      ...p,
      word_target: clamp(Math.round(p.word_target * budget_ratio), config.l_min, config.l_max),
    }))
    .sort((a, b) => a.position_pct - b.position_pct)
    .map((p, i) => ({ ...p, index: i }));

  return combined;
}

// ---------------------------------------------------------------------------
// Fallback plan statique (pour mode '0' ou si emotion_contract absent)
// ---------------------------------------------------------------------------

export function buildStaticPlan(config: AdaptiveChunkConfig = DEFAULTS): readonly ChunkPlan[] {
  const plans: ChunkPlan[] = [];
  const directive = pickPacingDirective(config.register, 'baseline');
  const quartile_bounds: Array<{ q: 'Q1' | 'Q2' | 'Q3' | 'Q4'; start: number; end: number }> = [
    { q: 'Q1', start: 0.0, end: 0.25 },
    { q: 'Q2', start: 0.25, end: 0.5 },
    { q: 'Q3', start: 0.5, end: 0.75 },
    { q: 'Q4', start: 0.75, end: 1.0 },
  ];
  for (let i = 0; i < 4; i++) {
    const q = quartile_bounds[i];
    plans.push({
      index: i,
      position_pct: (q.start + q.end) / 2,
      word_target: Math.round(config.w_ref / 4),
      pacing_state: 'baseline',
      pacing_directive: directive,
      arousal: 0.5,
      is_pivot: false,
      quartile: q.q,
      silence_overlap: 0,
    });
  }
  return plans;
}

// ---------------------------------------------------------------------------
// Aide debug : résumé d'un plan pour log shadow mode
// ---------------------------------------------------------------------------

export function summarizePlan(plans: readonly ChunkPlan[]): string {
  const parts = plans.map((p) => {
    const tag = p.is_pivot ? '*' : '';
    return `${p.word_target}w${tag}[${p.pacing_state[0]}]`;
  });
  const total = plans.reduce((s, p) => s + p.word_target, 0);
  return `n=${plans.length} total=${total}w [${parts.join(',')}]`;
}
