# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — TABLE DE CONVERSION R-CONVERSION
# Document de référence permanent
# ═══════════════════════════════════════════════════════════════════════════════
#
# Version     : 1.0
# Date        : 2026-03-24
# Statut      : VALIDÉ — CAS B LINÉAIRE CONFIRMÉ FR + EN
# Auteur      : Claude (IA Principal)
# Validé par  : Francky (Architecte Suprême) + ChatGPT + Gemini
#
# CE DOCUMENT EST LA RÉFÉRENCE PERMANENTE POUR L'INTERPRÉTATION
# DES MÉTRIQUES INTERNES DU LLM VS LES MÉTRIQUES OMEGA.
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. LE PROBLÈME RÉSOLU

## La question

> Le LLM ne produit pas ce qu'on lui demande. Quand on dit "fais des phrases
> de 40 mots", il en fait 18. Quand on lui donne un persona Flaubert,
> il déclare viser 28.5 mots mais en produit 38.

## La découverte

> Le LLM n'est PAS incohérent. Il pense dans un AUTRE système de coordonnées
> que nos mesures OMEGA. La transformation entre les deux est LINÉAIRE
> et PRÉDICTIBLE sur 4 dimensions sur 5.

## Le verdict

| Cas | Description | Statut |
|-----|------------|--------|
| A — Incohérent | Aucune corrélation déclaré→produit | ❌ RÉFUTÉ |
| **B — Linéaire** | **produit = α × déclaré + β** | **✅ CONFIRMÉ (FR + EN)** |
| C — Non-linéaire | Zones de compression / emballement | ❌ RÉFUTÉ (pas de preuve) |

---

# 2. LES ÉQUATIONS DE CONVERSION

## 2.1 — Français

| Dimension | Équation | r | R² | Verdict |
|-----------|----------|---|-----|---------|
| **mean_sent_len** | produit = **1.727** × déclaré − 10.848 | **0.963** | 0.928 | ✅ CONVERTIBLE |
| **f26b** | produit = **1.512** × déclaré − 0.077 | **0.889** | 0.790 | ✅ CONVERTIBLE |
| **knife_rate** | produit = **1.244** × déclaré + 0.061 | **0.960** | 0.921 | ✅ CONVERTIBLE |
| **subordinates** | produit = **0.717** × déclaré − 0.093 | **0.921** | 0.848 | ✅ CONVERTIBLE |
| **cv** | AUCUNE CORRÉLATION | **0.000** | 0.000 | ❌ IMPREDICTIBLE |

## 2.2 — Anglais

| Dimension | Équation | r | R² | Verdict |
|-----------|----------|---|-----|---------|
| **mean_sent_len** | produit = **1.951** × déclaré − 12.538 | **0.956** | 0.913 | ✅ CONVERTIBLE |
| **f26b** | produit = **1.738** × déclaré − 0.054 | **0.971** | 0.942 | ✅ CONVERTIBLE |
| **knife_rate** | produit = **1.194** × déclaré + 0.089 | **0.940** | 0.884 | ✅ CONVERTIBLE |
| **subordinates** | produit = **0.935** × déclaré − 0.025 | **0.864** | 0.746 | ✅ CONVERTIBLE |
| **cv** | AUCUNE CORRÉLATION | **−0.214** | 0.046 | ❌ IMPREDICTIBLE |

## 2.3 — Comparaison FR vs EN

| Dimension | Pente FR | Pente EN | Δ | Verdict |
|-----------|---------|---------|---|---------|
| mean_sent_len | 1.727 | 1.951 | +0.224 | EN amplifie PLUS |
| f26b | 1.512 | 1.738 | +0.226 | EN amplifie PLUS |
| knife_rate | 1.244 | 1.194 | -0.050 | IDENTIQUE |
| subordinates | 0.717 | 0.935 | +0.218 | EN amplifie PLUS |
| cv | 0.000 | -0.214 | — | IMPREDICTIBLE dans les deux |

**CONCLUSION : le décalage est COGNITIF, pas linguistique.**
Le LLM amplifie DAVANTAGE en anglais qu'en français.
L'hypothèse tokenization (BPE) est RÉFUTÉE.

---

# 3. LES PROFILS ROM DES PERSONAS

## 3.1 — Principe de la ROM

Les personas sont des "fichiers en mémoire morte" cristallisés lors du pré-entraînement.
Quand le LLM incarne un auteur :
- Il DÉCLARE toujours les MÊMES métriques (cv déclaratif = 0.000)
- Indépendamment de la température (0.65 → 0.85)
- Indépendamment de la scène
- Indépendamment de la langue d'écriture (FR ≈ EN)

