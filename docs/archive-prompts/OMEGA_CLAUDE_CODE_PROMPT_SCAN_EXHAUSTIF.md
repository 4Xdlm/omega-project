# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : SCAN ARCHÉOLOGIQUE COMPLET
# Inventaire exhaustif de TOUT ce qu'on a remarqué, conclu, suggéré
# sur les JUGES, l'ANALYSE LITTÉRAIRE, et le SCRIBE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Budget : 0 API — lecture pure
#
# MISSION : Scanner TOUT le repo ligne par ligne et produire un document
# exhaustif listant CHAQUE observation, conclusion, suggestion, décision,
# bug identifié, hypothèse formulée concernant 3 domaines :
#   A. LES JUGES (Necessity, Impact, Interiority, tous les juges LLM + CALC)
#   B. L'ANALYSE LITTÉRAIRE (métriques, corrélations, maîtres, scoring)
#   C. LE SCRIBE (génération, prompts, personas, lore-coding, moteur)
# ═══════════════════════════════════════════════════════════════════════════════

## SOURCES À SCANNER (dans cet ordre de priorité)

### 1. Documents docs/ dans le repo (packages/sovereign-engine/docs/)

Scanner TOUS les fichiers .md dans ce dossier. Chercher notamment :
- SESSION_SAVE_*.md (tous les SESSION_SAVE des 4 derniers jours)
- DEC-*.md (tous les documents de décision)
- OMEGA_AUTOPSIE_*.md
- OMEGA_METRIC_UTILITY_REPORT.md
- Tout autre document pertinent

### 2. Documents racine du repo (C:\Users\elric\omega-project\docs\)

Scanner tous les .md ici aussi.

### 3. Code source (packages/sovereign-engine/src/)

Scanner ligne par ligne les fichiers suivants pour les COMMENTAIRES,
les INV-*, les TODO, les NOTES, les explications dans le code :

```
src/runtime/anthropic-provider.ts  ← TOUS les prompts des juges LLM
src/oracle/macro-axes.ts           ← Formules de scoring, poids, commentaires
src/oracle/axes/necessity.ts       ← Module necessity
src/oracle/axes/impact.ts          ← Module impact
src/oracle/axes/interiority.ts     ← Module interiority
src/oracle/axes/rhythm.ts          ← Module rhythm + confidence
src/oracle/axes/metaphor-novelty.ts ← Module MN
src/oracle/axes/anti-cliche.ts     ← Module anti-cliche
src/oracle/axes/show-dont-tell.ts  ← Module SDT
src/oracle/axes/authenticity.ts    ← Module authenticité
src/oracle/axes/voice-conformity.ts ← Module voix
src/oracle/axes/signature.ts       ← Module signature
src/oracle/axes/euphony-basic.ts   ← Module euphonie
src/oracle/axes/emotion-coherence.ts ← Module cohérence émotionnelle
src/oracle/axes/sensory-density.ts ← Module densité sensorielle
src/oracle/axes/physics-compliance.ts ← Module physique
src/oracle/axes/tension-14d.ts     ← Module tension
src/oracle/s-score.ts              ← Score legacy
src/oracle/s-oracle-v2.ts          ← Oracle V2
src/oracle/aesthetic-oracle.ts     ← Oracle esthétique
src/oracle/macro-s-score.ts        ← MacroSScore
src/metaphor/novelty-scorer.ts     ← Scorer métaphore
src/metaphor/metaphor-detector.ts  ← Détecteur métaphore
src/metaphor/dead-metaphor-blacklist.ts ← Blacklist
src/input/prompt-assembler-v4.ts   ← Assembleur de prompts V4
src/input/golden-exemplars.ts      ← Exemplars
src/generation/chunked-generator.ts ← Moteur chunké K2
src/duel/duel-engine.ts            ← Duel + CV Gate
src/config.ts                      ← Configuration globale
```

### 4. Scripts d'analyse (packages/sovereign-engine/scripts/)

Scanner tous les scripts .ts pour les commentaires et résultats embarqués :
```
scripts/analyze-full-metric-utility.ts
scripts/rescore-vatomic-cold.ts
scripts/rescore-sii-variants.ts
scripts/audit-necessity-judge.ts
scripts/test-vatomic-5bricks.ts
scripts/test-vrecal1-*.ts
```

### 5. Données d'analyse (packages/sovereign-engine/src/scoring/data/)

Lire les JSON de résultats pour les conclusions embarquées :
```
METRIC_UTILITY_ANALYSIS.json (résumé seulement — top 20 features)
VATOMIC_RESULTS.json
VATOMIC_RESCORED_A.json
VATOMIC_RESCORED_B.json
SII_VARIANTS_RESCORE.json (s'il existe)
```

### 6. Tests (packages/sovereign-engine/tests/)

