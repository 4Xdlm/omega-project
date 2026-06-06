/**
 * OMEGA Book-Factory — C9.2 COHÉRENCE NIVEAU CHAPITRE (BF-08, ADVISORY).
 *
 * Trois contrôles INTRA-chapitre, par scan ordonné des phrases :
 *   - LOCATION_JUMP   : le lieu actif change sans verbe de déplacement dans une
 *                       fenêtre de ±2 phrases (téléportation silencieuse) ;
 *   - TIME_REGRESSION : régression du moment de la journée (soir→matin…) sans
 *                       marqueur de nouvelle journée (« le lendemain », réveil…) ;
 *   - GHOST_SPEAKER   : personnage marqué SORTI de scène à qui la prose attribue
 *                       ensuite un dialogue sans marqueur de retour.
 *
 * MÉCANISME : automates lexicaux FR, mêmes règles de phrase que sentence-physics
 * (splitSentences partagé ⇒ loci comparables). Déterminisme total.
 * LIMITES : lexique de lieux FINI (configurable — défaut = lieux du Silence du
 * Phare) ; les analepses légitimes peuvent déclencher TIME_REGRESSION (ADVISORY
 * assume) ; l'attribution de dialogue est détectée par incise « dit X » et
 * variantes — un dialogue non incisé échappe au contrôle (faux négatif possible,
 * jamais faux positif par construction de ce chemin).
 */

import type { ChapterCoherenceSignal, CoherenceResult } from './coherence-types.js';
import { splitSentences, excerptOf } from './coherence-types.js';
import { err, ok } from '../identity/identity-types.js';

/** Lexique de lieux par défaut — décor « Le Silence du Phare ». Injectable. */
export const DEFAULT_LOCATION_LEXICON: readonly string[] = [
  'phare', 'cuisine', 'mairie', 'plage', 'port', 'archives', 'café', 'église',
  'cimetière', 'falaise', 'bureau', 'quai', 'cale', 'grenier', 'cave', 'chapelle',
  'presbytère', 'halle', 'criée', 'jetée', 'lande',
];

/** Verbes de déplacement — légitiment un changement de lieu proche. */
const MOVE_RE = /\b(marche|marcha|monte|monta|descend|descendit|entre|entra|sort|sortit|traverse|traversa|rejoint|rejoignit|arrive|arriva|quitte|quitta|retourne|retourna|gagne|gagna|s[''](?:approche|approcha|éloigne|éloigna)|se\s+dirige|se\s+dirigea|pousse\s+la\s+porte|franchit|grimpe|grimpa|court|courut|suit|suivit|longe|longea|revient|revint)\b/u;

/** Moments de la journée, ordonnés. Régression = index qui recule. */
const DAY_PHASES: readonly { readonly re: RegExp; readonly order: number; readonly label: string }[] = [
  { re: /\b(aube|aurore|petit\s+matin|lever\s+du\s+jour)\b/u, order: 0, label: 'aube' },
  { re: /\bmatin(?:ée)?\b/u, order: 1, label: 'matin' },
  { re: /\bmidi\b/u, order: 2, label: 'midi' },
  { re: /\baprès-midi\b/u, order: 3, label: 'après-midi' },
  { re: /\b(crépuscule|tombée\s+du\s+jour|couchant)\b/u, order: 4, label: 'crépuscule' },
  { re: /\bsoir(?:ée)?\b/u, order: 5, label: 'soir' },
  { re: /\b(nuit|minuit)\b/u, order: 6, label: 'nuit' },
];

/** Marqueurs qui LÉGITIMENT une régression (nouvelle journée, réveil, analepse). */
const NEW_DAY_RE = /\b(lendemain|jour\s+suivant|au\s+réveil|se\s+réveilla|s[''](?:éveille|éveilla)|le\s+jour\s+d[''](?:après)|une\s+semaine|des\s+jours\s+plus\s+tard|la\s+veille|autrefois|jadis|des\s+années\s+plus\s+tôt|souvenir|se\s+souvenait|revoyait)\b/u;

/** Sortie de scène d'un personnage (groupe 1 = prénom capitalisé). */
const EXIT_RE = /\b([A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})\s+(?:sort|sortit|part|partit|s[''](?:éloigne|éloigna)|disparaît|disparut|quitt[ae]|tourna\s+les\s+talons|s[''](?:en\s+va|en\s+alla))\b/u;
/** Retour en scène (groupe 1 = prénom). */
const RETURN_RE = /\b([A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})\s+(?:revient|revint|entre|entra|rejoignit|rejoint|reparaît|reparut|surgit|était\s+revenu)\b|\bsur\s+le\s+seuil,?\s+([A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})\b/u;
/** Attribution de dialogue (groupe 1 = prénom) : « … », dit X / lança X / etc. */
const SPEAK_RE = /(?:dit|dis|lança|murmura|souffla|répondit|répliqua|reprit|demanda|cria|chuchota|grogna|ajouta)\s+([A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})\b/u;

export interface ChapterCoherenceOptions {
  /** Lexique de lieux (défaut : décor Phare). */
  readonly locations?: readonly string[];
  /** Fenêtre (phrases) autour d'un changement de lieu où chercher un déplacement. */
  readonly moveWindow?: number;
}

