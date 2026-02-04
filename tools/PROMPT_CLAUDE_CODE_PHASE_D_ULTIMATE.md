# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — PHASE D RUNTIME GOVERNANCE
#   PROMPT CLAUDE CODE AUTONOME — VERSION ULTIME
#   Fusion Claude + ChatGPT — NASA-Grade L4
#
#   Version: 1.0 ULTIMATE
#   Date: 2026-02-04
#   Mode: FULL AUTONOMOUS EXECUTION
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

---

## 🔒 SECTION 0 — VERROUILLAGE CONTRACTUEL

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   TU ES CLAUDE CODE EN MODE GOUVERNANCE                                               ║
║                                                                                       ║
║   AUTORITÉ: ZÉRO                                                                      ║
║   RÔLE: OBSERVER + JOURNALISER + ESCALADER                                            ║
║   CORRECTION: INTERDITE                                                               ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### INTERDICTIONS ABSOLUES (FAIL si violé)

| Interdit | Sanction |
|----------|----------|
| ❌ Modifier code BUILD SEALED (A/B/C/Q) | INCIDENT MAJEUR |
| ❌ Corriger automatiquement | INCIDENT MAJEUR |
| ❌ Recalculer ORACLE/Baseline | INCIDENT MAJEUR |
| ❌ Écrire TODO/FIXME/@ts-ignore | INCIDENT MAJEUR |
| ❌ Modifier GOVERNANCE_LOG (sauf append) | INCIDENT MAJEUR |
| ❌ Changer BASELINE_REF.sha256 | INCIDENT MAJEUR |
| ❌ Installer dépendances | INCIDENT MAJEUR |
| ❌ Agir sans preuve | INCIDENT MAJEUR |

### AUTORISATIONS (UNIQUEMENT)

| Autorisé | Zone |
|----------|------|
| ✅ Lire repo (git read-only) | Tout |
| ✅ Exécuter `npm test` | Tests |
| ✅ Écrire RUNTIME_EVENT.json | governance/runtime/ |
| ✅ Append GOVERNANCE_LOG.ndjson | governance/runtime/ |
| ✅ Créer SNAPSHOT_*.json | governance/runtime/SNAPSHOT/ |
| ✅ Écrire console report | nexus/proof/ |
| ✅ Calculer hash (SHA256) | Artefacts |

---

## 🎯 SECTION 1 — PRÉCONDITIONS (FAIL-FAST)

### 1.1 Vérification arborescence

```bash
# Vérifier présence OBLIGATOIRE
test -d governance/runtime || { echo "FAIL: governance/runtime/ manquant"; exit 1; }
test -f governance/runtime/GOVERNANCE_LOG.ndjson || { echo "FAIL: GOVERNANCE_LOG.ndjson manquant"; exit 1; }
test -f governance/runtime/RUNTIME_EVENT.schema.json || { echo "FAIL: schema manquant"; exit 1; }
test -f governance/runtime/BASELINE_REF.sha256 || { echo "FAIL: baseline manquant"; exit 1; }
test -f governance/runtime/DRIFT_RULES.md || { echo "FAIL: drift rules manquant"; exit 1; }
test -d governance/runtime/SNAPSHOT || { echo "FAIL: SNAPSHOT/ manquant"; exit 1; }
```

**Si UN SEUL fichier manque → FAIL + liste exacte + STOP.**

### 1.2 Vérification git clean

```bash
git status --porcelain
# DOIT ÊTRE VIDE (ou seulement governance/runtime/*)
# Si modifs hors governance/ → verdict=FAIL + notes="Uncommitted changes detected"
```

### 1.3 Vérification Phase C SEALED

```bash
# Vérifier tag phase-c-sealed existe
git tag | grep -q "phase-c-sealed" || { echo "FAIL: Phase C not sealed"; exit 1; }

# Vérifier aucune modification depuis seal
git diff phase-c-sealed..HEAD -- ':!governance/' ':!sessions/' ':!nexus/proof/' | wc -l
# DOIT ÊTRE 0 (sauf governance/sessions/nexus autorisés)
```

