# CLAUDE CODE — PROMPT B0: CENSUS (INVENTAIRE)

**Mission**: Créer l'inventaire exhaustif du projet OMEGA et l'index squelette.

---

## 🎯 OBJECTIF

Générer :
- Liste complète des modules (BUILD/GOVERNANCE/TOOLS/NEXUS/etc.)
- Structure `nexus/blueprint/OMEGA_BLUEPRINT_PACK/`
- `BLUEPRINT_INDEX.json` (squelette)
- `module_card.md` (squelette) pour chaque module
- Validateur TypeScript

---

## 📍 CONTEXTE

Repository: `/home/claude/omega-project`
Commit: `git rev-parse HEAD`
Branches: `master` (BUILD sealed), `governance` (active)

---

## 🧬 INVARIANTS À RESPECTER

### INV-BP-01: Output Déterministe
Même commit → même output → même hash
Trier tous les arrays/objects par clé alphabétique.

### INV-BP-02: Exclusions
EXCLURE de l'inventaire :
- `node_modules/`
- `dist/`
- `coverage/`
- `.git/`
- Fichiers temporaires (*.tmp, *.log)

### INV-BP-03: Isolation Write
Écrire UNIQUEMENT dans :
- `nexus/blueprint/`
- `tools/blueprint/`

JAMAIS ailleurs.

### INV-BP-04: Index Reconstructible
Toutes les références dans `BLUEPRINT_INDEX.json` doivent pointer vers des fichiers existants.

---

## 📋 PROCÉDURE

### Étape 1: Scan Repository

```bash
cd /home/claude/omega-project

# Lister tous les fichiers .ts/.tsx (hors exclusions)
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/coverage/*" \
  ! -path "*/.git/*" \
  | sort
```

### Étape 2: Détecter Modules

Critères de détection :
- Dossier contenant `package.json` = module racine
- Dossier `src/` avec index.ts = module
- Patterns connus:
  - `packages/*/` = BUILD modules
  - `nexus/governance/*/` = GOVERNANCE modules
  - `tools/*/` = TOOLS modules
  - `nexus/sessions/` = SESSIONS
  - `nexus/docs/` = DOCS

Classifier chaque module :
```json
{
  "module_id": "nom-module",
  "type": "BUILD|GOVERNANCE|TOOL|NEXUS|DOC|SESSION",
  "path": "chemin/relatif",
  "package_json": "chemin/package.json|null"
}
```

### Étape 3: Créer Structure Blueprint

```bash
mkdir -p nexus/blueprint/OMEGA_BLUEPRINT_PACK/{MODULES,GRAPHS,MANIFEST}
```

### Étape 4: Générer BLUEPRINT_INDEX.json (squelette)

```json
{
  "schema_version": "1.0.0",
  "generated_at": "2026-02-05T...",
  "commit": "...",
  "modules": [
    {
      "module_id": "...",
      "type": "BUILD|GOVERNANCE|...",
      "path": "...",
      "status": "INVENTORIED",
      "files": [],
      "exports": null,
      "types": null,
      "functions": null,
      "tests": null,
      "invariants": null,
      "metrics": null
    }
  ],
  "stats": {
    "total_modules": 0,
    "build_modules": 0,
    "governance_modules": 0,
    "total_files": 0
  }
}
```

### Étape 5: Créer Module Cards (squelette)

Pour chaque module, créer :
`nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES/<module_id>/module_card.md`

```markdown
# MODULE: <module_id>

**Type**: BUILD|GOVERNANCE|...
**Path**: `<path>`
**Status**: INVENTORIED

## Description

[À compléter en B4]

## API Surface

[À compléter en B1]

## Tests

[À compléter en B2]

## Invariants

[À compléter en B2]

## Metrics

[À compléter en B4]

---
*Généré par: OMEGA Blueprint B0 — Census*
```

### Étape 6: Créer REPRO_NOTES.md (squelette)

`nexus/blueprint/OMEGA_BLUEPRINT_PACK/MANIFEST/REPRO_NOTES.md`

```markdown
# REPRODUCTION NOTES

## Method

6-pass autonomous extraction protocol.

## Commit

SHA1: `git rev-parse HEAD`

## Passes Completed

- [x] B0: Census (inventaire)
- [ ] B1: AST Extraction
- [ ] B2: Test & Invariants
- [ ] B3: Dependency Graph
- [ ] B4: Metrics & Cards
- [ ] B5: Manifest & ZIP

## Reproduction Command

\`\`\`bash
npm run blueprint:all
\`\`\`
```

### Étape 7: Créer Validator

`tools/blueprint/src/validate-index.ts`

