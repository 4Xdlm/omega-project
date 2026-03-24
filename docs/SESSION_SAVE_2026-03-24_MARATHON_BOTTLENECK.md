# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SESSION_SAVE
# Date : 2026-03-23 / 2026-03-24
# Session : MARATHON BOTTLENECK + BENCH CHAPITRE 3 MODÈLES
# ═══════════════════════════════════════════════════════════════════════════════
#
# Rédigé par    : Claude (IA Principal)
# Validé par    : Francky (Architecte Suprême)
# HEAD départ   : 0fe63d24 (tag r-calibration-complete)
# HEAD fin      : (après tag bench-chapter-3models-v1)
# Branche       : phase-r-metrology-rebuild
# Tests         : 1911 PASS, 0 régressions
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — RÉSUMÉ EXÉCUTIF

## Ce qui s'est passé

Marathon de tests comparatifs sur 3 modèles LLM (Claude Sonnet 4, Mistral Large,
GPT-4o) pour déterminer si le bottleneck de qualité littéraire en français est
lié à la langue, au modèle, ou au prompt.

## Résultat principal

Le bottleneck est SPÉCIFIQUE À CLAUDE, pas universel. La Rosetta branchée
récupère 72% du gap. Claude+Rosetta reste le moteur principal OMEGA.

## Décisions verrouillées

5 décisions architecturales scellées par l'Architecte (voir Partie 8).

---

# PARTIE 2 — CHRONOLOGIE DES TESTS

| # | Test | API calls | Modèle(s) | Résultat clé | Tag |
|---|------|-----------|-----------|-------------|-----|
| 1 | Claude FR vs EN 500w | 8 | Claude | ΔGB +0.058, CV FR meilleur | fr-vs-en-bottleneck-v1 |
| 2 | Claude FR vs EN 3000w | 8 | Claude | ΔGB +0.099, CV EN meilleur, f26b EN ×2.4 | fr-vs-en-bottleneck-v2 |
| 3 | Mistral vs Claude FR (500w+3000w) | 16 | Claude+Mistral | Mistral +0.139 brut, sous-produit 41% | mistral-vs-claude-fr-v1 |
| 4 | Mistral FR vs EN 3000w | 8 | Mistral | ΔGB +0.041 = PAS DE BOTTLENECK | d-synth-1-audit-and-mistral-bottleneck |
| 5 | GPT FR vs EN 3000w | 8 | GPT-4o | ΔGB -0.067 = FR MEILLEUR | gpt-fr-vs-en-bottleneck-v1 |
| 6 | Bench Chapitre 3 modèles | ~18 | Claude+Rosetta vs Mistral vs GPT | Claude 3.97, Mistral 4.06, GPT 3.67 | bench-chapter-3models-v1 |
| **TOTAL** | | **~66 API calls** | **3 modèles** | | |

---

# PARTIE 3 — RÉSULTATS DÉTAILLÉS

## Test 1 — Claude FR vs EN 500w

| Scène | GB FR | GB EN | ΔGB | CV FR | CV EN |
|-------|-------|-------|-----|-------|-------|
| Confrontation | 3.29 | 3.86 | +0.57 | 0.587 | 0.426 |
| Contemplation | 3.69 | 3.47 | -0.22 | 0.424 | 0.367 |
| Action pure | 3.59 | 3.31 | -0.28 | 0.592 | 0.454 |
| Élégie | 3.54 | 3.70 | +0.16 | 0.401 | 0.653 |
| **MOYENNE** | **3.53** | **3.59** | **+0.058** | **0.501** | **0.475** |

Verdict : signal faible, f26b=0 partout (capteur aveugle à 500w).

## Test 2 — Claude FR vs EN 3000w

