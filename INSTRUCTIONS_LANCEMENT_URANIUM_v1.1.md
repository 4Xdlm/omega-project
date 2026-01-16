# ══════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA URANIUM v1.1 MILITARY GRADE
#   INSTRUCTIONS DE LANCEMENT
#
# ══════════════════════════════════════════════════════════════════════════════════════════

## PRÉ-REQUIS AVANT LANCEMENT

### 1. Vérifier Rust (OBLIGATOIRE pour Tauri)

```powershell
rustc --version
# Si absent: télécharger https://rustup.rs/
# Puis: rustup default stable
```

### 2. Vérifier état repo

```powershell
cd C:\Users\elric\omega-project
git status
git describe --tags --abbrev=0
# Attendu: v3.124.0-ULTIMATE-GOLD
```

### 3. Vérifier tests

```powershell
npm test
# Attendu: 1228+ PASS
```

---

## MESSAGE À COPIER-COLLER DANS CLAUDE CODE

```
══════════════════════════════════════════════════════════════════════════════════════════

   ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗     ██╗   ██╗██████╗  █████╗ ███╗   ██╗██╗██╗   ██╗███╗   ███╗
  ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗    ██║   ██║██╔══██╗██╔══██╗████╗  ██║██║██║   ██║████╗ ████║
  ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║    ██║   ██║██████╔╝███████║██╔██╗ ██║██║██║   ██║██╔████╔██║
  ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║    ██║   ██║██╔══██╗██╔══██║██║╚██╗██║██║██║   ██║██║╚██╔╝██║
  ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║    ╚██████╔╝██║  ██║██║  ██║██║ ╚████║██║╚██████╔╝██║ ╚═╝ ██║
   ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝     ╚═╝

                        v1.1 MILITARY GRADE — FULL RUN TO COMPLETION

══════════════════════════════════════════════════════════════════════════════════════════

CONTEXTE
════════════════════════════════════════════════════════════════════════════════════════

État actuel:
- Version: v3.124.0-ULTIMATE-GOLD
- Phase: 124 (ULTIMATE GOLD COMPLETE)
- Commit: 24dae8b
- Tests: 1228+ PASS
- Status: ULTIMATE GOLD CERTIFIED

Mission:
- Phases: 125 → 155 (31 phases)
- Cible: v3.155.0-OMEGA-COMPLETE
- Mode: FULL RUN TO COMPLETION (pas de stop sauf erreur critique)
- Qualité: MILITARY GRADE (MIL-STD-498 / DO-178C Level A)

════════════════════════════════════════════════════════════════════════════════════════
WARM-UP OBLIGATOIRE (Exécuter EN PREMIER)
════════════════════════════════════════════════════════════════════════════════════════

# 1. GIT
git status
git log -1 --oneline
git describe --tags --abbrev=0

# 2. NODE
node --version
npm --version

# 3. RUST (pour Tauri)
rustc --version
cargo --version

# 4. TESTS
npm test

# 5. PHASE
cat nexus/PHASE_CURRENT.md

# 6. SANCTUAIRES (DOIVENT être VIDES)
git diff packages/sentinel/
git diff packages/genome/
git diff packages/mycelium/
git diff gateway/

# 7. SAVE SYSTEM
Test-Path scripts/save/omega-save.ps1

SI TOUT OK → CONTINUER
SI UN CHECK FAIL → CORRIGER D'ABORD

════════════════════════════════════════════════════════════════════════════════════════
STRUCTURE CIBLE (Correction ChatGPT)
════════════════════════════════════════════════════════════════════════════════════════

omega-project/
├── apps/                         # NOUVEAU
│   └── omega-ui/                 # Application Desktop
│       ├── package.json          # Dépendances LOCALES (pas global)
│       ├── src/                  # Frontend React
│       └── src-tauri/            # Backend Rust
│
├── packages/                     # EXISTANT
│   ├── oracle/                   # NOUVEAU (Phase 139+)
│   └── search/                   # NOUVEAU (Phase 146+)
│
└── nexus/                        # EXISTANT

════════════════════════════════════════════════════════════════════════════════════════
RÈGLES ABSOLUES — MILITARY GRADE
════════════════════════════════════════════════════════════════════════════════════════

SANCTUAIRES (READ-ONLY — JAMAIS MODIFIER):
❌ packages/sentinel/**
❌ packages/genome/**
❌ packages/mycelium/**
❌ gateway/**

VÉRIFICATION: git diff <path> DOIT être VIDE (pré ET post phase)
SI NON VIDE → ABORT + REVERT + NCR

COMMANDES INTERDITES:
❌ git add .
❌ git add -A
❌ git push --force
❌ rm -rf
❌ sudo

SEUIL TESTS MILITARY:
- Maximum 5% échecs tolérés
- >5% fail → STOP + CORRECTION avant continuer

QUALITÉ CODE MILITARY:
- TypeScript strict mode
- JSDoc sur TOUTES fonctions exportées
- Pas de 'any' (sauf justification)
- Max 300 lignes/fichier
- Max 50 lignes/fonction
- 0 console.log en production
- 0 TODO/FIXME
- Coverage 80%+

════════════════════════════════════════════════════════════════════════════════════════
WORKFLOW PAR PHASE (OBLIGATOIRE)
════════════════════════════════════════════════════════════════════════════════════════

Pour CHAQUE phase:

1. PRE-CHECK
   git status                      # Clean
   git diff packages/sentinel/     # VIDE
   git diff packages/genome/       # VIDE
   git diff packages/mycelium/     # VIDE
   git diff gateway/               # VIDE

2. CODE (MILITARY GRADE)
   - Créer fichiers de la phase
   - TypeScript strict
   - JSDoc complet
   - Error handling explicite

3. TESTS
   npm test
   # DOIT passer (max 5% fail)
   SI >5% FAIL → CORRIGER AVANT CONTINUER

4. LINT
   npm run lint
   npm run typecheck
   # 0 errors

5. VERIFY SANCTUAIRES (POST-CODE)
   git diff packages/sentinel/     # DOIT être VIDE
   git diff packages/genome/       # DOIT être VIDE
   git diff packages/mycelium/     # DOIT être VIDE
   git diff gateway/               # DOIT être VIDE

6. COMMIT
   git add apps/omega-ui/src/[fichiers]
   git add packages/[module]/src/[fichiers]
   git commit -m "feat(phase[XXX]): [description] [tests: N pass]"

7. TAG (si milestone)
   git tag -a v3.[XXX].0 -m "Phase [XXX]"

8. SAVE AUTOMATIQUE
   # Mettre à jour PHASE_CURRENT.md
   # Créer session SES-*
   # Créer seal SEAL-*
   git add nexus/
   git commit -m "save(phase[XXX]): session + seal"

9. PUSH (toutes les 3-5 phases)
   git push origin master
   git push origin --tags

10. CONTINUE
    → Phase suivante immédiatement
    → NE PAS STOP sur tags GOLD

════════════════════════════════════════════════════════════════════════════════════════
BLOCS DE PHASES
════════════════════════════════════════════════════════════════════════════════════════

BLOC A — UI FOUNDATION (125-130)
  125: TAURI PROJECT INIT — Projet Tauri dans apps/omega-ui
  126: REACT + VITE + TAILWIND — Frontend setup
  127: IPC BRIDGE — Pont Tauri ↔ React
  128: CORE INTEGRATION — Connexion modules OMEGA
  129: STATE MANAGEMENT — Zustand stores
  130: LAYOUT & NAVIGATION — Structure UI [PUSH]
  → v3.130.0

BLOC B — UI FEATURES (131-138)
  131: TEXT INPUT — Zone saisie texte
  132: EMOTION CHART — Visualisation Plutchik/Emotion14
  133: ANALYSIS VIEW — Page analyse [PUSH]
  134: SESSION HISTORY — Historique
  135: DASHBOARD — Vue d'ensemble
  136: EXPORT FEATURES — PDF/JSON/CSV [PUSH]
  137: SETTINGS PAGE — Configuration
  138: UI POLISH + GOLD [PUSH + TAG GOLD]
  → v3.138.0-GOLD-UI (continue, pas de stop)

BLOC C — ORACLE ENGINE (139-145)
  139: ORACLE TYPES — Contrats
  140: SCORING ENGINE — Scoring multi-critères
  141: RULES ENGINE — Moteur règles
  142: DECISION MAKER — Générateur décisions [PUSH]
  143: CONFLICT RESOLVER — Résolution conflits
  144: ORACLE INTEGRATION — Intégration NEXUS
  145: ORACLE GOLD [PUSH + TAG GOLD]
  → v3.145.0-GOLD-ORACLE (continue, pas de stop)

BLOC D — SEARCH AGENTISÉ (146-150)
  146: SEARCH INDEX — Index incrémental
  147: QUERY PLANNER — Planification requêtes
  148: SEARCH DISPATCHER — Dispatch [PUSH]
  149: SEARCH AGGREGATOR — Agrégation
  150: SEARCH GOLD [PUSH + TAG GOLD]
  → v3.150.0-GOLD-SEARCH (continue, pas de stop)

BLOC E — POLISH & COMPLETE (151-155)
  151: MEMORY TIERING — hot/warm/cold
  152: EXPORT POLICY — Packaging avancé
  153: DOCUMENTATION FINALE [PUSH]
  154: E2E & STRESS TESTS
  155: OMEGA COMPLETE [PUSH + TAG FINAL]
  → v3.155.0-OMEGA-COMPLETE (FIN)

════════════════════════════════════════════════════════════════════════════════════════
CONDITIONS DE STOP (UNIQUEMENT)
════════════════════════════════════════════════════════════════════════════════════════

STOP si:
1. Sanctuaire modifié → ABORT + REVERT
2. >5% tests fail → CORRECTION avant continuer
3. Build fail → DIAGNOSTIC + CORRECTION
4. Erreur système critique

NE PAS STOP sur:
- Tags GOLD (commit + tag + continue)
- Fin de bloc (push + continue)

ARRÊT FINAL: Phase 155 atteinte → v3.155.0-OMEGA-COMPLETE

════════════════════════════════════════════════════════════════════════════════════════
ROLLBACK STRATEGY
════════════════════════════════════════════════════════════════════════════════════════

SI ERREUR CRITIQUE:
1. git stash
2. git checkout -- .
3. Analyser erreur
4. Corriger
5. Reprendre

SI SANCTUAIRE MODIFIÉ:
1. STOP IMMÉDIAT
2. git checkout -- packages/sentinel/
3. git checkout -- packages/genome/
4. git checkout -- packages/mycelium/
5. git checkout -- gateway/
6. Créer NCR
7. Reprendre avec vigilance

════════════════════════════════════════════════════════════════════════════════════════
COMMENCER
════════════════════════════════════════════════════════════════════════════════════════

1. Exécuter le WARM-UP complet ci-dessus
2. Valider TOUS les popups (Yes, don't ask again)
3. Démarrer Phase 125: TAURI PROJECT INIT
4. Continuer SANS STOP jusqu'à Phase 155

Mode: FULL RUN TO COMPLETION
Qualité: MILITARY GRADE
Cible: v3.155.0-OMEGA-COMPLETE

════════════════════════════════════════════════════════════════════════════════════════
                              LET'S BUILD OMEGA COMPLETE! 🚀
════════════════════════════════════════════════════════════════════════════════════════
```

