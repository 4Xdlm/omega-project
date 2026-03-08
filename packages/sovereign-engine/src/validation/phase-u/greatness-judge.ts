/**
 * greatness-judge.ts
 * U-W2 — Greatness Judge v1
 *
 * Évalue la "grandeur littéraire" d'un texte sur 4 axes pondérés.
 *
 * AXES & POIDS (spec OMEGA_PLAN_TRANSCENDANCE_TOTALE):
 *   memorabilite      ×2.0  — 1 phrase reste après lecture
 *   tension_implicite ×2.5  — électricité sous-jacente, pas l'action
 *   voix              ×2.0  — style reconnaissable et inattendu
 *   subjectivite      ×3.0  — un humain a pu écrire ça (anti-IA smell)
 *
 * Composite = (M×2.0 + T×2.5 + V×2.0 + S×3.0) / 9.5 × 100 → [0, 100]
 *
 * Invariants:
 *   INV-GJ-01 : composite ∈ [0, 100], arrondi à 2 décimales
 *   INV-GJ-02 : chaque sous-score ∈ [0.0, 1.0]
 *   INV-GJ-03 : justification présente et ≤ 100 chars sur chaque axe
 *   INV-GJ-04 : SelectionTrace produit pour chaque évaluation (traçabilité K-variants)
 *   INV-GJ-05 : fail-closed — toute erreur LLM → GreatnessError (jamais de score partiel)
 *   INV-GJ-06 : anti-circularité — seul le corpus golden humain calibre le juge
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { sha256 } from '@omega/canon-kernel';
import type { JudgeCache, JudgeResult } from '../../judge-cache.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type GreatnessAxis = 'memorabilite' | 'tension_implicite' | 'voix' | 'subjectivite';

export interface AxisScore {
  readonly axis:   GreatnessAxis;
  readonly score:  number;    // [0.0, 1.0]
  readonly reason: string;    // ≤ 100 chars
  readonly weight: number;    // poids dans le composite
}

/** Trace immuable produite pour chaque évaluation — requis pour K-variants determinism [INV-GJ-04] */
export interface SelectionTrace {
  readonly prose_sha256:   string;
  readonly evaluated_at:  string;   // ISO 8601
  readonly axes:           AxisScore[];
  readonly composite:      number;  // [0, 100]
  readonly verdict:        'EVALUATED' | 'ERROR';
  readonly error_detail?:  string;
}

export interface GreatnessResult {
  readonly composite: number;      // [0, 100]
  readonly axes:      AxisScore[];
  readonly trace:     SelectionTrace;
}

export class GreatnessError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`${code}: ${message}`);
    this.name = 'GreatnessError';
  }
}

// ── Constantes ───────────────────────────────────────────────────────────────