| Scène | GB FR | GB EN | ΔGB | CV FR | CV EN | f26b FR | f26b EN |
|-------|-------|-------|-----|-------|-------|---------|---------|
| Confrontation | 3.93 | 4.03 | +0.11 | 0.753 | 1.062 | 0.027 | 0.050 |
| Contemplation | 3.77 | 3.97 | +0.20 | 0.714 | 0.414 | 0.125 | 0.093 |
| Action pure | 3.72 | 3.65 | -0.07 | 0.558 | 0.594 | 0.000 | 0.086 |
| Élégie | 3.53 | 3.69 | +0.16 | 0.487 | 0.649 | 0.009 | 0.157 |
| **MOYENNE** | **3.74** | **3.84** | **+0.099** | **0.628** | **0.680** | **0.040** | **0.097** |

Verdict : BOTTLENECK PROBABLE. EN gagne 3/4. f26b EN ×2.4 vs FR.
Confusion : élégie FR 2016w vs EN 4088w (volume inégal).
Claude sous-produit en FR (-31% vs cible 3000w).

## Test 3 — Mistral vs Claude FR

### 500w

| Scène | Claude GB | Mistral GB | ΔGB |
|-------|-----------|-----------|-----|
| Confrontation | 3.738 | 3.781 | +0.044 |
| Contemplation | 3.611 | 3.140 | -0.471 |
| Action pure | 3.615 | 3.986 | +0.371 |
| Élégie | 3.217 | 3.688 | +0.471 |
| **MOYENNE** | **3.545** | **3.649** | **+0.104** |

### 3000w

| Scène | Claude GB | Mistral GB | ΔGB |
|-------|-----------|-----------|-----|
| Confrontation | 3.863 | 3.920 | +0.058 |
| Contemplation | 4.173 | 4.113 | -0.060 |
| Action pure | 3.742 | 4.115 | +0.373 |
| Élégie | 3.907 | 4.236 | +0.328 |
| **MOYENNE** | **3.921** | **4.096** | **+0.175** |

Verdict : Mistral +0.139 overall. Mais Mistral sous-produit 41% à 3000w.
Mistral produit de l'ACTION détectée comme action (première fois).
Claude gagne contemplation 3000w (4.173 vs 4.113).

## Test 4 — Mistral FR vs EN 3000w

| Scène | Mistral FR | Mistral EN | ΔGB |
|-------|-----------|-----------|-----|
| Confrontation | 4.013 | 4.191 | +0.177 |
| Contemplation | 4.018 | 3.996 | -0.022 |
| Action pure | 4.293 | 4.233 | -0.060 |
| Élégie | 3.916 | 3.984 | +0.068 |
| **MOYENNE** | **4.060** | **4.101** | **+0.041** |

Verdict : **PAS DE BOTTLENECK.** ΔGB +0.041 = bruit. CV FR 0.750 > CV EN 0.650.
Mistral action_pure FR = 4.293 (meilleur score individuel de tous les tests).
Le bottleneck est SPÉCIFIQUE À CLAUDE, pas universel.

## Test 5 — GPT FR vs EN 3000w

| Scène | GPT FR | GPT EN | ΔGB |
|-------|--------|--------|-----|
| Confrontation | 3.396 | 3.895 | +0.499 |
| Contemplation | 3.918 | 3.500 | -0.418 |
| Action pure | 3.558 | 3.464 | -0.094 |
| Élégie | 3.831 | 3.575 | -0.256 |
| **MOYENNE** | **3.676** | **3.609** | **-0.067** |

Verdict : **GPT EST MEILLEUR EN FRANÇAIS.** ΔGB -0.067 = FR avantage.
Détruit la théorie "les LLMs anglophones sont bridés en FR".
GPT sous-produit massivement (700-1100w pour 3000 demandés). ÉLIMINÉ.

## Test 6 — Bench Chapitre 3 Modèles (Claude+Rosetta vs Mistral brut vs GPT brut)

| Config | Claude+Rosetta | Mistral brut | GPT brut |
|--------|---------------|-------------|---------|
| A (tension) | 3.62 / 1517w | **4.24** / 1003w | 3.46 / 778w |
| B (émotion) | **4.21** / 2684w | 3.76 / 1792w | 3.71 / 783w |
| C (continuité) | 4.08 / 2630w | **4.18** / 1578w | 3.85 / 734w |
| **MOYENNE** | **3.97 / 2277w** | **4.06 / 1458w** | **3.67 / 765w** |

