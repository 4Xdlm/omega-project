/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DISPATCHER LANG V3.4 — CORE LOGIC (SHADOW MODE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/scoring/dispatcher/dispatcher-lang.ts
 * Version:  3.4.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      outputs/dispatcher_v33/ADR-001-dispatcher-lang_v2.md §2-§5
 *
 * Rôle
 * ----
 * Exécute le M0b_slim V3.1 (Ridge régularisé α=1.0) sur une prose pour
 * produire un `baseline_tier_score` sur échelle ordinale ~[1.5, 6.5].
 *
 * Shadow mode uniquement :
 * - Ne participe JAMAIS au composite 0-100 (INV-NR-01)
 * - Ne participe JAMAIS au verdict SEAL/PITCH/REJECT (INV-NR-02)
 * - Ne modifie JAMAIS la mise en cache ou l'ordre de génération (INV-NR-03)
 *
 * Activation
 * ----------
 * Contrôlée exclusivement par process.env.OMEGA_DISPATCHER_LANG_V33 :
 *   - unset ou '0' → status='disabled', aucun calcul
 *   - '1'           → actif, produit un DispatcherAttachment
 *   - autre valeur  → DispatcherIntegrationError(UNKNOWN_MODE)
 *
 * Mécanisme du scoring
 * --------------------
 *   baseline_tier_score = model.intercept
 *                       + Σ_{f} model.features[f].coef
 *                              × (feature_vector[f] - model.features[f].mean)
 *                              / model.features[f].std
 *
 * Pourquoi ça marche :
 *   Ridge α=1.0 entraîné avec seed=42 sur n_train=1070 (264 holdout V2, 80/20
 *   stratifié tier×lang, 1334 œuvres). Trois modèles (FR, EN, FALLBACK)
 *   sans sign flips (résolu par volume corpus). Le score est bounded
 *   par la variance du corpus : sous z∈[-2, +2] typique, score∈[2.2, 5.6]
 *   (voir ADR §Annexe C). Hors de ce régime, le score devient indicatif
 *   (risque d'extrapolation), d'où shadow mode stricte.
 *
 * Conditions d'échec documentées :
 *   - prose < min_prose_length → skip (text features trop instables)
 *   - feature NaN (computeTextFeatures a déchargé sur une prose anormale)
 *     → skip avec reason='nan_feature'
 *   - language hors {fr, en, string} → skip (pas de modèle applicable)
 *     → reason='unexpected_language' (signal de santé, jamais en régime
 *        normal car ForgePacket.language est typé 'fr' | 'en')
 *
 * Risques connus :
 *   - Z-scores extrêmes (prose stylistiquement hors distribution) peuvent
 *     produire un tier_score < 1.0 ou > 7.5. En shadow mode c'est toléré
 *     car non exploité. En mode gated futur, il faudra clipper.
 *   - V3.4 : sign flips résolus par expansion corpus (1334 œuvres).
 *     Toutes features cohérentes FR/EN.
 *
 * R-04 : Counter singleton
 * ------------------------
 * Le trace_id utilise un counter module-scope (pattern closure) plutôt
 * qu'un globalThis symbol. Pourquoi :
 *   - Simple à raisonner (pas de pollution globale, pas de collision avec
 *     d'autres packages)
 *   - Reset possible via __resetDispatcherCounterForTest (test-only)
 *   - Persiste pour toute la durée du process — suffisant puisque V3.1
 *     est shadow (pas de warmup multi-process, pas de SSR)
 *
 * Invariants couverts
 * -------------------
 * - INV-DISP-LANG-07 : runDispatcherLang n'écrit jamais hors DispatcherAttachment
 * - INV-DISP-LANG-09 : return est toujours une union valide
 * - INV-NR-04        : aucun side-effect sur SOVEREIGN_CONFIG, macroAxes, verdict
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  DispatcherAttachment,
  DispatcherConfig,
  DispatcherResult,
  DispatcherRoute,
  DispatcherSkipReason,
} from './types.js';
import { DispatcherIntegrationError } from './types.js';
import {
  DISPATCHER_FEATURE_NAMES,
  extractDispatcherFeatures,
  type DispatcherFeatureName,
} from './features-provenance.js';
import {
  CALIBRATION_ID,
  CALIBRATION_SHA256_EXPECTED,
  MODEL_VERSION,
  getLangModel,
  type LangKey,
  type LangModel,
} from './coefficients-v3-4.js';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG PAR DÉFAUT
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_MIN_PROSE_LENGTH = 200;

// ──────────────────────────────────────────────────────────────────────────────
// R-04 — COUNTER SINGLETON (module-scope closure)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compteur monotone module-scope. Incrémenté à chaque appel de runDispatcherLang
 * qui produit un status='ok'. Ne fuit pas hors du module grâce à la closure.
 */
let _dispatcherCounter = 0;

function nextTraceId(scene_id: string): string {
  _dispatcherCounter += 1;
  return `disp-${scene_id || 'unknown'}-${_dispatcherCounter}`;
}

/**
 * Test-only : remet le counter à zéro. NE PAS appeler en production.
 * Exporté avec préfixe `__` pour signaler l'usage non-public.
 */
export function __resetDispatcherCounterForTest(): void {
  _dispatcherCounter = 0;
}

/**
 * Test-only : snapshot de la valeur courante du counter.
 */
export function __getDispatcherCounterForTest(): number {
  return _dispatcherCounter;
}

// ──────────────────────────────────────────────────────────────────────────────
// FEATURE FLAG
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Retourne true si le dispatcher est activé via env var.
 *
 * Valeurs acceptées :
 *   - undefined ou '0' → false (défaut : shadow off)
 *   - '1'              → true
 *   - autre            → DispatcherIntegrationError(UNKNOWN_MODE)
 */
export function isDispatcherLangActive(): boolean {
  const raw = process.env.OMEGA_DISPATCHER_LANG_V33;
  if (raw === undefined || raw === '0') return false;
  if (raw === '1') return true;
  throw new DispatcherIntegrationError(
    'UNKNOWN_MODE',
    `OMEGA_DISPATCHER_LANG_V33='${raw}' not supported in V3.1 (only '0' or '1')`,
  );
}

/**
 * Snapshot instantané de la configuration.
 */
export function getDispatcherConfig(): DispatcherConfig {
  return {
    enabled: isDispatcherLangActive(),
    mode: 'shadow',
    version: '3.4',
    min_prose_length: DEFAULT_MIN_PROSE_LENGTH,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// ROUTING
// ──────────────────────────────────────────────────────────────────────────────

interface RoutingDecision {
  readonly route: DispatcherRoute;
  readonly langKey: LangKey;
  readonly reason: string;
}

/**
 * Décide la route en fonction de packet.language.
 *
 * - 'fr'  → FR
 * - 'en'  → EN
 * - autre string → FALLBACK
 * - undefined / non-string → null (→ skip reason='unexpected_language')
 */
function routeFromLanguage(language: unknown): RoutingDecision | null {
  if (typeof language !== 'string') {
    return null;
  }
  const lang = language.toLowerCase().trim();
  if (lang === '') {
    return null;
  }
  if (lang === 'fr') {
    return { route: 'FR', langKey: 'fr', reason: 'packet.language=fr' };
  }
  if (lang === 'en') {
    return { route: 'EN', langKey: 'en', reason: 'packet.language=en' };
  }
  return {
    route: 'FALLBACK',
    langKey: 'fallback',
    reason: `packet.language=${lang} → fallback (unsupported in V3.1)`,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SCORING RIDGE
// ──────────────────────────────────────────────────────────────────────────────

interface ScoringOutput {
  readonly raw_prediction: number;
  readonly standardized: Readonly<Record<DispatcherFeatureName, number>>;
}

/**
 * Calcule la prédiction Ridge en standardisant les features et en sommant
 * les contributions.
 *
 * @throws DispatcherIntegrationError(UNKNOWN_FEATURE) si un nom de feature
 *          attendu n'est pas présent dans le modèle (bug interne, boot
 *          check aurait dû l'intercepter).
 */
function computeRidgePrediction(
  model: LangModel,
  features: Record<DispatcherFeatureName, number>,
): ScoringOutput {
  let score = model.intercept;
  const standardized: Record<string, number> = {};

  for (const name of DISPATCHER_FEATURE_NAMES) {
    const stats = model.features[name];
    if (!stats) {
      throw new DispatcherIntegrationError(
        'UNKNOWN_FEATURE',
        `Ridge model missing feature '${name}' (boot-check desynced)`,
      );
    }
    const value = features[name];
    const z = (value - stats.mean) / stats.std;
    score += stats.coef * z;
    standardized[name] = z;
  }

  return {
    raw_prediction: score,
    standardized: standardized as Readonly<Record<DispatcherFeatureName, number>>,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS DE RETOUR
// ──────────────────────────────────────────────────────────────────────────────

function makeDisabled(): DispatcherAttachment {
  return { status: 'disabled' };
}

function makeSkipped(reason: DispatcherSkipReason): DispatcherAttachment {
  return { status: 'skipped', reason };
}

function makeOk(result: DispatcherResult): DispatcherAttachment {
  return { status: 'ok', result };
}

// ──────────────────────────────────────────────────────────────────────────────
// API PRINCIPALE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Entrée principale du dispatcher langue V3.1.
 *
 * Contrat de retour :
 *   - status='disabled' si feature flag off
 *   - status='skipped'  si condition bloquante au runtime
 *   - status='ok'       si prédiction calculée
 *
 * Ne JAMAIS throw, sauf :
 *   - DispatcherIntegrationError(UNKNOWN_MODE)  — env var invalide
 *   - DispatcherIntegrationError(UNKNOWN_FEATURE) — bug interne
 *   - DispatcherIntegrationError(INVALID_SHA256) — jeté au chargement du
 *     module coefficients (avant même le premier appel)
 *
 * @param prose  - Texte UTF-8 brut
 * @param packet - Objet contenant au minimum { language: 'fr' | 'en' }
 *                 (extension via `unknown` pour permettre les tests d'edge)
 * @param config - Override partiel de DispatcherConfig (tests)
 */
export function runDispatcherLang(
  prose: string,
  packet: { readonly language?: unknown; readonly scene_id?: string },
  config?: Partial<DispatcherConfig>,
): DispatcherAttachment {
  // 1. Feature flag — court-circuit immédiat
  if (!isDispatcherLangActive()) {
    return makeDisabled();
  }

  // 2. Fusion config
  const effectiveConfig: DispatcherConfig = {
    enabled: true,
    mode: 'shadow',
    version: '3.4',
    min_prose_length: config?.min_prose_length ?? DEFAULT_MIN_PROSE_LENGTH,
  };

  // 3. Validation prose
  if (typeof prose !== 'string' || prose.length < effectiveConfig.min_prose_length) {
    return makeSkipped('prose_too_short');
  }

  // 4. Routing
  const decision = routeFromLanguage(packet.language);
  if (decision === null) {
    return makeSkipped('unexpected_language');
  }

  // 5. Extraction features (délégation pure à text-features.ts)
  const rawFeatures = extractDispatcherFeatures(prose);

  // 6. Validation feature vector
  const featureValues: Partial<Record<DispatcherFeatureName, number>> = {};
  for (const name of DISPATCHER_FEATURE_NAMES) {
    const v = rawFeatures[name];
    if (typeof v !== 'number') {
      return makeSkipped('invalid_feature_vector');
    }
    if (!Number.isFinite(v)) {
      return makeSkipped('nan_feature');
    }
    featureValues[name] = v;
  }

  // À ce stade, toutes les features sont définies et finies.
  const features = featureValues as Record<DispatcherFeatureName, number>;

  // 7. Scoring Ridge
  const model = getLangModel(decision.langKey);
  const { raw_prediction, standardized } = computeRidgePrediction(model, features);

  // 8. Construction du résultat
  const scene_id_safe = typeof packet.scene_id === 'string' ? packet.scene_id : 'no-scene';
  const trace_id = nextTraceId(scene_id_safe);

  const result: DispatcherResult = {
    route: decision.route,
    baseline_tier_score: raw_prediction,
    raw_prediction,
    feature_vector: standardized,
    feature_count: DISPATCHER_FEATURE_NAMES.length,
    calibration_id: CALIBRATION_ID,
    calibration_sha256: CALIBRATION_SHA256_EXPECTED,
    model_version: MODEL_VERSION,
    route_reason: decision.reason,
    trace_id,
    normalization_scheme: 'raw_ridge_tier_ordinal',
  };

  return makeOk(result);
}
