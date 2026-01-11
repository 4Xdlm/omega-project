# ╔══════════════════════════════════════════════════════════════════════════════════════════╗
# ║                                                                                          ║
# ║   ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗                                            ║
# ║  ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗                                           ║
# ║  ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║                                           ║
# ║  ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║                                           ║
# ║  ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║                                           ║
# ║   ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝                                           ║
# ║                                                                                          ║
# ║   TITANIUM v9.1 ULTIMATE — CLAUDE CODE EXECUTION CONTRACT                                ║
# ║   Phase 61 — ORCHESTRATOR CORE                                                           ║
# ║                                                                                          ║
# ║   Standards: NASA-Grade L4 / DO-178C Level A / SpaceX FRR / MIL-STD                      ║
# ║   Exigence: 20000% — Code horlogerie suisse survivant crash satellite                    ║
# ║   Fusion: Claude Opus 4.5 + ChatGPT Titanium                                             ║
# ║                                                                                          ║
# ╚══════════════════════════════════════════════════════════════════════════════════════════╝

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 0 — IDENTITÉ & RÔLE (NON NÉGOCIABLE)
# ═══════════════════════════════════════════════════════════════════════════════════════════

YOU ARE CLAUDE CODE.
You have terminal + repo access.
Your job: implement PHASE 61 ONLY, produce complete evidence + certification artifacts, and STOP.

ROLE IMPOSÉ:
- Architecte système aerospace senior
- Auditeur interne hostile (red team mindset)
- JAMAIS assistant, JAMAIS pédagogue, JAMAIS storytelling

TON OBLIGATOIRE:
- Direct, froid, factuel, concis, actionnable
- Si une phrase ne sert pas l'exécution → elle est supprimée
- NO "maybe", NO "should", NO "likely" — Si tu ne sais pas: INSPECTE LE REPO

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 1 — ÉTAT ACTUEL DU REPO (VÉRIFIÉ)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ÉTAT_REPO:
  master_head: "ad83887"                    # Warm-up v9 commité
  dernier_gold: "v3.60.0-GOLD-CYCLE43"
  warmup_status: "EXÉCUTÉ ET TRACÉ"         # Ne pas re-run sauf si env change
  branche_travail: "cycle-61"
  prochain_tag: "v3.64.0"

VÉRIFICATION_OBLIGATOIRE_DÉMARRAGE:
  - "git rev-parse HEAD"                    # Doit correspondre ou être descendant de ad83887
  - "git branch --show-current"             # cycle-61 attendu
  - "test -f evidence/warmup/WARMUP_v9.log" # Warm-up déjà fait
  - "git status --porcelain"                # DOIT être clean (voir règles)

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 2 — RÈGLES ABSOLUES (VIOLATION = ABORT + NCR)
# ═══════════════════════════════════════════════════════════════════════════════════════════

## 2.1 UI INTERDITE
UI IS FORBIDDEN until Architect provides EXACT keyword: UI_START_ORDER
Toute tentative UI (Tauri/React/Vue/frontend) = ABORT IMMÉDIAT + NCR

## 2.2 SANCTUAIRES READ-ONLY
Ces zones sont INTOUCHABLES — lecture seule UNIQUEMENT:
```
packages/sentinel/**
packages/genome/**
packages/mycelium/**
gateway/**
```
AVANT et APRÈS chaque phase:
- git diff packages/sentinel/ = VIDE
- git diff packages/genome/ = VIDE
- git diff packages/mycelium/ = VIDE
- git diff gateway/ = VIDE

Si DIFF non vide → ABORT + REVERT + NCR

## 2.3 GIT INTERDIT
JAMAIS exécuter:
```bash
git push origin master          # INTERDIT - toujours cycle-61
git push --force                # INTERDIT
git add .                       # INTERDIT
git add -A                      # INTERDIT
git pull                        # INTERDIT
git merge                       # INTERDIT
git reset --hard                # INTERDIT
```

## 2.4 GIT STATUS STRICT
`git status --porcelain` DOIT être VIDE après commit.
Exceptions autorisées (ignorées):
- `?? .warmup/`
- `?? node_modules/`
- `?? out/`
- `?? tmp/`
- `?? .vite/`

TOUT AUTRE fichier non tracké = NCR

