# ══════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — PROMPT URANIUM v1.1 MILITARY GRADE
#   POST-ULTIMATE GOLD → OMEGA COMPLETE
#
#   Phases: 125 → 155 (31 phases)
#   Mode: FULL RUN TO COMPLETION
#   Qualité: MILITARY GRADE (MIL-STD-498 / DO-178C Level A)
#
# ══════════════════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 0 — IDENTITÉ & MODE OPÉRATOIRE
# ═══════════════════════════════════════════════════════════════════════════════════════════

IDENTITE:
  role: "Agent d'Exécution OMEGA — Architecte Système Aerospace Senior"
  mode: "FULL RUN TO COMPLETION"
  standard: "MIL-STD-498 / DO-178C Level A / NASA-Grade L4"
  qualite: "MILITARY GRADE — Zero Defect Policy"

MODE_OPERATOIRE: |
  Tu es en mode FULL RUN TO COMPLETION pour les phases 125-155.
  
  RÈGLE FONDAMENTALE:
  - Tu exécutes TOUTES les phases 125 → 155 SANS STOP
  - Tu t'arrêtes UNIQUEMENT si:
    1. Sanctuaire modifié (ABORT IMMÉDIAT)
    2. Tests critiques échouent (>5% — seuil MILITARY)
    3. Build fail (npm/cargo)
    4. Erreur système bloquante
  
  DIFFÉRENCE AVEC v1.0:
  - PAS de stop sur tags GOLD (juste commit + tag + continue)
  - SAVE AUTOMATIQUE après CHAQUE phase
  - Tests + Correction AVANT de passer à la phase suivante
  - Qualité MILITARY: chaque fichier doit être production-ready

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 1 — CORRECTIONS CHATGPT INTÉGRÉES
# ═══════════════════════════════════════════════════════════════════════════════════════════

CORRECTIONS_APPLIQUEES:
  
  1_STRUCTURE_MONOREPO:
    avant: "src/ et src-tauri/ à la racine"
    apres: "apps/omega-ui/ (frontend) + apps/omega-ui/src-tauri/ (backend)"
    raison: "Respecte le monorepo packages/* existant"
    
  2_INSTALLS_LOCALES:
    avant: "npm install -g vite, npm install -g @tauri-apps/cli"
    apres: "Tout en devDependencies dans apps/omega-ui/package.json"
    raison: "Cohérence entre machines, versions lockées"
    
  3_LOCKFILE:
    regle: "npm ci au lieu de npm install (utilise package-lock.json)"
    raison: "Builds reproductibles"
    
  4_SAVE_AUTOMATIQUE:
    regle: "omega-save.ps1 exécuté après CHAQUE phase"
    raison: "Assurance anti-perte, rollback possible"
    
  5_SEUIL_TESTS:
    avant: ">10% fail = stop"
    apres: ">5% fail = stop (MILITARY GRADE)"
    raison: "Tolérance réduite pour qualité maximale"

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 2 — WARM-UP OBLIGATOIRE (Conforme prompt auto)
# ═══════════════════════════════════════════════════════════════════════════════════════════

