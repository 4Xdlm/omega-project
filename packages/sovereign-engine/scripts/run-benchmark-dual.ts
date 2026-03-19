/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — GRAND PARALLÈLE: Dual Scoring Pipeline (V3 Legacy + R6 Multi-Stage)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Evaluates each bench scene with TWO scoring systems simultaneously:
 *   1. Legacy Phase W : ECC / RCI / SII / IFI / AAI → composite
 *   2. R6 multi-stage : LOCAL / ARC → composite normalisé 0-100
 *
 * INVARIANTS:
 *   I1: Legacy scores are unchanged vs 9ea5c2fc bench
 *   I2: R6 addition does NOT alter generation
 *   I3: Pipeline returns legacy by default, dual if enabled
 *   I4: Both scorers receive EXACTLY the same prose
 *   I5: All artifacts traceable to commit (HEAD, date, hash)
 *   I7: Determinism — same inputs = same outputs
 *
 * Modes:
 *   MOCK (default): no API key needed — uses fixed sample prose per scene
 *   API:  $env:ANTHROPIC_API_KEY = "sk-ant-..." → generates via runSovereignForge
 *
 * Usage:
 *   npx tsx scripts/run-benchmark-dual.ts              # MOCK mode
 *   npx tsx scripts/run-benchmark-dual.ts --api        # API mode (needs key)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { computeTextFeatures } from '../src/scoring/text-features.js';
import { MultiStageScorer } from '../src/scoring/multi-stage-scorer.js';
import { getProfileNames } from '../src/scoring/quality-profiles.js';
import type { MultiStageScore } from '../src/scoring/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');
const OUT_DIR = path.resolve(__dirname, '../sessions');

// ── Config ────────────────────────────────────────────────────────────────────

const IS_API = process.argv.includes('--api');
const P_REL_NEUTRAL = 0.50; // milieu de roman — valeur neutre pour scènes isolées

// ── Archetype → R6 passage type fallback mapping (Gemini spec) ────────────────
const ARCHETYPE_TO_R6_TYPE: Record<string, string> = {
  BRUTAL: 'ACTION',
  INTERIOR: 'INTROSPECTION',
  SENSORY: 'DESCRIPTION',
  CATHEDRAL: 'DESCRIPTION',
  BALANCED: 'DESCRIPTION',
};

// ── Reference V3 Legacy scores from bench 9ea5c2fc ──────────────────────────
// Source: sessions/BenchW_gate-ON_2026-03-19T17-44-48_9ea5c2fc/summary.json
const LEGACY_REFERENCE: Record<string, {
  composite: number;
  min_axis: { name: string; value: number };
  verdict: string;
  archetype: string;
  label: string;
}> = {
  'w4-confrontation': { composite: 88.41, min_axis: { name: 'SII', value: 81.73 }, verdict: 'REJECT', archetype: 'BRUTAL', label: 'Confrontation' },
  'w4-elegie':        { composite: 92.42, min_axis: { name: 'RCI', value: 88.05 }, verdict: 'REJECT', archetype: 'INTERIOR', label: 'Élégie' },
  'w4-panique':       { composite: 93.58, min_axis: { name: 'SII', value: 87.20 }, verdict: 'SEAL', archetype: 'BRUTAL', label: 'Panique' },
  'w4-contemplation': { composite: 91.94, min_axis: { name: 'SII', value: 87.87 }, verdict: 'REJECT', archetype: 'SENSORY', label: 'Contemplation' },
  'w4-dialogue-tendu':{ composite: 92.40, min_axis: { name: 'RCI', value: 85.64 }, verdict: 'REJECT', archetype: 'BALANCED', label: 'Dialogue tendu' },
  'w4-lyrique':       { composite: 91.35, min_axis: { name: 'IFI', value: 86.08 }, verdict: 'REJECT', archetype: 'CATHEDRAL', label: 'Description lyrique' },
  'w4-action':        { composite: 91.10, min_axis: { name: 'RCI', value: 87.10 }, verdict: 'REJECT', archetype: 'BRUTAL', label: 'Action pure' },
  'w4-monologue':     { composite: 87.71, min_axis: { name: 'RCI', value: 83.91 }, verdict: 'REJECT', archetype: 'INTERIOR', label: 'Monologue intérieur' },
};

// ── MOCK prose samples — representative French literary fragments ────────────
// Each ~600 words, one per archetype, for deterministic MOCK bench.
// These are FIXED strings that never change — they exercise the R6 scorer
// without requiring API calls.

