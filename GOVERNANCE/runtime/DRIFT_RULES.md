# DRIFT RULES -- PHASE D
# Classification passive des ecarts

## NORMATIF VS NON-NORMATIF

| Niveau | Elements | Autorite |
|--------|----------|----------|
| **NORMATIF** | Exit code + console output (tests/executions) | **ABSOLUE** |
| **NON-NORMATIF** | Reporters JSON, timestamps, metriques perf | TOOLING |

---

## DECLENCHEURS

### 1. TOOLING_DRIFT (verdict: TOOLING_DRIFT)

**Definition:** Divergence due a l'outillage, pas au comportement produit.

**Exemples:**
- Reporter JSON indique "failed" **MAIS** console + exit code = PASS
- Stack trace capture interne (non-normatif)
- Timestamps variables dans logs
- Metriques performance fluctuantes

**Action:**
1. Log event verdict=TOOLING_DRIFT
2. Note explicative
3. Reference artefact
4. Pas d'escalade (sauf accumulation suspecte >10 en 1h)

---

### 2. PRODUCT_DRIFT (verdict: DRIFT)

**Definition:** Divergence comportement/output produit.

**Exemples:**
- output_hash diverge de baseline attendue
- Format/schema de sortie change (breaking)
- Verdict decisionnel incoherent
- Tests passent/echouent differemment

**Action:**
1. Log event verdict=DRIFT
2. Creer DRIFT_REPORT_<id>.json
3. Escalade humaine OBLIGATOIRE
4. Aucune correction automatique
5. Attente decision (accept/override/rollback)

---

### 3. INCIDENT (verdict: INCIDENT)

**Definition:** Violation invariant ou action interdite.

**Exemples:**
- Ecriture dans zone SEALED
- Modification baseline pendant Phase D
- Absence d'evenement pour execution observee
- Auto-correction detectee

**Action:**
1. FAIL immediat
2. Creer INCIDENT_<id>.md
3. Arret observation
4. Alerte urgente humain
5. Rollback potentiel

---

## ESCALADE

```
DRIFT/INCIDENT
     |
RAPPORT (JSON/MD)
     |
ALERTE HUMAINE (obligatoire)
     |
DECISION HUMAINE
     |
(optionnel) OVERRIDE TRACE
```

**Aucune auto-correction autorisee.**
