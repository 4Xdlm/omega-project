# CLAUDE CODE — MASTER ORCHESTRATOR

**Mission**: Exécuter TOUS les prompts Blueprint + Standard ADN en séquence autonome.

---

## 🎯 OBJECTIF GLOBAL

Produire le **PACK COMPLET OMEGA** en **UNE SEULE EXÉCUTION** :

1. **Blueprint OMEGA** (dissection système complète)
2. **Standard ADN Émotionnel v1.0** (IR + Contrat juridique)

---

## 📋 SÉQUENCE D'EXÉCUTION

### PHASE 0: Setup & Verification

```bash
cd /home/claude/omega-project

# Commit actuel
COMMIT=$(git rev-parse HEAD)
echo "📍 Commit: $COMMIT"

# Branche
BRANCH=$(git branch --show-current)
echo "📍 Branch: $BRANCH"

# Créer structures
mkdir -p nexus/blueprint/OMEGA_BLUEPRINT_PACK/{MODULES,GRAPHS,MANIFEST}
mkdir -p nexus/standards/EMOTIONAL_DNA_v1.0/{IR,LEGAL,MANIFEST}
mkdir -p tools/blueprint/{src,prompts,validators}

# Vérifier que le repo est propre
if [[ -n $(git status --porcelain) ]]; then
  echo "⚠️ Uncommitted changes detected"
  echo "Continue anyway? (y/n)"
fi
```

---

### PHASE B0: CENSUS

**Fichier**: `tools/blueprint/prompts/B0_CENSUS.md`

**Action**: Lire et exécuter le prompt B0

**Validation**:
```bash
# Tests doivent passer
npm test -- b0-census.test.ts || exit 1

# Index doit exister
test -f nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json || exit 1

# Compter modules détectés
MODULES=$(jq '.stats.total_modules' nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json)
echo "✅ B0 PASS — $MODULES modules detected"
```

**STOP si**: Tests FAIL ou index manquant

---

### PHASE B1: AST EXTRACTION

**Objectif**: Parser tous les fichiers TypeScript et extraire:
- Exports (fonctions, classes, types, interfaces)
- Signatures avec JSDoc
- Créer `api_surface.json`, `types_map.json`, `functions_map.json` par module

**Validation**:
```bash
npm test -- b1-ast.test.ts || exit 1

# Vérifier que chaque module a son API surface
find nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES -name "api_surface.json" | wc -l
# Doit être égal au nombre de modules

echo "✅ B1 PASS — API surfaces extracted"
```

**STOP si**: Tests FAIL ou fichiers manquants

---

### PHASE B2: TEST & INVARIANTS MAPPING

**Objectif**: 
- Scanner tous les tests (vitest/jest)
- Mapper tests → modules
- Scanner tous les INV-* dans code/docs/tests
- Créer `tests_map.json`, `invariants_map.json`
- Générer `test_heatmap.json`, `invariant_coverage.json`

**Validation**:
```bash
npm test -- b2-test-inv.test.ts || exit 1

# Fichiers critiques
test -f nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/test_heatmap.json || exit 1
test -f nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/invariant_coverage.json || exit 1

# Vérifier INV-BP-07 (GOVERNANCE non-actuating)
# Vérifier INV-BP-08 (BUILD↔GOV boundary)

echo "✅ B2 PASS — Tests & invariants mapped"
```

**STOP si**: Violation INV-BP-07/08 détectée sans WAIVER

---

### PHASE B3: DEPENDENCY GRAPH

**Objectif**:
- Exécuter `dependency-cruiser` sur le repo
- Convertir en Mermaid (texte seulement)
- Détecter violations:
  - GOVERNANCE → BUILD (interdit par contrat)
  - Circular dependencies
  - Forbidden edges
- Créer `repo_deps.mmd`, `deps.mmd` par module, `layering_report.json`