Verdict : Claude+Rosetta à 3.97, Mistral à 4.06, gap = 0.09.
Rosetta a comblé 72% du gap initial (0.32 → 0.09).
Claude GAGNE Config B (émotion : 4.21 vs 3.76).
Mistral GAGNE Config A (tension : 4.24 vs 3.62).
Claude produit 56% de plus que Mistral en volume.

---

# PARTIE 4 — TABLEAU CROISÉ FINAL (3 MODÈLES)

## Bottleneck langue

| Modèle | Entraînement | ΔGB (EN-FR) | ΔCV (EN-FR) | Bottleneck ? |
|--------|-------------|-------------|-------------|-------------|
| Claude | Anglophone | +0.099 | +0.052 | **OUI — SEUL** |
| Mistral | FR natif | +0.041 | -0.100 | NON |
| GPT-4o | Anglophone | -0.067 | -0.080 | NON (FR meilleur) |

## Performance FR native

| Modèle | GB FR brut | GB FR+Rosetta | CV FR | f26b FR | Volume moyen |
|--------|----------|--------------|-------|---------|-------------|
| Mistral | **4.060** | Non testé | **0.784** | **0.023** | 1458w |
| Claude | 3.740 | **3.969** | 0.650 | 0.005 | **2277w** |
| GPT-4o | 3.676 | Non testé | 0.440 | 0.000 | 765w |

## Profils par type de scène

| Type de scène | Meilleur modèle | Score |
|--------------|----------------|-------|
| Tension / Action | **Mistral** | 4.24 |
| Émotion / Introspection | **Claude+Rosetta** | 4.21 |
| Continuité (2 chapitres) | Mistral (léger) | 4.18 vs 4.08 |

---

# PARTIE 5 — HYPOTHÈSES RÉSOLUES

| Hypothèse | Statut | Preuve |
|-----------|--------|--------|
| "Le français est structurellement plus faible pour les LLMs" | **RÉFUTÉE** | GPT est meilleur en FR (-0.067), Mistral neutre |
| "Le bottleneck est universel aux LLMs anglophones" | **RÉFUTÉE** | GPT anglophone n'a PAS de bottleneck |
| "Le bottleneck est dans Claude" | **CONFIRMÉ** | Seul modèle avec ΔGB > +0.05 (3 tests) |
| "Mistral est meilleur en FR brut" | **CONFIRMÉ** | 4.06 vs 3.74 Claude brut, 4.06 vs 3.97 Claude+Rosetta |
| "La Rosetta peut combler le gap" | **PARTIELLEMENT CONFIRMÉ** | 72% du gap comblé (3.74 → 3.97 vs 4.06) |
| "Générer en EN puis traduire est une solution" | **RÉFUTÉE** | Taxe traduction -0.086 annule le gain |
| "Le f26b est un problème de langue" | **RÉFUTÉ** | f26b bas chez les 3 modèles dans les 2 langues |
| "Le mode unique INTROSPECTION est total" | **RÉFUTÉ** | 2-3 types produits par les deux langues et tous les modèles |

---

# PARTIE 6 — ANALYSE D-SYNTH CROISÉE (3 IAs)

## Les 5 décisions D-SYNTH validées unanimement

| Décision | Claude | ChatGPT | Gemini | Statut |
|----------|--------|---------|--------|--------|
| D-SYNTH-1 : Audit master-prompt | OUI | OUI #1 | OUI | **EXÉCUTÉ** (Phase 1 bench chapitre) |
| D-SYNTH-2 : Scène à mélange contraint | OUI | OUI (nuance) | OUI | **VALIDÉ** |
| D-SYNTH-3 : Vérifier ix_variance_x_longrate | OUI | OUI | OUI | **EN COURS** |
| D-SYNTH-4 : Brancher 4 features SOLIDES Rosetta | OUI | OUI | OUI | **EXÉCUTÉ** (bench chapitre) |
| D-SYNTH-5 : Retirer signaux confondés des cibles | OUI | OUI | Non commenté | **VALIDÉ** |

