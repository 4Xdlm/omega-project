# V4-G — Genre : contrôle-vérité (G0) + test pilote de séparabilité (G1)

**Date** : 2026-06-03 · **Branche** : phase-r-dispatcher-v33 · **Standard** : S-1 (OMEGA_ABSOLUTE_PROOF_STANDARD)
**Mandat** : « on ne prend rien sans contrôle vérité mathématique » (Architecte). Aucune adoption sans preuve.

---

## V4-G0 — Contrôle-vérité : les labels de GENRE existent-ils ?

**Résultat : NON.** Aucun label de genre n'existe dans le corpus.

| Source | Constat |
|---|---|
| `Downloads/livre/` arborescence | `{FR,ENG,ESP,IT} × {S,A,B,C,D,Best Seller}` = **tier × langue uniquement**. Aucun sous-dossier genre. |
| `R2_FEATURE_MATRIX.csv` (568×117) | **0 colonne** `genre/type/categ/tag`. |
| `RAPPORT_CLASSIFICATION*.md` | Le seul hit « genre » = un *titre* d'essai (« Introduction aux études sur le genre »). Pas un label. |

**Distinction décisive avec V4-A0 (TYPE)** :
- TYPE gate : classe non-fiction **physiquement absente** du corpus → intestable (EVIDENCE_GAP données).
- GENRE : les classes **sont présentes** (Werber=SF, Thilliez=thriller, Jacq=historique… = faits sur auteurs publiés) mais **non étiquetées**.
  → Le genre est **constructible** via un KB auteur→genre sourcé. Donc **testable**, contrairement au TYPE.

---

## V4-G1 — Test pilote de séparabilité (embeddings nomic cachés)

### Design (confond-free)
- Restriction à la cellule **`D_SOURCE_REAL_FR`** → **tier=pulp ET langue=fr FIXÉS**.
  Toute séparabilité mesurée ici est donc du **genre isolé de la qualité et de la langue**.
- Idiosyncrasie d'auteur contrôlée par **leave-ONE-AUTHOR-out** (centroïde entraîné sur les autres auteurs).
- KB auteur→genre = catégorie définitoire d'auteurs célèbres (fait vérifiable, pas supposition).
- Test primaire : binaire **THRILLER (5 auteurs / 10 livres) vs FEELGOOD (3 / 6)** = seuls genres ≥2 auteurs.
- Significativité : **permutation test** (labels mélangés au niveau auteur, 5000 tirages valides).

### Résultats

| Mesure | Valeur | Lecture |
|---|---|---|
| LOAO accuracy THRILLER/FEELGOOD | **0.75** (12/16) | > hasard (0.50) en apparence |
| Permutation p-value | **0.053** | **ÉCHOUE le seuil 0.05** — non significatif |
| Δcosine intra−inter (inter-auteurs) | **+0.019** (0.827 vs 0.808) | Écart **minuscule** |
| Erreurs | 4/16, réparties (valognes, bussi, clark, legardinier) | Aucun genre ne s'effondre |

### Verdict : `GENRE_SEPARABILITY_UNPROVEN` (pilote)

La séparabilité de genre **n'est PAS établie**. L'accuracy 0.75 est trompeuse : la permutation
donne **p = 0.053 (> 0.05)** et l'écart de cosine intra/inter est **+0.019** seulement. Sur
**nomic @ fenêtre 1500 mots, n=16**, le genre est au mieux un **signal faible**, non prouvé.

Deux causes possibles (non départagées) :
1. **Sous-puissance** : n=16/8 auteurs. Le sens de l'effet est correct (75 % > 50 %, intra > inter) ;
   un n plus grand pourrait franchir le seuil — ou pas.
2. **Mauvais espace de features** : nomic (EN-centré, sémantique générale) encode mal le **genre littéraire**.
   Le genre pourrait vivre dans les 117 features CALC (R2) ou un embedding dédié (bge-m3), pas dans nomic.

**Conséquence doctrinale** : comme pour le TYPE, **aucune couche genre n'est adoptée**. Pas de
classifieur, pas de gate, pas de scoring genre-relatif tant que la séparabilité n'est pas prouvée
à puissance correcte. Le contrôle-vérité a, une 2ᵉ fois consécutive, empêché un build prématuré.

---

## Protocole proprement dimensionné (pour GO Architecte)

Pour trancher #1 vs #2 ci-dessus, test à puissance correcte :
1. **KB auteur→genre élargi** sur le corpus FR complet (`Downloads/livre`), auteurs célèbres only,
   ≥ **5 auteurs/genre**, ≥ **30 livres/genre**, sur ≥4 genres robustes (thriller, feel-good/romance,
   SF/fantasy, historique).
2. **3 espaces de features comparés** sur les MÊMES livres : (a) nomic actuel, (b) **bge-m3** (challenger,
   meilleur multilingue/FR), (c) **117 features CALC** (R2_FEATURE_MATRIX).
3. **Même protocole** : leave-author-out multiclasse, accuracy + macro-F1, **permutation au niveau auteur**,
   bootstrap par livre, AUC one-vs-rest. Seuils S-1 visés (AUC≥0.80, IC95-bas≥0.70).
4. **Contrôle confond** : tier et langue fixés par bloc ; vérifier que le genre n'est pas un proxy d'époque
   ou de longueur (covariables).
5. Coût embeddings : bge-m3 à installer (Ollama) ; ~150–250 livres FR à embedder (runs détachés Windows-side).

Si **aucun** espace ne franchit le seuil → genre **non séparable de manière fiable** sur ces données
(résultat négatif exploitable, à documenter). Si bge-m3 ou CALC franchit → base du **Layer-1 genre** V4.

---

## VERDICT
- **Statut** : PASS (méthode/contrôle-vérité) · **Résultat scientifique** : `GENRE_SEPARABILITY_UNPROVEN` (pilote)
- **Confiance** : Haute (sur la méthode et le constat d'insuffisance) / Basse (sur l'existence d'un signal genre exploitable)
- **Forces** : confond tier+langue neutralisé par design ; idiosyncrasie auteur contrôlée (LOAO) ; permutation honnête ; labels sourcés, pas supposés.
- **Faiblesses** : (1) n=16 très sous-puissant vs S-1 (n≥100) ; (2) un seul espace de features testé (nomic) — le genre pourrait vivre ailleurs (CALC/bge-m3) ; (3) KB genre limité aux auteurs connus de la cellule D.
- **Risques restants** : conclure trop vite « pas de genre » alors que c'est peut-être la sous-puissance ou nomic — d'où le protocole dimensionné avant tout jugement définitif.
- **Action requise** : décision Architecte — lancer le protocole proprement dimensionné (KB élargi + bge-m3 + CALC), OU acquisition non-fiction (V4-A0), OU pause.

**Artefacts** : `scripts/metrology/v4g_genre_separability.py` · `V4G1_RESULTS.json` (workspace, hors repo).
