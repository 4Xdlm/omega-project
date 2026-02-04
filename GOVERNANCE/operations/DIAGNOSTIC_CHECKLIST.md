# DIAGNOSTIC CHECKLIST — PHASE D

**Version**: 1.0  
**Date**: 2026-02-04  
**Status**: ACTIVE

---

## 🎯 OBJECTIF

Fournir un **arbre de décision rapide** pour classifier correctement une anomalie Phase D **SANS expertise OMEGA préalable**.

---

## 🔍 ÉTAPE 1 — VÉRIFICATIONS INITIALES (AVANT TOUT)

### Checklist pré-diagnostic

Répondre OUI ou NON à chaque question :

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   □ Ai-je un fichier RUNTIME_EVENT.json valide ?                                      ║
║   □ Le GOVERNANCE_LOG.ndjson existe-t-il ?                                            ║
║   □ Le log est-il en append-only (aucune ligne supprimée) ?                           ║
║   □ La baseline BASELINE_REF.sha256 est-elle inchangée ?                              ║
║   □ Les tests affichent-ils un résultat dans la console ?                             ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### ⚠️ Si une réponse = NON

| Question NON | Action immédiate |
|--------------|------------------|
| RUNTIME_EVENT absent | 🔴 INCIDENT — escalade immédiate |
| GOVERNANCE_LOG absent | 🔴 INCIDENT — escalade immédiate |
| Log modifié (pas append-only) | 🔴 INCIDENT — escalade immédiate |
| Baseline modifiée | 🔴 INCIDENT — escalade immédiate |
| Console ne retourne rien | 🟠 PRODUCT_DRIFT — stop + escalade |

**Si toutes = OUI → Passer à l'ÉTAPE 2**

---

## 🔍 ÉTAPE 2 — CLASSIFICATION BASÉE SUR RÉSULTAT TESTS

### Arbre de décision

```
                          ┌─────────────────────┐
                          │  Tests exécutés ?   │
                          └──────────┬──────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
                ▼                    ▼                    ▼
         ┌────────────┐       ┌────────────┐      ┌────────────┐
         │ PASS       │       │ FAIL       │      │ ERROR      │
         │ (console)  │       │ (console)  │      │ (crash)    │
         └──────┬─────┘       └──────┬─────┘      └──────┬─────┘
                │                    │                    │
                │                    │                    │
     ┌──────────┴──────────┐         │                    │
     │                     │         │                    │
     ▼                     ▼         ▼                    ▼
┌─────────┐         ┌─────────┐  ┌─────────┐      ┌─────────┐
│ Output  │         │ Output  │  │ Verdict │      │ Process │
│ = hash  │         │ ≠ hash  │  │ = FAIL  │      │ crashed │
│ attendu │         │ attendu │  └────┬────┘      └────┬────┘
└────┬────┘         └────┬────┘       │                │
     │                   │             │                │
     ▼                   ▼             ▼                ▼
 🟢 STABLE        🟠 PRODUCT_    🟠 PRODUCT_    🔴 INCIDENT
                     DRIFT          DRIFT
```

---

## 🔍 ÉTAPE 3 — CAS PARTICULIERS

### Cas A: Tests PASS console, JSON invalide/absent

**Symptômes**:
- Console affiche `Test Files X passed (X)`
- Mais RUNTIME_EVENT.json mal formé OU absent
- OU verdict = null dans l'événement

**Diagnostic**: 🟡 **TOOLING_DRIFT**

**Action**:
1. Logger dans GOVERNANCE_LOG.ndjson
2. Continuer observation (ne PAS stopper)
3. Escalade < 24h (non bloquant)
4. Conserver toutes les preuves

**Raison**: Le produit fonctionne (tests PASS), seul l'outillage a un problème.

---

### Cas B: Output hash différent MAIS tests PASS

**Symptômes**:
- Tests console: `Test Files X passed (X)`
- Hash output ≠ hash baseline
- Verdict = PASS

**Diagnostic**: 🟠 **PRODUCT_DRIFT**

**Action**:
1. **STOP observation immédiatement**
2. Générer snapshot
3. Comparer output vs baseline (diff détaillé)
4. Escalade < 15 min
5. Attendre décision Architecte

**Raison**: Comportement runtime a changé sans explication. Nécessite investigation.

---

### Cas C: Baseline ou BUILD SEALED modifié

**Symptômes**:
- BASELINE_REF.sha256 contenu différent
- OU fichier dans phases A/Q/C modifié
- OU invariant INV-D-01 violé (BUILD immuable)

**Diagnostic**: 🔴 **INCIDENT CRITIQUE**

**Action**:
1. **GEL TOTAL immédiat**
2. Snapshot + export logs complet
3. Escalade **téléphone** immédiate
4. Créer INCIDENT_REPORT
5. Aucune reprise sans autorisation écrite Architecte

