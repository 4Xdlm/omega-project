# INCIDENT REPORT — OMEGA

**Version template**: 1.0  
**Date création template**: 2026-02-04

---

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   UTILISER CE TEMPLATE POUR TOUT INCIDENT 🔴                                          ║
║                                                                                       ║
║   Un incident = violation invariant OU modification BUILD SEALED                      ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 MÉTADONNÉES INCIDENT

| Champ | Valeur |
|-------|--------|
| **Incident ID** | INC_YYYYMMDD_HHMMSS_<hash> |
| **Date UTC** | <timestamp ISO 8601> |
| **Détecteur** | <Claude Code / Humain / Autre> |
| **Phase concernée** | D — Runtime Governance |
| **Classification** | INCIDENT |
| **Gravité** | 🔴 CRITIQUE |

---

## 🔗 RÉFÉRENCES TECHNIQUES

| Référence | Valeur |
|-----------|--------|
| **event_id** | RTE_YYYYMMDD_HHMMSS_<hash> |
| **snapshot_id** | SNAPSHOT_<id> |
| **commit** | <hash Git> |
| **tag** | <tag Git si applicable> |
| **baseline_ref** | <hash baseline> |
| **branch** | <nom branche> |

---

## 📝 DESCRIPTION FACTUELLE (SANS HYPOTHÈSE)

### Ce qui a été observé

```
<Description factuelle uniquement>
<Pas d'interprétation>
<Pas de "probablement" ou "peut-être">

Exemple:
- Le fichier governance/runtime/BASELINE_REF.sha256 contient un hash différent
- Hash attendu: 22b96d37e9439dd9...
- Hash trouvé: xxxxxx...
- Timestamp modification: 2026-02-04T03:14:15Z
```

### Preuves collectées

- [ ] Snapshot généré: `governance/runtime/SNAPSHOT/<id>.json`
- [ ] Logs exportés: `governance/runtime/GOVERNANCE_LOG.ndjson`
- [ ] Console output: `nexus/proof/vitest_console_report_PHASE_D.txt`
- [ ] RUNTIME_EVENT: `governance/runtime/RUNTIME_EVENT.json`
- [ ] Diff baseline: `<fichier diff si applicable>`

---

## ⚠️ INVARIANTS VIOLÉS

### Liste des invariants compromis

| Invariant | Description | Preuve violation |
|-----------|-------------|------------------|
| **INV-D-01** | BUILD SEALED immuable | <fichier modifié> |
| **INV-D-02** | Baseline append-only | <hash différent> |
| **INV-D-03** | Log append-only | <ligne supprimée> |
| **INV-D-04** | Snapshot horodaté | <timestamp incohérent> |
| **INV-D-05** | Gouvernance passive | <écriture non autorisée> |

### Impact invariants

```
<Expliquer COMMENT la violation compromet le système>

Exemple:
- Violation INV-D-01 (BUILD modifié) compromet la certification Phase C
- Nécessite recertification complète
- Tous les runs Phase D depuis modification sont INVALIDES
```

---

## 🛠️ ACTIONS PRISES (IMMÉDIATEMENT)

### Actions automatiques

- [ ] **STOP observation** — timestamp: <HH:MM:SS UTC>
- [ ] **GEL système** — aucune exécution autorisée
- [ ] **Snapshot généré** — ID: <id>
- [ ] **Logs exportés** — complet jusqu'à incident
- [ ] **Escalade faite** — canal: <Téléphone/Slack/Email>

### Actions manuelles (si applicable)

```
<Liste des actions manuelles prises>

Exemple:
- Rollback commit tenté: NON (attente décision Architecte)
- Backup créé: OUI (governance/runtime/ copié vers backup/)
- Service externe notifié: NON
```

---

## 🔍 ROOT CAUSE ANALYSIS (À COMPLÉTER POST-INCIDENT)

### Cause racine

```
<À compléter après investigation>

Questions à répondre:
- POURQUOI l'incident s'est produit ?
- QUI/QUOI a modifié le fichier/baseline/invariant ?
- COMMENT la protection a-t-elle été contournée ?
- QUAND exactement (timeline précise) ?
```

### Timeline reconstruction

