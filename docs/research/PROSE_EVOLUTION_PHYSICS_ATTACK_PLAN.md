# OMEGA-CHRONOS — Physique de l'évolution de la prose (plan d'attaque)

**Date** : 2026-06-04 · **Statut** : PLAN DE BATAILLE (design, doc-only) · **Origine** : directive Architecte — rétro-ingénierie de l'ADN de l'esthétique littéraire à travers les décennies, ses formes, sa réception (institutions + public), ses influences, et l'extraction d'**équations d'évolution** vérifiées par les grands événements. Standard OMEGA : mécanisme, limites, EMP-16/18/19, copyright strict, honnêteté de disponibilité des données.

> Phrase-cap : **on ne mesure pas « ce qui est bon » ; on mesure ce qui CHANGE, ce qui RESTE, ce que chaque époque RÉCOMPENSE, et la VITESSE à laquelle la forme se déplace.**

---

## 0. Principe directeur — ne pas se noyer
Le risque n°1 d'un « outil de mesure monstrueux » est la **noyade** : 200 features corrélées entre elles = bruit. La parade est doctrinale : **vecteurs indépendants**. On organise toute mesure en **familles orthogonalisées** (chacune réduite à ses composantes principales), puis une 2ᵉ réduction inter-familles. On ne garde que des **axes décorrélés** (VIF bas, EMP-18 LOAO). La « monstruosité » est dans la COUVERTURE (tout mesurer), pas dans le nombre de colonnes finales (peu, indépendantes, interprétables).

---

## 1. Couche DONNÉES — la fiche d'identité de chaque œuvre
Schéma metadata par œuvre (`work_id`) :
- **Identité** : auteur, année, décennie, langue, pays, genre, sous-genre, longueur.
- **Droits** (cardinal) : `public_domain` / `acheté_moderne` / `OMEGA` / `traduction_protégée`. → gouverne l'usage (training vs analyse-seule).
- **Style-tags** : réalisme, naturalisme, modernisme, nouveau roman, minimalisme, autofiction, polar, SF, feel-good… (multi-label).
- **Prestige** : prix (Nobel, Goncourt, Booker, Pulitzer, Femina, Renaudot, Médicis…), nominations, date.
- **Réception publique / part de marché** : ⚠️ **donnée la plus faible** (cf §3) — proxies : tirages, nombre d'éditions/rééditions, traductions, présence bibliothèques (WorldCat), fréquence Google Books Ngrams, longévité.
- **Usage institutionnel** : présence programmes scolaires/universitaires, citations critiques → « utilisé comme base ».
- **Influences déclarées** : prédécesseurs cités (préfaces, correspondances, critique) → graphe (§5).

**Tiers de confiance des données** : T1 fiable (texte, prix, dates, langue), T2 reconstructible (éditions, Ngrams, curricula), T3 proxy/incertain (part de marché historique, influence subjective). **Chaque valeur balisée par son tier** (SSOT). Jamais inventer un % de marché.

---

## 2. Couche MESURE — la batterie (familles de vecteurs indépendants)
Chaque famille = extracteur **CALC déterministe** (réutilise les capteurs OMEGA existants + bge-m3 ; LLM seulement si calibré EMP-19). Familles candidates :

| # | Famille | Exemples de features | Mesure |
|---|---|---|---|
| F1 | **Structure** | longueur phrase (μ, σ, distribution), longueur paragraphe, profondeur de subordination | CALC |
| F2 | **Rythme/prosodie** | variance longueur phrase, densité virgules/points, cadence, ruptures | CALC |
| F3 | **Lexique** | TTR, rareté bigrammes, taux mots rares, archaïsmes, néologismes, abstrait/concret | CALC |
| F4 | **Syntaxe** | distribution POS, temps/mode verbaux, voix active/passive, nominalisation, connecteurs | CALC (spaCy/POS) |
| F5 | **Densité sémantique** | information/mot, compression, redondance | CALC |
| F6 | **Sensoriel (VAKOG)** | body_binding, concreteness | capteurs OMEGA existants |
| F7 | **Intériorité** | verbes mentaux, discours indirect libre, posture du narrateur | CALC + calibré |
| F8 | **Dialogue** | ratio dialogue/narration, longueur des tours, style des incises | CALC |
| F9 | **Imagerie** | densité métaphore/comparaison, nécessité de l'image | CALC + calibré |
| F10 | **Tension/pacing** | ratio scène/sommaire, marqueurs de conflit | CALC + calibré |
| F11 | **Voix/idiolecte** | singularité = distance au centroïde de l'époque | géométrique |
| F12 | **Géométrique** | coordonnées embedding bge-m3, radars maître/pulp/époque | bge-m3 |

