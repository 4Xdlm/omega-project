# OMEGA — PIERRE DE ROSETTE v2.1
## Protocole d'Ingénierie Inverse Causale
**Synthèse tri-IA : Claude + ChatGPT + Gemini**
**Date** : 2026-03-07
**Status** : SEALED après DRY-RUN S1 PASS + RUN C1 PASS
**Remplace** : v2.0 (2026-03-07, commit 7ad96c23)

---

## CHANGEMENTS v2.1 vs v2.0

| # | Origine | Amélioration |
|---|---------|-------------|
| 1 | ChatGPT | Ajout III (Instruction Interpretability Index) — valider l'utilisabilité du contrat par un LLM |
| 2 | ChatGPT | CAS (Causal Alignment Score) formalisé : CAS = 1 - L_obs |
| 3 | Gemini | Imbrication fractale confirmée angle mort F1-F30 — intégrée comme candidate F32 |
| 4 | RUN S1+C1 | Unification des unités métriques (ratio 0–1 OU /100 mots — jamais mixte) |
| 5 | RUN S1+C1 | POSITION_SPECTRE ajouté à PROMPT_A |
| 6 | RUN C1 | Densité discours rapporté + Fréquence connecteurs logiques = features spécifiques Camus |
| 7 | RUN S1+C1 | Matrice polaire Simon↔Camus établie — définit l'espace stylistique calibré |
| 8 | Analyse | Target voice OMEGA = Camus-adjacent, PAS Simon — erreur de calibration U-VOICE-06 corrigée |

---

## 1. MODÈLE MATHÉMATIQUE (inchangé + enrichi)

### Espace d'état
```
y(T) = features quantitatives OMEGA (F1–F30 + candidats F31–F33)
q(T) = qualitatifs structurés (contrat causal, interdits, voix)
c    = vecteur de contraintes causales latentes

Objectif : trouver c* = argmin L_total(T, T̂(c))
```

### Fonction de perte
```
L_obs  = d_y(y(T), y(T̂)) + λ·d_q(q(T), q(T̂))
L_copy = α·lexical_overlap + β·semantic_similarity_local
L_total = L_obs + L_copy

d_y = Σᵢ wᵢ · |fᵢ(T) - fᵢ(T̂)| / σᵢ(corpus_172)
```

### Scores dérivés (ChatGPT)
```
CAS  = 1 - L_obs                          [Causal Alignment Score, ∈ [0,1]]
SS_a = Var⁻¹(fᵢ sur auteur a)             [Stability Signature]
III  = mean([concret, non-redondant, actionnable]) [Instruction Interpretability Index]
```

### Cadre thermodynamique (Gemini)
```
Bassin d'attraction SVO  = attrait gravitationnel vers prose moyenne
Vitesse de libération    = PLANCHER / DIRAC = contrainte infranchissable
Impulsion Dirac δ(t)     = phrase ≤3 mots = perturbation rythmique maximale
Entropie Shannon H(T)    = diversité syntaxique mesurée
```

---

## 2. MATRICE POLAIRE CALIBRÉE — S1 (Simon) vs C1 (Camus)

**Établie empiriquement — 2026-03-07 — DRY-RUN validé**

| Métrique | Simon APEX (S1) | Camus APEX (C1) | Ratio S/C | Notes |
|----------|----------------|----------------|-----------|-------|
| **Longueur moy phrases** | 85–120 mots | 18–22 mots | ~5× | Polaire |
| **Sigma² longueur** | >2800 | 180–220 | ~14× | Polaire |
| **Ratio phrases courtes <5m** | 0% — DIRAC | 8–12% | ∞ | Polaire |
| **Ratio phrases longues >40m** | 100% — DIRAC | 15–25% | ~5× | Polaire |
| **Profondeur syntaxique** | 8.5–12 | 1.4–1.8 | ~6× | Polaire |
| **Imbrication fractale** | >4.2 | 0.25–0.35 | ~14× | **Angle mort F32** |
| **Densité images /100m** | 12–18 | 0.8–1.2 | ~14× | Polaire |
| **Variation attaques** | >0.85 | 0.65–0.75 | ~1.2× | Quasi-universel |
| **Ratio abstraction/corporalité** | 0.15–0.25 | 2.8–3.2 | ~14× | Inversé |
| **Perturbation rythmique Dirac** | 0% — DIRAC | 4–8% | ∞ | Inversé |
| **Densité participes présents /100m** | >4.8 | NON MESURÉ (C1) | — | **Candidat F31** |
| **Coeff. parenthétiques /phrase** | >2.1 | NON MESURÉ (C1) | — | **Candidat F33** |
| **Indice synesthésique /100m** | >1.8 | NON MESURÉ (C1) | — | **Candidat F31b** |
| **Densité discours rapporté** | N/A | 0.35–0.45 | — | Spécifique C1 |
| **Fréquence connecteurs logiques** | N/A | 4.5–5.5/100m | — | Spécifique C1 |

