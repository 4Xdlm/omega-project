# RUNBOOK OPÉRATIONNEL — PHASE D (Runtime Governance)

**Version**: 1.0  
**Date**: 2026-02-04  
**Status**: ACTIVE  
**Standard**: NASA-Grade L4

---

## 🎯 RÔLE DU RUNBOOK

Définir **EXACTEMENT** quoi faire quand Phase D détecte :
- un DRIFT
- un TOOLING_DRIFT
- un INCIDENT

**Ce document est applicable sans contexte projet préalable.**

---

## 🔒 RÈGLE D'OR

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   ❌ Ne jamais corriger                                                               ║
║   ❌ Ne jamais recalculer                                                             ║
║   ❌ Ne jamais improviser                                                             ║
║                                                                                       ║
║   ✅ Observer                                                                         ║
║   ✅ Journaliser                                                                      ║
║   ✅ Escalader                                                                        ║
║   ✅ Attendre décision humaine                                                        ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 📊 CLASSIFICATIONS POSSIBLES

| Classification | Définition | Gravité |
|---------------|------------|---------|
| **STABLE** | Aucun écart détecté | 🟢 Normal |
| **TOOLING_DRIFT** | Problème outillage, produit sain | 🟡 Mineur |
| **PRODUCT_DRIFT** | Comportement produit inattendu | 🟠 Majeur |
| **INCIDENT** | Violation invariant / écriture interdite | 🔴 Critique |

---

## 🔄 ACTION PAR CLASSIFICATION

### 🟢 STABLE

**Signification**: Système fonctionne normalement

**Actions**:
- ✅ Aucune action requise
- ✅ Continuer observation
- ✅ Snapshot quotidien uniquement

**Escalade**: NON

---

### 🟡 TOOLING_DRIFT

**Signification**: Problème d'outillage (vitest, npm, etc.) — **produit sain**

**Actions**:
- ✅ Logger événement dans GOVERNANCE_LOG.ndjson
- ✅ Conserver toutes les preuves (console, snapshots)
- ❌ NE PAS interrompre l'observation
- ❌ NE PAS corriger automatiquement
- ✅ Continuer les runs suivants

**Escalade**: < 24h (non urgent)

**Exemples**:
- Vitest ne génère pas de JSON mais console OK
- npm cache corrompu
- Permission filesystem

---

### 🟠 PRODUCT_DRIFT

**Signification**: Comportement runtime différent de la baseline **SANS violation invariant**

**Actions**:
- 🛑 **STOP observation immédiat**
- ✅ Générer snapshot immédiat
- ✅ Exporter GOVERNANCE_LOG.ndjson complet
- ✅ Calculer diff avec baseline
- ✅ Escalader Architecte **< 15 minutes**
- ⏸️ **Attendre décision écrite avant reprise**

**Escalade**: IMMÉDIATE (< 15 min)

**Exemples**:
- Output hash différent sans raison
- Verdict différent (PASS → FAIL)
- Format output modifié

**Décision attendue Architecte**:
1. Accepter (nouvelle baseline)
2. Investiguer (gel observation)
3. Rollback (retour version antérieure)

---

### 🔴 INCIDENT

**Signification**: **Violation d'invariant** ou **modification BUILD SEALED**

**Actions**:
- 🚨 **STOP IMMÉDIAT TOTAL**
- ✅ Snapshot + export logs COMPLET
- ✅ Escalade **PRIORITAIRE** (téléphone si nécessaire)
- ✅ Gel total observation
- ✅ Créer INCIDENT_REPORT (template fourni)
- ❌ **AUCUNE reprise sans autorisation écrite Architecte**

**Escalade**: **IMMÉDIATE** (téléphone/Slack)

**Exemples**:
- Baseline modifiée
- Fichier BUILD SEALED modifié
- Invariant INV-D-* violé
- Écriture dans governance/runtime/ non autorisée

**Procédure post-incident**:
1. Post-mortem obligatoire (template INCIDENT_TEMPLATE.md)
2. Root cause analysis
3. Décision Architecte formelle
4. Correction OU rollback
5. Re-certification si nécessaire

---

## 🚫 ACTIONS STRICTEMENT INTERDITES

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   INTERDIT ABSOLU (toute violation = FAIL PROCESS):                                   ║
║                                                                                       ║
║   ❌ Modifier le code BUILD (phases A-Q-C)                                            ║
║   ❌ Modifier la baseline (BASELINE_REF.sha256)                                       ║
║   ❌ Supprimer ou modifier un log                                                     ║
║   ❌ Rejouer une exécution pour "voir si ça passe"                                    ║
║   ❌ Créer une nouvelle baseline sans autorisation                                    ║
║   ❌ Corriger automatiquement un drift                                                ║
║   ❌ Ignorer une classification PRODUCT_DRIFT ou INCIDENT                             ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 📞 PROCÉDURE D'ESCALADE

### Informations à fournir

**TOUJOURS inclure**:
- `event_id` (ex: RTE_20260204_021546_ce8d87d7)
- `snapshot_id` (si généré)
- Commit/tag actuel (ex: 2e3f8d2d)
- Classification (STABLE/TOOLING_DRIFT/PRODUCT_DRIFT/INCIDENT)
- Timestamp UTC
- Lien vers GOVERNANCE_LOG.ndjson
- Diff avec baseline (si applicable)

### Canaux par gravité

| Classification | Canal | Délai max |
|---------------|-------|-----------|
| STABLE | Aucun | N/A |
| TOOLING_DRIFT | Email | < 24h |
| PRODUCT_DRIFT | Slack + Email | < 15 min |
| INCIDENT | Téléphone + Slack | IMMÉDIAT |

---

## 🔍 DIAGNOSTIC RAPIDE (AVANT ESCALADE)

### Checklist initiale

- [ ] Ai-je un RUNTIME_EVENT.json valide ?
- [ ] Le GOVERNANCE_LOG.ndjson est-il append-only (jamais modifié) ?
- [ ] La baseline a-t-elle changé ? (DOIT ÊTRE **NON**)
- [ ] Les tests sont-ils PASS dans la console ?

### Si réponse = OUI à "baseline changée"

→ **INCIDENT CRITIQUE** — escalade immédiate

### Si tests PASS console mais JSON invalide

→ **TOOLING_DRIFT** — logger, continuer, escalade < 24h

### Si tests FAIL ou output différent

→ **PRODUCT_DRIFT** — stop, snapshot, escalade < 15 min

---

## 📚 RÉFÉRENCES

| Document | Rôle |
|----------|------|
| OMEGA_BUILD_GOVERNANCE_CONTRACT.md | Autorité BUILD vs GOUVERNANCE |
| OMEGA_AUTHORITY_MODEL.md | Qui décide quoi |
| ESCALATION_MATRIX.md | Détails escalade |
| DIAGNOSTIC_CHECKLIST.md | Arbre décision complet |
| INCIDENT_TEMPLATE.md | Format post-mortem |

---

## 🔐 VALIDATION FINALE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   Ce RUNBOOK est OPÉRATIONNEL                                                         ║
║   Il peut être utilisé par TOUTE personne sans contexte préalable                     ║
║                                                                                       ║
║   Version: 1.0                                                                        ║
║   Date: 2026-02-04                                                                    ║
║   Standard: NASA-Grade L4                                                             ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU RUNBOOK OPÉRATIONNEL PHASE D v1.0**