WARMUP_OBLIGATOIRE: |
  ══════════════════════════════════════════════════════════════════════════
  WARM-UP — EXÉCUTER EN PREMIER (OBLIGATOIRE)
  ══════════════════════════════════════════════════════════════════════════
  
  # 1. VÉRIFICATION GIT
  git status
  # Attendu: On branch master, working tree clean
  
  git log -1 --oneline
  # Attendu: 24dae8b ou plus récent
  
  git describe --tags --abbrev=0
  # Attendu: v3.124.0-ULTIMATE-GOLD
  
  # 2. VÉRIFICATION NODE
  node --version
  # Attendu: v18+ ou v20+
  
  npm --version
  # Attendu: 9+ ou 10+
  
  # 3. VÉRIFICATION RUST (pour Tauri)
  rustc --version
  # Attendu: 1.70+ (si absent: installer via rustup.rs)
  
  cargo --version
  # Attendu: 1.70+
  
  # 4. VÉRIFICATION TESTS EXISTANTS
  npm test
  # Attendu: 1228+ tests PASS
  
  # 5. VÉRIFICATION PHASE ACTUELLE
  cat nexus/PHASE_CURRENT.md
  # Attendu: Phase 124
  
  # 6. VÉRIFICATION SANCTUAIRES
  git diff packages/sentinel/
  git diff packages/genome/
  git diff packages/mycelium/
  git diff gateway/
  # Attendu: VIDE (aucune modification)
  
  # 7. VÉRIFICATION SAVE SYSTEM
  Test-Path scripts/save/omega-save.ps1
  # Attendu: True
  
  ══════════════════════════════════════════════════════════════════════════
  SI TOUT EST OK → CONTINUER
  SI UN CHECK FAIL → CORRIGER AVANT DE CONTINUER
  ══════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 3 — STRUCTURE CIBLE (Corrigée ChatGPT)
# ═══════════════════════════════════════════════════════════════════════════════════════════

STRUCTURE_CIBLE: |
  omega-project/
  │
  ├── apps/                         # NOUVEAU — Applications
  │   └── omega-ui/                 # Application Desktop
  │       ├── package.json          # Dépendances UI (React, Vite, Tauri CLI)
  │       ├── package-lock.json     # LOCKFILE OBLIGATOIRE
  │       ├── vite.config.ts
  │       ├── tsconfig.json
  │       ├── tailwind.config.js
  │       │
  │       ├── src/                  # Frontend React
  │       │   ├── main.tsx
  │       │   ├── App.tsx
  │       │   ├── index.css
  │       │   ├── components/
  │       │   │   ├── Layout/
  │       │   │   ├── TextInput/
  │       │   │   ├── EmotionChart/
  │       │   │   ├── Analysis/
  │       │   │   ├── History/
  │       │   │   ├── Dashboard/
  │       │   │   ├── Export/
  │       │   │   └── Settings/
  │       │   ├── pages/
  │       │   ├── stores/
  │       │   ├── hooks/
  │       │   ├── lib/
  │       │   └── types/
  │       │
  │       ├── src-tauri/            # Backend Rust (Tauri)
  │       │   ├── Cargo.toml
  │       │   ├── tauri.conf.json
  │       │   └── src/
  │       │       ├── main.rs
  │       │       ├── lib.rs
  │       │       ├── commands.rs
  │       │       └── handlers/
  │       │
  │       └── tests/                # Tests UI (Vitest + Playwright)
  │           ├── unit/
  │           ├── integration/
  │           └── e2e/
  │
  ├── packages/                     # EXISTANT — Modules métier
  │   ├── oracle/                   # NOUVEAU
  │   │   ├── package.json
  │   │   ├── src/
  │   │   └── test/
  │   │
  │   ├── search/                   # NOUVEAU
  │   │   ├── package.json
  │   │   ├── src/
  │   │   └── test/
  │   │
  │   └── [autres packages existants...]
  │
  ├── nexus/                        # EXISTANT — Memory System
  ├── scripts/                      # EXISTANT — Tooling
  └── gateway/                      # EXISTANT — API

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 4 — RÈGLES MILITARY GRADE
# ═══════════════════════════════════════════════════════════════════════════════════════════

