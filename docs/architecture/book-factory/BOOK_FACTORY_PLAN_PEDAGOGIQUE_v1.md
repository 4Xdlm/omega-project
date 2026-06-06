# OMEGA Book-Factory — Le Plan, expliqué simplement (à valider par l'Architecte)

**Date** : 2026-06-05 · **Statut** : PLAN PÉDAGOGIQUE (doc-only, ZÉRO code) · **But** : que tu **recontrôles tout** — relations, entrées/sorties, fonctions — et que tu donnes ton avis. Niveau lycée, mais rigoureux.

---

## PARTIE 0 — Les 3 visions, croisées

Tu as demandé deux avis (Gemini, ChatGPT). Voici les trois (avec la mienne), et où je tranche.

| Sujet | Gemini | ChatGPT | Moi (synthèse) |
|---|---|---|---|
| Noyau canonique | canon-kernel | canon-kernel | **canon-kernel** (prouvé 284/284) ✅ accord total |
| Mensonge | relation entre rails | conclusion calculée, jamais stockée brute | **calculé, pas stocké** ✅ accord |
| Mensonge V1 / Rêve V2 | oui | oui | **oui** ✅ accord |
| Vieux canons | MUSEUM | MUSEUM doc-only | **MUSEUM doc-only** ✅ accord |
| **Quand coder P1 ?** | **GO tout de suite** | **PAS encore : d'abord un mini-test d'intégration (P0.6)** | **D'abord P0.6** (voir pourquoi) |
| Idée d'architecture en plus | — | **Event Sourcing** : 1 seul journal = vérité, le reste = vues calculées | **J'adopte l'event sourcing** (ça évite le cancer) |

**Le seul vrai désaccord = quand commencer à coder.**
- Gemini dit : « les plans sont parfaits, ouvre l'IDE. »
- ChatGPT dit : « on a prouvé que les organes marchent **séparément** ; on n'a pas prouvé que **la greffe tient**. Fais d'abord un tout petit test bout-en-bout. »

**Je tranche pour ChatGPT** — et ça colle à ta règle « on ne démarre qu'à 1000% sûr ». MAIS je réconcilie les deux : **ce mini-test d'intégration EST le premier TypeScript** que Gemini veut voir. Il est juste minuscule (1 personnage, 1 mensonge) au lieu de tout le book-planner. Si ce petit test passe → on construit. S'il casse → on n'a rien construit pour rien.

**Deuxième apport de ChatGPT que j'adopte (important)** : l'**event sourcing**. Au lieu de garder « la Bible » dans un gros fichier qu'on modifie (dangereux), on tient **un seul cahier de bord** où on écrit chaque événement dans l'ordre, sans jamais effacer. Tout le reste (qui sait quoi, l'état de l'histoire, le résumé) est **recalculé** à partir de ce cahier. Ça empêche d'avoir 5 vérités qui se contredisent.

---

## PARTIE 1 — La grande image (niveau lycée)

Imagine que pour écrire le roman, OMEGA tient **des carnets** :

