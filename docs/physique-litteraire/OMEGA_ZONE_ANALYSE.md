# Zone OMEGA — Analyse des 4 leviers

**Date** : 2026-04-01 | **Modele** : MINIMAL v2 (FL, I, Omega, T) | **AUC** : 0.9728

---

## Cibles Zone OMEGA

| Variable | Cible | Hemingway | Fitzgerald | Batch moy. | Scribe OMEGA |
|----------|-------|-----------|------------|------------|--------------|
| FL | <= 0.25 | 0.25 | 0.25 | 0.245 | **0.414** |
| MS | >= 0.85 | 0.85 | 0.85 | 0.846 | **0.717** |
| I | >= 0.65 | 0.65 | 0.65 | 0.548 | **0.120** |
| T | >= 0.75 | 0.75 | 0.75 | — | **0.577** |
| Omega | >= 0.72 | 0.72 | 0.72 | 0.694 | 0.000 (fragment) |

---

## P0 : I (protagoniste) — 0.12 a 0.65 | Delta : +0.53

### Ce qui change dans la prose Scribe

Le Scribe OMEGA genere actuellement des scenes independantes avec des
protagonistes differents (Mathieu, Theo, Pierre, Marchand, Claire...).
Le NLP detecte une prose "sans personnage central" → I ecrase a 0.12.

**Action** : Forcer un protagoniste unique et nomme en POV 3e focalisee.

| Aspect | Avant | Apres |
|--------|-------|-------|
| Protagoniste | Multiple/anonyme | **Unique, nomme** |
| POV | 3e omniscient | **3e focalisation interne** |
| Arc | Scenes isolees | **Arc continu sur le chapitre** |
| I_proxy v2 | focal=0.27, ancrage=1.00 | focal>0.50, ancrage>0.60 |

**Impact PVI estime** : +0.53 sur I → PVI x3-5 (de ~0.01 a ~0.05-0.15)
**Faisabilite** : HAUTE — changement de prompt Scribe uniquement.
Le moteur produit deja des proses incarnees (T_sensoriel=0.90).
Il suffit de canaliser cette incarnation vers UN personnage.

---

## P1 : FL (friction lexicale) — 0.41 a 0.25 | Delta : -0.16

### Levier post-traitement

Le Scribe produit un vocabulaire soutenu ("chuintement", "boursoufflures",
"melopee", "varech") et des phrases longues (moy > 35 mots/phrase).
FL=0.41 est comparable a Proust (0.45) ou Houellebecq (0.26).

**Action** : Post-processeur FL en 3 passes.

| Passe | Action | Exemple |
|-------|--------|---------|
| 1 | Remplacer mots rares (freq < 1e-6) par synonymes courants | "chuintement" → "sifflement" |
| 2 | Couper les phrases > 30 mots en 2 | "Elle sentait le poids... et quand..." → "... . Quand..." |
| 3 | Eliminer les subordinations excessives | sub_per_sentence de 3.0 a 1.5 |

**Impact PVI estime** : FL 0.41→0.25, coefficient -2.54 → gain logit +0.41
**Faisabilite** : MOYENNE — necessite un dictionnaire de frequences FR
et un splitter syntaxique (spaCy dependency parse).
Risque : perte de musicalite (MS pourrait baisser).

---

## P2 : T_rel (transportation relationnelle) — 0.26 a 0.60 | Delta : +0.34

### Levier prompt

T_sensoriel est deja excellent (0.90). T_situationnel correct (0.44).
Mais T_relationnel est catastrophique (0.26) — la prose manque de dialogue,
d'interactions et d'enjeux interpersonnels.

**Action** : Injecter des contraintes relationnelles dans le prompt Scribe.

| Contrainte | Impact |
|-----------|--------|
| Minimum 2 personnages par scene | Active T_relationnel |
| Minimum 3 echanges de dialogue | dialogue_norm + v_norm |
| Un conflit interpersonnel explicite | v_density augmente |
| Pronoms relationnels (tu/vous/il/elle) | p_norm augmente |

**Impact PVI estime** : T passe de 0.577 a ~0.70-0.75
**Faisabilite** : HAUTE — changement de prompt, pas de code.
Compatible avec P0 (protagoniste unique + interlocuteur).

---

