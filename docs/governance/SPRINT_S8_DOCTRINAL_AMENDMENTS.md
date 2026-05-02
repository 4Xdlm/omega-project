# Sprint S8 Doctrinal Amendments

**Date scellage** : 2026-05-02 (Sprint S9 Étape 3)
**Source** : Sprints S6 + S7 + S8 (~38 commits empiriques)
**Standard** : NASA-Grade L4 / DO-178C Level A
**Status** : SEALED

---

## 0. Préambule — reconnaissance honnête

Au cours du Sprint S8, le Cowork (agent IA planning/strategic,
sandbox isolé) a référencé à plusieurs reprises un "Plan Max v3.X"
comme version canonique des amendements doctrine.

Vérification empirique runtime (Sprint S9 Étape 3 préflight) :
- Aucun fichier "Plan Max v3.0.0" n'existe dans le repo
- Le concept "Plan Max" est une inférence Cowork ad-hoc, jamais matérialisée
- Toutes les références "Plan Max" trouvées (5 fichiers) sont
  des NCRs créés par Cowork lui-même Sprint S8

Ce document remplace donc tout référencement antérieur à un
"Plan Max v3.X" inexistant. Le seul document canonique versionné
de doctrine OMEGA est `CLAUDE.md` (version v3.156.0 post-amendements).

Cette erreur d'ancrage est documentée comme EMP-8 dans
`nexus/proof/NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN.md` (8e occurrence
du pattern méta-NCR Cowork unverified anchors).

---

## 1. ANCHOR_PRE_FLIGHT

**Règle** : Toute affirmation Cowork (SHA commit, tag, test count,
path filesystem, file existence, dépendance package) doit être
marquée `[À VÉRIFIER]` ou explicitement vérifiée par Claude Code
runtime AVANT inclusion dans NCR, commit, tag, ou décision
architecturale.

**Cause** : Cowork sandbox isolé du filesystem repo. Sans
vérification runtime, anchors empiriques peuvent être obsolètes
ou inventés.

**Exemple d'erreur observée** : Sprint S8 Vague 1 C8/C9 —
6 anchors Cowork imprécis (commits, tags, test counts) flaggés
honnêtement par Claude Code lors du scellage NCR.

**Exigence opératoire** : Cowork prompts incluent systématiquement
le marker `[À VÉRIFIER]` à côté de tout anchor empirique, ou
demandent à Claude Code de vérifier en préflight.

**Impact futur** : Aucun NCR ne peut être scellé/closé sur la base
d'un anchor Cowork non vérifié runtime. Sprint S9+ obligatoire
de respect.

---

## 2. MULTI_IA_RUNTIME_ARBITER

**Règle** : Cowork = agent planning/strategic. Claude Code =
arbitre runtime empirique. Toute décision sur SHA/tag/file
existence/build state relève EXCLUSIVEMENT de Claude Code
(seul accès filesystem repo).

**Cause** : Architecture multi-IA distincte. Cowork excelle en
vision stratégique et coordination 3-IA. Claude Code excelle en
vérification empirique runtime.

**Exemple d'erreur observée** : Sprint S7.2 — Cowork affirmait
"Ollama V1_SEAL re-validated" sans vérification ; réalité
empirique = Anthropic Sonnet 4. Détection Claude Code Windows-side.

**Exigence opératoire** : Tout désaccord Cowork-vs-Claude Code
sur fait empirique = Claude Code prévaut. Cowork s'aligne
sur verdict runtime.

**Impact futur** : Doctrine multi-agents OMEGA = synergie par
spécialisation, pas conflit.

---

## 3. NO_UNVERIFIED_EXTERNAL_ANCHORS

**Règle** : Aucune clôture NCR ne peut reposer sur anchor non
vérifié runtime. SHA256 calculés empiriquement à la clôture,
pas cités de mémoire. Tags confirmés via `git tag -l <pattern>`.
Test counts confirmés via `npm test` ou équivalent. Paths
confirmés via `Test-Path` ou `git ls-files`.

**Cause** : Pattern méta Cowork unverified anchors (8 occurrences
documentées Sprint S6-S8). Risque de "faux propre" doctrinal
si on accepte des SHA inventés.

**Exemple d'erreur observée** : Sprint S8 V1 C9 — 4 anchors
M2_DEADLOCK proposés Cowork, 1/4 correct (10d9fbcf), tag/tests/drift
incorrects. Détection Claude Code → flag honnête section
NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR §11.3.

**Exigence opératoire** : NCR closure OBLIGATOIRE accompagnée
d'une section "Empirical verifications" avec commands runtime
exécutées + résultats.

**Impact futur** : Audit rétroactif S9+ recommandé sur NCRs
CLOSED via anchors potentiellement non vérifiés.

---

## 4. STRUCTURED_MEMORY_PRIORITY

**Règle** : Les mémoires structurées Cowork peuvent guider la
recherche, mais ne constituent jamais une preuve finale. Toute
information issue de mémoire doit être recoupée avec le repo
actif avant clôture NCR, commit, tag ou décision architecturale.

**Cause** : Distinction empirique observée Sprint S8 V3B C25
(NCR_DEDALE_RESET_HEALTH 6/6 anchors Cowork CORRECTS — contre-exemple
positif) vs S8 V1/V2/V3 (7 occurrences erreurs).
Les mémoires structurées project_*.md sont meilleurs candidats
runtime que les inférences Cowork ad-hoc — mais ne dispensent
pas de vérification.

