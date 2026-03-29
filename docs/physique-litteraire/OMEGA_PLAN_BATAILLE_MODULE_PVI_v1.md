# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PLAN DE BATAILLE : MODULE PVI AUTONOME
# Prédicteur de bestseller — Synthèse convergente 3-IA
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date           : 2026-03-29
# Version        : v1.0 — DOCUMENT DE RÉFÉRENCE
# Standard       : NASA-Grade L4 / DO-178C Level A
# Architecte     : Francky (Architecte Suprême)
# Sources        : Claude (synthèse) + Gemini (architecture) + ChatGPT (physique)
# Objectif       : Un outil qui ingère un manuscrit et prédit : best-seller ou pas
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## OBJECTIF FINAL EN UNE PHRASE

> **Ingérer un texte brut. Calculer son PVI. Prédire avec un taux ≥ 75%
> si ce texte peut devenir un best-seller organique. Identifier les goulots
> et les leviers d'amélioration. Sans jugement humain dans la boucle.**

---

## CE QUI EST ACQUIS — NE PAS RETRAVAILLER

```
✅ Modèle mathématique PVI formalisé (8 variables, 7 équations)
✅ Validé sur 284 titres (3 corpus convergents — ratio 5× stable)
✅ LP5 universelle (FR + EN)
✅ FL×(1−Ω) = prédicteur critique (ρ=−0.827 EN)
✅ Zone OMEGA occupée en EN (Hemingway, Fitzgerald)
✅ Formule Zone OMEGA révisée : I≥0.65, FL≤0.25, MS≥0.85, Ω≥0.72, T≥0.75, N≥2
✅ LP1 reformulée : CE = condition nécessaire, pas suffisante intra-groupe
✅ Séparation OMEGA-Scribe / Module PVI : isolation confirmée par les 3 IA

❌ Variables encore manuelles (PROXY-AUTEUR)
❌ Coefficients non calibrés par régression formelle
❌ Pas de test hors échantillon
❌ Pas de prédiction sur manuscrit inédit
```

---

## PRINCIPES FONDATEURS DU PLAN (convergence 3 IA)

```
P1. Séparer les variables par niveau de robustesse avant de coder
    (ChatGPT + Claude : "automatiser d'abord ce qui est dur, pas ce qui est sexy")

P2. Calibrer APRÈS avoir des variables fiables — pas avant
    (ChatGPT : "calibrer des variables bancales = calibrer du brouillard")

P3. Tester hors échantillon EN AVEUGLE, coefficients gelés avant le test
    (ChatGPT : "sans ça, tu fais de la prestidigitation statistique en blouse blanche")

P4. Module autonome, jamais fusionné au Scribe pendant la construction
    (Gemini + Claude : "mode collapse si fusion prématurée")

P5. Un modèle petit lisible vaut mieux qu'un monstre opaque à +2 points AUC
    (ChatGPT : "ton objectif = modèle petit, lisible, robuste, et vrai")

P6. PASS/FAIL — jamais "ça dépend"
    (OMEGA SUPREME v1.0 : "zéro approximation tolérée")
```

---

## ARCHITECTURE FINALE DU SYSTÈME

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  INPUT : Fichier .txt / .epub (manuscrit ou roman publié)                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  COUCHE 1 — EXTRACTION NLP (automatique, aucun humain)                      ║
║    FL · MS · LP · DR · S_local · A_proxy · I_proxy                         ║
║                                                                              ║
║  COUCHE 2 — VARIABLES STRUCTURELLES (semi-assistées)                        ║
║    Ω · U · N_renversements                                                  ║
║    → Prompt assistant ciblé sur la fin + arc (≤ 5 questions)               ║
║                                                                              ║
║  COUCHE 3 — CALCUL PVI_v2                                                  ║
║    E_emo · E_cog · CE · R · W · Arc_rev · FL×(1−Ω) · PVI                  ║
║                                                                              ║
║  COUCHE 4 — DIAGNOSTIC                                                      ║
║    Goulots actifs · Leviers classés · Score FL×(1−Ω) · Phase               ║
║                                                                              ║
║  COUCHE 5 — VERDICT BESTSELLER                                              ║
║    PASS (Zone accessible) / FAIL (goulots bloquants) / ZONE OMEGA          ║
║                                                                              ║
║  OUTPUT : Rapport JSON + Rapport MD lisible                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## PLAN DE BATAILLE — 5 PHASES

