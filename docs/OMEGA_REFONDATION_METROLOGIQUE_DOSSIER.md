# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SYNTHÈSE DES VISIONS & PLAN R-8
# PHYSIQUE LITTÉRAIRE : L'ÉQUATION DE LA MAÎTRISE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-21
# Statut       : PLAN DIRECTEUR POST-PHASE R
# Convergence  : Claude (Opus) + ChatGPT + Gemini + Grok + Architecte Francky
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. CONVERGENCE DES 5 VISIONS

## Ce sur quoi TOUT LE MONDE converge (5/5)

1. Le scorer GB à 2000 mots (Spearman 0.79) est OPÉRATIONNEL
2. Le principe d'endurance est validé (maîtres montent, LLM chutent)
3. La normalisation par type de passage est INDISPENSABLE
4. Les coefficients d'influence doivent être APPRIS, pas inventés
5. Les features de RELATION comptent plus que les features ISOLÉES
6. Phase R = PASS, scellable avec limites documentées

## Ce que ChatGPT apporte de unique
- Le profil de tenue MULTI-DELTA (pas juste 1 pente)
- La séparation tribunal de CLASSEMENT vs tribunal de PILOTAGE
- La liste des angles morts non mesurés (macro-architecture, dialogue, etc.)

## Ce que Gemini apporte de unique
- Le concept de "gated veto" (pente négative = veto, pas malus linéaire)
- L'alerte sur la séparation dialogue/narration avant mesure
- La nécessité de forcer un texte LLM long pour preuve complète

## Ce que Claude (moi) apporte de unique
- L'audit des 8 failles pré-scellement (corrélation longueur, tier D, biais Camus)
- La formalisation de la normalisation typologique avec interpolation
- Le mapping technique Flaubert → features OMEGA

## Ce que Francky apporte (DÉCISIF)
- La NORMALISATION TYPOLOGIQUE PONDÉRÉE : chaque type a un % de présence 
  ET un coefficient d'influence différent par feature
- Les SEUILS DE BASCULEMENT : une combinaison de types peut empêcher ou 
  permettre l'émergence d'une fonction narrative
- La LOI DE L'ASSEMBLAGE : une scène ne se juge pas seule mais par sa 
  contribution à la structure révélée à plus grande échelle
- Le concept d'ÉMERGENCE : la qualité finale peut dépasser la somme des 
  composants si l'assemblage est juste

---

# 2. L'ÉTAT ACTUEL (CE QU'ON A)

## Le Tribunal OMEGA v1 (Phase R scellable)

| Composant | Statut | Métrique |
|-----------|--------|----------|
| GB 42 features à 2000w | Production | Spearman 0.79 |
| 21 features sémantiques | Validées | 7 dans top 15 GB |
| 5 features depth (R-5bis) | Validées | f_pov_shift ×3.6, f_sub ×4.4 |
| Pente d'endurance | Flag diagnostique | Maîtres +0.45, LLM -0.28 |
| Classifieur de passage | Opérationnel | 5 types, vecteur normalisé |
| Score de confiance | Implémenté | VERIFIED_STRONG/VERIFIED/NON_VERIFIABLE |
| Corpus | 611 œuvres | S=278, A=91, B=101, C=91, D=50 |

## Limites documentées

| Limite | Gravité | Module futur |
|--------|---------|--------------|
| Corrélation longueur r=0.60 | Confondeur partiel | R-8 |
| Biais anti-dépouillé (Camus) | Acceptable pour OMEGA | Documentation |
| Normalisation typologique | Non pondérée | R-8 |
| Meta-scorer faible (0.56) | GB direct en production | R-8 |
| Macro-architecture roman | Non mesurée | R-9 |
| Dialogue naturel | Non mesuré | R-9 |
| Caractérisation | Non mesurée | R-9+ |

---

# 3. CE QU'IL FAUT CONSTRUIRE (R-8 : PHYSIQUE LITTÉRAIRE)

## L'ÉQUATION CIBLE

La formule complète de la physique littéraire OMEGA :

```
Score_scène = Σ(pi × λi,f × Ci,f) + Σ(pi × pj × γij,f) + Σ(Tk)
```

Où :
- pi = proportion du type i dans la scène (somme = 1.0, incluant NOISE)
- λi,f = coefficient d'influence du type i sur la feature f (APPRIS)
- Ci,f = constante du type pur i pour la feature f (MESURÉE)
- γij,f = terme d'interaction entre types i et j pour la feature f (APPRIS)
- Tk = effets de seuils de basculement (DÉTECTÉS par le GB)

Et pour le score global d'une œuvre :

```
Score_œuvre = 
    α × Score_méso(2000w)           # Qualité tenue
  + β × Pente_endurance             # Tenue multi-échelle
  + γ × Score_assemblage            # LEGO : contribution des scènes entre elles
  + δ × Polyphonie                  # Variété des types sur la distance
  - ε × Dégradation_confiance       # Pénalité si NON_VERIFIABLE
```