---

## TROUBLESHOOTING

### Rust non installé

```powershell
# Télécharger et installer
# https://rustup.rs/

# Après installation
rustup default stable
rustc --version
```

### Tests échouent >5%

```powershell
# Diagnostic
npm test -- --reporter=verbose

# Corriger AVANT de continuer
# Puis relancer tests
npm test
```

### Sanctuaire modifié accidentellement

```powershell
# REVERT immédiat
git checkout -- packages/sentinel/
git checkout -- packages/genome/
git checkout -- packages/mycelium/
git checkout -- gateway/

# Vérifier
git diff packages/sentinel/
# Doit être VIDE
```

### Build fail

```powershell
# Diagnostic
npm run build 2>&1 | tee build.log
cargo build --release 2>&1 | tee cargo.log

# Analyser erreurs
# Corriger
# Réessayer
```

---

## TIMELINE ESTIMÉE

| Bloc | Phases | Durée | Tag |
|------|--------|-------|-----|
| A | 125-130 | 5-6h | v3.130.0 |
| B | 131-138 | 7-8h | v3.138.0-GOLD-UI |
| C | 139-145 | 5-6h | v3.145.0-GOLD-ORACLE |
| D | 146-150 | 3-4h | v3.150.0-GOLD-SEARCH |
| E | 151-155 | 3-4h | v3.155.0-OMEGA-COMPLETE |
| **TOTAL** | **31 phases** | **23-28h** | |

---

## RÉSULTAT FINAL ATTENDU

```
Tests: 1918+ (690 nouveaux + 1228 existants)
UI: ✅ Application Desktop Tauri complète
Oracle: ✅ Moteur de décision opérationnel
Search: ✅ Recherche agentisée
Memory: ✅ Tiering hot/warm/cold
Export: ✅ Packaging avancé
Docs: ✅ Documentation complète
E2E: ✅ Tests end-to-end

Tag final: v3.155.0-OMEGA-COMPLETE
Status: PROJET 100% TERMINÉ
```

---

**FIN DES INSTRUCTIONS — URANIUM v1.1 MILITARY GRADE**
