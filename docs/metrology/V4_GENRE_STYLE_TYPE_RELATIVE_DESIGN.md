# V4 — MESURE RELATIVE AU TYPE / GENRE / STYLE (design)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Déclencheur** : réflexion Architecte (mesure générale + spécialisée par genre/style ; routeur basé sur la classification existante ; risque sur biographies/histoire/non-fiction) + Tribunal 3-IA (Gemini : two-stage routeur+juge spécialisé ; ChatGPT : multi-axes + percentile intra-genre, genre conditionne ≠ remplace la qualité)
**Doctrine** : EMP-17 (réutiliser l'existant), DEC-018 (gemma advisory / nomic radar). **Design only — STOP avant mesure** (la mesure exige d'abord le corpus tagué).

---

## 1. MON AVIS (croisé avec les tribunaux) — l'intuition est juste, avec UNE couche manquante
- **OUI à la mesure à deux niveaux** : `GlobalQuality` (qualité transversale) **+** `GenreRelativeQuality` (qualité DANS son genre, via percentile intra-genre). Une mesure générale seule est injuste (juge un polar comme un Proust raté) ; une mesure par genre seule est aveugle à la grandeur transversale. **Les deux.** (Consensus 3-IA.)
- **Le genre CONDITIONNE, ne REMPLACE jamais la qualité** (ChatGPT) : on ne dit pas « romance = moins bon », on dit « bon polar / bonne romance / grand roman littéraire ».
- **MA COUCHE MANQUANTE (ton vrai point, sous-estimé par les tribunaux)** : avant le GENRE, il faut une **couche TYPE** = fiction narrative vs **non-fiction** (biographie, histoire, essai, témoignage). **C'est la source d'erreur la plus grave et la plus immédiate** : le juge actuel mesurerait une biographie comme « fiction littéraire ratée » — non-sens. La non-fiction ne joue pas au même jeu → elle doit être **routée hors** du juge de qualité littéraire-fictionnelle (ou mesurée sur d'autres axes : clarté, rigueur, structure). Le filtre non-fiction de S1B (mots-clés) était insuffisant (Soral/Aly/Almaas passés). **TYPE gate = priorité 0.**

## 2. ARCHITECTURE CIBLE — 3 couches (réutilise l'existant)
```
Texte
  │
  ├─[Couche 0 : TYPE GATE]   fiction_narrative ? sinon → NON_FICTION (route dédiée / exclude du juge littéraire)
  │
  ├─[Couche 1 : GENRE CLASSIFIER]  probabiliste {littéraire, polar/thriller, romance, SF/fantasy, commercial_autre…}
  │        (réutilise: omega-forge/style-metrics + features CALC du corpus 1334 + centroïdes nomic par genre + decision-engine/classifier.ts)
  │
  └─[Couche 2 : SCORING MULTI-AXES]  conditionné par genre+style
           GlobalQuality · GenreRelativeQuality (percentile intra-genre) · StyleFit · CommercialPotential · Confidence
           (réutilise: gemma advisory DEC-018 + nomic radar + style-emergence-engine genome)
```

## 3. RÉUTILISATION DE L'EXISTANT (EMP-17 — ne pas reconstruire)
| Besoin V4 | Brique existante à étendre |
|---|---|
| Features discriminantes genre/style | `omega-forge/src/quality/style-metrics.ts` + genome axes de `style-emergence-engine` (burstiness, dialogue_ratio, description_density, lexical_richness, sentence_length, syntactic diversity) — **déjà calculées sur le corpus 1334** (CORPUS_FEATURES_MASTER.json) |
| Classification | `decision-engine/src/classifier/classifier.ts` (règles priorisées + score) — l'étendre en classifieur genre probabiliste |
| Routage genre→juge | `integration-nexus-dep/src/router/{router,dispatcher}.ts` |
| Centroïdes par genre | embeddings nomic (S1D) → centroïde par genre au lieu de centroïde unique maître |
| Exemplaires de style | `omega-p0/corpus/human/*-style.txt` (10 maîtres FR) |
| Règles de style | `STYLE_ORACLE_RULES.md` (archivé) + `oracle-style.ts` |

## 4. SORTIE MULTI-AXES (la vérité multi-dimensions, ChatGPT)
Plus jamais « score = 82 ». Désormais :
```
{ type: "fiction|nonfiction", genre: {polar:0.72, thriller:0.61, litteraire:0.28},
  GlobalQuality: 78, GenreRelativeQuality_percentile: 91, StyleFit: 84,
  CommercialPotential: 88, IntrinsicLiteraryDepth: 64, Confidence: 0.76 }
```
Musso = Global moyen / GenreFit fort / Commercial très fort. Proust = Global très fort / Commercial variable. **Les deux vrais en même temps.**

## 5. CONFOND GENRE (le verrou S1E) — comment V4 le résout
S1E a montré : gemma 1.0 maître-vs-pulp tient même en moderne source-blind, MAIS le genre n'était pas neutralisé. V4 le résout par le **percentile intra-genre** : on ne compare plus un thriller à un maître littéraire, mais aux AUTRES thrillers → SAME_GENRE devient mesurable une fois le corpus genre-tagué. C'est la levée de l'EVIDENCE_GAP S1E.

## 6. CLASSIFICATION EXISTANTE = SEED, pas vérité (ChatGPT)
Les tiers/dossiers actuels = point de départ. Durcir par : genre éditorial, 4ᵉ de couverture, métadonnées, signaux textuels (style-metrics), classification LLM source-blind, embeddings, contrôle humain léger. Chaque label : `CERTAIN / PROBABLE / HYBRID / AMBIGUOUS`. Si ambigu → plusieurs juges pondérés.

## 7. LIVRABLES V4 (séquence, design→mapping→mesure)
1. `V4_TYPE_GATE_SPEC.md` (fiction vs non-fiction — priorité 0).
2. `V4_GENRE_TAXONOMY.md` + `V4_STYLE_TAXONOMY.md` (coarse, extensible).
3. `V4_GENRE_STYLE_MANIFEST.csv` (corpus 1334/1698 tagué genre+style+type, confidence+evidence) — réutilise CORPUS_FEATURES_MASTER + Google Books.
4. `V4_SAME_GENRE_PAIR_BUILDER.csv` (paires littéraire-vs-commercial intra-genre, même époque).
5. `V4_GENRE_RELATIVE_SCORING_PLAN.md` (Global + intra-genre percentile + StyleFit + Commercial).
6. PUIS seulement : le test SAME_GENRE décisif (gemma + nomic genre-centroïdes).

## VERDICT
- **Statut** : design V4 posé — réflexion Architecte VALIDÉE + enrichie (couche TYPE) + ancrée sur l'existant (style-emergence/classifier/router déjà là).
- **Confiance** : Haute. **Forces** : two-stage + multi-axes + percentile intra-genre (consensus + littérature) ; TYPE gate règle le risque non-fiction (biographie/histoire) ; réutilise 50% d'infra existante. **Faiblesses** : (1) corpus pas encore genre-tagué (gros mapping) ; (2) classifieur genre à valider (confidence) ; (3) non-fiction route de mesure à définir.
- **Action** : démarrer par `V4_TYPE_GATE_SPEC` (cheap, haute valeur anti-erreur) + tag genre du corpus (réutilise style-metrics existantes), PUIS SAME_GENRE. Pas de gate/SEAL. Décision Architecte sur l'ordre.
