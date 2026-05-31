# HUMAN OVERRIDE

## 1. Définition

Un **override** est une décision humaine explicite qui déroge temporairement à une règle ou un verdict système.

---

## 2. Conditions cumulatives (TOUTES obligatoires)

| # | Condition | Requis |
|---|-----------|--------|
| 1 | Justification écrite | Texte explicatif du pourquoi |
| 2 | Signature humaine | Identité de l'approbateur |
| 3 | Expiration définie | Date limite de validité |
| 4 | Hash calculé | SHA256 du contenu |
| 5 | Manifest reference | Lien vers état système |

**Sans ces 5 conditions → Override NUL et non avenu.**

---

## 3. Processus

```
┌─────────────────────────────────────────────────────────────┐
│                  1. DEMANDE D'OVERRIDE                       │
│   - Contexte décrit                                          │
│   - Règle/verdict concerné identifié                         │
│   - Impact évalué                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  2. VALIDATION HUMAINE                       │
│   - Revue par Architecte                                     │
│   - Justification approuvée ou rejetée                       │
│   - Expiration fixée                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  3. CRÉATION OVERRIDE                        │
│   - Génération override_event                                │
│   - Calcul hash                                              │
│   - Enregistrement log                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  4. APPLICATION                              │
│   - Override actif jusqu'à expiration                        │
│   - Monitoring continu                                       │
│   - Alerte à J-1 expiration                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Règles strictes

### OVR-001: No perpetual override
Aucun override sans date d'expiration. Maximum: 90 jours.

### OVR-002: Single approver
Un override = un approbateur identifié.

### OVR-003: Audit trail
Chaque override est loggé avec hash chain.

### OVR-004: Review before renewal
Renouvellement = nouvelle justification obligatoire.

### OVR-005: No cascade
Un override ne peut pas autoriser un autre override.

---

## 5. Matrice d'autorité

| Scope | Qui peut approuver |
|-------|-------------------|
| Régression mineure | Tech Lead |
| Régression majeure | Architecte |
| Sécurité | CISO + Architecte |
| Compliance | Legal + Architecte |

---

## 6. Expiration

| Type | Durée max |
|------|-----------|
| Hotfix | 7 jours |
| Exception | 30 jours |
| Dérogation | 90 jours |

À expiration: override devient inactif, règle normale s'applique.

---

**Standard**: NASA-Grade L4
**Version**: 1.0.0
