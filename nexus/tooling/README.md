# OMEGA NEXUS

**Coffre-Fort Technique pour Décisions Projet**

Version: 2.2.3  
Status: Production-Ready  
Tests: 330+ (100% pass)

---

## 🎯 Qu'est-ce que OMEGA NEXUS ?

OMEGA NEXUS est un système de traçabilité cryptographique pour les décisions projet. Chaque décision, événement et relation est scellé de manière immutable via un arbre de Merkle, garantissant:

- **Intégrité** — Aucune modification silencieuse possible
- **Traçabilité** — Chaque changement est horodaté et signé
- **Auditabilité** — Preuve cryptographique exportable
- **Reproductibilité** — Hashes déterministes et vérifiables

---

## 🚀 Démarrage Rapide

### Installation

```bash
cd nexus/tooling
npm install
```

### Initialisation

```bash
node scripts/cli.js init
```

### Premier Seal

```bash
node scripts/cli.js seal -m "Initial project setup"
```

### Vérification

```bash
node scripts/cli.js verify
```

---

## 📁 Structure Nexus

```
nexus/
├── genesis/              # Fichiers fondateurs (immutables)
│   ├── THE_OATH.md       # Serment du projet
│   ├── LAWS.yaml         # Lois du nexus
│   └── IDENTITY.yaml     # Identité du projet
├── ledger/               # Registre des décisions
│   ├── entities/         # Entités (décisions, modules, bugs...)
│   ├── events/           # Événements (created, updated, promoted...)
│   ├── links/            # Relations entre entités
│   └── registry/         # Compteurs et locks
├── raw/                  # Données brutes
│   └── sessions/         # Sessions de travail (.jsonl)
├── proof/                # Preuves cryptographiques
│   ├── seals/            # Scellés (root hash)
│   ├── states/           # Snapshots d'état
│   ├── completeness/     # Rapports de complétude
│   └── snapshots/manifests/
└── atlas/                # Vues générées
    ├── TIMELINE.md       # Timeline chronologique
    ├── museum/           # Entités archivées
    ├── visions/          # Plans futurs
    └── lessons/          # Leçons apprises
```

---

## 🔧 CLI Commands

| Commande | Description |
|----------|-------------|
| `init` | Initialise la structure nexus |
| `seal` | Crée un nouveau scellé |
| `verify` | Vérifie l'intégrité complète |
| `atlas` | Génère les vues (timeline, museum...) |
| `status` | Affiche l'état du nexus |
| `export` | Exporte pour audit/tribunal |
| `hooks` | Installe les git hooks |
| `backup` | Crée/vérifie une sauvegarde |

### Exemples

```bash
# Initialiser
node scripts/cli.js init

# Créer un seal avec message
node scripts/cli.js seal -m "Phase 3 complete"

# Vérifier un seal spécifique
node scripts/cli.js verify --seal SEAL-20260112-0001

# Générer l'atlas en mode dry-run
node scripts/cli.js atlas --dry-run

# Créer un backup
node scripts/cli.js backup -o /path/to/backups

# Vérifier un backup
node scripts/cli.js backup --verify /path/to/backup

# Installer les git hooks
node scripts/cli.js hooks
```

---

## 📦 Modules

### hash.js — Parsing & Hashing
- Parse YAML/JSON/JSONL/MD
- Canonicalisation RFC 8785
- Hash SHA-256 avec préfixe

### registry.js — IDs & Timestamps
- IDs déterministes: `TYPE-YYYYMMDD-NNNN`
- Timestamps UTC (ISO 8601)
- Locks de concurrence

### seal.js — Création d'Artefacts
- Entities (décisions, modules, bugs...)
- Events (created, updated, promoted...)
- Links (depends_on, supersedes...)
- Manifests et Seals

### merkle.js — Arbre de Merkle
- Domain separation (`omega:leaf`, `omega:node`)
- Path binding (fichier lié à son chemin)
- Root hash déterministe

### verify.js — Vérification
- Intégrité des fichiers
- Chaîne des seals
- Quick verify

### guardian.js — 14 Règles de Validation
1. `SCHEMA_YAML` — Validation JSON Schema
2. `UTC_ONLY` — Timestamps UTC obligatoires
3. `ID_DATE_UTC` — Date ID = Date timestamp
4. `CANONICAL_PATH` — Chemin canonique
5. `NO_COLLISION` — Pas de collision de fichiers
6. `ID_FORMAT` — Format ID strict
7. `LINKS_VALID` — Source/target existent
8. `EVIDENCE_EXISTS` — Preuves existent
9. `CERTIFIED_PROOF` — CERTIFIED requiert preuve
10. `TAGS_REQUIRED` — Tags pour lifecycles terminaux
11. `ABANDONED_HAS_LESSON` — Leçon obligatoire
12. `TOOLING_EXT_ALLOWLIST` — Extensions autorisées
13. `TOOLING_FORBIDDEN_DIRS` — Dossiers interdits
14. `TOOLING_NO_PACKAGES_IMPORT` — Pas d'import packages

