# ABUSE & MISUSE CATALOG

## 1. Introduction

Ce catalogue définit les patterns d'abus et de mésusage connus, ainsi que les stratégies de détection et d'escalade.

---

## 2. Catalogue des cas

### CASE-001: Prompt Injection

**Description**: Tentative d'injection de commandes via inputs malformés.

| Aspect | Valeur |
|--------|--------|
| Signal | Patterns suspects dans inputs (SQL, script, escape sequences) |
| Détection | Regex patterns + anomaly scoring |
| Event type | misuse_event |
| Severity | HIGH |
| Action | Log + Alert + Block |

**Exemples de patterns**:
- `'; DROP TABLE --`
- `<script>alert()</script>`
- `\x00\x00\x00`

---

### CASE-002: Threshold Gaming

**Description**: Manipulation répétitive pour contourner les seuils.

| Aspect | Valeur |
|--------|--------|
| Signal | Pattern répétitif proche des seuils |
| Détection | Statistical analysis sur historique |
| Event type | misuse_event |
| Severity | MEDIUM |
| Action | Log + Alert + Review |

**Indicateurs**:
- Scores clustered à threshold - ε
- Retry patterns anormaux
- Volume spike sur edge cases

---

### CASE-003: Override Abuse

**Description**: Usage excessif des overrides humains.

| Aspect | Valeur |
|--------|--------|
| Signal | Ratio override/decision > 10% |
| Détection | Counting + trending |
| Event type | misuse_event |
| Severity | MEDIUM |
| Action | Log + Alert + Audit |

---

### CASE-004: Log Tampering Attempt

**Description**: Tentative de modification des logs.

| Aspect | Valeur |
|--------|--------|
| Signal | Hash chain break |
| Détection | Chain verification |
| Event type | misuse_event |
| Severity | CRITICAL |
| Action | Alert + Lock + Forensic |

---

### CASE-005: Replay Attack

**Description**: Rejeu d'événements anciens.

| Aspect | Valeur |
|--------|--------|
| Signal | Duplicate event_id ou timestamp old |
| Détection | ID registry + timestamp validation |
| Event type | misuse_event |
| Severity | HIGH |
| Action | Reject + Log + Alert |

---

## 3. Escalade

Tout cas détecté → `misuse_event` → Alerte humaine → Investigation.

**Règle absolue**: Gouvernance ne punit pas, elle détecte et escalade.

---

## 4. Matrice de sévérité

| Case | Severity | Auto-block | Human required |
|------|----------|------------|----------------|
| CASE-001 | HIGH | Yes | Yes |
| CASE-002 | MEDIUM | No | Yes |
| CASE-003 | MEDIUM | No | Yes |
| CASE-004 | CRITICAL | Yes | Yes |
| CASE-005 | HIGH | Yes | Yes |

---

**Standard**: NASA-Grade L4
**Version**: 1.0.0