Avec α, β, γ, δ, ε APPRIS par régression sur le corpus classé.

---

# 4. LE PLAN R-8 EN 7 ÉTAPES

## R-8.1 — PROFILS PURS PAR TYPE (Fondation)

### Objectif
Mesurer les CONSTANTES de chaque type pur chez les maîtres.

### Méthode
1. Utiliser le classifieur de passage pour identifier les passages > 80% d'un type
2. Pour chaque type (ACTION, NARRATION, DESCRIPTION, DIALOGUE, INTROSPECTION) :
   - Extraire 50+ passages "purs" chez les maîtres (tier S)
   - Calculer la MOYENNE et l'ÉCART-TYPE de chaque feature
   - C'est la TABLE DE RÉFÉRENCE PAR TYPE

### Livrable
`corpus_r/TYPE_PROFILES_PURE.json`

```json
{
  "ACTION": {
    "f1_mean": {"mean": 11.2, "std": 3.1},
    "f_subordination_depth": {"mean": 0.35, "std": 0.12},
    ...
  },
  "DESCRIPTION": { ... },
  "NARRATION": { ... },
  "DIALOGUE": { ... },
  "INTROSPECTION": { ... }
}
```

---

## R-8.2 — VALIDATION DE L'ADDITIVITÉ (Preuve)

### Objectif
Vérifier que les types se combinent de façon prédictible.

### Méthode
1. Prendre 100 passages MIXTES avec vecteur de type connu
2. Pour chaque passage, calculer la cible par interpolation :
   `f_cible = Σ(pi × Ci,f)`
3. Comparer f_cible à f_mesuré
4. Si corrélation > 0.7 : l'additivité est VALIDÉE
5. Si < 0.5 : il faut des termes d'interaction

### Livrable
`results_phase_r/R8_ADDITIVITY_TEST.json`

---

## R-8.3 — COEFFICIENTS D'INFLUENCE λ (Apprentissage)

### Objectif
Déterminer combien chaque type PÈSE réellement sur chaque feature.

### Méthode
Pour chaque feature f :
1. Prendre TOUS les passages du corpus avec leur vecteur de type
2. Régression : f_mesuré = Σ(pi × λi × Ci)
3. Résoudre pour les λi
4. Le λ dit : "quand il y a 1% de DIALOGUE en plus, combien ça TIRE 
   sur f_subordination ?"

### Livrable
`corpus_r/INFLUENCE_COEFFICIENTS.json`

```json
{
  "f_subordination_depth": {
    "ACTION": 0.76,
    "NARRATION": 1.00,
    "DESCRIPTION": 1.18,
    "DIALOGUE": 0.41,
    "INTROSPECTION": 1.25
  },
  ...
}
```

---

## R-8.4 — MATRICE D'INTERACTIONS γ (Apprentissage)

### Objectif
Détecter les effets de COMBINAISON entre types.

### Méthode
1. Ajouter des termes croisés à la régression :
   f_mesuré = Σ(pi × λi × Ci) + Σ(pi × pj × γij)
2. Mesurer quelles PAIRES de types ont un effet significatif
3. Exemples attendus :
   - ACTION × DIALOGUE → augmente la variance rythmique
   - DESCRIPTION × INTROSPECTION → renforce la subordination
   - ACTION × INTROSPECTION → crée du contraste (bonus si maîtrisé)

### Livrable
`corpus_r/INTERACTION_MATRIX.json`

---

## R-8.5 — SEUILS DE BASCULEMENT T (Détection)

### Objectif
Trouver les points où une scène change de régime.