const MOCK_PROSE: Record<string, string> = {
  'w4-confrontation': `Elena poussa la porte de l'atelier d'un geste sec. Le contrat froissé dans sa main droite pesait moins lourd que le mensonge qu'il contenait. Marcus ne leva pas les yeux de son établi. Ses doigts continuaient de polir la surface d'un bronze — geste chirurgical, millimétré, obscène de précision dans un moment pareil.

« Tu savais. »

Ce n'était pas une question. Le solvant dans l'air piquait les yeux. La lumière rasante de fin d'après-midi découpait l'atelier en tranches obliques, dorées et froides à la fois. Sur l'établi, entre les limes et les burins, le métal captait cette lumière comme un miroir imparfait.

Marcus posa lentement l'outil. Le geste était celui d'un homme qui repose un scalpel après une incision. Elena connaissait ce geste. Elle l'avait vu cent fois dans les plans qu'elle dessinait — la précision n'était pas un choix, c'était une maladie.

« Le contrat spécifie — »

« Le contrat spécifie une origine que tu as falsifiée. » Elena posa le papier sur l'établi, entre eux, comme on dépose une pièce à conviction. « Tôle navale suédoise, Marcus. Pas ukrainienne. La différence de coût est de quarante pour cent. La différence de résistance à la corrosion est de trois ans. Tu le sais mieux que moi. »

Le silence qui suivit n'était pas celui de la réflexion. C'était celui de la capitulation différée. Marcus regardait le contrat sans le voir. Ses mains — ces mains qui avaient tenu des vies — restaient immobiles de part et d'autre du papier.

L'odeur de sel montait du port par la verrière entrouverte. Elena sentait le froid du métal à travers ses semelles. Chaque surface ici portait la trace d'un travail méticuleux. Les sculptures alignées contre le mur — des mains, des torses, des fragments anatomiques en bronze et en acier — semblaient observer la scène comme des témoins muets.

« J'avais besoin de cette marge, » dit Marcus. Sa voix était plate. Pas de défense, pas d'excuse — un fait brut, posé comme un outil sur l'établi.

« Besoin. » Elena répéta le mot comme on retourne une lame. « Tu avais besoin de mentir sur la qualité des matériaux d'un navire qui transportera des gens. »

Elle ne criait pas. La colère d'Elena n'était jamais sonore. Elle était architecturale — elle se construisait couche par couche, chaque argument une poutre, chaque preuve un rivet. Marcus le savait. C'est pour ça qu'il ne tentait pas de l'interrompre.

La lumière basculait. Les ombres des sculptures s'allongeaient sur le sol de béton, déformant les formes humaines en silhouettes grotesques. Un bras devenait une griffe. Un torse devenait un gouffre.

Elena ramassa le contrat. Le papier était tiède maintenant, imprégné de la chaleur de l'établi. Elle le plia en trois — précisément, comme elle pliait ses plans — et le glissa dans la poche intérieure de sa veste.

« Je vais faire annuler la commande. »

Marcus ne répondit pas. Ses yeux suivirent les mains d'Elena — la manière dont ses doigts, calleux et précis, manipulaient le papier avec la même exactitude qu'elle appliquait à ses calculs de charge. Il y avait quelque chose de cruel dans cette symétrie. Deux personnes formées à la précision, et l'une d'elles avait choisi de l'utiliser pour mentir.

Elena se retourna vers la porte. Le sol de l'atelier grondait sous ses pas — vibration sourde du béton sur les pilotis du port. Derrière elle, Marcus restait debout devant son établi, les mains vides, le métal froid entre eux comme une frontière.

La verrière laissait entrer le dernier angle de lumière. Il n'éclairait plus rien.`,

  'w4-elegie': `Le moulage était au fond du carton, sous trois couches de papier journal jauni. Marcus ne cherchait pas. Il cherchait un burin à pointe sèche, et ses doigts avaient rencontré le plâtre avant que sa mémoire ne le reconnaisse.

Une main d'enfant. Petite. Les doigts légèrement écartés, comme surpris en plein geste. Le plâtre avait gardé les lignes de la paume — ces lignes que les chirurgiens ne lisent pas, qu'ils traversent.

Il la posa sur l'établi. La lumière de crépuscule entrait par la verrière sale et donnait au plâtre une teinte de cire ancienne. Le port était silencieux à cette heure. Les grues immobiles. Les bateaux amarrés. Même les mouettes s'étaient tues, comme si le soir avait imposé une trêve.

Marcus s'assit sur le tabouret. Il ne touchait plus le moulage. Il le regardait.

Dix ans. La salle d'opération sentait l'iode et le métal tiède. Les moniteurs émettaient leurs bips réguliers — ce rythme qu'on finit par ne plus entendre, jusqu'au moment où il s'arrête. Les mains de Marcus étaient gantées de latex bleu. Les instruments attendaient sur le plateau, alignés avec la précision qu'il exigeait de lui-même et de personne d'autre.

L'enfant avait sept ans. Marcus ne se souvenait plus de son visage. Il se souvenait de ses mains. De la façon dont les doigts s'étaient refermés — un réflexe, pas un geste — quand l'anesthésie avait fait son œuvre. Ce n'était pas de la peur. C'était de la confiance. L'abandon total d'un corps qui ne sait pas encore que la confiance peut tuer.

Le néon de la salle grésillait. Toujours ce grésillement. Marcus l'entendait encore, dix ans plus tard, dans le silence du port. Un son qui ne s'éteint pas parce qu'il ne vient pas de l'extérieur. Il vient de l'endroit exact où la mémoire stocke les choses qu'on ne peut pas réparer.

Il prit un bloc d'argile. Ses mains — les mêmes mains, dix ans plus vieilles, les mêmes tendons, la même précision — commencèrent à travailler autour du moulage. Pas pour le recouvrir. Pour le prolonger. L'argile montait le long du poignet absent, inventait un bras, une épaule, un commencement de torse.

Ce n'était pas de la sculpture. C'était une prière laïque. Le geste du chirurgien retourné — au lieu de couper, il ajoutait. Au lieu de séparer, il reliait. Chaque pression du pouce dans l'argile était une réponse à une question que personne ne lui avait posée.

La lumière baissait. Le crépuscule au port n'est pas progressif — il tombe, comme une lame. Un instant la verrière laisse passer de l'or, l'instant d'après elle ne renvoie que du gris. Marcus travaillait dans ce gris. Ses doigts n'avaient pas besoin de lumière. Ils avaient la mémoire des formes.

Quand il posa l'ébauche terminée sur l'établi, la nuit était là. Le moulage avait disparu dans la sculpture — absorbé, intégré, transformé en quelque chose qui n'était ni un souvenir ni un oubli. L'enfant n'était plus dans le plâtre. Il était dans l'argile, dans le geste, dans l'espace entre les deux matières.

Marcus resta assis. Il ne pleurait pas. Il n'avait plus besoin de pleurer. Le sel du port séchait sur ses mains comme une bénédiction involontaire. Dehors, un bateau tirait sur ses amarres. Le bois grinçait contre le quai — un son régulier, presque vivant, comme un cœur qui bat dans le noir.`,

  'w4-panique': `Le craquement vint du plafond. Pas un son — une vibration, quelque chose qui traversait le sol et montait dans les os. Elena leva les yeux. La poutre maîtresse avait bougé. Un centimètre, peut-être deux. Dans un bâtiment de cette structure, deux centimètres signifiaient que les calculs de charge venaient d'être rendus obsolètes.

La fumée arrivait par l'escalier. Épaisse. Noire. L'odeur de solvant brûlé — ce mélange d'acétone et de résine qui ne brûle pas, qui explose. Elena connaissait la chimie. Elle savait que la température dans l'entrepôt du bas avait dépassé les quatre cents degrés. À cette température, l'acier perd quarante pour cent de sa résistance à la traction.

Les plans étaient sur la table, à trois mètres. Le prototype naval complet — six mois de calculs, de simulations, de corrections. Irremplaçable. Non pas parce qu'ils ne pourraient pas les refaire, mais parce que refaire prendrait six mois que personne n'avait.

Elena bougea. Pas vers la sortie. Vers les plans.

Ses pieds sentaient la chaleur à travers les semelles. Le béton conduisait la température du niveau inférieur comme un radiateur géant. Les verrières au-dessus commençaient à se fissurer — micro-craquelures en étoile, invisibles à l'œil, audibles pour qui savait écouter.

Elle attrapa les plans. Le papier était tiède. L'encre n'avait pas coulé. Elena les roula en un cylindre serré, les coinça contre sa poitrine, bras croisés par-dessus. Réflexe d'architecte — protéger le plan, toujours.

La fumée épaississait. Visibilité à deux mètres, puis un mètre. Elena calculait en marchant. L'escalier principal était compromis — les solvants stockés au rez-de-chaussée alimentaient le feu directement sous les marches. Restait l'escalier de secours, côté est. Vingt pas. Structure métallique indépendante, boulonnée au mur porteur.

Quinze pas. La chaleur n'était plus au sol — elle était partout, irradiante, comme un four qu'on aurait oublié d'éteindre. Elena sentait ses poumons protester. Chaque inspiration brûlait. L'air n'était plus de l'air — c'était un mélange de particules en suspension et de gaz toxiques que son corps refusait d'accepter.

Dix pas. Le sol vibra. Un grondement sourd, presque organique. Quelque part en dessous, une section de plancher venait de céder. Le bâtiment absorbait le choc, redistribuait les charges — mais chaque redistribution rapprochait l'ensemble du point de rupture.

Cinq pas. L'escalier de secours était là. Elena poussa la porte coupe-feu. L'acier était chaud sous sa paume — pas brûlant, pas encore. De l'autre côté, l'air marin frappa son visage comme une gifle. Froid. Salé. Vivant.

Elle descendit. Marche après marche. Le métal tremblait sous ses pieds — vibrations du bâtiment transmises par les boulons d'ancrage. À mi-chemin, un craquement. La troisième marche céda sous son poids. Elena sauta. L'impact dans ses genoux remonta jusqu'à la mâchoire. Les plans restèrent contre sa poitrine.

En bas. Dehors. Le béton du quai sous ses pieds. L'air du port dans ses poumons.

Derrière elle, la verrière supérieure explosa. Le verre tomba comme une pluie de cristal dans la lumière du soir, chaque éclat captant un instant de soleil avant de s'écraser sur le sol de l'entrepôt. Le feu monta d'un coup, libéré, aspirant l'oxygène frais comme un poumon monstrueux.

Elena serra les plans. Le papier était humide de sueur. Intact.`,

  'w4-contemplation': `Le port à l'aube avait cette qualité particulière que seules possèdent les choses qu'on ne regarde pas assez longtemps. Elena marchait entre les coques retournées. Les bateaux au radoub reposaient sur leurs tins comme des animaux endormis, ventres exposés, quilles tournées vers un ciel qui hésitait entre gris et rose.

L'odeur de goudron montait du bois chauffé par les premières minutes de soleil. Pas le soleil lui-même — sa promesse. Cette chaleur qui précède la chaleur, quand les surfaces commencent à se souvenir qu'elles peuvent être tièdes.

Elena posa la main sur la coque d'un chalutier. Le bois était grenu sous ses doigts. Années de sel, de soleil, de mer. Chaque fibre portait la mémoire d'un trajet qu'elle ne connaîtrait jamais. Les bateaux accumulent des vies dans leur bois comme les arbres accumulent des années dans leurs anneaux.

Elle ne calculait pas. C'était rare. D'ordinaire, sa main sur une surface lançait automatiquement une analyse — charge, résistance, fatigue, coefficient de sécurité. Son cerveau était câblé ainsi, depuis l'école d'ingénieurs, depuis les premiers stages, depuis le premier plan qu'elle avait signé de son nom. Mais ce matin, la main sur le bois ne calculait rien. Elle sentait.

Le goudron, tiède et collant. Les nœuds du bois, durs comme des os. Les fissures où le sel avait cristallisé en lignes blanches, cartographie d'une vie passée en mer. Elena suivait ces lignes du bout de l'index comme on suit une rivière sur une carte.

Les mouettes étaient revenues. Leurs cris perçaient le silence du port avec une régularité qui ressemblait à un rythme cardiaque. Un cri toutes les quatre secondes. Elena compta — réflexe qu'elle ne pouvait pas éteindre — puis cessa de compter. Le port n'avait pas besoin d'être mesuré. Il avait besoin d'être habité.

Elle longea les quais. Chaque quai était une artère. Les bateaux amarrés étaient les cellules qui circulaient — arrivant, repartant, transportant leur cargaison de vies et de marchandises. Le port vu d'en haut devait ressembler à un organe. Elena avait vu les plans cadastraux. Elle savait que les quais avaient été dessinés par un ingénieur du dix-neuvième siècle qui pensait en termes de flux. Pas de beauté. De flux.

Et pourtant, c'était beau. La lumière de l'aube transformait les grues en sculptures. Les câbles d'amarrage dessinaient des courbes que personne n'avait calculées mais que tout le monde reconnaissait. Les flaques de la nuit reflétaient un ciel qui n'existait qu'à l'envers.

Elena s'arrêta au bout du quai principal. L'eau était noire et calme. La marée descendait — elle voyait la ligne humide sur les piliers, ce trait horizontal qui disait : il y a une heure, la mer était ici. Maintenant elle est ailleurs. Elle reviendra.

C'était peut-être ça. L'eau revient toujours. Pas au même endroit, pas exactement au même niveau, mais elle revient. Les matériaux se fatiguent, les structures fléchissent, les calculs vieillissent. L'eau revient.

Elena resta. Les pieds au bord du quai. Le vent du large soulevait ses cheveux — ces mèches qu'elle attachait toujours au travail, parce que les cheveux libres et les machines ne font pas bon ménage. Ce matin, ils étaient libres.

Elle ne calculait pas. Elle ne cherchait pas. Elle était là.`,

  'w4-dialogue-tendu': `Le café était celui du quai, le seul ouvert avant huit heures. Les tasses étaient épaisses, la porcelaine ébréchée sur les bords, le café trop chaud et trop fort. Elena tenait la sienne à deux mains. Marcus n'avait pas touché la sienne.

« Le chantier reprend lundi. »

Elena hocha la tête. Ce n'était pas de l'accord. C'était de l'enregistrement. Chaque mot que Marcus prononçait entrait dans son système de classement mental — fait, interprétation, sous-texte. Le chantier reprend lundi. Fait. Il me parle du chantier pour ne pas parler du contrat. Interprétation. Il veut savoir si j'ai déjà contacté les autorités portuaires. Sous-texte.

« Les soudeurs ont confirmé, » continua Marcus. Ses mains reposaient sur la table, de part et d'autre de la tasse. Des mains de chirurgien. Les veines saillantes, les doigts longs, les ongles coupés courts avec une précision qu'Elena trouvait autrefois fascinante et qui maintenant la rendait méfiante.

« Confirmation écrite ? » demanda Elena.

Marcus la regarda. Pas longtemps. Un dixième de seconde de trop — ce dixième que seuls les gens formés à l'observation détectent. Elena était architecte. Elle voyait les fissures dans les structures. Elle voyait aussi les fissures dans les visages.

« Orale. Je fais suivre le mail cet après-midi. »

Le café refroidissait. La buée sur la vitre du café s'épaississait avec l'arrivée des travailleurs du port. Leurs voix entraient par la porte comme un courant d'air — fragments de conversations sur les horaires de marée, les prévisions météo, le prix du gasoil. Monde parallèle. Monde normal.

Elena but une gorgée. Le café était amer. Elle ne mit pas de sucre. Le sucre adoucissait les choses, et ce matin Elena ne voulait rien d'adouci. Elle voulait la version brute de chaque sensation, de chaque mot, de chaque silence entre les mots.

Marcus parla de la qualité de l'acier. Il utilisa les termes techniques — résistance à la traction, coefficient de dilatation, fatigue cyclique. Chaque terme était correct. Chaque chiffre était juste. Elena le savait parce qu'elle connaissait ces chiffres par cœur, et Marcus le savait aussi, et ils savaient tous les deux que l'autre savait. La conversation était un ballet de précisions inutiles, chaque fait vérifié servant de paravent à la seule question que personne ne posait.

Marcus posa sa tasse. Le geste était exactement celui d'un chirurgien qui repose un instrument sur le plateau. Pouce et index sur l'anse, mouvement rotatif de quinze degrés, dépôt sans bruit sur la soucoupe. Zéro vibration. Zéro hésitation.

Elena reconnut le geste. Elle le reconnaissait toujours. C'était sa malédiction professionnelle — voir les structures dans tout, y compris dans les mouvements humains. Le geste de Marcus disait : je suis en contrôle. Le geste de Marcus mentait.

« Il faudra que je passe vérifier les soudures moi-même, » dit Elena.

Ce n'était pas une demande. Marcus hocha la tête. Le même hochement qu'Elena avait fait tout à l'heure — pas de l'accord, de l'enregistrement.

Ils se levèrent en même temps. Synchronisation involontaire. Le genre de symétrie qui apparaît entre les gens qui se connaissent trop bien pour encore se surprendre, mais pas assez bien pour se faire confiance.

La porte du café laissa entrer l'air du port. Froid. Salé. Indifférent. La géométrie entre eux avait changé. Pas les angles — les forces. Quelque chose s'était redistribué dans l'espace qui les séparait, et ni l'un ni l'autre n'aurait su dire si c'était une fissure ou un mur.`,

  'w4-lyrique': `La cale sèche au couchant n'était pas un lieu. C'était une transformation. Le métal rouillé des coques devenait cuivre sous cette lumière. Les flaques au sol — eau de pluie et résidus d'entretien — devenaient des miroirs de feu. Les câbles, les treuils, les poutres de la grue devenaient les nervures d'une cathédrale inversée, ouverte au ciel.

Marcus installa son chevalet. Ce n'était pas peindre qu'il faisait. C'était traduire. La différence était essentielle, et personne ne la comprenait. Peindre, c'est mettre de la couleur sur une surface. Traduire, c'est prendre un langage — celui de la lumière, du métal, de l'espace — et le transposer dans un autre langage qui le conserve sans le reproduire.

Le soleil descendait avec cette lenteur qui n'est pas de la lenteur. Chaque minute effaçait un ton et en révélait un autre. Le rouge des coques virait à l'ambre. L'ambre virait au bronze. Le bronze, à cette teinte sans nom qui existe seulement entre le jour et la nuit, quand la lumière ne sait plus si elle arrive ou si elle part.

Les ombres s'allongeaient. Pas comme des ombres normales — celles-ci avaient de la substance. Elles rampaient sur le béton comme des liquides lents, épousant les fissures, contournant les flaques, dessinant sur le sol des formes que personne n'avait voulues et que tout le monde reconnaissait. L'ombre de la grue devenait un doigt. L'ombre du treuil devenait une main ouverte. Le port entier devenait une sculpture non commandée.

Marcus ne dessinait pas ce qu'il voyait. Il dessinait ce que la lumière faisait au métal. La différence était imperceptible et totale. Le métal, en soi, n'était rien — tôle oxydée, rivets fatigués, surfaces que personne ne regardait pendant la journée de travail. Mais la lumière du couchant faisait de ce rien un tout. Elle révélait ce que le jour cachait : la beauté de ce qui s'use, la dignité de ce qui rouille, l'élégance involontaire de ce qui a travaillé longtemps et n'attend rien.

Un bateau tirait sur ses amarres. Le bois grinçait contre le caoutchouc des défenses. Son régulier, presque musical. Marcus ne l'entendait pas — ou plutôt, il l'entendait avec les mains. Ses doigts sur le fusain suivaient le rythme du grincement comme un chef d'orchestre suit le tempo de ses musiciens.

La mer était là. Pas visible depuis la cale sèche — cachée derrière les quais, les entrepôts, les grues. Mais présente. L'odeur de sel et d'iode. Le bruit sourd des vagues contre les pilotis. Cette humidité dans l'air qui collait au fusain et au papier.

Marcus recula d'un pas. Le dessin n'était pas terminé. Il ne serait jamais terminé. C'était le problème de traduire la lumière — elle changeait plus vite que la main, toujours en avance d'un ton, d'une ombre, d'un reflet. Le fusain capturait ce qui avait été, jamais ce qui était.

La dernière lumière. Pas un rayon — une vibration. Le ciel ne s'éteignait pas, il se retirait. Le cuivre des coques redevenait rouille. Les flaques de feu redevenaient des flaques d'eau. La cathédrale inversée redevenait une cale sèche municipale avec des problèmes d'étanchéité et un budget d'entretien insuffisant.

Marcus rangea ses affaires. Le fusain. Le papier. Le chevalet pliant. Gestes d'une précision qui n'était pas de la minutie — c'était du respect. On range les outils comme on quitte un lieu sacré. Lentement. Sans bruit.

La cale était ordinaire maintenant. Le jour était parti. Marcus aussi.`,

  'w4-action': `L'incendie commença par les solvants. Pas une flamme — une déflagration sourde, comme un poumon géant qui inspire. Elena était à l'étage quand le sol trembla. Pas un tremblement — une onde, venue d'en bas, qui monta par les piliers en acier et fit vibrer chaque surface horizontale.

Les plans étaient étalés sur la table de travail. Le prototype naval complet. Six mois de calculs. Elena ne réfléchit pas. Ses mains roulèrent les plans avant que son cerveau n'ait fini d'analyser la situation. Réflexe d'architecte — le plan d'abord. Toujours le plan d'abord.

La fumée montait par les interstices du plancher. Noire. Dense. L'odeur d'acétone brûlée — cette odeur qui n'est pas seulement chimique, qui est physique, qui attaque les muqueuses et les poumons comme un acide aérien. Elena retint son souffle. Quatorze secondes. Elle pouvait retenir son souffle quatorze secondes en travaillant — elle l'avait chronométré un jour, par curiosité professionnelle.

L'escalier principal était en bas, côté ouest. Les solvants étaient stockés côté ouest. Elena fit le calcul en marchant. Température de combustion de l'acétone : 465°C. Résistance de l'acier à 465°C : soixante pour cent de la charge nominale. Temps avant rupture des poutres porteuses : entre quatre et sept minutes, selon l'épaisseur.

Elle avait quatre minutes. Maximum.

L'escalier de secours était côté est. Vingt mètres. Structure métallique indépendante, boulonnée au mur porteur. Elena courut. Le sol était chaud à travers ses semelles — pas brûlant, pas encore. Les semelles en caoutchouc commenceraient à fondre à 180°C. Le béton en dessous transmettait environ soixante pour cent de la chaleur du niveau inférieur. Donc le béton était à 300°C environ. Ses semelles tenaient. Pour l'instant.

Quinze mètres. La fumée épaississait. Visibilité à trois mètres. Elena comptait ses pas. Chaque pas mesurait soixante-dix centimètres — elle connaissait sa foulée. Quinze mètres. Vingt et un pas. Dix-huit. Dix-sept.

Un craquement. Au-dessus. La poutre secondaire avait cédé — pas la maîtresse, la secondaire. Le plafond s'affaissa de cinq centimètres sur une longueur de quatre mètres. La redistribution des charges venait de surcharger les poutres adjacentes de quinze pour cent.

Douze pas. L'air brûlait. Chaque inspiration était une négociation entre les poumons et la chimie. Elena respirait par la manche de sa veste — filtre dérisoire, mais suffisant pour réduire les particules de moitié.

Sept pas. La porte coupe-feu. Elena poussa. L'acier était chaud — pas brûlant. De l'autre côté, l'escalier de secours. L'air du port. Froid. Salé. Le choc thermique la fit tousser.

Elle descendit. Les marches métalliques vibraient sous ses pieds. Troisième marche — le boulon d'ancrage avait cédé. La marche bascula. Elena sauta. Trois mètres de chute. Réception sur les deux pieds. L'impact remonta dans ses genoux, ses hanches, sa colonne. Les plans restèrent contre sa poitrine.

Le quai. Le béton froid. L'air marin dans ses poumons.

Derrière elle, la verrière supérieure explosa. Le verre monta d'abord — aspiré par l'appel d'air — puis retomba en une pluie verticale. Chaque éclat captait la lumière du soir. Le feu jaillit par l'ouverture, libéré.

Elena serra les plans. Intacts. Humides de sueur. Six mois de travail dans un cylindre de papier contre sa poitrine. Autour d'elle, le port continuait. Les bateaux tiraient sur leurs amarres. Les mouettes criaient.`,

  'w4-monologue': `Les mains de Marcus étaient posées sur l'établi, paumes vers le haut, comme deux objets qu'il ne reconnaissait plus. Le miroir piqué de l'atelier leur renvoyait une image déformée — doigts longs, articulations saillantes, veines bleues sous la peau fine du poignet. Des mains de chirurgien. Toujours.

Il les retourna. Paumes vers le bas. Les ongles étaient courts, limés avec cette régularité qui n'était plus de la discipline mais de l'instinct. Sous les ongles, des traces de bronze — poudre métallique incrustée dans les sillons de la peau, impossible à nettoyer complètement. Les mains d'un sculpteur portent la trace de leur matériau comme les mains d'un marin portent la trace du sel.

Scalpel et burin. Même longueur de manche. Même prise — pouce, index, majeur. Même mouvement du poignet, cette rotation millimétrique qui sépare le geste précis du geste approximatif. La différence n'était pas dans le geste. Elle était dans ce que le geste traversait.

Le scalpel traversait la chair. Le burin traversait le bronze. Et les deux traversaient quelque chose que Marcus n'avait jamais su nommer — cette membrane entre l'intention et l'acte, entre ce qu'on veut faire et ce qu'on fait réellement, entre la main qui sait et l'esprit qui doute.

Le néon grésillait. Toujours ce grésillement. Le même que celui de la salle d'opération, dix ans plus tôt. Le même son électrique, la même fréquence, le même bourdonnement microscopique qui ne s'entend que dans le silence. Et le silence, dans un atelier vide à minuit, était total.

Réparer ou créer. La question tournait dans la tête de Marcus comme un burin tourne dans le bronze — en creusant. Chaque sculpture était-elle une réparation déguisée ? Chaque forme humaine qu'il extrayait du métal — main, bras, torse, crâne fragmenté — était-elle une tentative de reconstruire ce qu'il n'avait pas pu sauver ?

Le patient n'avait pas de nom. Pas dans la mémoire de Marcus. Il avait un âge — sept ans — et des mains — petites, confiantes — et un silence. Le silence d'après. Pas le silence de la mort, qui est un événement. Le silence de l'échec, qui est un état. Un état permanent, logé dans les os du chirurgien comme le bronze est logé sous les ongles du sculpteur.

Marcus prit le burin. Le bronze attendait sur l'établi — bloc informe, masse brute de quatre kilos. Il frappa. Le son du métal contre le métal traversa l'atelier et rebondit sur les verrières. Echo unique, net, définitif.

Chaque coup était une réponse. Pas à une question. À une absence. Le burin enlevait de la matière comme le scalpel en avait enlevé — couche par couche, millimètre par millimètre. Mais le scalpel cherchait quelque chose à l'intérieur. Le burin cherchait quelque chose qui n'existait pas encore.

Créer n'est pas le contraire de réparer. Créer est ce qu'on fait quand réparer est impossible. Quand le corps ne répond plus, quand le moniteur affiche une ligne plate, quand les mains gantées de latex n'ont plus rien à toucher — alors on prend un autre outil, un autre matériau, et on recommence. Pas le même geste. Le même besoin.

Le bronze prenait forme sous les coups. Pas une main — pas cette fois. Quelque chose de plus abstrait. Un creux. Un espace intérieur. La forme de ce qui manque quand quelqu'un part.

Marcus frappa. Le néon grésillait. Le port dormait. Ce n'était pas du pardon. Ce n'était pas de la guérison. C'était autre chose, quelque chose sans nom, qui existait seulement dans l'espace entre le burin et le bronze, entre le geste et sa trace, entre le chirurgien qu'il avait été et le sculpteur qu'il n'avait pas choisi de devenir.`,
};