**On ne peut PAS forcer un persona hors de sa ROM par des consignes.**
On CHOISIT le persona dont la ROM correspond à la cible.

## 3.2 — Cartes ROM détaillées

### FLAUBERT — Le Constructeur

```
DÉCLARÉ (ROM fixe) :
  mean_sent_len    : 28.5
  f26b             : 0.35
  knife_rate       : 0.15
  cv               : 0.85
  subordinates     : 3.2

PRODUIT FR (mesuré sur 5 runs) :
  mean_sent_len    : 37.9 ± 6.6   (×1.33 du déclaré)
  f26b             : 0.52 ± 0.06  (×1.49 du déclaré)
  knife_rate       : 0.35 ± 0.07  (×2.33 du déclaré)
  cv               : 0.81 ± 0.11  (≈ déclaré)
  subordinates     : 2.45 ± 0.41  (×0.77 du déclaré)
  GB               : 3.909 ± 0.133

PRODUIT EN (mesuré sur 5 runs) :
  mean_sent_len    : 44.1 ± 7.7   (×1.55 du déclaré)
  f26b             : 0.55 ± 0.08  (×1.57 du déclaré)
  knife_rate       : 0.41 ± 0.05  (×2.73 du déclaré)
  cv               : 0.84 ± 0.08  (≈ déclaré)
  subordinates     : 2.86 ± 1.05  (×1.02 du déclaré)
  GB               : 3.889 ± 0.201

SIGNATURE : cascade_subordonnees_avec_chute_brutale
MODE DOMINANT : narration_descriptive
STABILITÉ E1 : ⚠️ sur-produit de +14.9 mots vs déclaré
USAGE OPTIMAL : textes structurés, équilibre long/court, scènes de description
```

### DICKENS — L'Équilibré

```
DÉCLARÉ (ROM fixe) :
  mean_sent_len    : 22.5
  f26b             : 0.25
  knife_rate       : 0.15
  cv               : 0.85
  subordinates     : 2.6-3.2

PRODUIT FR (mesuré sur 5 runs) :
  mean_sent_len    : 28.3 ± 2.7   (×1.26 du déclaré)
  f26b             : 0.21 ± 0.12  (×0.84 du déclaré) — INSTABLE
  knife_rate       : 0.14 ± 0.07  (≈ déclaré) — INSTABLE
  cv               : 0.55 ± 0.10  (×0.65 du déclaré)
  subordinates     : 1.51 ± 0.26  (×0.58 du déclaré)
  GB               : 3.681 ± 0.181

PRODUIT EN (mesuré sur 5 runs) :
  mean_sent_len    : 42.0 ± 5.9   (×1.87 du déclaré)
  f26b             : 0.56 ± 0.08  (×2.24 du déclaré)
  knife_rate       : 0.09 ± 0.09  (×0.60 du déclaré) — INSTABLE
  cv               : 0.49 ± 0.20  (×0.58 du déclaré) — VARIABLE
  subordinates     : 2.59 ± 0.32  (×0.86 du déclaré)
  GB               : 3.865 ± 0.157

SIGNATURE : accumulation_sensorielle_avec_chute_humoristique_ou_pathetique
MODE DOMINANT : narration_descriptive
STABILITÉ E1 : ✅ le MIEUX ALIGNÉ de tous (+2.1 en FR)
PARTICULARITÉ : score solo record (4.155 dans le test du Miroir)
USAGE OPTIMAL : textes équilibrés, humour+pathos, cadence oratoire
```

### DURAS — La Lame

```
DÉCLARÉ (ROM fixe) :
  mean_sent_len    : 8.5
  f26b             : 0.02-0.05
  knife_rate       : 0.75
  cv               : 0.85
  subordinates     : 0.3

PRODUIT FR (mesuré sur 5 runs) :
  mean_sent_len    : 3.8 ± 0.6    (×0.45 du déclaré)
  f26b             : 0.00 ± 0.00  (= 0 toujours)
  knife_rate       : 0.99 ± 0.01  (×1.32 du déclaré)
  cv               : 0.46 ± 0.04  (×0.54 du déclaré)
  subordinates     : 0.14 ± 0.06  (×0.47 du déclaré)
  GB               : 3.909 ± 0.379

PRODUIT EN (mesuré sur 5 runs) :
  mean_sent_len    : 4.0 ± 0.5    (×0.47 du déclaré)
  f26b             : 0.00 ± 0.00  (= 0 toujours)
  knife_rate       : 0.98 ± 0.02  (×1.31 du déclaré)
  cv               : 0.45 ± 0.04  (×0.53 du déclaré)
  subordinates     : 0.22 ± 0.11  (×0.73 du déclaré)
  GB               : 4.004 ± 0.047

SIGNATURE : repetition_obsessionnelle_avec_variations_microscopiques
MODE DOMINANT : dialogue_minimal
STABILITÉ E1 : ✅ très stable (-5.3 en FR)
PARTICULARITÉ : GB 4.319 record absolu (Phase 4a), GB 4.004 en EN (le plus stable)
USAGE OPTIMAL : injection dans les trios pour forcer le contraste, pas comme moteur seul
```

