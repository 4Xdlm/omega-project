# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SESSION_SAVE ADDENDUM
# ═══════════════════════════════════════════════════════════════════════════════
#
# Session : OPTIMISATION CDE — Brief hiérarchisé + LOT1-04 + RCI
# Date    : 2026-03-14 (suite de la session RECALIBRATION)
# Auteur  : Claude (IA Principal)
# Autorité: Francky (Architecte Suprême)
# Standard: NASA-Grade L4 / DO-178C
#
# Complète : SESSION_SAVE_2026-03-14_RECALIBRATION.md
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## 🔒 MÉTADONNÉES

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SESSION_SAVE ADDENDUM — OPTIMISATION CDE 2026-03-14                        ║
║                                                                              ║
║  Branch       : phase-u-transcendence                                       ║
║  Commit HEAD  : c759b2e5a06267dafa2ff3d5e392e69662e81515                    ║
║  Tests        : 1544 PASS / 0 FAIL / 7 skipped (préexistants)              ║
║  Sprints      : V-BENCH-FIX + 3a + 3b + 3c + BENCH VALIDATION              ║
║  API utilisée : 4 CDE bench (2 scènes chaque) + 3 micro one-shot = ~19 calls║
║  Gouvernance  : Claude + ChatGPT 5.4 + Gemini 3.1 (unanimité sur chaque)   ║
║  Statut       : 📊 DIRECTIONNEL — NON SCELLABLE EN PERFORMANCE             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## PARTIE I — CHRONOLOGIE DES ACTIONS POST-RECALIBRATION

### 1.1 V-BENCH-FIX (commit `c4071477`)

**Problème** : Le script `run-cde-bench.ts` affichait "?" pour les axes ECC/RCI/SII/IFI/AAI.
**Cause** : Accès `macroAxes.ecc?.toFixed(1)` au lieu de `macro_score.macro_axes.ecc.score`.
**Fix** : Chemin corrigé + import `computeMinAxis()` + affichage `min_axis`.
**Tests** : 1542 PASS / 0 FAIL. Zéro API consommée.

### 1.2 CDE Bench #1 — Baseline post-CLEAN (2 scènes, brief dramatique)

Premier run avec affichage correct des axes :

| Métrique | Scene 0 | Scene 1 |
|----------|---------|---------|
| Composite | 87.0 | 84.8 |
| ECC | 79.7 | 75.9 |
| RCI | 79.4 | 83.9 |
| SII | 88.9 | 85.7 |
| IFI | 100.0 | 87.6 |
| AAI | 95.6 | 95.6 |
| min_axis | 79.4 | 75.9 |
| SAGA_READY | ❌ | ❌ |

**Diagnostic** : ECC et RCI sont les 2 axes bloquants. Le brief CDE est propre (zéro contamination) mais parle en QUOI (états statiques) au lieu de COMMENT (méthode progressive).

### 1.3 Micro-bench Phase U — Baseline one-shot (3 runs, BENCH_MICRO=1)

Objectif : isoler le coût CDE vs la capacité du moteur à nu.

| Run | Composite | ECC | RCI | SII | IFI | AAI | min_axis |
|-----|-----------|-----|-----|-----|-----|-----|----------|
| OS-1 | 91.5 | 92.5 | 84.7 | 86.7 | 96.9 | 95.6 | 84.7 |
| OS-2 | 92.0 | 92.1 | 84.6 | 89.5 | 98.7 | 95.6 | 84.6 |
| OS-3 | 90.9 | 90.9 | 88.1 | 88.7 | 87.2 | 95.6 | 87.2 |
| **Moy** | **91.5** | **91.8** | **85.8** | **88.3** | **94.3** | **95.6** | — |

**Résultats SEAL** : 0/3 one-shot, 0/3 top-K.
**Conclusion causale** : Le moteur one-shot tient (~91.5) mais ne SEAL pas (RCI fragile à 84.6-84.7 sur 2/3 runs). Le delta CDE est de ~5.5 points. Double problème identifié :
- **RCI** = problème d'ADDITION (base faible même sans CDE)
- **ECC** = problème de MULTIPLICATION (base forte mais écrasée par CDE)

### 1.4 Audit local du prompt (Étape 2 + 2.5) — Zéro API

**Découverte clé** : Le brief CDE est injecté en position 12 (LOW) dans `scene.objective`. Les PDB sont en positions 14-21 avec recency effect. Malgré cette architecture favorable, le LLM obéit au brief (concret, QUOI) et sacrifie les PDB (abstrait, COMMENT).

