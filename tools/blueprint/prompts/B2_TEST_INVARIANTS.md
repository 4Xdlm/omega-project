# CLAUDE CODE — PROMPT B2: TEST & INVARIANTS MAPPING

**Mission**: Mapper tests → code et extraire tous les invariants du projet.

---

## 🎯 OBJECTIF

1. Scanner tous les tests (vitest, jest)
2. Mapper chaque test → module/fichier testé
3. Scanner tous invariants (INV-*)
4. Générer heatmaps et coverage
5. **Vérifier INV-BP-07 et INV-BP-08 (GOUVERNANCE)**

---

## 🧬 INVARIANTS CRITIQUES

### INV-BP-07: GOUVERNANCE non-actuating
GOUVERNANCE ne peut JAMAIS :
- Modifier BUILD
- Recalculer un ORACLE
- Corriger automatiquement

**Vérification** :
- Scanner `nexus/governance/` pour détection de writes vers BUILD
- Vérifier absence de `import` depuis BUILD vers modification

### INV-BP-08: BUILD↔GOVERNANCE boundary
BUILD et GOUVERNANCE sont **hermétiques**.

**Règles** :
- BUILD peut importer GOUVERNANCE types (lecture seule)
- GOUVERNANCE ne peut PAS importer BUILD pour modification
- Toute interaction = via events/logs append-only

**Vérification** :
- Analyser imports entre `packages/` (BUILD) et `nexus/governance/`
- Détecter violations de frontière

---

## 📋 PROCÉDURE

### Étape 1: Scanner Tests

```typescript
import { glob } from 'glob';
import fs from 'fs/promises';

async function scanTests() {
  const testFiles = await glob('**/*.test.{ts,tsx}', {
    ignore: ['node_modules/**', 'dist/**']
  });
  
  const testsMap = [];
  
  for (const file of testFiles) {
    const content = await fs.readFile(file, 'utf-8');
    
    // Détecter imports pour trouver module testé
    const imports = extractImports(content);
    
    // Compter tests (describe/it/test)
    const testCount = (content.match(/\b(it|test)\(/g) || []).length;
    
    testsMap.push({
      file,
      testedModule: inferModule(imports),
      testCount
    });
  }
  
  return testsMap;
}
```

### Étape 2: Créer tests_map.json

`nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/tests_map.json`

```json
{
  "omega-core": {
    "test_files": [
      "packages/omega-core/src/__tests__/gateway.test.ts",
      "packages/omega-core/src/__tests__/sentinel.test.ts"
    ],
    "total_tests": 234,
    "coverage": null
  }
}
```

### Étape 3: Scanner Invariants

```typescript
async function scanInvariants() {
  // Scanner tous fichiers pour "INV-"
  const allFiles = await glob('**/*.{ts,md,tsx}', {
    ignore: ['node_modules/**']
  });
  
  const invariants = [];
  
  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const matches = content.matchAll(/INV-([A-Z0-9-]+)/g);
    
    for (const match of matches) {
      invariants.push({
        id: `INV-${match[1]}`,
        file,
        line: getLineNumber(content, match.index)
      });
    }
  }
  
  return invariants;
}
```

### Étape 4: Créer invariants_map.json

`nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/invariants_map.json`

```json
{
  "INV-BP-01": {
    "description": "Output déterministe",
    "locations": [
      {"file": "tools/blueprint/prompts/B0_CENSUS.md", "line": 42}
    ],
    "tests": [
      "tools/blueprint/src/__tests__/b0-census.test.ts:10"
    ]
  }
}
```

### Étape 5: Générer test_heatmap.json

```json
{
  "heatmap": [
    {"module": "omega-core", "test_density": 0.85, "test_count": 234},
    {"module": "genesis-forge", "test_density": 0.92, "test_count": 368}
  ],
  "avg_density": 0.78
}
```

### Étape 6: Vérifier INV-BP-07 (non-actuating)

```typescript
async function verifyNonActuating() {
  const govFiles = await glob('nexus/governance/**/*.ts');
  
  for (const file of govFiles) {
    const content = await fs.readFile(file, 'utf-8');
    
    // Détecter writes suspects
    const writes = content.match(/fs\.writeFile|fs\.write|\.write\(/g);
    if (writes) {
      // Vérifier que c'est append-only vers logs
      const isLog = file.includes('logs') || file.includes('events');
      if (!isLog) {
        throw new Error(`INV-BP-07 VIOLATION: ${file} writes outside logs`);
      }
    }
    
    // Détecter imports BUILD
    const buildImports = content.match(/from ['"].*\/packages\//g);
    if (buildImports) {
      // Vérifier que c'est type-only
      const isTypeOnly = content.includes('import type');
      if (!isTypeOnly) {
        throw new Error(`INV-BP-07 VIOLATION: ${file} imports BUILD for modification`);
      }
    }
  }
}
```