## P3 : MS (mystere structurel) — 0.72 a 0.85 | Delta : +0.13

### Levier structurel

MS mesure le maintien de la tension informationnelle. Le Scribe tend a
"boucler" chaque image et chaque paragraphe — pas assez de questions ouvertes.

**Action** : Contrainte structurelle "fin ouverte par paragraphe".

| Technique | Effet |
|-----------|-------|
| Phrase interrogative en fin de paragraphe | Tension informationnelle |
| Ellipses (...) sur les transitions | Mystere syntaxique |
| Indices non resolus dans chaque section | Curiosite lecteur |
| Retardement de la revelation | Arc de suspense |

**Impact PVI estime** : MS 0.72→0.85, impact indirect sur T_narratif (v3)
**Faisabilite** : MOYENNE — necessite calibration du prompt pour eviter
l'artificialite des questions. Equilibre subtil.

---

## Cartographie Zone OMEGA

### Titres EN dans la Zone (references)

| Titre | FL | MS | I | T | PVI |
|-------|-----|-----|-----|-----|------|
| Hemingway — Old Man and the Sea | 0.25 | 0.85 | 0.65 | 0.75 | 2.441 |
| Fitzgerald — Great Gatsby | 0.25 | 0.85 | 0.65 | 0.75 | 1.699 |

Aucun titre contemporain (2022-2025) n'atteint la Zone OMEGA.
Top 5 les plus proches : Haunting Adeline, Frozen River, Fourth Wing,
Happy Place, In a Holidaze — tous a distance > 0.15.

### Titres FR les plus proches

| Titre | FL | I | Omega | PVI | Distance Zone |
|-------|-----|-----|-------|-----|--------------|
| Jacaranda (Gael Faye) | 0.275 | 0.380 | 0.65 | 0.349 | ~0.35 |
| Stupeur (Nothomb) | 0.299 | 0.800 | 0.72 | 1.457 | ~0.20 |
| Millenium 1 FR | 0.256 | 0.750 | 0.82 | 1.941 | ~0.15 |

**Millenium 1 FR est le titre FR le plus proche de la Zone OMEGA.**
Distance ~0.15 principalement due a FL=0.256 (> 0.25) et MS=0.65 (< 0.85).

### Distance de la prose Scribe actuelle

```
Zone OMEGA :    FL=0.25  MS=0.85  I=0.65  T=0.75  Omega=0.72
Scribe actuel : FL=0.41  MS=0.72  I=0.12  T=0.58  Omega=N/A

Delta total :   -0.16    +0.13    +0.53   +0.17   N/A
```

**Distance euclidienne normalisee : ~0.60** (sur une echelle 0-1).
Le Scribe est a 60% du chemin vers la Zone OMEGA.
Le levier dominant est I (88% du delta total).

---

## Estimation cumulative

Si P0+P1+P2+P3 sont tous appliques :

| Variable | Avant | Apres (estime) | Zone OMEGA |
|----------|-------|----------------|------------|
| FL | 0.414 | ~0.25 | <= 0.25 ATTEINT |
| MS | 0.717 | ~0.85 | >= 0.85 ATTEINT |
| I | 0.120 | ~0.65 | >= 0.65 ATTEINT |
| T | 0.577 | ~0.75 | >= 0.75 ATTEINT |
| Omega | 0.000 | ~0.72 (texte complet) | >= 0.72 ATTEINT |

**PVI estime avec toutes corrections : ~1.5-2.0** (Fitzgerald territory)
**Probabilite bestseller : ~65-75%** (PASS)

---

## Priorites d'implementation

| Priorite | Levier | Impact PVI | Effort | ROI |
|----------|--------|-----------|--------|-----|
| **P0** | I (protagoniste unique) | +++ | Faible (prompt) | **TRES ELEVE** |
| **P2** | T_rel (dialogue/conflit) | ++ | Faible (prompt) | **ELEVE** |
| **P1** | FL (post-traitement) | ++ | Moyen (code) | MOYEN |
| **P3** | MS (questions ouvertes) | + | Moyen (calibration) | MOYEN |

**Recommandation** : Implementer P0 + P2 d'abord (prompt seulement, 0 code).
Mesurer l'impact. Puis P1 + P3 si necessaire.

---

**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**
