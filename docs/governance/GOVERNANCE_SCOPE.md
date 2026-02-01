# GOVERNANCE SCOPE

## 1. Frontières exactes

### Ce que Gouvernance PEUT faire

| Action | Description | Contrainte |
|--------|-------------|------------|
| Observer | Lire états BUILD, logs, événements | Read-only |
| Détecter | Identifier dérives, anomalies, régressions | Pas de correction auto |
| Alerter | Notifier humain d'un incident | Obligatoire si critique |
| Logger | Enregistrer événements (append-only) | Hash SHA256 obligatoire |
| Indexer | Maintenir registres et manifests | Déterministe |

### Ce que Gouvernance NE PEUT PAS faire

| Interdit | Raison |
|----------|--------|
| Modifier BUILD | BUILD = source de vérité immuable |
| Recalculer ORACLE | ORACLE = décision BUILD uniquement |
| Auto-corriger | Correction = décision humaine |
| Bypass humain | Toute décision critique = humain |
| Supprimer logs | Logs = append-only |

---

## 2. Matrice d'autorité

| Action | BUILD | GOUVERNANCE | HUMAIN |
|--------|-------|-------------|--------|
| Créer vérité | ✅ | ❌ | ❌ |
| Observer | ❌ | ✅ | ✅ |
| Détecter drift | ❌ | ✅ | ✅ |
| Corriger | ❌ | ❌ | ✅ |
| Décider | ❌ | ❌ | ✅ |
| Logger | ❌ | ✅ | ✅ |
| Rollback | ❌ | ❌ | ✅ |
| Override | ❌ | ❌ | ✅ |

---

## 3. Interfaces formelles

### Input

| Champ | Type | Source |
|-------|------|--------|
| RUN_ID | string | EVIDENCE/RUN_ID.txt |
| phase_tag | string | Git tag SEALED |
| manifest_sha256 | string | *_MANIFEST.sha256 |
| inputs_hash | string | SHA256(inputs) |
| outputs_hash | string | SHA256(outputs) |

### Output

| Type | Format | Destination |
|------|--------|-------------|
| GOVERNANCE_EVENT | JSON | logs/governance/*.ndjson |
| DRIFT_REPORT | JSON | reports/drift/*.json |
| INCIDENT | Markdown | incidents/*.md |

---

## 4. Délimitation BUILD / GOUVERNANCE

```
┌─────────────────────────────────────────────────────────────┐
│                         BUILD                                │
│  ┌─────────┐  ┌──────────────────┐  ┌─────────────────────┐ │
│  │ ORACLE  │  │ DECISION_ENGINE  │  │ WAIVER_CHECK        │ │
│  │ (v1.1)  │  │ (v1.1)           │  │ (v1.1)              │ │
│  └─────────┘  └──────────────────┘  └─────────────────────┘ │
│                         ↓ READ-ONLY                          │
├─────────────────────────────────────────────────────────────┤
│                      GOUVERNANCE                             │
│  ┌─────────┐  ┌──────────────────┐  ┌─────────────────────┐ │
│  │ OBSERVE │  │ DETECT           │  │ ALERT               │ │
│  │         │  │                  │  │                     │ │
│  └─────────┘  └──────────────────┘  └─────────────────────┘ │
│                         ↓ ESCALADE                           │
├─────────────────────────────────────────────────────────────┤
│                        HUMAIN                                │
│  ┌─────────┐  ┌──────────────────┐  ┌─────────────────────┐ │
│  │ DECIDE  │  │ CORRECT          │  │ OVERRIDE            │ │
│  │         │  │                  │  │                     │ │
│  └─────────┘  └──────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Règles de scope

### GOV-SCOPE-001: Isolation stricte
Gouvernance et BUILD sont des domaines isolés. Aucun code de gouvernance ne peut importer ou modifier du code BUILD.

### GOV-SCOPE-002: Read-only access
Toute lecture BUILD par gouvernance passe par des interfaces read-only hashées.

### GOV-SCOPE-003: Event-driven
Gouvernance réagit aux événements, ne les initie jamais.

### GOV-SCOPE-004: Human-in-the-loop
Toute décision de correction/rollback/override nécessite validation humaine.

---

**Standard**: NASA-Grade L4
**Version**: 1.0.0
