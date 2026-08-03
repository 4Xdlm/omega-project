/**
 * OMEGA — DEGENERATION_VETO : détection de l'effondrement de génération.
 *
 * POURQUOI CE MODULE EXISTE (fait mesuré, 2026-08-03)
 * ═══════════════════════════════════════════════════
 * Le z = −10,40 de LEGION (juin) sur `trigram_distinct` était contaminé par des
 * chapitres EFFONDRÉS : `BOOK_FULL_1776125356560/chapter_01` contient 593 fois
 * la même phrase (« Elle est la fissure. »), 70,4 % de phrases dupliquées.
 * 9 chapitres sur 20 du run de juin présentaient une dégénérescence.
 *
 * POURQUOI PAS `repetition-sensor` (audit anti-doublon, 2026-08-03)
 * ════════════════════════════════════════════════════════════════
 * `measureRepetition` (coherence/repetition-sensor.ts:82) filtre les phrases
 * < 5 mots. Or l'effondrement de juin est fait de phrases COURTES : « Elle
 * marche. » (2 mots), « Elle est la fissure. » (4 mots). Le capteur existant est
 * AVEUGLE au cas réel — vérifié sur le texte de juin. Il ne mesure pas non plus
 * les SÉRIES consécutives (l'ordre), seulement des comptes. D'où ce module :
 * même normalisation de phrase que le capteur (cohérence inter-capteurs), mais
 * seuil à 2 mots et détection de série. Verdict d'audit : EXTEND, pas doublon.
 *
 * SEUILS — DÉRIVÉS DU CORPUS, JAMAIS ARBITRAIRES (calibration 2026-08-03)
 * ═══════════════════════════════════════════════════════════════════════
 * Mesuré sur 41 romans FR publiés pleins (thriller + contemporain), 10 chapitres
 * N9 sains, 20 chapitres de juin (dont 9 dégénérés) — même normalisation :
 *
 *                        runMax   dupRatio   domShare
 *   PUBLIÉ (max observé)    3       0,0353     0,0113
 *   N9 sain (max)           1       0          —
 *   JUIN dégénéré clair    ≥3       0,20–0,70  0,03–0,63
 *
 * Les seuils de veto sont posés LÀ OÙ AUCUN LIVRE PUBLIÉ NE VA, avec une marge
 * (×4 sur dupRatio, runMax 3 → 5). Zone WATCH entre le max publié et le veto.
 * Données : /tmp/m0/DEGEN_CALIBRATION.json, archivées dans le rapport du 3 août.
 */

export type DegenVerdict = 'CLEAN' | 'WATCH' | 'GENERATION_COLLAPSE';

export interface DegenReport {
  readonly verdict: DegenVerdict;
  /** Nombre de phrases retenues (≥ 2 mots après normalisation). */
  readonly sentences: number;
  /** Plus longue série de phrases consécutives IDENTIQUES. */
  readonly maxConsecutiveRun: number;
  /** Part de phrases qui sont des doublons d'une phrase déjà vue. */
  readonly duplicateRatio: number;
  /** Part de la phrase la plus fréquente dans le total. */
  readonly dominantShare: number;
  /** La phrase dominante (traçabilité du journal d'admission). */
  readonly dominantSentence: string;
}

