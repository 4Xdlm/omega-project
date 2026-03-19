# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — ROADMAP PHASE R : REFONDATION MÉTROLOGIQUE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Version     : v2.0 (mise à jour post-R3)
# Date        : 2026-03-19
# Statut      : R0-R3 COMPLÈTES — R4 prête au lancement
# Standard    : NASA-Grade L4 / DO-178C Level A
# Autorité    : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# CHARTE PHASE R — RÈGLES (rappel condensé)

R-01 : 1 phase = 1 conversation. Bilan avant action.
R-02 : Fin = SESSION_SAVE + rapport + message redémarrage.
R-03 : Zéro appréciation — que du calcul empirique.
R-09 : Moteur gelé (engine.ts, damage-gate.ts, micro-surgeon.ts, config.ts).
R-10 : Commit + tag à chaque fin de phase.

NOUVEAU (post-consultation 3 IAs) :
R-11 : Toute "vérité" = "vérité empirique sous hypothèses du corpus et de l'instrumentation"
R-12 : confidence = 1-CV est une FONCTION DE PONDÉRATION RETENUE, pas une loi physique

---

# PHASES COMPLÉTÉES

## R0 — PRÉPARATION CORPUS ✅

Tag : `phase-r0-complete` | Commit : `cc1f83ea`
- full_work_analyzer_v5.py (4 modules)
- CHAPTER_MAX_WORDS supprimé, GATE_MIN_WORDS = 8000
- Corpus : 187 œuvres (87 FR + 60 EN + 17 ES + 23 traductions)
- 10 sagas identifiées
- Testé 3/3 (Bovary FR, Heart of Darkness EN, Niebla ES)

## R1 — MESURE MULTI-FENÊTRE ✅

Tag : `phase-r1-complete` | Commit : `5ccaa9dd`
- 169 œuvres analysées (18 rejetées) en 2.4h
- 121 features × 12 fenêtres × 5 positions
- Classification : 81 LOCAL + 40 ARC + 0 MACRO
- window_min et window_opt dérivés pour 121 features
- OMEGA_METROLOGIE_EMPIRIQUE_v1.json (25 MB)

## R2 — TOPOLOGIE NARRATIVE ✅

Tag : `phase-r2-complete` | Commit : `ff7a9a1e`
- 12 FILE_NOT_FOUND corrigés → corpus 181 œuvres
- 7 analyses topologiques (12.5 MB)
- 6 vérités empiriques (moments aux extrémités, chapitres -24%/siècle, etc.)
- 3 UNPROVEN identifiés (résolus en R3)

## R3 — COEFFICIENTS PROPORTIONNELS ✅

Tag : `phase-r3-complete` (push en cours)
- OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json (105 KB)
- Confidence table : 121 features × 10 tailles
- Weight table : LOCAL_600 (49 features) + ARC_2500 (78 features)
- Scoring formula : α=0.43 / β=0.57 (dérivé empiriquement)
- Position modifiers : 67 features non-stables
- Type modifiers : 5 types × features significatives
- Language dependency : 66 UNIVERSAL + 55 DEPENDENT
- Backtest : 11/12 auteurs above median
- 3 UNPROVEN résolus (CLOSING domine, DIALOGUE 26.9% à 300w, naturalité stable)

---

# PHASES RESTANTES

## R4 — RECONSTRUCTION DU SCORER ← PROCHAINE

```
Statut : PRÊTE AU LANCEMENT
```

**Objectifs :**
1. Implémenter le scorer multi-étages en TypeScript (sovereign-engine)
2. Intégrer les coefficients R3 (confidence, weights, modifiers)
3. Détecteur de type de passage (5 types)
4. Coefficient de confiance affiché sur chaque score
5. **6 PROFILS DE QUALITÉ** (NOUVEAU — directive Francky)
6. Tests unitaires complets

**Les 6 profils :**

| Profil | Seuil composite | Usage |
|--------|----------------|-------|
| STRATOSPHÉRIQUE | ≥ 93.0 | Prose chef-d'œuvre, au-dessus des classiques |
| LITTÉRAIRE | ≥ 88.0 | Roman de qualité |
| COMMERCIAL | ≥ 82.0 | Best-seller grand public |
| THRILLER | ≥ 80.0 | Tension max, prose efficace |
| CONTEMPLATIF | ≥ 85.0 | Woolf/Proust, intériorité priorisée |
| EXPÉRIMENTAL | ≥ 78.0 | Faulkner/Simon, fragmentation tolérée |

Implémentation : mêmes coefficients de confiance (empiriques), poids nominaux différents par profil.

**Livrables R4 :**
- Scorer multi-étages dans packages/sovereign-engine/
- 6 profils de qualité configurables
- Tests unitaires (extension des 1791 existants)
- SESSION_SAVE_R4.md + OMEGA_R4_REPORT.md
- Commit + tag `phase-r4-complete`

## R5 — BENCH TAILLE RÉELLE + VALIDATION

```
Statut : EN ATTENTE DE R4
```

**Objectifs :**
1. Bench sur textes 1500-3000 mots (adaptatif par archétype)
2. Beats étendus 8-12 par scène
3. Scorer multi-étages actif
4. Comparaison avec résultats Phase W/V-RECAL
5. Premier cycle SEAL sur textes réels

## R6 — TESTS DE ROBUSTESSE (NOUVEAU — demandés par ChatGPT)

```
Statut : EN ATTENTE DE R5
```

**Objectifs (4 tests critiques) :**

| Test | Ce qu'il prouve |
|------|----------------|
| Ablation study | Chaque composant (ARC, topologie, type modifiers) ajoute de la valeur |
| Stress test hors distribution | Mauvais textes = scores bas (fanfiction, prose LLM brute, romans médiocres) |
| Test cross-langue réel | Rankings cohérents FR/EN/ES, pas juste CV |
| Rapport anti-biais esthétique | Documenter ce que le système favorise/pénalise |

---

# PHASES FUTURES (POST-R)

## Phase S — FORK SCÉNARISTIQUE (directive Francky)

Adaptation du moteur OMEGA pour scénarios de séries TV et films.

| Réutilisable | À reconstruire |
|-------------|----------------|
| Architecture 2 étages | Corpus de scénarios (HBO, BBC, Canal+) |
| Confiance par feature × taille | Features dialogue/sous-texte |
| Position modifiers (→ structure en actes) | Seuils et slopes pour le dialogue |
| Type de passage (DIALOGUE dominant) | Parser .fountain / .fdx |

## Phase T — EXTENSION CORPUS

Élargissement du corpus FR+EN + ajout de textes faibles pour stress test.

---

# DIAGRAMME DE DÉPENDANCES (mis à jour)

```
R0 ✅ → R1 ✅ → R2 ✅ → R3 ✅
                                 ↓
                              R4 ← PROCHAINE
                                 ↓
                              R5 (bench taille réelle)
                                 ↓
                              R6 (4 tests robustesse)
                                 ↓
                        ┌────────┴────────┐
                        ↓                 ↓
                   Phase S            Phase T
                 (scénarios)       (extension corpus)
```

---

*Roadmap v2.0 — 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky*