---

### ⚔️ PHASE 1 — AUTOMATISATION NLP DES VARIABLES
**Durée estimée :** 1-2 sessions Claude Code
**Objectif :** Remplacer les estimations PROXY-AUTEUR par des mesures textuelles reproductibles

---

#### 1A — Variables ROBUSTES (haute fiabilité — automatiser en priorité)

**FL — Friction Lexicale**
```python
def extract_FL(text, lang='fr'):
    """
    Ratio mots hors top 10 000 fréquence.

    Pipeline :
    1. spaCy NER → filtrer entités nommées (noms propres, villes, inventés)
       CRITIQUE : sans ça, Fantasy/SF explose artificiellement (Gemini)
    2. Tokeniser le texte filtré
    3. wordfreq.word_frequency(mot, lang) pour chaque token
    4. FL = len([m for m if freq < seuil_10k]) / len(total_tokens)

    Paramètres :
      seuil_10k : fréquence correspondant au rang 10 000 de la langue
      lang : 'fr' ou 'en' (wordfreq supporte les deux)

    Sortie : FL ∈ [0, 1] + intervalle de confiance ±σ
    """
```

**MS — Musicalité Syntaxique**
```python
def extract_MS(text):
    """
    Combinaison de 3 mesures spaCy :

    1. CV (coefficient de variation) longueur phrases
       = std(longueurs) / mean(longueurs)
       Haute MS = haute variété rythmique

    2. Max Dependency Tree Depth moyen (Gemini)
       = profondeur arbre syntaxique par phrase
       Hemingway = arbre peu profond (~3-4 niveaux)
       Proust = arbre fractal (~8-12 niveaux)
       Note : profondeur haute ≠ MS haute si lexique hermétique

    3. Ratio types syntaxiques distincts
       = nb types de structures / nb phrases total

    MS = normalisation(CV × 0.40 + MaxDepth_normalisé × 0.35 + StructureRatio × 0.25)

    Attention : MS mesure la sophistication SYNTAXIQUE, pas la qualité.
    MS peut être haute avec FL haute (Proust) ou FL basse (Hemingway).
    Le paradoxe Maslej vient de là.
    """
```

**LP — Longueur Perçue / Inertie syntaxique**
```python
def extract_LP(text):
    """
    Proxy de la résistance cognitive à la lecture.

    1. Longueur moyenne des phrases (en tokens)
    2. Ratio phrases > 40 tokens (phrases longues inhibant le rythme)
    3. Profondeur d'imbrication moyenne des propositions

    LP = normalisation(mean_len × 0.40 + ratio_longues × 0.35 + imbrication × 0.25)
    """
```

**DR — Densité Référentielle**
```python
def extract_DR(text):
    """
    Charge intertextuelle et référentielle du texte.

    1. Densité entités nommées (NER spaCy) : GPE, ORG, PERSON, WORK_OF_ART
    2. Ratio références culturelles explicites / tokens totaux
    3. Densité noms propres non-communs

    DR élevée = texte exigeant une culture de décodage externe.
    Ex : Umberto Eco, DeLillo, Pynchon → DR haute.
    Hemingway, Hoover → DR basse.
    """
```

---

#### 1B — Variables SEMI-PROXY (fiabilité moyenne — instrumenter avec réserves)

**S — Surprise Locale**
```python
def extract_S(text):
    """
    ATTENTION (ChatGPT) : perplexité brute ≠ surprise narrative.
    Ne pas confondre "texte bizarre" et "texte surprenant".
    Solution : 2 couches distinctes.

    S_local_lm : perplexité GPT-2 small (HuggingFace)
      = surprise de SURFACE (rupture lexicale locale)
      → Nettoyer le texte rigoureusement avant
      → Normaliser : haute perplexité absurde ≠ surprise utile
      → Fenêtres glissantes de 100 tokens

    S_event : placeholder manuel pour l'instant
      = surprise ÉVÉNEMENTIELLE (action inattendue, information contradictoire)
      → Automatisable via NLI (Natural Language Inference) en Phase 2+
      → Pour l'instant : estimation humaine ou zéro

    S = 0.60 × S_local_lm + 0.40 × S_event
    Indiquer S_event=MANUEL si non calculé

    Sortie : S ∈ [0, 1] avec tag [NLP-PARTIEL]
    """
```

