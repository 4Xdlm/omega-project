/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — U-BENCHMARK Real Execution Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npm run benchmark:phase-u
 *
 * Livrables :
 *   sessions/ValidationPack_phase-u_real_<date>_<head>/
 *     config.json | runs.jsonl | summary.json | SHA256SUMS.txt
 *
 * INV-DB-01..05 enforced.
 * Standard: NASA-Grade L4 / DO-178C
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { createAnthropicProvider, CreditExhaustedError } from '../src/runtime/anthropic-provider.js';
import { JudgeCache } from '../src/validation/judge-cache.js';
import { DualBenchmarkRunner, writeValidationPack, BENCHMARK_RUNS } from '../src/validation/phase-u/benchmark/run-dual-benchmark.js';
import type { ForgePacketInput } from '../src/input/forge-packet-assembler.js';
import type { Beat, GenesisPlan, Scene, Arc } from '@omega/genesis-planner';
import type { StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_DIR   = path.resolve(__dirname, '../../..');

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL_ID   = 'claude-sonnet-4-20250514';
const ROOT_SEED  = 'omega-validation-2026-phase-u';
const OUT_DIR    = path.join(__dirname, '..', 'sessions');

// Micro-test mode: BENCH_MICRO=1 runs 3 pairs with K=3 to verify judge without burning budget
const IS_MICRO   = process.env['BENCH_MICRO'] === '1';
const RUN_COUNT  = IS_MICRO ? 3 : BENCHMARK_RUNS;
const K_COUNT    = IS_MICRO ? 3 : 8;

function getGitHead(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch { return 'unknown'; }
}

// ── Shared style / kill_lists / canon ─────────────────────────────────────────

const BASE_STYLE: StyleProfile = {
  version: '1.0.0',
  universe: 'literary_contemporary',
  lexicon: {
    signature_words: ['silence', 'lumière', 'ombre', 'chair', 'souffle',
                      'pierre', 'métal', 'vide', 'froid', 'bruit'],
    forbidden_words: ['soudainement', 'mystérieusement', 'tout à coup'],
    abstraction_max_ratio: 0.20,
    concrete_min_ratio: 0.60,
  },
  rhythm: {
    avg_sentence_length_target: 18,
    gini_target: 0.45,
    max_consecutive_similar: 2,
    min_syncopes_per_scene: 2,
    min_compressions_per_scene: 1,
  },
  tone: {
    dominant_register: 'soutenu',
    intensity_range: [0.3, 0.85],
  },
  imagery: {
    recurrent_motifs: ['darkness', 'cold', 'interiority'],
    density_target_per_100_words: 3,
    banned_metaphors: ['heart of stone', 'eyes like stars'],
  },
};

const BASE_KILL_LISTS: KillLists = {
  banned_words: ['soudain', 'brusquement', 'subitement'],
  banned_cliches: [
    'le cœur battant', 'les larmes aux yeux', 'un frisson parcourut',
    'elle retint son souffle', 'le temps s\'arrêta', 'comme dans un rêve',
    'une bouffée d\'air frais', 'le sang se glaça', 'les jambes en coton',
    'un nœud dans la gorge', 'les poings serrés', 'mâchoire contractée',
    'front perlé de sueur', 'regard perdu dans le vague', 'cœur serré',
    'sourire triste', 'silence pesant', 'atmosphère lourde', 'l\'air se figea',
    'le monde sembla s\'effondrer', 'elle ferma les yeux', 'il déglutit',
    'quelque chose d\'indéfinissable', 'une douleur sourde', 'sans un mot',
    'les yeux brillants', 'gorge nouée', 'souffle court', 'mains tremblantes',
    'regard fuyant', 'voix brisée', 'lèvres pâles', 'teint blême',
    'vertige soudain', 'nuit tombait', 'lumière blafarde', 'vent glacial',
    'feuilles mortes', 'silence assourdissant', 'larmes silencieuses',
    'regards qui se croisent', 'corps figé', 'pensées qui tourbillonnent',
    'vide intérieur', 'blessure invisible', 'masque de indifférence',
    'pluie battante', 'frisson d\'horreur',
  ],
  banned_ai_patterns: [
    'il est important de noter', 'en conclusion', 'en résumé',
    'en effet,', 'il convient de', 'force est de constater',
    'au fil du temps', 'dans un premier temps', 'dans ce contexte',
    'il va sans dire', 'quoi qu\'il en soit', 'c\'est ainsi que',
    'à cet égard', 'on peut dire que', 'il semblerait que',
    'l\'on pourrait penser', 'il est à noter', 'n\'en demeure pas moins',
    'en d\'autres termes', 'par ailleurs', 'de surcroît',
    'qui plus est', 'tout compte fait', 'en tout état de cause',
    'dans la mesure où', 'eu égard à', 'à titre d\'exemple',
    'dans le cadre de', 'en vue de', 'à cet instant précis',
  ],
  banned_filter_words: [
    'vraiment', 'très', 'tellement', 'extrêmement', 'absolument',
    'totalement', 'complètement', 'entièrement', 'profondément',
    'littéralement', 'simplement', 'clairement', 'certainement',
    'évidemment', 'manifestement', 'visiblement', 'apparemment',
    'incroyablement', 'étrangement', 'bizarrement', 'curieusement',
    'soudainement', 'immédiatement', 'rapidement', 'doucement',
  ],
};

function makeCanon(id: string, chars: string[]): readonly CanonEntry[] {
  return chars.map((s, i) => ({ id: `${id}_C${i + 1}`, statement: s }));
}

function makeContinuity(summary: string, charName: string, state: string, location: string): ForgeContinuity {
  return {
    previous_scene_summary: summary,
    character_states: [{
      character_id: 'char_01',
      character_name: charName,
      emotional_state: state,
      physical_state: 'debout, immobile',
      location,
    }],
    open_threads: ['Qu\'est-ce qui l\'attend ?'],
  };
}

function makeBeat(id: string, action: string, intention: string, pivot: boolean, delta: number): Beat {
  return { beat_id: id, action, intention, pivot, tension_delta: delta, information_revealed: [], information_withheld: [] };
}

function makeScene(
  sceneId: string,
  objective: string,
  conflict: string,
  conflictType: 'external' | 'internal' | 'relational',
  emotionTarget: string,
  intensity: number,
  sensoryAnchor: string,
  beats: readonly Beat[],
  subtext: { character_thinks: string; reader_knows: string; tension_type: string; implied_emotion: string },
  wordCount: number = 600,
): Scene {
  return {
    scene_id: sceneId,
    arc_id: 'arc_01',
    objective,
    conflict,
    conflict_type: conflictType,
    emotion_target: emotionTarget,
    emotion_intensity: intensity,
    seeds_planted: [],
    seeds_bloomed: [],
    subtext,
    sensory_anchor: sensoryAnchor,
    constraints: [],
    beats,
    target_word_count: wordCount,
    justification: objective,
  };
}

function makePlan(planId: string, scene: Scene, emotionTarget: string, intensity: number): GenesisPlan {
  const arc: Arc = { arc_id: 'arc_01', theme: 'intérieur', progression: 'montante', scenes: [scene], justification: 'arc principal' };
  return {
    plan_id: planId,
    plan_hash: 'c'.repeat(64),
    version: '1.0.0',
    intent_hash: 'd'.repeat(64),
    canon_hash: 'e'.repeat(64),
    constraints_hash: 'f'.repeat(64),
    genome_hash: '0'.repeat(64),
    emotion_hash: '1'.repeat(64),
    arcs: [arc],
    seed_registry: [],
    tension_curve: [0.2, 0.4, 0.6, 0.8, 0.7],
    emotion_trajectory: [
      { position: 0.0,  emotion: emotionTarget, intensity: intensity * 0.4 },
      { position: 0.25, emotion: emotionTarget, intensity: intensity * 0.7 },
      { position: 0.5,  emotion: emotionTarget, intensity: intensity },
      { position: 0.75, emotion: emotionTarget, intensity: intensity * 0.9 },
      { position: 1.0,  emotion: 'sadness',     intensity: intensity * 0.5 },
    ],
    scene_count: 1,
    beat_count: scene.beats.length,
    estimated_word_count: scene.target_word_count,
  };
}

function makeInput(i: number, scene: Scene, plan: GenesisPlan, canon: readonly CanonEntry[], continuity: ForgeContinuity): ForgePacketInput {
  return { plan, scene, style_profile: BASE_STYLE, kill_lists: BASE_KILL_LISTS, canon, continuity, run_id: `bench-${i}-${scene.scene_id}`, language: 'fr' };
}

// ── 30 scènes FR variées ──────────────────────────────────────────────────────

function buildInputs(): ForgePacketInput[] {
  const SCENES: Array<{ s: Scene; canon: readonly CanonEntry[]; continuity: ForgeContinuity }> = [

    // 0 — fear / external
    { s: makeScene('s00','Claire découvre que la maison est surveillée','Claire vs. menace extérieure','external','fear',0.8,'Odeur de tabac froid et craquement du parquet',
        [makeBeat('b00a','Claire entend un bruit derrière la fenêtre','installer la tension',false,0),makeBeat('b00b','Elle voit une silhouette','pivot',true,1)],
        {character_thinks:'On me surveille',reader_knows:'La silhouette est armée',tension_type:'suspense',implied_emotion:'fear'},600),
      canon:makeCanon('s00',['La maison est isolée en forêt','Claire est seule ce soir']), continuity:makeContinuity('Claire est rentrée chez elle','Claire','anxieuse','cuisine') },

    // 1 — sadness / internal
    { s: makeScene('s01','Paul lit la lettre de son père décédé','Paul vs. son passé','internal','sadness',0.75,'Papier jauni, encre pâlie, odeur de cave',
        [makeBeat('b01a','Paul ouvre l\'enveloppe','amorce',false,0),makeBeat('b01b','Il reconnaît l\'écriture tremblée','effondrement',true,1)],
        {character_thinks:'Il savait',reader_knows:'Le père avait tout compris',tension_type:'révélation',implied_emotion:'grief'},500),
      canon:makeCanon('s01',['Le père est mort il y a un an','Paul n\'a jamais lu le testament']), continuity:makeContinuity('Paul a trouvé une lettre dans le grenier','Paul','accablé','grenier') },

    // 2 — anticipation / relational
    { s: makeScene('s02','Sophie attend la réponse de Léa','Sophie vs. silence de Léa','relational','anticipation',0.7,'Téléphone posé sur la table, écran noir',
        [makeBeat('b02a','Sophie relit son message','doute',false,0),makeBeat('b02b','Le téléphone vibre — puis silence','pivot',true,1)],
        {character_thinks:'Elle ne répondra pas',reader_knows:'Léa a vu le message',tension_type:'attente',implied_emotion:'anxiety'},550),
      canon:makeCanon('s02',['Sophie et Léa se connaissent depuis l\'enfance','Elles se sont disputées hier']), continuity:makeContinuity('Sophie a envoyé un message de réconciliation','Sophie','tendue','salon') },

    // 3 — anger / external
    { s: makeScene('s03','Marc apprend que son collègue l\'a trahi','Marc vs. trahison professionnelle','external','anger',0.85,'Bureau en open space, néons, bruit de clavier',
        [makeBeat('b03a','Marc découvre l\'email transféré','choc',false,0),makeBeat('b03b','Il regarde son collègue de l\'autre côté de la salle','confrontation silencieuse',true,1)],
        {character_thinks:'Je lui faisais confiance',reader_knows:'La trahison était calculée',tension_type:'confrontation',implied_emotion:'betrayal'},580),
      canon:makeCanon('s03',['Marc travaille sur un projet confidentiel','Son collègue Thomas est ambitieux']), continuity:makeContinuity('Marc vient de recevoir une alerte email','Marc','figé','bureau') },

    // 4 — trust / relational
    { s: makeScene('s04','Emma confie un secret à sa mère pour la première fois','Emma vs. pudeur familiale','relational','trust',0.65,'Cuisine familiale, odeur de café, radio en fond',
        [makeBeat('b04a','Emma commence à parler, hésite','amorce',false,0),makeBeat('b04b','Sa mère pose la tasse et l\'écoute sans rien dire','pivot',true,0)],
        {character_thinks:'Elle va me juger',reader_knows:'La mère a toujours su',tension_type:'vulnérabilité',implied_emotion:'intimacy'},520),
      canon:makeCanon('s04',['Emma a un secret depuis trois ans','Sa mère a attendu sans demander']), continuity:makeContinuity('Emma est rentrée plus tôt que prévu','Emma','hésitante','cuisine') },

    // 5 — disgust / internal
    { s: makeScene('s05','Victor réalise qu\'il est devenu ce qu\'il haïssait','Victor face à son reflet moral','internal','disgust',0.8,'Miroir de salle de bain, eau qui coule, silence',
        [makeBeat('b05a','Victor se revoit dans la scène d\'hier','mémoire involontaire',false,0),makeBeat('b05b','Il reconnaît les mots de son père dans sa bouche','révélation',true,1)],
        {character_thinks:'Je suis comme lui',reader_knows:'Victor a reproduit exactement la scène',tension_type:'reconnaissance morale',implied_emotion:'self-disgust'},560),
      canon:makeCanon('s05',['Victor a toujours détesté son père autoritaire','La nuit dernière il a crié sur son fils']), continuity:makeContinuity('Victor se lave les mains après une dispute','Victor','nauséeux','salle de bain') },

    // 6 — joy / relational
    { s: makeScene('s06','Nadia retrouve sa sœur après cinq ans de silence','retrouvailles inattendues','relational','joy',0.7,'Quai de gare, foule, lumière blanche de midi',
        [makeBeat('b06a','Nadia voit sa sœur dans la foule','reconnaissance',false,0),makeBeat('b06b','Elles restent à distance une seconde avant de s\'approcher','hésitation',true,0)],
        {character_thinks:'Cinq ans, c\'est long',reader_knows:'Les deux sœurs ont toutes les deux eu peur que l\'autre ne vienne pas',tension_type:'joie contenue',implied_emotion:'relief'},490),
      canon:makeCanon('s06',['Les sœurs se sont brouillées pour une raison ancienne','Nadia a fait le premier pas']), continuity:makeContinuity('Nadia attend sur le quai','Nadia','nerveuse','gare') },

    // 7 — fear / internal
    { s: makeScene('s07','Julien doit parler en public pour la première fois','Julien vs. paralysie','internal','fear',0.75,'Salle de conférence, micro, silence de cinq secondes',
        [makeBeat('b07a','Julien monte sur l\'estrade','amorce',false,0),makeBeat('b07b','Il ouvre la bouche — rien ne sort','blocage',true,1)],
        {character_thinks:'Ils voient ma peur',reader_knows:'La salle attend avec bienveillance',tension_type:'phobie sociale',implied_emotion:'paralysis'},540),
      canon:makeCanon('s07',['Julien a une phobie de la prise de parole','Ce discours peut changer sa carrière']), continuity:makeContinuity('Julien a préparé son discours pendant trois semaines','Julien','paniqué','estrade') },

    // 8 — sadness / relational
    { s: makeScene('s08','Inès dit au revoir à sa meilleure amie qui part vivre à l\'étranger','séparation définitive','relational','sadness',0.8,'Aéroport, sacs sous les yeux, café froid',
        [makeBeat('b08a','Elles font semblant de parler normalement','évitement',false,0),makeBeat('b08b','L\'annonce du vol résonne','pivot',true,1)],
        {character_thinks:'Je ne peux pas lui dire ce que ça signifie pour moi',reader_knows:'C\'est leur dernière heure ensemble',tension_type:'deuil anticipé',implied_emotion:'loss'},620),
      canon:makeCanon('s08',['Elles sont amies depuis l\'école primaire','Inès ne voyage jamais']), continuity:makeContinuity('Elles arrivent à l\'aéroport','Inès','épuisée','hall départs') },

    // 9 — anger / internal
    { s: makeScene('s09','David se retient de répondre à une injustice au travail','violence intérieure contenue','internal','anger',0.9,'Salle de réunion, projecteur allumé, odeur de renfermé',
        [makeBeat('b09a','Son directeur prend crédit de son travail devant le comité','incident',false,0),makeBeat('b09b','David serre ses mains sous la table','contention',true,1)],
        {character_thinks:'Je dois rester calme',reader_knows:'David est à la limite',tension_type:'rage contenue',implied_emotion:'suppressed fury'},580),
      canon:makeCanon('s09',['David a passé six mois sur ce projet','Son directeur est politiquement intouchable']), continuity:makeContinuity('La réunion a commencé','David','tendu','salle de réunion') },

    // 10 — anticipation / external
    { s: makeScene('s10','Camille ouvre la lettre du médecin','Camille vs. verdict médical','external','anticipation',0.85,'Bureau de poste, lumière de fin de journée',
        [makeBeat('b10a','Camille tient l\'enveloppe sans l\'ouvrir','résistance',false,0),makeBeat('b10b','Elle l\'ouvre — le texte est flou','lecture impossible',true,1)],
        {character_thinks:'Si je ne lis pas, ça n\'existe pas',reader_knows:'Le résultat est là depuis trois jours',tension_type:'suspension',implied_emotion:'dread'},510),
      canon:makeCanon('s10',['Camille attend les résultats d\'une biopsie','Elle a repoussé l\'ouverture deux fois']), continuity:makeContinuity('Camille a récupéré le courrier','Camille','hors du temps','entrée appartement') },

    // 11 — trust / internal
    { s: makeScene('s11','Lucas doit décider de croire ou non à la version de son frère','confiance mise à l\'épreuve','internal','trust',0.65,'Appartement du frère, désordre, fenêtre ouverte',
        [makeBeat('b11a','Le frère lui explique ce qui s\'est passé','récit',false,0),makeBeat('b11b','Lucas cherche le mensonge dans les yeux de son frère','interrogation silencieuse',true,0)],
        {character_thinks:'Est-ce qu\'il me dit la vérité',reader_knows:'Le frère cache une partie',tension_type:'doute fraternel',implied_emotion:'ambivalence'},530),
      canon:makeCanon('s11',['Les frères ont un historique de mensonges réciproques','Cette fois l\'enjeu est judiciaire']), continuity:makeContinuity('Lucas arrive chez son frère appelé en urgence','Lucas','méfiant','salon du frère') },

    // 12 — fear / relational
    { s: makeScene('s12','Élodie réalise que son enfant lui ment pour la première fois','rupture de confiance maternelle','relational','fear',0.7,'Chambre d\'enfant, jouets épars, soir',
        [makeBeat('b12a','Elle pose la question directement','confrontation douce',false,0),makeBeat('b12b','Son fils détourne les yeux','premier mensonge',true,1)],
        {character_thinks:'Il grandit, je le perds déjà',reader_knows:'Le mensonge est anodin mais signifie tout',tension_type:'transition',implied_emotion:'grief for childhood'},490),
      canon:makeCanon('s12',['Tom a sept ans','Élodie a toujours voulu une relation transparente avec lui']), continuity:makeContinuity('Tom rentre de l\'école avec quelque chose d\'étrange dans le regard','Élodie','alerte','chambre de Tom') },

    // 13 — sadness / external
    { s: makeScene('s13','Armand vide l\'appartement de son père','travail du deuil concret','external','sadness',0.8,'Appartement vide, cartons, soleil oblique',
        [makeBeat('b13a','Il emballe les objets du bureau','geste mécanique',false,0),makeBeat('b13b','Il trouve une photo qu\'il ne connaît pas','arrêt',true,1)],
        {character_thinks:'Je ne le connaissais pas si bien que ça',reader_knows:'Il y a une vie entière dans cette photo',tension_type:'découverte posthume',implied_emotion:'tender grief'},570),
      canon:makeCanon('s13',['Le père d\'Armand est mort il y a deux semaines','Armand est fils unique']), continuity:makeContinuity('Armand est venu seul vider l\'appartement','Armand','anesthésié','bureau du père') },

    // 14 — anger / relational
    { s: makeScene('s14','Fatima confronte sa meilleure amie sur un mensonge','amitié vs. vérité','relational','anger',0.75,'Parc, vent, banc en bois',
        [makeBeat('b14a','Fatima pose la lettre sur le banc entre elles','geste',false,0),makeBeat('b14b','Son amie ne nie pas','aveu par silence',true,1)],
        {character_thinks:'Dis-moi que ce n\'est pas vrai',reader_knows:'C\'est vrai, et l\'amie le sait depuis longtemps',tension_type:'confrontation amicale',implied_emotion:'wounded anger'},500),
      canon:makeCanon('s14',['Elles sont amies depuis quinze ans','La lettre prouve une trahison ancienne']), continuity:makeContinuity('Fatima a trouvé une lettre dans les affaires de son amie','Fatima','dévastée','parc') },

    // 15 — joy / internal
    { s: makeScene('s15','Bernard relit les premières pages de son roman enfin terminé','accomplissement tardif','internal','joy',0.65,'Bibliothèque personnelle, nuit, lampe de bureau',
        [makeBeat('b15a','Il imprime le manuscrit','rituel',false,0),makeBeat('b15b','Il lit la première phrase à voix haute','vérification',true,0)],
        {character_thinks:'C\'est vraiment moi qui ai écrit ça',reader_knows:'Bernard a travaillé sur ce roman vingt ans',tension_type:'accomplissement fragile',implied_emotion:'quiet pride'},480),
      canon:makeCanon('s15',['Bernard a soixante-deux ans','Il a abandonné puis repris ce roman trois fois']), continuity:makeContinuity('Bernard vient d\'écrire la dernière phrase','Bernard','étourdi','bibliothèque') },

    // 16 — disgust / external
    { s: makeScene('s16','Sylvie assiste à l\'humiliation d\'un stagiaire en réunion','témoin d\'une violence ordinaire','external','disgust',0.8,'Salle de réunion corporate, fenêtres sur la ville',
        [makeBeat('b16a','Le manager coupe la parole au stagiaire','incident',false,0),makeBeat('b16b','Personne ne réagit — sauf Sylvie qui pose son stylo','résistance',true,1)],
        {character_thinks:'Personne ne dit rien',reader_knows:'Sylvie a été ce stagiaire il y a dix ans',tension_type:'complicité vs révolte',implied_emotion:'moral nausea'},550),
      canon:makeCanon('s16',['Sylvie est directrice adjointe','Elle connaît le manager depuis l\'université']), continuity:makeContinuity('La réunion mensuelle vient de commencer','Sylvie','tendue','salle du comité') },

    // 17 — anticipation / internal
    { s: makeScene('s17','Moussa attend le verdict du jury de thèse','cinq ans de travail en suspens','internal','anticipation',0.9,'Couloir de fac, chaises en plastique, bourdonnement lointain',
        [makeBeat('b17a','La porte reste fermée depuis vingt minutes','attente',false,0),makeBeat('b17b','Des voix s\'élèvent derrière la porte — puis silence','signal ambigu',true,1)],
        {character_thinks:'Cinq ans pour ça',reader_knows:'Le jury délibère sur un point précis',tension_type:'suspension du destin',implied_emotion:'suspended dread'},530),
      canon:makeCanon('s17',['Moussa a trente et un ans','C\'est sa deuxième soutenance']), continuity:makeContinuity('Moussa est sorti de la salle pendant la délibération','Moussa','pétrifié','couloir de l\'université') },

    // 18 — fear / external
    { s: makeScene('s18','Hélène reçoit un message d\'un numéro inconnu','menace diffuse','external','fear',0.7,'Chambre d\'hôtel, nuit, écran de téléphone',
        [makeBeat('b18a','Elle lit le message une première fois','compréhension initiale',false,0),makeBeat('b18b','Elle réalise que le message décrit son hôtel','escalade',true,1)],
        {character_thinks:'Comment ils savent où je suis',reader_knows:'Elle est suivie depuis deux jours',tension_type:'surveil_ance',implied_emotion:'paranoia'},590),
      canon:makeCanon('s18',['Hélène voyage seule pour un congrès','Elle n\'a dit à personne où elle logeait']), continuity:makeContinuity('Hélène vient de se coucher','Hélène','alarmée','chambre d\'hôtel') },

    // 19 — sadness / internal
    { s: makeScene('s19','René prend conscience que sa femme ne le regarde plus vraiment','dissolution silencieuse','internal','sadness',0.75,'Salle à manger familiale, dîner, enfants présents',
        [makeBeat('b19a','René essaie de capter le regard de sa femme','tentative',false,0),makeBeat('b19b','Elle rit à quelque chose que dit leur fils — sans le regarder','confirmation',true,0)],
        {character_thinks:'Depuis quand est-ce que c\'est comme ça',reader_knows:'Ça fait deux ans que quelque chose se déplace',tension_type:'alienation conjugale',implied_emotion:'invisible grief'},510),
      canon:makeCanon('s19',['Ils sont mariés depuis quinze ans','Rien ne s\'est passé de précis']), continuity:makeContinuity('C\'est le dîner du vendredi soir','René','absent','salle à manger') },

    // 20 — trust / external
    { s: makeScene('s20','Lucie doit signer un contrat qu\'elle n\'a pas eu le temps de lire','pression institutionnelle','external','trust',0.6,'Notaire, bureau formel, encre fraîche',
        [makeBeat('b20a','Le notaire lui présente le stylo','pression',false,0),makeBeat('b20b','Lucie pose sa main sur le document sans signer','résistance',true,0)],
        {character_thinks:'Je ne signe pas ce que je n\'ai pas lu',reader_knows:'Les autres attendent depuis une heure',tension_type:'intégrité vs pression sociale',implied_emotion:'quiet resistance'},460),
      canon:makeCanon('s20',['Lucie vient d\'hériter','Le contrat concerne la vente d\'une maison de famille']), continuity:makeContinuity('La cérémonie de signature a commencé','Lucie','sur ses gardes','office notarial') },

    // 21 — anger / internal
    { s: makeScene('s21','Ibrahim relit sa propre lettre de démission qu\'il ne peut pas envoyer','rage économique retenue','internal','anger',0.85,'Appartement, minuit, ordinateur allumé',
        [makeBeat('b21a','Il relit la lettre pour la dixième fois','rumination',false,0),makeBeat('b21b','Il passe le curseur sur Envoyer — recule','impossibilité',true,1)],
        {character_thinks:'Je ne peux pas me le permettre',reader_knows:'Ibrahim a deux enfants et un loyer',tension_type:'piège économique',implied_emotion:'trapped rage'},570),
      canon:makeCanon('s21',['Ibrahim travaille dans cette entreprise depuis huit ans','Il est méprisé par son supérieur']), continuity:makeContinuity('Ibrahim rentre à minuit après une humiliation au travail','Ibrahim','épuisé','bureau à domicile') },

    // 22 — joy / relational
    { s: makeScene('s22','Théo reçoit le dessin de son fils pour son anniversaire','amour simple','relational','joy',0.6,'Cuisine, matin, emballage maladroit',
        [makeBeat('b22a','Son fils lui tend le paquet en rougissant','geste enfantin',false,0),makeBeat('b22b','Théo voit le dessin et ne dit rien pendant trois secondes','absorption',true,0)],
        {character_thinks:'C\'est moi sur le dessin, clairement',reader_knows:'L\'enfant y a passé la semaine en cachette',tension_type:'tendresse',implied_emotion:'overwhelmed love'},450),
      canon:makeCanon('s22',['Théo travaille beaucoup et manque souvent le dîner','Son fils a huit ans']), continuity:makeContinuity('C\'est l\'anniversaire de Théo','Théo','surpris','cuisine') },

    // 23 — fear / relational
    { s: makeScene('s23','Mariam réalise que son ami d\'enfance est en danger','urgence et impuissance','relational','fear',0.85,'Appartement, soir, téléphone qui ne répond pas',
        [makeBeat('b23a','Elle rappelle pour la troisième fois','répétition anxieuse',false,0),makeBeat('b23b','Sa messagerie indique que le téléphone est éteint','escalade',true,1)],
        {character_thinks:'Quelque chose s\'est passé',reader_knows:'Son ami est en crise depuis deux semaines',tension_type:'urgence silencieuse',implied_emotion:'helpless dread'},580),
      canon:makeCanon('s23',['Mariam sait que son ami traverse une période noire','Il lui a envoyé un message étrange hier']), continuity:makeContinuity('Mariam n\'a pas eu de nouvelles de toute la journée','Mariam','alarmée','son appartement') },

    // 24 — anticipation / relational
    { s: makeScene('s24','Chloé attend son ex devant le café où ils ont rompu','retour circulaire','relational','anticipation',0.7,'Terrasse de café, printemps, passants',
        [makeBeat('b24a','Elle arrive en avance et choisit la même table','rituel',false,0),makeBeat('b24b','Elle le voit arriver de loin et hésite à rester','dernier doute',true,1)],
        {character_thinks:'Pourquoi j\'ai dit oui à ce café',reader_knows:'Ils ont tous les deux dit oui trop vite',tension_type:'retour ambigu',implied_emotion:'bittersweet anxiety'},500),
      canon:makeCanon('s24',['Ils ont rompu dans ce café il y a deux ans','C\'est lui qui a demandé à se revoir']), continuity:makeContinuity('Chloé est arrivée en avance','Chloé','ambivalente','terrasse de café') },

    // 25 — disgust / relational
    { s: makeScene('s25','Alice doit prétendre être heureuse au mariage d\'un homme qu\'elle a dénoncé','hypocrisie sociale forcée','relational','disgust',0.8,'Salle de mariage, champagne, lumière chaude',
        [makeBeat('b25a','Elle sourit à la table des témoins','performance',false,0),makeBeat('b25b','Il vient la remercier d\'être là','fausse réconciliation',true,1)],
        {character_thinks:'Je ne devrais pas être là',reader_knows:'Alice a dénoncé son comportement à HR deux ans plus tôt',tension_type:'obligation sociale vs intégrité',implied_emotion:'revulsion'},570),
      canon:makeCanon('s25',['Alice a gardé son emploi mais perdu toute crédibilité','Son accusation a été classée sans suite']), continuity:makeContinuity('Le mariage a commencé','Alice','figée','table des invités') },

    // 26 — sadness / relational
    { s: makeScene('s26','Nathan essaie d\'expliquer sa dépression à son père','langage impossible','relational','sadness',0.8,'Salon familial, télévision éteinte, café tiède',
        [makeBeat('b26a','Nathan commence par les faits concrets','tentative rationnelle',false,0),makeBeat('b26b','Son père dit "il faut te secouer" sans méchanceté','incompréhension bienveillante',true,0)],
        {character_thinks:'Il ne comprend pas et ne peut pas comprendre',reader_knows:'Le père veut sincèrement aider',tension_type:'solitude dans la famille',implied_emotion:'exhausted isolation'},540),
      canon:makeCanon('s26',['Nathan a trente ans','Son père est un homme de sa génération, pragmatique']), continuity:makeContinuity('Nathan a décidé de parler à son père','Nathan','épuisé','salon parental') },

    // 27 — anger / external
    { s: makeScene('s27','Aya découvre que son dossier de candidature a été écarté sans lecture','discrimination systémique','external','anger',0.85,'Couloir d\'un immeuble de bureaux, lumière fluorescente',
        [makeBeat('b27a','La RH lui explique la procédure','bureaucratie',false,0),makeBeat('b27b','Aya voit son dossier intact dans la corbeille','preuve',true,1)],
        {character_thinks:'Mon nom a suffi',reader_knows:'Trois autres dossiers avec des noms similaires sont dans la même corbeille',tension_type:'injustice systémique',implied_emotion:'cold fury'},560),
      canon:makeCanon('s27',['Aya est diplômée d\'une grande école','Elle postule pour un poste où elle est surqualifiée']), continuity:makeContinuity('Aya vient pour un entretien','Aya','meurtrie','hall d\'immeuble') },

    // 28 — trust / relational
    { s: makeScene('s28','Léon demande à sa fille de lui pardonner','réconciliation tardive','relational','trust',0.7,'Jardin, automne, feuilles',
        [makeBeat('b28a','Il commence par les excuses préparées','discours',false,0),makeBeat('b28b','Sa fille dit "je sais" et rien d\'autre','réponse minimale',true,0)],
        {character_thinks:'Est-ce que c\'est assez',reader_knows:'La fille a attendu quinze ans cette phrase',tension_type:'réconciliation incomplète',implied_emotion:'fragile hope'},490),
      canon:makeCanon('s28',['Léon a été absent pendant l\'enfance de sa fille','Il a soixante ans']), continuity:makeContinuity('Léon a demandé à sa fille de venir','Léon','vulnérable','jardin') },

    // 29 — anticipation / external
    { s: makeScene('s29','Zoé entre dans la chambre de son père hospitalisé','présent en suspens','external','anticipation',0.75,'Couloir d\'hôpital, odeur d\'alcool, bruit de machines',
        [makeBeat('b29a','Elle s\'arrête devant la porte','seuil',false,0),makeBeat('b29b','Elle entend sa respiration de l\'autre côté','signal',true,0)],
        {character_thinks:'Comment il va être',reader_knows:'Son état a changé cette nuit',tension_type:'seuil de l\'irréversible',implied_emotion:'suspended grief'},530),
      canon:makeCanon('s29',['Le père de Zoé est hospitalisé depuis trois jours','Zoé n\'est pas venue depuis l\'annonce']), continuity:makeContinuity('Zoé arrive à l\'hôpital','Zoé','en suspend','couloir des soins intensifs') },
  ];

  return SCENES.map((def, i) => makeInput(i, def.s, makePlan(`plan-${i}`, def.s, def.s.emotion_target, def.s.emotion_intensity), def.canon, def.continuity));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    console.error('[FATAL] ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  const gitHead = getGitHead();
  console.log(`[OMEGA U-BENCH] HEAD=${gitHead.slice(0, 8)} | K=${K_COUNT} | RUNS=${RUN_COUNT}${IS_MICRO ? ' [MICRO-TEST]' : ''}`);
  console.log(`[OMEGA U-BENCH] Model: ${MODEL_ID}`);
  console.log(`[OMEGA U-BENCH] Building ${RUN_COUNT} ForgePacketInputs...`);

  const allInputs = buildInputs();
  const inputs = allInputs.slice(0, RUN_COUNT);
  if (inputs.length !== RUN_COUNT) {
    console.error(`[FATAL] Expected ${RUN_COUNT} inputs, got ${inputs.length}`);
    process.exit(1);
  }

  const provider = createAnthropicProvider({
    apiKey,
    model: MODEL_ID,
    judgeStable: true,
    draftTemperature: 0.85,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 200,
  });

  const cachePath = path.join(__dirname, '..', 'sessions', 'judge-cache-phase-u.json');
  const cache = new JudgeCache(cachePath);

  const runner = new DualBenchmarkRunner(provider, MODEL_ID, apiKey, cache, K_COUNT);

  const estCalls = IS_MICRO ? `~${3 + 3 * K_COUNT} API calls` : '~360-460 API calls';
  console.log(`[OMEGA U-BENCH] Starting execution — ${RUN_COUNT} one-shot + ${RUN_COUNT} top-K (K=${K_COUNT})...`);
  console.log(`[OMEGA U-BENCH] Estimated: ${estCalls} — patience required`);

  const startMs = Date.now();
  let pack;
  try {
    pack = await runner.execute(inputs, ROOT_SEED, gitHead);
  } catch (err) {
    if (err instanceof CreditExhaustedError) {
      console.error(`\n[OMEGA U-BENCH] \u26a0\ufe0f  CREDIT EXHAUSTED — run aborted. Recharge API credits before next run.`);
      process.exit(3);
    }
    throw err;
  }
  const elapsedS = Math.round((Date.now() - startMs) / 1000);

  console.log(`\n[OMEGA U-BENCH] Execution complete in ${elapsedS}s`);
  console.log(`[OMEGA U-BENCH] one-shot SEAL rate: ${(pack.summary.seal_rate_oneshot * 100).toFixed(1)}%`);
  console.log(`[OMEGA U-BENCH] top-K   SEAL rate: ${(pack.summary.seal_rate_topk    * 100).toFixed(1)}%`);
  console.log(`[OMEGA U-BENCH] Greatness median top-1: ${pack.summary.greatness_median_topk}`);
  console.log(`[OMEGA U-BENCH] Gain top-K vs one-shot: ${pack.summary.gain_pct}%`);
  console.log(`[OMEGA U-BENCH] EXIT VERDICT: ${pack.summary.exit_report.verdict}`);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const packDir = writeValidationPack(pack, OUT_DIR);
  console.log(`\n[OMEGA U-BENCH] ValidationPack written: ${packDir}`);
  console.log(`[OMEGA U-BENCH] SHA256SUMS.txt: OK`);

  if (pack.summary.exit_report.verdict === 'PASS') {
    console.log('\n✅ PHASE U — VERDICT: PASS — Merge autorisé après vérification clause 7 conditions');
  } else if (pack.summary.exit_report.verdict === 'FAIL') {
    console.log('\n❌ PHASE U — VERDICT: FAIL — Merge BLOQUÉ');
    for (const f of pack.summary.exit_report.blocking_failures) {
      console.log(`   FAIL: ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\n⚠️  PHASE U — VERDICT: INSUFFICIENT_DATA');
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