Scanner les commentaires dans les tests pour les invariants et les notes :
```
tests/oracle/axes/*.test.ts (tous les tests d'axes)
tests/oracle/macro-axes.test.ts
tests/validation/inv-prompt-01.test.ts
tests/doctrine/moteur-v4-invariants.test.ts
```

### 7. Résultats Phase R (omega-autopsie/)

Scanner les rapports existants :
```
omega-autopsie/results_phase_r/R4_FEATURE_AUDIT_REPORT.md
omega-autopsie/results_phase_r/R6_SCORER_V3_REPORT.md
omega-autopsie/results_phase_r8/R8_TIPPING_POINTS.json (feature_importance section)
omega-autopsie/results_phase_r8/R8_GAMMA_INTERACTIONS.json (verdicts section)
omega-autopsie/results_phase_r8/R8_SCORER_COMPARISON.json
```

### 8. Documents uploadés par l'Architecte (chercher dans docs/ ou racine)

Si les fichiers suivants existent dans le repo, les scanner aussi :
```
OMEGA_DOSSIER_TECHNIQUE_SESSION_NUIT.docx (ou .md)
OMEGA_SCHEMAS_TECHNIQUES.docx (ou .md)
OMEGA_GLOSSAIRE.docx (ou .md)
OMEGA_BILAN_PERSONAS.docx (ou .md)
OMEGA_DOSSIER_REFERENCE_PISTES_ET_MIROIR.md
SESSION_SAVE_2026-03-24_MARATHON_BOTTLENECK.md
OMEGA_AUDIT_DEEP_CROISEMENTS.md
OMEGA_ENCYCLOPEDIE_METROLOGIE.md
OMEGA_PHYSIQUE_LITTERAIRE_v3.md
OMEGA_SYNTHESE_PHASE5B_DECISION.md
OMEGA_TABLE_CONVERSION_R_CONVERSION.md
OMEGA_SYNTHESE_FINALE_ROSETTA.md
```

Chercher ces fichiers dans : docs/, racine du repo, ou packages/sovereign-engine/docs/

---

## CE QU'IL FAUT EXTRAIRE

Pour CHAQUE observation trouvée, noter :

```
[SOURCE] fichier:ligne (ou fichier si pas de ligne)
[DOMAINE] JUGE | ANALYSE | SCRIBE | ARCHITECTURE
[TYPE] OBSERVATION | CONCLUSION | SUGGESTION | DÉCISION | BUG | HYPOTHÈSE | INVARIANT
[STATUT] IMPLÉMENTÉ | EN ATTENTE | ABANDONNÉ | INCONNU
[CONTENU] La citation ou le résumé exact
```

### Domaine A — JUGES (tout ce qui concerne l'évaluation)

Chercher les patterns suivants dans TOUT le code et les docs :
- `scoreNecessity`, `scoreImpact`, `scoreInteriority`
- `INV-JUDGE-*` (tous les invariants de juges)
- `juge`, `judge`, `scorer`, `scoring`, `évaluation`
- `necessity`, `impact`, `interiority`, `metaphor_novelty`
- `SII`, `ECC`, `RCI`, `IFI`, `AAI`
- `computeSII`, `computeECC`, `computeRCI`, `computeIFI`, `computeAAI`
- `weight`, `poids`, `pondération`
- `SAGA_READY`, `SEAL`, `seuil`, `threshold`
- `biais`, `bias`, `conservateur`, `sévère`, `trop strict`
- `calibration`, `recalibrage`, `rééquilibrage`
- Tout commentaire commençant par `//` qui mentionne un juge ou un score

### Domaine B — ANALYSE LITTÉRAIRE (métriques, corpus, corrélations)

Chercher :
- `corpus`, `maîtres`, `masters`, `tier A`, `Flaubert`, `Proust`, `Duras`
- `corrélation`, `correlation`, `Pearson`, `Cohen`, `importance`
- `feature`, `f1a`, `f26b`, `f24a`, `f17_`, `f28d`
- `CV`, `rhythm`, `rythme`, `variance`
- `R5`, `R6`, `R7`, `R8` (phases de la refondation)
- `utilité`, `utility`, `marginale`, `stepwise`
- `interaction`, `synergie`, `covariance`
- `window_min`, `window_opt`, `confidence`
- Toute mention de résultat d'analyse statistique

### Domaine C — SCRIBE (génération de prose)

Chercher :
- `persona`, `Flaubert`, `Proust`, `Duras`, `FDP`, `trio`
- `RAPPEL_CHUNKS`, `PF_PERSONA`, `lore-coding`, `L3`
- `chunked`, `K2`, `moteur`, `motor`
- `prompt`, `assembler`, `directive`, `consigne`
- `Duel`, `duel-engine`, `candidate`, `mode`
- `CV_GATE`, `gate`, `reject`, `retry`
- `exemplar`, `golden`, `GE-SAGA`, `few-shot`
- `ANCRE`, `anchor`, `Bovary`
- `ROM`, `attracteur`, `déclaré vs produit`
- `drift`, `température`, `seed`
- `glossaire`, `glossary`, `dictionnaire`
- Toute mention de stratégie de génération

