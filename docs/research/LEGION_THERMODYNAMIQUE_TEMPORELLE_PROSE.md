# LEGION — Thermodynamique temporelle de la variation stylistique et syntaxique de la prose

**Date** : 2026-06-05 · **Auteur** : Claude Code (recherche vérifiée + synthèse) · **But** : livrer le modèle « physique » de l'évolution de la prose demandé par l'Architecte, **fondé sur la recherche mondiale réellement vérifiée** (pas sur les URLs collées par les IA, dont certaines étaient mal attribuées). Standard OMEGA : chaque affirmation balisée VÉRIFIÉ / RAPPORTÉ / HYPOTHÈSE-OMEGA / MÉTAPHORE.

> **Avertissement de rigueur (cardinal)** : « thermodynamique de la prose » est un **échafaudage heuristique**, pas une loi physique démontrée. Les **faits empiriques** ci-dessous sont vérifiés et sourcés. Les **équations/forces/attracteurs** sont des **opérationnalisations proposées par OMEGA** — des hypothèses à valider sur corpus réel (EMP-16), jamais des lois acquises. Les projections chiffrées 2030/2040 produites par les IA proviennent d'une **matrice synthétique inventée à la main** (Gemini a codé `style_data` en dur) → **ILLUSTRATIVES, AUCUNE valeur empirique**.

---

## PARTIE I — LES LOIS EMPIRIQUES VÉRIFIÉES (l'état de l'art mondial)

Discipline : *Computational Literary Studies* / *Cultural Analytics* (Stanford Literary Lab, Illinois, McGill, Cambridge…).