1. **📕 Le carnet de la RÉALITÉ** (rail `truth`) — ce qui s'est *vraiment* passé dans l'histoire. « La clé est dans le puits. »
2. **📘 Un carnet par PERSONNAGE** (rail `interpretation`) — ce que *lui* croit. Dans la tête de Paul : « La clé est dans la chambre. » (il se trompe).
3. **📗 Le carnet du LECTEUR** — ce que *le lecteur* sait à cet instant (parfois plus que les persos : c'est ça, le suspense).

**Le douanier 🛂 (truth-gate)** : pour faire passer une note du carnet d'un personnage vers le carnet de la Réalité (« en fait c'est vrai ! »), il faut montrer une **preuve**. Pas de preuve → le douanier refuse. *(C'est l'opération `PROMOTE`, et on a prouvé qu'elle marche : 284 tests verts.)*

**Le mensonge 🎭** n'est pas une étiquette qu'on colle. C'est une **situation qu'on calcule** :
> Paul **dit tout haut** « la clé est dans la chambre » **alors que** le carnet de la Réalité dit « le puits » **et** que Paul **a vu la preuve** du puits → donc Paul **ment**.
Si Paul n'a jamais vu la preuve, il ne ment pas : il se trompe. La nuance est automatique.

**Le cahier de bord 📔 (event log)** : on n'écrit jamais directement dans les carnets. On écrit chaque **événement** dans un grand cahier, dans l'ordre, sans jamais raturer (« Chapitre 3 : Paul apprend X »). Tous les carnets sont ensuite **recalculés** à partir du cahier. Avantage : une seule source de vérité, et si l'ordi plante, on relit le cahier et on retrouve tout.

**L'antisèche 📄 (context digest)** : pour écrire le chapitre 25, on ne redonne pas les 24 chapitres au moteur (impossible, ça sature la mémoire). On lui donne une **antisèche de ≤600 mots** : un résumé glissant + l'état des persos concernés + « rappelle-toi : l'indice du chapitre 2 doit éclater ici ». C'est ce qui résout le mur mémoire (VRAM).

---

## PARTIE 2 — L'architecture : 1 source de vérité, plein de vues

```
                 ┌───────────────────────────────────────────┐
                 │   📔 CAHIER DE BORD  (CanonEventLog)        │
                 │   append-only · jamais effacé · hash-chaîné │
                 │   = LA SEULE SOURCE DE VÉRITÉ               │
                 └───────────────┬───────────────────────────┘
                                 │  (on relit le cahier et on calcule…)
        ┌────────────────┬───────┴────────┬────────────────┬─────────────────┐
        ▼                ▼                ▼                ▼                 ▼
  📕 TruthState    📘 BeliefState    📗 ReaderState   🧩 StoryState     📄 ContextDigest
  (la réalité)     (par personnage)  (ce que sait     (persos/lieux/    (l'antisèche
                                       le lecteur)      intrigue/graines) ≤600 mots)
        └──────────── tous ces carnets sont des VUES CALCULÉES, pas des stocks ───────┘
                                 │
                                 ▼
                       🎭 Mensonge = fonction( BeliefState , TruthState , accès )
                       🛂 Cohérence = continuity-oracle( ces vues )
```

**Règle d'or (anti-cancer)** : il n'y a **qu'un seul endroit** où la vérité est écrite (le cahier). Tout le reste se **recalcule**. On ne crée **jamais** un 2ᵉ stock de vérité. *(C'est ça qui a failli mal tourner : le repo a déjà 4 « canons » concurrents — on n'en ajoute pas un 5ᵉ.)*

---

## PARTIE 3 — Les briques : ce qu'on réutilise, ce qu'on crée

| Brique | Rôle | On fait quoi ? |
|---|---|---|
| `canon-kernel` (rails truth/interpretation + PROMOTE) | le cahier de bord + le douanier | **RÉUTILISER** (prouvé) — juste le « réveiller » |
| `truth-gate` (package) | le douanier qui exige une preuve | **RÉACTIVER** (dort, mais 217 tests verts) |
| `genesis-planner` (Subtext: character_thinks/reader_knows) | déjà l'asymétrie d'info **par scène** | **ÉTENDRE** → carnets persistants par perso |
| `creation-pipeline` (K2+DUEL+Oracle) | écrit UN chapitre (la prose) | **RÉUTILISER intact** |
| `gateway/memory` (digest/snapshot) | fabrique l'antisèche, sauvegarde | **ADAPTER** (via traducteur, sans le modifier) |
| **CharacterKnowledgeGraph** | les carnets par personnage (qui sait/croit/ment) | **NOUVEAU** — mais c'est une **vue calculée**, pas un stock |
| **book-planner** | découpe 60k → ~30 chapitres + rythme + indices | **NOUVEAU** (mince, au-dessus de genesis) |
| **book-orchestrator** | la boucle qui enchaîne les 30 chapitres | **NOUVEAU** (suit le plan fractal déjà scellé DEC-20260325-001) |
| **adapter (ACL)** | traduit entre le neuf et l'ancien sans rien casser | **NOUVEAU** (couche fine) |

**Ce qui est vraiment neuf = très peu** : 3 « vues calculées » (knowledge graph, story-state, context digest), 1 planificateur, 1 boucle, 1 traducteur. Tout le cœur dur (vérité, douanier, prose) **existe déjà et est testé**.

---

## PARTIE 4 — Le fonctionnement, fonction par fonction (entrée → sortie → qui l'appelle)

C'est la partie que tu veux pour **vérifier les relations, les sorties et les fonctions**.

### Le flux pour UN chapitre (répété ~30 fois)
```
ChapterSpec ──▶ [context-manager] ──▶ antisèche ≤600 mots
                                          │
                                          ▼
                                   [genesis-planner] ──▶ plan de scènes (subtext: qui sait quoi)
                                          │
                                          ▼
                                   [creation-pipeline] ──▶ PROSE du chapitre
                                          │
                                          ▼
                                   [extractor] ──▶ ÉVÉNEMENTS (faits→rail truth, croyances→rail perso)
                                          │
                                          ▼
                                   [log.append] ──▶ cahier de bord grandit (jamais effacé)
                                          │
                                          ▼
                              [projections recalculées] ──▶ carnets à jour (réalité, persos, lecteur)
                                          │
                                          ▼
                                   [continuity-oracle] ──▶ verdict : cohérent ? indice OVERDUE ? mensonge logique ?
                                          │
                         ┌────────────────┴───────────────┐
                         ▼ PASS                            ▼ FAIL
                   chapitre scellé + snapshot        on RÉ-écrit le chapitre (retry)
```

### Tableau des fonctions (le contrat à vérifier)
| Fonction | Entrée | Sortie | Appelée par |
|---|---|---|---|
| `book-planner.plan` | BookIntent (pitch 60k, genre, persos) | BookPlan (≈30 ChapterSpec + courbe de rythme + calendrier d'indices) | orchestrateur (1 fois) |
| `context-manager.build` | cahier de bord + BookPlan + n° chapitre | Antisèche ≤600 mots (résumé + état utile + indices à récolter) | orchestrateur (chaque chapitre) |
| `genesis-planner.plan` | ChapterSpec + antisèche | Plan de scènes (beats, subtext, qui sait quoi) | orchestrateur |
| `creation-pipeline.forge` | Plan de scènes | Prose du chapitre (K2 + DUEL + Oracle + R6) | orchestrateur |
| `extractor.extract` | Prose + plan | Liste d'ÉVÉNEMENTS canoniques (rail truth / rail perso + preuves) | orchestrateur |
| `log.append` | Événements | Nouveau cahier (append-only, hash-chaîné) | orchestrateur |
| `projections.compute` | cahier de bord | TruthState, BeliefState(par perso), ReaderState, StoryState | continuity + context |
| `lie` | BeliefState + TruthState + accès du perso | vrai/faux (« ment ») | knowledge graph |
| `continuity-oracle.check` | les vues + ChapterSpec | verdict PASS / RETRY (contradiction, indice oublié, mensonge incohérent) | orchestrateur |
| `snapshot` | cahier de bord | sauvegarde (reprise si crash) | orchestrateur |

**Tu peux contrôler chaque ligne** : l'entrée, ce qui sort, qui appelle. Si une sortie te paraît fausse, on la teste isolément.

---

## PARTIE 5 — Comment on VÉRIFIE que c'est vrai (et pas du vent)

C'est le cœur de ta doctrine. **On ne croit rien sans test.**

### Déjà prouvé (P0.5)
- `canon-kernel` 67/67 tests verts, `truth-gate` 217/217 verts → **le cahier + le douanier marchent**.
- Recherche exhaustive : **personne** n'appelle ces rails en prod → ils sont **endormis** (à réveiller proprement).

### À prouver AVANT de construire l'usine (le fameux P0.6 de ChatGPT)
Un **mini-scénario** minuscule, 1 personnage, pour prouver que **la greffe tient** :
```
Chapitre 1 : Réalité = « la clé est dans le puits ».
             Paul croit « la clé est dans la chambre ».
   ✅ attendu : Paul a une CROYANCE fausse, ce n'est PAS encore un fait.
Chapitre 2 : Paul dit « la clé est dans la chambre ». Le lecteur, lui, sait la vérité.
   ✅ attendu : PAS un mensonge (Paul n'a pas vu la preuve) + le lecteur détecte l'ironie.
Le douanier : on tente de PROMOUVOIR « chambre » en vérité SANS preuve.
   ✅ attendu : REFUSÉ.
Chapitre 3 : Paul trouve la preuve (le puits).
   ✅ attendu : sa croyance se met à jour, il SAIT.
Chapitre 4 : Paul redit « la clé est dans la chambre ».
   ✅ attendu : MAINTENANT c'est un MENSONGE (il sait et dit le contraire).
```
Si ce mini-test passe → la mécanique vérité/croyance/preuve/mensonge fonctionne **bout-en-bout**. **Alors** on construit le book-planner et le reste. S'il casse → on s'arrête, on corrige, on ne construit rien.

### Les 4 lois physiques (à garder en tête)
1. **Aucune vérité sans preuve** (PROMOTE exige une evidence).
2. **Aucune croyance promue sans transition** (on passe par le douanier).
3. **Aucun mensonge sans acteur** (toujours « qui ment », jamais en l'air).
4. **Aucune continuité sans projection** (on vérifie sur les vues recalculées, pas à l'œil).

---

## PARTIE 6 — Le plan par étapes, avec barrières GO/NO-GO

| Étape | Ce qu'on fait | On passe à la suite SEULEMENT si… |
|---|---|---|
| ✅ **P0.5** (fait) | prouver que le noyau marche | 284/284 verts ✔ |
| **P0.6** (proposé) | mini-scénario d'intégration (1 perso, le mensonge) + 1er adapter | le mini-scénario passe en vert |
| **P1** | `story-state` (vue) + `book-planner`, **testables sans LLM** | tests CALC verts + pas de régression |
| **P2** | brancher 3 chapitres réels (repeat-shadow actif) | 3 chapitres cohérents, pas de bégaiement |
| **P3** | context-manager sur 10 chapitres | mémoire tient, indices récoltés |
| **P4** | livre 60k complet | cohérence + lisibilité mesurées (Deux Clés) |

À **chaque** barrière : si le moindre doute → on contrôle, on ne passe pas.

---

## PARTIE 7 — Ce que je te demande de valider (donne ton avis)

1. **Architecture « 1 cahier + des vues calculées » (event sourcing)** : OK pour toi ? *(c'est l'apport de ChatGPT que je trouve juste — ça empêche les vérités concurrentes.)*
2. **On code d'abord le mini-test P0.6** (1 perso, 1 mensonge) **avant** le book-planner ? *(ma reco ; Gemini voulait foncer, mais ça reste plus sûr, et c'est quand même du vrai TypeScript.)*
3. **canon-kernel = noyau unique**, et autorisation de **marquer MUSEUM** (en doc, sans rien supprimer) les vieux canons/gates ?
4. **Périmètre V1 = mensonge inclus**, rêve/hallucination repoussé en V2 ?
5. Le **tableau des fonctions (Partie 4)** te convient-il, ou tu veux changer une entrée/sortie ?

Dès que tu as donné ton avis sur ces 5 points, je lance **uniquement** ce que tu as validé. Tant que tu n'as pas tranché → zéro code.

---

## VERDICT
- **Statut : PLAN PÉDAGOGIQUE LIVRÉ.** Confiance : Haute (fondé sur P0.5 prouvé + croisement 3 visions).
- **Forces** : (1) explique tout avec des images simples mais reste exact ; (2) montre les relations/entrées/sorties/fonctions pour que tu contrôles ; (3) adopte l'event sourcing (anti-doublon) ; (4) réconcilie Gemini (du code) et ChatGPT (prudence) via le mini-test P0.6 ; (5) chaque étape a une barrière GO/NO-GO.
- **Faiblesses** : (1) l'extracteur prose→événements reste la pièce la plus risquée (un fait raté = mensonge fantôme) → CALC d'abord, LLM calibré EMP-19 ensuite ; (2) le coût/temps réel d'un livre 60k n'est pas chiffré ; (3) « event sourcing » ajoute une étape de recalcul (perf à surveiller) ; (4) je décris des fonctions cibles : leurs signatures exactes restent à geler au P0.6.
- **Risques restants** : si tu valides « foncer » plutôt que P0.6, on prend le risque d'intégration non prouvé.
- **Action requise** : ton avis sur les **5 points de la Partie 7**. Ensuite seulement, code.
