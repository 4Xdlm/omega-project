# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — CLAUDE CODE MEGA-PROMPT — IRM TOTAL vFINAL.2
#   DISSECTION SPACEX — MODE AUTONOMIE TOTALE
#   Toutes corrections intégrées (E1-E11 + 4 failles ChatGPT + 4 Gemini)
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   Date         : 2026-04-02
#   Branche      : phase-r-metrology-rebuild
#   Standard     : NASA-Grade L4 / DO-178C Level A
#   Autorité     : Francky (Architecte Suprême)
#   Mode         : AUTONOMIE TOTALE — exécuter de Phase I à Phase VI sans pause
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   MISSION : Exécuter l'IRM complète du repo omega-project.
#   Produire 17 livrables dans docs/irm/. Commit + tag en fin.
#   0 modification de code. Lecture pure.
#
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES ABSOLUES (NON NÉGOCIABLES)
# ═══════════════════════════════════════════════════════════════════════════════

R-00 : AUCUNE modification de fichier source, test, config ou donnée de production.
R-01 : Interdiction de modifier le code pour faire des appels API externes.
       L'agent d'analyse est autorisé à utiliser ses propres tokens pour lire et réfléchir.
R-02 : Tout livrable est un fichier .md ou .json écrit dans docs/irm/
R-03 : RÈGLE R-PROOF — Chaque affirmation contient : CHEMIN + STATUT + SOURCE + PREUVE.
       Si un des 4 manque → marquer [UNPROVEN]. AUCUNE exception.
R-04 : Les fichiers > 5 MB sont résumés (clés + structure), pas copiés.
R-05 : Python = C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe
R-06 : PowerShell : utiliser ; comme séparateur (PAS &&). Git : utiliser shell cmd.
R-07 : Lire les fichiers par chunks de 80 lignes max.
R-08 : Si un fichier n'existe pas → noter [ABSENT] et continuer. Ne JAMAIS inventer.
R-09 : 3 niveaux de granularité :
       Niveau 1 (C3-C4) : fiche complète 7 questions (~50 fichiers)
       Niveau 2 (C1-C2) : fiche courte 3 lignes (~130 fichiers)
       Niveau 3 (C0)     : inventaire brut 1 ligne (~200+ fichiers)
R-10 : Chaque fiche porte : repo_live_confirmed / doc_only / legacy_only
R-11 : 17 livrables obligatoires. 1 manquant = FAIL.
R-12 : ZÉRO INVENTION — Ne jamais inventer un module, extrapoler une interaction
       non observée, compléter un champ sans preuve repo.
       Si inconnu → UNKNOWN / NOT_FOUND / NOT_TRACEABLE.
R-13 : ConvertTo-Json → TOUJOURS ajouter -Depth 100.
R-14 : Regex (Select-String) = heuristique. Le marquer dans le livrable.
       Pour les fichiers C4 critiques : lire le code et tracer manuellement.
R-15 : PRIORITÉ :
       P0 = modules runtime (engine.ts, oracle/, scoring/, input/, duel/, polish/)
       P1 = support et tooling (validation/, benchmark/, calibration/, genius/)
       P2 = legacy, archive, packages non actifs

# ═══════════════════════════════════════════════════════════════════════════════
# CHEMINS DE RÉFÉRENCE (VÉRIFIÉS 2026-04-02)
# ═══════════════════════════════════════════════════════════════════════════════

REPO          = C:\Users\elric\omega-project
SE_SRC        = C:\Users\elric\omega-project\packages\sovereign-engine\src
SE_DATA       = ...\src\scoring\data         (74 fichiers JSON)
DOCS          = C:\Users\elric\omega-project\docs
CONTRACTS     = C:\Users\elric\omega-project\docs\contracts
PACKAGES      = C:\Users\elric\omega-project\packages   (45 packages)
AUTOPSIE      = C:\Users\elric\omega-project\omega-autopsie
RESULTS_R1    = ...\omega-autopsie\results_r1   (183 fichiers)
RESULTS_R2    = ...\omega-autopsie\results_r2
RESULTS_ROSA  = ...\omega-autopsie\results_rosetta  (94 fichiers)
PVI_MODULE    = C:\Users\elric\omega-project\scripts\pvi\pvi_module_autonome.py
PVI_DIR       = C:\Users\elric\omega-project\scripts\pvi
GATEWAY       = C:\Users\elric\omega-project\gateway
OUTPUT_DIR    = C:\Users\elric\omega-project\docs\irm

