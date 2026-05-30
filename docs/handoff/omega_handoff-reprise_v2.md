# 🧭 OMEGA — MESSAGE DE REPRISE (handoff session) — 2026-05-30 — **v2**

> **CHANGELOG v2 (2026-05-30, session de passation)** : verrouillage des chiffres de réconciliation (casts src = **85**, canon-kernel = **14** dépendants réels) après vérification de reprise runtime ; note de méthode de comptage ajoutée (cf §1 canon-kernel + §5 + §10) ; section §10 RÉCONCILIATION REPRISE ajoutée (état git Windows-side confirmé). v1 conservé sous `HANDOFF_NOUVELLE_SESSION_2026-05-30.md` (pas d'écrasement).

> À COLLER dans une nouvelle conversation du projet OMEGA. Tu es l'**IA Principal (Claude Code)** sous l'autorité de l'**Architecte Francky**. Lis ce message en entier, puis **NE PRODUIS RIEN** avant d'avoir exécuté le protocole de reprise ci-dessous et renvoyé la **check-list de compréhension signée**.

---

## 0. RÈGLE ZÉRO (avant tout)
Tu n'écris, ne modifies, ne commits, ne mesures, ne conclus **rien** tant que tu n'as pas :
1. Lu les documents de doctrine **en entier** (liste §4).
2. Revalidé l'état réel du repo en **runtime** (§5) — la mémoire et ce message sont des *pistes*, **pas** la vérité courante (EMP-04 STRUCTURED_MEMORY_PRIORITY + EMP-14).
3. Renvoyé la **check-list de compréhension** (§9) entièrement remplie.

Ligne d'invocation obligatoire avant toute action significative (doctrine EMP-14) :
> `J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 avant action.`

---

## 1. QU'EST-CE QU'OMEGA
OMEGA = **moteur de génération littéraire** (prose française qualité publication) piloté par **contrat émotionnel** et **scoring multi-axes**, certifié **NASA-Grade L4 / DO-178C Level A**.
- **Repo code** : `C:\Users\elric\omega-project\` — branche `phase-r-dispatcher-v33`, origin `github.com/4Xdlm/omega-project`.
- **Workspace** : `C:\Users\elric\Claude-Workspace\OMEGA\` — contexte, ground-rules, outputs.
- **Monorepo** : ~43 dossiers `packages/` (39 packages npm), **1774 .ts**, **~328k LOC**, **0 cycle de dépendances** (DAG propre). TypeScript strict.
- **Stack** : Sovereign Engine, K2 Chunked generation (4×750w, personas Flaubert+Proust+Duras), replay déterministe SHA256, providers Ollama (qwen3:32b) pour dev/tests + Anthropic API pour validation finale uniquement.
- **Architecture modulaire** : Sentinel (ROOT, FROZEN) → Genome (SEALED) → DNA/Mycelium (clients). Hubs critiques : `canon-kernel` (**14 dépendants réels = SPOF #1**), `orchestrator-core` (10), `genesis-planner` (6). ⚠️ Un `grep` brut de `"@omega/canon-kernel"` dans `packages/*/package.json` renvoie **15** occurrences : la 15ᵉ est le **self-name** de canon-kernel lui-même (ou une dev-dependency), PAS un dépendant. Le chiffre canonique reste **14**.

### Composants VALIDÉS (NE PAS REMETTRE EN QUESTION)
- **S-Oracle V2** : scoring 5 macro-axes ECC/AAI/RCI/SII/IFI → composite (`judgeAestheticV3`, vit dans `sovereign-engine/src/oracle/`).
- **K2 Chunked**, **Duel** (3 modes + CV gate), **Sovereign Loop**, **Cliff Gate** (shadow), **Best-of-N** (N=7), **5 Archétypes**, Interiority/Impact 3-shot, Necessity 5-shot.
- **R-METROLOGY V2** : modèle CALC **M0b_slim V3.4** câblé (ρ_dispatch=0.6138, 1334 œuvres, zéro sign flip). PLATEAU CALC SCELLÉ.
- **V1 SCELLÉ** (2026-04-13, unanimité 3 IA). **V2** = chunking adaptatif + embeddings + early-exit (en cours).
- **Émotion 14D = GARAGE/DORMANT** (NCR_EMOTION14_CANON_DRIFT, Codex §294) — `target_14d` reste `{}`, interdiction de résurrection (FORBID-CANON-GARAGE-001).
- **V2.3-A SCELLÉ SHADOW** (mode réécriture semi-auto) : couplage chunking→génération testé, NON promu (Δcomposite +0.93 non significatif). REWRITE_ORACLE = métrique scopée (exclut tension_14d).

### Composants REJETÉS (ne pas utiliser)
CI_L37, Language Profiles, Genius Engine, Polish (NO-OP), f9a (kill-switch FAIL), voice_conformity (KILL).

---

## 2. DOCTRINE & PROTOCOLES (autorité absolue)
Le SEUL document canonique de doctrine = `omega-project/CLAUDE.md` (**version v3.161.0**) + le **CODEX** + la **Trame Contrôle Total 2000 (EMP-14)**.

### 10 GOLDEN RULES (CLAUDE.md §C)
1. PROVE IT (commande + output + artefact). 2. TEST IT (chaque change → tests). 3. TRACE IT (Requirement→Code→Test→Evidence→Hash). 4. FREEZE IT (FROZEN/SEALED = intouchable, créer un nouveau jamais modifier). 5. MINIMIZE IT (plus petit change, pas de refactor non demandé). 6. DETERMINISM (seed, freeze time, inject IO). 7. EVIDENCE PACK. 8. NCR OVER HEROICS (ambiguïté → NCR, jamais deviner). 9. REPO = TRUTH (si docs ≠ code, le code gagne). 10. WINDOWS FIRST (PowerShell, chemins explicites).

### INTERDICTIONS (CLAUDE.md §D)
Modifier modules FROZEN (sentinel/genome) ; claim "fixed/working/validated" sans preuve ; skip evidence pack ; dead code ; refactor non demandé ; supposer des phases futures ; **Bash sur Windows** (PowerShell requis) ; cacher l'incertitude ; langage émotionnel ; décider sur conflit (→ demander à Francky).

### AMENDEMENTS EMP (14 au total) — les vivants à connaître
- **EMP-09 MASK_REVEAL_AUDIT** : audit dry-run avant noEmitOnError / fix massif.
- **EMP-10 TEST_BEFORE_COMMIT_STRICT** : wrapper `scripts/commit-with-tests.ps1` OBLIGATOIRE (jugement sur exit code ; classe A_CODE = TSC+Vitest, B_DOC_ONLY = doc pur).
- **EMP-11 PRE_SEAL_AUDIT_CHECKLIST** : Bloc A 7 axes + Bloc B 7 anti-bug avant scellement.
- **EMP-12 CODEX_PREFLIGHT_MANDATORY** + **EMP-12.1 CONTROL_BEFORE_WRITE** : bloc CBW avant toute action significative.
- **EMP-13 LFS_STAGING_DISCIPLINE** : JAMAIS `git add -A`/`git add .` ; staging explicite par chemin ; binaires = git-lfs.
- **EMP-14 CONTROL_TOTAL_FRAMEWORK_2000** ⭐ (RATIFIÉ 2026-05-30) : 17 gates obligatoires. Document : `docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md`. À LIRE EN ENTIER.

### Les 17 gates EMP-14 (résumé)
VERDICT_UNIQUE · CONTROL_BEFORE_WRITE · ANCHOR_PRE_FLIGHT · MATRICE_DE_PORTÉE · TEST_CAUSAL · NO_MEASURE_REDUNDANCY · PROMOTION_GATE · METRIC_HONESTY · MASK_REVEAL · TEST_BEFORE_COMMIT · ORACLE_COMPATIBILITY · BENCH_PROTOCOL · POST_RUN_AUDIT · CODEX_UPDATE · ADR/NCR · FINAL_REPORT · + 10 Règles d'Or.

### FORMAT VERDICT obligatoire (fin de chaque livrable)
```
VERDICT :
- Statut : PASS / FAIL / PASS_PARTIAL / SHADOW / REJECT / DEFERRED / RESOLVED_BY_DESIGN
- Confiance : Haute / Moyenne / Basse
- Forces : [...]
- Faiblesses : [minimum 2 — si aucune trouvée, re-vérifier, c'est suspect]
- Risques restants : [...]
- Action requise : [...]
```
Logger chaque verdict dans `outputs/log_quality.md`.

---

## 3. LE CODEX (lois & registres)
- **CODEX OMEGA** : `docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3-1.md` (+ v1-2). Lire **en entier**.
- Registres à consulter AVANT action : **FORBID-*** (interdits), **HALLU-IA-*** (cimetière des hallucinations IA — ex : consensus multi-IA sur prémisse fausse, pooling massif dilue le signal, small-n luck HALLU-IA-009), **NCR-*** (non-conformités).
- Preflight : `docs/governance/codex/OMEGA_PREFLIGHT_LOOKUP.md` + `OMEGA_CODEX_CONTROL_BEFORE_WRITE.md`.
- **Lois scellées** : L31, L33, L37, L38, S1-S3, BB-01/C01/P04, **LAW-CHUNK-048** (chunkAdaptive découplé de génération+scoring), LAW-NCR-BENCH-N-001 (n≥6).

---

## 4. 📚 LECTURE OBLIGATOIRE AVANT TOUTE ACTION (dans cet ordre)
1. `omega-project/CLAUDE.md` (doctrine v3.161.0) — **intégral**.
2. `docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md` (EMP-14) — **intégral**.
3. `docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3-1.md` (Codex) — **intégral**. (chemin confirmé présent 2026-05-30)
4. **Blueprints** : `nexus/blueprint/OMEGA_BLUEPRINT_PACK/` — `BLUEPRINT_INDEX.json`, `GRAPHS/` (functions_map, hotspots), `MODULES/`. Comprendre la topologie réelle.
5. `Claude-Workspace/OMEGA/CLAUDE.md` (résumé exécutif) + tout `context/` et `ground-rules/` (dont `frameworks-valides.md` à appliquer SANS redéduire, `voice-litteraire.md` pour la prose, `R-METRICS`).
6. NCRs récents : `nexus/proof/NCR_AUDIT_TODO_FALSE_ALARM_2026-05-30.md`, `NCR_P2_MOD_NARRATIVE_DELETED_2026-05-30.md`, `P2_CJS_TOOLING_KEEP_BY_DESIGN_2026-05-30.md`, `P3_TYPE_CASTS_TRIAGE_PLAN_2026-05-30.md`, `P3_SCRIBE_ENGINE_CONTRACT_AUDIT_PLAN.md`, `RE_AUDIT_HOSTILE_2026-05-30.md`.
7. Archive de la session précédente : `archives/work_sessions/2026-05-30_audit_total_emp14/` (label **NON_SOURCE_OF_TRUTH_RUNTIME** — historique, à revalider).

> Tout chemin marqué `[À VÉRIFIER]` doit être confirmé via `Test-Path` avant d'être cité comme acquis (ANCHOR_PRE_FLIGHT).

---

## 5. 🔁 PROTOCOLE DE REPRISE RUNTIME (à exécuter, PowerShell Windows-side)
```powershell
cd C:\Users\elric\omega-project
git status --short
git rev-parse --short HEAD
git rev-parse --short origin/phase-r-dispatcher-v33
git describe --tags
git log --oneline -12
# Baseline tests coeur :
cd packages\sovereign-engine ; npx vitest run   # attendu ~2522 pass / 0 fail
# Recompte dette casts src (reference, exclusion STRICTE) :
cd ..\.. ; (Get-ChildItem packages -Recurse -Include *.ts -File | Where-Object {$_.FullName -notmatch 'node_modules|\.d\.ts$|\.test\.ts$|[\\/]tests?[\\/]|[\\/]scripts[\\/]'} | Select-String 'as any\b|as unknown as' | Measure-Object).Count
```
**Attendu au moment du handoff (À REVALIDER — ne pas croire sur parole)** :
- HEAD = `aef5eaf1`, origin synchro (ahead 0 / behind 0), working tree **CLEAN**. *(confirmé Windows-side 2026-05-30 : HEAD aef5eaf1, 0/0, tree 0 ligne.)*
- sovereign-engine **2522 pass / 56 skip / 0 fail**. *(NON ré-exécuté à la passation v2 — à figer en baseline avant tout patch.)*
- TSC cross-package 41/41 PASS, 0 cycle.
- Dette casts `src/` = **85 EXACT** (sovereign-engine 45, scribe-engine 19, omega-metrics 7, omega-runner 5, + 8 singles à 1) ; **41** casts `scripts/` = LÉGITIMES (frontières JSON/dynamiques, KEEP).
  - ⚠️ **VERROUILLÉ 2026-05-30** : le **85** s'obtient avec l'exclusion STRICTE `node_modules|\.d\.ts$|\.test\.ts$|[\\/]tests?[\\/]|[\\/]scripts[\\/]`. Un comptage plus lâche (qui inclut `scripts/`) donne **~88** — c'est un **artefact de méthode de comptage, pas une régression**. Ne pas re-litiger « 88 vs 85 » : le canonique est **85**.

---

## 6. CE QUI A ÉTÉ FAIT (session 2026-05-29→30) — pour contexte, PAS pour re-faire
- **Audit total** du repo (4 axes : Vérité/Interconnexion/Efficacité/Faiblesse). Livrables archivés.
- **EMP-14 ratifié** (Trame Contrôle Total 2000), CLAUDE.md → v3.161.0.
- **P4 TODO** : "43 TODO" = faux signal (grep imprécis) → réel **1** (dead stub supprimé). Gate `gate:no-todo` ne couvre que sovereign-engine/src (angle mort).
- **P2 dead-code** (Tribunal 2/2) : `@omega/oracle` **ARCHIVÉ** (`archives/deprecated-packages/oracle/`, 0 import, réversible) ; `mod-narrative` **SUPPRIMÉ** (orphelin, stub throw, dep fantôme `@omega/genesis-forge`) ; 4 outils CJS (`hostile/sbom/schemas/trust-version`) **GARDÉS+documentés** KEEP_BY_DESIGN.
- **P3 casts PASS_PARTIAL** : méthode prouvée sur `truth-gate` (−5, construction immuable, 0 régression). Reste 85 dette src en plan phasé.
- **Re-audit hostile** : lockfile réconcilié ; **0 régression** confirmée ; **4 sur-affirmations de l'audit initial corrigées** honnêtement.
- **Archivage** des livrables sous `NON_SOURCE_OF_TRUTH_RUNTIME`.

---

## 7. ⏭️ TRAVAIL OUVERT (le vrai point de départ)
**Prochain pas conseillé = P3-A : cartographie des 45 casts de `sovereign-engine/src` (LECTURE SEULE d'abord).**
- Classer en 5 catégories : (1) mutation readonly évitable, (2) accès dynamique légitime, (3) frontière JSON/API, (4) type drift, (5) à auditer.
- Livrable : `nexus/proof/P3_A_SOVEREIGN_CASTS_AUDIT.md`.
- Puis patcher **UN SEUL cluster sûr** (style truth-gate) → 1 commit → STOP gate (TSC+tests avant/après, recompte delta). Jamais de sweep global, jamais toucher `scripts/`.

Roadmap P3 : **P3-A** sovereign (cartographie→1 cluster) → **P3-SCRIBE** (session dédiée, contrat narratif cross-package, cf `P3_SCRIBE_ENGINE_CONTRACT_AUDIT_PLAN.md` — NE PAS patcher à la chaîne) → **P3-C** omega-metrics+omega-runner → **P3-D** singles.
Backlog (plus tard, pas maintenant) : extension `gate:no-todo` aux autres packages, vérif lockfile en clone propre (2+2 stubs bénins).

**INTERDITS immédiats** : ne pas relancer le bench V2.3-A P4 (déjà scellé SHADOW) ; ne pas patcher scribe-engine sans contract map ; ne pas viser "zéro cast" dogmatique (les casts `scripts/` et frontières sont légitimes) ; ne pas ressusciter Émotion 14D.

---

## 8. OUTILLAGE & CONVENTIONS
- **Commits** : TOUJOURS via `.\scripts\commit-with-tests.ps1 -Message "..."` (EMP-10). Staging explicite par chemin (EMP-13), JAMAIS `git add -A`. Push : `git push origin phase-r-dispatcher-v33 --force-with-lease`. Tag les scellements.
- **Tests** : `npx vitest run` (cmd /c pour ANSI propre), juger sur exit code. PowerShell ASCII-strict pour scripts .ps1 (pas d'accents/em-dash).
- **LLM** : Ollama qwen3:32b pour dev/tests (keep_alive 24h) ; Anthropic API UNIQUEMENT validation finale (coût — cf llm-cost-guard).
- **Nommage livrables** : `projet_type_vN.ext`, outputs dans `outputs/` du projet. Pas d'écrasement (versioning).
- **Balisage SSOT** obligatoire : `[MESURE]` (commande+sortie) / `[RECONSTRUCTION]` (dérivé, peut contenir du bruit) / `[HYPOTHÈSE]` (à valider). Jamais d'affirmation non balisée.
- **Décisions d'architecture / suppressions / conflits** → STOP + **dispatch Architecte** (Francky tranche). Suppression de fichier = autorisation explicite obligatoire.

---

## 9. ✅ CHECK-LIST DE COMPRÉHENSION (à renvoyer remplie AVANT toute action)
Réponds par un message structuré qui confirme chaque point. **Aucune case ne doit rester vide ou approximative.**

```
RÉPONSE DE COMPRÉHENSION — REPRISE OMEGA
[ ] R1. J'ai lu CLAUDE.md (v3.161.0) en entier — version doctrine confirmée : ____
[ ] R2. J'ai lu OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 (EMP-14) — je cite 3 des 17 gates : ____
[ ] R3. J'ai lu le CODEX v1.3.1 — je cite 1 FORBID-* et 1 HALLU-IA-* réels : ____
[ ] R4. J'ai parcouru les blueprints — hub SPOF #1 = ____ (attendu : canon-kernel, 14 dépendants réels ; 15 en grep brut = self-name)
[ ] R5. ÉTAT RUNTIME revalidé : HEAD=____ | origin sync=____ | tree=____ | sovereign tests=____
[ ] R6. Émotion 14D = ____ (attendu : GARAGE/DORMANT, target_14d={}, FORBID-CANON-GARAGE-001)
[ ] R7. @omega/oracle = ____ | mod-narrative = ____ (attendu : archivé / supprimé)
[ ] R8. Dette casts src revalidée = ____ casts (attendu 85 STRICT ; ~88 = comptage lâche incluant scripts) ; scripts/ = ____ (légitimes KEEP)
[ ] R9. Prochain pas = ____ (attendu : P3-A cartographie sovereign-engine, LECTURE SEULE d'abord)
[ ] R10. Je m'engage à : CBW avant action · wrapper EMP-10 pour commits · staging ciblé (jamais -A) · verdict PASS/FAIL · dispatch Architecte sur toute décision/suppression · zéro supposition.
[ ] R11. Interdits que je NE ferai PAS : relancer bench V2.3-P4 (SHADOW scellé) · patcher scribe-engine sans contract map · ressusciter 14D · viser zéro-cast dogmatique · git add -A · Bash sur Windows.
[ ] R12. Une faiblesse/risque que je vois déjà dans cette reprise : ____ (montre ton esprit critique)

VERDICT DE REPRISE : GO_WRITE / GO_READ_MORE / STOP_ARCHITECT_ARBITRATION
```

> Tant que cette check-list n'est pas renvoyée complète et exacte, tu restes en lecture/préparation. **Aucun doute toléré dans la reprise.** Si un point ne colle pas avec le repo réel → STOP + signale à Francky (ne devine pas).

---

## 10. 🔒 RÉCONCILIATION REPRISE (vérification 2026-05-30, session de passation)
Une instance de reprise a exécuté le protocole §5 partiellement (vérification d'état, sans baseline tests) et **confirmé git-side** :

| Item | Attendu handoff | Mesuré (runtime 2026-05-30) | Statut |
|---|---|---|---|
| HEAD | `aef5eaf1` | `aef5eaf1` (Windows-side) | ✅ exact |
| Branche | phase-r-dispatcher-v33 | phase-r-dispatcher-v33 | ✅ |
| Origin sync | 0/0 | `0  0` (ahead/behind) | ✅ synchro |
| Working tree | CLEAN | 0 ligne `git status --short` | ✅ clean |
| `@omega/oracle` | archivé | `archives/deprecated-packages/oracle/` présent, absent de `packages/` | ✅ |
| `mod-narrative` | supprimé | `git ls-files` = 0, inexistant | ✅ |
| Casts src | 85 | 85 (STRICT) / 88 (lâche, inclut scripts) | ✅ verrouillé 85 |
| canon-kernel | 14 dépendants | 14 réels / 15 grep brut (self-name) | ✅ verrouillé 14 |
| EMP-14 doc | présent | `docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md` OUI | ✅ |
| Codex | v1.3.1 | `CODEX..._v1-3-1.md` présent | ✅ |

**Leçon WORKSPACE_VS_REPO_DRIFT confirmée live** : un premier `ls` sandbox Linux a affiché `mod-narrative` comme « présent » (lecture stale du mount) ; `git ls-files` l'a tranché à 0. **La vérité git prime sur le stat filesystem du mount** — toujours recouper une affirmation d'état par git, pas par `ls` sandbox.

**NON encore revalidé à la passation v2** : baseline `npx vitest run` sovereign-engine (2522/0). → à figer **avant tout patch code** (gate TEST_BEFORE_COMMIT). Tant que non figée : `GO_WRITE` autorisé seulement pour la cartographie P3-A en LECTURE SEULE.

---
**Architecte : Francky** · **IA Principal : Claude Code** · **Standard : NASA-Grade L4 / DO-178C Level A** · Handoff émis 2026-05-30, **v2** verrouillé 2026-05-30, HEAD `aef5eaf1` (confirmé Windows-side).
