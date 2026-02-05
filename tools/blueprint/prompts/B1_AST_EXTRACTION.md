# CLAUDE CODE — PROMPT B1: AST EXTRACTION

**Mission**: Extraire toutes les surfaces API (exports, types, fonctions) de tous les modules OMEGA.

---

## 🎯 OBJECTIF

Pour chaque module détecté en B0, extraire :
- **Exports** : Classes, fonctions, types, interfaces exportés
- **Signatures** : Paramètres, types de retour, JSDoc
- **Relations** : Imports entre modules

Générer :
- `api_surface.json` par module
- `types_map.json` (tous les types du projet)
- `functions_map.json` (toutes les fonctions)

---

## 📍 CONTEXTE

Input: `BLUEPRINT_INDEX.json` (généré en B0)
Output: Enrichir chaque module avec `exports`, `types`, `functions`

---

## 🧬 INVARIANTS

### INV-BP-05: Text-Only Graphs
Tous les graphes/diagrammes doivent être en **texte pur** (Mermaid, PlantUML, ASCII).
JAMAIS de PNG/SVG/binaires.

### INV-BP-01: Déterminisme
Trier tous les exports alphabétiquement.

---

## 📋 PROCÉDURE

### Étape 1: Parser TypeScript Files

Pour chaque module dans `BLUEPRINT_INDEX.json` :

```typescript
import ts from 'typescript';
import fs from 'fs/promises';

async function parseModule(modulePath: string) {
  const files = await findTsFiles(modulePath);
  const program = ts.createProgram(files, {});
  const checker = program.getTypeChecker();
  
  const exports = [];
  const types = [];
  const functions = [];
  
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName.includes('node_modules')) continue;
    
    ts.forEachChild(sourceFile, node => {
      // Détecter exports
      if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        extractExport(node, checker, exports);
      }
      
      // Détecter types/interfaces
      if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        extractType(node, checker, types);
      }
      
      // Détecter fonctions
      if (ts.isFunctionDeclaration(node)) {
        extractFunction(node, checker, functions);
      }
    });
  }
  
  return { exports, types, functions };
}
```

### Étape 2: Extraire Signatures

```typescript
function extractFunction(node: ts.FunctionDeclaration, checker: ts.TypeChecker) {
  const signature = checker.getSignatureFromDeclaration(node);
  
  return {
    name: node.name?.text || 'anonymous',
    params: signature.parameters.map(p => ({
      name: p.name,
      type: checker.typeToString(checker.getTypeOfSymbolAtLocation(p, node))
    })),
    returnType: checker.typeToString(signature.getReturnType()),
    jsdoc: ts.getJSDocCommentsAndTags(node).map(j => j.comment).join('\n')
  };
}
```

### Étape 3: Générer api_surface.json

Pour chaque module, créer :
`nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES/<module_id>/api_surface.json`

```json
{
  "module_id": "omega-core",
  "exports": {
    "classes": ["Gateway", "Sentinel"],
    "functions": ["createGateway", "startMonitoring"],
    "types": ["GatewayConfig", "SentinelEvent"],
    "interfaces": ["IGateway", "ISentinel"]
  },
  "signatures": [
    {
      "name": "createGateway",
      "params": [{"name": "config", "type": "GatewayConfig"}],
      "returnType": "Gateway",
      "jsdoc": "Creates a new Gateway instance"
    }
  ]
}
```

### Étape 4: Générer types_map.json (global)

`nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/types_map.json`

```json
{
  "GatewayConfig": {
    "module": "omega-core",
    "file": "src/gateway/config.ts",
    "kind": "interface",
    "properties": [
      {"name": "port", "type": "number"},
      {"name": "host", "type": "string"}
    ]
  }
}
```

### Étape 5: Générer functions_map.json (global)

`nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/functions_map.json`

```json
{
  "createGateway": {
    "module": "omega-core",
    "file": "src/gateway/factory.ts",
    "signature": "(config: GatewayConfig) => Gateway"
  }
}
```

### Étape 6: Mettre à jour BLUEPRINT_INDEX.json

```json
{
  "module_id": "omega-core",
  "status": "AST_EXTRACTED",
  "exports": { /* données extraites */ },
  "types": 42,
  "functions": 156
}
```

### Étape 7: Tests

`tools/blueprint/src/__tests__/b1-ast.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';

describe('B1: AST Extraction', () => {
  it('All modules have api_surface.json', async () => {
    const index = JSON.parse(await fs.readFile('nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json', 'utf-8'));
    
    for (const mod of index.modules) {
      const apiPath = `nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES/${mod.module_id}/api_surface.json`;
      const exists = await fs.access(apiPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });

  it('INV-BP-05: Text-only graphs', async () => {
    // Vérifier aucun .png/.svg/.jpg dans GRAPHS/
    const files = await fs.readdir('nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS', { recursive: true });
    const binaries = files.filter(f => /\.(png|svg|jpg|jpeg|gif)$/i.test(f));
    expect(binaries).toHaveLength(0);
  });

  it('Exports sorted alphabetically', async () => {
    const index = JSON.parse(await fs.readFile('nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json', 'utf-8'));
    
    for (const mod of index.modules) {
      if (!mod.exports) continue;
      
      const classes = mod.exports.classes || [];
      expect(classes).toEqual([...classes].sort());
    }
  });
});
```

---

## 📤 OUTPUT ATTENDU

```
🔍 B1: AST EXTRACTION — Starting...

📋 BILAN
  Modules à parser: 47
  Fichiers TypeScript: 1,847
  
✅ EXTRACTION COMPLÉTÉE
  ✅ 47 api_surface.json créés
  ✅ types_map.json créé (624 types)
  ✅ functions_map.json créé (1,203 fonctions)
  ✅ BLUEPRINT_INDEX.json mis à jour

🧪 TESTS
  ✅ 3 passed (3)

📊 STATUS: PASS

Next: B2 (Test & Invariants)
```

---

## 🚨 FAIL CONDITIONS

- ❌ Module sans api_surface.json
- ❌ Fichier binaire dans GRAPHS/
- ❌ Exports non triés
- ❌ Tests FAIL

---

## ✅ SUCCESS CRITERIA

- ✅ Tous modules ont api_surface.json
- ✅ types_map.json et functions_map.json créés
- ✅ BLUEPRINT_INDEX.json enrichi
- ✅ Tests PASS (3/3)
- ✅ INV-BP-05 respecté (text-only)

---

**END PROMPT B1**