**Exemple d'erreur observée** : Sprint S9 Étape 3 préflight —
"Plan Max v3.0.0" référencé par Cowork comme document canonique.
Réalité : concept Cowork ad-hoc, jamais matérialisé. EMP-8.

**Exigence opératoire** : Toute citation de mémoire Cowork
(project_*, NCRs, doctrine) suivie de "[recoupé avec repo actif
le YYYY-MM-DD]" ou marker équivalent runtime.

**Impact futur** : Cowork peut réduire son taux d'erreur en
priorisant mémoires structurées sur inférences, mais
vérification empirique reste obligatoire.

---

## 5. RECOVERY_TEST_DOCTRINE

**Règle** : Tout cleanup de package, dossier, ou artefact dans
`packages/`, `nexus/proof/`, `docs/`, ou tout chemin canonique
DOIT être précédé d'un commit ou NCR formel documentant :
(a) ce qui est supprimé empirique (paths + hashes), (b) qui décide
(autorité Architecte ou Tribunal), (c) test de récupération
empirique pré-cleanup (rebuild possible ? rollback réversible ?).

**Cause** : Sprint S6 cleanup canon-engine (commit `d54873ea`
2026-01-17 [À VÉRIFIER]) effectué sans procédure §7 formelle.
Drift package-lock.json découvert Sprint S8 Phase 0 = unique
preuve observable d'un cleanup non documenté.

**Exemple d'erreur observée** : NCR_CANON_ENGINE_JUNCTION_ORPHAN
§9bis (closure rétroactive 2026-05-01) — H1/H2/H3 hypothèses
indéterminables rétroactivement faute de logs S6.P1/P2.

**Exigence opératoire** : Avant tout `git rm`, `Remove-Item`,
ou cleanup mass :
1. NCR DRAFT obligatoire avec section "Recovery Test"
2. Test reverse (rebuild package, restore directory) doit réussir
3. Commit cleanup référence le NCR + test

**Impact futur** : Aucun cleanup silencieux post-amendement.
Sprint S6 type d'incident = bloqué structurellement.

---

## 6. WORKSPACE_VS_REPO_DRIFT

**Règle** : Cowork doit toujours préfixer paths par identifier
de workspace explicite : `[SANDBOX]` pour `/sessions/.../mnt/OMEGA/`
(workspace Cowork) ou `[REPO]` pour `omega-project/` (repo réel
Windows-side). Drift inter-workspaces = source d'erreurs distincte
des SHA inventés.

**Cause** : Sprint S8 V3C EMP-6 — Cowork a référencé
`SPRINT_S12_DRIFT_CLEANUP_PLAN.md` comme "livré" alors que le
fichier existe dans son workspace sandbox mais pas dans le repo.
Path drift workspace Cowork ↔ repo détecté par Claude Code
runtime. Sub-pattern formalisé NCR_COWORK §10bis.

**Exemple d'erreur observée** : Vague 3 V3C C29 prompt — Cowork
"plan livré" → réalité repo = INTROUVABLE.

**Exigence opératoire** : Paths Cowork dans prompts/NCRs marqués
explicitement `[SANDBOX]` ou `[REPO]`. Si Cowork cite un path
sans préfixe, Claude Code DOIT vérifier dans `[REPO]` AVANT
acceptance.

**Impact futur** : Aucun "fichier manquant" futur ne sera
attribué à evidence-gap quand il s'agit en réalité de drift
workspace.

---

## 7. Cross-références NCRs sources

- ANCHOR_PRE_FLIGHT : `nexus/proof/NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN.md` §4
  (commit `b9c8fec4` [À VÉRIFIER])
- MULTI_IA_RUNTIME_ARBITER : NCR_COWORK §3 + §4
- NO_UNVERIFIED_EXTERNAL_ANCHORS : NCR_COWORK §4
- STRUCTURED_MEMORY_PRIORITY : NCR_COWORK §11 (contre-exemple C25)
- RECOVERY_TEST_DOCTRINE : `nexus/proof/NCR_CANON_ENGINE_JUNCTION_ORPHAN.md` §9bis.6
- WORKSPACE_VS_REPO_DRIFT : NCR_COWORK §10bis (commit `99bb58ef`
  [À VÉRIFIER])

---

## 8. Doctrine — NCR OVER HEROICS

Ces 6 amendements + le préambule §0 (reconnaissance Plan Max
fantôme) illustrent la doctrine OMEGA dans son sens le plus pur :
admettre les erreurs ouvertement, formaliser les patterns observés,
renforcer le système immunitaire multi-agents.

---

## 9. Signature

```
DOCUMENT  : SPRINT_S8_DOCTRINAL_AMENDMENTS.md
SEALED    : 2026-05-02 (Sprint S9 Étape 3 C37)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal, runtime arbiter)
TRIBUNAL  : Cowork + ChatGPT + Gemini + Claude (consensus 3-IA)
STANDARD  : NASA-Grade L4 / DO-178C Level A
ACTIVATION: CLAUDE.md v3.156.0 Section H (commit C38)
META-NCR  : EMP-8 (Plan Max phantom) → NCR_COWORK §EMP-8 (commit C39)
```