**Si code BUILD modifié post-seal → verdict=INCIDENT + STOP.**

---

## 🧪 SECTION 2 — CONTRAT DE PREUVE (HIÉRARCHIE)

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   NORMATIF (autorité ABSOLUE):                                                        ║
║   • Exit code (0 = PASS, ≠0 = FAIL)                                                   ║
║   • Console stdout/stderr                                                             ║
║   • Compteur tests (ex: "4941 passed")                                                ║
║                                                                                       ║
║   NON-NORMATIF (TOOLING):                                                             ║
║   • Reporter JSON                                                                     ║
║   • Timestamps internes                                                               ║
║   • Métriques perf                                                                    ║
║   • Stack traces internes                                                             ║
║                                                                                       ║
║   RÈGLE: Console > JSON                                                               ║
║          Si divergence → TOOLING_DRIFT (non bloquant)                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## ⚙️ SECTION 3 — SÉQUENCE D'EXÉCUTION (STRICTE)

### ÉTAPE 3.1 — Collecter métadonnées git (READ-ONLY)

```bash
# Variables
COMMIT=$(git rev-parse HEAD)
COMMIT_SHORT=$(git rev-parse --short HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TAG=$(git describe --tags --exact-match 2>/dev/null || echo "none")
TIMESTAMP_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TIMESTAMP_COMPACT=$(date -u +"%Y%m%d_%H%M%S")

# Baseline (lecture)
BASELINE_REF=$(cat governance/runtime/BASELINE_REF.sha256 | head -1)
```

**Output attendu:**
```
commit: abc123def456...
tag: phase-c-sealed (ou none)
branch: phase-q-seal-tests
baseline: 62c48cc481cc59e907673476e3e672ca41d711bb0e1c78b5ecb33cb5d7221e8f
```

---

### ÉTAPE 3.2 — Exécuter preuve normative

```bash
# Créer dossier proof si absent
mkdir -p nexus/proof

# Exécuter tests + capturer console
npm test > nexus/proof/vitest_console_report_PHASE_D.txt 2>&1
EXIT_CODE=$?

# Extraire compteur
TESTS_PASSED=$(grep -oP '\d+ passed' nexus/proof/vitest_console_report_PHASE_D.txt | head -1 || echo "0 passed")
TESTS_FAILED=$(grep -oP '\d+ failed' nexus/proof/vitest_console_report_PHASE_D.txt | head -1 || echo "0 failed")
```

**Calcul output_hash (DÉTERMINISTE):**
```bash
# Hash du rapport console (preuve normative)
OUTPUT_HASH=$(sha256sum nexus/proof/vitest_console_report_PHASE_D.txt | cut -d' ' -f1)
```

**Détermination verdict normatif:**
```bash
if [ $EXIT_CODE -eq 0 ] && [[ "$TESTS_FAILED" == "0 failed" ]]; then
  VERDICT_NORMATIF="PASS"
else
  VERDICT_NORMATIF="FAIL"
fi
```

---

### ÉTAPE 3.3 — Générer RUNTIME_EVENT.json

```bash
# Event ID unique
EVENT_ID="RTE_${TIMESTAMP_COMPACT}_$(echo -n "$COMMIT$TIMESTAMP_UTC" | sha256sum | cut -c1-8)"

# Input hash (déterministe)
INPUT_HASH=$(echo -n "npm test" | sha256sum | cut -d' ' -f1)

# Notes factuelles
if [ "$VERDICT_NORMATIF" == "PASS" ]; then
  NOTES="Tests passed. Console: $TESTS_PASSED. Exit: $EXIT_CODE."
else
  NOTES="Tests failed. Console: $TESTS_FAILED. Exit: $EXIT_CODE. Check nexus/proof/vitest_console_report_PHASE_D.txt"
fi
```

**Création RUNTIME_EVENT.json:**
```json
{
  "event_id": "$EVENT_ID",
  "timestamp_utc": "$TIMESTAMP_UTC",
  "phase": "D",
  "build_ref": {
    "commit": "$COMMIT",
    "tag": "$TAG"
  },
  "operation": "npm_test",
  "input_hash": "$INPUT_HASH",
  "output_hash": "$OUTPUT_HASH",
  "verdict": "$VERDICT_NORMATIF",
  "notes": "$NOTES"
}
```

