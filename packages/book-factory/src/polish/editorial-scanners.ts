/**
 * OMEGA — PE-1 SCANNERS ÉDITORIAUX (rendre le « souffle » mesurable autant que
 * le CALC le permet honnêtement). Définitions MÉCANISTES, zéro liste magique.
 * Ce que ces scanners mesurent = STRUCTURE de l'effet ; ce qu'ils NE mesurent
 * PAS = la qualité ressentie (œil humain, tagué dans le ledger).
 *
 * Polish CHIRURGICAL : ces scanners DÉTECTENT et PRIORISENT — ils ne réparent
 * jamais (le créatif va en AUTHOR_REVIEW, jamais auto-appliqué).
 */

export interface ScanChapter { readonly chapter: number; readonly prose: string }

/* ————— 1. PHRASE DE CONFORT (Gemini) : syntaxe propre, émotion absente —————
 * Proxy : phrase SANS verbe d'action/parole/émotion ET sans dialogue, en
 * GRAPPE ≥ minRun consécutives = passage qui « meuble ». */
const LIVE_VERB_RE = /\b(dit|demanda|répondit|cria|murmura|avoua|courut|saisit|frappa|bondit|trembla|pleura|hurla|serra|aima|haït|craignit|espéra|décida|refusa|accusa|jeta|brisa|s'élança|se\s+dressa|comprit|découvrit)\b/iu;
const DIALOGUE_LINE_RE = /^[«"—-]|»\s*$/u;

export function scanComfortSentences(prose: string, minRun = 4): { readonly runs: number; readonly maxRun: number; readonly comfortRatio: number } {
  const sents = prose.split(/(?<=[.!?…»])\s+/u).map((s) => s.trim()).filter((s) => s.length > 0);
  let cur = 0; let runs = 0; let maxRun = 0; let comfort = 0;
  for (const s of sents) {
    const isComfort = !DIALOGUE_LINE_RE.test(s) && !LIVE_VERB_RE.test(s);
    if (isComfort) { comfort += 1; cur += 1; maxRun = Math.max(maxRun, cur); if (cur === minRun) runs += 1; }
    else cur = 0;
  }
  return { runs, maxRun, comfortRatio: sents.length ? Number((comfort / sents.length).toFixed(3)) : 0 };
}

/* ————— 2. MODE DIALOGUE : info-dump vs conflit ————— */
const INFODUMP_RE = /\b(je sais que|c'est parce que|voilà pourquoi|il faut que tu saches|laisse-moi t'expliquer|en réalité|le fait est que|comme tu le sais)\b/iu;
const CONFLICT_RE = /\b(accuse|accusa|menace|menaça|exige|exigea|refuse|refusa|ment|mentit|tais-toi|tu mens|jamais|comment oses)\b/iu;

export function scanDialogueMode(prose: string): { readonly dialogueLines: number; readonly infodump: number; readonly conflict: number; readonly conflictRatio: number } {
  const lines = prose.split(/\r?\n/u).map((l) => l.trim()).filter((l) => DIALOGUE_LINE_RE.test(l));
  let info = 0; let conf = 0;
  for (const l of lines) { if (INFODUMP_RE.test(l)) info += 1; if (CONFLICT_RE.test(l)) conf += 1; }
  const tot = info + conf;
  return { dialogueLines: lines.length, infodump: info, conflict: conf, conflictRatio: tot ? Number((conf / tot).toFixed(3)) : -1 };
}

/* ————— 3. PERSONNAGE PASSIF : minté mais jamais SUJET d'un verbe vivant ————— */
export function scanPassiveCharacters(prose: string, characters: readonly string[]): readonly string[] {
  const passive: string[] = [];
  for (const c of characters) {
    const esc = c.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    // SUJET d'un verbe vivant : « Nom <verbe vivant> » dans la même phrase courte
    const activeRe = new RegExp(`\\b${esc}\\b[^.!?…»]{0,40}?${LIVE_VERB_RE.source}`, 'iu');
    const present = new RegExp(`\\b${esc}\\b`, 'u').test(prose);
    if (present && !activeRe.test(prose)) passive.push(c);
  }
  return passive;
}

/* ————— 4. RÉVÉLATION SANS CONSÉQUENCE : REV en N, rien ne change en N+1 ————— */
const DECISION_RE = /\b(décida|résolut|choisit|jura|partit|s'enfuit|refusa|accepta|trancha|abandonna|décide de|décision)\b/iu;

export function scanRevelationConsequence(chapters: readonly ScanChapter[], revelationChapters: readonly number[]): ReadonlyArray<{ chapter: number; hasConsequence: boolean }> {
  return revelationChapters.map((rc) => {
    const next = chapters.find((c) => c.chapter === rc + 1);
    const hasConsequence = next !== undefined && (DECISION_RE.test(next.prose) || LIVE_VERB_RE.test(next.prose.slice(0, 600)));
    return { chapter: rc, hasConsequence };
  });
}

/* ————— Synthèse priorisée par chapitre (pour CHAPTER_POLISH_LEDGER) ————— */
export interface ChapterPolishRow {
  readonly chapter: number;
  readonly comfortRuns: number;
  readonly comfortRatio: number;
  readonly dialogueConflictRatio: number;
  readonly passiveCharacters: readonly string[];
  readonly polishPriority: 'HIGH' | 'MED' | 'LOW';
  readonly axesHumanEye: readonly string[];
}

export function chapterPolishRow(ch: ScanChapter, characters: readonly string[]): ChapterPolishRow {
  const comfort = scanComfortSentences(ch.prose);
  const dia = scanDialogueMode(ch.prose);
  const passive = scanPassiveCharacters(ch.prose, characters);
  const highSignals = (comfort.runs >= 2 ? 1 : 0) + (dia.conflictRatio >= 0 && dia.conflictRatio < 0.3 ? 1 : 0) + (passive.length >= 2 ? 1 : 0);
  const priority: ChapterPolishRow['polishPriority'] = highSignals >= 2 ? 'HIGH' : highSignals === 1 ? 'MED' : 'LOW';
  return {
    chapter: ch.chapter, comfortRuns: comfort.runs, comfortRatio: comfort.comfortRatio,
    dialogueConflictRatio: dia.conflictRatio, passiveCharacters: passive, polishPriority: priority,
    /* Honnêteté : ces axes ne sont PAS mesurés ici, ils exigent l'œil humain. */
    axesHumanEye: ['charisme de scène', 'naturel du dialogue', 'envie de tourner la page', 'originalité d\'image'],
  };
}
