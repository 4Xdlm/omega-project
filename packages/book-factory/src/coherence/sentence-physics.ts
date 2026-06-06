/**
 * OMEGA Book-Factory — C9.1 COHÉRENCE NIVEAU PHRASE — micro-physique (BF-08, ADVISORY).
 *
 * Machine d'état lexicale FR scannant les phrases d'un chapitre DANS L'ORDRE :
 *   - pieds/chaussures : SHOD ⇄ BAREFOOT — transition illégale = signal ;
 *   - objets sortis/tenus : sorti deux fois sans rangement = signal ;
 *   - portes : ouverte deux fois sans fermeture intermédiaire = signal.
 *
 * Cas d'origine (run 60k, ch.1, RÉEL) : « Elle avance pieds nus, la semelle de
 * ses bottes restée accrochée à la porte » — bottes établies plus haut, aucun
 * retrait : FOOTWEAR_CONTRADICTION. Ce cas exact = fixture de test (INV-PHYS-001).
 *
 * MÉCANISME : automate à états par catégorie, transitions par lexique. Détection
 * = transition interdite. Aucun LLM, déterminisme total (INV-PHYS-002).
 * LIMITES (documentées, assumées en ADVISORY) :
 *   - flashbacks/ellipses légitimes → faux positifs possibles ;
 *   - un seul porteur suivi (pas de résolution par personnage en V1 : le sujet
 *     dominant des chapitres OMEGA est le POV — mesuré suffisant sur le 60k) ;
 *   - lexique fini → faux négatifs hors lexique. C'est un FILET, pas un juge.
 * CE QUI CASSERAIT : prose non-FR ; scènes multi-POV denses (V2 : résolution
 * par sujet via CharacterRegistry).
 */

import type { SentencePhysicsSignal, CoherenceResult } from './coherence-types.js';
import { splitSentences, excerptOf } from './coherence-types.js';
import { err, ok } from '../identity/identity-types.js';

/* ── Lexiques de transition (FR, minuscules, sans accents retirés : NFC) ── */

/** Établit l'état CHAUSSÉ. */
const SHOD_RE = /\b(enfile|met|remet|rechausse|lace|laça)\b[^.!?…]{0,40}\b(bottes?|chaussures?|souliers?|sandales?)\b|\b(ses|les)\s+(bottes?|chaussures?|souliers?)\s+(aux\s+pieds|lacées?)\b|\ben\s+bottes?\b/u;
/** Mention de chaussures portées (établissement faible — porteur probable). */
const SHOD_WEAK_RE = /\b(ses|sa|son)\s+(bottes?|chaussures?|souliers?|sandales?)\b/u;
/** Retrait légal — autorise la transition vers BAREFOOT. Couvre présent, passé
 *  simple ET formes composées (« a ôté », « avait retiré »). ATTENTION : \b de
 *  JS ne fonctionne PAS devant une lettre accentuée (« ôté » n'a jamais de word
 *  boundary) — lookarounds \p{L} obligatoires (trou attrapé sur la réparation
 *  V1 du 60k : « Elle a ôté ses bottes » non reconnu par la version \b). */
const UNSHOD_RE = /(?<!\p{L})(retire|enlève|ôte|ota|ôté|retiré|enlevé|déchausse|déchaussée?|arrache|arraché)(?!\p{L})[^.!?…]{0,40}(?<!\p{L})(bottes?|chaussures?|souliers?|sandales?)(?!\p{L})|se\s+déchausse|s[''](?:est\s+)?déchaussée?(?!\p{L})/u;
/** État PIEDS NUS observé. */
const BAREFOOT_RE = /\bpieds?\s+nus?\b/u;

/** Objet sorti/saisi : capture le nom d'objet (groupe 2). */
const DRAW_RE = /\b(sort|sortit|saisit|saisis|dégaine|empoigne|brandit|tire)\b\s+(?:son|sa|ses|le|la|les|un|une)\s+([a-zàâçéèêëîïôûùüÿ-]{3,})/u;
/** Objet posé/rangé/lâché : capture le nom d'objet (groupe 2). */
const STOW_RE = /\b(pose|posa|range|rangea|lâche|lâcha|jette|jeta|repose|glisse|glissa|remet|remit)\b\s+(?:son|sa|ses|le|la|les)\s+([a-zàâçéèêëîïôûùüÿ-]{3,})/u;

/** Porte ouverte / fermée (même porte supposée dans la fenêtre d'un chapitre). */
const DOOR_OPEN_RE = /\b(ouvre|ouvrit|pousse|poussa|entrouvre|entrouvrit)\b[^.!?…]{0,30}\bportes?\b|\bportes?\s+s[''](ouvre|ouvrit|entrouvre)\b/u;
/** Négation devant le verbe d'ouverture — « ne pousse pas la porte » n'arme RIEN. */
const DOOR_OPEN_NEG_RE = /\b(?:ne|n[''])\s*(?:ouvre|ouvrit|pousse|poussa|entrouvre|entrouvrit)\b|\bportes?\s+ne\s+s[''](?:ouvre|ouvrit)\b/u;
const DOOR_CLOSE_RE = /\b(ferme|ferma|referme|referma|claque|claqua|verrouille|verrouilla)\b[^.!?…]{0,30}\bportes?\b|\bportes?\s+(se\s+referme|claqua|se\s+ferma)\b/u;

type FootState = 'UNKNOWN' | 'SHOD' | 'BAREFOOT';