**I_proxy — Identification (proxy)**
```python
def extract_I_proxy(text):
    """
    CRITIQUE (Gemini + ChatGPT) : restreindre l'analyse aux fenêtres
    entourant les pronoms du protagoniste, pas tout le texte.
    L'émotion doit être ATTACHÉE au personnage, pas au décor.

    Pipeline :
    1. Détecter pronoms protagonist (Je/j' en FR, I en EN)
       + pronom 3ème personne dominant si POV 3ème
    2. Extraire fenêtres de 50 tokens autour de chaque occurrence
    3. Calculer densité lexique NRC dans ces fenêtres :
       - Valence négative (cible : haute → I ↑)
       - Arousal élevé (cible : haute → I ↑)
       - Mots abstraits (cible : haute → I ↑)
    4. Bonus : POV 1ère personne → +0.15 (Chen & Bell 2022)

    I_proxy = normalisation(val_neg × 0.35 + arousal × 0.30 + abstraits × 0.20 + pov × 0.15)

    IMPORTANT : I_proxy est un signal, pas I réel.
    Meursault (L'Étranger) = faible arousal malgré POV 1ère personne → I=0.55 réel.
    Le proxy peut sur-estimer si le vocabulaire émotionnel est présent mais distancié.

    Sortie : I_proxy ∈ [0, 1] avec tag [PROXY-NLP]
    """
```

---

#### 1C — Variables STRUCTURELLES (assistées humain — non automatisables court terme)

**Ω — Résolution Finale**
```
MÉTHODE : 5 questions ciblées sur les 10 derniers % du texte

  Q1 : La tension principale posée au chapitre 1 est-elle résolue ? (0.25)
  Q2 : La résolution est-elle cohérente avec l'arc du protagoniste ? (0.25)
  Q3 : La résolution contient-elle un élément non téléphonée ? (0.25)
  Q4 : Le lecteur peut-il "fermer" émotionnellement son investissement ? (0.25)

  Ω = somme(critères satisfaits)
  Réponse binaire par critère : 1 / 0 / 0.5 (partiel)

AUTOMATISATION FUTURE :
  → NLI (textual entailment) pour détecter si la résolution est cohérente
  → Sentiment analysis sur dernier chapitre vs premier chapitre
  → Phase 3 du plan
```

**A / N_renversements — Arc émotionnel**
```
MÉTHODE SEMI-AUTO :
  Sentiment analysis VADER/TextBlob par segments de 5% du texte
  Tracer la courbe de valence (20 points)
  Compter : nb de fois où dV/dt change de signe avec amplitude > 0.25

  N_rev = nb de renversements détectés
  A = normalisation basée sur amplitude + fréquence renversements

  Fiabilité : moyenne — les bascules tonales subtiles sont mal captées.
  Indiquer [SEMI-AUTO] sur la sortie.
```

**U — Unicité Mémorable**
```
MÉTHODE MANUELLE (impossible à automatiser proprement court terme)
  Question unique : "Ce protagoniste peut-il être décrit en 10 mots
  qui le distinguent de tout protagoniste connu ?"
  Score : 0.40 / 0.60 / 0.80 / 1.00 (4 niveaux)

  AUTOMATISATION FUTURE :
  → Embedding du personnage central
  → Distance cosinus vs base de protagonistes connus
  → Phase 3+ du plan
```

---

#### 1D — Validation Phase 1 : Benchmark pilote