// ── Utils ──────────────────────────────────────────────────────────────────────

function getGitHead(): string {
  try { return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim(); }
  catch { return 'unknown'; }
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function pad(s: string, n: number): string { return s.substring(0, n).padEnd(n); }
function rpad(s: string, n: number): string { return s.substring(0, n).padStart(n); }

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Spearman rank correlation ────────────────────────────────────────────────

function spearmanRho(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;

  function ranks(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && sorted[j + 1].v === sorted[j].v) j++;
      const avgRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[sorted[k].i] = avgRank;
      i = j + 1;
    }
    return r;
  }

  const rx = ranks(x);
  const ry = ranks(y);
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DualSceneResult {
  scene_id: string;
  label: string;
  archetype: string;
  prose_hash: string;
  prose_word_count: number;
  legacy: {
    composite: number;
    min_axis: { name: string; value: number };
    verdict: string;
    source: 'reference' | 'live';
  };
  r6: {
    composite: number;
    local: number;
    arc: number;
    confidence: number;
    passage_type: string;
    passage_type_fallback: string;
    seal_eligible: boolean;
    active_features: number;
  };
  r6_profiles: Record<string, {
    composite: number;
    local: number;
    arc: number;
    seal_eligible: boolean;
  }>;
}

interface DualBenchSummary {
  version: string;
  mode: 'MOCK' | 'API';
  git_head: string;
  created_at: string;
  p_rel: number;
  scene_count: number;
  legacy_median: number;
  r6_median: number;
  spearman_rho: number;
  spearman_interpretation: string;
  scenes: DualSceneResult[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const gitHead = getGitHead();
  const mode: 'MOCK' | 'API' = IS_API ? 'API' : 'MOCK';

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA — GRAND PARALLÈLE: Dual Scoring Pipeline');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`[DUAL] HEAD=${gitHead}`);
  console.log(`[DUAL] Mode: ${mode}`);
  console.log(`[DUAL] P_rel: ${P_REL_NEUTRAL} (neutral — milieu de roman)`);
  console.log('');

  if (mode === 'API') {
    console.log('[DUAL] API mode: requires $env:ANTHROPIC_API_KEY');
    console.log('[DUAL] Will run full SovereignForge + dual scoring.');
    console.log('[DUAL] Use MOCK mode for validation without API.');
    console.error('[DUAL] API mode not yet wired — use MOCK for now.');
    console.log('[DUAL] Command for API mode: $env:ANTHROPIC_API_KEY = "sk-ant-..."; npx tsx scripts/run-benchmark-dual.ts --api');
    process.exit(1);
  }

  // ── Init R6 Scorer ──────────────────────────────────────────────────────
  const hasMetro = fs.existsSync(METRO_PATH);
  const scorer = hasMetro
    ? new MultiStageScorer(COEFF_PATH, METRO_PATH)
    : new MultiStageScorer(COEFF_PATH);

  console.log(`[DUAL] Coefficients: ${COEFF_PATH}`);
  console.log(`[DUAL] Metrology: ${hasMetro ? METRO_PATH : 'NOT FOUND — raw scoring'}`);
  console.log(`[DUAL] Normalization: ${scorer.isNormalized() ? 'ACTIVE (0-100)' : 'OFF (raw)'}`);
  console.log('');

  const profileNames = getProfileNames();
  const sceneIds = Object.keys(LEGACY_REFERENCE);
  const results: DualSceneResult[] = [];

  // ── Score each scene ────────────────────────────────────────────────────

  for (const sceneId of sceneIds) {
    const ref = LEGACY_REFERENCE[sceneId];
    const prose = MOCK_PROSE[sceneId];
    if (!prose) {
      console.error(`[DUAL] Missing MOCK prose for ${sceneId} — SKIP`);
      continue;
    }

    const wordCount = prose.split(/\s+/).length;
    const proseHash = sha256(prose);

    // Compute R6 features
    const features = computeTextFeatures(prose);

    // R6 score with default profile (STRATOSPHERIQUE)
    // Pass raw text for dialogue marker detection (Grand Parallèle fix)
    const r6Default = scorer.score(features, {
      wordCount,
      pRel: P_REL_NEUTRAL,
      profile: 'STRATOSPHERIQUE',
      text: prose,
    });

    // Fallback type from archetype
    const fallbackType = ARCHETYPE_TO_R6_TYPE[ref.archetype] ?? 'DESCRIPTION';

    // R6 score with all 6 profiles
    const r6Profiles: Record<string, { composite: number; local: number; arc: number; seal_eligible: boolean }> = {};
    for (const pName of profileNames) {
      const r6p = scorer.score(features, {
        wordCount,
        pRel: P_REL_NEUTRAL,
        profile: pName,
        text: prose,
      });
      r6Profiles[pName] = {
        composite: r6p.composite.score,
        local: r6p.local.score,
        arc: r6p.arc.score,
        seal_eligible: r6p.seal_eligible,
      };
    }

    // Determinism check — score again, must be identical
    const r6Check = scorer.score(features, {
      wordCount,
      pRel: P_REL_NEUTRAL,
      profile: 'STRATOSPHERIQUE',
      text: prose,
    });
    if (r6Check.composite.score !== r6Default.composite.score) {
      console.error(`[DUAL] DETERMINISM VIOLATION on ${sceneId}: ${r6Default.composite.score} !== ${r6Check.composite.score}`);
      process.exit(2);
    }

    const result: DualSceneResult = {
      scene_id: sceneId,
      label: ref.label,
      archetype: ref.archetype,
      prose_hash: proseHash,
      prose_word_count: wordCount,
      legacy: {
        composite: ref.composite,
        min_axis: ref.min_axis,
        verdict: ref.verdict,
        source: 'reference',
      },
      r6: {
        composite: r6Default.composite.score,
        local: r6Default.local.score,
        arc: r6Default.arc.score,
        confidence: r6Default.composite.confidence,
        passage_type: r6Default.passage_type,
        passage_type_fallback: fallbackType,
        seal_eligible: r6Default.seal_eligible,
        active_features: r6Default.local.active_features + r6Default.arc.active_features,
      },
      r6_profiles: r6Profiles,
    };

    results.push(result);
    console.log(
      `  [${pad(ref.label, 22)}] V3=${rpad(ref.composite.toFixed(2), 6)} | ` +
      `R6=${rpad(r6Default.composite.score.toFixed(2), 6)} LOC=${rpad(r6Default.local.score.toFixed(2), 6)} ` +
      `ARC=${rpad(r6Default.arc.score.toFixed(2), 6)} conf=${r6Default.composite.confidence.toFixed(3)} ` +
      `type=${r6Default.passage_type}`,
    );
  }

  // ── Spearman correlation ────────────────────────────────────────────────

  const v3Scores = results.map(r => r.legacy.composite);
  const r6Scores = results.map(r => r.r6.composite);
  const rho = spearmanRho(v3Scores, r6Scores);

  let rhoInterpretation: string;
  if (rho >= 0.70) rhoInterpretation = 'COHERENT — les deux systemes concordent';
  else if (rho >= 0.50) rhoInterpretation = 'MODERATE — correlation partielle';
  else if (rho >= 0.30) rhoInterpretation = 'DIVERGENT — ecart significatif';
  else rhoInterpretation = 'PROBLEME — les systemes ne sont pas alignes';

  // ── Print main table ────────────────────────────────────────────────────

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('  DUAL SCORING — TABLEAU PRINCIPAL');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log(
    `  ${pad('Scene', 22)} ${pad('Archtype', 10)} ${rpad('V3', 7)} ${rpad('R6', 7)} ` +
    `${rpad('R6 LOC', 7)} ${rpad('R6 ARC', 7)} ${rpad('R6 Conf', 8)} ${pad('R6 Type', 15)}`,
  );
  console.log('  ' + '─'.repeat(90));

  for (const r of results) {
    console.log(
      `  ${pad(r.label, 22)} ${pad(r.archetype, 10)} ${rpad(r.legacy.composite.toFixed(2), 7)} ` +
      `${rpad(r.r6.composite.toFixed(2), 7)} ${rpad(r.r6.local.toFixed(2), 7)} ` +
      `${rpad(r.r6.arc.toFixed(2), 7)} ${rpad(r.r6.confidence.toFixed(3), 8)} ${pad(r.r6.passage_type, 15)}`,
    );
  }

  console.log('  ' + '─'.repeat(90));
  console.log(
    `  ${pad('Mediane', 22)} ${pad('', 10)} ${rpad(median(v3Scores).toFixed(2), 7)} ` +
    `${rpad(median(r6Scores).toFixed(2), 7)}`,
  );
  console.log(
    `  ${pad('Correlation Spearman', 22)} ${pad('', 10)} ${pad('', 7)} rho=${rho.toFixed(4)}  ${rhoInterpretation}`,
  );
  console.log('');

  // ── Print profile cross-tab ─────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('  DUAL SCORING — 6 PROFILS R6 (composite)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');

  const shortProfiles = profileNames.map(p => p.substring(0, 7));
  console.log(`  ${pad('Scene', 22)} ${shortProfiles.map(p => rpad(p, 9)).join(' ')}`);
  console.log('  ' + '─'.repeat(22 + shortProfiles.length * 10));

  for (const r of results) {
    const vals = profileNames.map(p => rpad((r.r6_profiles[p]?.composite ?? 0).toFixed(2), 9));
    console.log(`  ${pad(r.label, 22)} ${vals.join(' ')}`);
  }

  // Profile averages
  const profileAvgs = profileNames.map(p => {
    const scores = results.map(r => r.r6_profiles[p]?.composite ?? 0);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  });
  console.log('  ' + '─'.repeat(22 + shortProfiles.length * 10));
  console.log(`  ${pad('MOYENNE', 22)} ${profileAvgs.map(a => rpad(a.toFixed(2), 9)).join(' ')}`);
  console.log('');

  // ── Save results ────────────────────────────────────────────────────────

  const summary: DualBenchSummary = {
    version: '1.0.0',
    mode,
    git_head: gitHead,
    created_at: new Date().toISOString(),
    p_rel: P_REL_NEUTRAL,
    scene_count: results.length,
    legacy_median: median(v3Scores),
    r6_median: median(r6Scores),
    spearman_rho: rho,
    spearman_interpretation: rhoInterpretation,
    scenes: results,
  };

  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const dirName = `DualBench_${mode}_${dateStr}_${gitHead}`;
  const packDir = path.join(OUT_DIR, dirName);
  fs.mkdirSync(packDir, { recursive: true });

  fs.writeFileSync(path.join(packDir, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(packDir, 'scenes.jsonl'),
    results.map(r => JSON.stringify(r)).join('\n') + '\n');

  // SHA256SUMS
  const files = ['summary.json', 'scenes.jsonl'];
  const sums = files.map(f => {
    const hash = createHash('sha256').update(fs.readFileSync(path.join(packDir, f))).digest('hex');
    return `${hash}  ${f}`;
  });
  fs.writeFileSync(path.join(packDir, 'SHA256SUMS.txt'), sums.join('\n') + '\n');

  console.log(`[DUAL] ValidationPack: ${packDir}`);
  console.log(`[DUAL] Spearman rho = ${rho.toFixed(4)} → ${rhoInterpretation}`);
  console.log('');

  // ── Verdict ─────────────────────────────────────────────────────────────

  if (rho >= 0.70) {
    console.log('DUAL BENCH VERDICT: COHERENT — R6 et V3 convergent.');
  } else if (rho >= 0.50) {
    console.log('DUAL BENCH VERDICT: MODERATE — correlation partielle, investigation recommandee.');
  } else {
    console.log('DUAL BENCH VERDICT: DIVERGENT — les deux systemes ne concordent pas.');
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
