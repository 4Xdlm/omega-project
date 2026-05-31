# INCIDENT PROCESS

## 1. Philosophie

> **Incident ≠ Faute**
> **Silence = Faute**

Un incident est une opportunité d'apprentissage. Le masquer est une faute grave.

---

## 2. Définition

Un **incident** est tout événement qui:
- Compromet l'intégrité du système
- Viole un invariant
- Produit un résultat incorrect
- Nécessite une intervention d'urgence

---

## 3. Processus

### Phase 1: Détection

```
┌─────────────────────────────────────────────────────────────┐
│                      INCIDENT DETECTED                       │
│   Source: Monitoring / Test / User / Audit                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    IMMEDIATE ACTIONS                         │
│   1. Timestamp l'événement                                   │
│   2. Préserver les preuves                                   │
│   3. Alerter l'équipe                                        │
│   4. Créer INCIDENT_EVENT                                    │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Triage

| Sévérité | Critère | SLA Response |
|----------|---------|--------------|
| CRITICAL | Data loss / Security breach | < 1h |
| HIGH | Service down / Major bug | < 4h |
| MEDIUM | Degraded service | < 24h |
| LOW | Minor issue | < 72h |

### Phase 3: Investigation

- Collecter logs et traces
- Identifier root cause
- Documenter timeline
- Préparer INCIDENT.md

### Phase 4: Resolution

- Appliquer fix ou rollback
- Vérifier résolution
- Documenter actions prises
- Créer ROLLBACK_PLAN si applicable

### Phase 5: Post-mortem

- Rédiger post-mortem complet
- Identifier actions préventives
- Mettre à jour runbooks
- Partager learnings

---

## 4. Post-mortem obligatoire

Tout incident → `INCIDENT.md` requis contenant:

1. **Summary**: Résumé en 2-3 phrases
2. **Timeline**: Chronologie détaillée
3. **Root Cause**: Cause racine identifiée
4. **Impact**: Qui/quoi affecté
5. **Resolution**: Comment résolu
6. **Actions**: Préventions futures
7. **Evidence**: Références aux preuves

---

## 5. Règles

### INC-001: No blame culture
Pas de blame individuel. Focus sur système.

### INC-002: Immediate logging
Tout incident loggé dans les 15 minutes.

### INC-003: Evidence preservation
Aucune preuve supprimée avant post-mortem.

### INC-004: Transparent communication
Stakeholders informés selon severity.

### INC-005: Mandatory post-mortem
Tout incident MEDIUM+ → post-mortem obligatoire.

---

## 6. Rollback

Un rollback est la restauration à un état précédent connu comme stable.

### Conditions de rollback

- Fix impossible dans SLA
- Risque de damage continued
- Décision humaine documentée

### Processus rollback

1. Identifier target (tag SEALED)
2. Valider que target était stable
3. Créer ROLLBACK_PLAN.json
4. Exécuter rollback
5. Vérifier état
6. Logger ROLLBACK_EVENT

---

**Standard**: NASA-Grade L4
**Version**: 1.0.0