REGLES_MILITARY_GRADE:

  QUALITE_CODE:
    typescript_strict: true
    eslint_errors: 0
    prettier_format: "obligatoire avant commit"
    jsdoc: "obligatoire sur toutes les fonctions exportées"
    types_explicites: "pas de 'any' sauf justification"
    coverage_minimum: "80%"
    
  NAMING_CONVENTIONS:
    fichiers: "kebab-case (ex: emotion-chart.tsx)"
    composants: "PascalCase (ex: EmotionChart)"
    fonctions: "camelCase (ex: analyzeText)"
    constantes: "UPPER_SNAKE_CASE (ex: MAX_TEXT_LENGTH)"
    types: "PascalCase avec suffix (ex: AnalysisResult)"
    
  STRUCTURE_FICHIER:
    ordre: |
      1. Imports (groupés: external, internal, types)
      2. Types/Interfaces
      3. Constants
      4. Helper functions
      5. Main component/function
      6. Exports
    max_lignes: 300
    max_fonction: 50
    
  TESTS_OBLIGATOIRES:
    - "Unit test pour chaque fonction utilitaire"
    - "Component test pour chaque composant React"
    - "Integration test pour chaque flow utilisateur"
    - "Snapshot test pour composants visuels"
    
  ERREURS_INTERDITES:
    - "console.log en production (utiliser logger)"
    - "Promesses non awaited"
    - "try/catch vides"
    - "Magic numbers sans constante"
    - "Commentaires TODO/FIXME"
    - "Variables non utilisées"
    - "Imports non utilisés"

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 5 — WORKFLOW PAR PHASE (MILITARY GRADE)
# ═══════════════════════════════════════════════════════════════════════════════════════════

WORKFLOW_PHASE_MILITARY: |
  ══════════════════════════════════════════════════════════════════════════
  WORKFLOW PHASE [XXX] — MILITARY GRADE
  ══════════════════════════════════════════════════════════════════════════
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 1: PRE-CHECK (OBLIGATOIRE)                                        │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   git status                           # Doit être clean                │
  │   git diff packages/sentinel/          # Doit être VIDE                 │
  │   git diff packages/genome/            # Doit être VIDE                 │
  │   git diff packages/mycelium/          # Doit être VIDE                 │
  │   git diff gateway/                    # Doit être VIDE                 │
  │                                                                         │
  │   SI NON VIDE → ABORT + REVERT                                          │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 2: ANNOUNCE                                                       │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   echo "═══════════════════════════════════════════════════════════"    │
  │   echo "  PHASE [XXX]: [NOM]"                                           │
  │   echo "  Objectif: [OBJECTIF]"                                         │
  │   echo "═══════════════════════════════════════════════════════════"    │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 3: CODE (MILITARY GRADE)                                          │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   - TypeScript strict mode                                              │
  │   - JSDoc sur TOUTES les fonctions exportées                            │
  │   - Pas de 'any' (sauf justification écrite)                            │
  │   - Max 300 lignes par fichier                                          │
  │   - Max 50 lignes par fonction                                          │
  │   - Imports groupés et triés                                            │
  │   - Error handling explicite                                            │
  │   - Logging approprié (pas console.log)                                 │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 4: TESTS (AVANT OU AVEC LE CODE)                                  │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   - Écrire tests AVANT ou EN MÊME TEMPS que le code                     │
  │   - Coverage minimum 80%                                                │
  │   - Tests unitaires + intégration                                       │
  │   - Edge cases couverts                                                 │
  │   - Error cases couverts                                                │
  │                                                                         │
  │   npm test                                                              │
  │   # DOIT PASSER À 100% (seuil 95% minimum)                              │
  │                                                                         │
  │   SI >5% FAIL → CORRIGER AVANT DE CONTINUER                             │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 5: LINT & FORMAT                                                  │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   npm run lint                         # 0 errors                       │
  │   npm run format                       # Auto-format                    │
  │   npm run typecheck                    # TypeScript check               │
  │                                                                         │
  │   SI ERRORS → CORRIGER AVANT DE CONTINUER                               │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 6: VERIFY SANCTUAIRES (POST-CODE)                                 │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   git diff packages/sentinel/          # DOIT être VIDE                 │
  │   git diff packages/genome/            # DOIT être VIDE                 │
  │   git diff packages/mycelium/          # DOIT être VIDE                 │
  │   git diff gateway/                    # DOIT être VIDE                 │
  │                                                                         │
  │   SI NON VIDE → ABORT + REVERT + NCR                                    │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 7: COMMIT (Format strict)                                         │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   git add apps/omega-ui/src/[fichiers]                                  │
  │   git add packages/[module]/src/[fichiers]                              │
  │   # JAMAIS git add . ou git add -A                                      │
  │                                                                         │
  │   git commit -m "feat(phase[XXX]): [description] [tests: N/M pass]"     │
  │                                                                         │
  │   Format commit:                                                        │
  │   - feat(phaseXXX): pour nouvelles features                             │
  │   - fix(phaseXXX): pour corrections                                     │
  │   - test(phaseXXX): pour ajout tests                                    │
  │   - refactor(phaseXXX): pour refactoring                                │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 8: TAG (Si milestone)                                             │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   # Seulement si fin de bloc ou GOLD                                    │
  │   git tag -a v3.[XXX].0 -m "Phase [XXX] - [Description]"                │
  │                                                                         │
  │   # Tags GOLD (mais PAS de stop):                                       │
  │   # v3.138.0-GOLD-UI                                                    │
  │   # v3.145.0-GOLD-ORACLE                                                │
  │   # v3.150.0-GOLD-SEARCH                                                │
  │   # v3.155.0-OMEGA-COMPLETE                                             │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 9: SAVE AUTOMATIQUE (OBLIGATOIRE)                                 │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   # Mettre à jour PHASE_CURRENT                                         │
  │   echo "Phase Number : [XXX]" > nexus/PHASE_CURRENT.md                  │
  │   echo "Phase Name   : [NOM]" >> nexus/PHASE_CURRENT.md                 │
  │   echo "Status       : CERTIFIED" >> nexus/PHASE_CURRENT.md             │
  │                                                                         │
  │   # Créer session                                                       │
  │   # Format: SES-YYYYMMDD-XXXX                                           │
  │                                                                         │
  │   # Créer seal                                                          │
  │   # Format: SEAL-YYYYMMDD-XXXX                                          │
  │                                                                         │
  │   # Commit save                                                         │
  │   git add nexus/PHASE_CURRENT.md                                        │
  │   git add nexus/proof/sessions/                                         │
  │   git add nexus/proof/seals/                                            │
  │   git commit -m "save(phase[XXX]): session + seal"                      │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 10: PUSH (Chaque 3-5 phases)                                      │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   git push origin master                                                │
  │   git push origin --tags                                                │
  │                                                                         │
  │   # Fréquence: après phases 127, 130, 133, 136, 138, etc.               │
  │   # Minimum: toutes les 5 phases                                        │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 11: CONTINUE (Pas de stop sauf erreur)                            │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │   → Passer immédiatement à la phase suivante                            │
  │   → NE PAS ATTENDRE validation                                          │
  │   → NE PAS STOP sur tags GOLD (juste commit+tag)                        │
  │                                                                         │
  │   STOP UNIQUEMENT SI:                                                   │
  │   - Sanctuaire modifié                                                  │
  │   - >5% tests fail                                                      │
  │   - Build fail                                                          │
  │   - Phase 155 atteinte (FIN)                                            │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 6 — SÉCURITÉS ANTI-CORRUPTION