**Matrice d'interférence identifiée** :

| Champ brief | PDB concurrencée | Type de conflit | Impact |
|-------------|------------------|-----------------|--------|
| `RESTE VRAI` | Style Genome (voice_conformity) | RIGIDIFICATION | voice_conformity 70-80 |
| `TENSION` | Emotion Contract + LOT1-04 | REDONDANCE FAIBLE — état vs progression | tension_14d 52-61 |
| `BOUGER` | Rhythm Prescription + Voice Compliance | CONCURRENCE D'ATTENTION | rhythm 72-84 |
| `INTERDIT` | Kill Lists | RENFORCEMENT ✅ | anti_cliche 97-100 |

**Diagnostic racine** : Les interdictions (QUOI NE PAS faire) fonctionnent parfaitement (anti_cliche 100). Les constructions positives (COMMENT faire) sont écrasées par le brief. Solution : fusionner le QUOI dans le COMMENT.

### 1.5 Étape 3 — Implémentation locale (3 sous-sprints, zéro API)

#### 3a — Brief hiérarchisé (commit `3f74135a`)

Fichier : `src/cde/distiller.ts`

Ajout de 2 fonctions helpers :
- `formatTensionField()` : transforme les tensions statiques en PROGRESSION (`initial → climax. Par le corps d'abord, jamais par le mot.`)
- `formatMoveField()` : ajoute la méthode d'escalade progressive à l'objectif (`— par escalade progressive, pas par révélation directe.`)

Champs `must_remain_true` et `must_not_break` : inchangés (déjà fonctionnels).

**Brief AVANT** :
```
TENSION: Le couple se dechire en silence depuis des mois | rage contenue vs amour residuel | culpabilite vs instinct de survie
BOUGER: Pierre confronte Marie dans leur cuisine, le silence eclate en accusations voilees | Pierre decouvre la trahison de Marie | comprendre pourquoi Marie ment |
```

**Brief APRÈS** :
```
TENSION: Progression: Le couple se dechire en silence depuis des mois → culpabilite vs instinct de survie. Par le corps d'abord, jamais par le mot.
BOUGER: Pierre confronte Marie dans leur cuisine, le silence eclate en accusations voilees (Pierre decouvre la trahison de Marie | comprendre pourquoi Marie ment) — par escalade progressive, pas par revelation directe.
```

Budget token : 140-142 → 145 tokens (dans le plafond 150).

#### 3b — LOT1-04 réactivation conditionnelle (commit `28456c74`)

Fichier : `src/prose-directive/instruction-toggle-table.ts`

| Attribut | AVANT | APRÈS |
|----------|-------|-------|
| enabled_by_default | `false` | `true` |
| kill_switch_env | `OMEGA_ENABLE_LOT1_04` | `OMEGA_DISABLE_LOT1_04` |
| conflicts_with_shapes | `['Contemplative', 'SlowBurn']` | `['Contemplative', 'SlowBurn']` (inchangé) |
| risk_class | `HIGH` | `MEDIUM` |
| ban_reason | `'Pente tension +0.15/Q incompatible...'` | `null` |
| ban_commit | `'3895f496'` | `null` |

**Effet** : LOT1-04 (pente tension +0.15/Q) est actif pour toutes les shapes SAUF Contemplative et SlowBurn.
**+2 tests** ajoutés pour vérifier le toggle conditionnel.

#### 3c — Renforcement RCI (commit `c759b2e5`)

Fichier : `src/input/prompt-assembler-v2.ts`

Ajout de 2 blocs compacts en tête des sections existantes :

**En tête de `buildVoiceComplianceSection()`** :
```
## ⚡ RCI SURVIVAL — 3 CHIFFRES QUI DÉCIDENT DU REJET
rhythm_score = CV(longueurs) × alternance. Cible: ≥85. Actuel: ~79. DANGER.
euphony_basic = allitérations + assonances. Cible: ≥85. Actuel: ~83.
voice_conformity = drift vs genome Camus. Cible: ≥80. Actuel: ~77. CRITIQUE.
```

**En tête de `buildRhythmPrescriptionSection()`** :
```
## ⚡ RHYTHM MINIMUM — CV ≥ 0.75 OU REJET
Ton texte actuel risque CV ~0.55. Chaque phrase de longueur monotone te coûte 5 points de rhythm.
```

Tests : 1544 PASS / 0 FAIL / 7 skipped.

### 1.6 Étape 4 — CDE Bench validation (2 scènes)

