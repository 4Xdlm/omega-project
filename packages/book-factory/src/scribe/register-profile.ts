/**
 * OMEGA — REGISTER_PROFILE : l'orientation appartient à l'UTILISATEUR.
 *
 * MANDAT ARCHITECTE (2026-08-03) : « l'idée était que l'utilisateur pouvait
 * régler ce qu'il souhaitait — un chef-d'œuvre littéraire primé ou un
 * best-seller léger mais vendable. Ce choix d'orientation doit rester libre. »
 *
 * CE QUE C'EST : un cadran de REGISTRE. Chaque profil est une ENVELOPPE
 * MESURÉE sur des livres réels (M0, 2026-08-03, 39 romans FR pleins, échelle
 * passage ~1000 mots, commit 6dc92b8f) — jamais un goût, jamais un quota.
 *
 * CE QUE ÇA N'EST PAS (doctrine, mesurée trois fois cette semaine) :
 *   - PAS une cible interne du moteur : tail40 ne sépare PAS l'élite du
 *     tout-venant intra-genre (AUC 0,573, ns). Monter le cadran change de
 *     RAYON DE LIBRAIRIE, pas de niveau de qualité.
 *   - PAS un quota transmis au modèle : une contrainte positive fabrique son
 *     propre gabarit (B1b, B1d — 4 bras, même verdict). Le profil module la
 *     part de scènes qui OUVRENT l'opportunité, et sert d'étalon SHADOW à la
 *     sélection. ADR-003 : CALC contrôle la sélection, pas la génération.
 *
 * PROFIL PAR DÉFAUT : ELITE_THRILLER_BALANCED (arbitrage tour de table
 *  2026-08-03 — mais le défaut lui-même reste modifiable par l'utilisateur).
 */
import type { TailRates } from '../variation/long-period-template.js';

export type RegisterProfileId =
  | 'BESTSELLER_LIGHT'
  | 'ELITE_THRILLER_BALANCED'
  | 'HIGH_AMPLITUDE'
  | 'LITERARY_CONTEMP';

export interface Envelope {
  readonly low: number;
  readonly median: number;
  readonly high: number;
}

export interface RegisterProfile {
  readonly id: RegisterProfileId;
  /** Ce que l'utilisateur choisit, en clair. */
  readonly intent: string;
  /** Enveloppe tail40 par livre (part de phrases > 40 mots). */
  readonly tail40: Envelope;
  /** Forme de queue attendue (tail50/tail40) — l'humain module, le moteur binarise. */
  readonly shapeRatio: Envelope;
  /** Part de phrases ouvertes par un tiret de dialogue (% mesuré par strate). */
  readonly dialogueDashShare: Envelope;
  /** Part indicative de scènes déclarant l'opportunité de période longue.
   *  GUIDE pour l'orchestrateur — jamais transmis au modèle en nombre. */
  readonly opportunityShare: number;
  /** D'où viennent ces chiffres. */
  readonly provenance: string;
}

const M0 = 'M0 2026-08-03, runs/m0_target/M0_TARGET_PER_BOOK.json, commit 6dc92b8f';

export const REGISTER_PROFILES: Readonly<Record<RegisterProfileId, RegisterProfile>> = {
  BESTSELLER_LIGHT: {
    id: 'BESTSELLER_LIGHT',
    intent: 'Best-seller léger, page-turner vendable (référence : Musso, Levy)',
    tail40: { low: 0.006, median: 0.0098, high: 0.016 },
    shapeRatio: { low: 0.11, median: 0.327, high: 0.53 },
    dialogueDashShare: { low: 0.15, median: 0.24, high: 0.35 },
    opportunityShare: 0.3,
    provenance: `${M0} — strate A_THRILLER_POP, 13 livres pleins`,
  },
  ELITE_THRILLER_BALANCED: {
    id: 'ELITE_THRILLER_BALANCED',
    intent: 'Thriller français de haut niveau (référence : Thilliez, Chattam, Bussi)',
    tail40: { low: 0.008, median: 0.012, high: 0.02 },
    shapeRatio: { low: 0.111, median: 0.33, high: 0.528 },
    dialogueDashShare: { low: 0.1, median: 0.171, high: 0.3 },
    opportunityShare: 0.5,
    provenance: `${M0} — strate B_THRILLER_ELITE, 18 livres pleins`,
  },
  HIGH_AMPLITUDE: {
    id: 'HIGH_AMPLITUDE',
    intent: 'Thriller à grande amplitude syntaxique (ancre réelle : Chattam, « Que ta volonté soit faite », tail40 0,093)',
    tail40: { low: 0.02, median: 0.05, high: 0.093 },
    shapeRatio: { low: 0.111, median: 0.4, high: 0.55 },
    dialogueDashShare: { low: 0.08, median: 0.15, high: 0.25 },
    opportunityShare: 0.75,
    provenance: `${M0} — frontière haute observée de B_THRILLER_ELITE (2 livres ancres)`,
  },
  LITERARY_CONTEMP: {
    id: 'LITERARY_CONTEMP',
    intent: 'Littéraire contemporain, visée prix (référence : Houellebecq, NDiaye, Carrère)',
    tail40: { low: 0.023, median: 0.146, high: 0.167 },
    shapeRatio: { low: 0.3, median: 0.55, high: 0.85 },
    // Convention différente : le littéraire dialogue aux guillemets, peu de tirets.
    dialogueDashShare: { low: 0.0, median: 0.043, high: 0.12 },
    opportunityShare: 0.9,
    provenance: `${M0} — strate C_MASTER_CONTEMP, 8 livres pleins (N faible : Houellebecq pèse lourd)`,
  },
} as const;

export const DEFAULT_PROFILE: RegisterProfileId = 'ELITE_THRILLER_BALANCED';

export type AxisVerdict = 'UNDER' | 'IN_ENVELOPE' | 'OVER';

export interface ProfileDiagnosis {
  readonly profile: RegisterProfileId;
  readonly tail40: AxisVerdict;
  readonly shapeRatio: AxisVerdict;
  /** Diagnostic SHADOW — informe, ne vetote jamais (le registre n'est pas une faute). */
  readonly inRegister: boolean;
}

function situate(value: number, e: Envelope): AxisVerdict {
  if (value < e.low) return 'UNDER';
  if (value > e.high) return 'OVER';
  return 'IN_ENVELOPE';
}

/** Situe une mesure TAIL contre le profil choisi par l'utilisateur.
 *  SHADOW uniquement : aucun veto, aucun quota — un écart de registre est une
 *  information pour l'utilisateur, pas une non-conformité. */
export function diagnoseRegister(rates: TailRates, profileId: RegisterProfileId = DEFAULT_PROFILE): ProfileDiagnosis {
  const p = REGISTER_PROFILES[profileId];
  const t = situate(rates.tail40, p.tail40);
  // shapeRatio n'a de sens que s'il existe des phrases longues.
  const s = rates.tail40 > 0 ? situate(rates.shapeRatio, p.shapeRatio) : 'IN_ENVELOPE';
  return { profile: profileId, tail40: t, shapeRatio: s, inRegister: t === 'IN_ENVELOPE' && s === 'IN_ENVELOPE' };
}