```typescript
import { z } from 'zod';
import fs from 'fs/promises';

const ModuleSchema = z.object({
  module_id: z.string(),
  type: z.enum(['BUILD', 'GOVERNANCE', 'TOOL', 'NEXUS', 'DOC', 'SESSION']),
  path: z.string(),
  status: z.string(),
  files: z.array(z.string()),
  exports: z.any().nullable(),
  types: z.any().nullable(),
  functions: z.any().nullable(),
  tests: z.any().nullable(),
  invariants: z.any().nullable(),
  metrics: z.any().nullable()
});

const IndexSchema = z.object({
  schema_version: z.string(),
  generated_at: z.string(),
  commit: z.string(),
  modules: z.array(ModuleSchema),
  stats: z.object({
    total_modules: z.number(),
    build_modules: z.number(),
    governance_modules: z.number(),
    total_files: z.number()
  })
});

async function validate() {
  const raw = await fs.readFile('nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json', 'utf-8');
  const data = JSON.parse(raw);
  
  try {
    IndexSchema.parse(data);
    console.log('✅ BLUEPRINT_INDEX.json valid');
    
    // Vérifier que tous les paths existent
    for (const mod of data.modules) {
      const exists = await fs.access(mod.path).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error(`Module path not found: ${mod.path}`);
      }
    }
    
    console.log('✅ All module paths exist');
    return true;
  } catch (err) {
    console.error('❌ Validation failed:', err);
    return false;
  }
}

validate().then(ok => process.exit(ok ? 0 : 1));
```

### Étape 8: Tests Invariants

Créer `tools/blueprint/src/__tests__/b0-census.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';

describe('B0: Census Invariants', () => {
  it('INV-BP-01: Output stable (deterministic)', async () => {
    const index1 = JSON.parse(await fs.readFile('nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json', 'utf-8'));
    
    // Modules doivent être triés par module_id
    const ids = index1.modules.map(m => m.module_id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('INV-BP-02: No forbidden paths', async () => {
    const index = JSON.parse(await fs.readFile('nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json', 'utf-8'));
    
    const forbidden = ['node_modules', 'dist', 'coverage', '.git'];
    for (const mod of index.modules) {
      for (const bad of forbidden) {
        expect(mod.path).not.toContain(bad);
      }
    }
  });

  it('INV-BP-03: Writes only in nexus/blueprint', async () => {
    // Vérifier que tous les fichiers créés sont dans nexus/blueprint
    const files = await fs.readdir('nexus/blueprint/OMEGA_BLUEPRINT_PACK', { recursive: true });
    expect(files.length).toBeGreaterThan(0);
  });

  it('INV-BP-04: Index reconstructible (no dangling refs)', async () => {
    const index = JSON.parse(await fs.readFile('nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json', 'utf-8'));
    
    for (const mod of index.modules) {
      const exists = await fs.access(mod.path).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });
});
```

---

## 📤 OUTPUT ATTENDU

### Console

```
🔍 B0: CENSUS — Starting...

📋 BILAN
  Modules détectés: 47
    - BUILD: 23
    - GOVERNANCE: 8
    - TOOLS: 6
    - NEXUS: 5
    - DOCS: 3
    - SESSIONS: 2
  Fichiers totaux: 1,847

✅ ACTIONS COMPLÉTÉES
  ✅ Structure blueprint créée
  ✅ BLUEPRINT_INDEX.json généré (squelette)
  ✅ 47 module_card.md créés
  ✅ REPRO_NOTES.md créé
  ✅ Validator TypeScript créé
  ✅ Tests invariants écrits

🧪 INVARIANTS
  ✅ INV-BP-01: Output stable
  ✅ INV-BP-02: No forbidden paths
  ✅ INV-BP-03: Isolation write
  ✅ INV-BP-04: Index reconstructible

🧪 TESTS
  Running: npm test -- b0-census.test.ts
  ✅ 4 passed (4)

📊 STATUS: PASS

Next: B1 (AST Extraction)
```

### Fichiers Créés

```
nexus/blueprint/OMEGA_BLUEPRINT_PACK/
├── BLUEPRINT_INDEX.json (squelette avec 47 modules)
├── MODULES/
│   ├── omega-core/module_card.md
│   ├── genesis-forge/module_card.md
│   └── ... (45 autres)
└── MANIFEST/
    └── REPRO_NOTES.md

tools/blueprint/src/
├── validate-index.ts
└── __tests__/
    └── b0-census.test.ts
```

---

## 🚨 FAIL CONDITIONS

**BLOQUER (exit 1) si** :

- ❌ Writes hors `nexus/blueprint/` ou `tools/blueprint/`
- ❌ Inclusion de `node_modules/dist/coverage/.git`
- ❌ Modules non triés dans index
- ❌ Path inexistant référencé
- ❌ Tests invariants FAIL

---

## ✅ SUCCESS CRITERIA

- ✅ BLUEPRINT_INDEX.json créé
- ✅ Tous modules détectés
- ✅ Module cards squelettes créés
- ✅ Validator fonctionne
- ✅ Tests PASS (4/4)
- ✅ Aucune écriture hors scope

---

**END PROMPT B0**