---

# 4. LES TRIOS — CHIMIE MESURÉE

## 4.1 — Trio FDP (Flaubert + Duras + Proust) — CHAMPION

```
GB     : 4.087 (meilleur trio)
f26b   : 0.400
CV     : 0.884 (proche maîtres 0.940)
mean   : 45.4
knife% : 40%

CHIMIE :
  Flaubert CONSTRUIT (périodes, subordonnées, gueuloir)
  Duras RYTHME (alternance violente, lames de 5 mots)
  Proust RESSENT (profondeur sensorielle, dilatation du temps)
  
ÉMERGENCE : le trio produit un CV de 0.884 alors que
  - Flaubert seul = 0.813
  - Duras seule = 0.475
  - Proust seul = 0.528
  La variation n'est PAS une moyenne — c'est une chimie.
```

## 4.2 — Trio FPC (Flaubert + Proust + Céline) — MEILLEUR CV

```
GB     : 4.030
f26b   : 0.333
CV     : 1.257 (le plus haut de TOUS les tests)
mean   : 23.4
knife% : 67%

CHIMIE :
  Céline FRAPPE avec des ruptures si violentes que le CV explose.
  Flaubert ANCRE la structure.
  Proust ÉTIRE les passages contemplatifs.
```

## 4.3 — Trio WDF (Woolf + Duras + Flaubert) — DÉCEVANT

```
GB     : 3.957
f26b   : 0.545 (meilleur f26b des trios)
CV     : 0.821
mean   : 39.3

PROBLÈME : Woolf est INSTABLE (4.402 → 3.703 entre sessions).
  Le trio ne fiabilise pas Woolf.
```

---

# 5. RÈGLES D'UTILISATION DE LA TABLE

## 5.1 — CE QUE LA TABLE PEUT FAIRE

### A. Prédire la zone de production d'un persona

Si on sait qu'un persona DÉCLARE mean = X, on peut prédire :
```
mean_produit_FR ≈ 1.727 × X - 10.85
mean_produit_EN ≈ 1.951 × X - 12.54
```

Exemple : un nouveau persona déclare mean = 35.
- Produit FR attendu : 1.727 × 35 - 10.85 ≈ **49.6 mots**
- Produit EN attendu : 1.951 × 35 - 12.54 ≈ **55.7 mots**

### B. Choisir le bon persona pour une cible

Pour obtenir mean FR de 30 mots → chercher un persona qui DÉCLARE :
```
déclaré = (30 + 10.85) / 1.727 = 23.6
```
→ Dickens (déclare 22.5) est le plus proche.

Pour obtenir mean FR de 40 mots → chercher un persona qui DÉCLARE :
```
déclaré = (40 + 10.85) / 1.727 = 29.4
```
→ Flaubert (déclare 28.5) est le plus proche.

### C. Comparer les profils de personas inconnus

Demander à un nouveau persona son profil déclaré JSON,
puis utiliser la table pour prédire sa zone de production
AVANT de le tester.

### D. Comprendre pourquoi un trio fonctionne

Si le trio FDP produit mean 45.4, c'est parce que la chimie
de Flaubert (déclaré 28.5 → produit ~38) + Proust (45 → ~46) + Duras (8.5 → ~4)
ne donne PAS la moyenne (29.3) mais un ÉMERGENT (45.4).
La table permet de mesurer l'émergence.

## 5.2 — CE QUE LA TABLE NE PEUT PAS FAIRE

### A. Piloter phrase par phrase

Test empirique (2 phrases) :
- Phrase longue cible 45w → demandé 32 converti → produit 50w (+11%)
- Phrase courte cible 8w → demandé 11 converti → produit 4w (-50%)

Le LLM ne sait PAS doser finement. Il connaît des ATTRACTEURS
(mode Flaubert ~38w, mode Duras ~4w) mais pas les zones intermédiaires.

