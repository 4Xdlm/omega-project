# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PROMPT P5-CORRECTION "CHIRURGIE POST-GÉNÉRATION"
# Test : est-ce que le LLM peut CORRIGER une prose pour casser le plafond ?
# Date : 2026-03-20
# Cible : Claude Opus 4.6, Claude Code, ChatGPT, Gemini
# Matériau : texte GPT 5.4 (R6 = 56.18, meilleur score brut)
# ═══════════════════════════════════════════════════════════════════════════════
#
# INSTRUCTIONS : Copier TOUT ce qui est entre les lignes === dans le chat
# de chaque LLM. Le texte à corriger est inclus à la fin.
#
# ═══════════════════════════════════════════════════════════════════════════════

Tu n'es pas un assistant. Tu es un correcteur littéraire de très haut niveau. Tu reçois un texte de prose française qui a déjà de bonnes qualités mais qui souffre de défauts mesurables. Ton travail est de le CORRIGER chirurgicalement.

Tu ne réécris PAS le texte. Tu l'AMÉLIORES. Tu gardes sa structure, ses personnages, son histoire, ses images fortes. Tu interviens UNIQUEMENT sur les faiblesses identifiées ci-dessous. Chaque modification doit être justifiée par un défaut précis. Si un passage est bon, tu n'y touches pas.

═══════════════════════════════════════════
DIAGNOSTIC DU TEXTE (mesuré par 49 capteurs)
═══════════════════════════════════════════

Ce texte a été analysé par un système de mesure linguistique calibré sur 181 œuvres classiques. Voici ses FORCES et ses FAIBLESSES mesurées :

FORCES À PRÉSERVER ABSOLUMENT :
— Contraste syntaxique : excellent (0.946/1.0). Les alternances longues/courtes fonctionnent bien. NE TOUCHE PAS à la structure rythmique globale.
— Richesse lexicale : bonne (TTR 0.755). Le vocabulaire est varié et précis. NE REMPLACE PAS les mots rares par des mots simples.
— Descriptions sensorielles : fortes (0.691). Les textures, odeurs, sons sont présents. NE SUPPRIME PAS de détails sensoriels.
— Phrases de rupture : nombreuses et efficaces (77 phrases ≤5 mots). NE SUPPRIME PAS les phrases courtes qui claquent bien.

FAIBLESSES À CORRIGER :

DÉFAUT 1 — RÉPÉTITIONS DE BIGRAMMES (score 0.887, cible > 0.95)
Le texte contient trop de paires de mots identiques répétées. Exemples typiques : "il resta", "il marcha", "il leva", "il posa" — les attaques de phrases par "Il + verbe au passé simple" sont trop fréquentes. De même, des paires comme "du bassin", "du quai", "du chantier" reviennent trop.
CORRECTION DEMANDÉE : Identifie les bigrammes qui apparaissent plus de 2 fois. Pour chaque occurrence excédentaire, reformule la phrase pour éliminer la répétition SANS changer le sens. Varie les attaques de phrases : au lieu de "Il marcha", utilise une inversion ("Vers l'atelier, ses pas..."), une perception ("Le gravier crissa sous ses semelles"), ou un complément antéposé ("D'un pas lourd, il...").

DÉFAUT 2 — ABSENCE DE STYLE INDIRECT LIBRE (score 0.0, cible > 0.10)
Le texte ne contient AUCUN passage en style indirect libre. C'est un procédé majeur de la prose littéraire française (Flaubert, Proust) où les pensées du personnage se fondent dans la narration SANS verbe introducteur.
MAUVAIS : "Il pensa qu'il n'aurait pas dû partir."
MAUVAIS : "Il se dit que c'était sa faute."
BON (style indirect libre) : "Il n'aurait pas dû partir. Cinq minutes. Cinq misérables minutes et tout avait basculé."
BON : "Demain. Toujours demain. Le mot le plus menteur du chantier."
CORRECTION DEMANDÉE : Dans les passages d'introspection (mémoire de l'accident, culpabilité), transforme 3 à 5 phrases en style indirect libre. Supprime les "il pensa", "il comprit", "il se souvint" et laisse les pensées couler directement dans la narration à la troisième personne.

