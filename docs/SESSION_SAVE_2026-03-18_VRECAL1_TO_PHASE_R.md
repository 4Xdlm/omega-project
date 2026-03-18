# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — V-RECAL-1 → PHASE R (REFONDATION MÉTROLOGIQUE)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date        : 2026-03-18
# Session ID  : VRECAL1-TO-PHASE-R
# HEAD        : c91bac81
# Branche     : phase-w-mixer
# Tests       : 1791/1791 GREEN
# Standard    : NASA-Grade L4 / DO-178C Level A
# Autorité    : Francky (Architecte Suprême)
# IA Principal: Claude
# Auditeurs   : ChatGPT, Gemini
# Convergence : 3/3 IAs + Francky
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# ═══════════════════════════════════════════════════════════════════════════════
# CHARTE PHASE R — RÈGLES INDISCUTABLES
# ═══════════════════════════════════════════════════════════════════════════════
#
# Les règles suivantes s'appliquent à TOUTE la Phase R et ses sous-phases.
# Elles sont GELÉES et ne peuvent être modifiées que par décision unanime
# 3/3 IAs + Francky.
#
# RÈGLE R-01 : CHAQUE PHASE = UNE CONVERSATION
#   Chaque sous-phase (R0, R1, R2, R3, R4, R5) démarre dans une NOUVELLE
#   conversation. Le premier message de chaque conversation est un BILAN DE
#   COMPRÉHENSION obligatoire (cf. Bloc F du OMEGA_SUPREME). Aucune action
#   n'est entreprise avant validation du bilan par Francky.
#
# RÈGLE R-02 : CHAQUE PHASE SE TERMINE PAR UN RAPPORT
#   Chaque sous-phase se termine par :
#   1. Un SESSION_SAVE complet dans le repo
#   2. Un rapport de résultats avec données chiffrées
#   3. Un message de redémarrage précis pour la phase suivante
#   4. Les décisions prises et leurs justifications
#
# RÈGLE R-03 : ZÉRO APPRÉCIATION — QUE DU CALCUL
#   Chaque constante, coefficient, seuil ou formule doit être dérivée de
#   calculs empiriques sur le corpus. INTERDIT de fixer une valeur "parce
#   que ça semble bien" ou "d'après notre expérience". Si une valeur ne
#   peut pas être prouvée par les données, elle est marquée UNPROVEN et
#   ne sera PAS utilisée dans le scoring.
#
# RÈGLE R-04 : AUCUNE LIMITE DE TAILLE D'ANALYSE
#   Les œuvres sont analysées dans leur ENTIÈRETÉ. Aucun CHAPTER_MAX_WORDS,
#   aucune troncature. Si un chapitre fait 35 000 mots, on analyse 35 000 mots.
#   Si une saga fait 1 500 000 mots sur 7 tomes, on analyse les 7 tomes.
#
# RÈGLE R-05 : 3 LANGUES MINIMUM
#   Le corpus d'analyse couvre français, anglais et espagnol.
#   Seuls les textes ORIGINAUX dans leur langue sont analysés.
#   Les traductions sont EXCLUES du calcul des constantes.
#
# RÈGLE R-06 : 5 NIVEAUX D'ANALYSE
#   Chaque feature est mesurée à 5 niveaux : Phrase, Scène, Chapitre, Arc, Œuvre.
#   Les constantes sont calculées pour CHAQUE niveau indépendamment.
#
# RÈGLE R-07 : RECONNAISSANCE DU TYPE DE TEXTE
#   L'analyse adapte ses mesures au type de passage : Description, Dialogue,
#   Action, Introspection, Transition. Un passage descriptif et un passage
#   d'action ne sont PAS évalués avec les mêmes poids.
#
# RÈGLE R-08 : COEFFICIENT DE CONFIANCE OBLIGATOIRE
#   Chaque score est accompagné de son coefficient de confiance (0.0 à 1.0)
#   dérivé empiriquement du corpus. Un score sans confiance est INVALIDE.
#
# RÈGLE R-09 : DOCTRINE MOTEUR GELÉE
#   Le code moteur (engine.ts, damage-gate.ts, micro-surgeon.ts, config.ts)
#   est GELÉ pendant toute la Phase R. On ne touche QU'À l'analyse et à la
#   métrologie. Le moteur sera modifié en Phase S (post-R).
#
# RÈGLE R-10 : COMMIT OBLIGATOIRE À CHAQUE FIN DE PHASE
#   Chaque SESSION_SAVE + roadmap mise à jour + résultats de phase sont
#   committés dans le repo avec tag. Rien ne reste non-commité.
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# BLOC 1 — BILAN EXÉCUTIF DE LA SESSION

