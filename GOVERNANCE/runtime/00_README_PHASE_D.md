# OMEGA -- PHASE D -- RUNTIME GOVERNANCE
# Observation passive - Aucune correction
#
# Version: 1.0
# Standard: NASA-Grade L4

## ROLE

Phase D observe le systeme certifie **sans jamais l'influencer**.

## INTERDICTIONS ABSOLUES

- Aucun recalcul ORACLE
- Aucune modification INVARIANTS
- Aucune auto-correction
- Aucune ecriture dans BUILD SEALED
- Aucun drift ignore sans rapport

## HIERARCHIE DE PREUVE

| Niveau | Elements | Autorite |
|--------|----------|----------|
| **NORMATIF** | Exit code + console stdout/stderr | ABSOLUE |
| **NON-NORMATIF** | Reporter JSON, timestamps, metriques | TOOLING |

## ARTEFACTS

| Fichier | Description |
|---------|-------------|
| `RUNTIME_EVENT.json` | Dernier evenement observe |
| `GOVERNANCE_LOG.ndjson` | Log append-only (1 ligne = 1 evenement) |
| `SNAPSHOT/*.json` | Snapshots periodiques |
| `BASELINE_REF.sha256` | Reference baseline figee |
| `DRIFT_RULES.md` | Classification des ecarts |

## CRITERES DE SORTIE

**PASS si:**
- Observation complete
- Logs auditables
- Aucune intervention

**FAIL si:**
- Correction appliquee
- Recalcul verite
- Silence sur anomalie
