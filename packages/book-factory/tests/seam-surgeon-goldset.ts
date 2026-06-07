/** OMEGA — GOLD-SET 120 du R6_SEAM_SURGEON (mandat tribunal : 20 saines,
 *  20 cassées mécaniques, 20 troncatures sémantiques, 20 dialogues amputés,
 *  20 transitions brutales légitimes, 20 fausses alertes stylistiques).
 *  Génération DÉTERMINISTE (indexation modulaire, zéro RNG) ; les cas RÉELS du
 *  88k sont intégrés comme cas obligatoires. */
import type { LlmRepairPort } from '../src/doctor/repair-executor.js';
import type { SurgeonCase, SurgeonWorldState, SurgeonAction, SeamKind } from '../src/doctor/seam-surgeon.js';

export type PortSpec = 'NONE' | 'GOOD' | 'REFUSE';
export interface GoldCase {
  readonly id: string;
  readonly category: 'SAINE' | 'MECANIQUE' | 'TRONCATURE' | 'DIALOGUE' | 'TRANSITION_LEGITIME' | 'FAUSSE_ALERTE';
  readonly surgeonCase: SurgeonCase;
  readonly port: PortSpec;
  readonly expected: SurgeonAction;
}

export function makeWorld(over: Partial<SurgeonWorldState> = {}): SurgeonWorldState {
  return {
    chapterId: 1,
    sceneId: 's1',
    pov: 'THIRD',
    location: 'Ker-Morvan',
    timeState: 'même scène, continuité directe',
    activeCharacters: ['Léna', 'Garcia'],
    activeObjects: ['la lettre', 'bottes'],
    actionInProgress: "Léna entre dans la maison, Garcia l'attend",
    recallPack: [
      { entity: 'Léna', fact: 'porte des bottes mouillées en entrant' },
      { entity: 'Garcia', fact: 'attend dans la cuisine, près de la fenêtre' },
    ],
    canonConstraints: ['Henri est mort avant le chapitre 1', 'la lettre est cachetée'],
    forbiddenPlaces: ['Saint-Marc'],
    ...over,
  };
}

/** Port COMPÉTENT : complète la phrase amputée avec les seuls faits du monde.
 *  La branche est choisie sur la QUEUE amputée (le signal), pas le segment entier. */
export class GoodStubPort implements LlmRepairPort {
  async rewriteSegment(_directive: string, segment: string): Promise<string> {
    const lastStop = Math.max(segment.lastIndexOf('. '), segment.lastIndexOf('! '), segment.lastIndexOf('» '));
    const head = lastStop >= 0 ? segment.slice(0, lastStop + 1) : '';
    const tail = segment.slice(lastStop + 1);
    let completion: string;
    if (/«[^»]*$/u.test(tail)) completion = '« Qui peut encore parler ici ? » demanda Garcia sans se retourner.';
    else if (/bottes|pieds nus/u.test(tail)) completion = 'Elle retire ses bottes mouillées près de la porte et avance pieds nus.';
    else if (/peut voir|aperçoit/u.test(tail)) completion = 'Elle peut voir Garcia, immobile près de la fenêtre, qui ne dit rien.';
    else completion = 'Léna posa la lettre cachetée sur la table et attendit Garcia.';
    return head.length > 0 ? `${head} ${completion}` : completion;
  }
}
/** Port qui REFUSE (no-op sûr) — le chirurgien doit ESCALATE. */
export class RefusePort implements LlmRepairPort {
  async rewriteSegment(_d: string, segment: string): Promise<string> { return segment; }
}
/* — Ports ADVERSES (chacun viole UN invariant — les gardes doivent rejeter) — */
export class EvilInventPort implements LlmRepairPort {
  async rewriteSegment(): Promise<string> { return 'Margot entra sans frapper et posa la lettre.'; }
}
export class EvilLongPort implements LlmRepairPort {
  async rewriteSegment(): Promise<string> { return `Léna ${'attendit encore et encore '.repeat(40)}près de la table.`; }
}
export class EvilPovPort implements LlmRepairPort {
  async rewriteSegment(): Promise<string> { return 'Je vois la porte se refermer lentement sur Léna.'; }
}
export class EvilPlacePort implements LlmRepairPort {
  async rewriteSegment(): Promise<string> { return 'Ils partirent aussitôt pour Saint-Marc sans un mot.'; }
}
export class EvilTimePort implements LlmRepairPort {
  async rewriteSegment(): Promise<string> { return 'Le lendemain, tout avait changé dans la maison.'; }
}
export class EvilRepeatPort implements LlmRepairPort {
  private readonly echo: string;
  constructor(echo: string) { this.echo = echo; }
  async rewriteSegment(): Promise<string> { return this.echo; }
}

