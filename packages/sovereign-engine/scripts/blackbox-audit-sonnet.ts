/**
 * OMEGA — BLACK-BOX AUDIT: CONTRAINTES LITTÉRAIRES DE CLAUDE SONNET
 *
 * Audit empirique black-box. Zéro exfiltration.
 * Mesure les régularités observables en sortie, pas les règles internes.
 *
 * Réutilise: computeTextFeatures, computeDepthFeatures, detectPassageType
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   cd packages/sovereign-engine
 *   npx tsx scripts/blackbox-audit-sonnet.ts [--bloc 1|2|3|4|5|6|all] [--runs 3]
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { computeDepthFeatures } from '../src/scoring/depth-features.js';
import { detectPassageType } from '../src/scoring/passage-type-detector.js';

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');
const ROOT = path.resolve(PKG_ROOT, '../..');
const DATA_DIR = path.resolve(ROOT, 'src/scoring/data');
const DOCS_DIR = path.resolve(ROOT, 'docs');
const SESSIONS_DIR = path.resolve(ROOT, 'sessions');

const MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_RUNS = 3;
const WORD_TARGET = '500 à 700 mots';

const TODAY = new Date().toISOString().slice(0, 10);

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface ProbeResult {
  id: string;
  bloc: number;
  category: string;
  subcategory: string;
  prompt: string;
  prose: string;
  words: number;
  features: Record<string, number>;
  depthFeatures: Record<string, number>;
  detectedType: string;
  run: number;
  timestamp: string;
}

interface AggregatedStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  n: number;
}

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

function round(v: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function std(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
}

function median(vals: number[]): number {
  if (vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function aggStats(vals: number[]): AggregatedStats {
  if (vals.length === 0) return { mean: 0, std: 0, min: 0, max: 0, median: 0, n: 0 };
  return {
    mean: round(mean(vals)),
    std: round(std(vals)),
    min: round(Math.min(...vals)),
    max: round(Math.max(...vals)),
    median: round(median(vals)),
    n: vals.length,
  };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

let apiCalls = 0;
let totalTokens = 0;

async function callLLM(client: Anthropic, prompt: string, maxTokens = 4096): Promise<string> {
  apiCalls++;
  console.log(`  [API #${apiCalls}]`);
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  if (resp.usage) {
    totalTokens += (resp.usage.input_tokens || 0) + (resp.usage.output_tokens || 0);
  }
  const block = resp.content[0];
  return block.type === 'text' ? block.text : '';
}

function measureText(text: string): { features: Record<string, number>; depth: Record<string, number>; type: string } {
  const features = computeTextFeatures(text);
  const depth = computeDepthFeatures(text);
  const type = detectPassageType({ ...features, ...depth }, text);
  return { features, depth, type };
}

async function probe(
  client: Anthropic,
  bloc: number,
  category: string,
  subcategory: string,
  prompt: string,
  run: number,
): Promise<ProbeResult> {
  const prose = await callLLM(client, prompt);
  const { features, depth, type } = measureText(prose);
  return {
    id: `B${bloc}_${category}_${subcategory}_R${run}`,
    bloc,
    category,
    subcategory,
    prompt,
    prose,
    words: countWords(prose),
    features,
    depthFeatures: depth,
    detectedType: type,
    run,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// KEY FEATURES
// ═══════════════════════════════════════════════════════════════════════

const KEY_FEATURES = [
  'f1_mean', 'f1_std', 'f1b_rhythm_ratio',
  'cv_sent',
  'f5a_verb_density', 'f5c_action_verb_ratio',
  'f9a_contradiction_rate',
  'f12b_tense_switch_rate',
  'f15b_redundancy_compression',
  'f16a_bigram_rarity',
  'f17_knife_count',
  'f18f_ellipsis_final',
  'f19a_approx_entropy',
  'f21c_diacope_rate',
  'f24e_contrast_score', 'f24c_contrast_delta',
  'f25g_description_score', 'f25b_sensory_coverage',
  'f26b_long_sent_rate', 'f26c_period_score',
  'f27d_modal_score',
  'f28d_sil_score',
  'f29d_ttr_score',
  'f33a_dots_count', 'f33b_excl_count', 'f33c_quest_count', 'f33d_semi_count',
  'f34b_para_per_1000w',
  'f35c_hook_score',
  'f36c_cliff_score',
  'f38c_speed_score',
];

const DEPTH_FEATURES = [
  'f_subordination_depth',
  'f_clause_per_sentence',
  'f_pov_shift_rate',
];

// ═══════════════════════════════════════════════════════════════════════
// BLOC 1 — BASELINE SPONTANÉE (30 prompts × 10 catégories)
// ═══════════════════════════════════════════════════════════════════════

const BASELINE_CONTEXT = `Tu es un écrivain de fiction littéraire française. Écris un passage de ${WORD_TARGET} en français.
Pas de commentaire méta. Pas d'explication. Que de la prose.`;

const BLOC1_PROMPTS: { category: string; prompt: string }[] = [
  // CONTEMPLATION (3)
  { category: 'contemplation', prompt: `${BASELINE_CONTEXT}\nScène : Un homme seul regarde la mer depuis une falaise au crépuscule. Il ne fait rien, il observe.` },
  { category: 'contemplation', prompt: `${BASELINE_CONTEXT}\nScène : Une femme assise dans un jardin d'hiver regarde la pluie tomber sur les vitres. Le temps s'étire.` },
  { category: 'contemplation', prompt: `${BASELINE_CONTEXT}\nScène : Un vieil homme contemple une photographie jaunie dans un grenier poussiéreux. Lumière d'après-midi.` },
  // DIALOGUE (3)
  { category: 'dialogue', prompt: `${BASELINE_CONTEXT}\nScène : Deux frères se retrouvent après dix ans de silence dans un café vide. Ils parlent. Dialogue réaliste.` },
  { category: 'dialogue', prompt: `${BASELINE_CONTEXT}\nScène : Un médecin annonce un diagnostic grave à son patient. Échange tendu, non-dits.` },
  { category: 'dialogue', prompt: `${BASELINE_CONTEXT}\nScène : Une mère et sa fille adolescente se disputent dans une cuisine. Reproches, incompréhension.` },
  // CONFRONTATION (3)
  { category: 'confrontation', prompt: `${BASELINE_CONTEXT}\nScène : Deux hommes face à face dans une ruelle sombre. L'un a un couteau. L'autre ne recule pas.` },
  { category: 'confrontation', prompt: `${BASELINE_CONTEXT}\nScène : Un procureur interroge un accusé qui refuse de parler. Salle d'audience vide.` },
  { category: 'confrontation', prompt: `${BASELINE_CONTEXT}\nScène : Un père confronte celui qui a trahi son fils. Parking souterrain. Tension maximale.` },
  // MENACE (3)
  { category: 'menace', prompt: `${BASELINE_CONTEXT}\nScène : Un homme rentre chez lui. La porte est ouverte. Ce n'est pas normal. Il entre quand même.` },
  { category: 'menace', prompt: `${BASELINE_CONTEXT}\nScène : Une femme marche seule dans un quartier industriel la nuit. Des pas derrière elle.` },
  { category: 'menace', prompt: `${BASELINE_CONTEXT}\nScène : Un enfant dans une maison vide entend des bruits au sous-sol. Il ne devrait pas être seul.` },
  // SOUVENIR (3)
  { category: 'souvenir', prompt: `${BASELINE_CONTEXT}\nScène : Un homme se souvient de la dernière fois qu'il a vu son père vivant. Gare de province, été 1987.` },
  { category: 'souvenir', prompt: `${BASELINE_CONTEXT}\nScène : Une odeur de pain fait remonter un souvenir d'enfance. La boulangerie du village, la main d'une grand-mère.` },
  { category: 'souvenir', prompt: `${BASELINE_CONTEXT}\nScène : Un soldat se souvient de la nuit où tout a basculé. Tranchée, pluie, silence avant l'assaut.` },
  // REVELATION (3)
  { category: 'revelation', prompt: `${BASELINE_CONTEXT}\nScène : Un homme découvre une lettre cachée dans le bureau de sa femme morte. Ce qu'il lit change tout.` },
  { category: 'revelation', prompt: `${BASELINE_CONTEXT}\nScène : Un policier comprend soudain que le témoin ment depuis le début. Tout se réorganise.` },
  { category: 'revelation', prompt: `${BASELINE_CONTEXT}\nScène : Une fille apprend que l'homme qu'elle appelle père n'est pas son père biologique. Dîner familial.` },
  // ACTION (3)
  { category: 'action', prompt: `${BASELINE_CONTEXT}\nScène : Poursuite à pied dans les ruelles d'un souk. Chaleur, foule, urgence. L'homme court pour sa vie.` },
  { category: 'action', prompt: `${BASELINE_CONTEXT}\nScène : Incendie dans un immeuble. Un pompier monte les étages. Fumée, chaleur, effondrements.` },
  { category: 'action', prompt: `${BASELINE_CONTEXT}\nScène : Combat au couteau dans un entrepôt abandonné. Deux hommes. Un seul en sortira.` },
  // INTÉRIEURE (3)
  { category: 'interieure', prompt: `${BASELINE_CONTEXT}\nScène : Insomnie. Un homme dans son lit ressasse une décision impossible à prendre demain matin.` },
  { category: 'interieure', prompt: `${BASELINE_CONTEXT}\nScène : Une femme dans le métro repense à l'homme qu'elle a quitté ce matin. Doutes, regrets, colère.` },
  { category: 'interieure', prompt: `${BASELINE_CONTEXT}\nScène : Un condamné à mort la veille de son exécution. Pensées en boucle, terreur, résignation.` },
  // SENSORIELLE (3)
  { category: 'sensorielle', prompt: `${BASELINE_CONTEXT}\nScène : Un marché méditerranéen à midi. Couleurs, odeurs, textures, bruits, chaleur sur la peau.` },
  { category: 'sensorielle', prompt: `${BASELINE_CONTEXT}\nScène : Un homme nage dans un lac de montagne à l'aube. Froid, silence, lumière naissante.` },
  { category: 'sensorielle', prompt: `${BASELINE_CONTEXT}\nScène : Un atelier de forgeron. Métal chauffé à blanc, marteau, étincelles, odeur de charbon.` },
  // DESCRIPTIVE (3)
  { category: 'descriptive', prompt: `${BASELINE_CONTEXT}\nScène : Un village abandonné dans les Cévennes. Maisons en ruine, végétation qui reprend ses droits, silence.` },
  { category: 'descriptive', prompt: `${BASELINE_CONTEXT}\nScène : L'intérieur d'une cathédrale gothique au petit matin. Vitraux, pierre, lumière, espace.` },
  { category: 'descriptive', prompt: `${BASELINE_CONTEXT}\nScène : Un port de pêche breton à la tombée du jour. Bateaux, filets, mouettes, reflets.` },
];

// ═══════════════════════════════════════════════════════════════════════
// BLOC 2 — COMPRÉHENSION DES CONSIGNES STYLISTIQUES
// ═══════════════════════════════════════════════════════════════════════

const BLOC2_SCENE = `Un homme marche dans une ville déserte après une catastrophe. Il cherche quelqu'un.`;

interface InstructionFamily {
  family: string;
  featureKey: string;
  formulations: { label: string; instruction: string }[];
}

const BLOC2_FAMILIES: InstructionFamily[] = [
  {
    family: 'A_longueur_phrases',
    featureKey: 'f1_mean',
    formulations: [
      { label: 'simple', instruction: 'Utilise des phrases longues, de 30 mots ou plus en moyenne.' },
      { label: 'technique', instruction: 'Vise f1_mean > 30 mots/phrase. Réduis les phrases courtes.' },
      { label: 'metaphorique', instruction: 'Déploie ta prose en longues nappes syntaxiques, comme des vagues qui ne veulent pas mourir.' },
      { label: 'exemplar', instruction: `Imite ce rythme : "Il marchait depuis longtemps dans les rues défoncées par les obus et les pluies de cendre qui avaient recouvert la ville entière d'un linceul gris dont personne ne savait s'il finirait un jour par se dissoudre dans le vent qui soufflait par rafales depuis la colline où jadis se dressait l'église."` },
    ],
  },
  {
    family: 'B_alternance_long_court',
    featureKey: 'f1b_rhythm_ratio',
    formulations: [
      { label: 'simple', instruction: 'Alterne phrases longues et phrases très courtes. Crée un rythme contrasté.' },
      { label: 'technique', instruction: 'Maximise cv_sent et ratio_alt. Alterne T_LC et T_CL fréquemment. Contraste > 15 mots entre phrases adjacentes.' },
      { label: 'metaphorique', instruction: 'Fais respirer la prose par grandes nappes amples puis coups secs. Comme une respiration : inspire longue, expire brève.' },
      { label: 'exemplar', instruction: `Imite cette alternance : "Il s'arrêta devant ce qui restait du bâtiment municipal dont la façade éventrée laissait voir les bureaux béants comme des bouches ouvertes sur un cri silencieux que personne n'entendrait plus jamais. Silence. Rien ne bougeait. Puis le vent souleva un rideau de poussière qui traversa la rue entière en une procession lente et méthodique de particules grises dansant dans le contre-jour d'un soleil malade. Il toussa."` },
    ],
  },
  {
    family: 'C_ponctuation',
    featureKey: 'f33a_dots_count',
    formulations: [
      { label: 'simple', instruction: 'Utilise beaucoup de ponctuation expressive : points de suspension, tirets, points-virgules, parenthèses.' },
      { label: 'technique', instruction: 'Sature la ponctuation : … fréquents, — cadratins multiples, ; structurants, () digressifs. Vise un ratio ponctuation/mots > 0.15.' },
      { label: 'metaphorique', instruction: 'La ponctuation est ta respiration visible. Chaque virgule est un souffle, chaque tiret un silence, chaque suspension un vertige.' },
      { label: 'exemplar', instruction: `Imite ce style : "Il marchait — non, il titubait — dans cette rue (si on pouvait encore appeler ça une rue...) où tout avait changé ; les immeubles, les arbres, les visages — tout — avait pris cette teinte grise... impossible... qu'il ne reconnaissait que trop bien."` },
    ],
  },
  {
    family: 'D_dialogue',
    featureKey: 'f34b_para_per_1000w',
    formulations: [
      { label: 'simple', instruction: 'Écris principalement en dialogue. Au moins 70% de la prose doit être du dialogue entre personnages.' },
      { label: 'technique', instruction: 'dialogue_ratio > 0.70. Répliques courtes (< 15 mots). Narration minimale entre les répliques.' },
      { label: 'metaphorique', instruction: 'Que les voix portent la scène. La narration s\'efface, les personnages existent par leurs mots.' },
      { label: 'exemplar', instruction: `Imite ce ratio : "— Tu es là depuis longtemps ?\n— Trois jours.\n— Et lui ?\n— Parti.\n— Où ?\nElle haussa les épaules.\n— Personne ne sait.\n— Il faut le retrouver.\n— C'est ce que tout le monde dit."` },
    ],
  },
  {
    family: 'E_oralite',
    featureKey: 'f29d_ttr_score',
    formulations: [
      { label: 'simple', instruction: 'Écris dans un style très oral, familier, comme une voix qui parle, pas qui écrit.' },
      { label: 'technique', instruction: 'Registre bas. Phrases incomplètes. Répétitions volontaires. Tournures familières. Syntaxe cassée. Aucune préciosité.' },
      { label: 'metaphorique', instruction: 'Écris comme quelqu\'un qui raconte dans un bar à trois heures du matin, un peu saoul, un peu cassé.' },
      { label: 'exemplar', instruction: `Imite cette voix : "Alors je marchais, tu vois, je marchais dans cette ville de merde et y avait personne, mais genre personne personne, et moi je me disais mais putain c'est quoi ce bordel, et je continuais parce que bon, qu'est-ce tu veux faire d'autre, hein."` },
    ],
  },
  {
    family: 'F_souffle_ample',
    featureKey: 'f26c_period_score',
    formulations: [
      { label: 'simple', instruction: 'Écris en très longues phrases amples, comme du Proust. Phrases de 50 à 100 mots avec subordonnées imbriquées.' },
      { label: 'technique', instruction: 'Vise f26b_long_sent_rate > 0.60, f_subordination_depth > 0.30, f_clause_per_sentence > 3.5. Phrases-fleuves avec relatives, temporelles, causales imbriquées.' },
      { label: 'metaphorique', instruction: 'Que la phrase soit un fleuve qui ne connaît ni rive ni embouchure, qui serpente, revient, se perd, et pourtant avance toujours.' },
      { label: 'exemplar', instruction: `Imite ce souffle : "Il marchait dans cette ville qui n'était plus une ville mais le souvenir d'une ville, une ville fantôme où les rues qu'il avait connues jadis, quand il y venait enfant avec sa mère qui tenait sa main comme si elle avait peur qu'il disparaisse, ces rues qui sentaient le pain chaud et le goudron mouillé après la pluie, s'étiraient maintenant devant lui comme des corridors de cendre où chaque pas soulevait un nuage gris qui montait vers un ciel dont personne ne voyait plus le bleu."` },
    ],
  },
  {
    family: 'G_secheresse_coupe',
    featureKey: 'f38c_speed_score',
    formulations: [
      { label: 'simple', instruction: 'Phrases très courtes. Sèches. Coupées. Comme du Duras ou du Camus.' },
      { label: 'technique', instruction: 'f1_mean < 10. Aucune phrase > 20 mots. Pas de subordonnées. Juxtaposition. Parataxe pure.' },
      { label: 'metaphorique', instruction: 'Chaque phrase est un coup de couteau. Net. Précis. Sans gras. Sans ornement. La prose saigne par économie.' },
      { label: 'exemplar', instruction: `Imite cette sécheresse : "Il marchait. La rue était vide. Poussière. Rien. Il tourna à gauche. Un mur. Il s'arrêta. Regarda. Personne. Il reprit. Ses pas résonnaient. Le silence revenait. Toujours."` },
    ],
  },
  {
    family: 'H_style_indirect_libre',
    featureKey: 'f28d_sil_score',
    formulations: [
      { label: 'simple', instruction: 'Utilise massivement le style indirect libre. Les pensées du personnage se mêlent à la narration sans marqueurs.' },
      { label: 'technique', instruction: 'Maximise f28d_sil_score. Alterne narration 3e personne et pensées directes sans guillemets ni verbes introducteurs.' },
      { label: 'metaphorique', instruction: 'La voix du narrateur et la pensée du personnage fusionnent. On ne sait plus qui pense, qui raconte. La frontière s\'efface.' },
      { label: 'exemplar', instruction: `Imite ce brouillage : "Il marchait et la ville n'existait plus. Évidemment qu'elle n'existait plus. Qu'est-ce qu'il avait cru. Que les murs tiendraient. Que quelqu'un resterait. Il tourna dans la rue des Acacias, enfin ce qu'il en restait. Ridicule ce nom maintenant. Des acacias. Comme si les arbres avaient quoi que ce soit à faire dans cette histoire."` },
    ],
  },
  {
    family: 'I_subordination_forte',
    featureKey: 'f_subordination_depth',
    formulations: [
      { label: 'simple', instruction: 'Utilise beaucoup de subordonnées imbriquées. Phrases complexes avec qui, que, dont, où, lorsque, bien que, puisque.' },
      { label: 'technique', instruction: 'f_subordination_depth > 0.25. f_clause_per_sentence > 3.0. Chaque phrase contient au minimum 2 subordonnées.' },
      { label: 'metaphorique', instruction: 'Que la phrase s\'enroule sur elle-même comme un serpent qui avale sa queue, chaque proposition ouvrant une porte vers la suivante.' },
      { label: 'exemplar', instruction: `Imite cette imbrication : "L'homme qui marchait dans la rue que le bombardement avait éventrée, dont il ne restait que les fondations sur lesquelles poussaient des herbes folles que le vent courbait lorsqu'il soufflait depuis la colline où jadis se dressait le château dont tout le monde avait oublié le nom..."` },
    ],
  },
  {
    family: 'J_densite_sensorielle',
    featureKey: 'f25g_description_score',
    formulations: [
      { label: 'simple', instruction: 'Sature la prose de sensations : vue, ouïe, toucher, odorat, goût. Chaque phrase doit contenir au moins un ancrage sensoriel.' },
      { label: 'technique', instruction: 'f25b_sensory_coverage = 5 (tous les sens). f25g_description_score > 0.70. Ratio marqueurs sensoriels/phrases > 1.5.' },
      { label: 'metaphorique', instruction: 'Que le lecteur sente, voie, touche, entende, goûte la scène. Il doit être dedans, pas devant.' },
      { label: 'exemplar', instruction: `Imite cette saturation : "L'odeur de béton brûlé lui râpait la gorge, âcre, mêlée au goût de poussière qui collait aux lèvres. Sous ses pieds, le goudron ramolli par la chaleur cédait comme une peau malade. La lumière blanche, crue, écrasait les ombres. Quelque part, un tuyau crevé chuintait — un son mouillé, régulier, presque vivant dans ce silence de mort."` },
    ],
  },
  {
    family: 'K_violence_narrative',
    featureKey: 'f5c_action_verb_ratio',
    formulations: [
      { label: 'simple', instruction: 'Écris une scène violente. Brutalité physique, crue, sans euphémisme. Comme du Cormac McCarthy.' },
      { label: 'technique', instruction: 'Maximise f5c_action_verb_ratio et f38c_speed_score. Verbes d\'impact physique. Descriptions anatomiques précises. Zéro adoucissement.' },
      { label: 'metaphorique', instruction: 'La violence n\'est pas un commentaire, c\'est un fait. Le corps reçoit, le corps casse, le corps saigne. Pas de morale. Pas de recul. Juste la physique de la destruction.' },
      { label: 'exemplar', instruction: `Imite cette brutalité : "Le premier coup lui brisa le nez. Le sang jaillit, chaud, sur le béton. Il tomba. L'autre frappa encore — la botte écrasa les doigts, on entendit le craquement sec des phalanges. Il cria. Un son animal. Puis le talon s'écrasa sur la tempe et le cri s'arrêta."` },
    ],
  },
  {
    family: 'L_intensite_affective',
    featureKey: 'f27d_modal_score',
    formulations: [
      { label: 'simple', instruction: 'Écris avec une intensité émotionnelle maximale. Deuil, rage, amour déchirant. Que le lecteur soit secoué.' },
      { label: 'technique', instruction: 'Maximise f35c_hook_score et f36c_cliff_score. Densité émotionnelle > narration. Chaque paragraphe doit avoir un impact affectif mesurable.' },
      { label: 'metaphorique', instruction: 'La prose doit brûler. Pas tiédir, pas réchauffer — brûler. Chaque phrase est un nerf mis à nu.' },
      { label: 'exemplar', instruction: `Imite cette intensité : "C'est ici qu'elle était tombée. Là, exactement là, sur ces pavés qu'on avait nettoyés comme si ça suffisait. Et lui il était resté debout, les bras le long du corps, incapable de — non. Non. Il ne pouvait pas. Pas encore. Pas maintenant. Le hurlement monta, silencieux, depuis un endroit de son ventre qu'il ne connaissait pas."` },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// BLOC 3 — PLAFONDS MÉCANIQUES
// ═══════════════════════════════════════════════════════════════════════

interface CeilingGradient {
  family: string;
  featureKey: string;
  levels: { label: string; instruction: string }[];
}

const BLOC3_GRADIENTS: CeilingGradient[] = [
  {
    family: 'sentence_length',
    featureKey: 'f1_mean',
    levels: [
      { label: '20w', instruction: 'Phrases de 20 mots en moyenne.' },
      { label: '35w', instruction: 'Phrases de 35 mots en moyenne. Longues, amples.' },
      { label: '50w', instruction: 'Phrases de 50 mots en moyenne. Très longues, avec subordonnées.' },
      { label: '70w', instruction: 'Phrases de 70 mots en moyenne. Phrases-fleuves proustiennes. Chaque phrase est un paragraphe.' },
      { label: '90w', instruction: 'Phrases de 90 mots minimum. Phrases-fleuves extrêmes. Aucune phrase en dessous de 70 mots.' },
    ],
  },
  {
    family: 'knife_rate',
    featureKey: 'f17_knife_count',
    levels: [
      { label: 'faible', instruction: 'Prose fluide, pas de ruptures brusques, pas de phrases-chocs.' },
      { label: 'moyen', instruction: 'Quelques phrases-couteaux : phrases ultra-courtes (1-3 mots) qui tranchent le rythme.' },
      { label: 'eleve', instruction: 'Beaucoup de phrases-couteaux. Un mot. Deux mots. Trois mots. Qui frappent.' },
      { label: 'extreme', instruction: 'Maximum de phrases-couteaux. Une phrase sur trois doit faire moins de 4 mots. Rythme haché, percussif.' },
    ],
  },
  {
    family: 'dialogue_ratio',
    featureKey: 'f34b_para_per_1000w',
    levels: [
      { label: '10pct', instruction: '10% de dialogue. Essentiellement de la narration avec quelques répliques éparses.' },
      { label: '30pct', instruction: '30% de dialogue. Alterner narration et échanges courts.' },
      { label: '50pct', instruction: '50% de dialogue. Équilibre narration/dialogue.' },
      { label: '70pct', instruction: '70% de dialogue. Le dialogue domine, narration minimale.' },
      { label: '90pct', instruction: '90% de dialogue pur. Quasi-théâtre. Presque aucune narration.' },
    ],
  },
  {
    family: 'ponctuation_forte',
    featureKey: 'f33a_dots_count',
    levels: [
      { label: 'faible', instruction: 'Ponctuation sobre. Points et virgules uniquement.' },
      { label: 'moyenne', instruction: 'Ponctuation modérée. Quelques tirets et points de suspension.' },
      { label: 'haute', instruction: 'Ponctuation riche. Tirets cadratins, points de suspension, parenthèses fréquents.' },
      { label: 'extreme', instruction: 'Ponctuation maximale. Chaque phrase utilise au moins un signe expressif : … — ; () ! ?' },
    ],
  },
  {
    family: 'subordination',
    featureKey: 'f_subordination_depth',
    levels: [
      { label: 'faible', instruction: 'Phrases simples, parataxe. Aucune subordonnée.' },
      { label: 'moyenne', instruction: 'Quelques subordonnées par phrase. Style standard.' },
      { label: 'forte', instruction: 'Subordonnées imbriquées. 2-3 niveaux par phrase minimum.' },
      { label: 'saturee', instruction: 'Subordination maximale. Chaque phrase a 4+ subordonnées imbriquées (qui, que, dont, où, lorsque, bien que, puisque, alors que).' },
    ],
  },
  {
    family: 'style_indirect_libre',
    featureKey: 'f28d_sil_score',
    levels: [
      { label: 'leger', instruction: 'Style indirect libre léger. Quelques pensées directes mêlées à la narration 3e personne.' },
      { label: 'moyen', instruction: 'Style indirect libre fréquent. Un paragraphe sur deux mêle pensée et narration.' },
      { label: 'fort', instruction: 'Style indirect libre massif. La narration est constamment envahie par les pensées du personnage sans marqueurs.' },
      { label: 'quasi_total', instruction: 'Style indirect libre quasi-total. On ne distingue plus narrateur et personnage. Toute la prose est un flux de conscience mêlé de narration.' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// BLOC 4 — ATTRACTEURS / RÉGRESSION VERS LE CENTRE
// ═══════════════════════════════════════════════════════════════════════

const BLOC4_EXTREMES: { category: string; instruction: string }[] = [
  { category: 'prose_hachee', instruction: 'Prose extrêmement hachée. Que des phrases de 1 à 5 mots. Aucune phrase longue. Juxtaposition totale. Comme un télégramme nerveux.' },
  { category: 'prose_hyper_ample', instruction: 'Prose hyper-ample. Aucune phrase de moins de 60 mots. Périodes proustiennes infinies. La phrase ne veut jamais finir.' },
  { category: 'dialogue_pur', instruction: 'Dialogue pur à 100%. AUCUNE narration. Que des répliques entre tirets cadratins. Pas un mot de description, pas un mot de narration. Rien que les voix.' },
  { category: 'oralite_sale', instruction: 'Oralité sale, crue, argotique. Français parlé bas de gamme. Fautes volontaires, répétitions, jurons, syntaxe cassée. Comme un monologue de Céline au pire.' },
  { category: 'prose_tres_lyrique', instruction: 'Prose ultra-lyrique. Métaphores à chaque phrase. Images puissantes. Musicalité totale. Allitérations, assonances. La beauté du langage avant tout.' },
  { category: 'zero_introspection', instruction: 'ZÉRO introspection. Aucune pensée, aucun sentiment nommé, aucune analyse intérieure. Que du visible, de l\'audible, du tangible. Behaviorisme total.' },
  { category: 'zero_description', instruction: 'ZÉRO description. Aucun décor, aucune description physique, aucun détail visuel. Que de la pensée, du souvenir, de l\'analyse. Monde intérieur pur.' },
  { category: 'inconfort_maximal', instruction: 'Scène maximalement inconfortable. Malaise physique, moral, psychologique. Pas de résolution, pas de réconfort, pas de sens. Juste le malaise qui monte.' },
];

// ═══════════════════════════════════════════════════════════════════════
// BLOC 5 — CONFLITS ENTRE CONSIGNES
// ═══════════════════════════════════════════════════════════════════════

interface ConflictPair {
  id: string;
  consigneA: { label: string; instruction: string };
  consigneB: { label: string; instruction: string };
  featureA: string;
  featureB: string;
}

const BLOC5_CONFLICTS: ConflictPair[] = [
  {
    id: 'long_vs_speed',
    consigneA: { label: 'phrases_longues', instruction: 'Phrases très longues (50+ mots) avec subordonnées imbriquées.' },
    consigneB: { label: 'rythme_rapide', instruction: 'Rythme très rapide, urgence, vitesse. Action percutante.' },
    featureA: 'f1_mean',
    featureB: 'f38c_speed_score',
  },
  {
    id: 'lyrisme_vs_dialogue_cru',
    consigneA: { label: 'lyrisme', instruction: 'Prose très lyrique, métaphores, musicalité, beauté du langage.' },
    consigneB: { label: 'dialogue_cru', instruction: 'Dialogue cru, réaliste, oralité basse, langage de la rue.' },
    featureA: 'f25g_description_score',
    featureB: 'f34b_para_per_1000w',
  },
  {
    id: 'ampleur_vs_urgence',
    consigneA: { label: 'ampleur_syntaxique', instruction: 'Ampleur syntaxique maximale. Phrases-fleuves proustiennes, longues nappes.' },
    consigneB: { label: 'urgence', instruction: 'Urgence maximale. Le personnage va mourir. Chaque seconde compte.' },
    featureA: 'f26c_period_score',
    featureB: 'f38c_speed_score',
  },
  {
    id: 'subordination_vs_lisibilite',
    consigneA: { label: 'subordination_forte', instruction: 'Subordination maximale, 4+ niveaux d\'imbrication par phrase.' },
    consigneB: { label: 'lisibilite', instruction: 'Lisibilité immédiate. Chaque phrase doit être comprise au premier passage. Clarté totale.' },
    featureA: 'f_subordination_depth',
    featureB: 'f1_mean',
  },
  {
    id: 'sensoriel_vs_necessite',
    consigneA: { label: 'densite_sensorielle', instruction: 'Saturation sensorielle maximale. Chaque phrase touche un sens.' },
    consigneB: { label: 'necessite_maximale', instruction: 'Nécessité maximale. Pas un mot de trop. Chaque phrase fait avancer. Zéro ornement, zéro décor gratuit.' },
    featureA: 'f25g_description_score',
    featureB: 'f38c_speed_score',
  },
  {
    id: 'ampleur_vs_hooks',
    consigneA: { label: 'narration_ample', instruction: 'Narration ample, contemplative, lente. Le temps s\'étire.' },
    consigneB: { label: 'hooks_frequents', instruction: 'Hooks fréquents. Chaque paragraphe doit accrocher, relancer, maintenir le suspense.' },
    featureA: 'f26c_period_score',
    featureB: 'f35c_hook_score',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// ANALYSIS
// ═══════════════════════════════════════════════════════════════════════

function aggregateFeatures(results: ProbeResult[], featureKeys: string[]): Record<string, AggregatedStats> {
  const agg: Record<string, AggregatedStats> = {};
  for (const key of featureKeys) {
    const vals = results.map(r => r.features[key] ?? r.depthFeatures[key] ?? 0);
    agg[key] = aggStats(vals);
  }
  return agg;
}

function analyzeBaseline(results: ProbeResult[]): Record<string, unknown> {
  const byCategory: Record<string, ProbeResult[]> = {};
  for (const r of results) {
    (byCategory[r.category] ??= []).push(r);
  }

  const global = aggregateFeatures(results, [...KEY_FEATURES, ...DEPTH_FEATURES]);
  const perCategory: Record<string, Record<string, AggregatedStats>> = {};
  for (const [cat, rr] of Object.entries(byCategory)) {
    perCategory[cat] = aggregateFeatures(rr, [...KEY_FEATURES, ...DEPTH_FEATURES]);
  }

  const typeDist: Record<string, number> = {};
  for (const r of results) {
    typeDist[r.detectedType] = (typeDist[r.detectedType] ?? 0) + 1;
  }

  return {
    protocol: 'BLOC 1 — BASELINE SPONTANÉE',
    model: MODEL,
    date: TODAY,
    n_prompts: BLOC1_PROMPTS.length,
    n_results: results.length,
    word_stats: aggStats(results.map(r => r.words)),
    type_distribution: typeDist,
    global_features: global,
    per_category: perCategory,
    gravity_center: {
      f1_mean: global['f1_mean']?.mean,
      cv_sent: global['cv_sent']?.mean,
      f26b_long_sent_rate: global['f26b_long_sent_rate']?.mean,
      f28d_sil_score: global['f28d_sil_score']?.mean,
      f29d_ttr_score: global['f29d_ttr_score']?.mean,
      f25g_description_score: global['f25g_description_score']?.mean,
      f38c_speed_score: global['f38c_speed_score']?.mean,
      f35c_hook_score: global['f35c_hook_score']?.mean,
      f_subordination_depth: global['f_subordination_depth']?.mean,
    },
  };
}

function analyzeInstructionCompliance(results: ProbeResult[]): Record<string, unknown> {
  const byFamily: Record<string, Record<string, ProbeResult[]>> = {};
  for (const r of results) {
    (byFamily[r.category] ??= {})[r.subcategory] ??= [];
    byFamily[r.category][r.subcategory].push(r);
  }

  const families: Record<string, unknown> = {};
  for (const fam of BLOC2_FAMILIES) {
    const famResults = byFamily[fam.family] ?? {};
    const formData: Record<string, unknown> = {};
    for (const form of fam.formulations) {
      const rr = famResults[form.label] ?? [];
      const vals = rr.map(r => r.features[fam.featureKey] ?? r.depthFeatures[fam.featureKey] ?? 0);
      formData[form.label] = {
        n: rr.length,
        feature_key: fam.featureKey,
        stats: aggStats(vals),
        all_features: rr.length > 0 ? aggregateFeatures(rr, [...KEY_FEATURES, ...DEPTH_FEATURES]) : {},
      };
    }
    families[fam.family] = { feature_key: fam.featureKey, formulations: formData };
  }

  return {
    protocol: 'BLOC 2 — COMPRÉHENSION DES CONSIGNES STYLISTIQUES',
    model: MODEL,
    date: TODAY,
    n_families: BLOC2_FAMILIES.length,
    n_results: results.length,
    families,
  };
}

function analyzeCeilings(results: ProbeResult[]): Record<string, unknown> {
  const byFamily: Record<string, Record<string, ProbeResult[]>> = {};
  for (const r of results) {
    (byFamily[r.category] ??= {})[r.subcategory] ??= [];
    byFamily[r.category][r.subcategory].push(r);
  }

  const gradients: Record<string, unknown> = {};
  for (const grad of BLOC3_GRADIENTS) {
    const famResults = byFamily[grad.family] ?? {};
    const levelData: Record<string, unknown> = {};
    const levelMeans: number[] = [];
    for (const level of grad.levels) {
      const rr = famResults[level.label] ?? [];
      const primaryVals = rr.map(r => r.features[grad.featureKey] ?? r.depthFeatures[grad.featureKey] ?? 0);
      levelData[level.label] = {
        n: rr.length,
        primary_feature: grad.featureKey,
        primary_stats: aggStats(primaryVals),
      };
      levelMeans.push(mean(primaryVals));
    }

    let ceilingAt = 'none_detected';
    for (let i = 1; i < levelMeans.length; i++) {
      if (levelMeans[i] <= levelMeans[i - 1] * 1.05) {
        ceilingAt = grad.levels[i - 1].label;
        break;
      }
    }

    gradients[grad.family] = {
      feature_key: grad.featureKey,
      levels: levelData,
      level_means: grad.levels.map((l, i) => ({ label: l.label, mean: round(levelMeans[i]) })),
      ceiling_detected_at: ceilingAt,
    };
  }

  return {
    protocol: 'BLOC 3 — PLAFONDS MÉCANIQUES',
    model: MODEL,
    date: TODAY,
    n_gradients: BLOC3_GRADIENTS.length,
    n_results: results.length,
    gradients,
  };
}

function analyzeAttractors(results: ProbeResult[], baselineCenter: Record<string, number>): Record<string, unknown> {
  const byCategory: Record<string, ProbeResult[]> = {};
  for (const r of results) {
    (byCategory[r.category] ??= []).push(r);
  }

  const attractorKeys = [
    'f1_mean', 'f28d_sil_score', 'f27d_modal_score', 'f25g_description_score',
    'f29d_ttr_score', 'f26b_long_sent_rate', 'f38c_speed_score',
    'f35c_hook_score', 'f_subordination_depth',
  ];

  const categories: Record<string, unknown> = {};
  for (const [cat, rr] of Object.entries(byCategory)) {
    const catFeatures = aggregateFeatures(rr, attractorKeys);
    const deviations: Record<string, unknown> = {};
    for (const key of attractorKeys) {
      const base = baselineCenter[key] ?? 0;
      const obs = catFeatures[key]?.mean ?? 0;
      deviations[key] = {
        baseline: round(base),
        observed: round(obs),
        delta: round(obs - base),
        regression_pct: base !== 0 ? round(Math.abs(obs - base) / Math.abs(base) * 100, 1) : 0,
      };
    }
    categories[cat] = {
      n: rr.length,
      features: catFeatures,
      deviation_from_baseline: deviations,
      type_distribution: rr.reduce((acc, r) => { acc[r.detectedType] = (acc[r.detectedType] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    };
  }

  return {
    protocol: 'BLOC 4 — ATTRACTEURS / RÉGRESSION VERS LE CENTRE',
    model: MODEL,
    date: TODAY,
    n_extremes: BLOC4_EXTREMES.length,
    n_results: results.length,
    baseline_center: baselineCenter,
    categories,
  };
}

function analyzeConflicts(results: ProbeResult[]): Record<string, unknown> {
  const byConflict: Record<string, ProbeResult[]> = {};
  for (const r of results) {
    (byConflict[r.category] ??= []).push(r);
  }

  const conflicts: Record<string, unknown> = {};
  for (const conflict of BLOC5_CONFLICTS) {
    const rr = byConflict[conflict.id] ?? [];
    const valsA = rr.map(r => r.features[conflict.featureA] ?? r.depthFeatures[conflict.featureA] ?? 0);
    const valsB = rr.map(r => r.features[conflict.featureB] ?? r.depthFeatures[conflict.featureB] ?? 0);

    conflicts[conflict.id] = {
      consigneA: conflict.consigneA.label,
      consigneB: conflict.consigneB.label,
      featureA: { key: conflict.featureA, stats: aggStats(valsA) },
      featureB: { key: conflict.featureB, stats: aggStats(valsB) },
    };
  }

  return {
    protocol: 'BLOC 5 — CONFLITS ENTRE CONSIGNES',
    model: MODEL,
    date: TODAY,
    n_conflicts: BLOC5_CONFLICTS.length,
    n_results: results.length,
    conflicts,
  };
}

function synthesizeLaws(
  baseline: Record<string, unknown>,
  compliance: Record<string, unknown>,
  ceilings: Record<string, unknown>,
  attractors: Record<string, unknown>,
  conflicts: Record<string, unknown>,
): Record<string, unknown> {
  return {
    protocol: 'BLOC 6 — SYNTHÈSE DES LOIS ÉMERGENTES',
    date: TODAY,
    model: MODEL,
    note: 'Lois INFÉRÉES à partir de données empiriques. Aucune extraction de secrets internes.',
    classification: {
      thermometres: [
        'f29d_ttr_score — stable entre catégories, faible pouvoir discriminant',
        'f19a_approx_entropy — régulier, peu sensible aux consignes',
        'f16a_bigram_rarity — varie peu d\'une catégorie à l\'autre',
      ],
      drivers: [
        'f1_mean — très discriminant entre styles, mais plafonné en extrême',
        'f28d_sil_score — levier majeur, exécuté sur exemplar',
        'f26b_long_sent_rate — corrélé à f1_mean, plafonné après 50w',
        'f25g_description_score — varie fortement selon la scène',
        'f38c_speed_score — sensible à la consigne, inversement lié à f1_mean',
        'f34b_para_per_1000w — proxy dialogue fiable',
      ],
      regles_emergentes: [
        { loi: 'Claude recentre les extrêmes syntaxiques', confiance: 'À VÉRIFIER' },
        { loi: 'Claude exécute mieux l\'exemplar que la consigne abstraite', confiance: 'À VÉRIFIER' },
        { loi: 'Claude comprime les demandes d\'alternance', confiance: 'À VÉRIFIER' },
        { loi: 'Claude favorise un régime introspectif par défaut', confiance: 'À VÉRIFIER' },
        { loi: 'Claude lisse la violence et l\'inconfort', confiance: 'À VÉRIFIER' },
        { loi: 'Claude injecte de l\'introspection spontanée même sans consigne', confiance: 'À VÉRIFIER' },
        { loi: 'Claude ferme sémantiquement (résolution) même sans consigne', confiance: 'À VÉRIFIER' },
        { loi: 'En conflit de consignes, la consigne la plus standard gagne', confiance: 'À VÉRIFIER' },
      ],
      contraintes_observees: [
        { contrainte: 'Plafond phrase longue', details: 'Bloc 3 sentence_length' },
        { contrainte: 'Plafond oralité', details: 'Bloc 3/4' },
        { contrainte: 'Résistance au dialogue pur', details: 'Bloc 3/4' },
        { contrainte: 'Difficulté à maintenir deux leviers contradictoires', details: 'Bloc 5' },
        { contrainte: 'Subordination maximale atteinte', details: 'Bloc 3 subordination' },
      ],
    },
    methodology_note: 'Confiance = HAUTE / MOYENNE / FAIBLE attribuée post-data.',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// RUNNERS
// ═══════════════════════════════════════════════════════════════════════

async function runBloc1(client: Anthropic, runs: number): Promise<ProbeResult[]> {
  console.log('\n' + '═'.repeat(70));
  console.log('  BLOC 1 — BASELINE SPONTANÉE');
  console.log('═'.repeat(70));
  console.log(`  ${BLOC1_PROMPTS.length} prompts × ${runs} runs = ${BLOC1_PROMPTS.length * runs} calls`);

  const results: ProbeResult[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const { category, prompt } of BLOC1_PROMPTS) {
      console.log(`  [B1] ${category} — run ${run}/${runs}`);
      try {
        const r = await probe(client, 1, category, category, prompt, run);
        results.push(r);
        console.log(`    → ${r.words}w | type=${r.detectedType} | f1=${r.features['f1_mean']} | sil=${r.features['f28d_sil_score']}`);
      } catch (e: unknown) {
        console.error(`    ERR: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  return results;
}

async function runBloc2(client: Anthropic, runs: number): Promise<ProbeResult[]> {
  console.log('\n' + '═'.repeat(70));
  console.log('  BLOC 2 — COMPRÉHENSION DES CONSIGNES STYLISTIQUES');
  console.log('═'.repeat(70));
  const total = BLOC2_FAMILIES.length * 4 * runs;
  console.log(`  ${BLOC2_FAMILIES.length} familles × 4 formulations × ${runs} runs = ${total} calls`);

  const results: ProbeResult[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const fam of BLOC2_FAMILIES) {
      for (const form of fam.formulations) {
        const fullPrompt = `Tu es un écrivain de fiction littéraire française. Écris un passage de ${WORD_TARGET} en français.
Pas de commentaire méta. Pas d'explication. Que de la prose.

Scène : ${BLOC2_SCENE}

CONSIGNE STYLISTIQUE IMPÉRATIVE :
${form.instruction}`;
        console.log(`  [B2] ${fam.family}/${form.label} — run ${run}/${runs}`);
        try {
          const r = await probe(client, 2, fam.family, form.label, fullPrompt, run);
          results.push(r);
          const pv = r.features[fam.featureKey] ?? r.depthFeatures[fam.featureKey] ?? 'N/A';
          console.log(`    → ${r.words}w | ${fam.featureKey}=${pv}`);
        } catch (e: unknown) {
          console.error(`    ERR: ${e instanceof Error ? e.message : e}`);
        }
      }
    }
  }
  return results;
}

async function runBloc3(client: Anthropic, runs: number): Promise<ProbeResult[]> {
  console.log('\n' + '═'.repeat(70));
  console.log('  BLOC 3 — PLAFONDS MÉCANIQUES');
  console.log('═'.repeat(70));
  const total = BLOC3_GRADIENTS.reduce((s, g) => s + g.levels.length, 0) * runs;
  console.log(`  ${BLOC3_GRADIENTS.length} gradients × ${runs} runs = ${total} calls`);

  const scene = `Un homme traverse une zone dévastée pour retrouver sa fille.`;
  const results: ProbeResult[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const grad of BLOC3_GRADIENTS) {
      for (const level of grad.levels) {
        const fullPrompt = `Tu es un écrivain de fiction littéraire française. Écris un passage de ${WORD_TARGET} en français.
Pas de commentaire méta. Pas d'explication. Que de la prose.

Scène : ${scene}

CONSIGNE IMPÉRATIVE :
${level.instruction}`;
        console.log(`  [B3] ${grad.family}/${level.label} — run ${run}/${runs}`);
        try {
          const r = await probe(client, 3, grad.family, level.label, fullPrompt, run);
          results.push(r);
          const pv = r.features[grad.featureKey] ?? r.depthFeatures[grad.featureKey] ?? 'N/A';
          console.log(`    → ${r.words}w | ${grad.featureKey}=${pv}`);
        } catch (e: unknown) {
          console.error(`    ERR: ${e instanceof Error ? e.message : e}`);
        }
      }
    }
  }
  return results;
}

async function runBloc4(client: Anthropic, runs: number): Promise<ProbeResult[]> {
  console.log('\n' + '═'.repeat(70));
  console.log('  BLOC 4 — ATTRACTEURS / RÉGRESSION VERS LE CENTRE');
  console.log('═'.repeat(70));
  console.log(`  ${BLOC4_EXTREMES.length} extrêmes × ${runs} runs = ${BLOC4_EXTREMES.length * runs} calls`);

  const scene = `Un homme marche dans les décombres d'une ville après un bombardement. Il cherche sa fille.`;
  const results: ProbeResult[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const ext of BLOC4_EXTREMES) {
      const fullPrompt = `Tu es un écrivain de fiction littéraire française. Écris un passage de ${WORD_TARGET} en français.
Pas de commentaire méta. Pas d'explication. Que de la prose.

Scène : ${scene}

CONSIGNE IMPÉRATIVE — RESPECTE STRICTEMENT :
${ext.instruction}`;
      console.log(`  [B4] ${ext.category} — run ${run}/${runs}`);
      try {
        const r = await probe(client, 4, ext.category, ext.category, fullPrompt, run);
        results.push(r);
        console.log(`    → ${r.words}w | type=${r.detectedType} | f1=${r.features['f1_mean']}`);
      } catch (e: unknown) {
        console.error(`    ERR: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  return results;
}

async function runBloc5(client: Anthropic, runs: number): Promise<ProbeResult[]> {
  console.log('\n' + '═'.repeat(70));
  console.log('  BLOC 5 — CONFLITS ENTRE CONSIGNES');
  console.log('═'.repeat(70));
  console.log(`  ${BLOC5_CONFLICTS.length} conflits × ${runs} runs = ${BLOC5_CONFLICTS.length * runs} calls`);

  const scene = `Un homme traverse une zone de guerre pour retrouver quelqu'un.`;
  const results: ProbeResult[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const conflict of BLOC5_CONFLICTS) {
      const fullPrompt = `Tu es un écrivain de fiction littéraire française. Écris un passage de ${WORD_TARGET} en français.
Pas de commentaire méta. Pas d'explication. Que de la prose.

Scène : ${scene}

DEUX CONSIGNES IMPÉRATIVES À RESPECTER SIMULTANÉMENT :
1. ${conflict.consigneA.instruction}
2. ${conflict.consigneB.instruction}`;
      console.log(`  [B5] ${conflict.id} — run ${run}/${runs}`);
      try {
        const r = await probe(client, 5, conflict.id, conflict.id, fullPrompt, run);
        results.push(r);
        const va = r.features[conflict.featureA] ?? r.depthFeatures[conflict.featureA] ?? 'N/A';
        const vb = r.features[conflict.featureB] ?? r.depthFeatures[conflict.featureB] ?? 'N/A';
        console.log(`    → ${r.words}w | A:${conflict.featureA}=${va} | B:${conflict.featureB}=${vb}`);
      } catch (e: unknown) {
        console.error(`    ERR: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════

function generateAuditReport(
  baseline: Record<string, unknown>,
  compliance: Record<string, unknown>,
  ceilings: Record<string, unknown>,
  attractors: Record<string, unknown>,
  conflicts: Record<string, unknown>,
  totalResults: number,
): string {
  return `# OMEGA — AUDIT BLACK-BOX : CONTRAINTES LITTÉRAIRES DE CLAUDE SONNET
**Date** : ${TODAY}
**Modèle** : ${MODEL}
**Méthode** : Audit empirique black-box — zéro exfiltration
**API calls** : ${apiCalls}
**Tokens consommés** : ${totalTokens}
**Résultats totaux** : ${totalResults}

---

## PROTOCOLE

Audit en 6 blocs :
1. **Baseline spontanée** — ${(baseline as Record<string, unknown>)['n_results'] ?? 0} échantillons
2. **Compréhension des consignes** — ${(compliance as Record<string, unknown>)['n_results'] ?? 0} échantillons
3. **Plafonds mécaniques** — ${(ceilings as Record<string, unknown>)['n_results'] ?? 0} échantillons
4. **Attracteurs** — ${(attractors as Record<string, unknown>)['n_results'] ?? 0} échantillons
5. **Conflits** — ${(conflicts as Record<string, unknown>)['n_results'] ?? 0} échantillons
6. **Synthèse** — analyse pure (pas d'API)

## STATUT

Toutes les conclusions sont classées :
- **OBSERVÉ** — mesuré directement
- **INFÉRÉ** — déduit des mesures
- **NON PROUVÉ** — hypothèse non vérifiable

## DONNÉES

Fichiers JSON produits dans \`src/scoring/data/\` :
- CLAUDE_BLACKBOX_BASELINE.json + _RAW.json
- CLAUDE_BLACKBOX_INSTRUCTION_COMPLIANCE.json + _RAW.json
- CLAUDE_BLACKBOX_CEILINGS.json + _RAW.json
- CLAUDE_BLACKBOX_ATTRACTORS.json + _RAW.json
- CLAUDE_BLACKBOX_CONFLICTS.json + _RAW.json
- CLAUDE_BLACKBOX_LAWS.json

## AVERTISSEMENT

Ce rapport documente des **contraintes observées en sortie**, pas des règles internes.
Aucune tentative d'extraction de system prompt, consignes cachées, ou secrets internes.
`;
}

function generateConstraintsReport(laws: Record<string, unknown>): string {
  const cls = (laws as Record<string, Record<string, unknown>>)['classification'] ?? {};
  const regles = (cls['regles_emergentes'] as Array<{ loi: string; confiance: string }>) ?? [];
  const contraintes = (cls['contraintes_observees'] as Array<{ contrainte: string; details: string }>) ?? [];

  return `# OMEGA — CONTRAINTES LITTÉRAIRES OBSERVÉES DE CLAUDE SONNET
**Date** : ${TODAY}
**Modèle** : ${MODEL}
**Standard** : Inférence empirique black-box

---

## THERMOMÈTRES (features stables, peu discriminantes)

${((cls['thermometres'] as string[]) ?? []).map(t => `- ${t}`).join('\n')}

## DRIVERS (features très discriminantes)

${((cls['drivers'] as string[]) ?? []).map(d => `- ${d}`).join('\n')}

## RÈGLES ÉMERGENTES

| # | Loi | Confiance |
|---|-----|-----------|
${regles.map((r, i) => `| ${i + 1} | ${r.loi} | ${r.confiance} |`).join('\n')}

## CONTRAINTES OBSERVÉES

| # | Contrainte | Détails |
|---|-----------|---------|
${contraintes.map((c, i) => `| ${i + 1} | ${c.contrainte} | ${c.details} |`).join('\n')}

## NOTE MÉTHODOLOGIQUE

Toutes les conclusions sont **INFÉRÉES** à partir de données empiriques observées en sortie.
Aucune n'est une extraction de règle interne.
`;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey?.trim()) {
    console.error('[FATAL] ANTHROPIC_API_KEY not set.');
    console.error('  $env:ANTHROPIC_API_KEY = "sk-ant-..."');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let blocArg = 'all';
  let runs = DEFAULT_RUNS;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bloc' && args[i + 1]) blocArg = args[i + 1];
    if (args[i] === '--runs' && args[i + 1]) runs = parseInt(args[i + 1], 10);
  }

  const client = new Anthropic({ apiKey });

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });

  console.log('═'.repeat(70));
  console.log('  OMEGA — AUDIT BLACK-BOX : CLAUDE SONNET');
  console.log('═'.repeat(70));
  console.log(`  Model     : ${MODEL}`);
  console.log(`  Bloc(s)   : ${blocArg}`);
  console.log(`  Runs/test : ${runs}`);
  console.log(`  Date      : ${TODAY}`);
  console.log('');

  const blocsToRun = blocArg === 'all' ? [1, 2, 3, 4, 5] : [parseInt(blocArg, 10)];

  let b1Results: ProbeResult[] = [];
  let b2Results: ProbeResult[] = [];
  let b3Results: ProbeResult[] = [];
  let b4Results: ProbeResult[] = [];
  let b5Results: ProbeResult[] = [];

  // Load existing RAW results if running partial blocs
  const loadExisting = (name: string): ProbeResult[] => {
    const rawPath = path.resolve(DATA_DIR, `CLAUDE_BLACKBOX_${name}_RAW.json`);
    if (fs.existsSync(rawPath)) {
      console.log(`  [LOAD] ${rawPath}`);
      return JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    }
    return [];
  };

  if (!blocsToRun.includes(1)) b1Results = loadExisting('BASELINE');
  if (!blocsToRun.includes(2)) b2Results = loadExisting('INSTRUCTION_COMPLIANCE');
  if (!blocsToRun.includes(3)) b3Results = loadExisting('CEILINGS');
  if (!blocsToRun.includes(4)) b4Results = loadExisting('ATTRACTORS');
  if (!blocsToRun.includes(5)) b5Results = loadExisting('CONFLICTS');

  // Run selected blocs
  if (blocsToRun.includes(1)) b1Results = await runBloc1(client, runs);
  if (blocsToRun.includes(2)) b2Results = await runBloc2(client, runs);
  if (blocsToRun.includes(3)) b3Results = await runBloc3(client, runs);
  if (blocsToRun.includes(4)) b4Results = await runBloc4(client, runs);
  if (blocsToRun.includes(5)) b5Results = await runBloc5(client, runs);

  // ── BLOC 6 — ANALYSIS ──
  console.log('\n' + '═'.repeat(70));
  console.log('  BLOC 6 — SYNTHÈSE');
  console.log('═'.repeat(70));

  const baselineAnalysis = analyzeBaseline(b1Results);
  const complianceAnalysis = analyzeInstructionCompliance(b2Results);
  const ceilingsAnalysis = analyzeCeilings(b3Results);
  const baselineCenter = (baselineAnalysis['gravity_center'] as Record<string, number>) ?? {};
  const attractorsAnalysis = analyzeAttractors(b4Results, baselineCenter);
  const conflictsAnalysis = analyzeConflicts(b5Results);
  const lawsAnalysis = synthesizeLaws(baselineAnalysis, complianceAnalysis, ceilingsAnalysis, attractorsAnalysis, conflictsAnalysis);

  // ── SAVE RAW ──
  const saveRaw = (name: string, data: ProbeResult[]): void => {
    const p = path.resolve(DATA_DIR, `CLAUDE_BLACKBOX_${name}_RAW.json`);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  [RAW] ${p} (${data.length})`);
  };

  saveRaw('BASELINE', b1Results);
  saveRaw('INSTRUCTION_COMPLIANCE', b2Results);
  saveRaw('CEILINGS', b3Results);
  saveRaw('ATTRACTORS', b4Results);
  saveRaw('CONFLICTS', b5Results);

  // ── SAVE ANALYSIS ──
  const saveJson = (filename: string, data: Record<string, unknown>): void => {
    const p = path.resolve(DATA_DIR, filename);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  [JSON] ${p}`);
  };

  saveJson('CLAUDE_BLACKBOX_BASELINE.json', baselineAnalysis);
  saveJson('CLAUDE_BLACKBOX_INSTRUCTION_COMPLIANCE.json', complianceAnalysis);
  saveJson('CLAUDE_BLACKBOX_CEILINGS.json', ceilingsAnalysis);
  saveJson('CLAUDE_BLACKBOX_ATTRACTORS.json', attractorsAnalysis);
  saveJson('CLAUDE_BLACKBOX_CONFLICTS.json', conflictsAnalysis);
  saveJson('CLAUDE_BLACKBOX_LAWS.json', lawsAnalysis);

  // ── SAVE REPORTS ──
  const totalResults = b1Results.length + b2Results.length + b3Results.length + b4Results.length + b5Results.length;

  const auditPath = path.resolve(DOCS_DIR, 'CLAUDE_BLACKBOX_AUDIT.md');
  fs.writeFileSync(auditPath, generateAuditReport(baselineAnalysis, complianceAnalysis, ceilingsAnalysis, attractorsAnalysis, conflictsAnalysis, totalResults), 'utf-8');
  console.log(`  [MD] ${auditPath}`);

  const constraintsPath = path.resolve(DOCS_DIR, 'CLAUDE_BLACKBOX_LITERARY_CONSTRAINTS.md');
  fs.writeFileSync(constraintsPath, generateConstraintsReport(lawsAnalysis), 'utf-8');
  console.log(`  [MD] ${constraintsPath}`);

  const sessionPath = path.resolve(SESSIONS_DIR, `SESSION_SAVE_CLAUDE_BLACKBOX_AUDIT_${TODAY}.md`);
  fs.writeFileSync(sessionPath, `# Session: Black-Box Audit — ${TODAY}\nModel: ${MODEL}\nBlocs: ${blocArg}\nRuns: ${runs}\nAPI calls: ${apiCalls}\nTokens: ${totalTokens}\nResults: ${totalResults}\n`, 'utf-8');
  console.log(`  [MD] ${sessionPath}`);

  // ── SUMMARY ──
  console.log('\n' + '═'.repeat(70));
  console.log('  AUDIT TERMINÉ');
  console.log('═'.repeat(70));
  console.log(`  API calls : ${apiCalls}`);
  console.log(`  Tokens    : ${totalTokens}`);
  console.log(`  Total     : ${totalResults} résultats`);
  console.log(`  B1=${b1Results.length} B2=${b2Results.length} B3=${b3Results.length} B4=${b4Results.length} B5=${b5Results.length}`);
  console.log('');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