---

## FORMAT DU RAPPORT DE SORTIE

Créer `docs/OMEGA_INVENTAIRE_EXHAUSTIF_JUGES_ANALYSE_SCRIBE.md`

Structure :

```markdown
# OMEGA — INVENTAIRE EXHAUSTIF
# Juges, Analyse Littéraire, Scribe
# Généré le [DATE] par scan automatique du repo

## STATISTIQUES
- Fichiers scannés : N
- Observations extraites : N
- Par domaine : JUGE=N, ANALYSE=N, SCRIBE=N
- Par type : OBSERVATION=N, CONCLUSION=N, SUGGESTION=N, DÉCISION=N, BUG=N

---

## A. DOMAINE JUGES

### A.1 Invariants actifs
[Liste de tous les INV-JUDGE-* trouvés]

### A.2 Prompts des juges (état actuel)
[Pour chaque juge LLM : le prompt exact, la version, les commentaires]

### A.3 Observations et conclusions
[Toutes les observations sur les juges, triées par date/source]

### A.4 Suggestions non implémentées
[Toutes les idées mentionnées mais pas encore codées]

### A.5 Bugs identifiés
[Tous les problèmes connus avec les juges]

### A.6 Poids et formules actuels
[Tableau de tous les poids dans macro-axes.ts]

---

## B. DOMAINE ANALYSE LITTÉRAIRE

### B.1 Résultats R5/R6/R7/R8
[Résumé des découvertes de chaque phase]

### B.2 Corrélations documentées
[Toutes les corrélations mentionnées dans les docs]

### B.3 Feature importance
[Classement des features par importance documentée]

### B.4 Conclusions sur les maîtres
[Ce qu'on sait sur Flaubert, Proust, Duras — données mesurées]

### B.5 Étalonnages faits
[Tous les tests de calibration effectués]

### B.6 Hypothèses non testées
[Idées d'analyse mentionnées mais pas encore exécutées]

---

## C. DOMAINE SCRIBE

### C.1 Architecture moteur actuelle
[État exact du pipeline de génération]

### C.2 Personas et ROM
[Toutes les données sur les personas documentées]

### C.3 Prompts actuels
[État des prompts — V4, rappels, exemplars, ancres]

### C.4 Leviers testés et résultats
[Historique de ce qui a été essayé et les résultats]

### C.5 Lois du Scribe (L1-L20+)
[Toutes les lois documentées]

### C.6 Suggestions non implémentées
[Idées de génération mentionnées mais pas codées]

---

## D. PISTES OUVERTES (toutes sources confondues)

### D.1 Pistes prioritaires (mentionnées plusieurs fois)
### D.2 Pistes secondaires (mentionnées une fois)
### D.3 Pistes abandonnées (avec raison)

---

## E. CONTRADICTIONS ET INCOHÉRENCES

[Si deux documents disent des choses contradictoires, les lister ici]
```

---

## MÉTHODE DE SCAN

1. Lister tous les fichiers dans les répertoires cibles
2. Pour chaque fichier, lire le contenu
3. Scanner ligne par ligne avec les patterns listés
4. Extraire le contexte (5 lignes avant/après)
5. Classifier dans le bon domaine/type
6. Dédupliquer (même observation dans plusieurs sources)
7. Trier par priorité (DÉCISION > CONCLUSION > SUGGESTION > OBSERVATION)

Pour les fichiers .docx : utiliser la commande `read_file` de Desktop Commander
qui supporte les DOCX nativement.

Pour les gros fichiers (>500 lignes) : lire par blocs de 200 lignes.

---

## COMMIT

```
chore(audit): inventaire exhaustif juges/analyse/scribe — scan complet du repo

Scan automatique de ~50 fichiers (docs, code, tests, résultats).
Extraction de toutes les observations, conclusions, suggestions,
décisions, bugs et hypothèses sur 3 domaines :
  A. JUGES (prompts, poids, biais, calibration)
  B. ANALYSE LITTÉRAIRE (corrélations, features, maîtres)
  C. SCRIBE (prompts, personas, moteur, leviers)

Rapport: docs/OMEGA_INVENTAIRE_EXHAUSTIF_JUGES_ANALYSE_SCRIBE.md
Zéro modification du code de production.
```

## IMPORTANT

- Ce script ne modifie AUCUN fichier de production
- Il LIT et COMPILE uniquement
- Le rapport doit être EXHAUSTIF — rien ne doit être omis
- Si un fichier est trop gros pour être lu en entier, le noter dans le rapport
- Si un fichier .docx ne peut pas être lu, le noter aussi
- Budget : 0 API (lecture pure de fichiers locaux)