### Méthode
1. Le GB détecte naturellement les seuils (c'est un arbre de décision)
2. Extraire les SPLITS les plus fréquents du GB :
   - "Si ACTION > 0.45 ET f35_hook > 0.5 ALORS score chute"
   - "Si INTROSPECTION > 0.30 ET f28b_irony > 0.08 ALORS score monte"
3. Documenter ces seuils comme RÈGLES DE BASCULEMENT

### Livrable
`corpus_r/TIPPING_POINTS.json`

---

## R-8.6 — SCORE D'ASSEMBLAGE (La Loi des LEGO)

### Objectif
Mesurer comment les scènes SE CONSTRUISENT les unes les autres.

### Méthode — La séquence de Markov narratif
1. Pour chaque œuvre, calculer la SÉQUENCE des types dominants :
   [DESC, DESC, NARR, ACTION, INTRO, NARR, ...]
2. Calculer les TRANSITIONS :
   - Fréquence de chaque transition (DESC→NARR, ACTION→INTRO, etc.)
   - Probabilité de transition
3. Comparer les patterns de transition MAÎTRES vs LLM vs COMMERCIAUX

### Méthode — L'ablation structurelle
1. Prendre un bloc de 5 scènes consécutives
2. Retirer la scène N
3. Remesurer la qualité du bloc sans N
4. Si la qualité CHUTE → la scène N était une PIERRE ANGULAIRE
5. Si la qualité NE CHANGE PAS → la scène N était du REMPLISSAGE

### Méthode — La révélation d'échelle
1. Mesurer le type dominant d'un passage à 500w → ex: DESCRIPTION
2. Mesurer le type dominant à 2000w (même début) → ex: NARRATION
3. Si le type CHANGE avec l'échelle → c'est de l'ASSEMBLAGE
4. Les maîtres changent de type perçu avec l'échelle (confirmé Audit 3)
5. Les LLM restent dans le même type → pas d'assemblage

### Livrable
`results_phase_r/R8_ASSEMBLY_ANALYSIS.json`

---

## R-8.7 — RECONSTRUCTION DU SCORER FINAL (Intégration)

### Objectif
Combiner TOUS les modules en un scorer unifié.

### Architecture

```
TEXTE
  │
  ├─→ [Classifieur de type] → vecteur [act%, desc%, narr%, dial%, intro%, noise%]
  │
  ├─→ [Features brutes] → 42 + 21 + 5 = 68 features
  │
  ├─→ [Normalisation typologique]
  │     └─ Cible attendue = Σ(pi × λi × Ci) + Σ(pi × pj × γij)
  │     └─ Écart = mesuré - cible
  │
  ├─→ [Score local 500w] → GB sur écarts normalisés
  │
  ├─→ [Score méso 2000w] → GB sur écarts normalisés
  │
  ├─→ [Pente d'endurance] → delta_court + delta_long
  │
  ├─→ [Score d'assemblage] → transitions + ablation + révélation
  │
  ├─→ [Score de confiance] → VERIFIED_STRONG / VERIFIED / NON_VERIFIABLE
  │
  └─→ [SCORE FINAL] = f(méso, pente, assemblage, confiance)
```

### Validation
- Même corpus, même split
- Spearman cible > 0.85
- Zéro inversion S vs D
- Flaubert > Opus à TOUTES les échelles
- Commerciaux entre S et D
- Camus correctement placé dans le S (correction du biais dépouillé)

---

# 5. CE QUI VIENT APRÈS R-8 (VISION)

## R-9 — MACRO-ARCHITECTURE (roman entier)
- Cohérence des personnages sur 50K+ mots
- Mémoire symbolique
- Arcs narratifs
- Constance de voix

## PHASE P — PILOTAGE DU SCRIBE
- Utiliser le scorer pour GUIDER la génération
- Pipeline Flaubert : documentation → rêverie → planification → brouillon → 
  compression → POV → gueuloir → motifs → verrouillage
- Boucle de rétroaction : scorer → diagnostic → correction → re-score

## PHASE S — LA SAGA
- Production de 300K+ mots
- Score SAGA_READY sur chaque chapitre
- Tenue multi-échelle vérifiée sur l'ensemble

---

# 6. LES PRINCIPES FONDATEURS (à graver)

## Principe d'Endurance (validé Phase R-7)
"Les maîtres montent avec la distance. Les contrefaçons chutent.
Les commerciaux stagnent. La tenue est le séparateur absolu."

## Principe de Normalisation Typologique (conceptualisé Francky)
"Une scène ne se juge pas par ses valeurs brutes mais par son ÉCART
à ce qu'un maître ferait avec CE MIX EXACT de types."

## Principe d'Assemblage (conceptualisé Francky)
"Une scène ne se juge pas seule mais par sa contribution à la structure
révélée à plus grande échelle. Ce qui semble local est parfois fondation."

## Principe des Seuils de Basculement (conceptualisé Francky)
"La valeur d'une feature n'est pas absolue. Elle est conditionnée par
l'écosystème de la scène. 48% d'action avec f35 à 22 permet l'intrigue.
43% d'action avec f35 à 53 la détruit."

## Principe de Non-Additivité
"Les types ne se cumulent pas simplement. Ils interagissent, s'inhibent,
se renforcent. ACTION × DIALOGUE ≠ ACTION + DIALOGUE."

## Principe d'Émergence
"La qualité finale d'un assemblage peut dépasser la somme de ses
composants si le dosage, les seuils et les interactions sont maîtrisés."

---

# 7. DÉCISION DE SCELLEMENT

La Phase R est SCELLABLE avec ce qui existe.
Le plan R-8 est le PROCHAIN CHANTIER, pas un bloquant.

| Ce qu'on scelle | Ce qu'on documente comme futur |
|-----------------|-------------------------------|
| GB 42f à 2000w (Spearman 0.79) | Normalisation typologique pondérée |
| Pente d'endurance | Matrice d'interactions |
| Classifieur de passage | Seuils de basculement |
| Score de confiance | Score d'assemblage |
| Corpus 611 œuvres | Macro-architecture |

---

*OMEGA — Synthèse des Visions & Plan R-8*
*"On ne mesure plus des mots. On mesure l'architecture de la pensée."*
*Phase R : PASS — 2026-03-21*
*Architecte Suprême : Francky*