/* ─────────────────────────── GÉNÉRATION 6 × 20 ─────────────────────────── */

const SUBJECTS = ['Léna', 'Garcia'] as const;
const SANE_ENDS = [
  'La pièce sentait le sel et la poussière.', 'Personne ne répondit.', 'La porte se referma sans bruit.',
  'Le silence dura.', "L'horloge marquait six heures.", 'Dehors, la mer continuait son travail.',
  'Il posa la lettre sur la table.', 'Elle attendit la suite.', 'Rien ne bougeait dans la cuisine.', 'La nuit tombait.',
] as const;
const SANE_STARTS = [
  'Le lendemain matin, Garcia revint frapper à la porte.', 'Léna se leva la première.', 'Un bruit de pas monta du couloir.',
  'La conversation reprit plus bas.', 'Garcia sortit son carnet.', 'La lettre attendait toujours.',
  'Quelqu’un toussa derrière la cloison.', 'Le vent reprit.', 'Léna relut la première ligne.', 'Garcia ferma la fenêtre.',
] as const;
const TRUNC_TAILS = [
  'Elle peut voir', 'Garcia sentit la', 'Léna ouvrit', 'Il tendit la main vers', 'Elle pensa encore à',
  'Le regard de Garcia se posa sur', 'Léna voulut dire', 'Il chercha la', 'Elle entendit le', 'Garcia se tourna vers',
] as const;
const DIALOG_TAILS = [
  "« Qui l'a fait taire", '« Et la lettre', '« Vous saviez depuis', '« Ce n’était pas un', '« Pourquoi maintenant',
  '« Henri n’aurait jamais', '« La quête n’a', '« Tu parles de', '« On ne découvrira', '« Le registre dit',
] as const;
const STYLED_CUTS = ['Et puis rien.', 'Rien.', 'Plus rien.', 'Silence.', 'Noir.'] as const;
const NOMINAL_OK = ['Le froid.', 'La marée, encore.', 'Six heures.', 'Un pas. Puis deux.', 'Personne.'] as const;