| Métrique | Avant 3a+3b+3c | Après 3a+3b+3c | Delta | Floor 85 ? |
|----------|----------------|----------------|-------|-----------|
| **Composite S0** | 87.0 | **89.2** | **+2.2** | Non (< 92) |
| **Composite S1** | 84.8 | **85.4** | **+0.6** | Non (< 92) |
| **Moyenne** | 85.9 | **87.3** | **+1.4** | — |
| **ECC S0** | 79.7 | **83.9** | **+4.2** | ❌ Non |
| **ECC S1** | 75.9 | **77.9** | **+2.0** | ❌ Non |
| **RCI S0** | 79.4 | **83.9** | **+4.5** | ❌ Non |
| **RCI S1** | 83.9 | **82.8** | **-1.1** | ❌ Non |
| **SII S0** | 88.9 | 89.1 | +0.2 | ✅ Oui |
| **SII S1** | 85.7 | **81.0** | **-4.7** | ⚠️ **RÉGRESSION** |
| **IFI** | 100/87.6 | 100/95.7 | OK | ✅ Oui |
| **AAI** | 95.6 | 95.6 | 0 | ✅ Oui |
| **min_axis S0** | 79.4 | **83.9** | **+4.5** | ❌ Non |
| **min_axis S1** | 75.9 | **77.9** | **+2.0** | ❌ Non |

---

## PARTIE II — VERDICT SESSION

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  VERDICT — SESSION OPTIMISATION CDE                                          ║
║                                                                              ║
║  Étape 3 (implémentation)  : PASS — code propre, causalité préservée       ║
║  Étape 4 (bench validation): PASS DIRECTIONNEL / FAIL SEUIL                ║
║                                                                              ║
║  Le bundle 3a+3b+3c améliore la sortie CDE (+1.4 composite moyen)          ║
║  mais ne franchit aucun floor critique (ECC < 85, RCI < 85).               ║
║  Régression SII Scene 1 (85.7 → 81.0) à investiguer.                       ║
║                                                                              ║
║  Base de travail valide pour itération suivante.                            ║
║  NON SCELLABLE en performance.                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## PARTIE III — CONSTATS CAUSAUX GRAVÉS

### 3.1 Le théorème de l'optimisation contrainte

```
Score_final = f(instructions PDB) sous contraintes (brief CDE)
f*(avec contraintes) ≤ f*(sans contraintes)

Delta mesuré : 91.5 (one-shot) → 87.3 (CDE) = -4.2 points = coût cognitif CDE
Le patch 3a+3b+3c récupère +1.4 sur ce delta de 4.2 (~33% du gap).
```

### 3.2 La fatigue séquentielle

Scene 1 (chaînée via propagateDelta) est **systématiquement** plus faible que Scene 0 :
- Run pré-patch : S0=87.0, S1=84.8 (delta -2.2)
- Run post-patch : S0=89.2, S1=85.4 (delta -3.8)

L'accumulation du contexte par la propagation delta **dégrade** le Scribe. Le coût de chaînage augmente au lieu de diminuer.

### 3.3 L'effet vases communicants

Le renforcement RCI (3c) a possiblement causé la régression SII Scene 1 (85.7 → 81.0). L'attention du LLM est un jeu à somme nulle : en criant "RCI SURVIVAL" dans le prompt, on déplace l'attention du Scribe vers le rythme au détriment de la nécessité/métaphore.

### 3.4 Le brief hiérarchisé fonctionne — partiellement

La fusion QUOI+COMMENT dans le brief (3a) est le patch le plus prometteur :
- ECC S0 : +4.2 points (79.7 → 83.9)
- La progression `initial → climax` + méthode corporelle remplace l'état statique

Mais le gain ne suffit pas à franchir le floor 85. Le brief reste un signal concurrent, même reformulé. La Solution 1 (fusion complète PDB+Brief) reste l'étoile polaire architecturale.

---

## PARTIE IV — CHAÎNE DE COMMITS COMPLÈTE (SESSION ÉTENDUE)

| Ordre | Commit | Message | Sprint | Tests |
|-------|--------|---------|--------|-------|
| 1 | `84973d46` | feat(clean-1): purge contamination OMEGA/Scribe | CLEAN-1 | 1540 |
| 2 | `c15055d6` | refactor(clean-2): SSOT thresholds + computeMinAxis | CLEAN-2 | 1540 |
| 3 | `d7954b7d` | fix(clean-2.1): clôture écarts audit 3 IAs | CLEAN-2.1 | 1540 |
| 4 | `8b78bee0` | feat(v-recal-1): SceneBrief dramatique | V-RECAL-1 | 1542 |
| 5 | `749efdac` | docs: SESSION_SAVE RECALIBRATION | Docs | 1542 |
| 6 | `c4071477` | fix(bench): affichage macro-axes + min_axis | V-BENCH-FIX | 1542 |
| 7 | `3f74135a` | feat(3a): brief hiérarchisé QUOI+COMMENT | 3a | 1544 |
| 8 | `28456c74` | feat(3b): LOT1-04 réactivé conditionnel | 3b | 1544 |
| 9 | `c759b2e5` | feat(3c): RCI SURVIVAL + RHYTHM MINIMUM headers | 3c | 1544 |