export interface SentencePhysicsOptions {
  /** Fenêtre max (en phrases) entre établissement et contradiction — au-delà,
   *  l'état expire (scène probablement changée). EXPERIMENTAL_DEFAULT. */
  readonly stateWindowSentences?: number;
}

/**
 * Scanne un chapitre et retourne les signaux micro-physiques, ordre de lecture.
 * Pur, déterministe : même prose ⇒ mêmes signaux (INV-PHYS-002).
 */
export function scanSentencePhysics(
  prose: string,
  chapter: number,
  opts: SentencePhysicsOptions = {},
): CoherenceResult<readonly SentencePhysicsSignal[]> {
  if (prose.trim().length === 0) return err({ code: 'EMPTY_INPUT', detail: 'prose vide' });
  if (!Number.isInteger(chapter) || chapter < 1) {
    return err({ code: 'INVALID_CHAPTER_NUMBER', detail: `chapter=${chapter}` });
  }
  const win = opts.stateWindowSentences ?? 40; // EXPERIMENTAL_DEFAULT — ~1 scène
  const sentences = splitSentences(prose);
  const signals: SentencePhysicsSignal[] = [];

  let foot: FootState = 'UNKNOWN';
  let footEvidence = '';
  let footAt = -1;

  const drawn = new Map<string, { at: number; evidence: string }>();
  let doorOpenAt = -1;
  let doorEvidence = '';

  const lower = (s: string): string => s.toLowerCase();

  sentences.forEach((sentence, i) => {
    const s = lower(sentence);

    /* — expiration de fenêtre (état trop ancien = scène probablement close) — */
    if (foot !== 'UNKNOWN' && footAt >= 0 && i - footAt > win) foot = 'UNKNOWN';
    if (doorOpenAt >= 0 && i - doorOpenAt > win) doorOpenAt = -1;
    for (const [k, v] of drawn) if (i - v.at > win) drawn.delete(k);

    /* ── 1. PIEDS / CHAUSSURES ─────────────────────────────────────────── */
    const unshod = UNSHOD_RE.test(s);
    const barefoot = BAREFOOT_RE.test(s);
    const shodStrong = SHOD_RE.test(s);
    const shodWeak = SHOD_WEAK_RE.test(s);

    if (unshod) {
      foot = 'BAREFOOT';
      footEvidence = excerptOf(sentence);
      footAt = i;
    } else if (barefoot) {
      if (foot === 'SHOD') {
        signals.push({
          kind: 'FOOTWEAR_CONTRADICTION',
          severity: 'WARN',
          locus: { chapter, sentenceIndex: i, excerpt: excerptOf(sentence) },
          established: footEvidence,
          contradiction: excerptOf(sentence),
        });
      } else if (foot !== 'BAREFOOT' && SHOD_WEAK_RE.test(s)) {
        // Cas réel ch.1 60k, INTRA-phrase : « pieds nus, la semelle de ses
        // bottes restée accrochée à la porte » — chaussures possédées et pieds
        // nus dans la MÊME phrase, sans retrait préalable dans la fenêtre :
        // transition élidée = INFO (l'auteur a peut-être élidé sciemment).
        signals.push({
          kind: 'FOOTWEAR_CONTRADICTION',
          severity: 'INFO',
          locus: { chapter, sentenceIndex: i, excerpt: excerptOf(sentence) },
          established: excerptOf(sentence),
          contradiction: excerptOf(sentence),
        });
      }
      foot = 'BAREFOOT';
      footEvidence = excerptOf(sentence);
      footAt = i;
    } else if (shodStrong || shodWeak) {
      // Mention faible : n'écrase PAS un BAREFOOT récent (relique descriptive,
      // ex. « la semelle de ses bottes restée accrochée » après être pieds nus).
      if (shodStrong || foot !== 'BAREFOOT') {
        foot = 'SHOD';
        footEvidence = excerptOf(sentence);
        footAt = i;
      }
    }

    /* ── 2. OBJETS SORTIS DEUX FOIS ────────────────────────────────────── */
    const draw = DRAW_RE.exec(s);
    if (draw !== null) {
      const obj = draw[2] ?? '';
      if (obj.length > 0) {
        const prior = drawn.get(obj);
        if (prior !== undefined) {
          signals.push({
            kind: 'OBJECT_REDRAWN',
            severity: 'INFO',
            locus: { chapter, sentenceIndex: i, excerpt: excerptOf(sentence) },
            established: prior.evidence,
            contradiction: excerptOf(sentence),
          });
        }
        drawn.set(obj, { at: i, evidence: excerptOf(sentence) });
      }
    }
    const stow = STOW_RE.exec(s);
    if (stow !== null) {
      const obj = stow[2] ?? '';
      drawn.delete(obj);
    }

    /* ── 3. PORTES ─────────────────────────────────────────────────────── */
    if (DOOR_CLOSE_RE.test(s)) {
      doorOpenAt = -1;
    } else if (DOOR_OPEN_RE.test(s) && !DOOR_OPEN_NEG_RE.test(s)) {
      if (doorOpenAt >= 0) {
        signals.push({
          kind: 'DOOR_REOPENED',
          severity: 'INFO',
          locus: { chapter, sentenceIndex: i, excerpt: excerptOf(sentence) },
          established: doorEvidence,
          contradiction: excerptOf(sentence),
        });
      }
      doorOpenAt = i;
      doorEvidence = excerptOf(sentence);
    }
  });

  return ok(signals);
}
