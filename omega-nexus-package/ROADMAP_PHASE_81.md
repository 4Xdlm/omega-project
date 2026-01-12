# ═══════════════════════════════════════════════════════════════════════════════
#
#   🗺️ OMEGA NEXUS — ROADMAP PHASE 81
#   Plan d'Implémentation Détaillé
#
#   Version: 2.2.3
#   Date: 2026-01-12
#   Status: PRÊT POUR EXÉCUTION
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# VUE D'ENSEMBLE

```
Phase 81: OMEGA NEXUS IMPLEMENTATION
├── 81.1 Foundation (30 min)
├── 81.2 Core Scripts (2h)
├── 81.3 Guardian (1h30)
├── 81.4 Merkle (1h)
├── 81.5 Atlas (1h)
└── 81.6 CLI (1h)

Total estimé: ~7h de développement
```

---

# PHASE 81.1 — FOUNDATION

## Objectif
Créer l'arborescence et les fichiers fondateurs.

## Livrables

### 81.1.1 Script d'initialisation
```
Fichier: nexus/tooling/scripts/init.ps1
Fonction: Créer les 26 dossiers de l'arborescence
Test: Vérifier que tous les dossiers existent
```

### 81.1.2 Fichiers Genesis
```
Fichiers:
  - nexus/genesis/THE_OATH.md
  - nexus/genesis/LAWS.yaml
  - nexus/genesis/IDENTITY.yaml

Contenu: Défini dans le package
Test: Validation YAML + hash
```

### 81.1.3 Premier Registry
```
Fichier: nexus/ledger/registry/REG-YYYYMMDD.yaml
Contenu: Tous counters à 0
Test: Parse YAML valide
```

## Checklist
- [ ] Script init.ps1 créé
- [ ] Script exécuté sans erreur
- [ ] 26 dossiers créés
- [ ] THE_OATH.md présent
- [ ] LAWS.yaml valide
- [ ] IDENTITY.yaml valide
- [ ] REG créé avec counters à 0

## Critère de sortie
```
✅ Arborescence complète
✅ Fichiers genesis hashés
✅ Registry initialisé
```

---

# PHASE 81.2 — CORE SCRIPTS

## Objectif
Implémenter les scripts fondamentaux du Nexus.

## Livrables

### 81.2.1 registry.js
```javascript
// nexus/tooling/scripts/registry.js

Fonctions:
  - getDate()           → YYYYMMDD UTC
  - getTimestamp()      → ISO 8601 UTC (Z)
  - acquireLock(date)   → Lock avec timestamp+pid+host
  - releaseLock(date)   → Suppression lock
  - readRegistry(date)  → Lire REG-YYYYMMDD.yaml
  - incrementCounter(date, type) → Incrémenter et retourner SEQ
  - getNextId(type)     → TYPE-YYYYMMDD-NNNN complet

Tests:
  - Lock acquisition/release
  - Stale lock detection (>60s)
  - Counter increment
  - ID generation
```

### 81.2.2 hash.js
```javascript
// nexus/tooling/scripts/hash.js

Fonctions:
  - parseFile(filepath)     → Objet selon extension
  - canonicalize(obj)       → RFC 8785
  - computeFileHash(path)   → sha256:...
  - getCanonicalPath(id)    → Chemin complet

Tests:
  - Parse YAML
  - Parse JSON
  - Parse JSONL
  - Parse MD/TXT (direct)
  - Hash reproductible
```

### 81.2.3 seal.js
```javascript
// nexus/tooling/scripts/seal.js

Fonctions:
  - createSession(date)     → SES-YYYYMMDD-NNNN
  - createEntity(data)      → ENT-YYYYMMDD-NNNN
  - createEvent(data)       → EVT-YYYYMMDD-NNNN
  - createLink(data)        → LINK-YYYYMMDD-NNNN
  - createManifest(files)   → MANIFEST-YYYYMMDD-NNNN
  - createSeal(data)        → SEAL-YYYYMMDD-NNNN
  - seal(input)             → Processus complet

Tests:
  - Création SES
  - Création ENT avec EVT
  - Création LINK
  - MANIFEST avec files_in_scope
  - SEAL avec root_hash
```

### 81.2.4 verify.js
```javascript
// nexus/tooling/scripts/verify.js

Fonctions:
  - verifyFile(path)        → Hash match
  - verifyManifest(id)      → Tous hashes valides
  - verifySeal(id)          → root_hash reproductible
  - verifyChain()           → Chaîne de seals valide

Tests:
  - Fichier non modifié
  - Fichier modifié détecté
  - Manifest intègre
  - Seal valide
```

## Checklist
- [ ] registry.js implémenté
- [ ] registry.js testé (lock, counter, ID)
- [ ] hash.js implémenté
- [ ] hash.js testé (parse, canonicalize, hash)
- [ ] seal.js implémenté
- [ ] seal.js testé (SES, ENT, EVT, MANIFEST, SEAL)
- [ ] verify.js implémenté
- [ ] verify.js testé (hash, manifest, seal)