# ═══════════════════════════════════════════════════════════════════════════════
# MODE AUTONOMIE TOTALE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Exécuter les 6 phases de manière SÉQUENTIELLE et AUTONOME.
# À la fin de CHAQUE phase :
#   1. Écrire les livrables de cette phase dans docs/irm/
#   2. Afficher : "PHASE [N] TERMINÉE — [N] livrables produits"
#   3. Enchaîner automatiquement sur la phase suivante
#
# En fin de Phase VI : commit + tag + rapport final.
# Francky lira les résultats demain matin.
#
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE I — GEL DES ACQUIS (15 min)
# ═══════════════════════════════════════════════════════════════════════════════

## I.1 Créer le dossier de sortie + capturer HEAD dynamiquement

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\elric\omega-project\docs\irm"
$HEAD = (git -C "C:\Users\elric\omega-project" rev-parse HEAD)
$TESTS_COUNT = "dynamique — sera vérifié en Phase VI"
Write-Output "HEAD=$HEAD"
```

## I.2 Lire les documents de gouvernance (OBLIGATOIRE)

Lire par chunks de 80 lignes CHACUN de ces fichiers :

### Racine repo :
1. `C:\Users\elric\omega-project\OMEGA_EXECUTOR_SYSTEM.md`
2. `C:\Users\elric\omega-project\OMEGA_MASTER_PLAN_v2.md`
3. `C:\Users\elric\omega-project\OMEGA_MASTER_PLAN_ANNEXES.md`

### Contrats :
4. `C:\Users\elric\omega-project\docs\contracts\CONTRAT_TRAVAIL_OMEGA_v1.md`
5. `C:\Users\elric\omega-project\docs\contracts\CONTRAT_OMEGA_SCRIBE_v1.md`
6. `C:\Users\elric\omega-project\docs\contracts\OMEGA_BUILD_GOVERNANCE_CONTRACT.md`

### Docs de référence :
7. `C:\Users\elric\omega-project\docs\OMEGA_AUTHORITY_MODEL.md`
8. `C:\Users\elric\omega-project\docs\OMEGA_DECISIONS_LOCK_v1.md`
9. `C:\Users\elric\omega-project\docs\OMEGA_ROADMAP_v8_0.md`
10. `C:\Users\elric\omega-project\docs\OMEGA_PHASE_R_ROADMAP_v2.md`
11. `C:\Users\elric\omega-project\docs\OMEGA_PHYSIQUE_LITTERAIRE_v3.md`
12. `C:\Users\elric\omega-project\docs\OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md`
13. `C:\Users\elric\omega-project\docs\SESSION_SAVE_2026-04-01_BLOC7_FINAL.md`
14. `C:\Users\elric\omega-project\docs\SESSION_SAVE_2026-04-01_PVI_FINAL.md`
15. `C:\Users\elric\omega-project\docs\OMEGA_SCRIBE_ARCHITECTURE_MAP_2026-03-29.md`
16. `C:\Users\elric\omega-project\docs\RAPPORT_SCAN_ARCHITECTURAL.md`

Si un fichier est absent → noter [ABSENT] et continuer.
NE RIEN PRODUIRE encore. Juste LIRE et COMPRENDRE.


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE II — SCAN TECHNIQUE TOTAL (60-90 min)
# Livrables : 01, 02, 03, 04, 17
# ═══════════════════════════════════════════════════════════════════════════════

## LIVRABLE 01 : docs/irm/01_REPO_SCOPE_TOTAL.txt

Compteurs globaux (PowerShell, exécuter réellement) :
```powershell
$ts = (Get-ChildItem -Path C:\Users\elric\omega-project -Recurse -Include *.ts -Exclude node_modules,dist | Measure-Object).Count
$py = (Get-ChildItem -Path C:\Users\elric\omega-project -Recurse -Include *.py -Exclude node_modules,dist,.venv,.venv311 | Measure-Object).Count
$json = (Get-ChildItem -Path C:\Users\elric\omega-project -Recurse -Include *.json -Exclude node_modules,dist,.venv | Measure-Object).Count
$md = (Get-ChildItem -Path C:\Users\elric\omega-project -Recurse -Include *.md -Exclude node_modules,dist,.venv | Measure-Object).Count
$pkgs = (Get-ChildItem -Path C:\Users\elric\omega-project\packages -Directory).Count
```
Liste des 45 packages : lister `C:\Users\elric\omega-project\packages` depth 1.
Inclure : HEAD hash, date du scan, compteurs, liste packages, périmètre exclus.
Écrire dans `docs/irm/01_REPO_SCOPE_TOTAL.txt`.

## LIVRABLE 02 : docs/irm/02_OMEGA_FULL_TREE_WITH_UTILITY.md

Pour CHAQUE package dans packages/ (45), lire le répertoire depth 2.
Pour chaque package, noter :
- nombre de fichiers, arborescence, rôle (1 phrase)
- statut : LIVE / SEALED / EXPERIMENTAL / ARCHIVE / QUARANTINE / DEAD
- repo_live_confirmed: true

AUSSI scanner : gateway/, omega-autopsie/, omega-narrative-genome/,
scripts/pvi/, src/ (racine), scripts/, tools/

Écrire dans `docs/irm/02_OMEGA_FULL_TREE_WITH_UTILITY.md`.

## LIVRABLE 03 : docs/irm/03_DOC_CODE_MATRIX_TOTAL.json

Pour les 30 docs les plus importants dans docs/ :
- quels fichiers de code ils référencent
- quels modules ils concernent
Pour les 50 fichiers C3-C4 de code : quels docs les gouvernent.
Format JSON bidirectionnel. Écrire dans `docs/irm/03_DOC_CODE_MATRIX_TOTAL.json`.

## LIVRABLE 04 : docs/irm/04_EXPORTS_REAL_TOTAL.json

Pour sovereign-engine, extraire via (HEURISTIQUE — le marquer) :
```powershell
Select-String -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src\**\*.ts" -Pattern "^export (function|class|interface|type|const|enum)" -Recurse
```
Pour chaque package ayant un index.ts : extraire la surface publique.
Format JSON par package. Écrire dans `docs/irm/04_EXPORTS_REAL_TOTAL.json`.

## LIVRABLE 17 : docs/irm/17_STALENESS_HEATMAP.json

Pour chaque fichier .ts dans sovereign-engine/src/ :
```powershell
Get-ChildItem -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src" -Recurse -Filter "*.ts" | ForEach-Object {
    $d = git -C "C:\Users\elric\omega-project" log -1 --format="%ai" -- $_.FullName 2>$null
    [PSCustomObject]@{Path=$_.FullName.Replace("C:\Users\elric\omega-project\",""); Date=$d}
} | ConvertTo-Json -Depth 100
```
Classifier : HOT (<30j) / WARM (<90j) / COLD (<180j) / FROZEN (>180j).
Alertes : COLD+LIVE=dette, HOT+SEALED=violation.
Écrire dans `docs/irm/17_STALENESS_HEATMAP.json`.


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE III — SCAN FONCTIONNEL (60 min)
# Livrables : 05, 06, 07, 11, 12
# ═══════════════════════════════════════════════════════════════════════════════

## LIVRABLE 05 : docs/irm/05_INTERFACE_CONTRACTS_TOTAL.md

Scanner les types dans sovereign-engine. Pour chaque interface/type majeur,
produire une INTERFACE_CARD avec : fichier source, champs exacts + types,
optionalité, producteurs, consommateurs, invariants, frontière OMEGA/SCRIBE.

Interfaces MINIMUM (15) : ForgePacket, SceneBrief, StateDelta,
SovereignForgeResult, SovereignProvider, AxesScores, MacroScores,
DuelResult, QualityReport, ProofPack, TextFeatures, DepthFeatures,
GBScoreResult, RidgeScoreResult, V3ScoreResult.

Lire MANUELLEMENT les fichiers source (pas regex) pour les C4.
Si un type n'est pas trouvé → [NOT_FOUND]. Ne JAMAIS inventer.
Écrire dans `docs/irm/05_INTERFACE_CONTRACTS_TOTAL.md`.

## LIVRABLE 06 : docs/irm/06_IMPACT_COUPLING_MATRIX.json

Pour chaque fichier C3-C4 de src/ (P0 en priorité : engine.ts, oracle/,
scoring/, input/, duel/, polish/) :
- Lire les imports réels (les premières 50 lignes du fichier)
- Lister : imports_from, imported_by, criticité, impact si supprimé

Format JSON. Écrire dans `docs/irm/06_IMPACT_COUPLING_MATRIX.json`.

## LIVRABLE 07 : docs/irm/07_MODULE_LIFECYCLE_REGISTRY.json

Pour chaque répertoire dans src/ (42) + chaque package hors SE (45) :
```json
{"module":"oracle/", "lifecycle":"LIVE", "files_count":27, "criticality":"C4",
 "repo_live_confirmed":true, "notes":"Scoring esthétique 18 axes"}
```
Statuts : LIVE / SEALED / EXPERIMENTAL / ARCHIVE / QUARANTINE / DEAD / ZOMBIE / PHANTOM / TOXIC
Écrire dans `docs/irm/07_MODULE_LIFECYCLE_REGISTRY.json`.

## LIVRABLE 11 : docs/irm/11_PIPELINE_ATLAS_TOTAL.md

### Pipelines nominaux
Lire engine.ts MANUELLEMENT. Extraire les 16 étapes avec :
numéro, fonction, type (CALC/LLM), entrée, sortie.

### Pipelines d'échec (CRITIQUE — manquait dans les versions précédentes)
Pour chaque gate/condition dans engine.ts, duel-engine.ts,
damage-gate.ts, polish-engine.ts, gates/ :
- Lire les conditions de rejet
- Construire l'arbre : SI condition → ALORS action (retry/rollback/reject/fail)

### Pipelines hors sovereign-engine
P-CORPUS : omega-autopsie/full_work_analyzer_v4.py → résultats
P-ROSETTA : results_rosetta/ → matrice
P-PVI : scripts/pvi/pvi_module_autonome.py → P1→P5

Écrire dans `docs/irm/11_PIPELINE_ATLAS_TOTAL.md`.

## LIVRABLE 12 : docs/irm/12_OMEGA_SCRIBE_BOUNDARY_TABLE.json

Scanner runtime/anthropic-provider.ts + input/prompt-assembler-v2.ts + v4.ts.
Pour chaque donnée traversant la frontière OMEGA→SCRIBE :
```json
{"field":"SceneBrief", "direction":"OMEGA→SCRIBE", "authorized":true,
 "when":"pré-génération", "source_file":"src/cde/brief-distiller.ts"}
```
Aussi noter ce qui est INTERDIT (cf CONTRAT_OMEGA_SCRIBE).
Écrire dans `docs/irm/12_OMEGA_SCRIBE_BOUNDARY_TABLE.json`.


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE IV — SCAN SCIENTIFIQUE (90 min)
# Livrables : 08, 09, 10
# ═══════════════════════════════════════════════════════════════════════════════

## LIVRABLE 10 : docs/irm/10_FEATURE_ATLAS_TOTAL.json

### Sources à lire INTÉGRALEMENT :
1. `src/scoring/text-features.ts` — extraire chaque feature calculée
2. `src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json` (105 KB)
   → confidence_table, weight_table, disabled_below, never_active, language_dependency
3. `src/scoring/data/R8_TYPOLOGICAL_CONSTANTS.json` → CIF + lambda par type × feature
4. `src/scoring/data/MEASURE_ROLES.json` → rôle de chaque mesure
5. docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md → classification features
6. docs/OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md → pilotabilité, lois

Pour CHAQUE feature (viser 80+ sur 94), produire :
```json
{"id":"f1_mean", "name":"mean sentence length", "family":"RHYTHM",
 "source_file":"src/scoring/text-features.ts",
 "stability":{"600w":{"cv":"X","conf":"X"}, "2500w":{"cv":"X","conf":"X"}},
 "typology":"LOCAL", "language":"bilingue",
 "pilotability":"BLOQUÉE (BB-P04 plancher 35w)",
 "scorers":["GB_V1","Ridge_V2","V3"],
 "status":"DRIVER", "repo_live_confirmed":true,
 "danger":"GB V1 inversé sur f26b < 1000w"}
```
Si une donnée manque → [UNKNOWN]. Ne JAMAIS inventer.
Écrire dans `docs/irm/10_FEATURE_ATLAS_TOTAL.json`.

## LIVRABLE 09 : docs/irm/09_LAW_REGISTRY_TOTAL.md

### Sources :
- docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md + MANUEL_v1.0.md
- docs/OMEGA_CONFLICT_TAXONOMY.md
- docs/CLAUDE_BLACKBOX_AUDIT.md + _LITERARY_CONSTRAINTS.md + _OBSERVABLE_LAWS.md
- docs/OMEGA_DECISIONS_LOCK_v1.md

Pour CHAQUE loi (viser 25+), produire une LAW_CARD :
```markdown
### LAW [ID]
- Énoncé : [texte exact]
- Équation : [si applicable]
- Type : CAUSALE / DESCRIPTIVE / SCALING / INTERACTION / RÉGIME / CULTURELLE
- Domaine : Langue=[X], Taille=[X], Modèle=[X], Corpus=[X]
- Preuve : [protocole, N échantillons]
- Niveau : SEALED / HIGH_CONFIDENCE / PARTIAL / CANDIDATE / QUARANTINE
- Traçabilité : doc=[X], données=[X], code=[X ou ABSENT], test=[X ou ABSENT]
- Production : OUI / NON (shadow) / NON (pas implémenté)
- Collision ID : [si doublon — vérifier L35 signalé par Gemini]
```

Lois MINIMUM à ficher : L31, L33, L34, L37, L38, S1, S2, S3,
BB-01, BB-02, BB-03, BB-P03, BB-P04, BB-P06, BB-P07, BB-C01, BB-C02,
R1, R2, R3, CF1-CF4, M1-M5, L28, E1.
Écrire dans `docs/irm/09_LAW_REGISTRY_TOTAL.md`.

## LIVRABLE 08 : docs/irm/08_THRESHOLDS_AUDIT_TOTAL.md

Scanner les seuils hardcodés (HEURISTIQUE) :
```powershell
Select-String -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src\**\*.ts" -Pattern "SAGA_READY|SEAL_ATOMIC|92\.0|93\.0|85\.0|0\.30|threshold|THRESHOLD" -Recurse
```
Pour chaque seuil C3-C4 : valeur, fichier:ligne, provenance, domaine validité,
preuve, magic number oui/non, dupliqué où, impact si changé.
Écrire dans `docs/irm/08_THRESHOLDS_AUDIT_TOTAL.md`.

## Scanner aussi PVI + Rosetta (intégrer dans les livrables ci-dessus)

PVI : lire `C:\Users\elric\omega-project\scripts\pvi\pvi_module_autonome.py`
→ Extraire 8 variables, coefficients, AUC, pipeline P1-P5.
→ Intégrer dans LAW_REGISTRY (lois PVI).

Rosetta : lire les fichiers clés de results_rosetta/ (les 01_ à 10_ + s0/)
→ Intégrer dans FEATURE_ATLAS (pilotabilité) et LAW_REGISTRY.


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE V — RÉCONCILIATION + CANCER + ABSENCES (45 min)
# Livrables : 13, 14, 15
# ═══════════════════════════════════════════════════════════════════════════════

## LIVRABLE 13 : docs/irm/13_DUPLICATION_AND_CANCER_REPORT.md

### A. Doublons fonctionnels (scanner via heuristique + lecture manuelle)
```powershell
# SAGA_READY dupliqués
Select-String -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src\**\*.ts" -Pattern "SAGA_READY|92\.0|SEAL_ATOMIC|93\.0" -Recurse
# computeMinAxis dupliqué
Select-String -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src\**\*.ts" -Pattern "computeMinAxis|minAxis|min_axis" -Recurse
# Token estimation dupliqué
Select-String -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src\**\*.ts" -Pattern "estimateTokens|tokenCount|countTokens" -Recurse
```

### B. Tokens morts (scanner + tracer la chaîne de dépendance)
```powershell
# TM-01/02/03 : cibles de longueur mortes
Select-String -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src\**\*.ts" -Pattern "8-12|15-20|avg_sentence_length_target" -Recurse
# TM-04 : semicolons comme règle
Select-String -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src\**\*.ts" -Pattern "point-virgule|semicolon|points-virgules" -Recurse
# TM-05 : subordination target
Select-String -Path "C:\Users\elric\omega-project\packages\sovereign-engine\src\**\*.ts" -Pattern "subordination.*0\." -Recurse
```
Pour chaque token mort : localisation, fonctions qui le consomment,
fonctions qui compensent, chaîne de purge complète.

### C. Magic numbers (seuils sans source)
Croiser avec le LIVRABLE 08. Tout seuil sans provenance = magic number.

### D. Code mort / zombie
Vérifier : s-score.ts encore importé ? exemplar/ encore utilisé ? compat/ nécessaire ?

Écrire dans `docs/irm/13_DUPLICATION_AND_CANCER_REPORT.md`.

## LIVRABLE 14 : docs/irm/14_TRUTH_RECONCILIATION_MATRIX.md

Identifier TOUTES les contradictions entre docs, code et bench :
| Affirmation | Source 1 | Source 2 | Concordance | Autorité |
Ex : AAI 8% vs 25%, SAGA_READY dupliqué, f26b importance inversée GB/Ridge,
PVI absent du pipeline, L35 collision ID, etc.
Pour chaque contradiction : quelle source l'emporte, action requise.
Écrire dans `docs/irm/14_TRUTH_RECONCILIATION_MATRIX.md`.

## LIVRABLE 15 : docs/irm/15_PHANTOM_AND_BACKLOG_MAP.md

Scanner roadmap v8 + addendum v9 + physique littéraire + analyse maximale.
Classifier chaque élément mentionné :
| Élément | Statut | Preuve code |
Statuts : EXISTE+ACTIF / EXISTE+INUTILISÉ / MENTIONNÉ+ABSENT(=PHANTOM) /
PRÉVU+NON IMPLÉMENTÉ / EN QUARANTAINE / REDONDANT
Écrire dans `docs/irm/15_PHANTOM_AND_BACKLOG_MAP.md`.

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE VI — RAPPORT DE CHIRURGIE + COMMIT (30 min)
# Livrable : 16
# ═══════════════════════════════════════════════════════════════════════════════

## LIVRABLE 16 : docs/irm/16_SESSION_SAVE_IRM_TOTAL.md

### A. Verdict par pièce significative
Pour chaque module/package/fichier important :
GARDER / DÉPLACER / FUSIONNER / ARCHIVER / TUER / RECERTIFIER / QUARANTAINE

### B. Métriques globales du scan
- Fichiers scannés, packages audités (/45), fiches N1/N2/N3
- Features fichées (/94), lois fichées (/~30), seuils fichés
- Pipelines documentés, doublons détectés, tokens morts trouvés
- Magic numbers, contradictions, phantoms

### C. Top 5 actions prioritaires (avec criticité + impact)

### D. Top 5 risques identifiés (avec probabilité + impact)

### E. Dette technique estimée
Lignes code mort, doublons fonctionnels, tokens gaspillés/run, seuils non sourcés.

### F. Contre-analyse hostile (PHASE X — INNOVATION)
Pour chaque GRANDE conclusion de l'IRM :
- Pourquoi elle pourrait être fausse
- Zones d'incertitude restantes
- Incohérences possibles non résolues

Écrire dans `docs/irm/16_SESSION_SAVE_IRM_TOTAL.md`.


# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT FINAL + VÉRIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

## Vérification tests (les tests ne doivent PAS avoir changé)
```powershell
Set-Location C:\Users\elric\omega-project\packages\sovereign-engine; npx vitest run 2>&1 | Select-String "Tests|passed|failed"
```

## Commit

Écrire le message dans un fichier puis commiter :
```powershell
Set-Content -Path "C:\Users\elric\omega-project\commit_msg.txt" -Value "docs(irm): OMEGA IRM TOTAL v1 - dissection SpaceX 17 livrables"
Set-Location C:\Users\elric\omega-project
git add docs/irm/
git commit -F commit_msg.txt
git tag omega-irm-total-v1
git push origin phase-r-metrology-rebuild --tags
```

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKLIST FINALE — CRITÈRES PASS/FAIL (15 critères)
# ═══════════════════════════════════════════════════════════════════════════════

[ ] 01. Chaque package (45) a une entrée dans le LIVRABLE 02
[ ] 02. Chaque fichier C3-C4 (~50) a une fiche Niveau 1
[ ] 03. Chaque fichier C1-C2 (~130) a une fiche courte Niveau 2
[ ] 04. Fichiers C0 dans inventaire brut Niveau 3
[ ] 05. 15+ interfaces ont une INTERFACE_CARD (LIVRABLE 05)
[ ] 06. 80+ features ont une FEATURE_CARD (LIVRABLE 10)
[ ] 07. 25+ lois ont une LAW_CARD (LIVRABLE 09)
[ ] 08. Seuils C3-C4 ont une THRESHOLD_CARD (LIVRABLE 08)
[ ] 09. Pipeline A a arbre nominal + échec (LIVRABLE 11)
[ ] 10. Pièces significatives ont un verdict chirurgical (LIVRABLE 16)
[ ] 11. Chaque fiche porte repo_live_confirmed (R-10)
[ ] 12. Règle R-PROOF respectée — 0 affirmation sans 4 éléments (R-03)
[ ] 13. 17 livrables produits dans docs/irm/ (R-11)
[ ] 14. Tests restent GREEN
[ ] 15. 0 fichier de production modifié (R-00)

UN SEUL critère manqué → noter FAIL + raison dans le LIVRABLE 16.

# ═══════════════════════════════════════════════════════════════════════════════
# FORMAT STRICT DES FICHES (IMPOSÉ — chatGPT faille #3)
# ═══════════════════════════════════════════════════════════════════════════════

## MODULE_CARD (Niveau 1)
```
name:
path:
role:
inputs:
outputs:
dependencies_in:
dependencies_out:
criticality: C0|C1|C2|C3|C4
lifecycle: LIVE|SEALED|DEAD|PHANTOM|QUARANTINE|TOXIC
repo_live_confirmed: true|false
tests_count:
proof: [commit|tag|doc]
verdict: GARDER|DÉPLACER|FUSIONNER|ARCHIVER|TUER|RECERTIFIER|QUARANTAINE
danger: [risque spécifique si modifié]
```

## FILE_CARD (Niveau 2 — version courte)
```
path: | role: | lifecycle: | criticality: | repo_confirmed: true
```

## INVENTORY_LINE (Niveau 3)
```
[chemin] | [statut] | [1 mot rôle]
```

# ═══════════════════════════════════════════════════════════════════════════════
# FIN DU PROMPT — MODE AUTONOMIE TOTALE
# ═══════════════════════════════════════════════════════════════════════════════
#
# EXÉCUTER Phase I → II → III → IV → V → VI SANS PAUSE.
# Écrire chaque livrable au fur et à mesure.
# En fin de Phase VI : commit, tag, push.
# Francky lira les résultats demain matin.
#
# "Ce qui n'est pas prouvé n'existe pas."
# "Ce qui n'est pas mesuré n'est pas acceptable."
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Autorité : Francky (Architecte Suprême)
# ═══════════════════════════════════════════════════════════════════════════════