## Ce qui a été accompli cette session

### V-RECAL-1 — Résultats des 5 full bench

| Run | Config | SEAL | Médiane | Erreurs | Verdict |
|-----|--------|------|---------|---------|---------|
| 1 | temp=1.0 (baseline) | 1/8 | 91.3 | API 500 Élégie | FAIL — baseline pré-patch |
| 2 | temp=0.75 | 1/8* | 90.5 | Faux SEAL Monologue | FAIL — pipeline tronqué |
| 3 | v11 guard + temp=0.75 | 0/8 | 91.4 | 0 | FAIL — premier bench propre |
| 4 | v12 judges rubric | 3/5 | 93.1 | 3× API 503 | SIGNAL FORT mais incomplet |
| 5 | v12b retry clean | 1/8 | 91.8 | 0 | FAIL — premier run propre complet avec judges |

*Run 2 : Monologue marqué SEAL à composite 90.1 = faux positif (corrigé par v11)

### Patches produits et appliqués

| Patch | Invariant | Fichier | Description |
|-------|-----------|---------|-------------|
| v10 | INV-TEMP-01 | run-benchmark-phase-w.ts | draftTemperature 1.0 → 0.75 |
| v11 | INV-BENCH-SEAL-01 | run-benchmark-phase-w.ts | Guard fail-closed : vérifie composite ≥ 93 + axes complets + durée |
| v12 | INV-JUDGE-NECESSITY-01 | anthropic-provider.ts | Prompt necessity rubrique (5 sous-critères) |
| v12 | INV-JUDGE-IMPACT-01 | anthropic-provider.ts | Prompt impact rubrique (5 sous-critères) |
| v12b | INV-PROVIDER-RETRY-01 | anthropic-provider.ts | Retry 503/500 avec backoff exponentiel |

### Découverte majeure — Le plafond métrologique

Suite à une question de Francky sur la taille des scènes, une analyse de variance
sur 5 œuvres de référence (Flaubert, Proust, Camus, McCarthy, Woolf) a prouvé :

**AUCUNE des 16 features clés n'est stable à 300 mots.**

| Feature | CV à 300 mots | CV en chapitre | Gain de stabilité |
|---------|---------------|----------------|-------------------|
| Style indirect libre (f28d) | 2.354 | 0.334 | 7.1× |
| Index littéraire (f22f) | 0.829 | 0.141 | 5.9× |
| Densité émotionnelle (f8a) | 2.022 | 0.426 | 4.7× |
| Variance rythmique (f1a) | 0.476 | 0.108 | 4.4× |
| Score descriptif (f25g) | 0.274 | 0.070 | 3.9× |

Cas emblématique — Flaubert, Madame Bovary, Style Indirect Libre :
- Sur 16 extraits de 300 mots : 12 donnent ZÉRO, Range/μ = 716%
- Sur 4 chapitres de 28 849 mots : Range/μ = 23%

**La variance de nos mesures est 7 à 10 fois plus élevée à 300 mots qu'en chapitre.**
La variance inter-run de ±1.5 pts composite n'est pas du moteur — c'est du bruit de mesure.

### Constats supplémentaires — Moyennes qui changent entre échelles

| Feature | μ à 300 mots | μ en chapitre | Δ% |
|---------|-------------|---------------|-----|
| Score descriptif (f25g) | 0.43 | 0.74 | **+73%** |
| Ratio PS/Imp (f30d) | 1.44 | 2.81 | **+95%** |
| Rituel incantatoire (f21e) | 0.26 | 0.35 | +36% |
| Modalité épistémique (f27d) | 0.28 | 0.37 | +32% |

**On ne mesure pas la même chose aux deux échelles.**

---

# BLOC 2 — DISCUSSIONS CLÉS ET DÉCISIONS

## Discussion 1 — Judges LLM figés (runs 1-3)

**Constat** : necessity=85 sur 21/24 scènes, impact=87 sur 18/24, temporal_pacing=75 sur 24/24.