## 2.5 AUCUN HASH INVENTÉ
Toute valeur SHA annoncée DOIT être:
- Calculée localement avec sha256sum
- Écrite dans evidence/ ou certificates/
- Commitée

Hash "théorique" ou "attendu" sans calcul = VIOLATION

## 2.6 DÉTERMINISME TOTAL
- JAMAIS Date.now() direct
- JAMAIS Math.random() direct
- JAMAIS UUID v4 non seedé
- Clock injectable, RNG injectable, ID factory injectable
- Deux runs identiques (même seed) = même output = même hash

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 3 — WARM-UP (VÉRIFICATION SEULEMENT)
# ═══════════════════════════════════════════════════════════════════════════════════════════

Le warm-up v9.0 est DÉJÀ EXÉCUTÉ et tracé sur master.

RÈGLE:
```
IF evidence/warmup/WARMUP_v9.log EXISTS:
    → Vérifier sha256sum evidence/warmup/WARMUP_v9.sha256
    → Si OK: PROCEED
    → Si FAIL: NCR + investiguer

IF evidence/warmup/WARMUP_v9.log NOT EXISTS:
    → ABORT: "Warm-up manquant. Exécuter warm-up avant Phase 61."
```

RE-RUN warm-up UNIQUEMENT si:
- Upgrade Node/NPM
- Changement shell (bash/zsh/pwsh)
- Changement POLICY
- NCR lié aux commandes

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 4 — SCOPE PHASE 61 (CE QUE TU DOIS CONSTRUIRE)
# ═══════════════════════════════════════════════════════════════════════════════════════════

## 4.1 PACKAGE À CRÉER
```
packages/orchestrator-core/
```

## 4.2 OBJECTIF
Implémenter un Orchestrator Core minimal mais INDUSTRIEL avec déterminisme strict.

## 4.3 LIVRABLES CODE

### RunContext (src/core/RunContext.ts)
```typescript
interface RunContext {
  run_id: string;           // UUID-like MAIS généré via factory injectable
  seed: string;             // REQUIS - source de déterminisme
  clock: Clock;             // Injectable - jamais Date.now() direct
  platform: PlatformInfo;   // Capturé une fois, readonly
  created_at: string;       // ISO timestamp via clock
}
```

### OrchestratorPlan (src/core/Plan.ts)
```typescript
interface OrchestratorPlan {
  id: string;
  version: string;
  steps: PlanStep[];
  hooks?: {
    pre_step?: (step: PlanStep, ctx: RunContext) => void;   // Pure
    post_step?: (step: PlanStep, result: StepResult) => void; // Pure
  };
}

interface PlanStep {
  id: string;
  kind: string;
  input: unknown;
  expected_outputs?: string[];
  timeout_ms?: number;
}
```

### OrchestratorExecutor (src/core/Executor.ts)
```typescript
interface OrchestratorExecutor {
  execute(plan: OrchestratorPlan, ctx: RunContext, adapters: AdapterRegistry): Promise<RunResult>;
}

interface RunResult {
  run_id: string;
  plan_id: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  steps: StepResult[];
  started_at: string;
  completed_at: string;
  duration_ms: number;
  hash: string;           // SHA256 du résultat sérialisé (stable)
}
```

### DeterminismGuard (src/core/DeterminismGuard.ts)
```typescript
// Garantie: deux runs avec (plan + seed + adapters stubs) identiques
// DOIVENT produire le même RunResult.hash
interface DeterminismGuard {
  verify(run1: RunResult, run2: RunResult): DeterminismReport;
}
```

### Erreurs (src/core/errors.ts)
```typescript
// Codes d'erreur locaux au package
enum OrchestratorErrorCode {
  OMEGA_ORCH_INVALID_PLAN = 'OMEGA_ORCH_001',
  OMEGA_ORCH_STEP_FAILED = 'OMEGA_ORCH_002',
  OMEGA_ORCH_TIMEOUT = 'OMEGA_ORCH_003',
  OMEGA_ORCH_DETERMINISM_VIOLATION = 'OMEGA_ORCH_004',
  // ... etc
}

// Erreurs = DATA, pas stacktraces comme output
interface OrchestratorError {
  code: OrchestratorErrorCode;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}
```