### Conclusion matrice
Les deux auteurs occupent des **zones polaires disjointes** de l'espace stylistique.
- **Simon** = pôle maximaliste / phrase-fleuve / densité fractale
- **Camus** = pôle minimaliste / sécheresse / tension nue

---

## 3. CALIBRATION TARGET VOICE OMEGA (CRITIQUE)

### Erreur corrigée (U-VOICE-06)
**U-VOICE-06** imposait `ellipsis_rate ≥ 40%` (syncopes) ET ciblait Simon comme référence.
C'est une **contradiction topologique** : Simon = 0% phrases courtes (DIRAC).

### Position calibrée
```
Target OMEGA voice = Camus-adjacent avec enrichissement Simon ponctuel

ellipsis_rate  ≥ 0.40  →  Camus (8–12% phrases courtes) ✅
opening_variety ≥ 0.70 →  Simon (>85%) + Camus (65–75%) ✅ mixte
voix            "je"   →  Camus ✅
densité images         →  Simon influence ponctuelle
```

### Recommandation
Le **socle universel** est Camus. Simon intervient comme **couche d'enrichissement** sur :
- la densité d'images par bloc
- les participes présents comme moteur de flux
- les insertions parenthétiques (F33)

---

## 4. CORPUS VALIDÉ (inchangé)

| ID | Auteur | Fichier | Statut |
|----|--------|---------|--------|
| **S1** | Simon | `La_Route_des_Flandre_APEX.txt` | ✅ RUN COMPLET — pôle maximaliste |
| S2 | Simon | `La_Route_des_Flandre_INCIPIT.txt` | À FAIRE |
| S3 | Simon | `La_Route_des_Flandre_NEUTRE.txt` | À FAIRE |
| **C1** | Camus | `L_Etranger_APEX.txt` | ✅ RUN COMPLET — pôle minimaliste |
| C2 | Camus | `L'Étranger_INCIPIT.txt` | À FAIRE |
| P1 | Proust | `Du_côté_de_chez_APEX.txt` | À FAIRE |
| P2 | Proust | `Du_côté_de_chez_NEUTRE.txt` | À FAIRE |
| PL | Proust | Long 1200–2500m | À FAIRE — tenue longue |

**Ordre recommandé** : C2 → P1 → PL → S2/S3

---

## 5. PROMPTS v2.1 — OPTIMISÉS

### PROMPT_A v2.1 (Contrat Causal)

```
Tu vas résoudre un problème d'identification inverse sur cet extrait littéraire.

[EXTRAIT]
{TEXTE}

Ne le reproduis pas. Ne l'imite pas. Ne le commente pas.

Résous ce problème : quelles contraintes de fabrication seraient nécessaires pour
générer un texte NOUVEAU appartenant à la même zone stylistique que cet extrait,
sans le reproduire ?

Tu dois produire un CONTRAT CAUSAL structuré. Format obligatoire, rien d'autre :

OUVERTURE         : [règle de démarrage — friction, tension, neutralité, etc.]
CONFLIT           : [type de conflictualité — interne/externe/latente/absente]
RYTHME            : [règle rythmique — alternance, ratio, perturbation périodique]
VOIX              : [distance narrative — personne, registre, opacité]
IMAGE             : [règle d'image — densité, corporalité, abstraction]
TENSION           : [modèle de tension — progression, compression, retenue]
SOUS-TEXTE        : [présence/absence/niveau — ce que le texte ne dit pas]
INTERDIT_1        : [ce que ce texte n'utilise JAMAIS]
INTERDIT_2        : [second interdit absolu]
INTERDIT_3        : [troisième interdit absolu]
POSITION_SPECTRE  : [position sur axe Simon(maximaliste)↔Camus(minimaliste) — ex: "0.2/1.0 côté Camus"]
CONTRAT_FINAL     : [5 règles max, causales, actionnables, non décoratives]

Pas d'introduction. Pas d'explication. Que le schéma.
```

**Changement v2.1** : Ajout de `POSITION_SPECTRE` — situe l'extrait sur l'axe calibré S↔C.

---

### PROMPT_B v2.1 (Boundary Conditions)

