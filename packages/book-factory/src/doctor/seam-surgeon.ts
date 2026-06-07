/**
 * OMEGA Book-Factory — R6_SEAM_SURGEON / CONTINUITY_WEAVER (BF-08).
 * CONCEPT-SEAM-SURGEON-001 — mandat tribunal 2/2 + Architecte (2026-06-07) :
 * « un technicien spécial qui ne sait faire QUE les raccords et les jonctions
 * de continuité, avec consultation des Bibles pour ne pas éclater la cohérence. »
 *
 * DOCTRINE (fusion Gemini+ChatGPT, corrigée) :
 *   - Le code DÉTECTE, BORNE, VÉRIFIE, REFUSE, HASHE. Le LLM ne fait que
 *     PROPOSER une micro-réparation. Jamais « remplacer le code par
 *     l'intelligence » — le chirurgien opère sous tribunal mécanique.
 *   - Le Scribe écrit. Le Weaver raccorde. Le Doctor contrôle. Le Canon juge.
 *   - SANS état du monde (Bible/RecallPack/entités en scène) : INTERDIT d'agir
 *     → REFUSE(MISSING_WORLD_STATE). Un raccord splendide mais faux est un
 *     mensonge bien coiffé.
 *
 * TROIS VERDICTS (jamais « réparer comme un bourrin ») :
 *   REPAIR      — défaut réel, patch borné validé par les gardes.
 *   KEEP_STYLED — coupe littéraire voulue (« Et puis rien. », reprise « — … »,
 *                 phrase nominale terminée) : on ne détruit pas une ellipse.
 *   ESCALATE    — UNREPAIRABLE_WITH_LOCAL_CONTEXT : ambigu, Bible insuffisante,
 *                 ou patch refusé par les gardes → SURGICAL_REWRITE_SUPERVISED.
 *
 * INVARIANTS (INV-SS-001..008) :
 *   001 fenêtre locale seule · 002 zéro fait canonique nouveau · 003 toute
 *   entité touchée a un RecallPack · 004 POV inchangé · 005 lieu inchangé ·
 *   006 temps inchangé sans marqueur autorisé · 007 zéro répétition créée ·
 *   008 re-scan post-patch obligatoire + patch hashé.
 */

import { sha256 } from '@omega/canon-kernel';

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';
import type { AuthorDecisionLedger } from '../identity/author-seal.js';
import type { LlmRepairPort } from './repair-executor.js';
import { inventedEntities } from './scribe-bridge.js';
import { scanSentencePhysics } from '../coherence/sentence-physics.js';

/* ──────────────────────────── CONTRAT D'ENTRÉE ─────────────────────────── */

export type SeamKind =
  | 'BLOCK_JUNCTION'      // jonction de blocs ordinaire
  | 'EXTENDER_COLLAGE'    // collage chapter-extender (HAUT RISQUE — préventif)
  | 'CHAPTER_END'         // fin de chapitre
  | 'CHAPTER_START'       // début de chapitre
  | 'DIALOGUE_CUT'        // réplique coupée
  | 'TRUNCATION';         // phrase amputée détectée en amont

export interface RecallFact { readonly entity: string; readonly fact: string; }

/** Les 12 entrées obligatoires (protocole de consultation — tribunal). */
export interface SurgeonWorldState {
  readonly chapterId: number;                       // 3
  readonly sceneId: string;                         // 4
  readonly pov: 'FIRST' | 'THIRD';                  // (POV courant)
  readonly location: string;                        // 6
  readonly timeState: string;                       // 7
  readonly activeCharacters: readonly string[];     // 5
  readonly activeObjects: readonly string[];        // 8
  readonly actionInProgress: string;                // 9
  readonly recallPack: readonly RecallFact[];       // 10
  readonly canonConstraints: readonly string[];     // 11 (Bible utile)
  readonly forbiddenPlaces: readonly string[];      // 12 (interdits de vérité)
}

export interface SurgeonCase {
  readonly seamId: string;
  readonly seamKind: SeamKind;
  /** 5 à 10 phrases avant la couture (1) — le patch ne sort JAMAIS d'ici. */
  readonly leftContext: string;
  /** 5 à 10 phrases après la couture (2). */
  readonly rightContext: string;
  /** État du monde — null/incomplet ⇒ REFUSE (interdit d'opérer à l'aveugle). */
  readonly world: SurgeonWorldState | null;
}

/* ─────────────────────────── CONTRAT DE SORTIE ─────────────────────────── */