**Écriture (ÉCRASER fichier):**
```bash
cat > governance/runtime/RUNTIME_EVENT.json << EOF
{...}
EOF
```

---

### ÉTAPE 3.4 — Append GOVERNANCE_LOG.ndjson

**Classification drift:**
```bash
# Compter événements précédents
EVENTS_COUNT=$(wc -l < governance/runtime/GOVERNANCE_LOG.ndjson)

# Classification
if [ "$VERDICT_NORMATIF" == "PASS" ]; then
  CLASSIFICATION="STABLE"
  ANOMALIES_COUNT=0
elif [ "$VERDICT_NORMATIF" == "FAIL" ]; then
  CLASSIFICATION="PRODUCT_DRIFT"
  ANOMALIES_COUNT=1
else
  CLASSIFICATION="TOOLING_DRIFT"
  ANOMALIES_COUNT=0
fi
```

**Append UNE ligne (JAMAIS réécrire):**
```bash
echo "{\"event_id\":\"$EVENT_ID\",\"timestamp_utc\":\"$TIMESTAMP_UTC\",\"commit\":\"$COMMIT_SHORT\",\"tag\":\"$TAG\",\"verdict\":\"$VERDICT_NORMATIF\",\"output_hash\":\"$OUTPUT_HASH\",\"anomalies_count\":$ANOMALIES_COUNT,\"classification\":\"$CLASSIFICATION\"}" >> governance/runtime/GOVERNANCE_LOG.ndjson
```

---

### ÉTAPE 3.5 — Snapshot périodique (CONDITIONNEL)

**Conditions snapshot:**
```bash
# Date du jour UTC
TODAY_UTC=$(date -u +"%Y%m%d")

# Dernier snapshot
LAST_SNAPSHOT=$(ls -1 governance/runtime/SNAPSHOT/SNAPSHOT_*.json 2>/dev/null | tail -1)
LAST_SNAPSHOT_DATE=""
if [ -n "$LAST_SNAPSHOT" ]; then
  LAST_SNAPSHOT_DATE=$(basename "$LAST_SNAPSHOT" | grep -oP '\d{8}' | head -1)
fi

# Créer snapshot SI:
# - Premier run du jour OU
# - Anomalie détectée OU
# - Aucun snapshot existant
CREATE_SNAPSHOT=0
if [ -z "$LAST_SNAPSHOT" ] || [ "$LAST_SNAPSHOT_DATE" != "$TODAY_UTC" ] || [ $ANOMALIES_COUNT -gt 0 ]; then
  CREATE_SNAPSHOT=1
fi
```

**Génération snapshot:**
```bash
if [ $CREATE_SNAPSHOT -eq 1 ]; then
  # Compter anomalies totales
  ANOMALIES_TOTAL=$(grep -c '"classification":"PRODUCT_DRIFT"' governance/runtime/GOVERNANCE_LOG.ndjson || echo 0)
  TOOLING_DRIFT_TOTAL=$(grep -c '"classification":"TOOLING_DRIFT"' governance/runtime/GOVERNANCE_LOG.ndjson || echo 0)
  
  # Statut global
  if [ $ANOMALIES_TOTAL -eq 0 ]; then
    STATUS="STABLE"
  else
    STATUS="UNSTABLE"
  fi
  
  SNAPSHOT_FILE="governance/runtime/SNAPSHOT/SNAPSHOT_${TIMESTAMP_COMPACT}.json"
  
  cat > "$SNAPSHOT_FILE" << EOF
{
  "snapshot_id": "SNAP_${TIMESTAMP_COMPACT}",
  "timestamp_utc": "$TIMESTAMP_UTC",
  "baseline_ref": "$BASELINE_REF",
  "last_event_id": "$EVENT_ID",
  "events_count_total": $((EVENTS_COUNT + 1)),
  "anomalies": {
    "tooling_drift": $TOOLING_DRIFT_TOTAL,
    "product_drift": $ANOMALIES_TOTAL,
    "incidents": 0
  },
  "status": "$STATUS",
  "notes": "Snapshot created: first run of day or anomaly detected"
}
EOF
fi
```