## Critère de sortie
```
✅ Tous scripts fonctionnels
✅ Tests passent
✅ Premier seal possible
```

---

# PHASE 81.3 — GUARDIAN

## Objectif
Implémenter les 14 règles de validation.

## Livrables

### 81.3.1 Schemas JSON
```
Fichiers:
  - nexus/tooling/schemas/ENT.schema.json
  - nexus/tooling/schemas/EVT.schema.json
  - nexus/tooling/schemas/LINK.schema.json
  - nexus/tooling/schemas/SEAL.schema.json
  - nexus/tooling/schemas/MANIFEST.schema.json
  - nexus/tooling/schemas/REG.schema.json

Format: JSON Schema Draft 7
```

### 81.3.2 guardian.js
```javascript
// nexus/tooling/scripts/guardian.js

Rules:
  1_SCHEMA           → Validation JSON Schema
  2_IDS_UNIQUE       → Chemin n'existe pas
  3_LINKS_VALID      → Source/target existent
  4_CANONICAL_PATH   → Type connu
  5_CERTIFIED_PROOF  → Preuves si CERTIFIED
  6_ABANDONED_LESSON → LESSON si ABANDONED/FAILED
  7_FILE_EXISTS      → Refs pointent vers fichiers
  8_ATLAS_META       → Hash match
  9_UTC_ONLY         → Timestamps en Z
  10_TOOLING_STRICT  → Mode STRICT
  11_ID_DATE_UTC     → Date = UTC
  12_TAGS_REQUIRED   → Tags si lifecycle requis
  13_ROOT_HASH       → Merkle reproductible
  14_MANIFEST_SCOPE  → Pas d'auto-référence

Fonctions:
  - validateFile(path)       → Résultat par règle
  - validateAll()            → Audit complet
  - getReport()              → Rapport COMP

Tests:
  - Chaque règle testée individuellement
  - Fichier valide passe
  - Fichier invalide REJECT
```

### 81.3.3 guardian.config.yaml
```yaml
mode: "STRICT"

allowlist:
  extensions: [".ps1", ".sh", ".js", ".ts", ".mjs", ".yaml", ".json", ".md"]
  dependencies:
    - "canonicalize@2.0.0"
    - "yaml@2.x"
    - "glob@10.x"
    - "commander@11.x"
    - "chalk@5.x"
    - "ajv@8.x"

forbidden:
  directories: ["src", "packages", "components", "ui", "app", "dist", "build"]
  imports: ["packages/", "../packages", "../../packages"]
```

## Checklist
- [ ] 6 schemas JSON créés
- [ ] Schemas valides (meta-validation)
- [ ] guardian.js implémenté
- [ ] 14 règles testées
- [ ] guardian.config.yaml créé
- [ ] Mode STRICT vérifié

## Critère de sortie
```
✅ Tous schemas valides
✅ Guardian passe sur Nexus vide
✅ Guardian détecte violations
```

---

# PHASE 81.4 — MERKLE

## Objectif
Implémenter le calcul du root_hash avec domain separation.

## Livrables

### 81.4.1 merkle.js
```javascript
// nexus/tooling/scripts/merkle.js

Constants:
  LEAF_PREFIX = Buffer.from('omega:leaf\0', 'utf8')
  NODE_PREFIX = Buffer.from('omega:node\0', 'utf8')

Fonctions:
  - computeLeafHash(path, fileHash)  → Buffer 32 bytes
  - computeNodeHash(left, right)     → Buffer 32 bytes
  - buildMerkleRoot(files)           → sha256:...
  - getFilesInScope(excludeCurrent)  → Liste triée

Tests:
  - Leaf hash avec path binding
  - Node hash avec domain separation
  - Merkle root déterministe
  - Exclusion SEAL/MANIFEST courant
  - Tri lexicographique
```

## Checklist
- [ ] merkle.js implémenté
- [ ] Domain separation correcte
- [ ] Path binding vérifié
- [ ] Merkle root reproductible
- [ ] Exclusions respectées

## Critère de sortie
```
✅ root_hash identique sur relance
✅ Modification fichier = hash différent
✅ Permutation fichiers = hash différent
```

---

# PHASE 81.5 — ATLAS

## Objectif
Implémenter la génération des vues.

## Livrables

### 81.5.1 build-atlas.js
```javascript
// nexus/tooling/scripts/build-atlas.js

Fonctions:
  - loadLedger()              → Tous ENT/EVT/LINK
  - buildTimeline()           → TIMELINE.md
  - buildMuseum()             → museum/index.json
  - buildVisions()            → visions/index.json
  - buildLessons()            → lessons/index.json
  - generateAtlasMeta()       → ATLAS-META.json (déterministe)
  - generateAtlasRun()        → ATLAS-RUN.json (debug)
  - buildAll()                → Génération complète

Tests:
  - Timeline générée correctement
  - ATLAS-META sans timestamps
  - ATLAS-META.source_root_hash correct
  - Régénération idempotente
```