**Raison**: Violation du contrat BUILD ↔ GOUVERNANCE. Intégrité système compromise.

---

### Cas D: Tests FAIL (attendu PASS)

**Symptômes**:
- Console affiche `Test Files X failed`
- OU nombre tests PASS ≠ 4941
- Baseline attendait PASS

**Diagnostic**: 🟠 **PRODUCT_DRIFT**

**Action**:
1. **STOP observation**
2. Snapshot
3. Récupérer logs console complets
4. Identifier tests en échec
5. Escalade < 15 min

**Raison**: Régression détectée. Produit ne respecte plus baseline.

---

### Cas E: Format output modifié

**Symptômes**:
- Structure JSON RUNTIME_EVENT différente
- OU champs manquants/ajoutés
- OU types de données changés

**Diagnostic**: 🟠 **PRODUCT_DRIFT**

**Action**:
1. **STOP observation**
2. Diff schéma actuel vs baseline
3. Escalade < 15 min

**Raison**: Contrat d'interface rompu.

---

## 🔍 ÉTAPE 4 — TABLEAU DÉCISION RAPIDE

| Condition | Classification | Action |
|-----------|---------------|--------|
| Tests PASS + Hash OK | 🟢 STABLE | Aucune |
| Tests PASS + JSON invalide | 🟡 TOOLING_DRIFT | Logger + Continuer |
| Tests PASS + Hash KO | 🟠 PRODUCT_DRIFT | STOP + Escalade |
| Tests FAIL | 🟠 PRODUCT_DRIFT | STOP + Escalade |
| Baseline modifiée | 🔴 INCIDENT | GEL + Escalade immédiate |
| BUILD SEALED modifié | 🔴 INCIDENT | GEL + Escalade immédiate |
| Invariant violé | 🔴 INCIDENT | GEL + Escalade immédiate |
| Process crash | 🔴 INCIDENT | GEL + Escalade immédiate |

---

## 🔍 ÉTAPE 5 — INFORMATIONS À COLLECTER

### Pour TOUTE classification (sauf STABLE)

```bash
# Event ID
grep "event_id" governance/runtime/RUNTIME_EVENT.json

# Baseline actuelle
cat governance/runtime/BASELINE_REF.sha256

# Dernier snapshot
ls -lt governance/runtime/SNAPSHOT/ | head -n 2

# Hash output actuel
grep "output_hash" governance/runtime/RUNTIME_EVENT.json

# Verdict
grep "verdict" governance/runtime/RUNTIME_EVENT.json

# Nombre tests
grep "test_count" governance/runtime/RUNTIME_EVENT.json
```

### Pour PRODUCT_DRIFT ou INCIDENT

```bash
# Diff output
diff <(echo "$BASELINE_OUTPUT_HASH") <(echo "$CURRENT_OUTPUT_HASH")

# Tests en échec (si applicable)
grep "FAIL" nexus/proof/vitest_console_report_PHASE_D.txt

# Dernières lignes log
tail -n 10 governance/runtime/GOVERNANCE_LOG.ndjson

# Commit actuel
git log -1 --oneline

# Tag actuel
git describe --tags
```

---

## 🔍 ÉTAPE 6 — FORMAT RAPPORT (COPIER-COLLER)

```markdown
## RAPPORT DIAGNOSTIC PHASE D

### Métadonnées
- Date UTC: <timestamp>
- Event ID: <id>
- Baseline: <hash>
- Commit: <hash>
- Tag: <tag>

### Classification
<STABLE | TOOLING_DRIFT | PRODUCT_DRIFT | INCIDENT>

### Symptômes observés
- [ ] Tests PASS: [OUI/NON]
- [ ] Hash OK: [OUI/NON]
- [ ] JSON valide: [OUI/NON]
- [ ] Baseline inchangée: [OUI/NON]
- [ ] BUILD SEALED intact: [OUI/NON]

### Différences détectées
<description>

### Action prise
- [ ] Observation continuée
- [ ] Observation stoppée
- [ ] Snapshot généré: <id>
- [ ] Logs exportés
- [ ] Escalade faite: <canal>

### Références
- RUNTIME_EVENT: governance/runtime/RUNTIME_EVENT.json
- Snapshot: governance/runtime/SNAPSHOT/<id>.json
- Log: governance/runtime/GOVERNANCE_LOG.ndjson
```

---

## 🔐 VALIDATION

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   Cette checklist est COMPLÈTE                                                        ║
║   Elle permet un diagnostic SANS expertise OMEGA préalable                            ║
║                                                                                       ║
║   Version: 1.0                                                                        ║
║   Date: 2026-02-04                                                                    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DE LA CHECKLIST DIAGNOSTIC v1.0**