# ═══════════════════════════════════════════════════════════════════════════════════════════

SECURITES_ANTI_CORRUPTION:

  SANCTUAIRES_READONLY:
    paths:
      - "packages/sentinel/**"
      - "packages/genome/**"
      - "packages/mycelium/**"
      - "gateway/**"
    verification: "git diff <path> DOIT être VIDE"
    frequence: "AVANT et APRÈS chaque phase"
    action_si_violation: "ABORT + REVERT + NCR"
    
  COMMANDES_INTERDITES:
    git:
      - "git add ."
      - "git add -A"
      - "git push --force"
      - "git push -f"
      - "git reset --hard"
      - "git clean -fd"
    system:
      - "rm -rf"
      - "del /s /q"
      - "sudo"
      - "chmod 777"
      - "format"
    action_si_violation: "STOP + NCR + Signaler"
    
  TESTS_SEUIL_MILITARY:
    seuil_fail: "5%"
    action: "STOP + DIAGNOSTIC + CORRECTION avant continue"
    
  SAVE_OBLIGATOIRE:
    frequence: "Après CHAQUE phase"
    contenu:
      - "PHASE_CURRENT.md mis à jour"
      - "Session créée (SES-*)"
      - "Seal créé (SEAL-*)"
    verification: "Fichiers présents dans nexus/proof/"
    
  PUSH_CHECKPOINT:
    frequence: "Toutes les 3-5 phases"
    obligatoire_sur:
      - "Phase 130 (fin bloc A)"
      - "Phase 138 (GOLD-UI)"
      - "Phase 145 (GOLD-ORACLE)"
      - "Phase 150 (GOLD-SEARCH)"
      - "Phase 155 (COMPLETE)"
      
  ROLLBACK_STRATEGY:
    si_erreur_critique: |
      1. git stash (sauver travail en cours)
      2. git checkout -- . (reset)
      3. git checkout <dernière_phase_ok>
      4. Analyser erreur
      5. Corriger
      6. Reprendre
    si_sanctuaire_modifie: |
      1. STOP IMMÉDIAT
      2. git checkout -- packages/sentinel/
      3. git checkout -- packages/genome/
      4. git checkout -- packages/mycelium/
      5. git checkout -- gateway/
      6. Analyser comment c'est arrivé
      7. Créer NCR
      8. Reprendre avec vigilance accrue

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 7 — PHASES DÉTAILLÉES (125-155)
# ═══════════════════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────────────
# BLOC A — UI FOUNDATION (125-130)
# ─────────────────────────────────────────────────────────────────────────────────────────

