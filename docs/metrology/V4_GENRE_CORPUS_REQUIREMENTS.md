# V4 — Exigences corpus pour relancer la couche GENRE

**Statut** : SPEC (pré-requis de relance) · 2026-06-03 · lié à [V4_G4_GENRE_SEPARABILITY_FAIL.md](V4_G4_GENRE_SEPARABILITY_FAIL.md)
**Raison** : le genre a échoué S-1 par **manque de corpus** (88 livres, signal effondré en LOAO). Toute relance exige d'abord un corpus adéquat.

## Pourquoi le corpus actuel échoue
Avec ~24–34 livres/genre et 5–9 auteurs/genre, le classifieur mesure **l'auteur ou la source**, pas le genre. La séparabilité s'effondre dès qu'on isole l'auteur (LOAO). Le signal est confondu, sous-échantillonné, sujet au surapprentissage.

## Exigences pour un corpus genre valide (S-1)

| Critère | Cible | Raison |
|---|---|---|
| Auteurs par genre | **≥30** | Casser le confond auteur=genre ; LOAO robuste |
| Livres par genre | **≥100** (norme S-1 n/cellule) | Puissance statistique |
| Étiquetage | **genre-tagué** (source vérifiable, pas déduit du seul nom) | Vérité de label, pas supposition |
| Langues | **FR et EN séparés** (dispatch) | Pas de confond langue |
| Époque | **same-era par bloc** | Pas de confond époque (cf S1E) |
| Source/format | **same-source si possible** | Pas de confond source (cf S1C+) |
| Genres cibles | thriller, SF/fantasy, romance/feel-good, historique, **+ non-fiction (TYPE)** | Couvrir les classes manquantes |

## Méthode imposée à la relance
1. Espace de features = **bge-m3** (nomic réfuté pour le genre, V4-G3).
2. AUC one-vs-rest **en LOAO/LOFO obligatoire** (cf [CENTROID_AUC_VALIDITY_RULE.md](CENTROID_AUC_VALIDITY_RULE.md)) — jamais full-data.
3. Bootstrap clusterisé par auteur (IC95) + permutation au niveau auteur.
4. Covariables contrôlées : longueur, tier (qualité), époque.
5. Seuils S-1 : macro-AUC ≥0.80 ET IC95-bas ≥0.70 ET permutation p<0.05.

## Sources candidates (à explorer, non engagées)
- Bases bibliographiques avec tags genre vérifiables (BNF, catalogues éditeurs, classifications BISAC/Dewey littéraire).
- Élargissement du corpus `Downloads/livre` par acquisition ciblée multi-auteurs/genre.
- ⚠️ Copyright : usage interne mesure uniquement, aucune prose reproduite.

## VERDICT
- Statut : SPEC (gate de relance) · Confiance : Haute
- Sans corpus conforme → la couche genre RESTE gelée. Aucune dérogation.
