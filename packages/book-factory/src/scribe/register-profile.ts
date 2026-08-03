/**
 * OMEGA — REGISTER_PROFILE : l'orientation appartient à l'UTILISATEUR.
 *
 * MANDAT ARCHITECTE (2026-08-03) : « l'utilisateur peut régler ce qu'il
 * souhaite — un chef-d'œuvre littéraire primé ou un best-seller léger mais
 * vendable. Ce choix d'orientation doit rester libre. »
 *
 * ARCHITECTURE (amendement ChatGPT ratifié 2026-08-03, v2 du module) :
 * l'axe unique « bestseller → élite → amplitude → littéraire » MENTAIT —
 * il mélangeait trois concepts indépendants. L'intérieur est donc TROIS AXES,
 * et les quatre presets visibles par l'utilisateur sont des COMBINAISONS :
 *
 *   MARKET_REGISTER      BESTSELLER_LIGHT | ELITE_THRILLER | LITERARY_CONTEMP
 *   SYNTACTIC_AMPLITUDE  RESTRAINED | BALANCED | HIGH
 *   DIALOGUE_STYLE       DASH | GUILLEMETS | AUTO
 *
 *   Musso      = BESTSELLER_LIGHT + RESTRAINED + DASH
 *   Thilliez   = ELITE_THRILLER   + BALANCED   + DASH
 *   Chattam QTV= ELITE_THRILLER   + HIGH       + DASH   ← l'amplitude n'est
 *   Houellebecq= LITERARY_CONTEMP + HIGH       + GUILLEMETS   pas un rayon.
 *
 * PROVENANCE DES CHIFFRES — deux natures, étiquetées (exigence ChatGPT) :
 *   EMPIRICAL_REFERENCE : enveloppes mesurées (M0, 39 romans FR pleins,
 *     échelle passage ~1000 mots, commit 6dc92b8f).
 *   CONTROL_POLICY : `opportunityCeiling` est une POLITIQUE de pilotage —
 *     un plafond de propension, PAS une observation de corpus. Personne n'a
 *     compté « la part de scènes à opportunité » chez Thilliez.
 *
 * CE QUE ÇA N'EST PAS (doctrine, mesurée quatre fois cette semaine) :
 *   - PAS une cible interne : tail40 ne sépare pas l'élite du tout-venant
 *     intra-genre (AUC 0,573, ns). Monter l'amplitude change de FORME,
 *     changer de registre change de RAYON — aucun des deux n'est « mieux ».
 *   - PAS un quota transmis au modèle (ADR-003 ; contrainte positive →
 *     gabarit, 4 bras). Le plafond module la part de scènes ÉLIGIBLES qui
 *     ouvrent l'opportunité ; il ne force jamais une scène inadéquate.
 *   - PAS un juge : le diagnostic est SHADOW, un écart de registre est une
 *     information pour l'utilisateur, jamais une non-conformité.
 */
import type { TailRates } from '../variation/long-period-template.js';

/* ─────────────────────────────── LES TROIS AXES ────────────────────────────── */

export type MarketRegister = 'BESTSELLER_LIGHT' | 'ELITE_THRILLER' | 'LITERARY_CONTEMP';
export type SyntacticAmplitude = 'RESTRAINED' | 'BALANCED' | 'HIGH';
export type DialogueStyle = 'DASH' | 'GUILLEMETS' | 'AUTO';

export interface Envelope {
  readonly low: number;
  readonly median: number;
  readonly high: number;
}

const M0 = 'EMPIRICAL_REFERENCE — M0 2026-08-03, runs/m0_target/M0_TARGET_PER_BOOK.json, commit 6dc92b8f';

/** Enveloppes tail40 par AMPLITUDE, au sein de chaque registre mesuré.
 *  L'amplitude est une propriété SYNTAXIQUE : Chattam-haute-amplitude reste un
 *  thriller d'élite. Sources : A_POP (13 livres), B_ELITE (18), C_MASTER (8 —
 *  N FAIBLE, Houellebecq domine : confiance Basse assumée). */
export const TAIL40_BY_AMPLITUDE: Readonly<Record<SyntacticAmplitude, Envelope>> = {
  RESTRAINED: { low: 0.001, median: 0.0098, high: 0.016 },
  BALANCED: { low: 0.008, median: 0.012, high: 0.02 },
  HIGH: { low: 0.02, median: 0.05, high: 0.167 },
} as const;

/** Forme de queue (tail50/tail40) observée par livre — thriller élite :
 *  méd 0,330 [0,111-0,528]. Le littéraire contemporain monte plus haut. */
export const SHAPE_BY_AMPLITUDE: Readonly<Record<SyntacticAmplitude, Envelope>> = {
  RESTRAINED: { low: 0.11, median: 0.327, high: 0.53 },
  BALANCED: { low: 0.111, median: 0.33, high: 0.528 },
  HIGH: { low: 0.111, median: 0.45, high: 0.85 },
} as const;

/** Tours de parole ouverts par un tiret (part des phrases, mesure directe
 *  2026-08-03) : pop 24,0 % · élite 17,1 % · littéraire 4,3 % (qui dialogue
 *  aux GUILLEMETS, 15,8 % de phrases en portant). La CONVENTION est un
 *  marqueur de registre à part entière. */
export const DASH_SHARE_BY_REGISTER: Readonly<Record<MarketRegister, Envelope>> = {
  BESTSELLER_LIGHT: { low: 0.15, median: 0.24, high: 0.35 },
  ELITE_THRILLER: { low: 0.1, median: 0.171, high: 0.3 },
  LITERARY_CONTEMP: { low: 0.0, median: 0.043, high: 0.12 },
} as const;