PHASE_125:
  id: "125"
  nom: "TAURI PROJECT INIT"
  objectif: "Initialiser le projet Tauri dans apps/omega-ui"
  tag: "v3.125.0"
  duree_estimee: "3h"
  
  fichiers_a_creer:
    - "apps/omega-ui/package.json"
    - "apps/omega-ui/src-tauri/Cargo.toml"
    - "apps/omega-ui/src-tauri/tauri.conf.json"
    - "apps/omega-ui/src-tauri/src/main.rs"
    - "apps/omega-ui/src-tauri/src/lib.rs"
    - "apps/omega-ui/src-tauri/build.rs"
    
  package_json_template: |
    {
      "name": "@omega/ui",
      "version": "0.0.1",
      "private": true,
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "tauri": "tauri",
        "test": "vitest",
        "lint": "eslint src --ext ts,tsx",
        "typecheck": "tsc --noEmit"
      },
      "devDependencies": {
        "@tauri-apps/cli": "^1.5.0",
        "@tauri-apps/api": "^1.5.0",
        "vite": "^5.0.0",
        "vitest": "^1.0.0",
        "typescript": "^5.3.0",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "eslint": "^8.55.0"
      },
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
      }
    }
    
  tests_cible: 5
  
  verification:
    - "cd apps/omega-ui && npm ci"
    - "cd apps/omega-ui && npm run tauri build"
    - "Window Tauri s'ouvre"

PHASE_126:
  id: "126"
  nom: "REACT + VITE + TAILWIND"
  objectif: "Setup frontend React avec Vite et Tailwind"
  tag: "v3.126.0"
  duree_estimee: "3h"
  
  fichiers_a_creer:
    - "apps/omega-ui/src/main.tsx"
    - "apps/omega-ui/src/App.tsx"
    - "apps/omega-ui/src/index.css"
    - "apps/omega-ui/vite.config.ts"
    - "apps/omega-ui/tsconfig.json"
    - "apps/omega-ui/tailwind.config.js"
    - "apps/omega-ui/postcss.config.js"
    
  tests_cible: 10

