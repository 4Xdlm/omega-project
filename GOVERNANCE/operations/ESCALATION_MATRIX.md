# ESCALATION MATRIX — PHASE D

**Version**: 1.0  
**Date**: 2026-02-04  
**Status**: ACTIVE

---

## 🎯 OBJECTIF

Définir **qui fait quoi** et **dans quel délai** lors d'une anomalie Phase D.

---

## 👥 AUTORITÉ & RESPONSABILITÉ

| Rôle | Entité | Autorité | Responsabilité |
|------|--------|----------|----------------|
| **Architecte Suprême** | Francky | ABSOLUE | Décision finale, override, rollback |
| **IA Principal** | Claude | Exécution | Observer, documenter, escalader |
| **Claude Code** | Autonome | Observation | Journaliser, signaler, ZÉRO correction |
| **Système** | OMEGA | AUCUNE | Produire vérité, ne JAMAIS décider |

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   RÈGLE ABSOLUE:                                                                      ║
║                                                                                       ║
║   Seul l'Architecte humain peut DÉCIDER d'une action corrective.                      ║
║   Toute autre entité OBSERVE et SIGNALE uniquement.                                   ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## ⏱️ DÉLAIS MAXIMUMS D'ESCALADE

| Événement | Délai max | Canal | Bloquant |
|-----------|-----------|-------|----------|
| **STABLE** | N/A | Aucun | NON |
| **TOOLING_DRIFT** | < 24 heures | Email | NON |
| **PRODUCT_DRIFT** | < 15 minutes | Slack + Email | OUI (stop observation) |
| **INCIDENT** | IMMÉDIAT | Téléphone + Slack + Email | OUI (gel total) |

---

## 📞 CANAUX DE COMMUNICATION

### Par ordre de gravité

#### 🟢 STABLE
**Canal**: Aucun  
**Action**: Observation continue silencieuse  
**Rapport**: Optionnel (hebdomadaire si demandé)

---

#### 🟡 TOOLING_DRIFT
**Canal**: Email  
**Format**:
```
Sujet: [OMEGA Phase D] TOOLING_DRIFT détecté
Corps:
- event_id: RTE_YYYYMMDD_HHMMSS_<hash>
- Classification: TOOLING_DRIFT
- Description: [ex: vitest JSON fail, console PASS]
- Snapshot: <id>
- Commit: <hash>
- Action: Observation continue
```

**Délai réponse attendu**: < 48h (non urgent)

---

#### 🟠 PRODUCT_DRIFT
**Canal**: Slack (#omega-alerts) + Email  
**Format Slack**:
```
🟠 PRODUCT_DRIFT DÉTECTÉ

Event ID: RTE_YYYYMMDD_HHMMSS_<hash>
Commit: <hash>
Tag: <tag>

DIFFÉRENCE BASELINE:
- Output hash: <actuel> vs <attendu>
- Verdict: <actuel> vs <attendu>

ACTION PRISE:
✅ Observation STOPPÉE
✅ Snapshot généré: <id>
✅ Logs exportés

⏸️ ATTENTE DÉCISION ARCHITECTE

Snapshot: governance/runtime/SNAPSHOT/<id>.json
Log: governance/runtime/GOVERNANCE_LOG.ndjson
```

**Délai réponse attendu**: < 15 minutes  
**Observation**: GELÉE jusqu'à décision

---

#### 🔴 INCIDENT
**Canal**: **TÉLÉPHONE** + Slack + Email  
**Procédure**:
1. **Appel téléphonique immédiat**
2. Message Slack simultané
3. Email de confirmation

**Format message critique**:
```
🚨 INCIDENT CRITIQUE OMEGA PHASE D

Event ID: RTE_YYYYMMDD_HHMMSS_<hash>
Classification: INCIDENT

VIOLATION:
- Invariant: INV-D-<XX>
- Description: [ex: Baseline modifiée]
- Impact: [ex: Intégrité BUILD compromise]

ACTION IMMÉDIATE:
✅ STOP TOTAL observation
✅ Snapshot + logs exportés
✅ Gel système complet

⚠️ NÉCESSITE DÉCISION ARCHITECTE URGENTE

Incident report: governance/operations/incidents/INCIDENT_<id>.md
```

**Délai réponse attendu**: IMMÉDIAT  
**Système**: GEL TOTAL jusqu'à résolution

---

## 📋 INFORMATIONS OBLIGATOIRES (TOUTE ESCALADE)

### Minimum requis

- [ ] `event_id` (format: RTE_YYYYMMDD_HHMMSS_<hash>)
- [ ] `classification` (STABLE/TOOLING_DRIFT/PRODUCT_DRIFT/INCIDENT)
- [ ] `timestamp` (UTC)
- [ ] `commit` (hash Git actuel)
- [ ] `tag` (si applicable)
- [ ] `baseline_ref` (hash baseline utilisée)

### Si PRODUCT_DRIFT ou INCIDENT

- [ ] `snapshot_id`
- [ ] Lien vers GOVERNANCE_LOG.ndjson
- [ ] Diff output actuel vs baseline
- [ ] Invariants concernés (INV-D-XX)
- [ ] Action déjà prise (STOP/GEL)

---

## 🔄 WORKFLOW DÉCISION POST-ESCALADE

### Réponse Architecte attendue

Pour **TOOLING_DRIFT**:
```
ACCEPTÉ — Continuer observation
OU
INVESTIGUER — Gel temporaire
```

Pour **PRODUCT_DRIFT**:
```
ACCEPTER — Nouvelle baseline (justification requise)
OU
REJETER — Rollback version précédente
OU
INVESTIGUER — Gel observation + analyse
```

Pour **INCIDENT**:
```
ROLLBACK IMMÉDIAT
OU
CORRECTION + RE-CERTIFICATION
OU
INVESTIGATION APPROFONDIE (gel prolongé)
```

### Format décision formelle

```markdown
## DÉCISION ARCHITECTE

Event ID: <id>
Date UTC: <timestamp>
Classification: <type>

DÉCISION: [ACCEPTER/REJETER/INVESTIGUER/ROLLBACK]

JUSTIFICATION:
<texte>

ACTION AUTORISÉE:
- [ ] Reprise observation
- [ ] Nouvelle baseline
- [ ] Rollback commit <hash>
- [ ] Re-certification Phase X
- [ ] Gel prolongé

SIGNATURE: <nom>
DATE: <timestamp>
```

---

## 📊 MATRICE DÉCISION RAPIDE

| Situation | Classification | Action immédiate | Escalade |
|-----------|---------------|------------------|----------|
| Tests PASS, output identique | STABLE | Aucune | NON |
| Tests PASS, JSON invalide | TOOLING_DRIFT | Logger | < 24h |
| Tests PASS, output différent | PRODUCT_DRIFT | STOP + snapshot | < 15 min |
| Tests FAIL | PRODUCT_DRIFT | STOP + snapshot | < 15 min |
| Baseline modifiée | INCIDENT | GEL TOTAL | IMMÉDIAT |
| Invariant violé | INCIDENT | GEL TOTAL | IMMÉDIAT |
| Écriture BUILD SEALED | INCIDENT | GEL TOTAL | IMMÉDIAT |

---

## 🔐 VALIDATION

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   Cette matrice est OPÉRATIONNELLE                                                    ║
║   Elle garantit une réponse déterministe à toute anomalie                             ║
║                                                                                       ║
║   Version: 1.0                                                                        ║
║   Date: 2026-02-04                                                                    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DE LA MATRICE D'ESCALADE v1.0**