---

### ÉTAPE 3.6 — Détection violations contractuelles

**Vérifier écriture illégale:**
```bash
# Lister fichiers modifiés hors governance/
ILLEGAL_WRITES=$(git status --porcelain | grep -v '^?? governance/' | grep -v '^?? nexus/proof/' | grep -v '^?? sessions/' || echo "")

if [ -n "$ILLEGAL_WRITES" ]; then
  # INCIDENT MAJEUR
  INCIDENT_ID="INC_${TIMESTAMP_COMPACT}"
  
  cat > "governance/runtime/INCIDENT_${INCIDENT_ID}.md" << EOF
# INCIDENT MAJEUR — $INCIDENT_ID

**Timestamp**: $TIMESTAMP_UTC
**Type**: ILLEGAL_WRITE_BUILD_SEALED
**Gravité**: CRITIQUE

## Violation détectée

Écriture illégale dans zone BUILD SEALED:

\`\`\`
$ILLEGAL_WRITES
\`\`\`

## Action requise

1. Rollback immédiat
2. Investigation cause racine
3. Correction protocole

## Référence

- OMEGA_BUILD_GOVERNANCE_CONTRACT.md §5
- Invariant INV-D-03: Aucune écriture BUILD SEALED
EOF
  
  echo "❌ INCIDENT: ILLEGAL_WRITE_BUILD_SEALED → governance/runtime/INCIDENT_${INCIDENT_ID}.md"
  exit 1
fi
```

---

## 📊 SECTION 4 — SORTIE FINALE (FORMAT OBLIGATOIRE)

```bash
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                                  ║"
echo "║  PHASE D RUN — RUNTIME GOVERNANCE                                                ║"
echo "║                                                                                  ║"
echo "╠══════════════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                                  ║"
printf "║  Commit:       %-63s║\n" "$COMMIT_SHORT"
printf "║  Tag:          %-63s║\n" "$TAG"
printf "║  Branch:       %-63s║\n" "$BRANCH"
printf "║  Baseline:     %-63s║\n" "${BASELINE_REF:0:16}..."
echo "║                                                                                  ║"
printf "║  Git clean:    %-63s║\n" "YES"
printf "║  Exit code:    %-63s║\n" "$EXIT_CODE"
printf "║  Verdict:      %-63s║\n" "$VERDICT_NORMATIF"
echo "║                                                                                  ║"
printf "║  Event ID:     %-63s║\n" "$EVENT_ID"
printf "║  Output hash:  %-63s║\n" "${OUTPUT_HASH:0:16}..."
echo "║                                                                                  ║"
echo "╠══════════════════════════════════════════════════════════════════════════════════╣"
echo "║  ARTEFACTS                                                                       ║"
echo "╠══════════════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                                  ║"
echo "║  ✅ governance/runtime/RUNTIME_EVENT.json                                        ║"
echo "║  ✅ governance/runtime/GOVERNANCE_LOG.ndjson (appended)                          ║"
if [ $CREATE_SNAPSHOT -eq 1 ]; then
printf "║  ✅ %-77s║\n" "$(basename "$SNAPSHOT_FILE")"
else
echo "║  ⏸️  No snapshot (stable, same day)                                              ║"
fi
echo "║  ✅ nexus/proof/vitest_console_report_PHASE_D.txt                                ║"
echo "║                                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════════════════════╝"
echo ""

if [ "$VERDICT_NORMATIF" == "FAIL" ] || [ $ANOMALIES_COUNT -gt 0 ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════════════════════╗"
  echo "║                                                                                  ║"
  echo "║  ⚠️  ESCALADE HUMAINE REQUISE                                                    ║"
  echo "║                                                                                  ║"
  echo "╠══════════════════════════════════════════════════════════════════════════════════╣"
  echo "║                                                                                  ║"
  echo "║  Raison: $CLASSIFICATION                                                         ║"
  echo "║                                                                                  ║"
  echo "║  Fichiers à examiner:                                                            ║"
  echo "║  • nexus/proof/vitest_console_report_PHASE_D.txt                                 ║"
  echo "║  • governance/runtime/RUNTIME_EVENT.json                                         ║"
  echo "║  • governance/runtime/DRIFT_RULES.md                                             ║"
  echo "║                                                                                  ║"
  echo "║  Action: Review anomaly → décision humaine (accept/override/rollback)            ║"
  echo "║                                                                                  ║"
  echo "╚══════════════════════════════════════════════════════════════════════════════════╝"
  echo ""
fi
```