```
Protocole obligatoire avant de passer à Phase 2 :

1. Extraire les textes bruts des 5 titres suivants du corpus pilote :
   - L'Étranger (Camus) — cas Maslej résolu, FL=0.18 attendu
   - It Ends With Us (Hoover) — bestseller pur, FL=0.12 attendu
   - Du côté de chez Swann (Proust) — FL=0.72 attendu
   - Gone Girl (Flynn) — bestseller FL=0.20 attendu
   - Madame Bovary (Flaubert) — FL=0.45 attendu

2. Calculer FL, MS, LP, DR, S_local, I_proxy via le script NLP

3. Comparer à chaque score PROXY-AUTEUR du corpus pilote

4. Mesurer pour chaque variable :
   - Δ moyen (erreur absolue)
   - Corrélation Pearson (NLP vs PROXY)
   - Verdict par variable :
     CONVERGENT  : Δ < 0.10 ET r > 0.80
     INSTABLE    : Δ 0.10-0.20 OU r 0.60-0.80
     INUTILISABLE: Δ > 0.20 OU r < 0.60

5. Rapport séparé variables convergentes / instables / inutilisables

CRITÈRE DE PASSAGE EN PHASE 2 :
  ≥ 3 variables CONVERGENTES (dont FL obligatoirement)
  Si FL est INSTABLE : stopper et recalibrer le pipeline avant d'aller plus loin
```

---

### ⚔️ PHASE 2 — CALIBRATION DES COEFFICIENTS
**Durée estimée :** 1 session Claude Code
**Objectif :** Remplacer les constantes estimées par des constantes mesurées sur données réelles

---

#### 2A — Trois modèles en parallèle (ChatGPT)

```
MODÈLE MINIMAL (4 variables)
  Features : FL, I, Ω, T
  Objectif : tester si le noyau dur suffit
  Modèle : Régression logistique binaire

MODÈLE INTERMÉDIAIRE (6 variables)
  Features : FL, I, Ω, T, S, N_rev
  Objectif : tester l'apport des variables de rythme/arc
  Modèle : Régression logistique + XGBoost léger

MODÈLE COMPLET (8 variables + interactions)
  Features : FL, I, Ω, T, S, MS, U, A + FL×(1−Ω) + I×T
  Objectif : mesurer le plafond de performance
  Modèle : XGBoost + régression logistique

RÈGLE D'ADOPTION :
  Si MINIMAL atteint AUC ≥ 0.78 : adopter MINIMAL
  Si INTERMÉDIAIRE gagne > +0.05 AUC : adopter INTERMÉDIAIRE
  Si COMPLET gagne > +0.05 vs INTERMÉDIAIRE : adopter COMPLET
  JAMAIS adopter le complexe pour +0.02 AUC
  (ChatGPT : "un monstre opaque pour +2 points = méfiance")
```

#### 2B — Protocole de calibration

```
1. Dataset : 284 titres avec labels groupe A (1) / groupe B (0)

2. Split STRICT :
   - 80% train (227 titres)
   - 20% test (57 titres) — gelé, ne jamais y toucher avant Phase 3
   - Stratifié par langue (FR/EN) et par groupe

3. Entraînement sur les 227 titres train uniquement

4. Tests complémentaires sur train :
   H1 : U pondération doublée → ρ monte sur Millenium ?
   H2 : Arc_rev(N≥4) = 1.35 → AUC monte ?
   H3 : PVI_v2 avec FL×(1−Ω) pénalisateur → AUC monte ?

5. Sauvegarder les coefficients calibrés dans coefficients_v2.json
   GELER les coefficients — ne plus y toucher jusqu'à Phase 3

6. Test supplémentaire : coefficients globaux vs coefficients par langue
   (ChatGPT : "le noyau est peut-être universel, mais les seuils culturels")
   Si les seuils FR et EN divergent de > 15% : 2 sets de seuils séparés

LIVRABLE P2 :
  pvi_calibration.py
  coefficients_v2.json (gelés)
  rapport_calibration.md avec AUC-ROC des 3 modèles
```

---

### ⚔️ PHASE 3 — VALIDATION HORS ÉCHANTILLON (TEST EN AVEUGLE)
**Durée estimée :** 1 session + collecte données
**Objectif :** Prouver que le modèle généralise — ou l'invalider proprement

---

