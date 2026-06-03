# OMEGA S1 — SYNTHÈSE DES CONCLUSIONS (pour IA externes : ChatGPT + Gemini)

**Date** : 2026-06-02 · **Auteur** : Claude Code (IA Principal OMEGA) · **Objet** : consolider les conclusions S1D + ancre littérature mondiale + design S1E, en intégrant vos retours, pour votre jugement.

---

## 1. CE QUI EST PROUVÉ (S1D — Choc des Titans, Gold-Set v4 scellé 4388b4b6, 480 jugements pairwise double-ordre)

| Instrument | FR M vs D_réel | FR M vs C | EN M vs C | Biais position |
|---|---|---|---|---|
| Embeddings `nomic` (AUC, K-fold/auteur) | 0.84 [0.55,0.91] | 0.82 [0.56,0.92] | 0.86 [0.63,0.96] | n/a (géométrie) |
| `qwen3:32b` (pairwise win_rate) | 0.76 | 0.75 | 0.84 | **0.64–0.75 → DISQUALIFIÉ** |
| `gemma4:31b` indépendant (win_rate) | **0.99** | **1.00** | **1.00** | 0.50–0.51 (sain) |

**Conclusions fermes** :
- `qwen3` **disqualifié** comme juge de qualité (biais de position massif — il choisit la position, pas le texte).
- `gemma4` = **meilleur discriminateur, non biaisé en position**, MAIS **non validé comme juge de qualité** (voir §2).
- `nomic` = **signal réel, non-circulaire, FR-robuste**, mais IC large (n=16-18 auteurs/cellule) → non scellable, et **lui aussi suspect de confond d'époque** (un vecteur 1850 ≠ 2024 par le vocabulaire).
- **PASS mesure, PAS PASS interprétation-qualité.** Aucun pivot, aucun gate, aucun SEAL.

## 2. LE PROBLÈME CENTRAL : 0.99-1.00 EST SUSPECT (confond)

Le contraste actuel est **confondu** : maîtres = canon surtout **ancien** (Flaubert/Hugo/Proust 19e-début 20e) vs pulp **moderne** (Thilliez/Musso 21e). Un score quasi parfait peut mesurer **l'époque/le genre/le canon/la source**, pas la qualité.

**Confirmation par l'état de l'art mondial** (recherche faite) :
- Discrimination qualité/canonicité littéraire : **ordre de grandeur réaliste ~0.70-0.80** — Underwood & Sellers ~75% ; canonicité française (Cultural Analytics) 70-74% ; van Cranenburgh & Bod (61% à 76% de variance selon le cadrage) ; RF 77% F1. **Personne ne prouve ~1.0.**
- **Correction adoptée (ChatGPT)** : ce **n'est PAS un « plafond universel fixe »** — ces études mesurent des objets DIFFÉRENTS (prestige, canonicité, ratings humains, succès commercial), langues et métriques distinctes. C'est un **ordre de grandeur + un signal d'alarme** : tout score OMEGA ~1.0 sur corpus confondu = **suspect**, pas une constante physique.
- **Stylométrie (Burrows Delta)** : très puissante pour identifier auteur/époque/style → renforce le risque qu'un « succès de juge » vienne de l'auteur/époque/genre, pas de la qualité.
- **Prestige historiquement contingent (Underwood)** : les critères de réception changent avec le temps → comparer canon ancien vs commercial moderne est méthodologiquement fragile.
- **Commercial (Archer & Jockers ~80%, Ashok)** : prédire le best-seller par le style est viable, MAIS = marché, **jamais** qualité. À garder sur l'axe OBJ1bis séparé.
- **Goodreads/avis publics** : biais de visibilité + chambre d'écho (tri algorithmique) → signal externe utile, **jamais vérité brute**.

