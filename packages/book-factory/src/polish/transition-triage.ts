/**
 * OMEGA — PE-7 / TRANSITION_TRIAGE (BF-08, ADVISORY, pur CALC).
 *
 * Mandat 3-IA (2026-06-08). ChatGPT exige une CLASSIFICATION des 19 transitions
 * molles AVANT toute coupe (« HOLD coupe automatique / GO classification ») ;
 * Gemini veut une gate dramatique. Convergence opérationnelle : NE PAS couper en
 * bloc — trier d'abord. Ce module TRIE, il ne coupe JAMAIS (tout créatif part en
 * AUTHOR_REVIEW / 3-IA ; loi PE-3 : aucun auto-réparé).
 *
 * Trois bacs (définitions ChatGPT, mots du tribunal) :
 *   CUT_MERGE  — « transition réellement vide » : rien ne change, aucune tension
 *                utile, aucune fonction atmosphérique forte.
 *   REINFORCE  — « ambiance utile mais manque d'acte, de décision, de micro-
 *                révélation ou de friction ».
 *   KEEP       — « lenteur utile, atmosphère porteuse, tension diffuse réelle ».
 *                Cas ch.25 : verdict HUMAIN KEEP. Loi scellée « atmosphère lourde
 *                ≠ ventre mou » — ne pas sur-pénaliser l'atmosphère (FAIL partiel
 *                du proxy TRANSITION reconnu par les deux tribunaux).
 *
 * MÉCANISME — trois signaux mesurables par chapitre :
 *   (1) drama   = hits REVELATION + CONFRONTATION + ACTION (SSOT arc-coherence,
 *                 jamais re-dérivé — leçon C1) ;
 *   (2) vide    = comfortRatio (editorial-scanners) + faible nouveauté trigramme ;
 *   (3) atmo    = densité de marqueurs sensoriels (VAKOG) /1000 mots + variance
 *                 rythmique (CV des longueurs de phrase) = proxy d'« ambiance ».
 * Seuils RELATIFS au lot trié (terciles) : un seuil absolu ne tient pas d'un style
 * à l'autre (leçon arc-coherence — au seuil absolu, tout tombait en TRANSITION).
 * Le triage est donc un CLASSEMENT (lequel des 19 est le plus / le moins
 * défendable), pas un oracle binaire.
 *
 * LIMITES (honnêteté EMP-17) : la densité sensorielle est un PROXY d'atmosphère,
 * pas l'atmosphère ; les poids du composite sont EXPERIMENTAL — les signaux BRUTS
 * sont exposés pour que la décision 3-IA porte sur les nombres, pas sur mes poids.
 * CE QUI CASSERAIT : une atmosphère portée par la SYNTAXE pure sans lexique
 * sensoriel (litote extrême) — sous-détectée (faux CUT possible → d'où le tercile,
 * jamais le couperet).
 *
 * INV-TRIAGE-001 : ce module ne renvoie qu'un CLASSEMENT + des signaux ; il ne
 *   modifie aucun chapitre.
 * INV-TRIAGE-002 : un chapitre portant ≥2 marqueurs dramatiques ne peut JAMAIS
 *   être CUT_MERGE (il fait un acte — ce n'est pas une transition vide).
 */

import { ACTION_RE, CONFRONT_RE, REVELATION_RE } from '../coherence/arc-coherence.js';
import { scanComfortSentences } from './editorial-scanners.js';

/* ————— Lexique sensoriel VAKOG (proxy d'atmosphère, FR, EXPERIMENTAL) —————
 * Stems préfixés \b ; les courts ambigus (« sel », « vent », « brise ») sont
 * exacts pour éviter selon/ventre/briser. Documenté comme PROXY, pas vérité. */
const SENSORY_RE = new RegExp(
  '\\b(?:lumi[èe]r|lueur|ombre|p[ée]nombr|sombre|obscur|noir|gris|p[âa]le|blafard|' +
  'reflet|brill|luis|scintill|terne|bruit|silence|craqu|grinc|murmur|[ée]cho|' +
  'r[ée]sonn|claqu|souffl|sifflement|cliquetis|fracas|chuchot|g[ée]mi|odeur|' +
  'senteur|parfum|relent|moisi|froid|glac|gel[ée]|humide|moite|rugueux|lisse|' +
  'poisseux|frisson|br[ûu]l|ti[èe]de)[\\p{L}]*',
  'giu',
);
const SENSORY_EXACT_RE = /\b(?:sel|iode|vent|vents|brise)\b/giu;

/** Densité de marqueurs sensoriels pour 1000 mots (proxy d'atmosphère). */
export function atmosphereDensity(prose: string): number {
  const words = prose.split(/\s+/u).filter((w) => w.length > 0).length;
  if (words === 0) return 0;
  const hits = (prose.match(SENSORY_RE) ?? []).length + (prose.match(SENSORY_EXACT_RE) ?? []).length;
  return Number(((hits / words) * 1000).toFixed(2));
}