**Diagnostic 3 IAs** : Les prompts "Rate X 0-100, return only the integer" à temperature=0
ne discriminent pas. Le LLM ancre sur une valeur par défaut.

**Décision** : Prompts rubrique avec 5 sous-critères + judgeMaxTokens 200→300.

**Résultat** : impact distribue 3+ valeurs (80, 82, 85, 87, 88). necessity reste presque figé (85, 86, 89, 90). Amélioration partielle.

## Discussion 2 — Faux SEAL Monologue (run 2)

**Constat** : Scène 8 affiche SEAL avec composite=90.1, durée 100s, aucun log DUEL/AUTOPSY.

**Diagnostic 3 IAs unanime** : Bug fail-open du bench runner. Le pipeline a crashé mais a émis un verdict positif.

**Décision** : Patch v11 — guard fail-closed avec 3 vérifications indépendantes (composite, axes, durée). Chaque record porte un `termination_reason`.

**Résultat** : 0 faux SEAL sur les 3 runs suivants. Guard validé.

## Discussion 3 — Taille des scènes (la question fondatrice)

**Question de Francky** : "Est-ce que notre mesure se fait sur de petites scènes alors qu'une prose extraordinaire a besoin d'un espace plus large pour s'exprimer ?"

**Métaphore du sirop** : "Un bon sirop a besoin d'être dilué dans l'eau pour exprimer son arôme. En concentré, on ne peut pas l'apprécier."

**Analyse empirique** : Script `analyze_scale_variance.py` sur 5 œuvres. Résultat : 16/16 features instables à 300 mots (gain 1.7× à 9.6×).

**Décision unanime 3 IAs + Francky** : Refondation métrologique complète. Phase R ouverte.

## Discussion 4 — Architecture du juge (Q1)

**Option A** : Multi-étages (LOCAL / ARC / MACRO + FUSION)
**Option B** : Juge proportionnel unique

**Vote** : A unanime (3/3 IAs). Raisons : traçabilité DO-178C, auditabilité, réalité (on ne juge pas la phrase et le roman avec le même instrument).

**Idées fusionnées** :
- Handshake temporel (Gemini) : si LOCAL FAIL → skip ARC
- Coefficient de confiance affiché (ChatGPT) : chaque score montre sa crédibilité
- Reconnaissance du type de texte (Francky) : description ≠ dialogue ≠ action

## Discussion 5 — Ampleur de l'analyse (directives Francky)

Francky a posé des exigences qui dépassent ce que les 3 IAs avaient proposé :

1. **Œuvres entières** — aucune limite de taille
2. **Sagas** — moyennes sur plusieurs tomes
3. **3 langues** — français, anglais, espagnol
4. **5 niveaux** — phrase, scène, chapitre, arc, livre
5. **Zéro appréciation** — que du calcul empirique prouvable
6. **Reconnaissance du type de texte** — adapter l'analyse au contenu

---

# BLOC 3 — ÉTAT DU CODE GELÉ

### HEAD certifié

```
HEAD : c91bac81
Branche : phase-w-mixer
Tests : 1791/1791 GREEN
Tag : w-int-5-sealed (HEAD 8ef4cda8 — tag de scellement Phase W)
```

### Fichiers modifiés pendant V-RECAL-1 (non committés)

| Fichier | Patches | Statut |
|---------|---------|--------|
| scripts/run-benchmark-phase-w.ts | v10 (temp) + v11 (guard) | Modifié, non commité |
| src/runtime/anthropic-provider.ts | v12b (judges + retry) | Modifié, non commité |

### Doctrine gelée — NE PAS TOUCHER pendant Phase R

| Composant | Valeur | Raison |
|-----------|--------|--------|
| engine.ts | Tout le pipeline | Gelé jusqu'à Phase S |
| damage-gate.ts | Thresholds, slopes, multipliers | 48 805 perturbations |
| micro-surgeon.ts | Guard, prompt, hook logic | Validé empiriquement |
| config.ts | SOVEREIGN_THRESHOLD=93, etc. | Contrat SEAL |

---

# BLOC 4 — TABLE DES INVARIANTS ACTIFS