### atlas.js — Génération de Vues
- Timeline chronologique
- Museum (archivé/deprecated)
- Visions (draft/proposed)
- Lessons (failed/abandoned)

### automation.js — Automatisation
- Git hooks (pre-commit, post-commit, pre-push)
- File watcher avec auto-seal
- Scheduler périodique
- Backup/restore

### templates.js — Templates Prédéfinis
- 8 entity templates (DECISION, MODULE, BUG...)
- 8 event templates (CREATED, UPDATED...)
- 9 link templates (DEPENDS_ON, SUPERSEDES...)

---

## 🔐 Formats de Données

### Entity (ENT-YYYYMMDD-NNNN.yaml)

```yaml
id: ENT-20260112-0001
type: DECISION
title: "Choix de la base de données"
lifecycle: ACTIVE
created_at: 2026-01-12T10:30:00Z
summary: "PostgreSQL choisi pour les performances"
tags: [database, infrastructure]
```

### Event (EVT-YYYYMMDD-NNNN.yaml)

```yaml
id: EVT-20260112-0001
type: PROMOTED
target: ENT-20260112-0001
timestamp: 2026-01-12T14:00:00Z
actor: francky
from_lifecycle: DRAFT
to_lifecycle: ACTIVE
```

### Link (LINK-YYYYMMDD-NNNN.yaml)

```yaml
id: LINK-20260112-0001
type: DEPENDS_ON
source: ENT-20260112-0002
target: ENT-20260112-0001
strength: HARD
created_at: 2026-01-12T15:00:00Z
```

### Seal (SEAL-YYYYMMDD-NNNN.yaml)

```yaml
id: SEAL-20260112-0001
timestamp: 2026-01-12T16:00:00Z
session_id: SES-20260112-0001
manifest_id: MANIFEST-20260112-0001
root_hash: sha256:abc123...
sealed_by: francky
verification:
  algorithm: merkle-sha256-domain-separated
  spec_version: 2.2.3
```

---

## 🔄 Lifecycle

```
DRAFT → ACTIVE → CERTIFIED
          ↓
    DEPRECATED → ARCHIVED
          ↓
      ABANDONED → (LESSON_FROM)
          ↓
       FAILED → (LESSON_FROM)
```

### Règles
- `DRAFT` — Brouillon, peut être modifié
- `ACTIVE` — En cours, validé
- `CERTIFIED` — Certifié, requiert preuves
- `DEPRECATED` — Remplacé, encore accessible
- `ARCHIVED` — Historique, en lecture seule
- `ABANDONED` — Abandonné, requiert leçon
- `FAILED` — Échoué, requiert leçon

---

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Tests avec détails
npm run test:verbose
```

### Couverture
- Hash: 52 tests
- Registry: 22 tests
- Seal: 30 tests
- Merkle: 21 tests
- Verify: 15 tests
- Guardian: 80 tests
- Atlas: 37 tests
- CLI: 29 tests
- Automation: 24 tests
- Templates: 21 tests

---

## 📊 API Programmatique

```javascript
import {
  // Registry
  getTimestamp,
  getNextId,
  
  // Seal
  createEntity,
  createEvent,
  createLink,
  createSeal,
  
  // Verify
  verifyIntegrity,
  verifySeal,
  
  // Guardian
  validateNexus,
  validateBeforeSeal,
  
  // Atlas
  buildAll,
  verifyAtlas,
  
  // Automation
  installGitHooks,
  createBackup,
  
  // Templates
  getEntityTemplate,
  createFromTemplate
} from '@omega/nexus-tooling';
```

---

## 🔒 Sécurité

### Garanties
- Hashes SHA-256 avec préfixe `sha256:`
- Domain separation pour éviter les collisions
- Path binding pour lier fichier et chemin
- Canonicalisation RFC 8785 pour déterminisme

### Vérification
```bash
# Vérifier l'intégrité
node scripts/cli.js verify

# Vérifier un seal spécifique
node scripts/cli.js verify --seal SEAL-20260112-0001
```

---

## 🔧 Configuration

### package.json

```json
{
  "name": "@omega/nexus-tooling",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "omega-nexus": "./scripts/cli.js"
  }
}
```

### Installation globale

```bash
npm link
omega-nexus --help
```

---

## 📜 Standards

OMEGA NEXUS est conçu selon les standards:

- **NASA-Grade L4** — Engineering critique
- **DO-178C** — Sûreté logicielle (aviation)
- **MIL-STD** — Standards militaires
- **AS9100D** — Qualité aérospatiale

---

## 🏆 Auteurs

- **Francky** — Architecte Suprême
- **Claude** — IA Principal
- **OMEGA Project** — 2026

---

## 📄 Licence

PROPRIETARY — OMEGA Project

---

**OMEGA NEXUS — La vérité au-dessus de la commodité.**