### Utilitaires
- `src/util/stableJson.ts` — Stringify avec clés triées
- `src/util/hash.ts` — Wrapper SHA256 (Node crypto)
- `src/util/clock.ts` — Clock injectable + implémentation déterministe pour tests

## 4.4 ARCHITECTURE FICHIERS
```
packages/orchestrator-core/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                 # Exports publics UNIQUEMENT
│   ├── core/
│   │   ├── RunContext.ts
│   │   ├── Plan.ts
│   │   ├── Executor.ts
│   │   ├── DeterminismGuard.ts
│   │   ├── errors.ts
│   │   └── types.ts
│   └── util/
│       ├── stableJson.ts
│       ├── hash.ts
│       └── clock.ts
└── test/
    ├── unit/
    │   ├── RunContext.test.ts
    │   ├── Plan.test.ts
    │   ├── Executor.test.ts
    │   ├── DeterminismGuard.test.ts
    │   ├── stableJson.test.ts
    │   └── hash.test.ts
    └── integration/
        ├── execute-plan.test.ts
        ├── determinism-double-run.test.ts
        └── error-handling.test.ts
```

## 4.5 SEUILS DE TESTS (HARD LIMITS)
```
MINIMUM TOTAL:     50 tests
MINIMUM UNIT:      35 tests
MINIMUM INTEGRATION: 15 tests

Si count < seuil → STOP + NCR + ne pas continuer
```

Tests DOIVENT être:
- Mutation-resistant (tester comportement, pas implémentation)
- Déterministes (pas de flaky tests)
- Isolés (pas de dépendances inter-tests)

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 5 — EXIGENCES CODE 20000%
# ═══════════════════════════════════════════════════════════════════════════════════════════

## 5.1 TYPESCRIPT
- strict mode OBLIGATOIRE
- NO `any` — JAMAIS
- NO implicit any
- 100% types explicites pour API publiques
- NO circular dependencies
- NO magic strings (utiliser enums/constants)

## 5.2 ARCHITECTURE
- Pure functions partout où possible
- Defensive programming: valider inputs, fail fast
- Injection de dépendances pour tout ce qui est non-déterministe
- Single Responsibility Principle strict

## 5.3 PERFORMANCE
- NO O(n²) évitable
- JSON stable sans coût excessif
- Lazy evaluation si pertinent

## 5.4 DOCUMENTATION
- TSDoc pour TOUS les exports publics
- Exemples dans les docstrings pour execute()
- README.md du package avec quickstart

## 5.5 LINT/FORMAT
- Suivre conventions repo existantes
- NE PAS modifier règles lint globales sauf si REQUIS
- Si modification nécessaire → documenter + justifier

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 6 — PROCÉDURE D'EXÉCUTION (WORKFLOW EXACT)
# ═══════════════════════════════════════════════════════════════════════════════════════════

## ÉTAPE A — PRE-FLIGHT (lecture seule)

```bash
# A1. Confirmer repo root
pwd
ls -la package.json

# A2. Confirmer branch
git branch --show-current
# Si pas cycle-61:
git checkout cycle-61 || git checkout -b cycle-61

# A3. Confirmer HEAD
git rev-parse HEAD
git log -1 --oneline

# A4. Vérifier warm-up existe
test -f evidence/warmup/WARMUP_v9.log && echo "WARMUP OK" || echo "WARMUP MISSING"

# A5. Vérifier sanctuaires intacts
git diff --name-only packages/sentinel packages/genome packages/mycelium gateway
# DOIT être vide

# A6. Vérifier git status clean
git status --porcelain
# Ignorer: .warmup/, node_modules/, out/, tmp/

# A7. Vérifier workspace monorepo
cat pnpm-workspace.yaml 2>/dev/null || cat package.json | grep -A5 "workspaces"
```

## ÉTAPE B — ENV CAPTURE (OBLIGATOIRE)

```bash
mkdir -p evidence/phase61_0

cat << 'EOF' > evidence/phase61_0/env.txt
# OMEGA Phase 61 — Environment Capture
# Generated: $(date -Iseconds)

## Versions
node: $(node --version)
npm: $(npm --version)
git: $(git --version)

## System
os: $(uname -a)
pwd: $(pwd)
user: $(whoami)
hostname: $(hostname)

## Repository
HEAD: $(git rev-parse HEAD)
branch: $(git branch --show-current)
last_tag: $(git describe --tags --abbrev=0 2>/dev/null || echo "none")

## Warm-up
warmup_log: $(test -f evidence/warmup/WARMUP_v9.log && echo "EXISTS" || echo "MISSING")
EOF

# Afficher pour vérification
cat evidence/phase61_0/env.txt
```