export const GREATNESS_AXES: Record<GreatnessAxis, { weight: number; prompt: string }> = {
  memorabilite: {
    weight: 2.0,
    prompt: `Tu es un juge littéraire expert spécialisé en mémorabilité.
Note la mémorabilité de ce texte sur une échelle CONTINUE 0.0-1.0.

DÉFINITION : Mémorabilité = au moins une phrase, image ou formulation reste
durablement dans la mémoire du lecteur après lecture.

ÉCHELLE OBLIGATOIRE (utilise tout le spectre) :
  0.0-0.2 = prose interchangeable, aucun moment saillant, oubliable en 1 minute
  0.3-0.4 = prose correcte, quelques éléments potentiels mais sans éclat
  0.5-0.6 = un ou deux moments mémorables, mais noyés dans la masse
  0.7-0.8 = plusieurs formulations fortes, le lecteur retient quelque chose
  0.9-1.0 = prose inoubliable — une phrase peut devenir une citation

RÈGLE ANTI-BIAIS : le lyrisme ≠ mémorabilité. Une phrase sobre et précise
peut être plus mémorable qu'une métaphore flamboyante.

Réponds UNIQUEMENT en JSON : {"score": <0.0-1.0>, "reason": "<max 100 chars>"}`,
  },

  tension_implicite: {
    weight: 2.5,
    prompt: `Tu es un juge littéraire expert spécialisé en tension narrative implicite.
Note la tension implicite de ce texte sur une échelle CONTINUE 0.0-1.0.

DÉFINITION : La tension implicite = l'électricité sous-jacente d'un texte
en apparence calme. La pression entre ce qui est dit et ce qui ne peut pas être dit.

ÉCHELLE OBLIGATOIRE :
  0.0-0.2 = aucun sous-texte, aucune pression latente, narration plate
  0.3-0.4 = légère gêne ou attente, mais sans épaisseur sous-jacente
  0.5-0.6 = tension détectable sous la surface, mais conventionnelle
  0.7-0.8 = pression constante entre le dit et le non-dit, le lecteur le ressent physiquement
  0.9-1.0 = chaque phrase porte un danger silencieux — la tension implicite est le sujet réel

RÈGLE ANTI-BIAIS : les mots "terreur/danger/panique" RÉDUISENT le score
si la tension dépend d'eux. La prose sobre et clinique PEUT scorer 0.9+.

Réponds UNIQUEMENT en JSON : {"score": <0.0-1.0>, "reason": "<max 100 chars>"}`,
  },

  voix: {
    weight: 2.0,
    prompt: `Tu es un juge littéraire expert spécialisé en voix narrative.
Note la singularité de la voix de ce texte sur une échelle CONTINUE 0.0-1.0.

DÉFINITION : Voix = le style est reconnaissable, inattendu, et ne pourrait pas
appartenir à n'importe quel autre texte.

ÉCHELLE OBLIGATOIRE :
  0.0-0.2 = prose générique, style interchangeable, aucun marqueur distinctif
  0.3-0.4 = quelques tentatives stylistiques mais sans cohérence ni surprise
  0.5-0.6 = style présent mais conventionnel, prévisible dans ses choix
  0.7-0.8 = voix distincte, on reconnaît la main de quelqu'un
  0.9-1.0 = voix unique et inattendue — impossible à confondre, impossible à imiter

SIGNAL D'ALARME IA : structure trop propre, transitions lisses, vocabulaire riche
mais sans friction → pénaliser. La vraie voix résiste.

Réponds UNIQUEMENT en JSON : {"score": <0.0-1.0>, "reason": "<max 100 chars>"}`,
  },

  subjectivite: {
    weight: 3.0,
    prompt: `Tu es un juge littéraire expert spécialisé en détection d'authenticité humaine.
Note la subjectivité perçue de ce texte sur une échelle CONTINUE 0.0-1.0.

DÉFINITION : Subjectivité perçue = un être humain ayant vécu quelque chose
a pu écrire ça. Pas un système qui optimise pour "sembler humain".

MARQUEURS D'AUTHENTICITÉ (augmentent le score) :
  - Détails concrets et non-mémorables
  - Contradictions internes non-résolues
  - Ellipses là où un LLM expliquerait
  - Douleur ou joie incarnée dans l'action, pas dans l'adjectif

MARQUEURS IA-GÉNÉRIQUE (réduisent le score) :
  - "il ressentit une étrange sensation" / "tout semblait irréel"
  - Vocabulaire émotionnel explicite sans ancrage physique
  - Résolution propre d'une tension complexe
  - Longueur équilibrée, symétrie narrative parfaite

ÉCHELLE OBLIGATOIRE :
  0.0-0.2 = clairement généré par machine
  0.3-0.4 = effort d'authenticité mais les coutures IA sont visibles
  0.5-0.6 = ambigu — pourrait être humain ou IA bien calibrée
  0.7-0.8 = très probablement humain — imperfections organiques présentes
  0.9-1.0 = seul un humain ayant vécu ça pouvait écrire ça

Réponds UNIQUEMENT en JSON : {"score": <0.0-1.0>, "reason": "<max 100 chars>"}`,
  },
};

/** Somme des poids = 2.0 + 2.5 + 2.0 + 3.0 = 9.5 */
export const TOTAL_WEIGHT = 9.5;

/** Version des prompts — incrémenter invalide le cache existant */
export const GREATNESS_PROMPT_VERSION = 'gj-v1';

// ── Adapter LLM autonome ─────────────────────────────────────────────────────
// Architecture propre : pas d'accès aux méthodes privées de LLMJudge.
// Réimplémente le même pattern (cache SHA256, retry, timeout) avec prompts injectables.

const ANTHROPIC_API_URL   = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION   = '2023-06-01';
const MAX_RETRIES         = 5;
const DEFAULT_TIMEOUT_MS  = 45000;
const DEFAULT_RETRY_MS    = 2000;
const DEFAULT_RATE_MS     = 1000;

export interface GreatnesAdapterOptions {
  readonly timeoutMs?:  number;
  readonly retryBaseMs?: number;
  readonly rateLimitMs?: number;
}

/** Adapter LLM dédié au Greatness Judge — prompts 100% injectables */
export class GreatnessLLMAdapter {
  private readonly modelId:    string;
  private readonly apiKey:     string;
  private readonly cache:      JudgeCache;
  private readonly timeoutMs:  number;
  private readonly retryMs:    number;
  private readonly rateMs:     number;
  private lastCall = 0;