#### 3A — Test sur les 57 titres gelés

```
PROTOCOLE STRICT (ChatGPT : "aveugle pour être crédible") :

1. Coefficients gelés depuis Phase 2 — AUCUNE modification autorisée
2. Scorer les 57 titres test avec les coefficients calibrés
3. Comparer prédiction (bestseller/niche) vs label réel
4. Mesurer :
   - Taux de classification correcte (cible : ≥ 75%)
   - AUC-ROC sur les 57 titres
   - Matrice de confusion (faux positifs / faux négatifs)
   - Quels titres le modèle rate-t-il ? Documenter sans corriger.

5. Journaliser toutes les erreurs — NE PAS retoucher les coefficients.

CRITÈRE DE PASSAGE EN PHASE 4 :
  Taux classification ≥ 75% ET AUC ≥ 0.78
  Si échec : retour Phase 2 avec diagnostic des erreurs
```

#### 3B — Test sur 20 titres post-2022 (inconnus du corpus)

```
Sélectionner 20 titres publiés 2022-2025 non présents dans le corpus :
  - 10 bestsellers Circana 2023-2024 (Gone Girl level ou supérieur)
  - 10 titres prix littéraires 2023-2024 (Booker, Goncourt, Nobel récent)

Calculer PVI AVANT de regarder les ventes réelles.
Enregistrer la prédiction (bestseller/niche + PVI).
Comparer à la réalité.

VALEUR DE CE TEST :
  C'est le seul test qui prouve que le modèle PRÉDIT, pas qu'il RÉCITE.
  Un taux ≥ 70% sur ces 20 titres = signal fort de généralisation.
  Un taux < 60% = le modèle a suivi les données, pas la physique.
```

#### 3C — Stress test corpus (ChatGPT)

```
Cas adversariaux à tester explicitement :

  - Bestseller à prose forte (Tartt, Shriver) → doit scorer PASS
  - Roman très vendu à fin faible → FL×(1−Ω) doit sonner l'alarme
  - Chef d'œuvre accessible (Camus) → doit approcher Zone OMEGA
  - Roman culte à ventes modestes (Sebald) → doit scorer FAIL correct

  Si ≥ 3 cas adversariaux sont mal classifiés : investigate before Phase 4.
```

---

### ⚔️ PHASE 4 — MODULE AUTONOME FINAL
**Durée estimée :** 1-2 sessions Claude Code
**Objectif :** Livrer un outil clé en main : input = texte, output = verdict bestseller

---

#### 4A — Architecture du module

```python
"""
pvi_module_autonome.py
======================
Un seul script. Zéro dépendance OMEGA-Scribe.

USAGE :
  python pvi_module_autonome.py --input roman.epub --lang fr
  python pvi_module_autonome.py --input manuscript.txt --lang en

PIPELINE :
  1. Extraction échantillon représentatif
     → IMPORTANT (ChatGPT) : pas seulement les 3 premiers chapitres.
     → Extraire : début (20%) + milieu (20%) + fin (20%) = 60% total
     → Le début peut être trompeur (exposition atypique, prologue difficile)

  2. NLP automatique (couche 1)
     → FL, MS, LP, DR, S_local, A_proxy, I_proxy
     → Tous les scores avec intervalle de confiance

  3. Questions structurelles (couche 2)
     → 5 questions Ω sur les derniers 15% du texte
     → 1 question U (10 mots distincts)
     → Entrée interactive ou fichier de réponses JSON

  4. Calcul PVI_v2
     → Coefficients calibrés (coefficients_v2.json)
     → E_emo, E_cog, CE, R, W, Arc_rev, FL×(1−Ω), PVI

  5. Diagnostic
     → Goulots actifs (seuils critiques dépassés)
     → Tableau de sensibilité local (∂PVI/∂variable)
     → Top 3 leviers d'amélioration (%PVI par action de +0.10)
     → Score FL×(1−Ω) — test mort mécanique

  6. Verdict bestseller
     → Phase 1-5 (mort organique → phénomène)
     → PASS / FAIL / ZONE OMEGA
     → Distance Zone OMEGA (Δ par variable manquante)
     → Comparaison aux 2 titres Zone OMEGA réels

  7. Output
     → rapport_pvi_[titre].json (données brutes)
     → rapport_pvi_[titre].md (rapport lisible)
"""
```