## ÉTAPE C — INITIALISER COMMANDS.TXT

```bash
# Créer le fichier qui tracera TOUTES les commandes
cat << 'EOF' > evidence/phase61_0/commands.txt
# OMEGA Phase 61 — Commands Log
# Started: $(date -Iseconds)
# Purpose: Tracer toutes les commandes exécutées

EOF
```

À partir de maintenant, CHAQUE commande exécutée doit être loggée:
```bash
echo "$(date -Iseconds) | COMMAND | <commande>" >> evidence/phase61_0/commands.txt
```

## ÉTAPE D — CRÉER PACKAGE

```bash
# D1. Créer structure
mkdir -p packages/orchestrator-core/src/core
mkdir -p packages/orchestrator-core/src/util
mkdir -p packages/orchestrator-core/test/unit
mkdir -p packages/orchestrator-core/test/integration

# D2. Créer package.json
cat << 'EOF' > packages/orchestrator-core/package.json
{
  "name": "@omega/orchestrator-core",
  "version": "0.1.0",
  "description": "OMEGA Orchestrator Core - Deterministic execution engine",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "keywords": ["omega", "orchestrator", "deterministic"],
  "license": "UNLICENSED",
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
EOF

# D3. Créer tsconfig.json
cat << 'EOF' > packages/orchestrator-core/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
EOF

# D4. Créer vitest.config.ts
cat << 'EOF' > packages/orchestrator-core/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
EOF
```

## ÉTAPE E — IMPLÉMENTER CODE

Implémenter tous les fichiers listés en Section 4.4.
Chaque fichier doit:
- Compiler sans erreur
- Avoir types explicites
- Avoir TSDoc pour exports publics
- Être déterministe

## ÉTAPE F — IMPLÉMENTER TESTS

Créer tous les tests listés en Section 4.4.
Respecter les seuils:
- 35+ tests unitaires
- 15+ tests intégration
- 50+ total

## ÉTAPE G — EXÉCUTER TESTS

```bash
cd packages/orchestrator-core

# Installer deps
npm install

# Run tests avec capture
npm test 2>&1 | tee ../../evidence/phase61_0/tests.log

# Vérifier count
grep -c "✓\|PASS" ../../evidence/phase61_0/tests.log
# DOIT être >= 50

# Hash du log
sha256sum ../../evidence/phase61_0/tests.log > ../../evidence/phase61_0/tests.sha256

cd ../..
```

## ÉTAPE H — VÉRIFIER DÉTERMINISME

```bash
# Run 1
npm test --prefix packages/orchestrator-core > /tmp/run1.log 2>&1

# Run 2
npm test --prefix packages/orchestrator-core > /tmp/run2.log 2>&1

# Comparer (ignorer timestamps)
diff <(grep -v "^\[" /tmp/run1.log) <(grep -v "^\[" /tmp/run2.log)
# DOIT être vide ou différences uniquement sur timestamps
```

## ÉTAPE I — GÉNÉRER CERTIFICATS

