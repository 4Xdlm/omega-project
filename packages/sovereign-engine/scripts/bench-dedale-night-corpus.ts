/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — DÉDALE BENCH NIGHT — CORPUS (12 scènes taxonomées)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   scripts/bench-dedale-night-corpus.ts
 * Version:  v1 (2026-04-22)
 * Standard: NASA-Grade L4 — correspond à DEDALE_BENCH_NIGHT_v1.md §B
 *
 * CORPUS BENCH DÉDALE v0.55 :
 *   - 4 familles TRIGGER × 2 scènes = 8 scènes à haut risque loop
 *   - 4 familles NEUTRAL × 1 scène = 4 scènes à bas risque (contrôle faux positifs)
 *   - TOTAL : 12 scènes
 *
 * Familles trigger (issues de bench V4 + P0 anti_repeat_inert_qwen3) :
 *   T01/T02 : boucle_anaphorique — répétitions "elle pensait que"/"la nuit était"
 *   T03/T04 : liste_ouverte — énumérations sans résolution, virgules cadenassées
 *   T05/T06 : introspection_attracteur — P8-FIX bassin d'attraction intérieur
 *   T07/T08 : pseudo_raisonnement_circulaire — "car/parce que/donc" en cycle
 *
 * Familles neutral :
 *   N01 : descriptif_fermé — paysage borné, action unique
 *   N02 : action_courte — tension externe, verbes d'action
 *   N03 : dialogue_borné — échange court, tours courts
 *   N04 : narration_factuelle — faits, zéro rumination
 *
 * Chaque scène porte sceneBrief + signatureWords + EmotionContract complet
 * (nécessaire pour activer V2-B adaptive → Dédale wrapping).
 *
 * USAGE :
 *   import { BENCH_CORPUS, getSceneById } from './bench-dedale-night-corpus.js';
 *
 * INVARIANT : ce fichier est un DATA MODULE — pas d'I/O, pas de side effects.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'node:crypto';
import type { EmotionContract } from '../src/types.js';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type SceneFamily =
  | 'trigger:boucle_anaphorique'
  | 'trigger:liste_ouverte'
  | 'trigger:introspection_attracteur'
  | 'trigger:pseudo_raisonnement_circulaire'
  | 'neutral:descriptif_ferme'
  | 'neutral:action_courte'
  | 'neutral:dialogue_borne'
  | 'neutral:narration_factuelle';

export type SceneKind = 'trigger' | 'neutral';

export interface BenchScene {
  readonly id: string;               // ex: 'T01', 'N03'
  readonly family: SceneFamily;
  readonly kind: SceneKind;
  readonly sceneBrief: string;
  readonly signatureWords: readonly string[];
  readonly language: 'fr' | 'en';
  readonly emotionContract: EmotionContract;
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS EMOTIONCONTRACT — clone du pattern dryrun-v2b-shadow.ts
// ──────────────────────────────────────────────────────────────────────────────

function dominant14D(emotion: string, weight = 0.40): Record<string, number> {
  const keys = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger',
    'anticipation', 'love', 'submission', 'awe', 'disapproval', 'remorse', 'contempt',
  ];
  const rest = (1 - weight) / (keys.length - 1);
  const d: Record<string, number> = {};
  for (const k of keys) {
    d[k] = k === emotion ? weight : rest;
  }
  return d;
}