/** Seuils gelés, dérivés du corpus (voir en-tête). Export pour les tests.
 *
 *  RÈGLE DE CONVERGENCE (amendement ChatGPT, appliqué AVEC une correction
 *  vérifiée sur les données, 2026-08-03) : l'amendement visait le faux positif
 *  « répétition littéraire volontaire ». Ce risque n'existe que pour runMax —
 *  une anaphore délibérée peut faire 5-7 répétitions consécutives SANS dupliquer
 *  le chapitre. Il n'existe PAS pour dupRatio ≥ 0,15 : c'est un cinquième du
 *  chapitre en doublons, 4× au-delà du PIRE livre publié (0,0353) — aucune
 *  intention littéraire ne produit ça à l'échelle d'un chapitre. Vérification :
 *  la convergence stricte 2-signaux aurait laissé passer 3 des 4 vrais
 *  effondrements de juin (dup 0,20-0,24 mais domShare 0,03-0,05). Donc :
 *    VETO  : runMax ≥ 8 (catastrophique)
 *            OU dupRatio ≥ 0,15 (aucun humain n'y va, seuil autosuffisant)
 *            OU runMax ≥ 5 ET convergence (dup ≥ 0,05 ou domShare ≥ 0,10)
 *    WATCH : tout signal isolé restant.
 *  Les 4 effondrements de juin restent vetotés ; 0 livre publié n'atteint
 *  aucun signal de veto ; l'anaphore volontaire (run 5-7 isolé) tombe en WATCH. */
export const DEGEN_THRESHOLDS = {
  /** Série catastrophique : veto immédiat, aucun doute possible (publié max 3). */
  catastrophicRun: 8,
  /** Signaux individuels (chacun déjà au-dessus de tout le corpus publié). */
  vetoRun: 5,
  /** Publié max observé : 0,0353. Signal à 0,15 (juin dégénéré : ≥ 0,20). */
  vetoDupRatio: 0.15,
  /** Publié max observé : 0,0113. Signal à 0,10. */
  vetoDominantShare: 0.1,
  /** Zone WATCH : au-dessus du max publié, sous le veto. */
  watchRun: 4,
  watchDupRatio: 0.05,
  publishedMaxRun: 3,
  publishedMaxDupRatio: 0.0353,
} as const;

/** Même normalisation que repetition-sensor (cohérence inter-capteurs). */
function normSentence(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôöûüç ]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function splitSentences(text: string): readonly string[] {
  return text
    .split(/(?<=[.!?…»])\s+/u)
    .map((s) => normSentence(s))
    .filter((s) => s.split(' ').length >= 2); // ≥ 2 mots : couvre « Elle marche. »
}

export function measureDegeneration(text: string): DegenReport {
  const sents = splitSentences(text);
  if (sents.length < 20) {
    // Trop court pour établir une population : jamais de veto sur un fragment.
    return {
      verdict: 'CLEAN',
      sentences: sents.length,
      maxConsecutiveRun: 0,
      duplicateRatio: 0,
      dominantShare: 0,
      dominantSentence: '',
    };
  }

  const counts = new Map<string, number>();
  let maxRun = 1;
  let run = 1;
  for (let i = 0; i < sents.length; i += 1) {
    const s = sents[i] as string;
    counts.set(s, (counts.get(s) ?? 0) + 1);
    if (i > 0 && s === sents[i - 1]) {
      run += 1;
      if (run > maxRun) maxRun = run;
    } else {
      run = 1;
    }
  }

  let dominantSentence = '';
  let dominantCount = 0;
  for (const [s, c] of counts) {
    if (c > dominantCount) {
      dominantCount = c;
      dominantSentence = s;
    }
  }
  const duplicateRatio = (sents.length - counts.size) / sents.length;
  const dominantShare = dominantCount / sents.length;

  const T = DEGEN_THRESHOLDS;
  const runConverges =
    maxRun >= T.vetoRun && (duplicateRatio >= T.watchDupRatio || dominantShare >= T.vetoDominantShare);
  let verdict: DegenVerdict = 'CLEAN';
  if (maxRun >= T.catastrophicRun || duplicateRatio >= T.vetoDupRatio || runConverges) {
    verdict = 'GENERATION_COLLAPSE';
  } else if (
    maxRun >= T.watchRun ||
    duplicateRatio >= T.watchDupRatio ||
    dominantShare >= T.vetoDominantShare
  ) {
    verdict = 'WATCH';
  }

  return {
    verdict,
    sentences: sents.length,
    maxConsecutiveRun: maxRun,
    duplicateRatio,
    dominantShare,
    dominantSentence,
  };
}