### L1 — Concrétisation systémique : « telling → showing » [VÉRIFIÉ]
Heuser & Le-Khac, *A Quantitative Literary History of 2,958 Nineteenth-Century British Novels* (Stanford Literary Lab, Pamphlet 4, 2012). Corpus 1785-1900. **Glissement mesuré des mots abstraits de valeur/comportement social** (conduct, vanity, friendship…) **vers le langage concret/sensoriel** → « concrétisation systémique ». ⚠️ **Correction** : ce travail est de **Heuser & Le-Khac**, PAS de Moretti (Gemini l'a mal attribué ; Moretti a fondé le Lab, pas écrit ce pamphlet).

### L2 — Montée du dialogisme [VÉRIFIÉ]
Muzny et al., *Dialogism in the novel* (Digital Scholarship in the Humanities, 2017). 1 100 romans anglais, 230 ans. **La densité de citations/dialogue augmente d'≈ 1 citation /1000 mots tous les 25 ans** (≈ +1 citation/page par siècle). Le dialogue devient un moteur croissant du roman.

### L3 — Raccourcissement des phrases [RAPPORTÉ]
Travaux sur COHA et corpus narratifs européens : **baisse de la longueur moyenne de phrase** au 19ᵉ–début 20ᵉ, variable selon langue/genre. (Sourcé secondairement ; à re-mesurer nous-mêmes en LEGION-1.) ⚠️ Phrase courte ≠ bonne prose : c'est une **forme d'époque**, pas un verdict.

### L4 — Succession des cohortes : le style change par REMPLACEMENT, pas par adaptation [VÉRIFIÉ — pilier]
Underwood, Kiley, Shang, Vaisey, *Cohort Succession Explains Most Change in Literary Culture* (Sociological Science, 2022). 10 830 fictions, 1880-1999. **54.7% de la variance expliquée par le temps est mieux expliquée par l'année de NAISSANCE de l'auteur que par l'année de publication.** La pratique d'écriture se **fige tôt** dans la carrière ; le rythme de changement **décroît fortement avec l'âge**. → **Conséquence physique majeure** : l'évolution stylistique n'est PAS un flux continu lissé ; c'est une **succession de chocs de cohortes** (le sang neuf remplace, il n'adapte pas). *Nuance* : l'idiolecte évolue un peu au cours d'une vie (Seminck et al., Cultural Analytics, 19ᵉ FR) — donc « auteur = point fixe » est faux ; mieux : `auteur_début / milieu / tardif`.

### L5 — Décroissance ACCÉLÉRÉE de l'influence stylistique [VÉRIFIÉ — pilier]
Hughes, Foti, Krakauer, Rockmore, *Quantitative patterns of stylistic influence in the evolution of literature* (PNAS 2012, 10.1073/pnas.1115407109). Project Gutenberg, première étude stylométrique temporelle à grande échelle. **Preuve d'un « style d'une époque »** (localisation stylistique temporelle) + **taux de décroissance non homogènes** + **accélération de la décroissance de l'influence chez les modernes** (l'influence d'un auteur « porte » de moins en moins loin dans le temps à mesure qu'on avance). → la **demi-vie d'influence τ(t) rétrécit**.

### L6 — Conservatisme du prestige (dérive lente, pas de « révolutions ») [VÉRIFIÉ]
Underwood & Sellers, *The Longue Durée of Literary Prestige* (Modern Language Quarterly, 2016). Poésie anglaise 1820-1919. **Les marqueurs stylistiques du prestige sont STABLES sur le siècle** ; les « révolutions poétiques » ne sont PAS visibles dans le modèle ; les nouveaux volumes changent en **exagérant légèrement les traits qui définissaient le prestige du passé récent** (drift auto-corrélé). → l'**axe Prestige évolue lentement** et de façon **prédictible localement** (contraste avec le commercial, plus nerveux).

### L7 — Le genre est un champ flou, pas une étiquette [VÉRIFIÉ — valide notre échec genre]
Sobchuk & Šeļa, *Computational thematics: comparing algorithms for clustering the genres of literary fiction* (Humanities & Social Sciences Communications, Nature, 2024). Le clustering de genre **dépend massivement** du preprocessing, des features et de la distance choisis. → **confirme empiriquement l'effondrement LOAO de notre classifieur de genre** (V4-G4). Le genre doit être traité comme **vecteur de probabilités hybride**, jamais label dur.

### L8 — La littérarité est PARTIELLEMENT mesurable [VÉRIFIÉ — borne haute honnête]
Van Cranenburgh & Bod, *A Data-Oriented Model of Literary Language* (EACL 2017). Traits lexicaux + **fragments d'arbres syntaxiques**. **76% de la variance des notes de littérarité humaines expliquée.** → les compteurs portent une **partie réelle** du signal (≈ ¾), pas la totalité ni la magie. Cohérent avec OMEGA : la mesure CALC capte beaucoup mais pas tout.

### L9 — Arcs émotionnels = petit jeu de formes de base [VÉRIFIÉ, avec réserve]
Reagan et al., *The emotional arcs of stories are dominated by six basic shapes* (EPJ Data Science, 2016). 1 327 textes Gutenberg ; **6 arcs émotionnels de base** ; certains arcs ont plus de **succès** (mesuré par téléchargements). ⚠️ réserve : sacraliser « 6 arcs » produit des artefacts ; à manier comme base réductible, pas dogme.

### L10 — Le « bestseller code » : prédiction commerciale possible mais CONTESTÉE [VÉRIFIÉ comme claim, NON comme loi]
Archer & Jockers, *The Bestseller Code* (2016). ~5 000 romans dont ~500 NYT bestsellers ; claim **≈80% de précision**. ⚠️ **claim de livre grand public, fortement critiqué** (confond corrélation/causalité : marketing, auteur déjà connu, époque, réseau éditorial). → `potentiel commercial` = possible ; `certitude bestseller` = INTERDIT.

---

## PARTIE II — LA THERMODYNAMIQUE TEMPORELLE (modèle OMEGA opérationnalisé)

On pose chaque œuvre comme un **état** dans un espace de phase stylistique. Les « lois physiques » ci-dessous sont des **opérationnalisations proposées** des faits de la Partie I.

### 1. Vecteur d'état [HYPOTHÈSE-OMEGA, dérivé de L1-L9]
`V(œuvre, t)` = concaténation décorrélée de familles (cf CHRONOS) : forme (longueur/subordination L3), dialogisme (L2), concrétude (L1), lexique/entropie, syntaxe, intériorité, narrative (arcs L9), géométrie bge-m3. Réduit en ~10-20 axes indépendants (anti-noyade).

### 2. « Température / Entropie » — l'axe de prédictibilité [HYPOTHÈSE-OMEGA + MÉTAPHORE Shannon]
Entropie informationnelle `H` du texte (prédictibilité du prochain token/structure) :
- **Pulp = basse entropie** (chaînes très prévisibles, confortables, énergie sémantique faible).
- **« Salade lexicale » = entropie max** (le bruit submerge le signal — exactement nos fusions de forge toxiques N6/Mode C).
- **Tier-S = « bord du chaos »** : déjoue la prédiction lexicale TOUT EN gardant une syntaxe parfaite. [HYPOTHÈSE séduisante de Gemini — **NON démontrée**, à tester : mesurer H sur Gold-Set maîtres vs pulp et vérifier si les maîtres occupent une bande intermédiaire/structurée]. Le « sous-texte » N7 = énergie potentielle non verbalisée (métaphore).

### 3. « Vitesse / Gradient » — mais par CHOCS de cohortes, pas en flux lisse [HYPOTHÈSE-OMEGA corrigée par L4]
Centroïde par décennie × style → `dV/dt` = vélocité stylistique. **CORRECTION CAPITALE vs les 2 IA** : L4 (Underwood) impose que ce gradient n'est PAS une dérivée lisse — c'est une **fonction en escalier indexée par cohorte de naissance**. La bonne variable n'est pas « année de publication » mais « année de naissance de l'auteur ». Modéliser : `Style(cohorte_{k+1}) = Style(cohorte_k) + saut`, le saut piloté par influences (L5) + événements (Partie III). → un modèle « gradient continu » naïf (celui qu'ont esquissé ChatGPT et Gemini) **sur-lisse la réalité** et doit être remplacé par un modèle à cohortes.

### 4. « Noyau d'influence » à demi-vie décroissante [HYPOTHÈSE-OMEGA, dérivé de L5]
Force d'influence d'une œuvre source `s` sur une cible `c` : `I(s→c) ∝ similarité_style(s,c) · K(Δt)` où `K` est un **noyau de décroissance temporelle dont la portée τ rétrécit avec l'époque** (Hughes). → le mycélium d'influence se **contracte** dans le temps (les modernes héritent sur des fenêtres plus courtes).

### 5. « Attracteurs / bassins » [MÉTAPHORE + clusters VÉRIFIÉS L7]
Genres/périodes = clusters mathématiques réels (L7), modélisés comme **bassins d'attraction** : canon classique, thriller commercial, littéraire moderne, romance… Le « attracteur » dynamique reste une **métaphore** tant qu'on n'a pas ajusté un système dynamique réel.

### 6. « Forces externes » (champ) [HYPOTHÈSE-OMEGA, à vérifier Partie III]
Pressions exogènes sur `V` : marché, prestige institutionnel (L6, conservateur/lent), pression de genre, **rupture techno-médiatique** (imprimé→radio→cinéma→TV→internet→standardisation streaming), événements (guerres).

### 7. Grandeurs conservées vs variables — invariants de grandeur [HYPOTHÈSE-OMEGA, le cœur]
La thermodynamique cherche les **invariants** (ce qui se conserve sous le changement de forme) :
- **Varie (forme d'époque)** : longueur de phrase (L3), % dialogue (L2), abstraction/concrétude (L1), vocabulaire, place du narrateur.
- **Conservé (hypothèse d'invariant de grandeur)** : nécessité de chaque phrase, force de voix, tension interne, densité de sens, cohérence du monde. **Test (L8)** : un invariant doit corréler au prestige **cross-époque** (stable, cf L6) alors qu'une forme d'époque a une variance temporelle élevée.

---

## PARTIE III — VÉRIFICATION PAR L'HISTOIRE (les grands événements)
[HYPOTHÈSE-OMEGA — protocole de falsification]
Aligner la vélocité stylistique sur la timeline des **guerres / catastrophes / ruptures média**. **Test de rupture (change-point detection)** : le modèle « voit-il » les chocs connus (modernisme post-WWI, oralité/rythme post-WWII type Céline, accélération post-internet) **sans qu'on les lui injecte** ? Si oui → la thermodynamique capte une vraie dynamique causale. Si non → le modèle est descriptif, pas physique. C'est le **juge de paix** du programme.

---

## PARTIE IV — CROISEMENT AVEC LES TRIBUNAUX (crédits + corrections)

**Convergences validées** (ChatGPT + Gemini + recherche vérifiée) :
- Le « style d'une époque » existe et est mesurable (L5) ✓
- Les anciens portent les invariants ; les modernes la compatibilité actuelle ✓ (cohérent L1/L6)
- Ne JAMAIS fusionner Prestige / Commercial / Qualité intrinsèque — 3 axes orthogonaux ✓ (L6 vs L10 vs L8)
- Genre = champ probabiliste, pas label ✓ (L7)
- Corpus en couches juridiques (domaine public = train ; modernes achetés = analyse/holdout) ✓

**Corrections que j'impose (rigueur OMEGA)** :
1. **Attribution** : « 2,958 novels » = Heuser & Le-Khac, pas Moretti (Gemini erroné).
2. **Chiffres 2030/2040** (phrases 11.1 mots, dialogue 62%…) = **matrice SYNTHÉTIQUE inventée** par Gemini (`style_data` codé en dur), **PAS des données** → illustratif seulement, à ne PAS citer comme résultat.
3. **Gradient lisse → modèle à cohortes** : L4 (Underwood) prouve que le changement est par **remplacement de générations**, pas adaptation continue. Le « gradient vectoriel » des IA doit être **réindexé sur l'année de naissance**, pas la publication.
4. **« Bord du chaos » / « E=mc² du chef-d'œuvre »** = **métaphores fécondes mais non démontrées** ; statut HYPOTHÈSE jusqu'à mesure d'entropie sur Gold-Set.
5. **« Bestseller code 80% »** = claim de livre contesté, jamais une loi.

---

## PARTIE V — DU MODÈLE AUX ÉQUATIONS (ce qu'on a le droit d'affirmer)
- On a le droit d'affirmer : **les faits L1-L10** (vérifiés, sourcés).
- On a le droit de **proposer** : le modèle thermodynamique (entropie, cohorte-saut, noyau d'influence, invariants).
- On n'a PAS le droit d'affirmer une **équation prédictive** tant qu'elle n'a pas : (a) été ajustée sur corpus réel décade-taggé, (b) **prédit une décennie tenue à l'écart** mieux que la persistance naïve, (c) sur **3 fenêtres indépendantes** (EMP-16). Toute « loi d'évolution » avant ça = HYPOTHÈSE.

---

## VERDICT
- Statut : **SYNTHÈSE LIVRÉE** — thermodynamique temporelle posée sur base vérifiée. Confiance : Haute sur les faits L1-L10 (sourcés) ; les équations restent hypothèses (par design).
- Forces : recherche mondiale réellement vérifiée (pas les URLs hallucinées) ; 2 erreurs des IA corrigées ; modèle physique opérationnalisable et **falsifiable** (test événements) ; séparation faits/hypothèses/métaphores stricte ; branché sur CHRONOS/LEGION.
- Faiblesses : (1) entropie « bord du chaos » non encore mesurée chez nous ; (2) part de marché historique = donnée faible (Partie marché non couverte par la recherche citée — à sourcer ailleurs) ; (3) modèle à cohortes exige métadonnée **année de naissance** par auteur ; (4) corpus diachronique propre (domaine public) à constituer.
- Action requise (tour de table) : lancer **LEGION-1 diachronie** sur domaine public (re-mesurer L1/L2/L3 chez nous = première preuve interne reproductible) + **test entropie « bord du chaos »** sur le Gold-Set existant (peu coûteux, falsifie/valide l'hypothèse n°2). Décision Architecte sur l'ampleur.

## SOURCES (vérifiées par recherche web, 2026-06-05)
- Hughes, Foti, Krakauer, Rockmore (2012) PNAS — [pnas.org/doi 10.1073/pnas.1115407109](https://www.pnas.org/content/109/20/7682.abstract) ; [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3356644/)
- Underwood, Kiley, Shang, Vaisey (2022) *Cohort Succession…*, Sociological Science — [sociologicalscience.com](https://sociologicalscience.com/articles-v9-8-184/)
- Heuser & Le-Khac (2012) *2,958 Nineteenth-Century British Novels*, Stanford Lit Lab Pamphlet 4 — [litlab.stanford.edu](https://litlab.stanford.edu/LiteraryLabPamphlet4.pdf)
- Muzny et al. (2017) *Dialogism in the novel*, DSH/Oxford — [academic.oup.com](https://academic.oup.com/dsh/article/32/suppl_2/ii31/3978683)
- Underwood & Sellers (2016) *The Longue Durée of Literary Prestige*, MLQ — [ideals.illinois.edu PDF](https://www.ideals.illinois.edu/items/97468/bitstreams/312522/data.pdf)
- Sobchuk & Šeļa (2024) *Computational thematics*, Humanities & Social Sciences Communications (Nature) — [nature.com](https://www.nature.com/articles/s41599-024-02933-6)
- Van Cranenburgh & Bod (2017) *A Data-Oriented Model of Literary Language*, EACL — [aclanthology.org](https://aclanthology.org/E17-1115/) ; [arXiv 1701.03329](https://arxiv.org/abs/1701.03329)
- Reagan et al. (2016) *Emotional arcs… six basic shapes*, EPJ Data Science — [arXiv 1606.07772](https://arxiv.org/abs/1606.07772)
- Archer & Jockers (2016) *The Bestseller Code* (claim grand public, contesté).
