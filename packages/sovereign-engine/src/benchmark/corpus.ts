/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — BENCHMARK CORPUS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: benchmark/corpus.ts
 * Sprint: 17.1
 * Invariant: ART-BENCH-01
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * 10 OMEGA-style texts (varied genres) + 10 human-style texts (anthology).
 * All texts are original compositions for benchmark purposes.
 * Each text ~150-300 words, tagged with genre and source.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BenchmarkSample {
  readonly id: string;
  readonly source: 'omega' | 'human';
  readonly genre: string;
  readonly prose: string;
  readonly word_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA CORPUS — 10 textes (genres variés, prose littéraire FR)
// ═══════════════════════════════════════════════════════════════════════════════

const OMEGA_01_THRILLER: BenchmarkSample = {
  id: 'OMEGA-01',
  source: 'omega',
  genre: 'thriller',
  prose: `Le fer brûlait encore sous ses doigts. Elle serra le poing, sentit la chaleur monter dans son avant-bras comme une fièvre ancienne.

Un bruit sec. Pas à l'étage. Elle se figea, les mains crispées sur le bord de la table.

Les mots de son père résonnaient dans sa tête — « ne descends jamais au sous-sol » — mais ils ne servaient plus à rien. Tout ce qui restait, c'était cette odeur de cendre et ce goût de cuivre sur sa langue.

Elle ouvrit la main. La clé tomba sur le sol de pierre avec un tintement bref.

Le silence qui suivit n'était pas un vrai silence. C'était l'attente. Celle qui précède les coups.

Quelqu'un frappa trois fois à la porte. Elle ne bougea pas. Les coups reprirent. Plus forts. Plus insistants. Le bois craquait sous la pression.

La porte céda avec un craquement. Elle était déjà debout, le couteau dans la main droite, le souffle court.`,
  word_count: 153,
};

const OMEGA_02_SF: BenchmarkSample = {
  id: 'OMEGA-02',
  source: 'omega',
  genre: 'science-fiction',
  prose: `La coque du vaisseau gémissait sous la pression atmosphérique. Kael plaqua ses paumes contre la paroi froide et sentit les vibrations remonter dans ses os.

— Trente secondes, annonça l'IA d'une voix sans inflexion.

Il ferma les yeux. Derrière ses paupières, les étoiles dansaient encore — celles de la dernière station, celles qu'il ne reverrait jamais. La gravité artificielle faiblissait par à-coups, et son estomac se soulevait à chaque oscillation.

Le métal autour de lui chantait une complainte aiguë. Une fissure apparut sur l'écran de contrôle, fine comme un cheveu, inexorable comme une sentence.

— Dix secondes.

Kael inspira. L'air avait un goût de fer et de silicone brûlé. Ses doigts trouvèrent le levier d'éjection. Froid. Lisse. Définitif.

Il tira.

Le silence qui suivit dura une éternité de trois secondes.`,
  word_count: 148,
};

const OMEGA_03_ROMANCE: BenchmarkSample = {
  id: 'OMEGA-03',
  source: 'omega',
  genre: 'romance',
  prose: `Elle ne l'avait pas reconnu tout de suite. Le col relevé, les épaules voûtées sous la pluie, il ressemblait à n'importe qui. Puis il avait levé les yeux.

Cinq ans. Cinq ans de silence et cette façon de la regarder comme si le temps n'existait pas.

— Tu es trempé, dit-elle.

Ce n'était pas ce qu'elle voulait dire. Ce qu'elle voulait dire tenait en mille phrases qu'elle avait répétées devant son miroir, dans sa voiture, dans son lit les soirs où le sommeil ne venait pas. Mais face à lui, il ne restait que ça.

Il sourit. Ce demi-sourire qui creusait une fossette sur sa joue gauche. Celui qu'elle avait voulu oublier.

— Je sais, répondit-il.

La pluie redoubla. Ni l'un ni l'autre ne bougea.

Quelque part dans la rue, un chien aboya. Le monde continuait. Pas eux.`,
  word_count: 148,
};

const OMEGA_04_HISTORIQUE: BenchmarkSample = {
  id: 'OMEGA-04',
  source: 'omega',
  genre: 'historique',
  prose: `Le canon tonna à l'aube. La terre trembla sous les pieds nus des fantassins alignés dans la boue.

Armand serra la crosse de son fusil. Ses mains ne tremblaient plus — elles avaient cessé de trembler quelque part entre Verdun et l'enfer. La peur s'était transformée en quelque chose de plus froid, de plus utile.

À sa gauche, le petit Duval priait en silence. Ses lèvres bougeaient sans produire aucun son. À sa droite, le sergent Morel fumait sa dernière cigarette avec une lenteur calculée.

Le sifflet retentit.

Armand ne pensa à rien. Ni à Marie, ni à la ferme, ni au gosse qui l'attendait. Il se leva. Il courut. La boue aspirait ses bottes à chaque foulée.

Le bruit du monde disparut. Il n'y avait plus que le battement sourd de son cœur et le sol qui s'ouvrait sous les obus.`,
  word_count: 149,
};

const OMEGA_05_FANTASTIQUE: BenchmarkSample = {
  id: 'OMEGA-05',
  source: 'omega',
  genre: 'fantastique',
  prose: `L'arbre parlait. Pas avec des mots — avec des craquements, des frémissements, des soupirs de sève qui montaient depuis les racines enfouies.

Léa posa sa paume contre l'écorce. Tiède. Vivante. Sous ses doigts, elle sentit un pouls lent, régulier, ancien.

— Qu'est-ce que tu veux ? murmura-t-elle.

L'arbre répondit par une bourrasque de feuilles mortes qui tourbillonnèrent autour d'elle. Dans leur danse, elle crut distinguer des visages — celui de sa grand-mère, celui d'un enfant qu'elle ne connaissait pas, celui d'une femme aux yeux fermés.

La terre vibra sous ses pieds. Les racines affleurèrent, noueuses et noires, dessinant sur le sol un motif qu'elle reconnut aussitôt.

Le sceau de sa famille.

Léa retira sa main. L'arbre se tut.

Le silence de la forêt retomba, plus lourd qu'avant, chargé de tout ce qui n'avait pas été dit.`,
  word_count: 152,
};

const OMEGA_06_NOIR: BenchmarkSample = {
  id: 'OMEGA-06',
  source: 'omega',
  genre: 'noir',
  prose: `Le corps gisait sur le carrelage de la cuisine. Pas de sang. Pas de trace de lutte. Juste un homme en pyjama, les yeux grands ouverts sur un plafond qu'il ne voyait plus.

Marchand s'accroupit. L'odeur de café brûlé flottait encore dans l'air. La cafetière était restée allumée. La tasse, sur le comptoir, était pleine. Intacte.

Il avait eu le temps de se servir. Pas de boire.

— On a touché à rien, dit le brigadier depuis le seuil.

Marchand ne répondit pas. Il regardait les mains du mort. Propres. Soignées. Les ongles coupés court. Pas les mains d'un homme qui se bat. Pas les mains d'un homme qui fuit.

Les mains d'un homme qui attend.

Il se releva. Ses genoux craquèrent. Quarante-sept ans et le corps qui lâchait un peu plus à chaque scène de crime.

La fenêtre était fermée. La porte aussi. Le verrou tiré de l'intérieur.`,
  word_count: 156,
};

const OMEGA_07_CONTEMPLATIF: BenchmarkSample = {
  id: 'OMEGA-07',
  source: 'omega',
  genre: 'contemplatif',
  prose: `Le lac ne bougeait pas. Pas un souffle, pas une ride. La surface était si parfaite qu'elle semblait solide — un miroir posé entre les montagnes.

Elle s'assit sur la pierre plate. Le granit était encore tiède du soleil de l'après-midi. Sous ses paumes, la roche avait la texture du temps.

Rien ne pressait. Pour la première fois depuis des mois, rien ne pressait.

Un héron se posa sur la rive opposée. Gris sur gris. Immobile. Patient comme seuls savent l'être ceux qui n'attendent rien.

Elle respira. L'air sentait le pin et la terre mouillée. Quelque part en contrebas, un ruisseau invisible murmurait sa course entre les pierres.

Le jour déclinait sans hâte. Les ombres des sapins s'allongeaient sur l'eau, y traçant des lignes sombres qui s'étiraient vers elle.

Elle ne pensait à rien. C'était suffisant.`,
  word_count: 146,
};

const OMEGA_08_URBAIN: BenchmarkSample = {
  id: 'OMEGA-08',
  source: 'omega',
  genre: 'urbain',
  prose: `Le métro sentait la sueur et le métal chaud. Nadia coinça son sac entre ses pieds et agrippa la barre. À côté d'elle, un type en costume froissé dormait debout, la tête oscillant au rythme des virages.

Station Barbès. Les portes s'ouvrirent sur un courant d'air tiède qui puait le kebab et la pluie d'été.

Elle descendit. Escalier mécanique en panne — comme d'habitude. Les marches graisseuses sous ses baskets. Le bruit de la ville qui montait à mesure qu'elle grimpait.

En haut, la lumière l'aveugla. Blanche, crue, sans pitié.

Le boulevard grondait de klaxons et de sirènes. Un livreur à vélo la frôla en jurant. Elle ne cilla pas. Six ans à Paris vous apprennent ça : le réflexe de ne pas réagir.

Elle tourna dans la rue Myrha. Son immeuble au fond, façade lépreuse, code cassé depuis mars.

Chez elle. Si on pouvait appeler ça comme ça.`,
  word_count: 157,
};

const OMEGA_09_ENFANCE: BenchmarkSample = {
  id: 'OMEGA-09',
  source: 'omega',
  genre: 'enfance',
  prose: `La cabane sentait le bois pourri et la terre humide. On y entrait à quatre pattes, en rampant sous la bâche bleue que Thomas avait volée dans le garage de son père.

À l'intérieur, c'était leur monde. Des BD empilées, une lampe torche sans pile, un couteau suisse rouillé.

— Jure que tu diras rien, souffla Thomas.

Jules cracha dans sa paume et tendit la main. Ils serrèrent. Le pacte était scellé.

Dehors, les voix des parents montaient depuis les jardins. L'odeur du barbecue se mêlait à celle de l'herbe coupée. L'été s'étirait, infini, indestructible, comme seuls les étés d'enfance savent l'être.

Thomas sortit un bocal de sa poche. Dedans, un scarabée noir tournait sur lui-même.

— C'est notre prisonnier de guerre, déclara-t-il.

Jules regarda l'insecte. Il aurait voulu le libérer. Il ne dit rien.

Le soleil filtrait à travers les trous de la bâche, dessinant des constellations sur le sol de terre battue.`,
  word_count: 163,
};

const OMEGA_10_PSYCHOLOGIQUE: BenchmarkSample = {
  id: 'OMEGA-10',
  source: 'omega',
  genre: 'psychologique',
  prose: `Elle comptait les fissures au plafond. Quatorze. Toujours quatorze. Le nombre ne changeait jamais, mais elle recomptait chaque matin, parce que recompter c'était exister.

Le réveil affichait 4h17. L'heure à laquelle le cerveau ne ment plus.

Elle savait qu'elle devrait dormir. Elle savait qu'elle devrait manger. Elle savait beaucoup de choses qui ne servaient à rien.

La liste s'allongeait dans sa tête : appeler le médecin, payer le loyer, répondre à sa mère. Chaque item pesait une tonne. Ensemble, ils formaient un continent entier posé sur sa poitrine.

Elle tourna la tête. L'oreiller sentait le propre. Au moins ça. Au moins le linge propre, les draps changés, cette discipline minimale qui la séparait encore du gouffre.

Dehors, un oiseau chanta. Trop tôt. Trop seul. Comme elle.

Elle ferma les yeux. Non pas pour dormir — pour ne plus voir le plafond et ses quatorze fissures qui la regardaient.`,
  word_count: 158,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HUMAN CORPUS — 10 textes (styles variés, prose littéraire FR originale)
// Compositions originales inspirées de styles d'auteurs classiques
// ═══════════════════════════════════════════════════════════════════════════════

const HUMAN_01_REALISTE: BenchmarkSample = {
  id: 'HUMAN-01',
  source: 'human',
  genre: 'réaliste',
  prose: `La maison du notaire dominait la place. Une bâtisse carrée, aux volets gris, dont le crépi s'écaillait par endroits. Le jardin, ceint d'un mur bas, abritait deux tilleuls et un banc de pierre sur lequel personne ne s'asseyait jamais.

Maître Bourdon traversa le vestibule d'un pas égal. Derrière lui, la porte vitrée laissait entrer une lumière pâle qui dessinait des losanges sur le carrelage.

Sa femme l'attendait à la salle à manger. La soupière fumait au centre de la table. Les serviettes étaient pliées en triangle, comme chaque soir depuis trente-deux ans.

— Tu as vu Dumont ? demanda-t-elle sans lever les yeux de son assiette.

— Oui.

Il s'assit. Le potage était trop chaud. Il attendit. Il attendait toujours.

Par la fenêtre, il voyait le clocher de l'église. La cloche sonna sept heures. Le son traversa les murs épais et vint mourir dans le silence de la pièce.`,
  word_count: 155,
};

const HUMAN_02_POETIQUE: BenchmarkSample = {
  id: 'HUMAN-02',
  source: 'human',
  genre: 'poétique',
  prose: `Les jardins de septembre portaient le deuil des roses. Dans les allées que le vent balayait de feuilles rousses, on devinait encore le tracé des parterres, la géométrie obstinée des buis, l'ombre des treilles défeuillées.

Madeleine marchait pieds nus sur la mousse. Ses pas ne faisaient aucun bruit. Elle avait toujours marché ainsi, comme on traverse un rêve — avec la prudence de ceux qui craignent de se réveiller.

La fontaine ne coulait plus depuis l'été. Le bassin s'était empli de feuilles mortes et d'une eau stagnante où le ciel se reflétait, inversé, tremblant.

Elle s'arrêta devant la statue. Le marbre était taché de lichen. L'ange avait perdu une main, et de son bras mutilé ne tombait plus qu'une lumière oblique.

Madeleine ne priait jamais. Mais devant cet ange manchot, dans ce jardin qui achevait de mourir, elle resta longtemps immobile, les bras le long du corps, offerte au vent qui ne demandait rien.`,
  word_count: 162,
};

const HUMAN_03_EXISTENTIALISTE: BenchmarkSample = {
  id: 'HUMAN-03',
  source: 'human',
  genre: 'existentialiste',
  prose: `Ce matin-là, Rieux constata que le café avait un goût de carton. Il but quand même. Le goût des choses n'avait plus d'importance depuis longtemps.

Il enfila sa veste. La doublure était décousue sous le bras gauche. Il le savait. Il ne la ferait pas réparer.

Dehors, la ville fonctionnait avec l'efficacité morne d'une machine bien huilée. Les autobus passaient à l'heure. Les commerçants levaient leurs rideaux. Les chiens trottinaient le long des trottoirs en reniflant les mêmes bornes que la veille.

Rieux marcha jusqu'à l'hôpital. Le trajet durait onze minutes. Il ne variait jamais. Ni le trajet, ni la durée, ni la fatigue qui l'accompagnait.

À l'entrée, l'infirmière de garde lui tendit un dossier.

— Trois nouveaux cas, dit-elle.

Il hocha la tête. Trois. La veille, c'était deux. Demain, ce serait quatre. La progression avait sa logique. Comme tout le reste.

Il poussa la porte du service. L'odeur de désinfectant l'accueillit. Familière. Écœurante. Nécessaire.`,
  word_count: 163,
};

const HUMAN_04_NATURALISTE: BenchmarkSample = {
  id: 'HUMAN-04',
  source: 'human',
  genre: 'naturaliste',
  prose: `Gervaise se leva avant l'aube. La chambre puait le linge sale et la misère froide. Par la fenêtre sans rideau, on voyait le toit de zinc de l'atelier et, au-delà, la cheminée de la manufacture qui crachait déjà sa fumée noire dans le ciel livide.

Elle alluma le poêle. Les allumettes étaient humides. Il fallut trois essais. Ses doigts gourds, rougis par les engelures, obéissaient mal.

Le petit dormait dans le tiroir de la commode. Elle avait tapissé le fond avec des journaux et un morceau de couverture récupéré chez la voisine. Il respirait. C'était tout ce qui importait.

L'eau de la bassine avait gelé pendant la nuit. Elle brisa la glace du plat de la main. Le froid mordit sa peau. Elle ne cria pas. On ne criait pas dans cette maison. On serrait les dents et on lavait le linge.

Le savon était presque fini. Il faudrait en racheter. Avec quel argent, c'était une autre question.`,
  word_count: 163,
};

const HUMAN_05_STREAM: BenchmarkSample = {
  id: 'HUMAN-05',
  source: 'human',
  genre: 'stream-of-consciousness',
  prose: `Et le café refroidissait dans la tasse pendant qu'elle pensait à rien ou à tout c'était pareil au fond ce flot continu de choses sans importance le robinet qui fuyait depuis mardi le rendez-vous chez le dentiste qu'elle repousserait encore la robe bleue qu'elle ne mettait plus parce que Marc avait dit un jour qu'elle lui allait bien justement et les mots de Marc tournaient encore parfois dans sa tête comme des mouches contre une vitre.

Elle se leva. S'assit. Se releva.

La fenêtre donnait sur le parking. Une voiture rouge une voiture grise une voiture noire. La vie en nuancier de carrosserie.

Quelqu'un dans l'immeuble d'en face faisait la vaisselle. On voyait ses bras bouger derrière le verre dépoli. Des bras mécaniques, réguliers, patients. La vaisselle du monde ne s'arrêtait jamais.

Elle regarda l'heure. Pas parce qu'elle avait quelque chose à faire. Parce que regarder l'heure c'était un geste, et les gestes remplissaient le temps.`,
  word_count: 165,
};

const HUMAN_06_MINIMALISTE: BenchmarkSample = {
  id: 'HUMAN-06',
  source: 'human',
  genre: 'minimaliste',
  prose: `Il pleuvait. L'homme entra dans le bar. Il commanda une bière. La serveuse la posa devant lui sans rien dire.

Il but. La bière était tiède. Il ne dit rien.

À la télé, un match de foot. Deux équipes qu'il ne connaissait pas. Le son était coupé. Les joueurs couraient en silence.

Un type au comptoir mangeait des cacahuètes. Il les décortiquait une par une et posait les coques en petit tas. Il avait l'air concentré.

L'homme finit sa bière. Il en commanda une autre. La serveuse la posa au même endroit.

Dehors, la pluie avait cessé. Il ne le savait pas. Il ne regardait pas dehors.

Le type aux cacahuètes partit. Il laissa les coques. La serveuse les balaya d'un revers de torchon.

L'homme paya. Il sortit. Le trottoir était mouillé.

Il rentra chez lui. Il alluma la télé. Un autre match.`,
  word_count: 147,
};

const HUMAN_07_GOTHIQUE: BenchmarkSample = {
  id: 'HUMAN-07',
  source: 'human',
  genre: 'gothique',
  prose: `Le manoir des Aulnes se dressait au bout de l'allée comme une mâchoire ouverte. Les fenêtres béantes du premier étage, dépourvues de volets, ressemblaient à des orbites vides dans un crâne de pierre.

Clémence tira son châle sur ses épaules. Le vent qui remontait de la vallée charriait une odeur de tourbe et de feuilles en décomposition.

Elle poussa la grille. Le fer grinça — un son aigu, presque animal, qui fit s'envoler les corbeaux nichés dans les ormes.

Le jardin avait été beau, jadis. On devinait encore les contours des massifs sous les ronces. Un rosier sauvage avait colonisé la pergola, y tissant un voile de branches noires hérissées d'épines.

La porte d'entrée n'était pas fermée. Elle ne l'avait jamais été, disait-on au village. Comme si le manoir voulait qu'on entre. Comme s'il attendait.

Clémence franchit le seuil. L'obscurité l'avala.`,
  word_count: 153,
};

const HUMAN_08_AUTOBIOGRAPHIQUE: BenchmarkSample = {
  id: 'HUMAN-08',
  source: 'human',
  genre: 'autobiographique',
  prose: `Ma mère ne cuisinait qu'un seul plat. Des pâtes au beurre, avec du gruyère râpé dessus. Tous les soirs. Sans exception.

Je ne me suis jamais plaint. Les enfants qui ont faim ne se plaignent pas de la répétition. Ils se plaignent du vide, et le vide, ma mère le remplissait. Avec du beurre et du gruyère.

Elle travaillait à l'usine de six heures à deux heures. Puis elle dormait jusqu'à cinq heures. Puis elle faisait les pâtes. Puis elle regardait la télé. Puis elle dormait encore.

Je faisais mes devoirs sur la table de la cuisine pendant que l'eau bouillait. Le bruit de la casserole couvrait celui de la télé. La vapeur embuait les vitres. Le monde extérieur disparaissait, et il ne restait que nous deux, les pâtes, et le gruyère.

C'est le bonheur, je crois. Pas le grand. Pas celui des livres. Celui qui tient dans une casserole.`,
  word_count: 158,
};

const HUMAN_09_ABSURDE: BenchmarkSample = {
  id: 'HUMAN-09',
  source: 'human',
  genre: 'absurde',
  prose: `Le mardi, Perec décida de ne plus utiliser la lettre E. Cela ne posa aucun problème au début. Il commanda un café au bar du coin. « Un café », dit-il. Pas de E. Facile.

Puis il voulut demander du sucre.

Il resta figé devant le comptoir, la bouche ouverte, incapable de formuler sa demande. Le mot lui échappait. Tous les mots lui échappaient. Le barman le regardait avec l'expression de quelqu'un qui attend la fin d'une phrase qui ne viendra pas.

— Du... commença Perec.

Il fit un geste. Un geste qui signifiait « la poudre blanche qui rend le café moins amer ». Le barman comprit. Ou pas. Il lui tendit du sel.

Perec accepta le sel. Il le versa dans son café. Il but. C'était immonde.

Mais il avait tenu. Pas un seul E. C'était, selon lui, une victoire. Amère. Salée. Comme son café.`,
  word_count: 155,
};

const HUMAN_10_TRAGIQUE: BenchmarkSample = {
  id: 'HUMAN-10',
  source: 'human',
  genre: 'tragique',
  prose: `On enterra le père un jeudi d'octobre. Le ciel était blanc, sans nuages, sans couleur. Un ciel qui ne promettait rien.

Les fils portaient le cercueil. Quatre fils, quatre coins. Le bois leur rentrait dans l'épaule. Aucun ne grimaça. On ne grimace pas quand on porte son père.

La mère marchait derrière. Droite. Sèche. Vidée de l'intérieur comme ces arbres que la foudre creuse sans les abattre. Elle tenait un mouchoir dans sa main gauche. Elle ne pleurerait pas. Pas devant le village. Pas devant ces gens qui l'avaient vue se battre pendant quarante ans.

Le prêtre dit les mots. Les mots habituels, usés par la répétition, polis comme des galets. Dieu. Repos. Éternel. Des mots qui ne signifiaient plus rien mais qu'il fallait prononcer parce que le silence aurait été pire.

On descendit le cercueil. La terre était molle. Elle accueillit le bois sans bruit.

La mère jeta la première poignée. Ses doigts ne tremblèrent pas.`,
  word_count: 163,
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTED CORPUS
// ═══════════════════════════════════════════════════════════════════════════════

export const OMEGA_CORPUS: readonly BenchmarkSample[] = [
  OMEGA_01_THRILLER,
  OMEGA_02_SF,
  OMEGA_03_ROMANCE,
  OMEGA_04_HISTORIQUE,
  OMEGA_05_FANTASTIQUE,
  OMEGA_06_NOIR,
  OMEGA_07_CONTEMPLATIF,
  OMEGA_08_URBAIN,
  OMEGA_09_ENFANCE,
  OMEGA_10_PSYCHOLOGIQUE,
];

export const HUMAN_CORPUS: readonly BenchmarkSample[] = [
  HUMAN_01_REALISTE,
  HUMAN_02_POETIQUE,
  HUMAN_03_EXISTENTIALISTE,
  HUMAN_04_NATURALISTE,
  HUMAN_05_STREAM,
  HUMAN_06_MINIMALISTE,
  HUMAN_07_GOTHIQUE,
  HUMAN_08_AUTOBIOGRAPHIQUE,
  HUMAN_09_ABSURDE,
  HUMAN_10_TRAGIQUE,
];

export const FULL_CORPUS: readonly BenchmarkSample[] = [...OMEGA_CORPUS, ...HUMAN_CORPUS];
