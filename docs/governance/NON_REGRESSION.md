# NON-REGRESSION ACTIVE

## 1. Principe fondamental

> **Le passé est un oracle.**

Toute nouvelle version DOIT être testée contre les snapshots des versions précédentes.

---

## 2. Règles

### REG-001: Baseline preservation
Chaque version SEALED devient une baseline de régression.

### REG-002: Mandatory testing
Toute release candidate est testée contre toutes les baselines actives.

### REG-003: Explicit acceptance
Régression détectée → acceptation explicite requise (WAIVER).

### REG-004: Waiver traceability
Tout waiver de régression → justification + signature + expiration.

### REG-005: No silent regression
Régression non documentée = FAIL critique.

---

## 3. Matrice de régression

| Baseline | Candidate | Tests | Status |
|----------|-----------|-------|--------|
| v1.0.0 SEALED | v1.1.0-rc | 100 | PASS |
| v1.0.0 SEALED | v1.1.0-rc | 5 | WAIVED |
| v1.1.0 SEALED | v1.2.0-rc | 100 | PASS |

---

## 4. Processus

```
1. Identifier baselines actives
2. Exécuter tests de régression
3. Collecter résultats
4. Si FAIL:
   a. Analyser cause
   b. Décider: FIX ou WAIVE
   c. Documenter décision
5. Générer REGRESSION_RESULT
6. Logger dans gouvernance
```

---

## 5. Critères d'acceptation

| Critère | Condition |
|---------|-----------|
| Backward compatible | Aucune régression API |
| Data compatible | Anciens fichiers lisibles |
| Behavior stable | Mêmes inputs → mêmes outputs |

---

**Standard**: NASA-Grade L4
**Version**: 1.0.0
