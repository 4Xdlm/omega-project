# OMEGA BLOC 2 — SHADOW JUDGES REPORT
**Date** : 2026-03-30 | **Branch** : phase-r-metrology-rebuild
**Runs** : 31/32 OK (1 ETIMEDOUT sur confrontation run 7) | **4 scenes x 8 runs**
**Mode** : SHADOW D1 — 0 changement verdict production

---

## 1. Resultats shadow judges

| Metrique | Valeur | Seuil decision | Decision Bloc 3 |
|----------|--------|----------------|-----------------|
| r(CI_L37_corpus, composite) | **0.044** | >= 0.60 | **SHADOW** (reste informatif) |
| r(CI_L37_omega, composite) | **0.063** | >= 0.60 | **SHADOW** (reste informatif) |
| delta profil FR -> EN_min | **+3.0 pts** | > 5 pts | **PAS DE BRANCHING** (delta insuffisant) |
| delta profil FR -> EN_max | **+16.2 pts** | > 5 pts | **BRANCHING CONDITIONNEL** (activer EN_max) |
| dual-scale delta moyen | **0.00 pts** | >= 1.5 | **PAS D'ACTIVATION** (delta nul) |
| r(dual, composite) | **0.939** | >= 0.60 | **INTEGRER** (quasi-identique au composite) |
| % cliff > 0.30 | **81%** (25/31) | > 50% | **GATE ACTIF** (fonctionne) |
| % cliff < 0.10 | **0%** (0/31) | < 20% | **OK** (pas de fermeture semantique) |
| % cliff = 0.30 exactement | **19%** (6/31) | — | Seuil minimal atteint |

---

## 2. Analyse detaillee par composant

### 2.1 CI_L37 — Complexite linguistique

| Metrique | CI_L37_corpus | CI_L37_omega |
|----------|---------------|--------------|
| Moyenne | 98.1 | 99.2 |
| Mediane | 100.0 | 100.0 |
| P10 | 95.7 | 100.0 |
| P90 | 100.0 | 100.0 |
| r(composite) | **0.044** | **0.063** |

**Diagnostic** : CI_L37 est sature a ~100 pour toutes les generations. La prose Scribe OMEGA
produit systematiquement des phrases longues a subordination elevee (sub_per_sentence
moyen = 3.0, f26b moyen = 0.43), ce qui place CI_L37 au plafond. Aucune correlation
avec le composite car aucune variance.

**Correlations croisees** :
- r(CI_L37_omega, sub_per_sentence) = 0.295 (faible)
- r(CI_L37_omega, f26b_long_sent_rate) = 0.549 (moderee)
- r(sub_per_sentence, composite) = -0.111 (nul)
- r(f26b, composite) = -0.119 (nul)

**Decision** : REJETER pour integration J_structure. CI_L37 n'apporte pas d'information
discriminante sur la prose OMEGA — il faudrait varier le registre stylistique pour observer
une variance. Conserver en shadow pour surveillance.

### 2.2 Profils linguistiques FR / EN

| Profil | Moyenne | Mediane | P10 | P90 |
|--------|---------|---------|-----|-----|
| FR | 67.4 | 67.3 | 65.6 | 70.1 |
| EN_min | 70.5 | 72.1 | 68.6 | 74.2 |
| EN_max | 83.6 | 84.3 | 81.3 | 86.8 |

| Delta | Valeur | Seuil | Significatif |
|-------|--------|-------|-------------|
| FR -> EN_min | +3.0 pts | > 5 pts | **NON** |
| FR -> EN_max | +16.2 pts | > 5 pts | **OUI** |
| EN_min -> EN_max | +13.2 pts | — | Ecart substantiel |

**Diagnostic** : La prose generee en francais score FR=67 et EN_max=84. L'ecart FR->EN_max
de +16 points est massif, suggerant que les coefficients EN_max sont beaucoup plus
genereux que FR. L'ecart FR->EN_min est non significatif (3 pts).

**Decision** : Activer le branching conditionnel EN_max dans Bloc 3. Pas de branching
EN_min (trop proche de FR).

### 2.3 Dual-scale

| Metrique | Valeur |
|----------|--------|
| Dual combined moyen | 88.94 |
| Composite moyen | 88.95 |
| Delta | **0.00** |
| r(dual, composite) | **0.939** |
| RMSE | 0.76 |

**Diagnostic** : Le dual-scale est quasi-identique au composite (r=0.94, delta=0.00).
La composante arc du dual-scale n'apporte pas de divergence mesurable car le buffer
d'historique est encore court (5 runs max). Le dual-scale est un proxy fidele du composite
mais ne fournit pas d'information supplementaire dans sa forme actuelle.