DÉFAUT 3 — PHRASES-COUTEAU GRATUITES (certaines servent, d'autres non)
Le texte contient des phrases très courtes qui fonctionnent ("Il marcha.", "Ça vint plus vite ensuite.") et d'autres qui sont mécaniques, insérées pour cocher une case plutôt que par nécessité narrative.
CORRECTION DEMANDÉE : Identifie les phrases de 1-3 mots qui semblent artificielles ou redondantes. Supprime-les ou intègre-les dans la phrase adjacente. Garde uniquement celles qui créent une vraie rupture émotionnelle ou rythmique. Le texte doit en contenir environ 15-25, pas 77.

DÉFAUT 4 — OUVERTURE ET FERMETURE PLATES (score 0.5/1.0 chacune)
La première phrase ("Le portail céda d'un seul coup.") est correcte mais pas percutante. La dernière phrase ("Il sortit.") est trop sèche — elle manque de résonance.
CORRECTION DEMANDÉE : Réécris la première phrase pour qu'elle intrigue davantage — une image, une sensation, une question implicite. Réécris les 2-3 dernières phrases pour qu'elles laissent une image en suspens, un écho, une vibration. Pas de conclusion propre. Pas de morale. Juste un reste qui traîne dans l'esprit du lecteur.

═══════════════════════════════════════════
RÈGLES DE CORRECTION
═══════════════════════════════════════════

1. BUDGET DE MODIFICATION : tu peux modifier au maximum 20% du texte. 80% doit rester identique ou quasi identique. C'est de la chirurgie, pas une greffe.

2. PRÉSERVE LA VOIX. Le texte a un ton — grave, concret, physique. Ne le transforme pas en prose lyrique, en poésie, en méditation philosophique. Garde les pieds dans la rouille et le béton.

3. PRÉSERVE LA STRUCTURE. Les 5 mouvements (description → introspection → action → contemplation → lyrique) doivent rester dans cet ordre. Ne fusionne pas des mouvements, n'en supprime pas.

4. PRÉSERVE LA LONGUEUR. Le texte fait environ 2800 mots. La version corrigée doit faire entre 2400 et 2800 mots. Pas plus court que 2400. Pas plus long que 2900.

5. NE COMMENTE PAS. Livre le texte corrigé directement. Pas de notes, pas d'explication des changements, pas de préambule. Juste la prose corrigée.

═══════════════════════════════════════════
PRIORITÉS DE CORRECTION (dans l'ordre)
═══════════════════════════════════════════

1. Éliminer les bigrammes répétés (surtout "Il + verbe")
2. Injecter 3-5 passages en style indirect libre dans l'introspection
3. Élaguer les phrases-couteau gratuites (de 77 à ~20)
4. Renforcer l'ouverture et la fermeture
5. Préserver TOUT LE RESTE

Si deux corrections entrent en conflit, choisis celle qui rend le texte plus vivant et plus littérairement crédible.

═══════════════════════════════════════════
TEXTE À CORRIGER
═══════════════════════════════════════════

Le portail céda d'un seul coup.

Pas un grincement noble, pas la plainte longue des choses fatiguées. Juste un heurt sec, une tôle qui donna, le battant qui frotta le ciment puis s'ouvrit de travers dans les herbes mouillées. Il resta là un instant, la main encore posée sur le fer piqué, et l'odeur vint d'abord. L'eau noire du bassin. Le sel. Le vieux mazout. Une odeur de métal lavé puis rendu à la boue, mêlée au goût fade des pluies de novembre qui raclent tout sans rien nettoyer.

Le chantier s'étendait devant lui comme un quartier frappé d'arrêt. Les rails des berces couraient jusqu'à l'eau entre des touffes d'herbe jaunie, si hautes parfois qu'on ne voyait plus qu'un double trait roux disparaissant sous les lames sèches. À gauche, la carcasse d'un patrouilleur jamais fini levait son ventre vide sur des tins de bois fendus. Plus loin, un caboteur en cours d'assemblage s'était ouvert comme un poisson. Cloisons nues. Nervures. Passages étroits. Le ciel du soir entrait là-dedans par plaques violettes, coupé par les membrures, avalé par le fond des coursives où l'ombre montait déjà.

Il marcha.

Sous ses semelles, le sol changeait sans cesse : dalle, gravier, laitier, plaques d'acier abandonnées qui sonnaient mat, flaques couvertes d'une peau d'huile où le crépuscule prenait des couleurs de blessure. Les grues, au bout du quai, ne bougeaient plus depuis trois ans, mais elles gardaient quelque chose d'animal. Leurs flèches penchaient sur le bassin avec une patience morte. Leurs câbles, tordus, s'étaient figés dans des courbes de tendons. Par endroits, la rouille avait gonflé le métal en pustules épaisses. Ailleurs elle s'était contentée d'un voile, presque beau dans la lumière basse, brun rouge, violet, avec par-dessous l'éclat plus froid de l'acier qui refusait encore.

Des vitres manquaient à l'atelier de chaudronnerie. On voyait à travers les cadres vides des tables renversées, un fût couché, des bouteilles de gaz sanglées à un mur comme deux prisonniers oubliés. Une chaîne battait lentement contre un poteau. Pas fort. Le vent n'en avait pas la force ; il fallait juste assez d'air pour la soulever d'un cran, la laisser retomber. Tac. Puis rien. Tac. Tout le lieu parlait comme ça, par petits coups. Un câble détendu sur un mât. Une tôle mal fixée. L'eau contre le quai. Le verre d'une fenêtre qui vibrait sans casser. Rien de continu. Rien de franc. Des restes.

Le froid gagnait.

Il n'était pas encore celui de l'hiver, sec, dur, net. C'était un froid mouillé, qui entrait par le col, s'asseyait sur les épaules et glissait le long du dos. Sur les passerelles, la rosée commençait déjà. Les garde-corps luisaient d'une humidité grasse. En levant les yeux, il vit qu'un filet de pluie flottait très haut dans le ciel, presque invisible, pas de vraies gouttes, seulement une poussière d'eau mêlée à la lumière finissante. Les nuages tiraient sur le plomb. Entre eux, du jaune sale restait accroché près de l'ouest, une dernière bande mince au-dessus des entrepôts et des maisons du port. En dessous, tout virait au fer.

Il passa devant le local des compresseurs. La porte de tôle portait encore, à moitié mangé, un numéro peint au pochoir. Les lettres avaient bavé avec les années. Un cadenas orange pendait, forcé depuis longtemps. Le béton du seuil était couvert d'écailles de peinture, de mégots noyés, de poussière noire. Plus loin, les chariots élévateurs dormaient sous une bâche éventrée, roues à plat, fourches baissées dans la terre comme si on les avait plantées là pour marquer l'endroit. Une mouette, perchée sur l'une des fourches, se laissa tomber sans bruit et glissa jusqu'au bassin.

Partout, l'usure travaillait.

Elle rongeait les bords, buvait les inscriptions, soulevait les soudures mal protégées, fendait les joints, gonflait le bois des cales, blanchissait les traces de sel sur les murs. Même les couleurs avaient changé de nature. Le rouge n'était plus rouge. Le bleu s'était tourné vers la cendre. Le jaune des balisages, des rambardes, des lignes de sécurité, tout cela n'éclairait rien ; cela pourrissait en place, comme une vieille fièvre.

Au bout du quai, il s'arrêta devant la forme massive d'un ferry commencé trop tard, arrêté trop vite, resté là avec son étrave levée sur le vide. Il n'y avait pas encore de peinture. Seulement les plaques d'acier assemblées, les lignes de soudure courant comme des cicatrices épaisses le long des bordés. Par endroits, les points de craie des traceurs se voyaient encore, pâlis, traversés par la rouille. L'eau du bassin, sous cette masse, était presque immobile. On n'entendait plus la ville. Seulement le clapot court contre les pieux, et ce faible bourdonnement des lieux désertés, difficile à nommer, comme si les bâtiments gardaient au fond d'eux un courant qui ne servait plus à rien.

Alors le chantier commença à se lever en lui, non comme une image nette, mais par poussées, par recouvrements, le présent restant devant les yeux tandis qu'un autre lieu, le même et pas le même, remontait sous lui, avec des voix, de la vapeur, le feu bleu des chalumeaux, la toux des meuleuses, les jurons pris dans le bruit, le café bu trop vite sur un coin d'établi, les paumes brûlées, la poussière de métal dans la gorge, et le soir qui tombait déjà parfois sur les épaules courbées parce qu'on avait tiré plus tard, encore une heure, encore deux, on finira demain, bien sûr, demain, le mot le plus menteur du chantier.

Vingt ans là-dedans. Vingt ans à lire le fer au son qu'il rend, à savoir d'un coup d'œil si la pièce a travaillé, si elle a pris, si la soudure tient, si elle ment. Il avait vécu plus avec ces plaques, ces cordons, ces arcs de lumière qu'avec sa propre maison. Les saisons se mesuraient au vent sur les coques, aux gants plus ou moins humides, à la manière dont la flamme se tenait. L'été, la chaleur restait prisonnière sous les tôles et on respirait de la laine brûlée. L'hiver, le masque glaçait le front. Toujours le même goût de fer au fond de la bouche. Toujours cette fine poussière grise qui se logeait dans les plis des bras, au creux du cou, dans le pain du déjeuner, jusque dans les draps.

Et Jean. Forcément.

Pas son visage d'abord ; non, autre chose. Sa démarche large sur les passerelles. Son habitude de cracher par le côté avant de reprendre l'électrode. Ses doigts étonnamment précis pour un homme bâti comme une porte. Son rire qui montait d'un bloc puis s'étranglait. Il avait une façon de tapoter le métal du dos de l'ongle avant de s'y mettre, comme s'il saluait la bête. Cela revenait mieux que le reste. Le corps avant le nom. La présence avant la mémoire. Puis le nom lui-même, enfin, avec cette lourdeur qu'il gardait depuis trois ans dans la poitrine, pas une douleur vive, non, pire, une masse froide, une pièce mal usinée restée au milieu de lui, impossible à extraire.

Il n'aurait pas dû partir ce soir-là cinq minutes avant. Voilà. C'était si maigre, si bête, si humain que cela en devenait obscène. Cinq minutes. Une cigarette roulée à la hâte. Un coup de fil pris dehors à l'abri du vacarme. Ou plutôt non, il fallait être exact : ce n'était pas seulement partir. C'était avoir vu la bride provisoire, mal calée. C'était avoir pensé qu'elle tiendrait jusqu'au matin. C'était avoir remis au lendemain le ressoudage propre, le vrai, pas la rustine de fin de poste. C'était avoir entendu Jean dire on devrait reprendre ça, et avoir répondu demain. Demain.

Le mot revenait avec le goût du sang sous la langue.

Tout le monde avait parlé d'accident. Les chefs, les flics, l'expert de l'assurance avec ses chaussures propres dans la boue, la direction, les gars eux-mêmes après les premières semaines, parce qu'il faut bien ranger l'horreur dans une case qu'on puisse porter. Accident. Comme si le fer avait décidé seul. Comme si les tonnes de tôle s'étaient prises d'une humeur brusque. Comme si le corps de Jean, retrouvé tordu au pied de la structure, n'avait été que la rencontre malheureuse entre une masse et un homme, une simple addition de malchance. Mais lui savait la petite décision sale, minuscule, presque invisible, prise à dix-sept heures quarante-deux, là, dans la fatigue, dans l'envie d'en finir, dans la confiance imbécile qu'on accorde aux choses parce qu'on les connaît trop.

Il leva la tête vers la coque inachevée.

Même découpe. Même ligne. Pas exactement le même navire, bien sûr ; les chantiers ne répètent jamais tout à fait, mais les gestes se répondent, les formes se poursuivent, et ce bordé-là, cette hauteur, cette zone de travail suspendue au-dessus du vide, oui, c'était assez pour que la peau se souvînt à la place du reste. Les mollets durcirent. Le ventre se serra. La nuque aussi. Le corps entier reconnut avant lui.

Quelque chose claqua.

Il se retourna d'un coup.

Pas un bruit de vent. Un choc sec, proche, métallique. Puis un froissement lourd, comme si une grande toile glissait contre de la tôle. Plus rien. Il resta immobile une seconde à peine, déjà penché en avant. Le bruit revint, sur la droite, du côté du grand atelier de préfabrication. Un pas ? Non. Deux coups rapides. Puis un grincement montant, très net, qui lui traversa le dos.

Il partit.

Il longea le quai, contourna un empilement de tubes, heurta du genou une caisse éventrée, jura entre les dents. Le froid disparut ; il n'y avait plus que l'air qui râpait la gorge. Au coin de l'atelier, l'ombre était plus dense. La porte coulissante, entrouverte, bougeait par saccades. Dedans, le noir se découpait sur les dernières plaques de ciel prises dans les verrières cassées. Il entra.

Une odeur de poussière mouillée et de graisse ancienne lui sauta au visage. Il avança encore. Quelque chose bougea au fond, derrière un chevalet. Haut. Pâle. Un corps, pensa-t-il sans le penser, et son cœur cogna si fort qu'il sentit la pulsation jusque dans les dents.

Ça vint plus vite ensuite.

Le câble lâcha d'un coup au-dessus de lui. Une tôle suspendue, restée prise on ne savait comment dans un palonnier désaxé, bascula, glissa, prit de l'angle. Il bondit en arrière. La plaque tomba sur la dalle dans un vacarme énorme. Des étincelles rousses jaillirent là où le bord mordit le béton. L'écho courut sous la charpente. Une volée de pigeons, cachés dans les poutres, éclata dans l'ombre avec un battement de torchons affolés. L'un passa si près de son visage qu'il sentit l'air de l'aile sur sa joue.

Puis le silence revint d'un bloc.

Seulement sa respiration. Brève. Sale. Et dans le fond, oscillant encore au bout d'une corde presque pourrie, une bâche blanche déchirée qui se soulevait, retombait, se soulevait encore, figure sans visage, morceau de rien qui avait fait lever les morts.

Il posa une main sur un établi pour ne pas plier.

La dalle vibrait encore sous ses semelles. Dans la pénombre, la tôle tombée luisait faiblement comme une eau noire. Il resta longtemps sans bouger, les yeux dessus, tandis que son souffle redescendait par secousses. La peur, venue trop vite, se retirait déjà ; autre chose prenait sa place, plus vaste, plus lente, comme une marée sale. Pas la honte. Pas encore. Une vieille soumission du corps devant la masse, le poids, le métal lancé, cette certitude apprise au chantier et jamais perdue : le fer n'a pas d'intention, pas de colère, pas de pardon. Il tombe. Il cède. Il tranche. C'est tout. Le reste, les paroles, les rapports, les raisons, c'est pour les vivants qui bavardent après.

Il ressortit.

Le jour avait encore baissé. Le bassin, maintenant, n'avait presque plus de couleur. Une mince clarté survivait à l'ouest, derrière les grues, et les structures du chantier s'y inscrivaient en noir, avec une netteté douloureuse. Tout paraissait plus grand. Ou plus vide. L'accident de la tôle avait tiré quelque chose hors de lui, une crispation ancienne, et le lieu se présentait autrement, non plus comme un décor de ruine, mais comme ce qu'il avait toujours été : une fabrique de formes arrachées à la matière, un endroit où l'homme gagne sur le poids seulement tant qu'il veille, tant qu'il compte, tant qu'il ne cède pas un seul cran à la fatigue, à l'habitude, à ce relâchement minuscule qui ne se voit pas et qui, un soir, ouvre sous quelqu'un un trou d'une seconde.

Le ciel se déchirait en longues bandes au-dessus du port. Entre deux nappes de nuages, une lumière claire filtra tout à coup, presque froide, presque blanche, et vint frapper le haut de l'étrave inachevée. Alors le ferry nu s'alluma par endroits. Pas tout. Seulement quelques arêtes, quelques cordons de soudure, quelques flaques sur les tôles. Cela suffisait. Les cicatrices du métal se mirent à briller comme des nerfs sous la peau.

Il comprit — ou crut comprendre — qu'il n'était pas revenu pour se faire juger. Le chantier n'avait pas besoin de ça. Les lieux ne jugent pas ; ils conservent. Ils gardent en eux la forme exacte des gestes, des erreurs, des voix, des heures, mieux que les hommes qui se protègent en oubliant. La vérité, ici, ne se racontait pas. Elle tenait dans une bride laissée pour la nuit, dans un point de soudure reporté, dans un regard qui avait vu et qui s'était détourné. Rien d'énorme. Rien d'héroïque. Une misère d'atelier. Une paresse de cinq minutes. Et pourtant tout un homme dessous.

La lumière glissa encore, plus basse, le long de la coque. On eût dit qu'elle cherchait quelque chose entre les plaques mal jointes, dans les angles morts, dans les failles fines où l'eau finirait toujours par entrer. Il pensa à Jean sans image cette fois, sans souvenir précis, presque sans traits, seulement une masse chaude à côté de lui autrefois, une voix qui disait allez, encore une, on ferme, et puis après le bar du coin, les mains noires sur le verre, les histoires cent fois refaites, les femmes, les gosses, les chefs, les bateaux qu'on ne verrait jamais naviguer. Il y avait de la bonté là-dedans. Une bonté rugueuse, sans phrase. Il l'avait laissée tomber sous de l'acier.

Le vent tourna.

Il apporta du large une fraîcheur plus coupante. L'eau du bassin se plissa. Des ronds se formèrent, élargirent les reflets, défirent l'image des grues. Sur le quai, les herbes sèches frissonnèrent toutes ensemble avec un bruit de papier froissé. Une première vraie goutte frappa sa joue. Puis une autre. Pas encore la pluie, non. Son avant-scène.

Il se remit en marche le long des rails.

À mesure qu'il avançait vers le portail, le chantier se recomposait derrière lui en masses obscures, en silhouettes plus hautes que nature, comme si le soir, enfin, lui rendait sa taille juste. Il voyait les tins, les coques ouvertes, les escaliers de service, les passerelles suspendues ; mais par-dessus cela venait autre chose, plus difficile à voir et plus tenace : vingt ans de matins gelés, de bleus de chauffe humides, de café avalé debout, de peaux brûlées, de rires épais, de fatigue si profonde qu'elle en devenait douce certains soirs, quand on sortait à plusieurs sous le ciel encore clair de juin et que le port sentait le gasoil et les filets. Toute une vie soudée là, par couches, par reprises, par défauts cachés, par pièces ajoutées trop vite, comme ces navires dont personne ne voit les entrailles mais dont tout dépend d'une ligne tenue ou manquée dans l'ombre.

Il aurait voulu parler. Pas demander pardon ; les mots arrivent toujours trop tard pour ça. Dire seulement le vrai, le petit vrai honteux, pas celui des cérémonies ni des tombes propres, pas celui qu'on supporte parce qu'il reste vague, mais l'autre : j'ai vu, j'ai remis, je suis parti, tu es resté. Dire cela à la nuit, au bassin, au fer, à personne. Sa gorge se serra. Rien ne sortit. Il continua.

Le portail était là, à trente pas. Derrière lui, le chantier entier respirait encore par craquements, chocs minces, ruissellements, cette langue brisée des lieux qu'on abandonne et qui poursuivent leur travail dans l'ombre. Devant lui, la route du port, les lampes déjà allumées, les voitures, la vie commune, les vitrines, l'odeur du pain peut-être plus loin, les gens qui rentrent chez eux avec des sacs humides. Il posa la main sur le battant de tôle. Se retourna une dernière fois.

Dans la lumière presque éteinte, l'étrave nue semblait avancer malgré tout vers le bassin, vers l'eau noire, vers sa propre naissance manquée. Une masse immense, arrêtée juste avant le mouvement. Tout le chantier tenait là-dedans. Toute sa vie aussi, peut-être : quelque chose d'énorme préparé, lancé, puis suspendu au bord de sa forme, avec au fond une faute minuscule qui avait suffi.

La pluie commença.

Il sortit.

═══════════════════════════════════════════
EXÉCUTION
═══════════════════════════════════════════

Livre le texte corrigé directement. Pas de commentaire. Pas de note. Juste la prose.