```
Tu vas extraire les Boundary Conditions métriques de cet extrait littéraire.

[EXTRAIT]
{TEXTE}

Ne le commente pas. Résous ce problème d'ingénierie : quelles contraintes
numériques INFRANCHISSABLES dois-je imposer à un système génératif pour qu'il ne
régresse pas vers la moyenne statistique ?

RÈGLE D'UNITÉ OBLIGATOIRE :
- Toutes les métriques de fréquence = RATIO 0.0–1.0 (ex: 0.08, pas 8%)
- Sauf mention "/100 mots" explicite dans la DÉFINITION

Format obligatoire pour chaque métrique :

METRIQUE         : [nom]
VALEUR_CIBLE     : [chiffre ou fourchette — ratio OU /100 mots selon DÉFINITION]
DEFINITION       : [comment la mesurer exactement + unité]
TYPE_CONTRAINTE  : [PLANCHER / PLAFOND / FOURCHETTE / DIRAC]
STABILITE        : [CONSTANTE_AUTEUR / CONSTANTE_EXTRAIT / UNIVERSEL]

Tu dois couvrir OBLIGATOIREMENT ces 13 dimensions :

1.  Longueur moyenne des phrases (mots)
2.  Variance sigma² de la longueur des phrases (mots²)
3.  Ratio phrases courtes (≤5 mots) sur total [RATIO 0–1]
4.  Ratio phrases longues (>40 mots) sur total [RATIO 0–1]
5.  Ratio profondeur syntaxique (subordonnées/principales) [RATIO 0–1]
6.  Ratio imbrication fractale (subordonnées de subordonnées/total subordonnées) [RATIO 0–1]
7.  Densité images/métaphores [/100 mots]
8.  Variation attaques de phrases (premiers mots uniques/total) [RATIO 0–1]
9.  Ratio abstraction/corporalité (mots abstraits/mots sensoriels)
10. Ratio perturbation rythmique Dirac (phrases ≤3 mots/total) [RATIO 0–1]
11. Densité participes présents [/100 mots]
12. Coefficient parenthétiques (incises + appositions/phrase) [par phrase]
13. Toute Boundary Condition critique spécifique à CET extrait

Pas d'introduction. Pas d'explication. Que le schéma.
```

**Changements v2.1** :
- Règle d'unité unifiée (ratio 0–1 ou /100 mots — jamais mixte)
- Ajout obligatoire dimensions 11 (participes présents) + 12 (parenthétiques) = ex-angles morts S1
- Profondeur syntaxique redéfinie en ratio (cohérent avec C1)

---

## 6. CRITÈRES PASS/FAIL (inchangés)

### PROMPT_A
- ≥8 directives actionnables dans CONTRAT_FINAL + corps
- Schéma complet (tous champs présents, y compris POSITION_SPECTRE)
- Zéro critique littéraire

### PROMPT_B
- ≥11 métriques avec valeurs numériques
- TYPE_CONTRAINTE présent pour chaque métrique
- STABILITE présente pour chaque métrique
- Unités cohérentes (ratio 0–1 ou /100m)

---

## 7. MODULES OMEGA FUTURS (post-protocole complet)

| Module | Formule | Source |
|--------|---------|--------|
| **CAS** — Causal Alignment Score | `CAS = 1 - L_obs` | ChatGPT |
| **SS** — Stability Signature | `SS_a = Var⁻¹(fᵢ)` | ChatGPT |
| **III** — Instruction Interpretability Index | `mean([concret, non-redondant, actionnable])` | ChatGPT |
| **F31** — Densité participes présents | `/100 mots, PLANCHER >4.8 (Simon)` | S1 angle mort |
| **F32** — Imbrication fractale | `subord-de-subord/total-subord` | Gemini confirmé |
| **F33** — Coefficient parenthétiques | `/phrase, PLANCHER >2.1 (Simon)` | S1 angle mort |

**Condition d'activation F31/F32/F33** :
- Stabilité intra-auteur prouvée sur ≥2 extraits
- Différenciation inter-auteurs prouvée (S vs C vs P)
- Utilité causale démontrée sur génération

---

## 8. COÛT ESTIMÉ TOTAL (runs restants)

| Run | Extraits | Appels | Tokens est. | Coût est. |
|-----|---------|--------|-------------|-----------|
| C2, P1, P2 | 3×2 prompts | 6 | ~18k | ~0.09€ |
| S2, S3 | 2×2 prompts | 4 | ~12k | ~0.06€ |
| PL (Proust long) | 1×2 prompts | 2 | ~8k | ~0.04€ |
| **Total restant** | 6 extraits | 12 appels | ~38k | **~0.19€** |
| **Total cumulé** | 8 extraits | 22 appels | ~76k | **~0.38€** |

---

## 9. PROCHAINES ACTIONS

| Priorité | Action | Script |
|----------|--------|--------|
| 1 | Run C2 (Camus INCIPIT) — confirmer stabilité intra-auteur | à créer |
| 2 | Run P1 (Proust APEX) — 3e pôle | à créer |
| 3 | Valider F31/F32/F33 sur C1 (métriques absentes du premier run) | analyse manuelle |
| 4 | Synthèse fiches de production Simon / Camus / Proust | post P1 |
| 5 | Socle universel = règles communes à tous auteurs | post synthèse |
| 6 | Sprint U-ROSETTE-01 : intégration dans VOICE_COMPLIANCE | post socle |

---

**FIN DU DOCUMENT — PIERRE DE ROSETTE v2.1**
*Synthèse tri-IA : Claude + ChatGPT + Gemini*
*Matrice polaire S1↔C1 établie empiriquement*
*Target voice OMEGA = Camus-adjacent + enrichissement Simon ponctuel*