**Décorrélation** : par famille → PCA → top composantes ; puis réduction inter-familles. Sortie = **~10-20 axes indépendants** (pas 200 colonnes). Contrôle VIF + LOAO (EMP-18) obligatoire.

**Invariants vs formes d'époque** (séparation clé) :
- **Formes d'époque** (varient) : longueur phrase, % dialogue, vocabulaire, intériorité, place du narrateur.
- **Invariants de grandeur** (persistent) : nécessité de chaque phrase, force de voix, tension interne, précision de perception, densité de sens, cohérence du monde.
- Test : quelles features ont une **variance temporelle élevée** (formes) vs **stables + corrélées au prestige cross-époque** (invariants) ?

---

## 3. Couche RÉCEPTION — 3 axes orthogonaux (+ contexte)
Ne JAMAIS réduire à « bon ». Trois axes distincts + un quatrième contextuel :
- **A-PRESTIGE** : prix + nominations + reconnaissance critique (sourçable T1/T2 : listes Nobel/Goncourt/Booker/Pulitzer).
- **B-PUBLIC/COMMERCIAL** : part de marché / ventes — **T3 proxy** (éditions, tirages, Ngrams, traductions, longévité). Honnêteté : pré-1950 quasi absent en ventes ; pré-1900 ≈ proxies seuls.
- **C-INSTITUTIONNEL** : présence scolaire/universitaire, canon, « utilisé comme base » (T2 : programmes, anthologies).
- **D-CONTEXTE** : événements exogènes (§6).

Chaque œuvre reçoit un score sur A, B, C indépendamment. On corrèle ENSUITE forme × chaque axe, par décennie.

---

## 4. Couche TEMPORELLE — centroïdes, gradient, dynamique
- **Centroïde** par (décennie × style × langue) dans l'espace des axes indépendants (§2).
- **Trajectoire** : ligne reliant les centroïdes 1850→1900→…→2020 = **vecteur de vélocité stylistique** (gradient) ; dérivée seconde = accélération.
- **Dynamique (physique)** : modéliser l'espace-style comme un **système dynamique** — dérive-diffusion (SDE), attracteurs (les styles « stables »), transitions de phase (ruptures), Markov inter-états par décennie.
- **Prédiction (humble)** : extrapoler la **fluidité de forme** future (ex. « la tolérance aux phrases >40 mots baisse de X%/décennie », « besoin de chocs lexicaux ↑ »). **PAS** prédire le contenu ni le prochain chef-d'œuvre. Bandes d'incertitude obligatoires.

---

