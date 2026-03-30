# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — BATCH SCORING BESTSELLERS 2022-2025
# Module PVI autonome — État final + Prochaines étapes
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date           : 2026-03-30
# Commit         : ebcb076f · phase-r-metrology-rebuild
# Standard       : NASA-Grade L4 / DO-178C Level A
# Architecte     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## 1. RÉSULTATS BATCH — 38 TITRES BESTSELLERS 2022-2025

### Top 5 PVI

| # | Titre | PVI | Proba | FL | I | Ω | MS |
|---|-------|-----|-------|----|----|---|-----|
| 1 | It Ends With Us (Hoover) | 2.327 | 82.8% | 0.14 | 0.82 | 0.80 | 0.81 |
| 2 | Haunting Adeline (Carlton) | 2.057 | 77.3% | 0.23 | 0.90 | 0.68 | 0.84 |
| 3 | Fourth Wing (Yarros) | 1.721 | 73.5% | 0.24 | 0.86 | 0.72 | 0.83 |
| 4 | Everyone Killed Someone (Stevenson) | 1.719 | 78.6% | 0.19 | 0.81 | 0.82 | 0.84 |
| 5 | Beach Read (Henry) | 1.717 | 79.6% | 0.19 | 0.83 | 0.78 | 0.84 |

### Distribution verdicts

| Verdict | N | % |
|---------|---|---|
| PASS | 15 | 39% |
| BORDERLINE | 7 | 18% |
| FAIL | 16 | 42% |
| Zone OMEGA | 0 | — |

---

## 2. DÉCOUVERTES CRITIQUES DE CETTE SESSION

**D1 — Plafond MS ~0.84 sur tous les bestsellers EN contemporains**
Aucun titre n'atteint MS ≥ 0.85 (seuil Zone OMEGA).
Gap restant : 0.01-0.04.
Implication : la Zone OMEGA exige une musicalité que les auteurs commerciaux
n'atteignent pas en maintenant le rythme narratif commercial.
OMEGA peut occuper cet espace — coût cognitif de MS complexe = zéro pour la machine.

**D2 — Goulot T dans la romance contemporaine**
Hoover T=0.717 · Henry T=0.679 · Yarros T=0.614
Ces romans sacrifient l'immersion sensorielle (monde générique) au profit de I et Ω.
OMEGA ne fera pas ce compromis.

**D3 — Cas Zevin (Tomorrow×Tomorrow×Tomorrow) : anomalie T**
T=0.10 → FAIL → pourtant 2M+ ventes réelles.
Diagnostic : T actuel = immersion sensorielle physique uniquement.
Le roman de Zevin = immersion cognitive/relationnelle (jeux vidéo, co-création).
→ T v2 requis : T_sensoriel + T_situationnel + T_relationnel

**D4 — I_proxy FR non fiable en mode auto**
Musso I=0.13 · Houellebecq I=0.08 · Maas FR I=0.11
Ces auteurs FR bestsellers scorent FAIL car le lexique émotionnel FR
capte l'émotion explicite mais pas la tension narrative implicite.
→ Mode --assisted obligatoire pour tout diagnostic FR précis.
→ Séparation confirmée : goulot de mesure ≠ goulot structurel.

**D5 — Houellebecq : MS=0.95, PVI=0.10**
Validation parfaite de LP5 : MS la plus haute du corpus entier,
mais I+Ω effondrés → PVI mort.
La musicalité seule ne vend pas. LP5 confirmée pour la 3ème fois.

---

## 3. TABLEAU DES GOULOTS — BESTSELLERS FR (séparation mesure vs structurel)

| Auteur | Goulot détecté | Type réel | Action |
|--------|---------------|-----------|--------|
| Musso | I=0.13 | **Goulot de mesure** (NLP FR insuffisant) | --assisted requis |
| Maas FR | I=0.11 | **Goulot de mesure** | --assisted requis |
| Houellebecq | I=0.08 + Ω=0.55 | **Goulot structurel** (style distancié + fins ouvertes) | Réel |
| Daoud (Houris) | Ω=0.50 | **Goulot structurel** (fin délibérément ouverte) | Réel |
| Sinno (Triste Tigre) | I=0.39 | Mixte — à confirmer --assisted | Incertain |

---

## 4. LES 3 TITRES LES PLUS PROCHES DE LA ZONE OMEGA

| Titre | PVI | FL OK | MS manque | Ω manque | I OK | T OK |
|-------|-----|-------|-----------|----------|------|------|
| Haunting Adeline | 2.057 | ✅ 0.23 | −0.01 | −0.04 | ✅ 0.90 | ✅ 0.81 |
| It Ends With Us | 2.327 | ✅ 0.14 | −0.04 | ✅ 0.80 | ✅ 0.82 | −0.03 |
| Beach Read | 1.717 | ✅ 0.19 | −0.01 | ✅ 0.78 | ✅ 0.83 | −0.07 |

**Le plafond de verre est MS.** Les 3 titres les plus proches bloquent sur MS ≥ 0.85.
C'est la variable qui sépare le bestseller commercial de la Zone OMEGA.

---

## 5. ÉTAT DU MODULE PVI — CE QUI EST ACQUIS

```
✅ Prédiction EN mode auto : AUC=0.97 · 95% post-2022
✅ Identification goulots précis (variable + delta)
✅ Tableau de sensibilité local (FL−0.10 = +26% PVI)
✅ Distance Zone OMEGA variable par variable
✅ Coefficients culturels FR/EN séparés
✅ Mode --assisted pour Ω et U précis

⚠️ I_proxy FR non fiable en mode auto (3ème personne distancée)
⚠️ T non différenciée (sensoriel vs cognitif/relationnel)
⚠️ Zone OMEGA vide sur 322 titres testés (FR + EN contemporains)
```

---

## 6. PROCHAINES ÉTAPES

| Priorité | Action | Statut |
|----------|--------|--------|
| 🔴 HAUTE | T v2 : 3 composantes (sensoriel + situationnel + relationnel) | À lancer |
| 🔴 HAUTE | Scorer Jacaranda (Gaël Faye) en mode --assisted | Fichier absent — à obtenir |
| 🟡 MOYENNE | Phase P5 : test inter-annotateurs Ω, I, U | Pending |
| 🟡 MOYENNE | Refonte I_proxy FR (NLI ou CamemBERT) | Après T v2 |
| 🟢 BASSE | Intégration "option bestseller" OMEGA-Scribe | Après P5 |

---

## 7. SCEAU

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║   SESSION_SAVE — BATCH SCORING BESTSELLERS 2022-2025                             ║
║   Date : 2026-03-30 · Commit : ebcb076f                                          ║
║   38 titres · 15 PASS · 7 BORDERLINE · 16 FAIL · Zone OMEGA = 0                 ║
║   Prochain chantier : T v2 + Jacaranda --assisted                               ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```