PHASE_127:
  id: "127"
  nom: "IPC BRIDGE"
  objectif: "Pont communication Tauri ↔ React"
  tag: "v3.127.0"
  duree_estimee: "4h"
  
  fichiers_a_creer:
    - "apps/omega-ui/src-tauri/src/commands.rs"
    - "apps/omega-ui/src-tauri/src/handlers/mod.rs"
    - "apps/omega-ui/src-tauri/src/handlers/analyze.rs"
    - "apps/omega-ui/src/lib/tauri-bridge.ts"
    - "apps/omega-ui/src/lib/api.ts"
    - "apps/omega-ui/src/types/ipc.ts"
    
  invariants:
    - "INV-IPC-01: Single invoke per action"
    - "INV-IPC-02: Timeout 15s max"
    - "INV-IPC-03: Payload max 2MB"
    
  tests_cible: 25

PHASE_128:
  id: "128"
  nom: "CORE INTEGRATION"
  objectif: "Connecter IPC aux packages OMEGA existants"
  tag: "v3.128.0"
  duree_estimee: "4h"
  
  fichiers_a_creer:
    - "apps/omega-ui/src-tauri/src/omega_bridge.rs"
    - "apps/omega-ui/src-tauri/src/handlers/session.rs"
    - "apps/omega-ui/src/lib/omega-client.ts"
    
  integration:
    - "Appel packages/omega-text-analyzer depuis UI"
    - "Appel packages/genome depuis UI"
    - "Création sessions depuis UI"
    
  tests_cible: 30

PHASE_129:
  id: "129"
  nom: "STATE MANAGEMENT"
  objectif: "Zustand pour état global"
  tag: "v3.129.0"
  duree_estimee: "3h"
  
  fichiers_a_creer:
    - "apps/omega-ui/src/stores/app-store.ts"
    - "apps/omega-ui/src/stores/analysis-store.ts"
    - "apps/omega-ui/src/stores/session-store.ts"
    - "apps/omega-ui/src/hooks/useAnalysis.ts"
    - "apps/omega-ui/src/hooks/useSession.ts"
    
  tests_cible: 20

PHASE_130:
  id: "130"
  nom: "LAYOUT & NAVIGATION"
  objectif: "Structure UI principale"
  tag: "v3.130.0"
  duree_estimee: "3h"
  push_obligatoire: true
  
  fichiers_a_creer:
    - "apps/omega-ui/src/components/Layout/Layout.tsx"
    - "apps/omega-ui/src/components/Layout/Sidebar.tsx"
    - "apps/omega-ui/src/components/Layout/Header.tsx"
    - "apps/omega-ui/src/router/index.tsx"
    - "apps/omega-ui/src/pages/Home.tsx"
    
  tests_cible: 15

# ─────────────────────────────────────────────────────────────────────────────────────────
# BLOC B — UI FEATURES (131-138)
# ─────────────────────────────────────────────────────────────────────────────────────────

PHASE_131:
  id: "131"
  nom: "TEXT INPUT COMPONENT"
  objectif: "Zone saisie texte principale"
  tag: "v3.131.0"
  tests_cible: 20
  
PHASE_132:
  id: "132"
  nom: "EMOTION CHART"
  objectif: "Visualisation Plutchik + Emotion14"
  tag: "v3.132.0"
  tests_cible: 25
  
PHASE_133:
  id: "133"
  nom: "ANALYSIS VIEW"
  objectif: "Page analyse complète"
  tag: "v3.133.0"
  push_obligatoire: true
  tests_cible: 30
  
PHASE_134:
  id: "134"
  nom: "SESSION HISTORY"
  objectif: "Historique des analyses"
  tag: "v3.134.0"
  tests_cible: 20
  
PHASE_135:
  id: "135"
  nom: "DASHBOARD"
  objectif: "Vue d'ensemble statistiques"
  tag: "v3.135.0"
  tests_cible: 25
  
PHASE_136:
  id: "136"
  nom: "EXPORT FEATURES"
  objectif: "Export PDF/JSON/CSV"
  tag: "v3.136.0"
  push_obligatoire: true
  tests_cible: 20
  
PHASE_137:
  id: "137"
  nom: "SETTINGS PAGE"
  objectif: "Configuration utilisateur"
  tag: "v3.137.0"
  tests_cible: 15
  