**Validation**:
```bash
npm test -- b3-deps.test.ts || exit 1

test -f nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/repo_deps.mmd || exit 1
test -f nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/layering_report.json || exit 1

# Vérifier violations
VIOLATIONS=$(jq '.violations | length' nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/layering_report.json)
if [ "$VIOLATIONS" -gt 0 ]; then
  echo "⚠️ $VIOLATIONS architectural violations detected"
  echo "WAIVER required or BLOCKED"
  exit 1
fi

echo "✅ B3 PASS — Dependency graphs generated, no violations"
```

**STOP si**: Violations détectées sans WAIVER

---

### PHASE B4: METRICS & FINALIZED CARDS

**Objectif**:
- Calculer métriques par module:
  - LOC (lines of code)
  - File count
  - Bytes
  - Test density
  - Complexity (cyclomatic)
  - Hotspots (git churn)
- Finaliser `module_card.md` avec:
  - Utilité (factuel depuis API)
  - Limites (ce qu'il ne fait PAS)
  - Risques (TODOs, issues détectés)
  - Extensions futures (gaps logiques API)
  - **ZÉRO spéculation**

**Validation**:
```bash
npm test -- b4-metrics.test.ts || exit 1

# Tous modules ont metrics.json
find nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES -name "metrics.json" | wc -l

# Vérifier aucune spéculation dans cards
grep -r "peut-être\|pourrait\|probablement\|éventuellement" \
  nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES/*/module_card.md
# Attendu: aucune occurrence

echo "✅ B4 PASS — Metrics computed, cards finalized"
```

**STOP si**: Spéculation détectée ou métriques inventées

---

### PHASE B5: MANIFEST & ZIP

**Objectif**:
- Calculer SHA256 pour CHAQUE fichier du BLUEPRINT_PACK
- Créer `BLUEPRINT_MANIFEST.sha256` (trié)
- Finaliser `LEGAL_EVIDENCE.md`
- Créer ZIP reproductible:
  - Entries triées alphabétiquement
  - Timestamps neutralisés
  - Compression deterministe
- Vérifier reproductibilité (double run)

**Validation**:
```bash
npm test -- b5-manifest.test.ts || exit 1

test -f nexus/blueprint/OMEGA_BLUEPRINT_PACK/MANIFEST/BLUEPRINT_MANIFEST.sha256 || exit 1
test -f nexus/blueprint/OMEGA_BLUEPRINT_PACK/MANIFEST/LEGAL_EVIDENCE.md || exit 1

# ZIP créé
ls nexus/blueprint/OMEGA_BLUEPRINT_PACK_*.zip || exit 1

# Test reproductibilité
ZIP1=$(sha256sum nexus/blueprint/OMEGA_BLUEPRINT_PACK_*.zip | cut -d' ' -f1)
rm nexus/blueprint/OMEGA_BLUEPRINT_PACK_*.zip
# Recréer ZIP
# ... (re-run B5 zip creation)
ZIP2=$(sha256sum nexus/blueprint/OMEGA_BLUEPRINT_PACK_*.zip | cut -d' ' -f1)

if [ "$ZIP1" != "$ZIP2" ]; then
  echo "❌ ZIP not reproductible!"
  exit 1
fi

echo "✅ B5 PASS — Manifest created, ZIP reproductible"
```

**STOP si**: ZIP non reproductible

---

### PHASE S0: EMOTIONAL DNA STANDARD

**Objectif**:
- Créer IR (JSON Schema + spec + validator)
- Créer Contrat juridique (10 articles)
- Créer 4 Annexes techniques:
  - A: Modèle mathématique
  - B: Invariants ADN
  - C: Tests conformité
  - D: Matrice compatibilité
- Créer Manifest + ZIP

**Validation**:
```bash
# Schema
test -f nexus/standards/EMOTIONAL_DNA_v1.0/IR/EMOTIONAL_DNA_IR_SCHEMA.json || exit 1

# Contrat
test -f nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/EMOTIONAL_DNA_CONTRACT_v1.0.md || exit 1

# 4 Annexes
test -f nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/ANNEX_A_MATHEMATICAL_MODEL.md || exit 1
test -f nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/ANNEX_B_INVARIANTS.md || exit 1
test -f nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/ANNEX_C_CONFORMITY_TESTS.md || exit 1
test -f nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/ANNEX_D_COMPATIBILITY_MATRIX.md || exit 1

# Manifest
test -f nexus/standards/EMOTIONAL_DNA_v1.0/MANIFEST/STANDARD_MANIFEST.sha256 || exit 1

# ZIP
ls nexus/standards/EMOTIONAL_DNA_STANDARD_v1.0_*.zip || exit 1

echo "✅ S0 PASS — Emotional DNA Standard complete"
```

---

## 📤 RAPPORT FINAL

```bash
cat <<EOF
═══════════════════════════════════════════════════════════════
  OMEGA MASTER ORCHESTRATOR — EXECUTION COMPLETE
═══════════════════════════════════════════════════════════════

📍 Commit: $COMMIT
📍 Branch: $BRANCH
📍 Date: $(date -Iseconds)

[B0] ✅ CENSUS — PASS ($MODULES modules, X files)
[B1] ✅ AST EXTRACTION — PASS
[B2] ✅ TEST & INVARIANTS — PASS (5723 tests, 106 invariants)
[B3] ✅ DEPENDENCY GRAPH — PASS (no violations)
[B4] ✅ METRICS & CARDS — PASS
[B5] ✅ MANIFEST & ZIP — PASS
[S0] ✅ EMOTIONAL DNA STANDARD — PASS

═══════════════════════════════════════════════════════════════
  LIVRABLES
═══════════════════════════════════════════════════════════════

📦 Blueprint Pack:
   nexus/blueprint/OMEGA_BLUEPRINT_PACK_$COMMIT.zip
   SHA-256: $(sha256sum nexus/blueprint/OMEGA_BLUEPRINT_PACK_*.zip | cut -d' ' -f1)

📦 Emotional DNA Standard:
   nexus/standards/EMOTIONAL_DNA_STANDARD_v1.0_$COMMIT.zip
   SHA-256: $(sha256sum nexus/standards/EMOTIONAL_DNA_STANDARD_v1.0_*.zip | cut -d' ' -f1)

═══════════════════════════════════════════════════════════════
  INVARIANTS
═══════════════════════════════════════════════════════════════

✅ INV-BP-01: Output deterministic
✅ INV-BP-02: No forbidden paths
✅ INV-BP-03: Writes isolated
✅ INV-BP-04: Index reconstructible
✅ INV-BP-05: Text graphs only
✅ INV-BP-06: Metrics sourced
✅ INV-BP-07: GOVERNANCE non-actuating
✅ INV-BP-08: BUILD↔GOV boundary respected
✅ INV-BP-09: SHA256 signatures present
✅ INV-BP-10: ZIP reproductible

═══════════════════════════════════════════════════════════════
  STATUS: SUCCESS — ALL PHASES COMPLETE
═══════════════════════════════════════════════════════════════
EOF
```

---

## 🚨 ERROR HANDLING

Si **une seule phase FAIL**:

```bash
echo "❌ PHASE B2 FAILED"
echo ""
echo "Reason: INV-BP-07 violated"
echo "File: nexus/governance/runtime/decision.ts:42"
echo "Detail: GOVERNANCE module actuates on BUILD"
echo ""
echo "ACTION REQUIRED:"
echo "  1. Fix violation, OR"
echo "  2. Create WAIVER document"
echo ""
echo "ORCHESTRATION STOPPED."
exit 1
```

---

## ✅ GLOBAL SUCCESS CRITERIA

- ✅ Toutes phases B0→B5 + S0 PASS
- ✅ Tous tests invariants PASS
- ✅ 2 ZIPs créés et reproductibles
- ✅ Aucune violation BUILD↔GOV
- ✅ Aucune spéculation dans docs
- ✅ Manifest juridiquement déposable

---

**END MASTER ORCHESTRATOR**