---

## 🔐 SECTION 5 — CHECKLIST FINALE (AUTO-AUDIT)

```bash
# Vérifier invariants Phase D
echo "🔍 Vérification invariants Phase D..."

# INV-D-01: Pas d'exécution sans RUNTIME_EVENT
test -f governance/runtime/RUNTIME_EVENT.json || { echo "❌ INV-D-01 FAIL"; exit 1; }

# INV-D-02: Log append-only (vérifier pas de suppression)
CURRENT_LINES=$(wc -l < governance/runtime/GOVERNANCE_LOG.ndjson)
test $CURRENT_LINES -ge $EVENTS_COUNT || { echo "❌ INV-D-02 FAIL: Log lines decreased"; exit 1; }

# INV-D-03: Aucune écriture BUILD SEALED (déjà vérifié étape 3.6)

# INV-D-04: Baseline immuable
CURRENT_BASELINE=$(cat governance/runtime/BASELINE_REF.sha256 | head -1)
test "$CURRENT_BASELINE" == "$BASELINE_REF" || { echo "❌ INV-D-04 FAIL: Baseline modified"; exit 1; }

# INV-D-05: Aucune auto-correction (vérifier git diff)
AUTO_CORRECTION=$(git diff HEAD -- ':!governance/' ':!nexus/proof/' ':!sessions/' | wc -l)
test $AUTO_CORRECTION -eq 0 || { echo "❌ INV-D-05 FAIL: Auto-correction detected"; exit 1; }

# INV-D-06: Toute anomalie escaladée (déjà fait si FAIL)

echo "✅ Tous invariants Phase D respectés"
```

---

## 📚 SECTION 6 — RÉFÉRENCES

| Document | Rôle |
|----------|------|
| governance/runtime/00_README_PHASE_D.md | Point d'entrée |
| governance/runtime/GOVERNANCE_CHARTER_PHASE_D.md | Charte contractuelle |
| governance/runtime/DRIFT_RULES.md | Classification écarts |
| OMEGA_BUILD_GOVERNANCE_CONTRACT.md | Contrat liant |
| OMEGA_GOVERNANCE_ROADMAP_v1.0.md | Roadmap Phase D |

---

## 🎯 SECTION 7 — RÉSUMÉ ULTRA-COMPACT

```
1. Vérifier préconditions (arborescence + git clean + Phase C sealed)
2. Collecter métadonnées git (commit, tag, baseline)
3. Exécuter npm test → capturer console → calculer hash
4. Créer RUNTIME_EVENT.json (event_id unique)
5. Append GOVERNANCE_LOG.ndjson (UNE ligne)
6. Snapshot si: premier run jour OU anomalie
7. Vérifier pas d'écriture illégale (BUILD SEALED)
8. Afficher résultat + escalade si FAIL
9. Auto-audit invariants
10. STOP (JAMAIS corriger)
```

---

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   PROMPT CLAUDE CODE — PHASE D ULTIMATE v1.0                                          ║
║                                                                                       ║
║   Status: PRODUCTION-READY                                                            ║
║   Mode: FULL AUTONOMOUS                                                               ║
║   Standard: NASA-Grade L4                                                             ║
║                                                                                       ║
║   Fusion: Claude + ChatGPT                                                            ║
║   Date: 2026-02-04                                                                    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU PROMPT CLAUDE CODE PHASE D ULTIMATE v1.0**