/** Coefficient de variation des longueurs de phrase (en mots). 0 si < 2 phrases.
 *  Une atmosphère « lourde » alterne souvent phrases longues et brèves (rythme). */
export function rhythmCV(prose: string): number {
  const sents = prose.split(/(?<=[.!?…»])\s+/u).map((s) => s.trim()).filter((s) => s.length > 0);
  if (sents.length < 2) return 0;
  const lens = sents.map((s) => s.split(/\s+/u).filter((w) => w.length > 0).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  if (mean === 0) return 0;
  const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
  return Number((Math.sqrt(variance) / mean).toFixed(3));
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export interface TriageSignals {
  readonly chapter: number;
  /** Hits dramatiques (REVELATION + CONFRONTATION + ACTION) — SSOT arc-coherence. */
  readonly dramaHits: number;
  readonly comfortRatio: number;
  /** Nouveauté trigramme vs chapitres précédents (0..1). Bas = redite. */
  readonly noveltyVsPrev: number;
  readonly atmosphereDensity: number;
  readonly rhythmCV: number;
  /** Composite atmosphère 0..1 (EXPERIMENTAL : 0.6·densité + 0.4·rythme). */
  readonly atmoScore: number;
  /** Composite vide 0..1 (EXPERIMENTAL : 0.6·confort + 0.4·(1−nouveauté)). */
  readonly emptiness: number;
}

export type TriageBucket = 'CUT_MERGE' | 'REINFORCE' | 'KEEP';

export interface TriageRow extends TriageSignals {
  readonly bucket: TriageBucket;
  readonly rationale: string;
}

function dramaHits(prose: string): number {
  const count = (re: RegExp): number => (prose.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)) ?? []).length;
  return count(REVELATION_RE) + count(CONFRONT_RE) + count(ACTION_RE);
}

/** Signaux bruts d'un chapitre. `noveltyVsPrev` injecté (calculé par l'arc). */
export function transitionSignals(chapter: number, prose: string, noveltyVsPrev = 1): TriageSignals {
  const comfort = scanComfortSentences(prose);
  const atmo = atmosphereDensity(prose);
  const cv = rhythmCV(prose);
  // Densité typique ~0–40/1000w ; CV ~0–0.8. Normalisations documentées.
  const atmoScore = Number((clamp01(atmo / 40) * 0.6 + clamp01(cv / 0.8) * 0.4).toFixed(3));
  const emptiness = Number((clamp01(comfort.comfortRatio) * 0.6 + clamp01(1 - noveltyVsPrev) * 0.4).toFixed(3));
  return {
    chapter, dramaHits: dramaHits(prose), comfortRatio: comfort.comfortRatio,
    noveltyVsPrev: Number(noveltyVsPrev.toFixed(3)), atmosphereDensity: atmo, rhythmCV: cv, atmoScore, emptiness,
  };
}

function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

/**
 * Trie un lot de chapitres-signaux en CUT_MERGE / REINFORCE / KEEP par terciles
 * RELATIFS d'atmosphère. Déterministe, pur. NE coupe rien (INV-TRIAGE-001).
 */
export function triageTransitions(signals: readonly TriageSignals[]): readonly TriageRow[] {
  if (signals.length === 0) return [];
  const atmoVals = signals.map((s) => s.atmoScore);
  const emptVals = signals.map((s) => s.emptiness);
  const tHi = quantile(atmoVals, 2 / 3);
  const tLo = quantile(atmoVals, 1 / 3);
  const emptMed = quantile(emptVals, 0.5);
  return signals
    .map((s): TriageRow => {
      let bucket: TriageBucket;
      let why: string;
      if (s.dramaHits >= 2) {
        bucket = 'KEEP'; // INV-TRIAGE-002 : porte un acte dramatique
        why = `${s.dramaHits} marqueurs dramatiques — fait un acte, pas une transition vide`;
      } else if (s.atmoScore >= tHi) {
        bucket = 'KEEP';
        why = `atmosphère défendable (atmoScore ${s.atmoScore} ≥ tercile haut ${Number(tHi.toFixed(3))}) — leçon ch.25, ne pas sur-pénaliser`;
      } else if (s.atmoScore <= tLo && s.emptiness >= emptMed && s.dramaHits === 0) {
        bucket = 'CUT_MERGE';
        why = `vide réel : atmoScore ${s.atmoScore} ≤ tercile bas ${Number(tLo.toFixed(3))}, vide ${s.emptiness} ≥ médiane ${Number(emptMed.toFixed(3))}, zéro acte`;
      } else {
        bucket = 'REINFORCE';
        why = `ambiance présente mais mince (atmoScore ${s.atmoScore}, vide ${s.emptiness}) — ajouter un acte/décision/micro-révélation`;
      }
      return { ...s, bucket, rationale: why };
    })
    .sort((a, b) => a.chapter - b.chapter);
}
