# DRIFT DETECTION MODEL

## 1. Définition

**Drift** = écart observable entre l'état attendu (baseline SEALED) et l'état observé (runtime).

---

## 2. Types de drift

### 2.1 Drift Structurel

| Aspect | Description | Détection |
|--------|-------------|-----------|
| Schema change | Format JSON modifié | JSON Schema validation |
| Interface change | Signature API modifiée | Type checking |
| File structure | Arborescence modifiée | Tree diff |

**Sévérité**: MEDIUM à HIGH selon impact.

### 2.2 Drift Sémantique

| Aspect | Description | Détection |
|--------|-------------|-----------|
| Meaning shift | Interprétation différente | Regression tests |
| Behavior change | Résultat différent pour même input | Hash comparison |
| Contract violation | Non-respect des invariants | Invariant checks |

**Sévérité**: HIGH à CRITICAL.

### 2.3 Drift Décisionnel

| Aspect | Description | Détection |
|--------|-------------|-----------|
| Verdict inconsistency | PASS/FAIL différent pour cas identiques | Replay tests |
| Threshold creep | Seuils modifiés silencieusement | Config diff |
| Override abuse | Trop d'overrides non justifiés | Count monitoring |

**Sévérité**: CRITICAL.

### 2.4 Drift d'Usage

| Aspect | Description | Détection |
|--------|-------------|-----------|
| Anomalous patterns | Volume/fréquence inhabituelle | Statistical analysis |
| Edge case explosion | Cas limites anormalement fréquents | Pattern detection |
| Error rate spike | Taux d'erreur anormal | Metric monitoring |

**Sévérité**: MEDIUM à HIGH.

---

## 3. Processus d'escalade

```
┌─────────────────────────────────────────────────────────────┐
│                      DRIFT DETECTED                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               1. GENERATE DRIFT_REPORT                       │
│   - Type classification                                      │
│   - Evidence collection                                      │
│   - Severity assessment                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               2. ALERT HUMAN                                 │
│   - Notification immediate                                   │
│   - Report attached                                          │
│   - Decision required flag                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               3. HUMAN DECISION                              │
│   - Investigate root cause                                   │
│   - Choose action: FIX | WAIVE | ROLLBACK                   │
│   - Document decision                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               4. EXECUTE & LOG                               │
│   - Apply decision                                           │
│   - Log outcome                                              │
│   - Update baseline if applicable                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Règles de détection

### DRIFT-DET-001: Baseline obligatoire
Toute détection de drift nécessite une baseline SEALED de référence.

### DRIFT-DET-002: Evidence first
Aucun rapport de drift sans preuves traçables (hashes, logs, diffs).

### DRIFT-DET-003: No auto-dismiss
Gouvernance ne peut PAS ignorer un drift détecté.

### DRIFT-DET-004: Human always
Tout drift → escalade humaine obligatoire.

### DRIFT-DET-005: Time-bounded
Drift non résolu sous 24h → CRITICAL auto.

---

## 5. Métriques de surveillance

| Métrique | Seuil alerte | Seuil critique |
|----------|--------------|----------------|
| Drift count / day | > 3 | > 10 |
| Unresolved drift age | > 12h | > 24h |
| Critical drift open | > 0 | N/A |
| Structural drift | > 1 | > 3 |

---

**Standard**: NASA-Grade L4
**Version**: 1.0.0