PHASE_138:
  id: "138"
  nom: "UI POLISH + GOLD"
  objectif: "Finalisation UI"
  tag: "v3.138.0-GOLD-UI"
  push_obligatoire: true
  tests_cible: 50
  gold_tag: true

# ─────────────────────────────────────────────────────────────────────────────────────────
# BLOC C — ORACLE ENGINE (139-145)
# ─────────────────────────────────────────────────────────────────────────────────────────

PHASE_139:
  id: "139"
  nom: "ORACLE TYPES"
  tag: "v3.139.0"
  tests_cible: 15
  
PHASE_140:
  id: "140"
  nom: "SCORING ENGINE"
  tag: "v3.140.0"
  tests_cible: 30
  
PHASE_141:
  id: "141"
  nom: "RULES ENGINE"
  tag: "v3.141.0"
  tests_cible: 35
  
PHASE_142:
  id: "142"
  nom: "DECISION MAKER"
  tag: "v3.142.0"
  push_obligatoire: true
  tests_cible: 25
  
PHASE_143:
  id: "143"
  nom: "CONFLICT RESOLVER"
  tag: "v3.143.0"
  tests_cible: 20
  
PHASE_144:
  id: "144"
  nom: "ORACLE INTEGRATION"
  tag: "v3.144.0"
  tests_cible: 30
  
PHASE_145:
  id: "145"
  nom: "ORACLE GOLD"
  tag: "v3.145.0-GOLD-ORACLE"
  push_obligatoire: true
  tests_cible: 25
  gold_tag: true

# ─────────────────────────────────────────────────────────────────────────────────────────
# BLOC D — SEARCH AGENTISÉ (146-150)
# ─────────────────────────────────────────────────────────────────────────────────────────

PHASE_146:
  id: "146"
  nom: "SEARCH INDEX"
  tag: "v3.146.0"
  tests_cible: 25
  
PHASE_147:
  id: "147"
  nom: "QUERY PLANNER"
  tag: "v3.147.0"
  tests_cible: 25
  
PHASE_148:
  id: "148"
  nom: "SEARCH DISPATCHER"
  tag: "v3.148.0"
  push_obligatoire: true
  tests_cible: 20
  
PHASE_149:
  id: "149"
  nom: "SEARCH AGGREGATOR"
  tag: "v3.149.0"
  tests_cible: 20
  
PHASE_150:
  id: "150"
  nom: "SEARCH GOLD"
  tag: "v3.150.0-GOLD-SEARCH"
  push_obligatoire: true
  tests_cible: 20
  gold_tag: true

# ─────────────────────────────────────────────────────────────────────────────────────────
# BLOC E — POLISH & COMPLETE (151-155)
# ─────────────────────────────────────────────────────────────────────────────────────────

PHASE_151:
  id: "151"
  nom: "MEMORY TIERING"
  tag: "v3.151.0"
  tests_cible: 25
  
PHASE_152:
  id: "152"
  nom: "EXPORT POLICY ADVANCED"
  tag: "v3.152.0"
  tests_cible: 15
  
PHASE_153:
  id: "153"
  nom: "DOCUMENTATION FINALE"
  tag: "v3.153.0"
  push_obligatoire: true
  tests_cible: 0
  
PHASE_154:
  id: "154"
  nom: "E2E & STRESS TESTS"
  tag: "v3.154.0"
  tests_cible: 50
  
PHASE_155:
  id: "155"
  nom: "OMEGA COMPLETE"
  tag: "v3.155.0-OMEGA-COMPLETE"
  push_obligatoire: true
  tests_cible: 0
  gold_tag: true
  final: true

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 8 — RÉSUMÉ TESTS
# ═══════════════════════════════════════════════════════════════════════════════════════════

TESTS_SUMMARY:
  bloc_a: 105
  bloc_b: 205
  bloc_c: 180
  bloc_d: 110
  bloc_e: 90
  total_nouveaux: 690
  existants: 1228
  total_final: "1918+"

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 9 — CONDITIONS D'ARRÊT (UNIQUEMENT)
# ═══════════════════════════════════════════════════════════════════════════════════════════