### 81.5.2 Templates
```
Fichiers:
  - nexus/tooling/templates/TIMELINE.template.md
  - nexus/tooling/templates/LESSON.template.md
```

## Checklist
- [ ] build-atlas.js implémenté
- [ ] Timeline générée
- [ ] ATLAS-META déterministe
- [ ] ATLAS-RUN séparé
- [ ] Templates créés

## Critère de sortie
```
✅ Atlas généré depuis ledger
✅ ATLAS-META hashable
✅ Régénération = même résultat
```

---

# PHASE 81.6 — CLI

## Objectif
Créer l'interface en ligne de commande unifiée.

## Livrables

### 81.6.1 omega-nexus CLI
```javascript
// nexus/tooling/scripts/cli.js

Commands:
  omega-nexus init              → Initialiser arborescence
  omega-nexus seal              → Sceller session (interactif)
  omega-nexus seal --auto       → Sceller depuis fichier
  omega-nexus verify            → Vérifier intégrité
  omega-nexus verify --seal ID  → Vérifier seal spécifique
  omega-nexus atlas             → Générer atlas
  omega-nexus export            → Exporter pour tribunal
  omega-nexus status            → État du Nexus

Options globales:
  --verbose                     → Logs détaillés
  --dry-run                     → Simulation
```

### 81.6.2 package.json
```json
{
  "name": "omega-nexus",
  "version": "1.0.0",
  "bin": {
    "omega-nexus": "./cli.js"
  },
  "dependencies": {
    "canonicalize": "2.0.0",
    "yaml": "^2.0.0",
    "glob": "^10.0.0",
    "commander": "^11.0.0",
    "chalk": "^5.0.0",
    "ajv": "^8.0.0"
  }
}
```

## Checklist
- [ ] CLI implémenté
- [ ] Command init fonctionne
- [ ] Command seal fonctionne
- [ ] Command verify fonctionne
- [ ] Command atlas fonctionne
- [ ] Help affiché
- [ ] package.json créé

## Critère de sortie
```
✅ npm install fonctionne
✅ omega-nexus --help affiche aide
✅ Workflow complet possible via CLI
```

---

# SÉQUENCE D'EXÉCUTION RECOMMANDÉE

```
JOUR 1 (3h)
├── 81.1 Foundation (30 min)
│   └── Arborescence + Genesis + Registry
├── 81.2 Core Scripts - Partie 1 (2h30)
│   ├── registry.js
│   └── hash.js

JOUR 2 (2h)
├── 81.2 Core Scripts - Partie 2 (2h)
│   ├── seal.js
│   └── verify.js

JOUR 3 (2h)
├── 81.3 Guardian (1h30)
│   ├── Schemas
│   └── guardian.js
├── 81.4 Merkle (30 min)
│   └── merkle.js

JOUR 4 (2h)
├── 81.5 Atlas (1h)
│   └── build-atlas.js
├── 81.6 CLI (1h)
│   └── cli.js + package.json

TOTAL: ~9h réparties sur 4 sessions
```

---

# TESTS DE VALIDATION FINALE

## Workflow Complet
```bash
# 1. Initialiser
omega-nexus init

# 2. Créer premier seal
omega-nexus seal
# → Suivre le prompt interactif
# → Créer ENT-* (décision adoption Nexus)
# → Générer SEAL-*

# 3. Vérifier intégrité
omega-nexus verify
# → Tous checks PASS

# 4. Générer atlas
omega-nexus atlas
# → TIMELINE.md créé
# → ATLAS-META.json correct

# 5. Re-vérifier
omega-nexus verify
# → Toujours PASS

# 6. Modifier un fichier (test)
# Éditer manuellement un ENT

# 7. Vérifier détection
omega-nexus verify
# → FAIL détecté
```

## Critères de Succès Phase 81
```
✅ Arborescence créée (26 dossiers)
✅ Fichiers genesis présents et hashés
✅ Premier SEAL créé
✅ Verify passe sur Nexus intègre
✅ Verify détecte modification
✅ Atlas généré
✅ CLI fonctionnel
✅ Documentation à jour
```

---

# APRÈS PHASE 81

## Phase 82 — Intégration OMEGA
- Intégrer Nexus dans workflow OMEGA existant
- Migrer décisions passées
- Premier seal de session réelle

## Phase 83 — Automatisation
- Hooks Git pour seal automatique
- CI/CD verification
- Alertes si Guardian FAIL

---

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🗺️ OMEGA NEXUS v2.2.3 — ROADMAP PHASE 81                                   ║
║                                                                               ║
║   6 sous-phases — ~9h total — 4 sessions                                      ║
║   Foundation → Core → Guardian → Merkle → Atlas → CLI                         ║
║                                                                               ║
║   Critère final: Workflow complet fonctionnel                                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
