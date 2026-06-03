# S1C+ — DOSSIER 2-AXES — RAPPORT D'ÉTAT

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Statut** : axe PRESTIGE complet+sourcé ; axe COMMERCIAL en cours (batchs)
**Fichier** : `S1Cplus_DOSSIER.jsonl` (150 fiches) · **Schéma** : `S1C_EXTERNAL_RECEPTION_SCHEMA.md`

> Loi : deux axes ORTHOGONAUX jamais fondus. PRESTIGE (qualité/OBJ1) ⟂ COMMERCIAL (succès/OBJ1bis).

## 1. CARTE 2-AXES (prestige × commercial), n=150
| | commercial bas | moyen | haut | NA(masters) |
|---|---|---|---|---|
| **prestige haut** | — | — | — | **60** |
| **prestige moyen** | — | 5 | 7 | — |
| **prestige bas** | 57 | 6 | 15 | — |

- **60** prestige-haut = maîtres (commercial non prioritaire pour la mesure qualité).
- **15** prestige-bas / commercial-haut = best-sellers purs (signal OBJ1bis : Thilliez, Werber, Dan Brown, Higgins Clark, SAS…).
- **57** bas/bas = genre/auto-édition obscur (C).
- **12** zone intermédiaire.

## 2. CLASSES (taxonomie)
MASTER_CANON 54 · MASTER_MODERN 6 · PULP_PUBLISHED 7 · BEST_SELLER_COMMERCIAL 11 · GENRE_FORMULAIC 72.

## 3. AXE PRESTIGE — COMPLET & SOURCÉ
96 œuvres notées via base de faits littéraires **établis et citables** (Nobel : Camus, Modiano, Le Clézio, Ernaux, Faulkner, Hemingway, Bellow ; Goncourt : Proust, Duras, Beauvoir, Malraux, Modiano ; Renaudot : Céline, Butor ; Médicis : Perec ; Pléiade/canon scolaire ; nouveau roman). 54 œuvres obscures (C) → prestige nul (absence d'empreinte canonique/académique, vérifiable par absence). `canonical_status/award_signal/academic_signal/critical_reception/longevity_signal` + `PRESTIGE_SCORE`.

## 4. AXE COMMERCIAL — EN COURS (transparence des sources)
Chaque score porte `source_status` :
- **RESEARCHED** (web sourcé) : Franck Thilliez (7 M ex., GFK, 4e auteur le plus lu FR 2020 — livreshebdo/actualitte) ; Bernard Werber (35 M ex., 35 langues — allociné/Albin Michel).
- **ESTIMATED** (estimation raisonnée, **à confirmer batch suivant**) : ~19 auteurs commerciaux (Higgins Clark, Dan Brown, Bussi, Chattam, Jacq, Valognes, Legardinier, SAS, OSS117, Christina Lauren, Hannah Grace, Grimes…).
- **NOT_PRIORITIZED** : 60 maîtres (commercial secondaire pour OBJ1).
- **ESTIMATED_LOW** : 54 obscurs-C (auto-édition/niche présumée).

## 5. RESTE À FAIRE (honnêteté — « aucun compromis »)
- Confirmer par WebSearch les ~19 commerciaux `ESTIMATED` (ventes/listes/notes Babelio-Goodreads) → passer en RESEARCHED.
- Optionnel : notes publiques (public_rating/volume/polarization) pour la zone commerciale.
- Les obscurs-C : confirmer l'absence de footprint (light) ou laisser PROBABLE.

## VERDICT
- **Statut** : dossier 2-axes STRUCTURÉ et REMPLI ; prestige PASS (sourcé/complet) ; commercial PARTIEL (2 RESEARCHED + estimations flaggées).
- **Confiance** : Haute sur prestige (faits établis) ; Moyenne sur commercial estimé (à confirmer).
- **Forces** : séparation stricte 2 axes ; carte prestige×commercial exploitable ; transparence source_status ; cohérence classes.
- **Faiblesses** : (1) commercial majoritairement ESTIMATED (batchs web restants) ; (2) notes publiques non collectées ; (3) prestige des obscurs-C = par absence (non prouvé positivement).
- **Action** : poursuite batchs commerciaux WebSearch (autonomie), puis re-décision S1D vs scellement dossier complet.