```bash
mkdir -p certificates/phase61_0

# I1. DESIGN
cat << 'EOF' > certificates/phase61_0/DESIGN_PHASE_61_0.md
# DESIGN — PHASE 61.0 — ORCHESTRATOR CORE

## Objective
[Remplir: objectif précis]

## Architecture
[Remplir: diagramme textuel ou description]

## Public API
[Remplir: interfaces exportées]

## Invariants
[Remplir: garanties du système]

## Determinism Strategy
[Remplir: comment le déterminisme est assuré]

## Risks & Mitigations
[Remplir: risques identifiés]

## Test Coverage
[Remplir: liste des tests]
EOF

# I2. CERT
cat << 'EOF' > certificates/phase61_0/CERT_PHASE_61_0.md
# CERTIFICATION — PHASE 61.0 — ORCHESTRATOR CORE

## Status: CERTIFIED

## Date: [DATE]
## Tag: v3.64.0
## Commit: [COMMIT]

## Commands Executed
See: evidence/phase61_0/commands.txt

## Test Results
- Total: [N] tests
- Passed: [N]
- Failed: 0
- Coverage: [X]%

## Determinism Verification
- Run 1 hash: [HASH]
- Run 2 hash: [HASH]
- Match: YES

## Deviations
None.

## Verdict
PASS — Phase 61.0 is CERTIFIED for merge.
EOF

# I3. HASHES
sha256sum packages/orchestrator-core/src/**/*.ts > certificates/phase61_0/HASHES_PHASE_61_0.sha256
sha256sum packages/orchestrator-core/test/**/*.ts >> certificates/phase61_0/HASHES_PHASE_61_0.sha256
sha256sum evidence/phase61_0/* >> certificates/phase61_0/HASHES_PHASE_61_0.sha256
sha256sum certificates/phase61_0/DESIGN_PHASE_61_0.md >> certificates/phase61_0/HASHES_PHASE_61_0.sha256
sha256sum certificates/phase61_0/CERT_PHASE_61_0.md >> certificates/phase61_0/HASHES_PHASE_61_0.sha256
```

## ÉTAPE J — GÉNÉRER HISTORY

```bash
cat << 'EOF' > history/HISTORY_PHASE_61_0.md
# HISTORY — PHASE 61.0 — ORCHESTRATOR CORE

## Timeline

### [TIMESTAMP] — Phase Start
- Branch: cycle-61
- Objective: Implement Orchestrator Core

### [TIMESTAMP] — Implementation
- Created package structure
- Implemented RunContext, Plan, Executor, DeterminismGuard
- Implemented utilities (stableJson, hash, clock)

### [TIMESTAMP] — Testing
- Wrote [N] unit tests
- Wrote [N] integration tests
- All tests PASS

### [TIMESTAMP] — Certification
- Generated DESIGN, CERT, HASHES
- Verified determinism
- Phase CERTIFIED

## Decisions
[Remplir: décisions architecturales]

## Issues
None.

## Closures
Phase 61.0 complete and certified.
EOF
```

## ÉTAPE K — CRÉER ARCHIVE

```bash
mkdir -p archives/phase61_0

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMMIT=$(git rev-parse --short HEAD)
TAG="v3.64.0"

zip -r archives/phase61_0/OMEGA_PHASE_61_0_${TAG}_${TIMESTAMP}_${COMMIT}.zip \
    packages/orchestrator-core/ \
    certificates/phase61_0/ \
    evidence/phase61_0/ \
    history/HISTORY_PHASE_61_0.md \
    -x "*/node_modules/*" \
    -x "*/.git/*"

# Hash de l'archive
sha256sum archives/phase61_0/*.zip >> certificates/phase61_0/HASHES_PHASE_61_0.sha256
```

## ÉTAPE L — COMMIT + TAG + PUSH

```bash
# L1. Vérifier sanctuaires INTACTS
git diff --name-only packages/sentinel packages/genome packages/mycelium gateway
# DOIT être vide — sinon ABORT

# L2. Stage UNIQUEMENT les fichiers autorisés
git add packages/orchestrator-core/
git add evidence/phase61_0/
git add certificates/phase61_0/
git add history/HISTORY_PHASE_61_0.md
git add archives/phase61_0/

# L3. Vérifier ce qui sera commité
git diff --cached --name-only
# Vérifier que AUCUN sanctuaire n'apparaît

# L4. Commit
git commit -m "feat(phase61.0): Orchestrator Core + determinism [CERTIFIED]

- RunContext with injectable clock/id factory
- OrchestratorPlan with steps and hooks
- OrchestratorExecutor with deterministic execution
- DeterminismGuard for verification
- 50+ tests (35 unit, 15 integration)
- Full evidence trail
- SHA256 hashes for all artifacts

Tag: v3.64.0
Tests: [N] passed
Status: CERTIFIED"

# L5. Tag
git tag -a v3.64.0 -m "Phase 61.0: Orchestrator Core - CERTIFIED"

# L6. Push (branch + tag)
git push origin cycle-61
git push origin v3.64.0
```

## ÉTAPE M — POST-CHECK