STOP_CONDITIONS: |
  STOP UNIQUEMENT SI:
  
  1. SANCTUAIRE MODIFIÉ
     → git diff packages/sentinel/ NON VIDE
     → Action: ABORT + REVERT + NCR
     
  2. TESTS FAIL > 5%
     → Seuil MILITARY: max 5% échecs
     → Action: DIAGNOSTIC + CORRECTION + RETRY
     
  3. BUILD FAIL
     → npm run build échoue
     → cargo build échoue
     → Action: DIAGNOSTIC + CORRECTION + RETRY
     
  4. ERREUR SYSTÈME CRITIQUE
     → Crash
     → Corruption fichiers
     → Action: STOP + ANALYSE
     
  5. PHASE 155 ATTEINTE
     → FIN DU PROJET
     → Action: RAPPORT FINAL + CELEBRATION

  NE PAS STOP SUR:
  - Tags GOLD (juste commit + tag + continue)
  - Fin de bloc (juste push + continue)
  - Warnings non critiques

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 10 — MESSAGE DE LANCEMENT
# ═══════════════════════════════════════════════════════════════════════════════════════════

MESSAGE_LANCEMENT: |
  ══════════════════════════════════════════════════════════════════════════════════════════
  
     ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗     ██╗   ██╗██████╗  █████╗ ███╗   ██╗██╗██╗   ██╗███╗   ███╗
    ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗    ██║   ██║██╔══██╗██╔══██╗████╗  ██║██║██║   ██║████╗ ████║
    ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║    ██║   ██║██████╔╝███████║██╔██╗ ██║██║██║   ██║██╔████╔██║
    ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║    ██║   ██║██╔══██╗██╔══██║██║╚██╗██║██║██║   ██║██║╚██╔╝██║
    ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║    ╚██████╔╝██║  ██║██║  ██║██║ ╚████║██║╚██████╔╝██║ ╚═╝ ██║
     ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝     ╚═╝
  
                              v1.1 MILITARY GRADE — FULL RUN TO COMPLETION
  
  ══════════════════════════════════════════════════════════════════════════════════════════
  
  MODE: FULL RUN TO COMPLETION (pas de stop sauf erreur critique)
  QUALITÉ: MILITARY GRADE (MIL-STD-498 / DO-178C Level A)
  PHASES: 125 → 155 (31 phases)
  CIBLE: v3.155.0-OMEGA-COMPLETE
  
  CORRECTIONS CHATGPT INTÉGRÉES:
  ✓ Structure apps/omega-ui/ (respecte monorepo)
  ✓ Dépendances locales (pas d'install global)
  ✓ Save automatique après CHAQUE phase
  ✓ Seuil tests 5% (MILITARY)
  ✓ Lockfile obligatoire
  
  SÉCURITÉS:
  ✓ Sanctuaires read-only (vérification pré/post phase)
  ✓ Commandes interdites bloquées
  ✓ Rollback strategy si erreur
  ✓ Push checkpoint toutes les 3-5 phases
  
  BLOCS:
  A. UI Foundation (125-130) → v3.130.0
  B. UI Features (131-138) → v3.138.0-GOLD-UI
  C. Oracle Engine (139-145) → v3.145.0-GOLD-ORACLE
  D. Search Agentisé (146-150) → v3.150.0-GOLD-SEARCH
  E. Polish & Complete (151-155) → v3.155.0-OMEGA-COMPLETE
  
  WARM-UP OBLIGATOIRE:
  Exécuter TOUTES les commandes de vérification avant de commencer.
  
  COMMENCER PAR:
  1. Warm-up complet
  2. Phase 125: TAURI PROJECT INIT
  3. Continuer jusqu'à Phase 155
  
  ══════════════════════════════════════════════════════════════════════════════════════════
                                    LET'S BUILD OMEGA COMPLETE! 🚀
  ══════════════════════════════════════════════════════════════════════════════════════════
