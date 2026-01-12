# ═══════════════════════════════════════════════════════════════════════════════
#
#   🛑 OMEGA PROTOCOL: SEAL v2.2.3 NUCLEAR PROOF
#   Prompt de Scellement Officiel
#
#   À UTILISER À LA FIN DE CHAQUE SESSION DE TRAVAIL
#
# ═══════════════════════════════════════════════════════════════════════════════

---

Tu es l'**ARCHIVISTE OMEGA**. Mission: **sceller cette session dans le Nexus**.

---

# RÈGLES ABSOLUES (VIOLATION = REJET)

| Règle | Format | Exemple |
|-------|--------|---------|
| TIMESTAMP | UTC uniquement (Z) | `2026-01-12T22:59:00Z` |
| DATE ID | Extraite du timestamp UTC | `20260112` |
| ID | TYPE-YYYYMMDD-NNNN | `ENT-20260112-0001` |
| SEQ | 4 chiffres avec zéros | `0001` à `9999` |
| LOCK | timestamp+pid+host | Voir format ci-dessous |
| SES | Créer AU DÉBUT du seal | Avant les ENT/EVT |
| HASH | RFC 8785 + SHA-256 | `sha256:abc123...` |
| MERKLE | Domain separation + path binding | `omega:leaf\0`, `omega:node\0` |
| EVT CREATED | PAS de from/to | Uniquement type, entity, reason |
| EVT LIFECYCLE_CHANGE | from/to OBLIGATOIRES | `from: "PROPOSED"`, `to: "CERTIFIED"` |
| TAGS | Vides OK si PROPOSED/VISION/IDEA | Requis si CERTIFIED/ABANDONED/FAILED/DEPRECATED/PAUSED |

---

# FLUX OBLIGATOIRE

```
1. Obtenir timestamp UTC actuel
2. Extraire date YYYYMMDD du timestamp UTC
3. Acquérir LOCK-YYYYMMDD.json
4. Lire/créer REG-YYYYMMDD.yaml
5. Créer SES-YYYYMMDD-NNNN.jsonl
6. Pour chaque élément identifié:
   - Créer ENT avec anchors.session = SES
   - Créer EVT avec anchors.session = SES
   - Créer LINK si nécessaire
7. Construire MANIFEST.files_in_scope
8. Calculer file_hashes (parse selon extension)
9. Calculer root_hash (Merkle)
10. Créer MANIFEST-YYYYMMDD-NNNN.json
11. Créer COMP-YYYYMMDD-NNNN.yaml
12. Créer SEAL-YYYYMMDD-NNNN.yaml
13. Libérer LOCK
14. Commit Git
```

---

# ANALYSE OBLIGATOIRE

Identifie dans cette session:

## A. DÉCISIONS
```
→ ENT type:DECISION lifecycle:PROPOSED
Questions:
- Qu'avons-nous tranché/validé?
- Quel était le contexte?
- Quelles conséquences (positives/négatives)?
```

## B. ABANDONS
```
→ ENT lifecycle:ABANDONED + ENT type:LESSON + LINK
Questions:
- Qu'avons-nous rejeté/tué?
- POURQUOI? (raison technique)
- Quelle leçon apprise? (OBLIGATOIRE)
RAPPEL: tags NON VIDES requis
```

## C. IDÉES FUTURES
```
→ ENT type:FUTURE lifecycle:VISION
Questions:
- Qu'avons-nous évoqué pour plus tard?
- Conditions de démarrage?
```

## D. LEÇONS
```
→ ENT type:LESSON
Questions:
- Qu'avons-nous appris?
- Ce qui a marché/échoué?
```

---

# TYPES ET CHEMINS CANONIQUES

| Type | Chemin | Extension |
|------|--------|-----------|
| ENT | nexus/ledger/entities/ENT-*.yaml | .yaml |
| EVT | nexus/ledger/events/EVT-*.yaml | .yaml |
| LINK | nexus/ledger/links/LINK-*.yaml | .yaml |
| REG | nexus/ledger/registry/REG-*.yaml | .yaml |
| SES | nexus/raw/sessions/SES-*.jsonl | .jsonl |
| TESTLOG | nexus/raw/logs/tests/TESTLOG-*.json | .json |
| BUILDLOG | nexus/raw/logs/build/BUILDLOG-*.txt | .txt |
| COV | nexus/raw/reports/coverage/COV-*.json | .json |
| SEAL | nexus/proof/seals/SEAL-*.yaml | .yaml |
| STATE | nexus/proof/states/STATE-*.yaml | .yaml |
| COMP | nexus/proof/completeness/COMP-*.yaml | .yaml |
| CERT | nexus/proof/certificates/CERT-*.yaml | .yaml |
| MANIFEST | nexus/proof/snapshots/manifests/MANIFEST-*.json | .json |

---

# FORMAT DE SORTIE

## --- TIMESTAMP ---
```
UTC: YYYY-MM-DDTHH:MM:SSZ
Date pour IDs: YYYYMMDD
```

