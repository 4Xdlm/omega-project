# GOVERNANCE CHARTER -- PHASE D
# Contrat liant BUILD <-> GOUVERNANCE

## OBJECTIF UNIQUE

Observer l'execution du systeme certifie en conditions reelles **sans l'influencer**.

## FRONTIERE D'AUTORITE

| Acteur | Role | Autorite |
|--------|------|----------|
| **BUILD** | Produit la verite | NULLE (post-SEAL) |
| **GOVERNANCE** | Observe et rapporte | NON DECISIONNELLE |
| **HUMAIN** | Decide (override/rollback) | FINALE |

## INVARIANTS PHASE D

| ID | Invariant | Test |
|----|-----------|------|
| **INV-D-01** | Pas d'execution sans RUNTIME_EVENT | Verifier event_id |
| **INV-D-02** | Log append-only | Pas de suppression/modification |
| **INV-D-03** | Aucune ecriture BUILD SEALED | Monitorer filesystem |
| **INV-D-04** | Baseline immuable | Hash constant |
| **INV-D-05** | Aucune auto-correction | Audit trail |
| **INV-D-06** | Toute anomalie escaladee | Verifier DRIFT_REPORT |

## CLASSIFICATION DES ECARTS

### TOOLING_DRIFT (non-critique)
Divergence outillage (reporter JSON, timestamps).
**Action:** Log + note, pas d'escalade sauf accumulation.

### PRODUCT_DRIFT (critique)
Divergence comportement produit.
**Action:** Log + rapport + escalade humaine OBLIGATOIRE.

### INCIDENT (bloquant)
Violation invariant ou action interdite.
**Action:** FAIL + arret + rollback potentiel.

## REGLE D'ESCALADE

```
DRIFT -> RAPPORT -> DECISION HUMAINE -> (optionnel) OVERRIDE TRACE
```

**Aucune boucle corrective automatique.**