**Commit HEAD** : `c759b2e5a06267dafa2ff3d5e392e69662e81515`

---

## PARTIE V — RÈGLES GRAVÉES CETTE SESSION

### Règle Budget API OMEGA
> Aucun appel API tant que le bug est observable et vérifiable localement.
> Le prochain run API n'a lieu QUE quand les 3 IAs ont validé le patch local.

### Stratégie budget
| Principe | Règle |
|----------|-------|
| Pré-test local | Toute modification → npm test AVANT tout run API |
| Bench micro | BENCH_MICRO=1 (3 runs) pour valider la mécanique |
| Un seul run complet | Le bench 30+30 ne se lance QU'UNE FOIS, quand tout est validé |
| CDE bench | 2 scènes pour diagnostics rapides (~10x moins cher) |

### Clarification Francky sur le budget
> L'économie d'API est une contrainte de développement, pas une contrainte produit.
> Quand OMEGA sera vendu à Netflix/HBO/Amazon, le budget API sera illimité.
> L'architecture doit être conçue pour la puissance, testée avec discipline.

---

## PARTIE VI — PRIORITÉS PROCHAINE SESSION

| # | Action | Objectif | Coût API |
|---|--------|----------|----------|
| 1 | Analyse croisée 3 IAs des résultats bench | Isoler part causale de 3a, 3b, 3c | 0 |
| 2 | Investiguer régression SII Scene 1 | Ablation : désactiver 3c temporairement ? | 0 |
| 3 | Investiguer fatigue séquentielle (S0 > S1) | Analyser le contenu du StateDelta propagé | 0 |
| 4 | Itérer sur le brief hiérarchisé (3a v2) | Renforcer la fusion QUOI+COMMENT | 0 |
| 5 | Évaluer Solution 1 (fusion PDB+Brief) | Refonte architecturale du prompt CDE | 0 |
| 6 | V-WORLD-1 | **TOUJOURS PRÉMATURÉ** — pas avant résolution ECC/RCI | — |

---

## PARTIE VII — FICHIERS BENCH DE RÉFÉRENCE

| Fichier | Contenu |
|---------|---------|
| `sessions/cde-bench-2026-03-14T15-27-53.json` | CDE bench pré-fix ("?" dans les axes) |
| `sessions/cde-bench-2026-03-14T16-16-37.json` | CDE bench baseline post-CLEAN (87.0/84.8) |
| `sessions/ValidationPack_phase-u_real_2026-03-14_c4071477/` | Micro-bench Phase U (3 one-shot + 3 top-K) |
| `sessions/cde-bench-2026-03-14T19-26-03.json` | CDE bench post-3a+3b+3c (89.2/85.4) |

---

## SCEAU DE CLÔTURE

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   SESSION_SAVE ADDENDUM — OPTIMISATION CDE 2026-03-14                       ║
║                                                                              ║
║   9 commits cette session (CLEAN-1 → 3c)                                   ║
║   HEAD : c759b2e5a06267dafa2ff3d5e392e69662e81515                          ║
║   Tests : 1544 PASS / 0 FAIL / 7 skipped                                   ║
║                                                                              ║
║   Gain CDE mesuré : +1.4 composite moyen (85.9 → 87.3)                    ║
║   Floors franchis : 0 (ECC < 85, RCI < 85)                                 ║
║   Régression SII S1 : -4.7 (85.7 → 81.0) — à investiguer                  ║
║                                                                              ║
║   Verdict : DIRECTIONNEL POSITIF — NON SCELLABLE                           ║
║   V-WORLD-1 : PRÉMATURÉ                                                     ║
║                                                                              ║
║   Autorité : Francky (Architecte Suprême)                                   ║
║   Gouvernance : Unanimité 3/3 sur chaque étape                             ║
║   Standard : NASA-Grade L4 / DO-178C                                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT SESSION_SAVE ADDENDUM**
*2026-03-14 — Complète SESSION_SAVE_2026-03-14_RECALIBRATION.md*
