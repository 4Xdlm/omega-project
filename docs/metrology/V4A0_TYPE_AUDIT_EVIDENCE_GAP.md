# V4-A0 — AUDIT MATRICE/LABELS POUR TYPE GATE → EVIDENCE GAP

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Mandat** : « pas de mesure sans contrôle-vérité ». Avant de construire le TYPE gate, prouver que les données le permettent (protocole ChatGPT V4-A0).

## Données auditées : R2_FEATURE_MATRIX.csv
- **568 lignes, 117 colonnes**. Labels/meta : `tier` (1-5 = D→S), `tier_name` (tier-A..S), `lang`, `title`, `author`, `word_count` + émotion_14d + features `f_*` (majoritairement celles du **cimetière** : f_tension_arc, f_uncertainty_drop, f_anti_keyword) + ~80 `tf_*`.
- Langues : en 303, fr 189, es 69, autres ~7.

## CONSTATS BLOQUANTS (contrôle-vérité)
1. **AUCUN label TYPE/GENRE/catégorie** dans la matrice → impossible d'entraîner/superviser un classifieur de type sur ces données.
2. **Pas de classe NON-FICTION** : 11 titres/568 à indice non-fiction (~2%). Le corpus est **fiction quasi pure** (et la non-fiction repérée a été PURGÉE en S1C+ : Soral, Almaas, Aly). → **Le test fiction-vs-non-fiction est IMPOSSIBLE : la classe négative n'existe pas.**
3. **Champ `author` dégénéré** dans R2 (1 seul distinct) → split-par-auteur (garde-fou anti-fuite obligatoire) **impossible sur cette matrice** ; l'auteur n'est récupérable que via les noms de fichiers/manifest.
4. Les features R2 sont surtout émotion + features-cimetière (rejetées en R-PHYSICS), **pas** les axes de style propres (burstiness/dialogue/description sont ailleurs — R3/style-emergence).

## VERDICT
- **Statut** : `EVIDENCE_GAP_TYPE_GATE` — **le TYPE gate ne peut être ni testé ni construit avec les données actuelles** (pas de label type, pas de classe non-fiction, author cassé sur R2).
- **Cause** : OMEGA n'a jamais collecté de non-fiction (corpus = littérature/fiction). Le risque « biographie jugée comme roman raté » est **réel mais non testable faute de non-fiction dans le corpus**.
- **Confiance** : Haute (audit empirique des colonnes).
- **Forces** : le contrôle-vérité a évité de bâtir un TYPE gate sur des données qui ne le supportent pas (gaspillage évité, exactement le but de la règle Architecte).
- **Faiblesses** : (1) pas de non-fiction → gate non testable ; (2) pas de label type ; (3) author non fiable sur R2 (à reconstruire depuis manifest/filenames).

## PRÉ-REQUIS pour débloquer le TYPE gate (V4-A1)
1. **Acquérir un corpus non-fiction** : biographies, histoire, essais, témoignages (≥30 auteurs/type, FR+EN), extraits 1500w, source-blind — comme le Gold-Set fiction.
2. **Tagger TYPE** (fiction_narrative / nonfiction_biography / nonfiction_history / essay / memoir) avec confidence+evidence.
3. **Reconstruire le champ author** (depuis filenames `Titre_-_Auteur`, comme le builder Gold-Set).
4. Puis SEULEMENT : séparabilité TYPE (dummy baselines longueur/langue/source + logistic/RF + split-auteur + cross-langue + AUC/MI/VIF/permutation).

## RECOMMANDATION (réorientation V4)
- **Le TYPE gate est en HOLD données** (acquisition non-fiction requise — chantier d'acquisition, pas de mesure).
- **Pivot V4 testable maintenant** : le **GENRE intra-fiction** EST testable (on a literary/thriller/romance via tiers+auteurs+`livres_payants`). Faire V4-genre AVANT V4-type, OU lancer l'acquisition non-fiction en parallèle.
- Aucune adoption, aucun classifieur, aucun gate tant que les preuves manquent.