## 5. Couche INFLUENCE — le graphe des mains
- Graphe orienté **auteur → prédécesseurs** (influences déclarées + plus-proche-voisin stylistique cross-temps dans l'espace vectoriel).
- Mesures : lignées, propagation d'influence, « pull » d'une génération vers ses influences (le centroïde de gen N se déplace-t-il VERS ses influences déclarées ?), nœuds-pivots (auteurs charnières).
- Vérifie l'intuition Architecte : comprendre « les influences qui ont guidé les nouvelles mains à chaque fois ».

---

## 6. Couche ÉVÉNEMENTS — vérification par l'Histoire
Covariables exogènes alignées sur la timeline : **guerres** (1870, WWI 1914-18, WWII 1939-45), **catastrophes**, **ruptures techno-médiatiques** (démocratisation imprimé, radio, cinéma, TV, internet, smartphone, **standardisation « Netflix/TikTok »**), socio-économie.
- **Test de rupture** (change-point detection) : la vélocité stylistique montre-t-elle des **breaks** alignés sur les événements connus ? (ex. rupture moderniste post-WWI, oralité/rythme post-WWII chez Céline).
- C'est la **vérification empirique** du modèle : si les équations « voient » les guerres sans qu'on les leur dise, le modèle capte une vraie physique.

---

## 7. Couche CORRÉLATION & INTERCONNECTIVITÉ — le réacteur
« Calculer absolument toutes les corrélations » — discipliné pour ne pas se noyer :
1. **Matrice de corrélation** (Spearman) features × réception × temps.
2. **Corrélations partielles** (contrôler décennie/genre/langue) — isole les liens réels des confonds temporels.
3. **VIF + factor analysis/PCA** : trouver les **axes latents indépendants** (la vraie dimensionnalité — peut-être 5-8 facteurs sous 200 mesures).
4. **Graphe réseau** : nœuds = mesures, arêtes = corrélations significatives (post-correction multiple, FDR) → topologie des interconnexions.
5. **Temporel** : lead-lag / Granger (une feature en précède-t-elle une autre d'une décennie ?), information mutuelle (non-linéaire).
6. **Honnêteté** : bootstrap clusterisé par AUTEUR (EMP-18 LOAO), permutation au niveau auteur, IC95. Aucune corrélation centroïde sans LOAO (piège fuite de données déjà vécu V4-G4).

---

## 8. Couche ÉQUATIONS — modèles candidats (HYPOTHÈSES jusqu'à validation)
- **E1 Gradient** : `style(t+Δ) ≈ style(t) + v·Δ` (vélocité du centroïde) + bruit.
- **E2 Influence-pull** : `Δstyle_genN = α·(influences) + β·(événements) + ε`.
- **E3 Diffusion** : SDE drift-diffusion dans l'espace-style (attracteurs = canons stables).
- **E4 Markov** : transitions probabilistes entre états-style par décennie.
- **Validation (EMP-16, 3 preuves)** : entraîner sur décennies ≤ N, **prédire N+1**, mesurer l'erreur ; répéter sur 3 fenêtres indépendantes ; un modèle qui ne bat pas la persistance naïve = REJETÉ.

---

## 9. Phasage R0→R7 (programme, pas une nuit)
| Phase | Livrable | Dépend de |
|---|---|---|
| **R0** | Inventaire corpus + schéma metadata + classification droits (fiche d'identité) | corpus existant |
| **R1** | Corpus rangé décennie × style × langue + audit de disponibilité des données (T1/T2/T3) | R0 |
| **R2** | Batterie de mesure v1 (familles F1-F12, CALC, LOAO-safe, décorrélée) | R1 |
| **R3** | Sourcing réception : prix (T1), Ngrams/éditions/curricula (T2), part-marché proxy (T3) | R1 |
| **R4** | Graphe d'influence | R1+R2 |
| **R5** | Réacteur corrélation/interconnectivité (matrice + partielle + VIF + réseau + facteurs + lead-lag) | R2+R3 |
| **R6** | Gradient temporel + alignement événements (change-points) + équations candidates | R5 |
| **R7** | Validation prédictive (holdout décennie) + rapport + verdict | R6 |

**Réutilisable** : skill `corpus-stats-bench` (Ridge/Spearman/VIF/CV), capteurs OMEGA, bge-m3, Google Books Ngrams (public), listes de prix (web). Outillage data-science Python (pandas/sklearn/statsmodels/networkx) dans l'env dédié.

---

## 10. Garde-fous (non négociables)
- **Copyright** : entraînement = domaine public uniquement ; modernes achetés = **features/analyse/holdout SEULEMENT**, jamais raw training. Aucun texte protégé reproduit au repo.
- **Honnêteté données** : part de marché historique = T3 proxy, balisée, jamais inventée. Si une donnée manque → expliciter l'incertitude.
- **EMP-18** : toute métrique à centroïde évaluée en LOAO/LOFO (auteur/famille). Fuite full-data = score nul.
- **EMP-16** : équation prédictive = 3 fenêtres indépendantes convergentes, sinon hypothèse non adoptée.
- **EMP-19** : tout extracteur LLM (intériorité/imagerie/tension) calibré ; CALC préféré.
- **Anti-noyade** : familles orthogonalisées → axes indépendants ; on rapporte peu de dimensions interprétables, pas 200 colonnes.
- **Humilité prédictive** : on modélise des TRAJECTOIRES de forme et des signaux de compatibilité d'époque ; on ne prédit ni le contenu ni le prochain chef-d'œuvre.

## VERDICT
- Statut : PLAN (doc-only, prêt pour arbitrage tour de table). Confiance : Haute sur la faisabilité méthodo (R0-R2, R5) ; Moyenne sur R3 (part-marché historique = données faibles) et R6-R7 (prédiction = ambitieuse, à valider).
- Forces : couvre toute la vision Architecte (décennies, styles, marché, prix, influences, invariants, événements, équations) ; discipline anti-noyade (vecteurs indépendants) ; copyright + EMP intégrés ; phasage exécutable ; réutilise l'arsenal OMEGA.
- Faiblesses : (1) part de marché historique = proxy faible (honnêteté requise) ; (2) influence = part subjective ; (3) prédiction de style = bornée à la forme ; (4) programme long (semaines-mois), pas une session ; (5) extracteurs syntaxe FR (spaCy) à valider.
- Action requise : **arbitrage tour de table** — lancer R0 (inventaire + fiche d'identité + classification droits, 100% autonome et sûr) en premier ? Et trancher l'ampleur (R0-R2 socle vs programme complet R0-R7). Décision Architecte.