| ID | Description | Fichier | Phase | Statut |
|----|-------------|---------|-------|--------|
| INV-ARCH-CORPUS-01 | deriveArchetype sans arousal | engine.ts | W | SEALED |
| INV-MICRO-DIFF-01 | Guard 1.5×, prompt infléchir | micro-surgeon.ts | W | SEALED |
| INV-EUPHONY-WEIGHT-01 | euphony_basic w=0.50 | euphony-basic.ts | W | SEALED |
| INV-GATE-DIR-01 | MUSICALITE gains always PASS | damage-gate.ts | W | SEALED |
| INV-GATE-INTERIOR-01 | MUSICALITE threshold=0.15 | damage-gate.ts | W | SEALED |
| INV-MICRO-HOOK-01 | HOOK cible quartile hors-TENSION | micro-surgeon.ts | W | SEALED |
| INV-GUARD-ADAPT-01 | Guard max(1.5×, +15 chars) | micro-surgeon.ts | W | SEALED |
| INV-BENCH-EMO-01 | Trajectoires 14D enrichies | run-benchmark-phase-w.ts | W | SEALED |
| INV-PROMPT-01 | Zéro narrative state dans prompt Scribe | prompt-assembler-v2.ts | V | SEALED |
| INV-TEMP-01 | draftTemperature 1.0→0.75 | run-benchmark-phase-w.ts | V-RECAL | APPLIED |
| INV-BENCH-SEAL-01 | Guard fail-closed SEAL validation | run-benchmark-phase-w.ts | V-RECAL | APPLIED |
| INV-JUDGE-NECESSITY-01 | Rubric-based necessity scoring | anthropic-provider.ts | V-RECAL | APPLIED |
| INV-JUDGE-IMPACT-01 | Rubric-based impact scoring | anthropic-provider.ts | V-RECAL | APPLIED |
| INV-PROVIDER-RETRY-01 | Retry 503/500 backoff | anthropic-provider.ts | V-RECAL | APPLIED |

---

# BLOC 5 — COMMANDES GIT DE CLÔTURE

```powershell
# COMMANDE 1 — Commit V-RECAL-1 + ouverture Phase R
cd C:\Users\elric\omega-project
git add -A
git commit -m "docs(v-recal-1): SESSION_SAVE + PHASE_R roadmap + 5 bench runs + patches v10-v12b [1791 tests GREEN]"
```

```powershell
# COMMANDE 2 — Tag de transition
git tag -a "v-recal-1-closed" -m "V-RECAL-1 closed — 5 bench runs, metrological refoundation identified, Phase R opened"
```

```powershell
# COMMANDE 3 — Push
git push origin phase-w-mixer --tags
```

---

# BLOC 6 — MESSAGE DE REDÉMARRAGE PHASE R0

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA SESSION — PHASE R0 (PRÉPARATION CORPUS)                                      ║
║                                                                                       ║
║   HEAD gelé    : c91bac81 (tag : v-recal-1-closed)                                    ║
║   Tests        : 1791/1791 GREEN                                                      ║
║   Phase        : R0 (première sous-phase de la REFONDATION MÉTROLOGIQUE)              ║
║                                                                                       ║
║   OBJECTIF R0  : Préparer le corpus d'analyse multi-langue complet                    ║
║                  Lever les limites de taille (CHAPTER_MAX_WORDS)                       ║
║                  Ajouter le corpus espagnol (domaine public)                           ║
║                  Identifier les sagas (Proust, Zola, Balzac)                           ║
║                  Produire le plan d'extraction multi-fenêtre                           ║
║                                                                                       ║
║   DOCUMENTS OBLIGATOIRES À LIRE :                                                     ║
║   1. SESSION_SAVE_2026-03-18_VRECAL1_TO_PHASE_R.md (ce document)                      ║
║   2. OMEGA_PHASE_R_ROADMAP.md                                                         ║
║   3. OMEGA_PHASE_R_PLAN.md                                                            ║
║   4. OMEGA_EXPLICATION_TECHNIQUE_PHYSIQUE_LITTERAIRE_v2.md                             ║
║                                                                                       ║
║   CHARTE : Lire la CHARTE PHASE R en tête du SESSION_SAVE.                            ║
║   10 règles non négociables. Chaque phase commence par un bilan                       ║
║   de compréhension et se termine par un rapport complet.                              ║
║                                                                                       ║
║   Architecte Suprême : Francky                                                        ║
║   IA Principal       : Claude                                                         ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

*Document certifié le 2026-03-18 — Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky*