function makeContract(args: {
  readonly q1Dom: string;
  readonly q2Dom: string;
  readonly q3Dom: string;
  readonly q4Dom: string;
  readonly vStart: number;
  readonly vEnd: number;
  readonly slope: 'ascending' | 'descending' | 'arc' | 'reverse_arc';
  readonly direction: 'darkening' | 'brightening' | 'stable' | 'oscillating';
  readonly rupture: boolean;
}): EmotionContract {
  return {
    curve_quartiles: [
      {
        quartile: 'Q1',
        target_14d: dominant14D(args.q1Dom, 0.30),
        valence: args.vStart,
        arousal: 0.30,
        dominant: args.q1Dom,
        narrative_instruction: 'Installation / ancrage sensoriel',
      },
      {
        quartile: 'Q2',
        target_14d: dominant14D(args.q2Dom, 0.35),
        valence: (args.vStart + args.vEnd) / 2 - 0.1,
        arousal: 0.40,
        dominant: args.q2Dom,
        narrative_instruction: 'Montée / déplacement',
      },
      {
        quartile: 'Q3',
        target_14d: dominant14D(args.q3Dom, 0.45),
        valence: (args.vStart + args.vEnd) / 2 + 0.1,
        arousal: 0.60,
        dominant: args.q3Dom,
        narrative_instruction: 'Pivot / climax',
      },
      {
        quartile: 'Q4',
        target_14d: dominant14D(args.q4Dom, 0.40),
        valence: args.vEnd,
        arousal: 0.30,
        dominant: args.q4Dom,
        narrative_instruction: 'Résolution / fermeture',
      },
    ],
    intensity_range: { min: 0.20, max: 0.65 },
    tension: {
      slope_target: args.slope,
      pic_position_pct: 0.65,
      faille_position_pct: 0.80,
      silence_zones: [],
    },
    terminal_state: {
      target_14d: dominant14D(args.q4Dom, 0.40),
      valence: args.vEnd,
      arousal: 0.30,
      dominant: args.q4Dom,
      reader_state: 'Resolution',
    },
    rupture: {
      exists: args.rupture,
      position_pct: args.rupture ? 0.70 : 0,
      before_dominant: args.q2Dom,
      after_dominant: args.q4Dom,
      delta_valence: args.rupture ? Math.abs(args.vEnd - args.vStart) : 0,
    },
    valence_arc: {
      start: args.vStart,
      end: args.vEnd,
      direction: args.direction,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// CORPUS — 12 scènes
// ──────────────────────────────────────────────────────────────────────────────

export const BENCH_CORPUS: readonly BenchScene[] = [
  // ── TRIGGER : boucle_anaphorique ────────────────────────────────────────────
  {
    id: 'T01',
    family: 'trigger:boucle_anaphorique',
    kind: 'trigger',
    sceneBrief:
      "Dans la chambre sans volets, elle pense que la nuit ne finira pas. Elle pense que la lumière a déjà fui, que la fatigue n'a plus de forme. Elle pense à sa mère absente, à son père parti, aux lettres qu'elle n'a pas envoyées. Le silence de la maison renvoie chaque pensée contre les murs. Elle reste immobile, et chaque phrase qu'elle formule en elle-même revient sous un angle à peine modifié. La conscience tourne en cercles autour d'un seul point : l'impossibilité de dormir.",
    signatureWords: ['silence', 'ombre', 'souffle', 'mur', 'nuit'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'anticipation', q2Dom: 'sadness', q3Dom: 'sadness', q4Dom: 'sadness',
      vStart: -0.20, vEnd: -0.40, slope: 'descending', direction: 'darkening', rupture: false,
    }),
  },
  {
    id: 'T02',
    family: 'trigger:boucle_anaphorique',
    kind: 'trigger',
    sceneBrief:
      "Le médecin répète que le diagnostic ne change rien. Il répète que les jours à venir seront pareils aux précédents. Il répète que la douleur restera ce qu'elle est, que l'espoir n'a pas disparu, qu'il faut tenir. Dans la salle d'attente, l'homme assis au bord de la chaise réécoute dans sa tête chaque mot, chaque hésitation du médecin. Les phrases reviennent, se superposent, gagnent en densité sans jamais s'éclaircir.",
    signatureWords: ['couloir', 'lumière', 'blouse', 'chaise', 'verre'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'fear', q2Dom: 'sadness', q3Dom: 'sadness', q4Dom: 'remorse',
      vStart: -0.30, vEnd: -0.50, slope: 'descending', direction: 'darkening', rupture: false,
    }),
  },

  // ── TRIGGER : liste_ouverte ─────────────────────────────────────────────────
  {
    id: 'T03',
    family: 'trigger:liste_ouverte',
    kind: 'trigger',
    sceneBrief:
      "Elle vide le placard de sa mère, un objet après l'autre. Un foulard de soie fané, une montre qui ne marche plus, une boîte à couture pleine d'aiguilles rouillées, un chapelet cassé, trois enveloppes vides, un tube de rouge à lèvres presque neuf, une paire de gants de conduite en cuir, un vieux livret de famille, des clefs qu'elle ne reconnaît pas, un crucifix en bois, un bracelet d'enfant. La pile grandit sur le lit, chaque objet ajouté à la suite de l'autre.",
    signatureWords: ['tissu', 'métal', 'poussière', 'cuir', 'cire'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'sadness', q2Dom: 'sadness', q3Dom: 'surprise', q4Dom: 'sadness',
      vStart: -0.20, vEnd: -0.30, slope: 'arc', direction: 'darkening', rupture: false,
    }),
  },
  {
    id: 'T04',
    family: 'trigger:liste_ouverte',
    kind: 'trigger',
    sceneBrief:
      "Dans le grenier, le marchand fait l'inventaire à voix basse. Trois commodes en noyer, une armoire normande, un lit breton sculpté, deux chaises cannées, une table de ferme, un bahut de chêne, une huche à pain, un vaisselier vitré, un secrétaire ouvragé, un guéridon en marbre, une méridienne éventrée, un banc d'église. Il compte, il note, il récite ; les meubles s'alignent dans son carnet comme ils s'alignent contre les murs, sans ordre, sans hiérarchie.",
    signatureWords: ['bois', 'vernis', 'charnière', 'papier', 'crayon'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'trust', q2Dom: 'anticipation', q3Dom: 'surprise', q4Dom: 'trust',
      vStart: 0.00, vEnd: -0.10, slope: 'arc', direction: 'stable', rupture: false,
    }),
  },

  // ── TRIGGER : introspection_attracteur ──────────────────────────────────────
  {
    id: 'T05',
    family: 'trigger:introspection_attracteur',
    kind: 'trigger',
    sceneBrief:
      "Dans le café vide, il tourne sa cuillère dans la tasse et laisse la question revenir. Est-ce qu'il a eu raison de partir ? Il se répond que oui, puis se reprend, puis se contredit. Chaque argument convoque son contraire ; chaque contraire ramène à l'argument initial. Il regarde la rue mouillée derrière la vitre, et la pensée glisse encore, pareille à elle-même, comme si elle ne pouvait pas sortir de son propre sillon.",
    signatureWords: ['tasse', 'vitre', 'pluie', 'carrelage', 'fumée'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'sadness', q2Dom: 'disapproval', q3Dom: 'remorse', q4Dom: 'sadness',
      vStart: -0.30, vEnd: -0.45, slope: 'descending', direction: 'darkening', rupture: false,
    }),
  },
  {
    id: 'T06',
    family: 'trigger:introspection_attracteur',
    kind: 'trigger',
    sceneBrief:
      "Assise sur le quai, elle attend un train qui n'arrive pas. Elle se demande si elle a bien fait de ne pas répondre au message de sa sœur. Elle se dit que non, puis que peut-être, puis que non encore, puis qu'il faudrait nuancer. La tête lui tourne autour de la même question, et chaque nouveau détour produit la même impasse. Le panneau d'affichage clignote sans que l'heure avance.",
    signatureWords: ['rail', 'ciment', 'verre', 'néon', 'affiche'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'anticipation', q2Dom: 'disapproval', q3Dom: 'sadness', q4Dom: 'remorse',
      vStart: -0.10, vEnd: -0.40, slope: 'descending', direction: 'darkening', rupture: false,
    }),
  },

  // ── TRIGGER : pseudo_raisonnement_circulaire ────────────────────────────────
  {
    id: 'T07',
    family: 'trigger:pseudo_raisonnement_circulaire',
    kind: 'trigger',
    sceneBrief:
      "Dans le bureau, l'avocat explique au client que la clause est valable parce que le contrat est signé, et que le contrat est signé parce que la clause avait été acceptée, et que la clause avait été acceptée parce qu'elle figurait dès le départ dans le contrat. Le client ne saisit pas la sortie. Il reformule à voix basse, et sa reformulation boucle elle aussi — comme si la phrase, dès qu'on la défaisait, se reconstituait à l'identique sur l'autre versant du raisonnement.",
    signatureWords: ['papier', 'stylo', 'classeur', 'stores', 'bois'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'anticipation', q2Dom: 'disapproval', q3Dom: 'anger', q4Dom: 'disapproval',
      vStart: -0.10, vEnd: -0.30, slope: 'descending', direction: 'darkening', rupture: false,
    }),
  },
  {
    id: 'T08',
    family: 'trigger:pseudo_raisonnement_circulaire',
    kind: 'trigger',
    sceneBrief:
      "Dans la salle de classe après les cours, la surveillante explique à l'élève pourquoi il a été puni : donc il a parlé, donc il a été sanctionné, donc la sanction était méritée. L'élève écoute. Il tente de comprendre ce qui, dans la chaîne, peut être remis en cause. Chaque donc conclut et redémarre en même temps. La phrase se mange la queue sans jamais ouvrir un véritable commencement.",
    signatureWords: ['tableau', 'craie', 'chaise', 'cahier', 'couloir'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'submission', q2Dom: 'disapproval', q3Dom: 'anger', q4Dom: 'submission',
      vStart: -0.20, vEnd: -0.30, slope: 'arc', direction: 'darkening', rupture: false,
    }),
  },

  // ── NEUTRAL : descriptif_ferme ──────────────────────────────────────────────
  {
    id: 'N01',
    family: 'neutral:descriptif_ferme',
    kind: 'neutral',
    sceneBrief:
      "Au bord du champ, un muret de pierres sèches tombe en ligne droite jusqu'au chemin. L'herbe est courte, tondue par le vent du nord. Un platane vieux se tient seul, contre un pan de ciel gris. Une buse décrit deux cercles au-dessus du pré, puis disparaît derrière la colline. Le jour est sans ombre précise.",
    signatureWords: ['pierre', 'herbe', 'nuage', 'arbre', 'chemin'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'trust', q2Dom: 'anticipation', q3Dom: 'awe', q4Dom: 'trust',
      vStart: 0.10, vEnd: 0.15, slope: 'arc', direction: 'stable', rupture: false,
    }),
  },

  // ── NEUTRAL : action_courte ─────────────────────────────────────────────────
  {
    id: 'N02',
    family: 'neutral:action_courte',
    kind: 'neutral',
    sceneBrief:
      "Il attrape la clef oubliée sur l'évier, referme la porte d'un coup d'épaule, descend l'escalier trois marches à la fois. La cour est humide. Il traverse vers le portail, pousse le battant rouillé, s'arrête une seconde pour écouter le moteur de la voiture qui l'attend au coin.",
    signatureWords: ['clef', 'porte', 'escalier', 'moteur', 'portail'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'anticipation', q2Dom: 'anticipation', q3Dom: 'surprise', q4Dom: 'trust',
      vStart: 0.00, vEnd: 0.10, slope: 'ascending', direction: 'brightening', rupture: false,
    }),
  },

  // ── NEUTRAL : dialogue_borne ────────────────────────────────────────────────
  {
    id: 'N03',
    family: 'neutral:dialogue_borne',
    kind: 'neutral',
    sceneBrief:
      "Sur le pas de la porte, elle lui tend le paquet. — Tu oublies pas la carte ? Il met le paquet sous le bras, vérifie sa poche. — Non, elle est là. Elle hoche la tête. — Alors vas-y, tu vas être en retard. Il s'éloigne sur le trottoir, se retourne une fois pour vérifier que la porte est refermée.",
    signatureWords: ['paquet', 'trottoir', 'poche', 'porte', 'carte'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'trust', q2Dom: 'anticipation', q3Dom: 'anticipation', q4Dom: 'trust',
      vStart: 0.05, vEnd: 0.10, slope: 'arc', direction: 'stable', rupture: false,
    }),
  },

  // ── NEUTRAL : narration_factuelle ───────────────────────────────────────────
  {
    id: 'N04',
    family: 'neutral:narration_factuelle',
    kind: 'neutral',
    sceneBrief:
      "Le train part à six heures douze. À six heures quinze, il s'engage dans la courbe derrière la gare. À six heures vingt-trois, il traverse le pont de la Seille. Les champs défilent, puis une zone industrielle, puis la forêt. À six heures cinquante-sept, il s'arrête à la petite gare de campagne ; deux voyageurs montent, un employé échange quelques mots avec le conducteur, et le train repart sans sifflet.",
    signatureWords: ['rail', 'pont', 'champ', 'gare', 'quai'],
    language: 'fr',
    emotionContract: makeContract({
      q1Dom: 'trust', q2Dom: 'anticipation', q3Dom: 'trust', q4Dom: 'trust',
      vStart: 0.00, vEnd: 0.05, slope: 'arc', direction: 'stable', rupture: false,
    }),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS PUBLICS
// ──────────────────────────────────────────────────────────────────────────────

export function getSceneById(id: string): BenchScene {
  const s = BENCH_CORPUS.find((x) => x.id === id);
  if (s === undefined) {
    throw new Error(`[CORPUS] scene id not found: ${id}`);
  }
  return s;
}

export function getTriggerScenes(): readonly BenchScene[] {
  return BENCH_CORPUS.filter((s) => s.kind === 'trigger');
}

export function getNeutralScenes(): readonly BenchScene[] {
  return BENCH_CORPUS.filter((s) => s.kind === 'neutral');
}

/**
 * Hash SHA256 d'une scène (pour manifest bench).
 * Inputs : id + family + sceneBrief + signatureWords joined + language.
 * On exclut emotionContract du hash (trop volatil si le template évolue).
 */
export function hashScene(s: BenchScene): string {
  const payload = [
    s.id,
    s.family,
    s.sceneBrief,
    s.signatureWords.join('|'),
    s.language,
  ].join('\n---\n');
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Manifeste corpus (id + family + hash) pour audit de reproductibilité.
 */
export function corpusManifest(): ReadonlyArray<{
  readonly id: string;
  readonly family: SceneFamily;
  readonly kind: SceneKind;
  readonly hash: string;
}> {
  return BENCH_CORPUS.map((s) => ({
    id: s.id,
    family: s.family,
    kind: s.kind,
    hash: hashScene(s),
  }));
}