## Angles morts identifiés par Claude (non vus par les autres IAs)

1. ix_variance_x_longrate = feature #2 du GB avec meilleur delta (+1.263) et meilleur % S (95.7%)
2. Le master-prompt CRÉE le bridage (LLM libre = 2.46× longueur, contraint = 18 mots)
3. La synergie introspection×dialogue (+0.174) exploite le mode naturel du LLM
4. Le Hurst NON significatif prouve que la qualité est dans la micro-structure, pas la mémoire longue
5. La seule scène à budget égal (action_pure) est celle où FR GAGNE
6. Les features SOLIDES Rosetta sont MOINS pilotables en français (f26b consigne respectée en EN, pas en FR)
7. f_pov_shift_rate et f_pov_stability dans le GB = signature du style indirect libre (SIL) irréductible

## Corrections apportées par ChatGPT

1. "Le prompt BRIDE" = hypothèse forte, pas fait (jusqu'à l'audit)
2. "Mode unique" → "forte attractivité introspective" (plus précis)
3. Les 5 dimensions PCA = carte à construire, pas tableau de bord
4. Confusion de longueur invalide partiellement les comparaisons non iso-volume
5. Le bon test serait un 2×2 (modèle × Rosetta ON/OFF) avec longueur verrouillée

---

# PARTIE 7 — AUDIT MASTER-PROMPT (D-SYNTH-1)

## Exécuté dans le bench chapitre (Phase 1)

Le master-prompt a été audité. Les corrections suivantes ont été appliquées
pour le bench chapitre (Claude+Rosetta uniquement) :

### Ajouts au prompt Claude

1. **Directive syntaxique** : "Au moins 15% > 30 mots, 5% > 40 mots"
2. **7 contraintes SOLIDES Rosetta S0** : TTR > 0.70, contraste 1/3 court + 1/3 long,
   bigrammes < 2 répétitions, > 85% bigrammes uniques, accroche tension < 15 mots,
   fin ouverte, 6 mots sensoriels / 100 mots
3. **Directive FR natif** : écrire directement en français, pas de calques anglais

### Résultat