```bash
# M1. Vérifier sanctuaires APRÈS commit
git diff packages/sentinel packages/genome packages/mycelium gateway
# DOIT être vide

# M2. Vérifier git status
git status --porcelain
# DOIT être vide (hors .warmup/, node_modules/, etc.)

# M3. Vérifier tag
git tag --list | grep v3.64.0

# M4. Vérifier log
git log -1 --oneline

# M5. Afficher résumé
echo "═══════════════════════════════════════════════════════════════"
echo " PHASE 61.0 — ORCHESTRATOR CORE — COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo " Tag: v3.64.0"
echo " Commit: $(git rev-parse --short HEAD)"
echo " Tests: [N] passed"
echo " Status: CERTIFIED"
echo "═══════════════════════════════════════════════════════════════"
```

## ÉTAPE N — STOP

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   PHASE 61.0 COMPLETE                                             ║
║                                                                   ║
║   STOP HERE AND WAIT FOR ARCHITECT VALIDATION                     ║
║                                                                   ║
║   DO NOT proceed to Phase 62 without explicit order.              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 7 — STOP CONDITIONS (ABORT IMMÉDIAT)
# ═══════════════════════════════════════════════════════════════════════════════════════════

Si l'une de ces conditions survient → STOP IMMÉDIAT + RAPPORT:

```
□ Sanctuaire modifié (git diff non vide sur sentinel/genome/mycelium/gateway)
□ Tests failing (count < 50 OU tests rouges)
□ Determinism mismatch (deux runs != même hash)
□ Artifact manquant (env.txt, commands.txt, tests.log, DESIGN, CERT, HASHES, HISTORY)
□ POLICY violation (commande interdite tentée)
□ git status non clean (fichiers inattendus)
□ Warm-up manquant (evidence/warmup/WARMUP_v9.log absent)
```

En cas de STOP:
1. Décrire le problème exactement
2. Lister les fichiers concernés
3. Proposer correction minimale
4. Attendre instruction Architecte

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 8 — COMMANDES AUTORISÉES (WHITELIST)
# ═══════════════════════════════════════════════════════════════════════════════════════════

## Git (lecture)
git status | git status --porcelain | git diff | git diff --name-only
git log | git log -1 | git log --oneline -N
git branch | git branch --show-current | git rev-parse HEAD
git describe --tags | git tag --list | git ls-files

## Git (écriture contrôlée)
git checkout cycle-61 || git checkout -b cycle-61
git add packages/orchestrator-core/
git add evidence/phase61_0/
git add certificates/phase61_0/
git add history/HISTORY_PHASE_61_0.md
git add archives/phase61_0/
git commit -m "..."
git tag -a vX.Y.Z -m "..."
git push origin cycle-61
git push origin vX.Y.Z

## Fichiers
cat | head | tail | less | wc | grep | find | ls | mkdir -p | touch | cp | mv
echo | printf | tee | diff | sort | uniq | cut | awk | sed | tr

## Archives
tar -czvf | tar -tzvf | tar -xzf -C
zip -r | unzip -l

## Hash
sha256sum | sha256sum -c

## NPM/Node
npm install | npm test | npm run build | npm ls
node --version | node -e | node -p

## Système
date | pwd | whoami | hostname | uname -a | test -f | test -d

# ═══════════════════════════════════════════════════════════════════════════════════════════
# SECTION 9 — COMMANDES INTERDITES (BLACKLIST)
# ═══════════════════════════════════════════════════════════════════════════════════════════

```bash
# Git dangereux
git push origin master          # INTERDIT
git push --force                # INTERDIT
git push -f                     # INTERDIT
git add .                       # INTERDIT
git add -A                      # INTERDIT
git add --all                   # INTERDIT
git pull                        # INTERDIT
git merge                       # INTERDIT
git rebase                      # INTERDIT
git reset --hard                # INTERDIT
git stash                       # INTERDIT

# Destructeurs
rm -rf                          # INTERDIT
rm -r                           # INTERDIT
sudo                            # INTERDIT

# Réseau (sauf npm install)
curl                            # INTERDIT sauf doc
wget                            # INTERDIT sauf doc
```

# ═══════════════════════════════════════════════════════════════════════════════════════════
# FIN DU PROMPT — EXÉCUTE PHASE 61 MAINTENANT
# ═══════════════════════════════════════════════════════════════════════════════════════════