### Étape 7: Vérifier INV-BP-08 (boundary)

```typescript
async function verifyBoundary() {
  const buildFiles = await glob('packages/**/*.ts');
  const govFiles = await glob('nexus/governance/**/*.ts');
  
  const violations = [];
  
  // BUILD ne doit PAS importer GOVERNANCE
  for (const file of buildFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const govImports = content.match(/from ['"].*nexus\/governance/g);
    
    if (govImports) {
      violations.push({
        file,
        violation: 'BUILD imports GOVERNANCE',
        type: 'INV-BP-08'
      });
    }
  }
  
  // GOUVERNANCE peut importer BUILD type-only
  for (const file of govFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const buildImports = content.match(/from ['"].*\/packages\//g);
    
    if (buildImports && !content.includes('import type')) {
      violations.push({
        file,
        violation: 'GOVERNANCE imports BUILD non-type',
        type: 'INV-BP-08'
      });
    }
  }
  
  if (violations.length > 0) {
    console.error('❌ INV-BP-08 VIOLATIONS:');
    console.error(JSON.stringify(violations, null, 2));
    throw new Error('Boundary violations detected');
  }
}
```

### Étape 8: Tests

`tools/blueprint/src/__tests__/b2-test-inv.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';

describe('B2: Test & Invariants', () => {
  it('tests_map.json exists and valid', async () => {
    const raw = await fs.readFile('nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/tests_map.json', 'utf-8');
    const data = JSON.parse(raw);
    expect(Object.keys(data).length).toBeGreaterThan(0);
  });

  it('invariants_map.json exists', async () => {
    const raw = await fs.readFile('nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/invariants_map.json', 'utf-8');
    const data = JSON.parse(raw);
    expect(data['INV-BP-01']).toBeDefined();
  });

  it('INV-BP-07: GOVERNANCE non-actuating', async () => {
    // Vérifier aucun write hors logs dans governance
    const govFiles = await glob('nexus/governance/**/*.ts');
    
    for (const file of govFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const writes = content.match(/fs\.writeFile|fs\.write|\.write\(/g);
      
      if (writes && !file.includes('logs')) {
        throw new Error(`GOV writes outside logs: ${file}`);
      }
    }
  });

  it('INV-BP-08: BUILD↔GOV boundary respected', async () => {
    // Vérifier aucun import BUILD → GOV
    const buildFiles = await glob('packages/**/*.ts');
    
    for (const file of buildFiles) {
      const content = await fs.readFile(file, 'utf-8');
      expect(content).not.toMatch(/from ['"].*nexus\/governance/);
    }
  });
});
```

---

## 📤 OUTPUT ATTENDU

```
🔍 B2: TEST & INVARIANTS — Starting...

📋 SCAN RESULTS
  Test files: 156
  Total tests: 5,723
  Invariants found: 106
  
✅ MAPPING COMPLETED
  ✅ tests_map.json créé
  ✅ invariants_map.json créé
  ✅ test_heatmap.json généré
  ✅ invariant_coverage.json généré

🛡️ BOUNDARY VERIFICATION
  ✅ INV-BP-07: PASS — No actuating code in GOVERNANCE
  ✅ INV-BP-08: PASS — BUILD↔GOV boundary respected

🧪 TESTS
  ✅ 4 passed (4)

📊 STATUS: PASS

Next: B3 (Dependency Graph)
```

---

## 🚨 FAIL CONDITIONS

- ❌ INV-BP-07 violation (GOV modifie BUILD)
- ❌ INV-BP-08 violation (frontière cassée)
- ❌ Fichiers manquants
- ❌ Tests FAIL

---

## ✅ SUCCESS CRITERIA

- ✅ tests_map.json et invariants_map.json créés
- ✅ INV-BP-07 et INV-BP-08 vérifiés
- ✅ Heatmaps générées
- ✅ Tests PASS (4/4)
- ✅ Aucune violation sans WAIVER

---

**END PROMPT B2**