#### 4B — Format de sortie — Template standardisé

```markdown
# RAPPORT PVI — [TITRE]
Date : [DATE]
Langue : [FR/EN]
Fichier : [FICHIER]

## SCORES PVI

| Variable | Score | Méthode | Confiance | Seuil crit. | Statut |
|----------|-------|---------|-----------|-------------|--------|
| I        | 0.XX  | NLP/Manuel | ±0.XX | ≥ 0.65 | ✅/❌ |
| T        | 0.XX  | NLP     | ±0.XX | ≥ 0.75 | ✅/❌ |
| A (N_rev)| 0.XX (N=X) | Semi-auto | ±0.XX | N≥2 | ✅/❌ |
| S        | 0.XX  | NLP-partiel | ±0.XX | — | — |
| FL       | 0.XX  | NLP     | ±0.02 | ≤ 0.25 | ✅/❌ |
| MS       | 0.XX  | NLP     | ±0.05 | ≥ 0.85 | ✅/❌ |
| Ω        | 0.XX  | Manuel  | ±0.XX | ≥ 0.72 | ✅/❌ |
| U        | 0.XX  | Manuel  | ±0.15 | — | — |

## CALCULS

E_emo    = [valeur]
E_cog    = [valeur]
CE       = [valeur]
Arc_rev  = [0.50/1.00/1.20]
R        = [valeur]  (Rétention — probabilité de finir)
W        = [valeur]  (Transmissibilité — probabilité de recommander)
FL×(1−Ω) = [valeur]  (Score d'étouffement — seuil max : 0.08)

**PVI = [valeur]**
**SP  = [valeur] / 100**

## GOULOTS ACTIFS

[liste des seuils non atteints avec impact estimé sur PVI]

## VERDICT

**PHASE : [1-5] — [description]**
**VERDICT : FAIL / PASS / ZONE OMEGA**

Ventes organiques estimées (sans marketing) : [fourchette]

## LEVIERS D'AMÉLIORATION (top 3)

1. [Variable] : action → gain PVI +XX% (+[valeur absolue])
2. [Variable] : action → gain PVI +XX%
3. [Variable] : action → gain PVI +XX%

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Δ manquant |
|----------|--------|-------|------------|
| FL       | 0.XX   | ≤0.25 | [Δ] |
| MS       | 0.XX   | ≥0.85 | [Δ] |
| Ω        | 0.XX   | ≥0.72 | [Δ] |
| I        | 0.XX   | ≥0.65 | [Δ] |
| T        | 0.XX   | ≥0.75 | [Δ] |

Référence Zone OMEGA : Hemingway (PVI=2.441) · Fitzgerald (PVI=1.699)
```

---

### ⚔️ PHASE 5 — TEST INTER-ANNOTATEURS ET ROBUSTESSE
**Durée estimée :** 1 session + 1 semaine délai
**Objectif :** Valider que le système ne dépend pas de l'humeur du moment

---

#### 5A — Test de stabilité temporelle (obligatoire selon ChatGPT)

```
PROTOCOLE :
  1. Annoter 20 titres avec variables manuelles (Ω, U, I si NLP insuffisant)
  2. Attendre 7 jours minimum
  3. Ré-annoter les mêmes 20 titres EN AVEUGLE (sans voir le premier score)
  4. Mesurer écart moyen par variable

  SEUILS DE STABILITÉ :
    Δ < 0.10 → variable stable → peut rester dans le modèle
    Δ 0.10-0.20 → variable instable → utiliser seulement comme modérateur
    Δ > 0.20 → variable non fiable → retirer du modèle core / remplacer par NLP

  VARIABLES ATTENDUES STABLES : FL, MS, LP (mesures objectives)
  VARIABLES À RISQUE : Ω, U, I (jugement subjectif)
```

#### 5B — Distinction officielle PVI-core / PVI-extended