  constructor(
    modelId: string,
    apiKey: string,
    cache: JudgeCache,
    opts?: GreatnesAdapterOptions,
  ) {
    this.modelId   = modelId;
    this.apiKey    = apiKey;
    this.cache     = cache;
    this.timeoutMs = opts?.timeoutMs  ?? DEFAULT_TIMEOUT_MS;
    this.retryMs   = opts?.retryBaseMs ?? DEFAULT_RETRY_MS;
    this.rateMs    = opts?.rateLimitMs ?? DEFAULT_RATE_MS;
  }

  async judge(axis: GreatnessAxis, prose: string, customPrompt: string): Promise<JudgeResult> {
    // Cache key = SHA256(axis + normalizedProse + promptVersion)
    const normalized = prose.trim().replace(/\s+/g, ' ').slice(0, 3000);
    const cacheKey   = sha256(axis + normalized + GREATNESS_PROMPT_VERSION);

    const cached = this.cache.get(cacheKey);
    if (cached !== null) return cached;

    const fullPrompt = `${customPrompt}\nTexte: ${normalized}`;
    const rawText    = await this.callWithRetry(axis, fullPrompt);
    const result     = this.parseAndValidate(axis, rawText);

    this.cache.set(cacheKey, result);
    return result;
  }

  private async callWithRetry(axis: string, prompt: string): Promise<string> {
    await this.rateLimit();
    let lastErr: Error | null = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        return await this.callWithTimeout(axis, prompt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // FIX-JUDGE-RETRY: include network errors (fetch failed, ECONNRESET, ETIMEDOUT)
        // in addition to HTTP rate-limit codes (429/503/529).
        // 'fetch failed' = TypeError from Node.js fetch on transient network failure.
        const isRetryable =
          msg.includes('429') ||
          msg.includes('503') ||
          msg.includes('529') ||
          msg.toLowerCase().includes('fetch failed') ||
          msg.toLowerCase().includes('failed to fetch') ||
          msg.toLowerCase().includes('econnreset') ||
          msg.toLowerCase().includes('etimedout') ||
          msg.toLowerCase().includes('enotfound') ||
          (err instanceof TypeError && (msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('network')));
        if (isRetryable) {
          await new Promise(r => setTimeout(r, this.retryMs * (i + 1)));
          lastErr = err instanceof Error ? err : new Error(msg);
          continue;
        }
        throw err;
      }
    }
    throw lastErr ?? new Error(`GreatnessLLMAdapter [${axis}]: all retries failed`);
  }

  private async callWithTimeout(axis: string, prompt: string): Promise<string> {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const resp = await globalThis.fetch(ANTHROPIC_API_URL, {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body:   JSON.stringify({ model: this.modelId, max_tokens: 150, messages: [{ role: 'user', content: prompt }] }),
        signal: ctrl.signal,
      });

      if (resp.status === 429 || resp.status === 503) throw new Error(`HTTP ${resp.status}`);
      if (!resp.ok) throw new Error(`Anthropic API: ${resp.status} ${resp.statusText}`);

      const data = await resp.json() as { model?: string; content?: Array<{ type: string; text: string }> };

      // Model lock — fail-closed si drift
      if (data.model && data.model !== this.modelId) {
        throw new GreatnessError('MODEL_DRIFT', `expected ${this.modelId}, got ${data.model}`);
      }

      const text = data.content?.[0]?.text;
      if (!text) throw new GreatnessError('EMPTY_RESPONSE', `axis=${axis}`);
      return text;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GreatnessError('TIMEOUT', `axis=${axis} exceeded ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(tid);
    }
  }

  private parseAndValidate(axis: string, rawText: string): JudgeResult {
    const jsonMatch = rawText.match(/\{[^}]*"score"\s*:\s*[\d.]+[^}]*\}/);
    if (!jsonMatch) throw new GreatnessError('SCHEMA_ERROR', `axis=${axis} no JSON found in: "${rawText.slice(0, 200)}"`);

    let parsed: unknown;
    try { parsed = JSON.parse(jsonMatch[0]); } catch {
      throw new GreatnessError('SCHEMA_ERROR', `axis=${axis} JSON parse failed`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new GreatnessError('SCHEMA_ERROR', `axis=${axis} not an object`);
    }

    const obj   = parsed as { score?: unknown; reason?: unknown };
    const score  = Number(obj.score);
    const reason = String(obj.reason ?? '');

    if (isNaN(score) || score < 0 || score > 1) {
      throw new GreatnessError('INVALID_SCORE', `axis=${axis} score=${score}`);
    }
    if (!reason || reason.trim().length === 0) {
      throw new GreatnessError('MISSING_JUSTIFICATION', `axis=${axis}`);
    }

    return { score, reason: reason.slice(0, 100) };
  }

  private async rateLimit(): Promise<void> {
    if (this.rateMs <= 0) return;
    const elapsed = Date.now() - this.lastCall;
    if (elapsed < this.rateMs) await new Promise(r => setTimeout(r, this.rateMs - elapsed));
    this.lastCall = Date.now();
  }
}

// ── Calcul du composite ──────────────────────────────────────────────────────

/**
 * composite = Σ(score_i × weight_i) / TOTAL_WEIGHT × 100
 * Arrondi à 2 décimales. Clampé [0, 100].
 * INV-GJ-01
 */
export function computeComposite(axes: AxisScore[]): number {
  if (axes.length !== 4) {
    throw new GreatnessError('COMPOSITE_ERROR', `Expected 4 axes, got ${axes.length}`);
  }
  const weighted = axes.reduce((sum, a) => sum + a.score * a.weight, 0);
  const raw      = (weighted / TOTAL_WEIGHT) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)) * 100) / 100;
}

// ── Greatness Judge ──────────────────────────────────────────────────────────

export class GreatnessJudge {
  private readonly adapter: GreatnessLLMAdapter;

  constructor(modelId: string, apiKey: string, cache: JudgeCache, opts?: GreatnesAdapterOptions) {
    this.adapter = new GreatnessLLMAdapter(modelId, apiKey, cache, opts);
  }

  /** Injecte un adapter custom (pour tests) */
  static withAdapter(adapter: GreatnessLLMAdapter): GreatnessJudge {
    const inst   = Object.create(GreatnessJudge.prototype) as GreatnessJudge;
    (inst as unknown as { adapter: GreatnessLLMAdapter }).adapter = adapter;
    return inst;
  }

  /**
   * Évalue un texte sur les 4 axes de grandeur.
   * INV-GJ-05 : fail-closed — toute erreur remonte, jamais de score partiel.
   */
  async evaluate(prose: string, proseSha256: string): Promise<GreatnessResult> {
    if (!prose || prose.trim().length === 0) {
      throw new GreatnessError('EMPTY_PROSE', 'prose cannot be empty');
    }
    if (!proseSha256 || proseSha256.length < 10) {
      throw new GreatnessError('MISSING_SHA256', 'proseSha256 required for SelectionTrace');
    }

    const axesOrder: GreatnessAxis[] = ['memorabilite', 'tension_implicite', 'voix', 'subjectivite'];
    const axesScores: AxisScore[]    = [];

    for (const axisName of axesOrder) {
      const { weight, prompt } = GREATNESS_AXES[axisName];
      let result: JudgeResult;
      try {
        result = await this.adapter.judge(axisName, prose, prompt);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new GreatnessError('AXIS_EVAL_FAILED', `Axis "${axisName}": ${detail}`, err);
      }

      // INV-GJ-02
      if (result.score < 0 || result.score > 1 || !isFinite(result.score)) {
        throw new GreatnessError('INVALID_SCORE', `Axis "${axisName}" score=${result.score}`);
      }
      // INV-GJ-03
      if (!result.reason || result.reason.trim().length === 0) {
        throw new GreatnessError('MISSING_JUSTIFICATION', `Axis "${axisName}"`);
      }

      axesScores.push({ axis: axisName, score: result.score, reason: result.reason, weight });
    }

    const composite = computeComposite(axesScores);

    const trace: SelectionTrace = {
      prose_sha256: proseSha256,
      evaluated_at: new Date().toISOString(),
      axes:         axesScores,
      composite,
      verdict:      'EVALUATED',
    };

    return { composite, axes: axesScores, trace };
  }

  /**
   * Évalue K variantes → retourne triées par composite desc (top-1 en tête).
   * SelectionTrace produit pour chaque variante — INV-GJ-04.
   */
  async evaluateVariants(
    variants: Array<{ prose: string; sha256: string }>,
  ): Promise<GreatnessResult[]> {
    if (variants.length === 0) {
      throw new GreatnessError('EMPTY_VARIANTS', 'at least 1 variant required');
    }
    const results: GreatnessResult[] = [];
    for (const v of variants) {
      results.push(await this.evaluate(v.prose, v.sha256));
    }
    return results.sort((a, b) => b.composite - a.composite);
  }
}