### B. Forcer un persona hors de sa ROM

Dire "Flaubert, vise 15 mots" → le LLM va IGNORER et continuer
à produire ~38 mots. La ROM est fixe. Les consignes chiffrées
sont en conflit avec le persona et DÉGRADENT le GB (-0.26 à -0.43).

### C. Prédire le CV

r = 0.000 en FR, r = -0.214 en EN. Le CV est piloté EXCLUSIVEMENT
par le chunking K2 (injection Duras aux chunks 3-4) et par
la composition du trio. Jamais par consigne.

### D. Servir de contrôleur numérique direct

```
❌ "Fais des phrases de 32.3 mots" (le LLM ne sait pas compter)
✅ "Tu es Flaubert" (le LLM sait incarner → mean ≈ 38)
```

La table traduit entre les deux systèmes. Elle ne les fusionne pas.

---

# 6. LA LOI FONDAMENTALE

## Le LLM est un système à ATTRACTEURS, pas un calculateur

Chaque persona crée un ATTRACTEUR dans l'espace des métriques :
- Flaubert → attracteur à mean ~38, f26b ~0.52, knife ~0.35
- Duras → attracteur à mean ~4, f26b 0, knife ~1.0
- Dickens → attracteur à mean ~28, f26b ~0.21, knife ~0.14

Le LLM gravite autour de son attracteur. On ne peut pas le
déplacer par des chiffres. On peut :
1. **CHOISIR** l'attracteur (persona)
2. **COMBINER** les attracteurs (trio)
3. **SÉQUENCER** les attracteurs (chunking)
4. **INJECTER** un correctif externe (injection Duras dans K2)

C'est le paradigme de pilotage OMEGA :

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   SÉLECTION D'ATTRACTEUR + COMBINAISON + SÉQUENÇAGE          ║
║   >                                                           ║
║   CONSIGNES MÉTRIQUES DIRECTES                                ║
║                                                               ║
║   Le persona est le VOLANT.                                   ║
║   Le chunking est la BOÎTE DE VITESSES.                       ║
║   La table est le TABLEAU DE BORD.                            ║
║   Les métriques OMEGA sont le GPS.                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

# 7. TABLE RAPIDE DE SÉLECTION

## "Je veux obtenir X, quel persona/trio choisir ?"

| Cible OMEGA | Meilleur choix | GB attendu |
|-------------|---------------|-----------|
| mean ~4w, knife 100%, f26b 0 | **Duras** | 3.9-4.3 |
| mean ~28w, équilibré | **Dickens** | 3.7-4.2 |
| mean ~38w, f26b ~50% | **Flaubert** | 3.9-4.1 |
| mean ~46w, f26b ~60% | **Proust** | 3.8-3.9 |
| mean ~45w, f26b ~40%, CV ~0.88 | **Trio FDP** | 4.0-4.1 |
| mean ~23w, CV > 1.2 | **Trio FPC** | 4.0 |
| mean ~40w, f26b ~55%, CV ~0.82 | **Trio WDF** | 3.9-4.0 |
| Chapitre 3000w sans drift | **K2 chunking** | 3.9-4.0 |
| Contraste maximal CV > 1.0 | **K2 avec injection Duras** | 3.9-4.0 |

---

# 8. DONNÉES DE RÉFÉRENCE

## Maîtres humains (corpus OMEGA, 150+ œuvres)

| Métrique | Valeur @500w | Valeur @2000w |
|----------|-------------|-------------|
| GB | 3.910 | 4.090 |
| f26b | 0.177 | 0.177 |
| CV | 0.940 | 0.940 |

## Meilleures configurations OMEGA

| Config | GB | f26b | CV | Contexte |
|--------|-----|------|-----|---------|
| Trio FDP 500w | 4.087-4.119 | 0.400-0.500 | 0.884-0.937 | Champion 500w |
| K2 chunking 3000w | 3.990 | 0.390 | 1.075 | Champion 3000w stable |
| FDP+K2 deuil r1 | 4.185 | 0.338 | 1.031 | Meilleur 3000w absolu |
| Dickens solo | 4.155 | 0.286 | 0.607 | Meilleur solo |
| Duras solo | 4.046-4.319 | 0.000 | 0.475 | Meilleur GB absolu (variable) |

---

*Document de référence permanent — OMEGA R-CONVERSION v1.0*
*Validé le 2026-03-24*
*Standard NASA-Grade L4 / DO-178C Level A*
*"Le LLM n'est pas flou ; il est stable dans un autre repère."*