export type SurgeonAction = 'REPAIR' | 'KEEP_STYLED' | 'ESCALATE';

export interface PatchSeam {
  readonly patchId: string;
  readonly seamId: string;
  readonly action: SurgeonAction;
  /** Nouveau contenu de la FENÊTRE GAUCHE (= leftContext réparé). Vide si KEEP/ESCALATE. */
  readonly replacementText: string;
  readonly changedSpan: { readonly start: number; readonly end: number } | null;
  readonly reason: string;
  readonly bibleRefsUsed: readonly string[];
  readonly entitiesTouched: readonly string[];
  readonly newFactsCreated: false;
  readonly confidence: number;
  readonly patchHash: string;
}

export type SurgeonRefusal = {
  readonly code: 'MISSING_WORLD_STATE';
  readonly detail: string;
};

/* ───────────────────────────── INSTRUMENTS ─────────────────────────────── */

const TERMINATORS = /[.!?…»:]$/u;
const STYLED_RESUME_RE = /^\s*—?\s*(?:…|\.\.\.)/u;
const MAX_PATCH_WORDS = 150;
const MAX_PATCH_SENTENCES = 3;
const NEAR_DUP_THRESHOLD = 0.6;
/** Marqueurs de saut temporel — interdits si timeState ne les autorise pas. */
const TIME_JUMP_RE = /(?:le\s+lendemain|le\s+jour\s+suivant|une\s+semaine\s+plus\s+tard|des\s+années\s+plus\s+tard|le\s+mois\s+suivant|quelques\s+jours\s+plus\s+tard)/iu;