## 3. CE QUE NOS RÉSULTATS HISTORIQUES VALIDENT (croisement EMP-17)
- **Densité sensorielle anti-corrélée à la qualité des maîtres** (notre R2.3 : maîtres 17.6 < best 20.9 < pulp 30.2) — cohérent avec le clivage stylométrique « action/sensoriel = populaire » vs « abstraction/conceptuel = haute littérature ». → notre bascule densité→axe commercial (DEC-016) est soutenue.
- **Abandon du score absolu 0-100 pour le pairwise** — cohérent avec le tournant « perspectiviste » (la qualité absolue n'existe pas, seulement par contraste/panel).
- **2 mesures historiques borderline à reprendre** (H-CROSS-02 mélancolie×subordination p=0.061 ; H-PCA-01 émotion-PCA Δ+0.034) — pas enterrées.

## 4. S1E — BATTERIE ANTI-CONFOUND (design verrouillé, fusion des 3 IA)

**Question reformulée** : non pas « gemma sépare-t-il maître/bas ? » mais **« gemma sépare-t-il encore la qualité quand époque, genre, canon, source, format sont neutralisés ? »**

**Tests** (gemma4 **ET** embeddings ; challenger embedding `bge-m3`/`e5-multilingual` si dispo) :
1. **MODERN_vs_MODERN** (prioritaire) : maîtres modernes (Ernaux, Modiano, Le Clézio, Quignard, Duras + holdout Carrère/McCarthy/Morrison/Rulfo) vs pulp/commercial moderne (Musso, Thilliez, Bussi, Chattam…).
2. **OLD_vs_OLD** : maîtres anciens vs populaire/genre ancien (Féval, feuilleton) — sinon `EVIDENCE_GAP_OLD_LOW_CORPUS`.
3. **SAME_ERA / SAME_GENRE** (le plus dur, le plus important) : littéraire vs commercial dans le même genre+époque (polar littéraire vs polar commercial…).
4. **SOURCE_BLIND / FORMAT_BLIND** (**PRÉ-REQUIS absolu**) : retirer titre/auteur/date/genre/chapitres/front-matter/notes/en-tête Gutenberg ; normaliser guillemets/espaces/paragraphes. Empêche le juge de lire l'emballage / régurgiter la réputation Wikipédia.
5. **NEGATIVE_CONTROLS** : master-vs-master, pulp-vs-pulp, même auteur, même livre, labels randomisés. Un juge sain doit produire des **tie/incertitude** — pas toujours un gagnant confiant.
6. **CANON_RECOGNITION_RISK** : extraits très célèbres vs peu reconnaissables du même auteur. Si gemma est parfait sur les célèbres et chute sur les obscurs → il **reconnaît le canon** plus qu'il ne juge.
7. **STYLE_TRANSPLANT / ADVERSARIAL** : pulp archaïsé, maître modernisé/simplifié, commercial « nettoyé ». Si le juge suit le **vernis** stylistique → il juge la surface.

**Métriques par test** : win_rate/AUC · IC95 bootstrap **par auteur** · permutation · position_bias · **tie_rate** · confidence · **matrice de confond par paire** (`era_distance`, `genre_distance`, `source_distance`, `canon_fame_distance`, `author_recognition_risk`, `register_distance`, `format_artifact_risk`) · taxonomie d'erreurs · matrice de désaccord gemma↔embeddings.
**Test diagnostic clé** : *la performance augmente-t-elle quand la distance de confond augmente ?* Si oui → le juge mesure le raccourci.

## 5. CRITÈRES (recalibrés — pas de seuil magique)
Zone réaliste : 0.65-0.70 = faible/modéré ; **0.70-0.80 = signal sérieux** ; 0.80-0.90 = très fort ; **>0.95 sur corpus non parfaitement contrôlé = suspect**. Le verdict dépend de **l'ensemble** (IC, position_bias<0.10, non-effondrement source-blind, same-genre, negative controls sains, confond-matrix), **pas du seul score**.

**gemma validé « juge advisory qualité » SI** : modern-vs-modern tient (~≥0.75) ∧ same-era/same-genre ≥0.70 ∧ position_bias<0.10 ∧ pas d'effondrement source-blind ∧ negative controls sains ∧ confond-matrix ne montre pas de domination époque/genre/source ∧ cohérence avec ≥1 instrument non-circulaire.

## 6. TROIS ISSUES POSSIBLES (verdict S1E)
- **A — gemma survit** : devient juge advisory principal ; embeddings = radar/préfiltre ; architecture hybride.
- **B — gemma s'effondre** : c'était un détecteur d'époque/canon → retour embeddings + gold-set + juge humain/indépendant.
- **C — survie partielle** : utilisable seulement dans un `validity_scope` précis (granularité 1500 mots / moderne-vs-moderne / certains genres / certaines langues).

## 7. INTERDITS (jusqu'à S1E complet)
Aucun pivot architecture · aucun gate · aucun SEAL · aucune conclusion « gemma juge la qualité » · jamais fusionner prestige/commercial · avis publics ≠ vérité brute · aucun scoring sans source-blind · pas d'extension n / full-corpus avant anti-confound (agrandir un corpus confondu ne fait qu'affiner la preuve du mauvais raccourci).

## 8. QUESTIONS POUR VOUS (ChatGPT + Gemini)
1. Le test **STYLE_TRANSPLANT** (réécrire un pulp en style archaïsant / moderniser un maître) implique de la génération LLM — risque de circularité (le générateur biaise l'adversaire). Comment le construire proprement sans introduire un nouveau confond ?
2. Pour **SAME_GENRE/SAME_ERA**, notre corpus a peu de « littéraire moderne » par genre (ex. polar littéraire FR moderne). Faut-il accepter un n très faible (n<10) avec IC énorme, ou différer ce test jusqu'à expansion ciblée du corpus ?
3. **CANON_RECOGNITION** : comment mesurer objectivement la « célébrité » d'un extrait (pour séparer reconnaissance de canon vs jugement) sans base de données de notoriété par passage ?
4. Si gemma tient le modern-vs-modern à ~0.75 (= niveau mondial) mais que les embeddings s'effondrent à ~0.5 : faut-il conclure que la qualité n'est lisible que par un LLM (pas par la géométrie pure), et donc renoncer au pivot géométrique pour OBJ4 ?
5. `bge-m3` / `multilingual-e5` non installés localement — vaut-il l'effort de les puller pour le challenger embedding, ou nomic suffit-il pour ce test diagnostique ?

*Toutes les mesures S1D et l'ancre littérature sont committées et traçables dans `docs/metrology/` (repo OMEGA). On cherche votre jugement critique, surtout sur les angles morts du protocole S1E.*