```
Résultat attendu de Phase 5 :

PVI-CORE (variables stables, calibrées, fiables)
  → FL, I (si NLP validé), Ω (si critères binaires respectés), T
  → Ce modèle = physique compacte de base
  → Verdict bestseller avec AUC ≥ 0.78

PVI-EXTENDED (variables modératrices)
  → + MS, S, U, A/N_rev
  → Améliore le classement intra-groupe
  → Approfondit le diagnostic des leviers

PVI-AMPLIFICATION (variables futures — Module intra-groupe)
  → Transmissibilité fine (quotabilité, hook compacité)
  → Force mémétique (concept transmissible en 10 secondes)
  → Pression de recommandation sociale
  → À développer en Phase suivante si PVI-CORE validé
```

---

## TABLEAU DE BORD — CRITÈRES DE PASSAGE

| Phase | Livrables | Critère PASS | Critère FAIL → action |
|-------|-----------|-------------|----------------------|
| **P1** | `pvi_nlp_scorer.py` + benchmark 5 titres | ≥ 3 variables CONVERGENTES (dont FL) | Recalibrer pipeline NLP avant P2 |
| **P2** | `coefficients_v2.json` + 3 modèles AUC | AUC ≥ 0.78 sur train set | Revoir features ou ajouter variables |
| **P3A** | Scoring 57 titres test gelés | Classification ≥ 75% + AUC ≥ 0.78 | Retour P2 avec diagnostic erreurs |
| **P3B** | Scoring 20 titres post-2022 | Classification ≥ 70% | Modèle non généralisable — investigate |
| **P3C** | 4+ cas adversariaux | ≥ 3/4 classifiés correctement | Identify edge cases → P2 patch |
| **P4** | `pvi_module_autonome.py` | Score sur 3 manuscrits inédits cohérent | Debugging pipeline |
| **P5** | Test inter-annotateurs | Δ < 0.10 sur variables core | Variables instables → retirer du core |

---

## ORDRE D'EXÉCUTION — CLAUDE CODE

```
COMMANDE 1 : Construire pvi_nlp_scorer.py
─────────────────────────────────────────
Input  : .txt ou .epub
Extraire échantillon : début (20%) + milieu (20%) + fin (20%)
  → JAMAIS seulement le début (ChatGPT : "le début peut mentir")

Pipeline NLP NIVEAU 1 (variables robustes) :
  extract_FL(text, lang)
    → spaCy NER pour filtrer entités nommées (OBLIGATOIRE — Gemini)
    → wordfreq top 10 000 FR/EN
    → Sortie : FL ∈ [0,1] ± σ

  extract_MS(text)
    → CV longueur phrases (spaCy sentences)
    → Max Dependency Tree Depth moyen (spaCy parser) — Gemini
    → Ratio types syntaxiques
    → Sortie : MS ∈ [0,1] ± σ

  extract_LP(text)
    → Longueur moyenne phrases + ratio >40 tokens
    → Sortie : LP ∈ [0,1]

  extract_DR(text)
    → Densité entités NER / tokens totaux
    → Sortie : DR ∈ [0,1]

Pipeline NLP NIVEAU 2 (variables semi-proxy — marquées EXPERIMENTAL) :
  extract_S_local(text)
    → Perplexité GPT-2 small via HuggingFace
    → Nettoyer texte rigoureusement avant (Gemini)
    → Normaliser : supprimer outliers perplexité > 3σ
    → Sortie : S_local ∈ [0,1] tag [NLP-PARTIEL]

  extract_A_proxy(text)
    → Sentiment analysis VADER/TextBlob par segments de 5%
    → Compter changements de signe amplitude > 0.25
    → Sortie : N_rev estimé + A_proxy ∈ [0,1] tag [SEMI-AUTO]

  extract_I_proxy(text)
    → Fenêtres 50 tokens autour pronoms protagoniste (Gemini)
    → NRC Emotion : val_négative + arousal + abstraits
    → Bonus POV 1ère personne
    → Sortie : I_proxy ∈ [0,1] tag [PROXY-NLP]

Benchmark obligatoire :
  Tester sur 5 titres : L'Étranger, It Ends With Us, Swann, Gone Girl, Bovary
  Comparer chaque variable NLP au score PROXY-AUTEUR du pilote
  Produire rapport : convergent / instable / inutilisable par variable
  Seuil de passage P2 : FL convergente obligatoirement

Output : JSON + rapport benchmark MD
```