**Decision** : INTEGRER comme metrique de monitoring (excellente correlation). Ne pas
remplacer le composite — utiliser comme validation croisee.

### 2.4 Cliff gate

| Metrique | Valeur |
|----------|--------|
| cliff_score moyen | 0.450 |
| P25 | 0.402 |
| P75 | 0.503 |
| P95 | 0.648 |
| > 0.30 (gate actif) | 81% (25/31) |
| = 0.30 (seuil minimal) | 19% (6/31) |
| < 0.10 (fermeture) | 0% (0/31) |

**Diagnostic** : Le cliff gate s'active sur 81% des runs (score > 0.30), declenchant
la reecriture de la derniere phrase. Les 19% restants atteignent exactement 0.30 (seuil
limite). Aucun run ne presente de fermeture semantique (cliff < 0.10).

Le fix CLIFF-FIX est fonctionnel : le gate post-duel+microsurgery fonctionne correctement.
Le taux d'activation de 81% indique que la prose brute tend vers des fins ouvertes,
ce qui est le comportement attendu pour des "briques" narratives.

**Decision** : Gate actif valide. Le seuil 0.30 est bien calibre.

---

## 3. Par scene — composite moyen et variance

| Scene | N | Composite moyen | Ecart-type | Min | Max | Stabilite |
|-------|---|-----------------|------------|-----|-----|-----------|
| contemplation | 8 | **90.49** | 2.12 | 86.4 | 92.1 | BONNE |
| revelation | 8 | **89.52** | 1.57 | 86.4 | 91.0 | **EXCELLENTE** |
| menace | 8 | **88.23** | 2.02 | 83.8 | 90.5 | BONNE |
| confrontation | 7 | **87.36** | 1.76 | 85.2 | 89.7 | BONNE |
| **Global** | **31** | **88.95** | **2.15** | **83.8** | **92.1** | — |

**Scenes les plus stables** : revelation (std=1.57) — la scene la plus reproductible.
**Scenes les plus instables** : contemplation (std=2.12) — variance legerement plus haute
mais reste dans les normes (CV = 2.3%).

**Diagnostic** : Toutes les scenes affichent un ecart-type < 2.5, ce qui est excellent pour
un moteur generatif. Le coefficient de variation global (2.4%) indique une stabilite forte.

---

## 4. Decisions automatiques pour BLOC 3

### VALIDE — Pret pour integration

| Composant | Evidence | Action Bloc 3 |
|-----------|----------|---------------|
| **DUAL_COMBINED** | r=0.939, RMSE=0.76 | Integrer comme metrique de monitoring / validation croisee |
| **CLIFF GATE** | 81% activation, 0% fermeture | Gate actif confirme, seuil 0.30 maintenu |
| **PROFIL EN_max** | delta +16.2 pts vs FR | Activer branching conditionnel pour scoring EN_max |

### RESTE SHADOW — Pas d'integration

| Composant | Evidence | Raison |
|-----------|----------|--------|
| **CI_L37_corpus** | r=0.044, sature a 100 | Aucune variance — non discriminant sur prose OMEGA |
| **CI_L37_omega** | r=0.063, sature a 100 | Idem — necessiterait variation de registre stylistique |
| **PROFIL FR** | r=-0.023 | Pas de correlation avec qualite composite |
| **PROFIL EN_min** | delta +3.0 pts vs FR | Ecart insuffisant pour justifier un branching |

### NON APPLICABLE

| Composant | Evidence | Note |
|-----------|----------|------|
| **DUAL-SCALE delta** | delta=0.00 | Dual et composite identiques — pas de signal additionnel |

---

## 5. Recommandations Bloc 3

1. **DUAL_COMBINED** : Ajouter au dashboard de monitoring. Alerter si r(dual, composite) < 0.85.
2. **EN_max branching** : Quand langue='en', calculer profil EN_max en parallele. Si EN_max > FR + 10 pts, flag "EN-DIVERGENT".
3. **CI_L37** : Pour le rendre utile, il faudrait generer de la prose a registre varie (commercial vs litteraire). En l'etat, saturation au plafond.
4. **Cliff gate** : Maintenir le seuil 0.30. Surveiller si le taux d'activation baisse sous 50%.

---

## 6. Donnees brutes

- `sessions/SHADOW_BLOC2_COLLECT/shadow_data.json` — 32 entrees (31 OK + 1 erreur)
- `sessions/SHADOW_BLOC2_COLLECT/shadow_analysis.txt` — resume script

---

**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**
**Genere le 2026-03-30 par analyse shadow BLOC 2**