/** Scanne un chapitre : signaux lieu/temps/présence, ordre de lecture. Pur. */
export function scanChapterCoherence(
  prose: string,
  chapter: number,
  opts: ChapterCoherenceOptions = {},
): CoherenceResult<readonly ChapterCoherenceSignal[]> {
  if (prose.trim().length === 0) return err({ code: 'EMPTY_INPUT', detail: 'prose vide' });
  if (!Number.isInteger(chapter) || chapter < 1) {
    return err({ code: 'INVALID_CHAPTER_NUMBER', detail: `chapter=${chapter}` });
  }
  const locations = (opts.locations ?? DEFAULT_LOCATION_LEXICON).map((l) => l.normalize('NFC').toLowerCase());
  const moveWindow = opts.moveWindow ?? 2; // EXPERIMENTAL_DEFAULT
  const sentences = splitSentences(prose);
  const lowers = sentences.map((s) => s.toLowerCase());
  const signals: ChapterCoherenceSignal[] = [];

  /* ── 1. LIEU — téléportation silencieuse ─────────────────────────────── */
  // PRÉSENCE ≠ MENTION : « il parlait du phare » ne situe pas la scène au phare.
  // Une mention ne devient lieu ACTIF que précédée d'un marqueur locatif fort.
  let activeLocation: string | null = null;
  let activeAt = -1;
  lowers.forEach((s, i) => {
    const found = locations.find((loc) =>
      new RegExp(`\\b(?:au|à\\s+la|dans\\s+l[ae]s?|dans\\s+(?:ce|cette|son|sa|leur)|vers\\s+l[ae]s?|devant\\s+l[ae]s?|sous\\s+l[ae]s?|jusqu[''](?:au|à\\s+la)|sur\\s+l[ae]s?)\\s+(?:\\w+\\s+)?${loc}\\b`, 'u').test(s)
      || new RegExp(`^l[ae]s?\\s+${loc}\\b`, 'u').test(s)); // lieu-sujet : « La cuisine sentait… »
    if (found === undefined) return;
    if (activeLocation !== null && found !== activeLocation && i - activeAt <= 12) {
      // Changement de lieu actif : un déplacement doit exister à ±moveWindow.
      const lo = Math.max(0, i - moveWindow);
      const hi = Math.min(lowers.length - 1, i + moveWindow);
      let moved = false;
      for (let k = lo; k <= hi; k++) {
        const sk = lowers[k];
        if (sk !== undefined && MOVE_RE.test(sk)) { moved = true; break; }
      }
      if (!moved) {
        const sent = sentences[i];
        signals.push({
          kind: 'LOCATION_JUMP',
          severity: 'INFO',
          locus: { chapter, sentenceIndex: i, excerpt: excerptOf(sent ?? '') },
          detail: `« ${activeLocation} » → « ${found} » sans verbe de déplacement à ±${moveWindow} phrases`,
        });
      }
    }
    activeLocation = found;
    activeAt = i;
  });

  /* ── 2. TEMPS INTERNE — régression de phase du jour ──────────────────── */
  let phase = -1;
  let phaseLabel = '';
  lowers.forEach((s, i) => {
    const hit = DAY_PHASES.find((p) => p.re.test(s));
    if (hit === undefined) return;
    if (phase >= 0 && hit.order < phase && !NEW_DAY_RE.test(s)) {
      // chercher la légitimation dans les 2 phrases précédentes aussi
      const prev1 = lowers[i - 1] ?? '';
      const prev2 = lowers[i - 2] ?? '';
      if (!NEW_DAY_RE.test(prev1) && !NEW_DAY_RE.test(prev2)) {
        const sent = sentences[i];
        signals.push({
          kind: 'TIME_REGRESSION',
          severity: 'INFO',
          locus: { chapter, sentenceIndex: i, excerpt: excerptOf(sent ?? '') },
          detail: `« ${phaseLabel} » → « ${hit.label} » sans marqueur de nouvelle journée`,
        });
      }
    }
    phase = hit.order;
    phaseLabel = hit.label;
  });

  /* ── 3. PRÉSENCE — fantôme qui parle ─────────────────────────────────── */
  const gone = new Map<string, number>(); // prénom → index de sortie
  sentences.forEach((sentence, i) => {
    const exit = EXIT_RE.exec(sentence);
    if (exit !== null && exit[1] !== undefined) gone.set(exit[1], i);
    const ret = RETURN_RE.exec(sentence);
    if (ret !== null) {
      const name = ret[1] ?? ret[2];
      if (name !== undefined) gone.delete(name);
    }
    const speak = SPEAK_RE.exec(sentence);
    if (speak !== null && speak[1] !== undefined) {
      const name = speak[1];
      const exitedAt = gone.get(name);
      if (exitedAt !== undefined && i > exitedAt) {
        signals.push({
          kind: 'GHOST_SPEAKER',
          severity: 'WARN',
          locus: { chapter, sentenceIndex: i, excerpt: excerptOf(sentence) },
          detail: `${name} parle (phrase ${i}) alors que sorti de scène (phrase ${exitedAt}) sans marqueur de retour`,
        });
        gone.delete(name); // un seul signal par sortie — pas de spam
      }
    }
  });

  return ok(signals);
}