export const DIALOGUE_STYLE_BY_REGISTER: Readonly<Record<MarketRegister, DialogueStyle>> = {
  BESTSELLER_LIGHT: 'DASH',
  ELITE_THRILLER: 'DASH',
  LITERARY_CONTEMP: 'GUILLEMETS',
} as const;

/* ──────────────────────────── LA CONFIGURATION ─────────────────────────────── */

export interface RegisterConfig {
  readonly market: MarketRegister;
  readonly amplitude: SyntacticAmplitude;
  readonly dialogue: DialogueStyle;
  /** CONTROL_POLICY — plafond de propension : part MAXIMALE des scènes
   *  ÉLIGIBLES qui ouvrent l'opportunité de période longue. Un plafond, jamais
   *  un quota : si 6 scènes seulement ont une justification narrative, on en
   *  ouvre 6, pas « 50 % de 20 ». Jamais transmis au modèle en nombre. */
  readonly opportunityCeiling: number;
}

/** Enveloppes de référence effectives d'une configuration. */
export interface RegisterEnvelopes {
  readonly tail40: Envelope;
  readonly shapeRatio: Envelope;
  readonly dialogueDashShare: Envelope;
  readonly provenance: { readonly envelopes: string; readonly ceiling: string };
}

export function resolveEnvelopes(cfg: RegisterConfig): RegisterEnvelopes {
  return {
    tail40: TAIL40_BY_AMPLITUDE[cfg.amplitude],
    shapeRatio: SHAPE_BY_AMPLITUDE[cfg.amplitude],
    dialogueDashShare: DASH_SHARE_BY_REGISTER[cfg.market],
    provenance: {
      envelopes: M0,
      ceiling: 'CONTROL_POLICY — plafond de pilotage, pas une observation de corpus',
    },
  };
}

/* ──────────────── LES QUATRE PRESETS (la façade utilisateur) ───────────────── */

export type RegisterPresetId =
  | 'BESTSELLER_LIGHT'
  | 'ELITE_THRILLER_BALANCED'
  | 'HIGH_AMPLITUDE'
  | 'LITERARY_CONTEMP';

export interface RegisterPreset {
  readonly id: RegisterPresetId;
  /** Ce que l'utilisateur choisit, en clair. */
  readonly intent: string;
  readonly config: RegisterConfig;
}

/** Les presets sont des COMBINAISONS d'axes — le produit reste simple,
 *  l'architecture ne ment pas. L'utilisateur avancé peut composer sa propre
 *  RegisterConfig hors presets (mandat : le choix reste libre). */
export const REGISTER_PRESETS: Readonly<Record<RegisterPresetId, RegisterPreset>> = {
  BESTSELLER_LIGHT: {
    id: 'BESTSELLER_LIGHT',
    intent: 'Best-seller léger, page-turner vendable (référence : Musso, Levy)',
    config: { market: 'BESTSELLER_LIGHT', amplitude: 'RESTRAINED', dialogue: 'DASH', opportunityCeiling: 0.3 },
  },
  ELITE_THRILLER_BALANCED: {
    id: 'ELITE_THRILLER_BALANCED',
    intent: 'Thriller français de haut niveau (référence : Thilliez, Bussi)',
    config: { market: 'ELITE_THRILLER', amplitude: 'BALANCED', dialogue: 'DASH', opportunityCeiling: 0.5 },
  },
  HIGH_AMPLITUDE: {
    id: 'HIGH_AMPLITUDE',
    intent: 'Thriller à grande amplitude syntaxique (ancre : Chattam, « Que ta volonté soit faite », tail40 0,093)',
    config: { market: 'ELITE_THRILLER', amplitude: 'HIGH', dialogue: 'DASH', opportunityCeiling: 0.75 },
  },
  LITERARY_CONTEMP: {
    id: 'LITERARY_CONTEMP',
    intent: 'Littéraire contemporain, visée prix (référence : Houellebecq, NDiaye, Carrère — enveloppe N=8, fragile)',
    config: { market: 'LITERARY_CONTEMP', amplitude: 'HIGH', dialogue: 'GUILLEMETS', opportunityCeiling: 0.9 },
  },
} as const;

export const DEFAULT_PRESET: RegisterPresetId = 'ELITE_THRILLER_BALANCED';

/* ─────────────────────────── DIAGNOSTIC (SHADOW) ───────────────────────────── */

export type AxisVerdict = 'UNDER' | 'IN_ENVELOPE' | 'OVER';

export interface RegisterDiagnosis {
  readonly config: RegisterConfig;
  readonly tail40: AxisVerdict;
  readonly shapeRatio: AxisVerdict;
  /** SHADOW — informe, ne vetote jamais (le registre n'est pas une faute). */
  readonly inRegister: boolean;
}

function situate(value: number, e: Envelope): AxisVerdict {
  if (value < e.low) return 'UNDER';
  if (value > e.high) return 'OVER';
  return 'IN_ENVELOPE';
}

/** Situe une mesure TAIL contre une configuration (ou un preset résolu). */
export function diagnoseRegister(
  rates: TailRates,
  cfg: RegisterConfig = REGISTER_PRESETS[DEFAULT_PRESET].config,
): RegisterDiagnosis {
  const env = resolveEnvelopes(cfg);
  const t = situate(rates.tail40, env.tail40);
  const s = rates.tail40 > 0 ? situate(rates.shapeRatio, env.shapeRatio) : 'IN_ENVELOPE';
  return { config: cfg, tail40: t, shapeRatio: s, inRegister: t === 'IN_ENVELOPE' && s === 'IN_ENVELOPE' };
}
