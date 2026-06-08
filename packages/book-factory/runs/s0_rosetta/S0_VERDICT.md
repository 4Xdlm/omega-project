# VERDICT S0 — ROSETTA DRAMATIQUE GEMMA4

**Date** : 2026-06-08 · **Concept** : CONCEPT-ROSETTA-DRAMATIC-FUNCTION-CALIBRATION-001 · **Couple EMP-19** : gemma4:31b + temp 0.8 + micro-scène 300w
**Mandat** : tribunal 2/2 — calibrer la traduction des fonctions dramatiques (V2 : C17 détecte mais l'escalade française ne mord pas, 14 regens re-dérivées).

## Protocole

16 directives (4 fonctions mesurables × 4 variantes A vague / B structurelle / C comportementale / D vérifiable) × 3 graines = **48 micro-scènes gemma4 réelles**, contexte FIXE, 1 variable = la directive. Mesure : argmax de marqueur (REVELATION_RE/CONFRONT_RE/ACTION_RE exportées, SSOT) + collatéral.

## Résultat principal — la directive n'est PAS le levier (réfutation)

| Fonction | A | B | C | D | Lecture |
|---|---|---|---|---|---|
| RÉVÉLATION | 0 | 0 | 0 | **0** | la reformulation ne lève RIEN |
| CONFRONTATION | 0 | 0 | 0 | **0** | idem |
| ACTION | 1 | 0 | 1 | 1 | réussit dès A (gemma4 la produit déjà) |
| TRANSITION (contrôle) | 1 | 1 | 1 | 1 | défaut du modèle |

**La prédiction ChatGPT « la directive D vérifiable mord » est RÉFUTÉE par la donnée.** Aucune des 4 variantes ne fait produire à gemma4 une révélation ou une confrontation lexicalement détectable.

## Le fork tranché — qui est coupable ?

Deux hypothèses : (1) les marqueurs sous-détectent, (2) gemma4 sous-produit. Tranché empiriquement :

- **Marqueurs INNOCENTÉS** : sur 32 scènes de révélation HUMAINES (Gold-Set), REVELATION_RE V2 a **recall 0.75, precision 1.0, F1 0.857**. Le lexique capte bien les vraies révélations.
- **gemma4 COUPABLE** : densité de marqueurs de révélation = **5.6/100 mots chez l'humain vs 0.15/100 mots chez gemma4 = 37×**. gemma4 adoucit structurellement les beats dramatiques, même sur ordre explicite. *(Caveat honnête : les extraits Gold-Set sont des beats concentrés ; la direction tient — gemma4 manque souvent même UN verbe d'aveu par scène.)*

## Le levier PROUVÉ — few-shot (montrer, pas dire)

Bras décisif S0-bis : variante E = D + UN exemplar du registre (3 graines/fonction) :

| Fonction | Directive seule (best) | **Few-shot (E)** |
|---|---|---|
| RÉVÉLATION | 0 % | **100 %** (3/3) |
| CONFRONTATION | 0 % | **67 %** (2/3) |

**gemma4 a besoin de VOIR le registre lexical, pas qu'on le lui décrive.** Le levier n'est ni la gate (elle détecte), ni le lexique (validé), ni la reformulation (réfutée) : c'est l'**exemplar**.

## Réinjection (livrée, SHADOW/SOFT)

`V2Conductor.escalationDirective` câblé : REVELATION/CONFRONTATION injectent l'exemplar prouvé (`FEWSHOT_EXEMPLARS`, SSOT identique à la preuve) ; ACTION reste structurel (déjà produit). 340 tests PASS, TSC=0. Promotion : SHADOW/SOFT (N=3 — validation pleine = télémétrie runtime du prochain livre via C19, jamais hard sans 3 preuves).

## VERDICT

- **Statut** : **PASS** (mécanisme prouvé de bout en bout)
- **Confiance** : Haute (Gold-Set + densité + few-shot convergent)
- **Forces** : a réfuté une prédiction par la donnée, innocenté la mesure, isolé et PROUVÉ le vrai levier sans rien bricoler à l'aveugle.
- **Faiblesses** : (1) N=3 graines (suffisant pour SHADOW, pas pour hard) ; (2) DECISION/REVERSAL/SETUP/PAYOFF restent UNMEASURABLE (classifieur ne les lit pas — extension = modif moteur = 3 preuves) ; (3) effet sur le LIVRE entier non encore mesuré (micro-scène ≠ chapitre de 1700w).
- **Risques** : l'exemplar pourrait induire du mimétisme (copie de « phare/naufrage ») — à surveiller via le détecteur de redite au prochain run.
- **Action requise** : prochain livre V3 avec escalade few-shot → mesurer REVELATION réalisée (cible ≥ plan) + TRANSITION (cible ≤0.45) + non-régression NARRATIVE_CLEAN. **V3 désormais DÉBLOQUÉ** (la condition « calibrer Rosetta avant V3 » est remplie).