function sentencesOf(block: string): readonly string[] {
  // « ? » » est UNE fin de phrase : jamais de coupe entre la ponctuation et le
  // guillemet fermant (bug attrapé par la fixture : patchs dialogue comptés 4).
  return block.split(/(?<=[.!?…»])\s+(?!»)/u).map((s) => s.trim()).filter((s) => s.length > 0);
}
function wordsOf(s: string): readonly string[] {
  return s.trim().split(/\s+/u).filter((w) => w.length > 0);
}
function jaccardWords(a: string, b: string): number {
  const norm = (s: string): Set<string> => new Set(s.toLowerCase().replace(/[«»".,;:!?…()—-]/gu, ' ').split(/\s+/u).filter((w) => w.length > 0));
  const A = norm(a);
  const B = norm(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}
function quoteDelta(s: string): number {
  let d = 0;
  for (const ch of s) { if (ch === '«') d += 1; else if (ch === '»') d -= 1; }
  return d;
}
function normWs(s: string): string {
  return s.normalize('NFC').replace(/\s+/gu, ' ').trim();
}
function lastSentence(s: string): string {
  return sentencesOf(s).at(-1) ?? s.trim();
}

/** Le bord gauche est-il DÉFECTUEUX ? (terminaison + équilibre + reprise). */
export interface EdgeDiagnosis {
  readonly defective: boolean;
  readonly kind: 'NONE' | 'UNTERMINATED' | 'UNBALANCED_QUOTE' | 'FALSE_START' | 'NEAR_DUP_RESUME' | 'PHYSICS_WARN';
}

export function diagnoseEdge(left: string, right: string, chapterId: number): EdgeDiagnosis {
  const l = left.trimEnd();
  // reprise stylisée « — … » : JAMAIS un défaut.
  if (STYLED_RESUME_RE.test(right)) return { defective: false, kind: 'NONE' };
  // faux-départ : la droite reprend intégralement la gauche (dernier bloc).
  const lastBlock = l.split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0).at(-1) ?? l;
  if (normWs(right).startsWith(normWs(lastBlock)) && normWs(lastBlock).length >= 12) {
    return { defective: true, kind: 'FALSE_START' };
  }
  // reprise quasi-dupliquée.
  const ls = lastSentence(l);
  const rs = sentencesOf(right)[0];
  if (rs !== undefined && wordsOf(ls).length >= 4 && jaccardWords(ls, rs) >= NEAR_DUP_THRESHOLD) {
    return { defective: true, kind: 'NEAR_DUP_RESUME' };
  }
  // terminaison du bord gauche.
  if (!TERMINATORS.test(l)) return { defective: true, kind: 'UNTERMINATED' };
  // équilibre des guillemets de la fenêtre gauche.
  if (quoteDelta(l) !== 0) return { defective: true, kind: 'UNBALANCED_QUOTE' };
  // micro-physique : contradiction DURE (WARN) au bord.
  const phys = scanSentencePhysics(l, chapterId);
  if (phys.ok && phys.value.some((s) => s.severity === 'WARN')) return { defective: true, kind: 'PHYSICS_WARN' };
  return { defective: false, kind: 'NONE' };
}

/* ───────────────────────────── LES GARDES ──────────────────────────────── */

interface GuardContext {
  readonly world: SurgeonWorldState;
  /** Gauche PRÉSERVÉ (hors segment remplacé) — pour la garde anti-répétition. */
  readonly left: string;
  readonly right: string;
  /** TOUT le texte déjà établi (gauche complet + droit) — pour la garde
   *  anti-invention : un mot déjà sur la page n'est jamais « nouveau ». */
  readonly established: string;
  readonly chapterId: number;
}

/** Toutes les raisons de REJETER un patch proposé. Vide = patch admissible. */
export function guardPatch(patch: string, ctx: GuardContext): readonly string[] {
  const reasons: string[] = [];
  const w = ctx.world;

  // bornes (1-3 phrases, ≤150 mots) — au-delà ce n'est plus une couture.
  const sentences = sentencesOf(patch);
  if (sentences.length === 0 || sentences.length > MAX_PATCH_SENTENCES) reasons.push(`PATCH_SENTENCES=${sentences.length} (max ${MAX_PATCH_SENTENCES})`);
  if (wordsOf(patch).length > MAX_PATCH_WORDS) reasons.push(`PATCH_WORDS=${wordsOf(patch).length} (max ${MAX_PATCH_WORDS})`);
  if (!TERMINATORS.test(patch.trimEnd())) reasons.push('PATCH_UNTERMINATED');
  if (quoteDelta(patch) !== 0) reasons.push('PATCH_QUOTE_UNBALANCED');

  // INV-SS-002 : zéro fait nouveau — aucune entité capitalisée inconnue.
  const known = [...w.activeCharacters, ...w.activeObjects, w.location, ...w.forbiddenPlaces];
  const invented = inventedEntities(ctx.established, patch, known);
  if (invented.length > 0) reasons.push(`NEW_ENTITY:${invented.join(',')}`);

  // INV-SS-003 : toute entité ACTIVE touchée par le patch a un RecallFact.
  const recallEntities = new Set(w.recallPack.map((r) => r.entity.normalize('NFC')));
  for (const c of w.activeCharacters) {
    const re = new RegExp(`(?<!\\p{L})${c.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?!\\p{L})`, 'u');
    if (re.test(patch) && !recallEntities.has(c.normalize('NFC'))) reasons.push(`NO_RECALL_FOR:${c}`);
  }

  // INV-SS-004 : POV inchangé — pas de « je » narratif en THIRD (hors dialogue).
  if (w.pov === 'THIRD') {
    const outsideQuotes = patch.replace(/«[^»]*»/gu, ' ').replace(/—[^\n]*$/gmu, ' ');
    if (/(?<!\p{L})je(?!\p{L})/iu.test(outsideQuotes)) reasons.push('POV_SHIFT_JE');
  }

  // INV-SS-005 : lieu inchangé — aucun lieu INTERDIT (autre que le courant).
  for (const p of w.forbiddenPlaces) {
    if (p.length > 2 && new RegExp(`(?<!\\p{L})${p.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?!\\p{L})`, 'iu').test(patch)) {
      reasons.push(`PLACE_SHIFT:${p}`);
    }
  }

  // INV-SS-006 : temps inchangé sans marqueur autorisé.
  if (TIME_JUMP_RE.test(patch) && !/saut/iu.test(w.timeState)) reasons.push('TIME_JUMP_WITHOUT_MARKER');

  // INV-SS-007 : zéro répétition créée aux deux bords. ctx.left = le gauche
  // PRÉSERVÉ (hors segment remplacé) — re-porter les phrases complètes du
  // segment qu'on remplace est de la PRÉSERVATION, pas de la duplication.
  const firstRight = sentencesOf(ctx.right)[0];
  const lastLeft = ctx.left.trim().length > 0 ? lastSentence(ctx.left.trimEnd()) : '';
  for (const s of sentences) {
    if (firstRight !== undefined && jaccardWords(s, firstRight) >= NEAR_DUP_THRESHOLD) reasons.push('REPEAT_VS_RIGHT');
    if (lastLeft.length > 0 && wordsOf(s).length >= 4 && jaccardWords(s, lastLeft) >= NEAR_DUP_THRESHOLD) reasons.push('REPEAT_VS_LEFT');
  }

  // INV-SS-008 (partie physique) : aucune contradiction DURE introduite.
  const phys = scanSentencePhysics(patch, ctx.chapterId);
  if (phys.ok && phys.value.some((s) => s.severity === 'WARN')) reasons.push('PHYSICS_WARN_IN_PATCH');

  return reasons;
}

/* ───────────────────────────── LE CHIRURGIEN ───────────────────────────── */

const STYLED_NOMINAL_RE = /^(?:Et\s+puis\s+rien\.|Rien\.|Plus\s+rien\.|Silence\.|Noir\.)$/iu;

export interface OperateOptions {
  /** Port LLM (scribe-bridge ou stub de test). Absent ⇒ jamais de complétion → ESCALATE. */
  readonly llm?: LlmRepairPort;
  /** SCEAU D'AUTEUR (CONCEPT-AUTHOR-SEAL-001) : consulté AVANT toute action —
   *  un passage scellé est INTOUCHABLE (la machine demande, jamais ne modifie). */
  readonly authorLocks?: AuthorDecisionLedger;
}

/** Opère UNE couture. Pur hors port LLM ; chaque verdict est tracé et hashé. */
export async function operateSeam(c: SurgeonCase, opts: OperateOptions = {}): Promise<Result<PatchSeam, SurgeonRefusal>> {
  /* — Protocole de consultation : SANS état du monde, INTERDIT d'agir — */
  if (c.world === null) {
    return err({ code: 'MISSING_WORLD_STATE', detail: 'Bible/RecallPack/entités absents — le chirurgien refuse d’opérer à l’aveugle.' });
  }
  const w = c.world;
  if (w.activeCharacters.length === 0 && w.activeObjects.length === 0) {
    return err({ code: 'MISSING_WORLD_STATE', detail: 'aucune entité en scène fournie — état du monde incomplet.' });
  }

  const mk = (action: SurgeonAction, replacement: string, reason: string, entities: readonly string[], confidence: number): PatchSeam => {
    const replacementText = action === 'REPAIR' ? replacement : '';
    return {
      patchId: `patch_${c.seamId}`,
      seamId: c.seamId,
      action,
      replacementText,
      changedSpan: action === 'REPAIR' ? { start: 0, end: c.leftContext.length } : null, // INV-SS-001 : fenêtre gauche SEULE
      reason,
      bibleRefsUsed: w.recallPack.map((r) => r.entity),
      entitiesTouched: entities,
      newFactsCreated: false,
      confidence,
      patchHash: String(sha256(replacementText.normalize('NFC'))),
    };
  };

  /* — SCEAU D'AUTEUR : consulté AVANT TOUT (INV-AUTHOR-SEAL-001/005). Un
   *   passage scellé est la loi de l'auteur — le chirurgien range son bistouri. — */
  const lock = opts.authorLocks?.findSpanLock(`${c.leftContext}\n${c.rightContext}`) ?? null;
  if (lock !== null) {
    return ok(mk('KEEP_STYLED', '', `AUTHOR_LOCKED:${lock.decisionId} — décision d'auteur scellée (${lock.verdict}), intouchable par la machine.`, [], 1.0));
  }

  /* — TRIAGE déterministe — */
  const diag = diagnoseEdge(c.leftContext, c.rightContext, w.chapterId);
  const lastBlk = c.leftContext.trimEnd().split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0).at(-1) ?? '';

  if (!diag.defective) {
    return ok(mk('KEEP_STYLED', '', 'NO_DEFECT — jonction saine ou coupe littéraire voulue, on ne touche pas.', [], 0.95));
  }
  if (STYLED_NOMINAL_RE.test(lastBlk.trim()) || STYLED_RESUME_RE.test(c.rightContext)) {
    return ok(mk('KEEP_STYLED', '', 'STYLED_CUT — ellipse/interruption légitime, la réparer serait la détruire.', [], 0.9));
  }

  /* — RÉPARATIONS MÉCANIQUES (zéro LLM — opérations prouvées) — */
  if (diag.kind === 'FALSE_START') {
    // Retrait PUR (rien d'ajouté) : aucune garde de contenu nécessaire.
    const repaired = c.leftContext.trimEnd().slice(0, c.leftContext.trimEnd().length - lastBlk.length).trimEnd();
    return ok(mk('REPAIR', repaired, 'FALSE_START_REMOVED — le bloc suivant reprend intégralement le fragment.', [], 0.97));
  }
  if (diag.kind === 'NEAR_DUP_RESUME') {
    const ls = lastSentence(c.leftContext.trimEnd());
    const idx = c.leftContext.lastIndexOf(ls);
    const repaired = idx > 0 ? c.leftContext.slice(0, idx).trimEnd() : c.leftContext.trimEnd();
    if (repaired.length > 0 && TERMINATORS.test(repaired)) {
      return ok(mk('REPAIR', repaired, 'ORPHAN_RESUME_REMOVED — la version du bloc suivant porte la suite.', [], 0.95));
    }
    return ok(mk('ESCALATE', '', 'UNREPAIRABLE_WITH_LOCAL_CONTEXT — dédup impossible sans vider la fenêtre.', [], 0.4));
  }

  /* — COMPLÉTION SÉMANTIQUE / QUOTE / PHYSIQUE : le LLM propose, les gardes tranchent — */
  if (opts.llm === undefined) {
    return ok(mk('ESCALATE', '', 'UNREPAIRABLE_WITH_LOCAL_CONTEXT — complétion requise et aucun port LLM autorisé.', [], 0.3));
  }

  const facts = w.recallPack.map((r) => `- ${r.entity} : ${r.fact}`).join('\n');
  const directive = [
    `[FAIT] Jonction défectueuse (${diag.kind}) au chapitre ${w.chapterId}, scène ${w.sceneId}.`,
    `[ÉTAT DU MONDE] Lieu : ${w.location}. Moment : ${w.timeState}. Action en cours : ${w.actionInProgress}.`,
    `[PRÉSENTS] ${w.activeCharacters.join(', ') || '(aucun)'} ; objets actifs : ${w.activeObjects.join(', ') || '(aucun)'}.`,
    `[BIBLE]\n${facts || '- (rien)'}`,
    `[CONTRAINTES CANON] ${w.canonConstraints.join(' ; ') || '(aucune)'}`,
    `[ORDRE] Répare UNIQUEMENT la fin amputée du segment en 1 à 3 phrases (≤150 mots), avec les SEULS faits ci-dessus. AUCUN personnage, lieu, objet ou fait nouveau. Ne change ni le POV, ni le lieu, ni le moment. Réponds par le segment corrigé seul.`,
  ].join('\n');

  const proposed = (await opts.llm.rewriteSegment(directive, lastBlk)).trim();
  if (proposed.length === 0 || proposed === lastBlk) {
    return ok(mk('ESCALATE', '', 'UNREPAIRABLE_WITH_LOCAL_CONTEXT — le port a refusé (no-op sûr).', [], 0.3));
  }

  /* — TRIBUNAL MÉCANIQUE du patch (INV-SS-002..008). Le patch est jugé contre
   *   le gauche PRÉSERVÉ (hors segment remplacé) + le droit. — */
  const preservedHead = c.leftContext.trimEnd().slice(0, c.leftContext.trimEnd().length - lastBlk.length);
  const reasons = guardPatch(proposed, {
    world: w,
    left: preservedHead,
    right: c.rightContext,
    established: `${c.leftContext} ${c.rightContext}`,
    chapterId: w.chapterId,
  });
  if (reasons.length > 0) {
    return ok(mk('ESCALATE', '', `PATCH_REJECTED_BY_GUARDS — ${reasons.join(' | ')}`, [], 0.2));
  }

  /* — INV-SS-008 : RE-SCAN de la jonction patchée (le chirurgien ne se note pas lui-même) — */
  const head = c.leftContext.trimEnd().slice(0, c.leftContext.trimEnd().length - lastBlk.length);
  const repairedLeft = `${head}${proposed}`.trimEnd();
  const rescan = diagnoseEdge(repairedLeft, c.rightContext, w.chapterId);
  if (rescan.defective) {
    return ok(mk('ESCALATE', '', `RESCAN_FAILED:${rescan.kind} — le patch ne referme pas la couture.`, [], 0.2));
  }

  const touched = w.activeCharacters.filter((ch) => new RegExp(`(?<!\\p{L})${ch.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?!\\p{L})`, 'u').test(proposed));
  return ok(mk('REPAIR', repairedLeft, `SEAM_REPAIRED:${diag.kind} — patch borné validé par les 8 gardes + re-scan.`, touched, 0.85));
}