| Timestamp UTC | Événement | Source preuve |
|---------------|-----------|---------------|
| <HH:MM:SS> | <événement 1> | <fichier/log> |
| <HH:MM:SS> | <événement 2> | <fichier/log> |
| <HH:MM:SS> | **INCIDENT DÉTECTÉ** | RUNTIME_EVENT |
| <HH:MM:SS> | Escalade faite | GOVERNANCE_LOG |

---

## 🧠 DÉCISION ARCHITECTE (OBLIGATOIRE)

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   CETTE SECTION DOIT ÊTRE REMPLIE PAR L'ARCHITECTE SUPRÊME                            ║
║   AUCUNE REPRISE SANS DÉCISION FORMELLE ÉCRITE                                        ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### Décision prise

- [ ] **ROLLBACK** — retour commit: <hash>
- [ ] **CORRECTION** — modification autorisée + re-certification
- [ ] **INVESTIGATION APPROFONDIE** — gel prolongé
- [ ] **ACCEPTATION** — nouvelle baseline (justification requise)

### Justification

```
<Justification complète de la décision>
<Analyse risque>
<Impact sur certification>
```

### Actions autorisées

- [ ] Reprise observation Phase D
- [ ] Modification BUILD (exceptionnelle, tracée)
- [ ] Nouvelle baseline (hash: <nouveau hash>)
- [ ] Re-certification Phase <X>
- [ ] Rollback version <hash>
- [ ] Gel prolongé durée: <X jours>
- [ ] Autre: <préciser>

### Conditions reprise

```
<Liste des conditions AVANT reprise>

Exemple:
- Tests complets re-exécutés: 4941/4941 PASS
- Baseline validée: <hash>
- Invariants re-vérifiés: 5/5 PASS
- Post-mortem complété: OUI
- Leçons apprises documentées: OUI
```

---

## 📚 LESSONS LEARNED (POST-MORTEM)

### Ce qui a bien fonctionné

```
<Éléments positifs>

Exemple:
- Détection immédiate par Phase D
- Escalade respectée (< 1 min)
- Preuves complètes préservées
```

### Ce qui doit être amélioré

```
<Points d'amélioration>

Exemple:
- Ajouter alerte filesystem sur BASELINE_REF.sha256
- Renforcer protection écriture governance/runtime/
- Automatiser backup pré-run
```

### Actions préventives futures

- [ ] Action 1: <description> — Responsable: <qui> — Deadline: <quand>
- [ ] Action 2: <description> — Responsable: <qui> — Deadline: <quand>
- [ ] Action 3: <description> — Responsable: <qui> — Deadline: <quand>

---

## 🔐 CLÔTURE INCIDENT

### Validation finale

- [ ] Root cause identifiée
- [ ] Décision Architecte formalisée
- [ ] Actions correctives appliquées
- [ ] Tests re-passés (si applicable)
- [ ] Invariants re-vérifiés
- [ ] Documentation mise à jour
- [ ] Lessons learned archivées
- [ ] Système en état OPÉRATIONNEL

### Signatures

| Rôle | Nom | Date UTC | Signature |
|------|-----|----------|-----------|
| **Détecteur** | <nom> | <timestamp> | <hash commit> |
| **Investigateur** | <nom> | <timestamp> | <hash commit> |
| **Architecte Suprême** | Francky | <timestamp> | <hash commit> |

### Hash incident report

```bash
# Calculer hash de ce document (sans cette section)
sha256sum INCIDENT_<id>.md
```

**Hash**: `<hash SHA-256>`

---

## 📎 ANNEXES

### Fichiers attachés

- `governance/runtime/SNAPSHOT/<id>.json`
- `governance/runtime/GOVERNANCE_LOG.ndjson` (export période incident)
- `nexus/proof/vitest_console_report_PHASE_D.txt`
- `diff_baseline_vs_actuel.txt` (si applicable)

### Références documentation

- OMEGA_BUILD_GOVERNANCE_CONTRACT.md
- OMEGA_AUTHORITY_MODEL.md
- RUNBOOK_PHASE_D.md
- ESCALATION_MATRIX.md

---

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   FIN DU INCIDENT REPORT                                                              ║
║                                                                                       ║
║   Ce document doit être archivé dans:                                                 ║
║   governance/operations/incidents/INCIDENT_<id>.md                                    ║
║                                                                                       ║
║   Version template: 1.0                                                               ║
║   Date: 2026-02-04                                                                    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU TEMPLATE INCIDENT REPORT v1.0**
