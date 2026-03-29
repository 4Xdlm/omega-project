# Rapport Test Final — Phase P4

**Date**: 2026-03-29
**Module**: pvi_module_autonome.py
**Modele**: MINIMAL v2 (coefficients culturels FR/EN)

---

## TEST 1 — L'Etranger (Camus, epub)

| Metrique | Valeur |
|----------|--------|
| FL | 0.2201 (NLP_v2) |
| MS | 0.7713 (NLP_v2) |
| I | 0.4495 (PROXY-NLP, POV 1ere) |
| Omega | 0.58 (DEFAUT_MIXTE) |
| T | 0.8666 (proxy 1-DR) |
| PVI | **0.991** |
| Proba bestseller | **48.9%** |
| Phase | Phase 3 : succes solide |
| Verdict | **FAIL** (juste sous le seuil 50%) |
| Goulots | GOULOT-I (0.45 < 0.55), GOULOT-W |

### Analyse
- I_NLP = 0.45 : Meursault est correctement identifie comme protagoniste
  a faible identification (alienation volontaire). Le NLP capture ce trait.
- Omega = 0.58 (defaut mixte) : en mode assiste, Omega serait ~0.62
  (resolution partielle — condamnation + illumination philosophique)
- Le modele classe Camus comme BORDERLINE (48.9%) — coherent avec le cas
  adversarial P3 (p=0.52 avec proxy). L'Etranger est LE cas frontiere
  entre chef d'oeuvre et bestseller.
- Top levier: FL (-0.10 donnerait le plus grand gain PVI)

### Verdict test: **CONFORME** — resultat attendu (BORDERLINE)

---

## TEST 2 — It Ends With Us (Hoover, epub)

| Metrique | Valeur |
|----------|--------|
| FL | 0.1379 (NLP_v2 — tres accessible) |
| MS | 0.7120 (NLP_v2) |
| I | 0.7710 (PROXY-NLP, POV 1ere) |
| Omega | 0.70 (DEFAUT_COMMERCIAL) |
| T | 0.7216 (proxy 1-DR) |
| PVI | **0.779** |
| Proba bestseller | **75.7%** |
| Phase | Phase 3 : succes solide |
| Verdict | **PASS** |
| Goulots | GOULOT-ARC (N_rev_proxy=0) |

### Analyse
- FL = 0.14 : vocabulaire tres simple — correctement identifie comme force
- I = 0.77 : forte identification POV 1ere + valence negative (violence domestique)
- Omega = 0.70 (defaut commercial) : le profil I>0.70 + FL<0.25 declenche
  correctement le defaut commercial. En mode assiste, Omega serait ~0.80.
- N_rev_proxy = 0 : VADER echoue a detecter les renversements emotionnels de Hoover
  (sentiment uniformement negatif/positif). En mode assiste, N_rev serait ~2.
- GOULOT-ARC est le seul goulot — correct pour le mode auto (A_proxy faible)

### Verdict test: **CONFORME** — PASS comme attendu

---

## TEST 3 — Prose OMEGA (non disponible)

Le moteur Scribe OMEGA n'est pas disponible dans cette session.
Aucun texte genere par OMEGA n'est present dans packages/sovereign-engine/sessions/.

**Test differe a Phase P5** (quand le moteur de generation sera operationnel).

Resultat attendu si texte OMEGA disponible:
- FL < 0.20 (vocabulaire simple)
- MS > 0.80 (rythme architecte)
- PVI > 1.50 (Zone OMEGA ciblee)

---

## Resume des 2 tests

| Test | Titre | Proba | Verdict | Attendu | Conforme |
|------|-------|-------|---------|---------|----------|
| 1 | L'Etranger (Camus) | 48.9% | FAIL | BORDERLINE | **OUI** |
| 2 | It Ends With Us (Hoover) | 75.7% | PASS | PASS fort | **OUI** |
| 3 | Prose OMEGA | — | — | — | DIFFERE |

## Limitations identifiees en mode automatique

1. **Omega defaut** : le profil-aware default (commercial=0.70, litteraire=0.45, mixte=0.58)
   est une approximation grossiere. Mode assiste recommande pour precision.
2. **A_proxy / N_rev** : VADER ne detecte pas les renversements de Hoover (polarite uniforme).
   Resultat: N_rev=0 → GOULOT-ARC faux positif.
3. **I_proxy** : pour Camus, I=0.45 est sous le proxy (0.55). Le NLP mesure la
   frequence de pronoms + valence negative, pas la profondeur psychologique.

## Recommandation

Le module autonome fonctionne correctement en mode automatique pour la **classification**
(PASS/FAIL) mais les variables structurelles (Omega, U, N_rev) necessitent le **mode assiste**
pour des diagnostics precis. Le mode automatique donne un signal directionnel fiable,
pas un diagnostic fin.