```
COMMANDE 2 : Calibration (après validation P1)
──────────────────────────────────────────────
À lancer seulement si P1 PASS.

Régression logistique binaire (bestseller=1 / niche=0)
3 modèles en parallèle : minimal / intermédiaire / complet
Split 80/20 stratifié FR+EN — geler le 20% test
Tester H1 (U doublé), H2 (Arc_rev N≥4=1.35), H3 (PVI_v2)
Sauvegarder coefficients_v2.json
Geler les coefficients
```

```
COMMANDE 3 : Validation hors échantillon (après P2 PASS)
─────────────────────────────────────────────────────────
À lancer seulement si AUC P2 ≥ 0.78.

Scorer les 57 titres test SANS retoucher les coefficients
Scorer 20 titres post-2022 inconnus du corpus
Stress test 4 cas adversariaux
Journaliser toutes les erreurs sans corriger
```

```
COMMANDE 4 : Module autonome final (après P3 PASS)
────────────────────────────────────────────────────
À lancer seulement si classification P3 ≥ 75%.

Assembler pvi_module_autonome.py
Interface CLI : --input --lang --output
Template rapport MD standardisé
Test sur 3 manuscrits inédits
```

---

## SÉPARATION CLAIRE : CE QUE CE MODULE FAIT / NE FAIT PAS

```
CE QUE LE MODULE PVI FAIT :
  ✅ Mesure les propriétés intrinsèques d'un texte
  ✅ Calcule le PVI (potentiel sans marketing)
  ✅ Identifie les goulots bloquants
  ✅ Prédit FAIL / PASS / ZONE OMEGA
  ✅ Classe les leviers d'amélioration par impact
  ✅ Mesure la distance à la Zone OMEGA

CE QUE LE MODULE PVI NE FAIT PAS :
  ❌ Ne génère pas de texte (rôle du Scribe OMEGA)
  ❌ Ne prédit pas le rang exact au sein des bestsellers (LP1 invalidée intra-groupe)
  ❌ Ne remplace pas le timing culturel (domaine MIM — séparé)
  ❌ Ne certifie pas une loi universelle (réserves maintenues)

INTÉGRATION FUTURE AVEC OMEGA-SCRIBE :
  → Seulement après P4 et P5 validés
  → Mode "option bestseller" — pas dans le pipeline par défaut
  → Le Scribe génère libre, le PVI module audite en post-traitement
  → Jamais de rétroaction temps réel sur la génération
    (risque : mode collapse du Scribe — validé par les 3 IA)
```

---

## SCEAU DU PLAN

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                  ║
║   OMEGA — PLAN DE BATAILLE MODULE PVI AUTONOME v1.0                             ║
║                                                                                  ║
║   Date           : 2026-03-29                                                    ║
║   Architecte     : Francky (Architecte Suprême)                                  ║
║   Sources        : Claude + Gemini + ChatGPT — convergence totale               ║
║                                                                                  ║
║   5 Phases       : NLP → Calibration → Validation → Module → Robustesse         ║
║   Objectif       : Ingérer un texte → prédire bestseller → ≥ 75% précision      ║
║   Isolation      : Séparation totale du Scribe OMEGA maintenue                  ║
║                                                                                  ║
║   Variable clé   : FL (levier #1, mesurable NLP, universel FR+EN)               ║
║   Prédicteur mort: FL×(1−Ω) ρ=−0.827                                           ║
║   Zone OMEGA     : Hemingway + Fitzgerald — espace rare mais réel               ║
║                                                                                  ║
║   Prochaine commande Claude Code : pvi_nlp_scorer.py                            ║
║                                                                                  ║
║   "Ce qui n'est pas prouvé n'existe pas.                                         ║
║    Ce qui n'est pas mesuré n'est pas acceptable."                                ║
║                                  — OMEGA SUPREME v1.0                           ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```
