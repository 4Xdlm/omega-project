# ═══════════════════════════════════════════════════════════════════════════════
#
#   💎 OMEGA NEXUS v2.2.3 — NUCLEAR PROOF FINAL
#   Spécification Complète de Référence
#
#   Document ID: OMEGA-NEXUS-SPEC-v2.2.3
#   Date: 2026-01-12
#   Status: 🔒 FINAL — PRÊT POUR IMPLÉMENTATION
#   Auteur: Claude (IA Principal) + ChatGPT + Gemini + Perplexity (Validation)
#   Autorité: Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# TABLE DES MATIÈRES

1. [OBJECTIF](#1-objectif)
2. [LES 7 LOIS IMMORTELLES](#2-les-7-lois-immortelles)
3. [CONVENTIONS DE NOMMAGE](#3-conventions-de-nommage)
4. [ARCHITECTURE PHYSIQUE](#4-architecture-physique)
5. [TYPES ET CHEMINS CANONIQUES](#5-types-et-chemins-canoniques)
6. [SCHEMAS YAML/JSON](#6-schemas-yamljson)
7. [HASHING ET MERKLE TREE](#7-hashing-et-merkle-tree)
8. [REGISTRY ET LOCK PROTOCOL](#8-registry-et-lock-protocol)
9. [GUARDIAN (14 RÈGLES)](#9-guardian-14-règles)
10. [INVARIANTS (24)](#10-invariants-24)
11. [LIFECYCLES](#11-lifecycles)
12. [PROTOCOLE DE SCELLEMENT](#12-protocole-de-scellement)
13. [ATLAS](#13-atlas)
14. [TOOLING](#14-tooling)
15. [HISTORIQUE DES CORRECTIONS](#15-historique-des-corrections)

---

# 1. OBJECTIF

OMEGA NEXUS est un **coffre-fort technique** pour la mémoire totale du projet OMEGA.

**Ce qu'il stocke:**
- Code provenance (manifests + archives jalons)
- Scripts et outillage
- Décisions, invariants, lessons, visions
- Logs, tests, coverage, preuves
- Historique complet

**Ce qu'il NE stocke PAS:**
- Émotions, mood, psychologie
- Code applicatif OMEGA (reste dans `packages/`)

**Principes fondateurs:**
- Append-only (rien ne s'efface)
- Rien ne meurt (lifecycle change via EVENT)
- Traçabilité totale (tout remonte à un invariant testé)
- Vérifiabilité mécanique (Guardian + Merkle)

---

# 2. LES 7 LOIS IMMORTELLES

```yaml
LAW-001:
  name: "APPEND-ONLY UNIVERSEL"
  statement: "Rien ne se réécrit, tout se succède via EVENT"

LAW-002:
  name: "SOURCE = NEXUS"
  statement: "Le Nexus est la seule vérité. Tout le reste est dérivé."

LAW-003:
  name: "RIEN NE MEURT"
  statement: "Aucune entité ne disparaît, elle change de lifecycle"

LAW-004:
  name: "ABANDON = LESSON"
  statement: "Tout ABANDONED/FAILED DOIT créer une LESSON liée"

LAW-005:
  name: "CERTIFIED = PREUVE + TAGS"
  statement: "CERTIFIED nécessite STATE + MANIFEST + tests + tags non vides"

LAW-006:
  name: "IA PROPOSE, HUMAIN SCELLE"
  statement: "Aucune décision vraie sans validation Francky"

LAW-007:
  name: "HASH = RFC 8785"
  statement: "Canonical JSON (JCS RFC 8785) + SHA-256"
```

---

# 3. CONVENTIONS DE NOMMAGE

## 3.1 Format des IDs

```
RÈGLE ABSOLUE: TYPE-YYYYMMDD-NNNN

FORMAT DATE: YYYYMMDD (extraite du timestamp UTC, PAS locale)
FORMAT SEQ: 4 chiffres avec zéros (0001-9999)

Exemples:
  ENT-20260112-0001.yaml
  EVT-20260112-0001.yaml
  SEAL-20260112-0001.yaml
```

## 3.2 Format des Timestamps

```
RÈGLE ABSOLUE: UTC UNIQUEMENT (Z)

FORMAT: YYYY-MM-DDTHH:MM:SSZ
Exemple: "2026-01-12T22:59:00Z"

CHAMP OPTIONNEL (pour humain):
  local_time: "2026-01-12T23:59:00+01:00"
  timezone: "Europe/Paris"

INTERDIT:
  ❌ Timezone autre que Z dans le timestamp principal
  ❌ Date sans heure
  ❌ Formats non ISO 8601
```

## 3.3 Extraction de la Date pour les IDs

```
La date YYYYMMDD dans l'ID est extraite du timestamp UTC:

Exemple:
  timestamp: "2026-01-11T23:30:00Z" → date ID = 20260111
  timestamp: "2026-01-12T00:30:00Z" → date ID = 20260112

Si tu es en France à 01:30 (Paris), UTC = 00:30 → date = 12
Si tu es en France à 23:30 (Paris), UTC = 22:30 → date = 11
```

---

# 4. ARCHITECTURE PHYSIQUE

```
omega-project/
│
├── nexus/                              # LE COFFRE-FORT
│   │
│   ├── genesis/                        # FONDATIONS
│   │   ├── THE_OATH.md                 # Le serment
│   │   ├── LAWS.yaml                   # Les 7 lois
│   │   └── IDENTITY.yaml               # Identité du projet
│   │
│   ├── raw/                            # NON STRUCTURÉ
│   │   ├── sessions/                   # SES-*.jsonl
│   │   ├── logs/
│   │   │   ├── tests/                  # TESTLOG-*.json
│   │   │   └── build/                  # BUILDLOG-*.txt
│   │   ├── reports/
│   │   │   └── coverage/               # COV-*.json
│   │   ├── imports/                    # Zips importés
│   │   ├── archives/                   # Modules deprecated (raw_archives)
│   │   └── telemetry/                  # OPTIONNEL
│   │       └── ctx/                    # CTX-*.yaml
│   │
│   ├── ledger/                         # SOURCE DE VÉRITÉ STRUCTURÉE
│   │   ├── entities/                   # ENT-*.yaml
│   │   ├── events/                     # EVT-*.yaml
│   │   ├── links/                      # LINK-*.yaml
│   │   └── registry/                   # REG-*.yaml + LOCK-*.json
│   │
│   ├── tooling/                        # OUTILLAGE NEXUS ONLY
│   │   ├── scripts/                    # seal.js, verify.js, export.js
│   │   ├── schemas/                    # ENT.schema.yaml, etc.
│   │   ├── templates/                  # Templates d'exports
│   │   ├── guardian.config.yaml        # Config Guardian
│   │   └── package.json                # Dépendances Nexus
│   │
│   ├── proof/                          # PREUVES CRYPTOGRAPHIQUES
│   │   ├── snapshots/
│   │   │   ├── manifests/              # MANIFEST-*.json
│   │   │   └── archives/               # ARCHIVE-*.zip (proof_archives)
│   │   ├── states/                     # STATE-*.yaml
│   │   ├── seals/                      # SEAL-*.yaml
│   │   ├── certificates/               # CERT-*.yaml
│   │   └── completeness/               # COMP-*.yaml
│   │
│   ├── atlas/                          # VUES GÉNÉRÉES (100% dérivé)
│   │   ├── ATLAS-META.json             # Déterministe (hashable)
│   │   ├── ATLAS-RUN.json              # Non déterministe (debug)
│   │   ├── biography/
│   │   │   └── TIMELINE.md
│   │   ├── museum/
│   │   ├── visions/
│   │   └── lessons/
│   │
│   ├── intel/                          # INDEX GÉNÉRÉS
│   │   ├── SEARCH_INDEX.json
│   │   ├── GRAPH_RELATIONS.json
│   │   └── by_type/
│   │
│   └── output/                         # EXPORTS (jetable)
│
└── packages/                           # CODE OMEGA (reste ici)
```

---

# 5. TYPES ET CHEMINS CANONIQUES

## 5.1 Mapping Complet

```javascript
function getCanonicalPath(id) {
  const [type, date, seq] = id.split('-');
  
  const mapping = {
    // LEDGER
    'ENT':      `nexus/ledger/entities/${id}.yaml`,
    'EVT':      `nexus/ledger/events/${id}.yaml`,
    'LINK':     `nexus/ledger/links/${id}.yaml`,
    'REG':      `nexus/ledger/registry/${id}.yaml`,
    
    // RAW
    'SES':      `nexus/raw/sessions/${id}.jsonl`,
    'TESTLOG':  `nexus/raw/logs/tests/${id}.json`,
    'BUILDLOG': `nexus/raw/logs/build/${id}.txt`,
    'COV':      `nexus/raw/reports/coverage/${id}.json`,
    
    // PROOF
    'SEAL':     `nexus/proof/seals/${id}.yaml`,
    'STATE':    `nexus/proof/states/${id}.yaml`,
    'COMP':     `nexus/proof/completeness/${id}.yaml`,
    'CERT':     `nexus/proof/certificates/${id}.yaml`,
    'MANIFEST': `nexus/proof/snapshots/manifests/${id}.json`,
    
    // SPECIAL
    'LOCK':     `nexus/ledger/registry/LOCK-${date}.json`
  };
  
  const path = mapping[type];
  if (!path) {
    throw new Error(`Unknown type: ${type}. No canonical path defined.`);
  }
  
  return path;
}
```

## 5.2 Extensions par Type

| Type | Extension | Format |
|------|-----------|--------|
| ENT, EVT, LINK, REG, SEAL, STATE, COMP, CERT | .yaml | YAML |
| TESTLOG, COV, MANIFEST, LOCK | .json | JSON |
| SES | .jsonl | JSON Lines |
| BUILDLOG | .txt | Text |

---

# 6. SCHEMAS YAML/JSON

## 6.1 ENT (Entity)

```yaml
# nexus/ledger/entities/ENT-YYYYMMDD-NNNN.yaml

id: "ENT-YYYYMMDD-NNNN"
type: "DECISION"                        # Voir TYPES ci-dessous
lifecycle: "PROPOSED"                   # Voir LIFECYCLES ci-dessous
version: 1

# TIMESTAMPS (UTC ONLY)
created: "YYYY-MM-DDTHH:MM:SSZ"
created_by: "Francky"
updated: "YYYY-MM-DDTHH:MM:SSZ"

# OPTIONNEL
local_time: "YYYY-MM-DDTHH:MM:SS+01:00"
timezone: "Europe/Paris"

# IDENTIFICATION
title: "Titre court et explicite"       # Max 100 chars
summary: "Résumé en une phrase"         # Max 200 chars

# CONTENU (structure dépend du type)
content:
  context: |
    Description du problème ou contexte.
  decision: |
    Ce qui a été décidé.
  consequences:
    positive: []
    negative: []

# PREUVES (OBLIGATOIRE si CERTIFIED)
evidence:
  sessions: []                          # Refs vers SES-*
  seal: null                            # Ref vers SEAL-*
  state: null                           # Ref vers STATE-*
  manifest: null                        # Ref vers MANIFEST-*
  tests:
    log: null                           # Ref vers TESTLOG-*
    coverage: null                      # Ref vers COV-*

# RELATIONS
links: []                               # Refs vers LINK-*

# INTÉGRITÉ (RFC 8785)
hash_canonical: "sha256:..."

# MÉTADONNÉES
# PROPOSED/VISION/IDEA: [] autorisé
# CERTIFIED/ABANDONED/FAILED/DEPRECATED/PAUSED: NON VIDE OBLIGATOIRE
tags: []

# ═══════════════════════════════════════════════════════════════════════════════
# TYPES: DECISION | INVARIANT | CONCEPT | PATTERN | LEXICON | 
#        MODULE | SNIPPET | IDEA | EXPERIMENT | LESSON | FUTURE
#
# LIFECYCLES: VISION | PROPOSED | PLANNED | ACTIVE | CERTIFIED | PAUSED | 
#             DEPRECATED | ABANDONED | FAILED | MYTH
# ═══════════════════════════════════════════════════════════════════════════════
```

## 6.2 EVT (Event)

```yaml
# nexus/ledger/events/EVT-YYYYMMDD-NNNN.yaml

id: "EVT-YYYYMMDD-NNNN"
timestamp: "YYYY-MM-DDTHH:MM:SSZ"
type: "CREATED"                         # Voir TYPES ci-dessous

entity: "ENT-YYYYMMDD-NNNN"

# SEULEMENT si type = LIFECYCLE_CHANGE
# from: "PROPOSED"
# to: "CERTIFIED"

actor: "Francky"
reason: "Raison du changement"

anchors:
  session: "SES-YYYYMMDD-NNNN"
  seal: null

hash_canonical: "sha256:..."

# ═══════════════════════════════════════════════════════════════════════════════
# TYPES D'ÉVÉNEMENTS:
#   CREATED           → entity créée (PAS de from/to)
#   LIFECYCLE_CHANGE  → changement lifecycle (from/to OBLIGATOIRES)
#   MODIFIED          → contenu modifié (PAS de from/to)
#   LINKED            → nouveau lien créé (PAS de from/to)
#   SUPERSEDED        → remplacé par autre entité (PAS de from/to)
# ═══════════════════════════════════════════════════════════════════════════════
```

## 6.3 LINK (Synapse)

```yaml
# nexus/ledger/links/LINK-YYYYMMDD-NNNN.yaml

id: "LINK-YYYYMMDD-NNNN"
created: "YYYY-MM-DDTHH:MM:SSZ"

type: "IMPLEMENTS"                      # Voir TYPES ci-dessous
source: "ENT-YYYYMMDD-NNNN"
target: "ENT-YYYYMMDD-NNNN"
bidirectional: false

reason: "Pourquoi ce lien existe"
actor: "Francky"

anchors:
  session: "SES-YYYYMMDD-NNNN"

hash_canonical: "sha256:..."

# ═══════════════════════════════════════════════════════════════════════════════
# TYPES DE LIENS:
#   IMPLEMENTS    → source implémente target
#   DEPENDS_ON    → source dépend de target
#   TESTED_BY     → source testé par target
#   SUPERSEDES    → source remplace target
#   REFERENCES    → source référence target
#   CONTRADICTS   → source contredit target
#   EVOLVED_FROM  → source a évolué depuis target
# ═══════════════════════════════════════════════════════════════════════════════
```

## 6.4 SEAL (Sceau)

```yaml
# nexus/proof/seals/SEAL-YYYYMMDD-NNNN.yaml

id: "SEAL-YYYYMMDD-NNNN"
timestamp: "YYYY-MM-DDTHH:MM:SSZ"
sealed_by: "Francky"

session: "SES-YYYYMMDD-NNNN"

summary:
  title: "Titre"
  objective: "Objectif"
  result: "Résultat"

stats:
  entities_created: 0
  entities_modified: 0
  events_generated: 0
  links_created: 0
  files_in_scope: 0
  
artifacts:
  entities: []
  events: []
  links: []
  
evidence:
  manifest: "MANIFEST-YYYYMMDD-NNNN"
  state: null
  completeness: "COMP-YYYYMMDD-NNNN"
  tests:
    log: null
    coverage: null

git:
  commit: null
  branch: null
  tag: null
  status: null

chain:
  previous_seal: null                   # ou "SEAL-YYYYMMDD-NNNN"
  root_hash: "sha256:..."
  root_hash_algorithm: "sha256-domain-separated"
  merkle_config:
    leaf_prefix: "omega:leaf\0"
    node_prefix: "omega:node\0"
    path_binding: true
```

## 6.5 MANIFEST

```json
{
  "id": "MANIFEST-YYYYMMDD-NNNN",
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "version": "2.2.3",
  
  "files_in_scope": [
    "nexus/genesis/THE_OATH.md",
    "nexus/ledger/entities/ENT-20260111-0001.yaml"
  ],
  
  "file_hashes": {
    "nexus/genesis/THE_OATH.md": "sha256:abc123...",
    "nexus/ledger/entities/ENT-20260111-0001.yaml": "sha256:def456..."
  },
  
  "exclusions": [
    "nexus/proof/seals/SEAL-YYYYMMDD-NNNN.yaml",
    "nexus/proof/snapshots/manifests/MANIFEST-YYYYMMDD-NNNN.json",
    "nexus/atlas/**",
    "nexus/output/**",
    "nexus/ledger/registry/LOCK-*.json"
  ],
  
  "merkle": {
    "algorithm": "sha256-domain-separated",
    "leaf_prefix": "omega:leaf\\0",
    "node_prefix": "omega:node\\0",
    "path_binding": true
  },
  
  "root_hash": "sha256:...",
  
  "git": {
    "commit": "abc123...",
    "branch": "master",
    "tag": "v3.62.0",
    "status": "clean"
  },
  
  "env": {
    "node": "v20.10.0",
    "os": "win32",
    "arch": "x64"
  }
}
```

## 6.6 REG (Registry)

```yaml
# nexus/ledger/registry/REG-YYYYMMDD.yaml

date: "YYYYMMDD"
updated: "YYYY-MM-DDTHH:MM:SSZ"

counters:
  ENT: 0
  EVT: 0
  LINK: 0
  SEAL: 0
  SES: 0
  STATE: 0
  COMP: 0
  MANIFEST: 0
  TESTLOG: 0
  BUILDLOG: 0
  COV: 0
  CERT: 0
```

## 6.7 LOCK

```json
{
  "timestamp": "2026-01-11T23:00:00Z",
  "pid": 12345,
  "hostname": "DESKTOP-OMEGA",
  "user": "elric",
  "purpose": "seal"
}
```

---

# 7. HASHING ET MERKLE TREE

## 7.1 Hashing des Fichiers

```javascript
function computeFileHash(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const ext = path.extname(filepath).toLowerCase();
  
  let obj;
  
  // PARSE SELON EXTENSION
  if (ext === '.yaml' || ext === '.yml') {
    obj = yaml.parse(content);
  } else if (ext === '.json') {
    obj = JSON.parse(content);
  } else if (ext === '.jsonl') {
    obj = content.trim().split('\n').map(line => JSON.parse(line));
  } else if (ext === '.md' || ext === '.txt') {
    // Texte brut = hash direct
    return 'sha256:' + crypto.createHash('sha256')
      .update(content, 'utf8')
      .digest('hex');
  } else {
    throw new Error(`Unsupported extension: ${ext}`);
  }
  
  // CANONICALISATION RFC 8785
  const canonical = canonicalize(obj);
  
  // HASH
  return 'sha256:' + crypto.createHash('sha256')
    .update(canonical, 'utf8')
    .digest('hex');
}
```

## 7.2 Merkle Tree avec Domain Separation

```javascript
// Domain separation prefixes
const LEAF_PREFIX = Buffer.from('omega:leaf\0', 'utf8');
const NODE_PREFIX = Buffer.from('omega:node\0', 'utf8');

function computeLeafHash(filepath, fileHash) {
  const fileHashBytes = Buffer.from(fileHash.replace('sha256:', ''), 'hex');
  const pathBytes = Buffer.from(filepath, 'utf8');
  
  // leaf = sha256( LEAF_PREFIX || path || \0 || file_hash_bytes )
  const input = Buffer.concat([
    LEAF_PREFIX,
    pathBytes,
    Buffer.from('\0', 'utf8'),
    fileHashBytes
  ]);
  
  return crypto.createHash('sha256').update(input).digest();
}

function computeNodeHash(leftBytes, rightBytes) {
  // node = sha256( NODE_PREFIX || left_bytes || right_bytes )
  const input = Buffer.concat([
    NODE_PREFIX,
    leftBytes,
    rightBytes
  ]);
  
  return crypto.createHash('sha256').update(input).digest();
}

function buildMerkleRoot(files) {
  // files = [{ path, hash }, ...] triés lexicographiquement
  
  if (files.length === 0) {
    return crypto.createHash('sha256').update(LEAF_PREFIX).digest();
  }
  
  let hashes = files.map(f => computeLeafHash(f.path, f.hash));
  
  while (hashes.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      nextLevel.push(computeNodeHash(left, right));
    }
    hashes = nextLevel;
  }
  
  return 'sha256:' + hashes[0].toString('hex');
}
```

## 7.3 Scope du Root Hash

**INCLUS dans files_in_scope:**
- `nexus/genesis/**/*.yaml` et `**/*.md`
- `nexus/ledger/**/*.yaml`
- `nexus/proof/states/**/*.yaml`
- `nexus/proof/completeness/**/*.yaml`
- `nexus/proof/certificates/**/*.yaml`
- `nexus/proof/seals/**/*.yaml` SAUF le SEAL courant

**EXCLUS de files_in_scope:**
- Le SEAL en cours de création
- Le MANIFEST lui-même
- `nexus/atlas/**`
- `nexus/output/**`
- `nexus/ledger/registry/LOCK-*.json`

---

# 8. REGISTRY ET LOCK PROTOCOL

## 8.1 Lock Protocol

```javascript
function acquireLock(date) {
  const lockPath = `nexus/ledger/registry/LOCK-${date}.json`;
  const lockData = {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    hostname: os.hostname(),
    user: os.userInfo().username,
    purpose: 'seal'
  };
  
  for (let i = 0; i < 10; i++) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify(lockData), { flag: 'wx' });
      return true;
    } catch {
      // Check if stale
      const existing = JSON.parse(fs.readFileSync(lockPath));
      const age = Date.now() - new Date(existing.timestamp).getTime();
      if (age > 60000) {  // 60 secondes
        fs.unlinkSync(lockPath);
        continue;
      }
      await sleep(100);
    }
  }
  throw new Error('Lock acquisition failed after 10 retries');
}

function releaseLock(date) {
  fs.unlinkSync(`nexus/ledger/registry/LOCK-${date}.json`);
}
```

## 8.2 Stale Check

Un lock est **STALE** si:
- `timestamp` > 60 secondes dans le passé

Un lock **N'EST PAS STALE** si:
- `timestamp` < 60 secondes (même si le PID n'existe plus)

---

# 9. GUARDIAN (14 RÈGLES)

```yaml
GUARDIAN_RULES:

  # STRUCTUREL
  1_SCHEMA:
    rule: "Tout fichier YAML/JSON doit respecter son schema"
    action: "REJECT"
    
  2_IDS_UNIQUE:
    rule: "ID unique = chemin canonique n'existe pas"
    action: "REJECT"
    
  3_LINKS_VALID:
    rule: "LINK.source et LINK.target existent"
    action: "REJECT"
    
  4_CANONICAL_PATH:
    rule: "Tout ID a un type connu avec chemin canonique défini"
    action: "REJECT"
    types: ["ENT","EVT","LINK","REG","SES","TESTLOG","BUILDLOG","COV",
            "SEAL","STATE","COMP","CERT","MANIFEST"]

  # LIFECYCLE
  5_CERTIFIED_PROOF:
    rule: "CERTIFIED nécessite STATE + MANIFEST + tests"
    action: "REJECT"
    
  6_ABANDONED_LESSON:
    rule: "ABANDONED/FAILED nécessite LESSON liée"
    action: "REJECT"

  # INTÉGRITÉ
  7_FILE_EXISTS:
    rule: "Toute ref fichier pointe vers fichier existant"
    action: "REJECT"
    
  8_ATLAS_META:
    rule: "ATLAS-META.source_root_hash == ledger root_hash"
    action: "REJECT si mismatch"

  # TIMESTAMP
  9_UTC_ONLY:
    rule: "Timestamps = UTC (Z)"
    action: "REJECT"

  # SCOPE
  10_TOOLING_STRICT:
    rule: "tooling/ en mode STRICT = REJECT (pas WARN)"
    action: "REJECT"

  # ID DATE
  11_ID_DATE_UTC:
    rule: "Date dans ID = date UTC du timestamp"
    action: "REJECT"

  # TAGS
  12_TAGS_REQUIRED:
    rule: "CERTIFIED/ABANDONED/FAILED/DEPRECATED/PAUSED nécessite tags non vides"
    action: "REJECT"

  # ROOT HASH
  13_ROOT_HASH:
    rule: "root_hash = Merkle avec domain separation et path binding"
    action: "REJECT si non reproductible"
    
  14_MANIFEST_SCOPE:
    rule: "MANIFEST.files_in_scope exclut SEAL courant et MANIFEST lui-même"
    action: "REJECT si auto-référence"
```

---

# 10. INVARIANTS (24)

```yaml
# FONDAMENTAUX
INV-NEXUS-001: "Aucune entité supprimée"
INV-NEXUS-002: "Changement lifecycle = EVT LIFECYCLE_CHANGE"
INV-NEXUS-003: "ABANDONED/FAILED = LESSON"
INV-NEXUS-004: "CERTIFIED = preuves existantes"
INV-NEXUS-005: "Atlas = 100% généré"
INV-NEXUS-006: "Hash = RFC 8785 + SHA-256"
INV-NEXUS-007: "Code OMEGA dans packages/, pas nexus/"

# ARCHIVES
INV-NEXUS-008: "proof_archives = GOLD/tribunal only"
INV-NEXUS-009: "raw_archives = modules deprecated"

# OPTIONNEL
INV-NEXUS-010: "CTX/telemetry = optionnel"

# STRUCTUREL
INV-NEXUS-011: "EVT dans ledger/events/"
INV-NEXUS-012: "raw/ = non structuré"

# TIMESTAMP
INV-NEXUS-013: "Timestamps = UTC (Z)"
INV-NEXUS-014: "local_time = optionnel"

# REGISTRY
INV-NEXUS-015: "REG = source unique SEQ"

# v2.2.1
INV-NEXUS-016: "Date ID = date UTC timestamp"
INV-NEXUS-017: "ID = chemin canonique unique"
INV-NEXUS-018: "Tags requis si CERTIFIED/ABANDONED/FAILED"

# v2.2.2
INV-NEXUS-019: "Tags requis si DEPRECATED/PAUSED"
INV-NEXUS-020: "root_hash = Merkle des fichiers sous contrôle"
INV-NEXUS-021: "SES créé au début du seal"

# v2.2.3
INV-NEXUS-022: "MANIFEST.files_in_scope = source de vérité pour Merkle"
INV-NEXUS-023: "Parse YAML vs JSON selon extension avant RFC8785"
INV-NEXUS-024: "ATLAS-META déterministe (sans timestamps)"
```

---

# 11. LIFECYCLES

## 11.1 États Possibles

| Lifecycle | Description | Tags requis |
|-----------|-------------|-------------|
| VISION | Idée lointaine | Non |
| PROPOSED | Proposition en attente de validation | Non |
| PLANNED | Validé, planifié pour implémentation | Recommandé |
| ACTIVE | En cours de développement | Recommandé |
| CERTIFIED | Terminé avec preuves | **OUI** |
| PAUSED | Suspendu temporairement | **OUI** |
| DEPRECATED | Obsolète mais conservé | **OUI** |
| ABANDONED | Abandonné définitivement | **OUI** |
| FAILED | Échec constaté | **OUI** |
| MYTH | Idée légendaire jamais réalisée | Non |

## 11.2 Transitions

```
VISION → PROPOSED → PLANNED → ACTIVE → CERTIFIED
                                    ↘ PAUSED
                                    ↘ DEPRECATED
                                    ↘ ABANDONED → (LESSON obligatoire)
                                    ↘ FAILED → (LESSON obligatoire)
```

---

# 12. PROTOCOLE DE SCELLEMENT

## 12.1 Flux Complet

```
1. Obtenir timestamp UTC
2. Extraire date YYYYMMDD du timestamp UTC
3. Acquérir LOCK-YYYYMMDD.json (timestamp+pid+host)
4. Lire/créer REG-YYYYMMDD.yaml
5. Créer SES-YYYYMMDD-NNNN.jsonl (incrémenter SES)
6. Pour chaque élément identifié:
   - Créer ENT avec anchors.session = SES
   - Créer EVT avec anchors.session = SES
   - Créer LINK si nécessaire
7. Construire MANIFEST.files_in_scope (exclure SEAL/MANIFEST courants)
8. Calculer file_hashes (parse selon extension + RFC8785)
9. Calculer root_hash (Merkle avec domain separation)
10. Créer MANIFEST-YYYYMMDD-NNNN.json
11. Créer COMP-YYYYMMDD-NNNN.yaml
12. Créer SEAL-YYYYMMDD-NNNN.yaml
13. Libérer LOCK
14. Commit Git
```

## 12.2 Prompt de Scellement

Voir fichier `OMEGA_SEAL_PROMPT.md` dans le package.

---

# 13. ATLAS

## 13.1 Fichiers Déterministes vs Non-Déterministes

**ATLAS-META.json** (déterministe, hashable):
```json
{
  "version": "2.2.3",
  "tool_version": "omega-nexus@1.0.0",
  "source_root_hash": "sha256:...",
  "files_generated": ["biography/TIMELINE.md", ...],
  "counts": {
    "entities_processed": 42,
    "events_processed": 87
  }
}
```

**ATLAS-RUN.json** (non déterministe, debug):
```json
{
  "generated_at": "2026-01-11T23:30:00Z",
  "hostname": "DESKTOP-OMEGA",
  "duration_ms": 1234
}
```

---

# 14. TOOLING

## 14.1 Configuration Guardian

```yaml
# nexus/tooling/guardian.config.yaml

mode: "STRICT"  # STRICT | PERMISSIVE

allowlist:
  extensions:
    - ".ps1"
    - ".sh"
    - ".js"
    - ".ts"
    - ".mjs"
    - ".yaml"
    - ".json"
    - ".md"
  
  dependencies:
    - "canonicalize@2.0.0"
    - "yaml@2.x"
    - "glob@10.x"
    - "commander@11.x"
    - "chalk@5.x"
    - "ajv@8.x"

forbidden:
  directories:
    - "src"
    - "packages"
    - "components"
    - "ui"
    - "app"
    - "dist"
    - "build"
  
  imports:
    - "packages/"
    - "../packages"
    - "../../packages"
```

## 14.2 Mode STRICT

En mode STRICT (défaut pour ULTIMATE/PLATINUM):
- Extensions hors allowlist → **REJECT**
- Répertoires interdits → **REJECT**
- Imports packages/ → **REJECT**
- Dépendances hors allowlist → **REJECT**

---

# 15. HISTORIQUE DES CORRECTIONS

| Version | Corrections |
|---------|-------------|
| v2.1.0 | Spec initiale |
| v2.1.1 | EVT dans ledger/, evidence dirs, tooling scope, ID consistency |
| v2.1.2 | Date YYYYMMDD compact, templates complets |
| v2.2.0 | UTC, PROPOSED genesis, archives paths, LINK template, RFC8785, EVT sans from/to, prompt, registry, file exists, extensions, tooling |
| v2.2.1 | Date ID UTC, unicité globale, tooling allowlist, lock, RFC8785 versionné, tags CERTIFIED |
| v2.2.2 | root_hash Merkle, SES au début, lock timestamp, ATLAS-META, STRICT mode, canonical paths complets, tags DEPRECATED/PAUSED |
| v2.2.3 | MANIFEST.files_in_scope, parse selon extension, Merkle domain separation, ATLAS-META/RUN séparés, STRICT=REJECT, tous types mappés |

**TOTAL: 29 corrections**

---

# FIN DU DOCUMENT

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   💎 OMEGA NEXUS v2.2.3 — NUCLEAR PROOF FINAL                                 ║
║                                                                               ║
║   29 CORRECTIONS — 14 RÈGLES GUARDIAN — 24 INVARIANTS — 7 LOIS               ║
║                                                                               ║
║   CONÇU POUR ÊTRE VÉRIFIABLE MÉCANIQUEMENT                                    ║
║   ZÉRO AMBIGUÏTÉ D'IMPLÉMENTATION                                             ║
║                                                                               ║
║   STATUS: PRÊT POUR PHASE 81 — IMPLÉMENTATION                                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