export function buildGoldset(): readonly GoldCase[] {
  const cases: GoldCase[] = [];
  const pick = <T,>(arr: readonly T[], i: number): T => arr[i % arr.length] as T;

  /* 1 — SAINES (20) : jonction propre ⇒ KEEP_STYLED (NO_DEFECT). */
  for (let i = 0; i < 20; i++) {
    cases.push({
      id: `SAINE_${i + 1}`, category: 'SAINE', port: 'NONE', expected: 'KEEP_STYLED',
      surgeonCase: {
        seamId: `saine_${i + 1}`, seamKind: 'BLOCK_JUNCTION',
        leftContext: `${pick(SUBJECTS, i)} traversa la cuisine sans un mot. ${pick(SANE_ENDS, i)}`,
        rightContext: `${pick(SANE_STARTS, i)} ${pick(SANE_ENDS, i + 3)}`,
        world: makeWorld(),
      },
    });
  }

  /* 2 — CASSÉES MÉCANIQUES (20) : 10 faux-départs + 10 reprises quasi-dup ⇒ REPAIR sans LLM. */
  for (let i = 0; i < 10; i++) {
    const frag = `${pick(SUBJECTS, i)} hocha lentement la`;
    cases.push({
      id: `MECA_FS_${i + 1}`, category: 'MECANIQUE', port: 'NONE', expected: 'REPAIR',
      surgeonCase: {
        seamId: `meca_fs_${i + 1}`, seamKind: 'EXTENDER_COLLAGE',
        leftContext: `${pick(SANE_ENDS, i)}\n\n${frag}`,
        rightContext: `${frag} tête, un mouvement presque invisible. ${pick(SANE_ENDS, i + 1)}`,
        world: makeWorld(),
      },
    });
    // cas réel 88k : « Yvon ne répond pas tout de suite. Il ne répond pas tout de suite. »
    const dup = `${pick(SUBJECTS, i)} ne répond pas tout de suite.`;
    cases.push({
      id: `MECA_DUP_${i + 1}`, category: 'MECANIQUE', port: 'NONE', expected: 'REPAIR',
      surgeonCase: {
        seamId: `meca_dup_${i + 1}`, seamKind: 'EXTENDER_COLLAGE',
        leftContext: `${pick(SANE_ENDS, i + 2)} ${dup}`,
        rightContext: `Il ne répond pas tout de suite. Ses mains tremblent sur la table. ${pick(SANE_ENDS, i + 4)}`,
        world: makeWorld(),
      },
    });
  }

  /* 3 — TRONCATURES SÉMANTIQUES (20) : 12 GOOD ⇒ REPAIR ; 8 sans port ⇒ ESCALATE. */
  for (let i = 0; i < 20; i++) {
    const good = i < 12;
    cases.push({
      id: `TRUNC_${i + 1}`, category: 'TRONCATURE', port: good ? 'GOOD' : (i % 2 === 0 ? 'NONE' : 'REFUSE'), expected: good ? 'REPAIR' : 'ESCALATE',
      surgeonCase: {
        seamId: `trunc_${i + 1}`, seamKind: 'TRUNCATION',
        leftContext: `${pick(SANE_ENDS, i)} ${pick(TRUNC_TAILS, i)}`,
        rightContext: `${pick(SANE_STARTS, i + 1)}`,
        world: makeWorld(),
      },
    });
  }

  /* 4 — DIALOGUES AMPUTÉS (20) : 10 GOOD ⇒ REPAIR ; 10 REFUSE ⇒ ESCALATE. */
  for (let i = 0; i < 20; i++) {
    const good = i < 10;
    cases.push({
      id: `DIALOG_${i + 1}`, category: 'DIALOGUE', port: good ? 'GOOD' : 'REFUSE', expected: good ? 'REPAIR' : 'ESCALATE',
      surgeonCase: {
        seamId: `dialog_${i + 1}`, seamKind: 'DIALOGUE_CUT',
        leftContext: `${pick(SANE_ENDS, i)} ${pick(DIALOG_TAILS, i)}`,
        rightContext: `${pick(SANE_STARTS, i + 2)}`,
        world: makeWorld(),
      },
    });
  }

  /* 5 — TRANSITIONS BRUTALES LÉGITIMES (20) : coupes voulues ⇒ KEEP_STYLED. */
  for (let i = 0; i < 20; i++) {
    const styled = i % 2 === 0;
    cases.push({
      id: `TRANS_${i + 1}`, category: 'TRANSITION_LEGITIME', port: 'NONE', expected: 'KEEP_STYLED',
      surgeonCase: {
        seamId: `trans_${i + 1}`, seamKind: 'CHAPTER_END',
        leftContext: styled
          ? `${pick(SANE_ENDS, i)}\n\n${pick(STYLED_CUTS, i)}`
          : `— On attend que la vérité nous force à`,
        rightContext: styled
          ? `${pick(SANE_STARTS, i)}`
          : `— …la vérité nous force à bouger, termina Garcia.`,
        world: makeWorld(),
      },
    });
  }

  /* 6 — FAUSSES ALERTES STYLISTIQUES (20) : nominales TERMINÉES, ellipses ⇒ KEEP_STYLED. */
  for (let i = 0; i < 20; i++) {
    const nominal = i % 2 === 0;
    cases.push({
      id: `FAUSSE_${i + 1}`, category: 'FAUSSE_ALERTE', port: 'NONE', expected: 'KEEP_STYLED',
      surgeonCase: {
        seamId: `fausse_${i + 1}`, seamKind: 'BLOCK_JUNCTION',
        leftContext: nominal
          ? `${pick(SANE_ENDS, i)}\n\n${pick(NOMINAL_OK, i)}`
          : `${pick(SANE_ENDS, i)} Il ne répondit pas…`,
        rightContext: `${pick(SANE_STARTS, i + 4)}`,
        world: makeWorld(),
      },
    });
  }

  return cases;
}

export function portFor(spec: PortSpec): LlmRepairPort | undefined {
  if (spec === 'GOOD') return new GoodStubPort();
  if (spec === 'REFUSE') return new RefusePort();
  return undefined;
}
export type { SeamKind };