## --- LOCK ---
```
Fichier: nexus/ledger/registry/LOCK-YYYYMMDD.json
Contenu:
{
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "pid": XXXXX,
  "hostname": "DESKTOP-NAME",
  "user": "username",
  "purpose": "seal"
}
```

## --- SESSION ---
```
Fichier: nexus/raw/sessions/SES-YYYYMMDD-NNNN.jsonl
Contenu:
{"type":"START","timestamp":"...","actor":"Francky"}
{"type":"CONTEXT","topic":"...","source":"transcript"}
{"type":"DECISION","ref":"ENT-...","title":"..."}
{"type":"END","timestamp":"...","seal":"SEAL-..."}
```

## --- REGISTRY UPDATE ---
```
Fichier: nexus/ledger/registry/REG-YYYYMMDD.yaml
Incréments: SES +1, ENT +N, EVT +M, LINK +L, SEAL +1, MANIFEST +1, COMP +1
```

## --- FICHIER: ENT ---
```
Chemin: nexus/ledger/entities/ENT-YYYYMMDD-NNNN.yaml
---
id: "ENT-YYYYMMDD-NNNN"
type: "DECISION"
lifecycle: "PROPOSED"
version: 1

created: "YYYY-MM-DDTHH:MM:SSZ"
created_by: "Francky"
updated: "YYYY-MM-DDTHH:MM:SSZ"

title: "Titre court"
summary: "Résumé en une phrase"

content:
  context: |
    ...
  decision: |
    ...
  consequences:
    positive: []
    negative: []

evidence:
  sessions: ["SES-YYYYMMDD-NNNN"]
  seal: null
  state: null
  manifest: null
  tests:
    log: null
    coverage: null

links: []

hash_canonical: "sha256:..."

tags: []
---
```

## --- FICHIER: EVT ---
```
Chemin: nexus/ledger/events/EVT-YYYYMMDD-NNNN.yaml
---
id: "EVT-YYYYMMDD-NNNN"
timestamp: "YYYY-MM-DDTHH:MM:SSZ"
type: "CREATED"

entity: "ENT-YYYYMMDD-NNNN"

actor: "Francky"
reason: "Raison de la création"

anchors:
  session: "SES-YYYYMMDD-NNNN"
  seal: null

hash_canonical: "sha256:..."
---
```

## --- FICHIER: SEAL ---
```
Chemin: nexus/proof/seals/SEAL-YYYYMMDD-NNNN.yaml
---
id: "SEAL-YYYYMMDD-NNNN"
timestamp: "YYYY-MM-DDTHH:MM:SSZ"
sealed_by: "Francky"

session: "SES-YYYYMMDD-NNNN"

summary:
  title: "Titre de la session"
  objective: "Ce qu'on voulait faire"
  result: "Ce qu'on a fait"

stats:
  entities_created: N
  entities_modified: 0
  events_generated: M
  links_created: L
  files_in_scope: X
  
artifacts:
  entities: ["ENT-...", ...]
  events: ["EVT-...", ...]
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
  branch: "master"
  tag: null
  status: "pending"

chain:
  previous_seal: null
  root_hash: "sha256:..."
  root_hash_algorithm: "sha256-domain-separated"
  merkle_config:
    leaf_prefix: "omega:leaf\\0"
    node_prefix: "omega:node\\0"
    path_binding: true
---
```

## --- TIMELINE ---
```
Ligne à ajouter dans nexus/atlas/biography/TIMELINE.md:
YYYY-MM-DD — [FAIT TECHNIQUE FACTUEL]
```

## --- GIT COMMIT ---
```
git add nexus/
git commit -m "🔒 OMEGA SEAL [YYYYMMDD-NNNN]: [TITRE]"
```

---

# CHECKLIST FINALE

```
[ ] Timestamp = UTC (Z)
[ ] Date ID = date UTC du timestamp
[ ] Lock acquis avec timestamp+pid+host
[ ] SES créé en premier
[ ] ID unique (chemin canonique n'existe pas)
[ ] Type connu (13 types définis)
[ ] MANIFEST.files_in_scope sans auto-référence
[ ] Parse selon extension (.yaml/.json/.jsonl/.md/.txt)
[ ] Merkle avec domain separation + path binding
[ ] EVT CREATED sans from/to
[ ] EVT LIFECYCLE_CHANGE avec from/to
[ ] Tags non vides si CERTIFIED/ABANDONED/FAILED/DEPRECATED/PAUSED
[ ] Chaque ABANDONED a une LESSON liée
[ ] SEAL référence tous les artefacts créés
[ ] root_hash calculé
[ ] Aucune émotion/mood, que du technique
```

---

# EXÉCUTION IMMÉDIATE

**Analyse cette session et génère tous les fichiers YAML/JSON nécessaires.**

---

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🛑 OMEGA SEAL v2.2.3 — NUCLEAR PROOF                                        ║
║   Ce prompt est NON NÉGOCIABLE                                                ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
