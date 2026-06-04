# ARCHIVE — Fil « Variation du style littéraire dans le temps » (pièce de travail)

**Date** : 2026-06-05 · **Nature** : archive de discussion (Architecte ↔ Claude ↔ Tribunal ChatGPT/Gemini) · **Statut** : pièce de travail scellée, support du tour de table. Branche `phase-r-dispatcher-v33`.

## 0. D'où est née l'idée
Après l'échec dimensionné de la forge sémantique (N8) et la preuve technique du LoRA 31B (PASS_31B), le constat du **plafond auto-référentiel** (toute donnée issue d'OMEGA plafonne au meilleur OMEGA) + **mur copyright** a fait émerger une question plus profonde de l'Architecte : **comprendre la PHYSIQUE de l'évolution de la prose dans le temps** — formes par époque, réception (institutions + public), influences entre générations d'auteurs, ce qui change vs ce qui reste — pour en tirer des **équations d'évolution** vérifiées par les grands événements (guerres, ruptures média). Objectif : un **outil de mesure monstrueux à vecteurs indépendants** (pour ne pas se noyer) + calcul de **toutes les corrélations/interconnectivités**.

## 1. Ce que l'Architecte a demandé (verbatim condensé)
- Classer le corpus par **décennies** et par **style**.
- Connaître la **part de marché approximative** de chaque livre à son époque.
- Savoir s'il fut **primé** ou **utilisé comme base** (canon).
- Cartographier les **relations/influences** entre auteurs et leurs prédécesseurs (les « mains » qui guident les nouvelles).
- Comprendre **ce qui est resté** : comment syntaxe, style, rythme, description ont changé/évolué.
- En tirer des **équations et opérations math/physiques de probabilité d'évolution**.
- **Intégrer les grands événements** (guerres, catastrophes) pour vérifier.
- Construire l'**outil de mesure** à **vecteurs indépendants**.
- Calculer **toutes les corrélations** et interconnectivités.
- Recherche mondiale poussée, freins débloqués, croiser ChatGPT + Gemini → **sortir la « thermodynamique temporelle de la variation stylistique et syntaxique de la prose »**.

## 2. Ce que la recherche mondiale (VÉRIFIÉE) a confirmé — 10 lois
(Détail + sources dans `LEGION_THERMODYNAMIQUE_TEMPORELLE_PROSE.md`.) Résumé :
- **L1 Concrétisation** (telling→showing) — Heuser & Le-Khac 2012 (⚠️ PAS Moretti).
- **L2 Dialogisme ↑** — Muzny 2017 (+1 citation/1000 mots/25 ans).
- **L3 Phrases ↓** — COHA/divers (rapporté).
- **L4 Succession des cohortes** — Underwood 2022 : 54.7% de la variance temporelle mieux expliquée par l'**année de naissance** que la publication ; l'auteur se fige tôt. *Le style change par REMPLACEMENT de générations.*
- **L5 « Style of a time » + décroissance accélérée de l'influence** — Hughes et al. PNAS 2012.
- **L6 Prestige stable / dérive lente** — Underwood & Sellers 2016.
- **L7 Genre = champ flou** — Sobchuk & Šeļa 2024 (valide notre échec genre LOAO V4-G4).
- **L8 Littérarité ~76% mesurable** — Van Cranenburgh & Bod 2017.
- **L9 6 arcs émotionnels** — Reagan et al. 2016.
- **L10 Bestseller-code 80% CONTESTÉ** — Archer & Jockers 2016.

## 3. Le modèle « thermodynamique » OMEGA (hypothèses marquées)
- **Entropie / bord du chaos** : pulp = basse entropie (prévisible), salade lexicale = entropie max (bruit), **maître = bord du chaos** (imprévisible mais syntaxe de fer). HYPOTHÈSE testable.
- **Gradient par CHOCS de cohortes** (réindexé sur année de naissance, pas publication) — corrige le « gradient lisse » des deux IA.
- **Noyau d'influence à demi-vie décroissante** (L5).
- **Invariants conservés vs formes d'époque** (le cœur : nécessité/voix/tension/densité conservés ; longueur/dialogue/concrétude varient).
- **Vérification par l'Histoire** : test de rupture (change-point) aligné aux guerres = juge de paix.

## 4. Corrections imposées aux Tribunaux (intégrité)
1. « 2 958 romans » = **Heuser & Le-Khac**, pas Moretti.
2. Projections **2030/2040** des IA = **matrice synthétique inventée à la main** (Gemini `style_data` codé en dur) → **zéro valeur empirique**.
3. Le « gradient vectoriel » lisse doit devenir un **modèle à cohortes** (L4).
4. « Bord du chaos » / « E=mc² du chef-d'œuvre » = **métaphores non démontrées**.
5. « Bestseller code 80% » = claim contesté, jamais une loi.

## 5. Position consensuelle des 3 IA (tour de table)
- **GO** thermodynamique comme **modèle testable** (pas philosophie décorative).
- **GO** prochain pas falsifiable et quasi-gratuit : **LEGION-E0 test « bord du chaos »** (entropie Gold-Set maîtres vs pulp vs OMEGA) + **LEGION-1 diachronie** domaine public (re-mesurer L1/L2/L3 chez nous, indexer publication ET naissance).
- **HOLD** : tout entraînement massif, LoRA brut, DPO non curé, classifieur genre relancé, prédiction 2030/2040, score unique de grandeur.
- Règle dure : **aucune équation d'évolution affirmée sans holdout temporel × 3 fenêtres (EMP-16).**

## 6. Plan CHRONOS / LEGION (référence)
Architecture complète dans `PROSE_EVOLUTION_PHYSICS_ATTACK_PLAN.md` (OMEGA-CHRONOS) : couche données (fiche d'identité + droits), batterie de mesure F1-F12 décorrélée (anti-noyade), 3 axes réception orthogonaux (prestige/public/institutionnel), couche temporelle (centroïdes→gradient cohorte), graphe d'influence, couche événements, réacteur de corrélation (matrice+partielle+VIF+réseau+facteurs+lead-lag, LOAO), équations candidates (gradient/diffusion/Markov), phasage R0-R7.
Ordre LEGION arbitré (ChatGPT) : **E0 bord-du-chaos → 1 diachronie → 2 mycélium influence → puis seulement stratégie LoRA/DPO.**

## VERDICT
- Statut : ARCHIVE COMPLÈTE du fil style-évolution. Confiance : Haute (faits vérifiés + positions tracées).
- Forces : capture intuition Architecte + recherche vérifiée + modèle + corrections + consensus + plan.
- Faiblesses : part de marché historique = donnée faible (à sourcer hors recherche citée) ; modèle = hypothèses à tester.
- Action : exécuter LEGION-E0 (quasi-gratuit, falsifiable) au prochain GO.