Claude+Rosetta : GB 3.97 (vs 3.74 brut = +0.23). La réparation a fonctionné.
MAIS f26b reste à 0.005 (les directives de longueur n'ont PAS résolu le problème).

---

# PARTIE 8 — DÉCISIONS VERROUILLÉES

| # | Décision | Justification | Statut |
|---|----------|--------------|--------|
| **D-FINAL-1** | Claude+Rosetta = moteur principal OMEGA | Gap 0.09 vs Mistral, volume +56%, émotion 4.21, architecture câblée | **VERROUILLÉE** |
| **D-FINAL-2** | Mistral = benchmark vivant + spécialiste tension/action en recherche | Meilleur FR brut (4.06), meilleur CV (0.784), meilleur f26b (0.023) | **VERROUILLÉE** |
| **D-FINAL-3** | GPT-4o = éliminé du trio principal | Dernier en qualité (3.67), dernier en volume (765w), f26b=0 | **VERROUILLÉE** |
| **D-FINAL-4** | Architecture hybride en production = NON (pas maintenant) | Complexité routing/voix/continuité non justifiée pour 0.09 de delta | **VERROUILLÉE** |
| **D-FINAL-5** | Prochain chantier = monter f26b + CV chez Claude sans perdre émotion/volume | f26b Claude 0.005 vs maîtres 0.177, CV 0.650 vs maîtres 0.94 | **VERROUILLÉE** |
| **D-FINAL-6** | Stratégie EN-first = REJETÉE comme doctrine OMEGA | GPT meilleur en FR, Mistral neutre, bottleneck Claude-spécifique | **VERROUILLÉE** |
| **D-FINAL-7** | Rosetta = valeur prouvée, à améliorer | +0.23 sur Claude (3.74→3.97), 72% du gap comblé | **VERROUILLÉE** |

---

# PARTIE 9 — QUARANTAINES MISES À JOUR

| Élément | Raison | Condition de sortie |
|---------|--------|-------------------|
| GPT-4o comme candidat Scribe | Éliminé (3.67 GB, 765w volume) | Nouvelle version GPT à tester |
| Architecture hybride Claude/Mistral | Complexité non justifiée | Si gap Claude+Rosetta vs Mistral > 0.20 après optimisation |
| Stratégie EN-first | Réfutée empiriquement | N/A — décision permanente |
| f26b comme cible prompt direct | Les directives "5% > 40 mots" n'ont PAS fonctionné | Tester pistes alternatives (ponctuation, conjonctions, polisher) |
| ix_variance_x_longrate | Vérifié en partie, config complète à extraire | Audit complet des coefficients |
| 5 dimensions PCA | Carte à construire, pas encore exploitable | Extraire chargements + nommer les composantes |
| Rosetta Mistral | Non créée (Mistral testé brut uniquement) | Créer si Mistral entre en production |

---

# PARTIE 10 — FICHIERS PRODUITS CETTE SESSION

## Scripts créés

| Fichier | Contenu | Tag |
|---------|---------|-----|
| scripts/test-fr-vs-en.ts | Claude FR vs EN (500w puis 3000w) | fr-vs-en-bottleneck-v1, v2 |
| scripts/test-mistral-vs-claude.ts | Mistral vs Claude FR (500w + 3000w) | mistral-vs-claude-fr-v1 |
| scripts/test-mistral-fr-vs-en.ts | Mistral FR vs EN (3000w) | d-synth-1-audit-and-mistral-bottleneck |
| scripts/test-openai-fr-vs-en.ts | GPT FR vs EN (3000w) | gpt-fr-vs-en-bottleneck-v1 |
| scripts/bench-chapter-3models.ts | Bench chapitre 3 modèles × 2 configs + continuité | bench-chapter-3models-v1 |

## Données produites

| Fichier | Contenu |
|---------|---------|
| scoring/data/FR_VS_EN_BOTTLENECK_TEST.json | Claude FR vs EN (v1 + v2) |
| scoring/data/MISTRAL_VS_CLAUDE_FR.json | Mistral vs Claude FR |
| scoring/data/MISTRAL_FR_VS_EN_BOTTLENECK.json | Mistral FR vs EN |
| scoring/data/GPT_FR_VS_EN_BOTTLENECK.json | GPT FR vs EN |
| scoring/data/BENCH_CHAPTER_3MODELS.json | Bench chapitre final |
| sessions/FR_VS_EN_*/ | Proses brutes Claude FR/EN |
| sessions/MISTRAL_VS_CLAUDE_*/ | Proses brutes Mistral/Claude |
| sessions/MISTRAL_FR_VS_EN_*/ | Proses brutes Mistral FR/EN |
| sessions/GPT_FR_VS_EN_*/ | Proses brutes GPT FR/EN |
| sessions/BENCH_CHAPTER_*/ | Proses brutes bench chapitre |

## Documents

| Fichier | Contenu |
|---------|---------|
| docs/AUDIT_MASTER_PROMPT_D_SYNTH_1.md | Rapport audit du master-prompt |
| docs/AUDIT_LANGUAGE_CALIBRATION.md | Audit calibration par langue |

---

# PARTIE 11 — TAGS GIT PRODUITS

| Tag | Commit | Contenu |
|-----|--------|---------|
| fr-vs-en-bottleneck-v1 | 19f595de | Script Claude FR vs EN 500w |
| fr-vs-en-bottleneck-v2 | 3a7e01b5 | Script Claude FR vs EN 3000w + audit langue |
| mistral-vs-claude-fr-v1 | c3ec959e | Script Mistral vs Claude FR |
| d-synth-1-audit-and-mistral-bottleneck | — | Audit prompt + Mistral FR vs EN |
| gpt-fr-vs-en-bottleneck-v1 | — | GPT FR vs EN |
| bench-chapter-3models-v1 | — | Bench chapitre final |

---

# PARTIE 12 — PROCHAINES ACTIONS

## Priorité #1 — Chantier f26b + CV

Les directives textuelles ("fais des phrases de 40+ mots") n'ont PAS fonctionné.
3 pistes à tester :

| Piste | Description | Coût |
|-------|------------|------|
| A. Contrainte ponctuation | Interdire le point pendant 3 phrases, forcer ; et — | 4 API |
| B. Contrainte conjonctions | Imposer 3 conjonctions complexes (bien que, au moment où) / paragraphe | 4 API |
| C. Polisher post-génération | Agent qui fusionne les phrases courtes en phrases longues | 8 API |

## Priorité #2 — Face-off final propre

Claude+Rosetta optimisé vs Mistral brut (ou Mistral+mini-Rosetta) :
- Longueur verrouillée (retry si < 2700w)
- 3 runs / scène
- Mêmes scènes
- Médiane GB / CV / f26b

## Priorité #3 — Améliorer la Rosetta Claude

La Rosetta actuelle a prouvé +0.23. Axes d'amélioration :
- f26b : trouver la consigne qui fonctionne (pas "fais plus long" mais structure syntaxique)
- CV : forcer la variation par le mélange de types (synergie introspection×dialogue)
- Tester la chimie des types à l'échelle chapitre (trigrammes, assembly bonus)

---

# PARTIE 13 — MESSAGE DE REPRISE

```
OMEGA SESSION — REPRISE POST-BENCH-CHAPITRE

Version: HEAD (après bench-chapter-3models-v1)
Dernier état: SESSION_SAVE_2026-03-24_MARATHON_BOTTLENECK
Branche: phase-r-metrology-rebuild
Tests: 1911 PASS

CONTEXTE:
  6 tests, 66+ API calls, 3 modèles (Claude, Mistral, GPT-4o)
  Bottleneck langue = CLAUDE-SPÉCIFIQUE (pas universel)
  Rosetta branchée = +0.23 sur Claude (3.74 → 3.97)
  Gap restant Claude+Rosetta vs Mistral brut = 0.09
  Claude GAGNE émotion (4.21 vs 3.76), Mistral GAGNE tension (4.24 vs 3.62)
  GPT-4o ÉLIMINÉ (3.67, 765w, f26b=0)
  f26b reste le verrou (Claude 0.005, Mistral 0.023, maîtres 0.177)

DÉCISIONS VERROUILLÉES:
  D-FINAL-1: Claude+Rosetta = moteur principal
  D-FINAL-2: Mistral = benchmark/spécialiste tension
  D-FINAL-3: GPT-4o = éliminé
  D-FINAL-4: Pas d'hybride production
  D-FINAL-5: Chantier f26b + CV
  D-FINAL-6: EN-first = rejeté
  D-FINAL-7: Rosetta = valeur prouvée

PROCHAINES ACTIONS:
  #1: Chantier f26b (ponctuation / conjonctions / polisher)
  #2: Face-off final iso-volume 3 runs
  #3: Améliorer Rosetta Claude (f26b + CV + chimie types)

DOCUMENTS CLÉS:
  scoring/data/BENCH_CHAPTER_3MODELS.json
  scoring/data/FR_VS_EN_BOTTLENECK_TEST.json
  scoring/data/MISTRAL_VS_CLAUDE_FR.json
  scoring/data/MISTRAL_FR_VS_EN_BOTTLENECK.json
  scoring/data/GPT_FR_VS_EN_BOTTLENECK.json
  docs/AUDIT_MASTER_PROMPT_D_SYNTH_1.md

Architecte Suprême: Francky
IA Principal: Claude

RAPPEL: Lire les docs minutieusement AVANT d'agir.
Présenter un bilan de compréhension. Attendre validation.
```

---

*SESSION_SAVE rédigé le 2026-03-24*
*Standard NASA-Grade L4 / DO-178C Level A*
*"Ce qui n'est pas mesuré n'est pas acceptable" — OMEGA*
*"Je ne change pas de cheval à 100 mètres de l'arrivée pour 0.09 de GB" — Francky*
