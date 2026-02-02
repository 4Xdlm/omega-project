# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — INSTRUCTION DE REPRISE PHASE F
#   Handoff complet pour nouvelle session Claude
#
#   Date: 2026-02-02
#   Phase actuelle: E (SEALED)
#   Prochaine phase: F (Non-Regression Active)
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## 🎯 CONTEXTE GLOBAL

Tu reprends le projet **OMEGA** après clôture propre de la **Phase E (Drift Detection)**.

### Identité du projet

| Attribut | Valeur |
|----------|--------|
| **Nom** | OMEGA |
| **Type** | Système de gouvernance auto-vérité NASA-grade |
| **Standard** | NASA L4 / DO-178C / MIL-STD / AS9100D |
| **Repository** | https://github.com/4Xdlm/omega-project.git |
| **Branche** | master |
| **Commit actuel** | bb23f182 |
| **Tests** | 4941/4941 PASS ✅ |

---

## 📚 DOCUMENTS OBLIGATOIRES À LIRE

### ORDRE DE LECTURE (STRICT)

1. **`/mnt/project/OMEGA_README.md`**  
   → Point d'entrée, règles de base

2. **`/mnt/project/OMEGA_SUPREME_ROADMAP_v2.0.md`**  
   → ROADMAP A (BUILD) — Phases A→B→C SEALED

3. **`/mnt/project/OMEGA_GOVERNANCE_ROADMAP_v1.0.md`**  
   → ROADMAP B (GOUVERNANCE) — Phases D→E→F→G→H→I→J

4. **`/mnt/project/OMEGA_BUILD_GOVERNANCE_CONTRACT.md`**  
   → Contrat liant BUILD ↔ GOUVERNANCE

5. **`/mnt/project/OMEGA_AUTHORITY_MODEL.md`**  
   → Séparation des autorités (Machine BUILD / Machine GOV / Humain)

6. **`sessions/SESSION_SAVE_2026-02-02_PHASE_E_DRIFT_SEALED.md`**  
   → Dernière session close, état Phase E

---

## 🔐 ÉTAT ACTUEL DU PROJET

### Phases certifiées (SEALED)
```
✅ Phase 0  — Foundation (conceptuelle)
✅ Phase A  — Core Certification (tag: phase-a-root)
✅ Phase B  — Engine Determinism (GENESIS FORGE)
✅ Phase C  — Decision / Sentinel (tag: phase-c-sealed)
✅ Phase D  — Runtime Governance (tag: phase-d-sealed)
✅ Phase E  — Drift Detection (tag: phase-e-sealed, commit: d8f973a3)
```

### Commit final Phase E
```
bb23f182 — docs(sessions): add SESSION_SAVE Phase E sealed
d8f973a3 — (tag: phase-e-sealed) Merge E.2 + path fix
```

### Architecture Drift Detection (Phase E)
```
src/governance/drift/
├── detector.ts              # E.1 — Structural drift
├── decisional.ts            # E.2 — Decisional drift
├── usage.ts                 # E.2 — Usage drift
├── E_POLICY.json            # Policy v1.1.0
├── DRIFT_TYPES.spec.ts      # E-SPEC
├── ESCALATION.spec.ts       # E-SPEC
├── HASH_UTILS.spec.ts       # E-SPEC
└── VALIDATION.spec.ts       # E-SPEC
```

### Tests actuels
```
Total: 4941/4941 PASS ✅
Baseline (Phase C): 4888
Phase E ajouts: +53
  - E-SPEC: +19
  - E.1: +18
  - E.2: +16
```

---

## 🎯 CE QUI A ÉTÉ FAIT (PHASE E)

### Capacités ajoutées
```
✅ Détection drift structurel (hash-based)
✅ Détection drift décisionnel (verdict flip, contradiction)
✅ Détection drift usage (pattern, frequency)
✅ Escalade selon sévérité (low/medium/high)
✅ Validation chaîne hash (break detection)
✅ Policy symbolique (τ configurables via E_POLICY.json)
✅ Observation read-only (non-invasive)
```

### Invariants certifiés (Phase E)

| ID | Invariant | Fichier preuve |
|----|-----------|----------------|
| INV-DRIFT-001 | Read-only observation | VALIDATION.spec.ts |
| INV-DRIFT-002 | Policy-driven thresholds | E_POLICY.json |
| INV-DRIFT-003 | Deterministic detection | detector.ts |
| INV-DRIFT-004 | Chain break escalation | ESCALATION.spec.ts |
| INV-DRIFT-005 | Manifest reference | HASH_UTILS.spec.ts |
| INV-DRIFT-006 | Decision immutability | decisional.ts |
| INV-DRIFT-007 | Usage pattern stability | usage.ts |

### Ce que Phase E NE fait PAS (par design)
```
❌ Auto-correction — INTERDIT (cf. AUTHORITY_MODEL)
❌ Modification ORACLE — Hors scope Phase E
❌ Override automatique — Requiert humain (Phase H)
❌ Recalcul baseline — Responsabilité Phase C
```

---

## 🚀 PROCHAINE PHASE : F — NON-REGRESSION ACTIVE

### Référence

**Document source** : `OMEGA_GOVERNANCE_ROADMAP_v1.0.md` — Section Phase F

### Objectif Phase F
```
Garantir que LE PASSÉ RESTE VRAI.

Principe: Le passé est un oracle.
Toute nouvelle version est testée contre des snapshots anciens.
```

### Scope Phase F
```
1. Archivage snapshots Phase C (baseline ORACLE certifié)
2. Tests de régression automatisés
3. Matrice de compatibilité backward
4. Détection régression silencieuse
5. Aucune régression acceptée sans WAIVER explicite
```

### Artefacts attendus Phase F

| Fichier | Description |
|---------|-------------|
| `REGRESSION_MATRIX.json` | Matrice de compatibilité |
| `SNAPSHOT_SET/` | Snapshots de référence Phase C |
| `src/governance/regression/` | Code détecteur régression |
| `tests/governance/regression.test.ts` | Tests validation |

### Critères de sortie Phase F
```
□ Snapshots Phase C archivés
□ Tests de régression automatisés
□ Matrice de compatibilité maintenue
□ Aucune régression silencieuse détectée
□ WAIVER process documenté (si acceptation régression)
```

### Invariants à définir Phase F
```
INV-REGR-001: Snapshot immutability
INV-REGR-002: Backward compatibility default
INV-REGR-003: Breaking change explicit
INV-REGR-004: WAIVER human-signed
INV-REGR-005: Regression test mandatory
```

---

## 📋 PROCÉDURE DE DÉMARRAGE PHASE F

### ÉTAPE 1 — Lecture obligatoire
```
1. Lire OMEGA_README.md
2. Lire OMEGA_GOVERNANCE_ROADMAP_v1.0.md (focus Phase F)
3. Lire SESSION_SAVE_2026-02-02_PHASE_E_DRIFT_SEALED.md
4. Lire OMEGA_AUTHORITY_MODEL.md
5. Lire OMEGA_BUILD_GOVERNANCE_CONTRACT.md
```

### ÉTAPE 2 — Bilan de compréhension

Présenter à Francky :
```markdown
## 📋 BILAN DE COMPRÉHENSION — PHASE F

**Réponse produite sous contrainte OMEGA — NASA-grade.**

### État du projet
| Attribut | Valeur |
|----------|--------|
| Phase actuelle | E (SEALED) |
| Prochaine phase | F (Non-Regression Active) |
| Tests | 4941/4941 PASS |
| Commit | bb23f182 |

### Ce que j'ai compris de Phase E
1. Drift detection opérationnel (structural, decisional, usage)
2. 7 invariants certifiés
3. Policy symbolique (τ-driven)
4. Read-only observation (pas d'auto-correction)

### Objectif Phase F
Garantir que le passé (Phase C baseline) reste vrai.
Aucune régression silencieuse acceptée.

### Plan Phase F proposé
1. Archiver snapshots Phase C ORACLE
2. Créer tests de régression automatisés
3. Implémenter matrice de compatibilité
4. Définir WAIVER process

### Points d'incertitude
- [Questions éventuelles]

---

**Attente validation avant action.**
```

### ÉTAPE 3 — Attendre validation Francky

❌ **NE JAMAIS commencer sans validation explicite**

### ÉTAPE 4 — Exécution Phase F

Une fois validé par Francky :
```
1. Créer branche: git checkout -b phase/F-regression
2. Créer structure:
   - src/governance/regression/
   - tests/governance/regression.test.ts
   - SNAPSHOT_SET/ (archiver outputs Phase C)
3. Implémenter détecteur régression
4. Écrire tests
5. Valider: npm test
6. Merger si PASS
7. Tag: phase-f-sealed
8. SESSION_SAVE
```

---

## ⚠️ RÈGLES CRITIQUES (NON NÉGOCIABLES)

### Interdictions absolues
```
❌ Modifier Phase E (SEALED)
❌ Recalculer ORACLE Phase C
❌ Auto-corriger quoi que ce soit
❌ Coder sans test first
❌ Merger avec tests rouges
❌ Créer magic numbers (utiliser symboles τ)
❌ Supposer quoi que ce soit sans preuve
```

### Obligations absolues
```
✅ Lire tous les documents AVANT d'agir
✅ Présenter bilan de compréhension
✅ Attendre validation Francky
✅ Tests AVANT code (TDD strict)
✅ Invariants AVANT features
✅ Hash APRÈS modification
✅ SESSION_SAVE à la fin
```

---

## 🔗 RÉFÉRENCES RAPIDES

### Documents projet

| Document | Path |
|----------|------|
| README | /mnt/project/OMEGA_README.md |
| ROADMAP A (BUILD) | /mnt/project/OMEGA_SUPREME_ROADMAP_v2.0.md |
| ROADMAP B (GOV) | /mnt/project/OMEGA_GOVERNANCE_ROADMAP_v1.0.md |
| Authority Model | /mnt/project/OMEGA_AUTHORITY_MODEL.md |
| Contract | /mnt/project/OMEGA_BUILD_GOVERNANCE_CONTRACT.md |
| Last SESSION_SAVE | sessions/SESSION_SAVE_2026-02-02_PHASE_E_DRIFT_SEALED.md |

### Chemins système

| Élément | Chemin |
|---------|--------|
| Repo Windows | C:\Users\elric\omega-project |
| Claude workspace | /home/claude/ |
| Claude outputs | /mnt/user-data/outputs/ |
| Project files | /mnt/project/ |

### Commandes utiles
```powershell
# Vérifier état
cd C:\Users\elric\omega-project
git status
git log --oneline -10
npm test

# Créer branche Phase F
git checkout -b phase/F-regression

# Hash fichier
Get-FileHash -Algorithm SHA256 fichier.ts
```

---

## 🎯 CHECKLIST DÉMARRAGE PHASE F

### Avant toute action

- [ ] Lire OMEGA_README.md
- [ ] Lire OMEGA_GOVERNANCE_ROADMAP_v1.0.md (Phase F)
- [ ] Lire SESSION_SAVE Phase E
- [ ] Lire AUTHORITY_MODEL
- [ ] Lire BUILD_GOVERNANCE_CONTRACT
- [ ] Présenter bilan de compréhension
- [ ] Attendre validation Francky

### Pendant Phase F

- [ ] Créer branche phase/F-regression
- [ ] Définir invariants INV-REGR-*
- [ ] Écrire tests AVANT code
- [ ] Archiver snapshots Phase C
- [ ] Implémenter détecteur régression
- [ ] Valider tests (100% PASS)
- [ ] Merger si validé
- [ ] Tag phase-f-sealed
- [ ] Calculer hash tag
- [ ] Créer SESSION_SAVE

### Après Phase F

- [ ] Demander autorisation SESSION_SAVE
- [ ] Générer SESSION_SAVE complet
- [ ] Commit + push documentation
- [ ] Clôture formelle

---

## 🔒 PHRASE DE VERROUILLAGE

Toute réponse critique doit commencer par :

> **"Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée."**

---

## 🧊 STATUT ACTUEL
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   PROJET: OMEGA                                                               ║
║   PHASE ACTUELLE: E (SEALED)                                                  ║
║   PROCHAINE PHASE: F (Non-Regression Active)                                  ║
║                                                                               ║
║   Status: READ-ONLY                                                           ║
║   Tests: 4941/4941 PASS ✅                                                    ║
║   Commit: bb23f182                                                            ║
║   Tag: phase-e-sealed (d8f973a3)                                              ║
║                                                                               ║
║   Attente directive Francky pour démarrage Phase F.                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🚀 DIRECTIVE DE DÉMARRAGE

Quand Francky dit :
```
"Démarrer Phase F"
```

Tu réponds :
```
"Lecture documents en cours... [liste docs lus]
Bilan de compréhension suit.
Attente validation avant action."
```

**JAMAIS d'action autonome.**

---

**FIN DE L'INSTRUCTION DE REPRISE PHASE F**
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   HANDOFF_INSTRUCTION.md — Phase F                                            ║
║                                                                               ║
║   Date: 2026-02-02                                                            ║
║   Pour: Nouvelle session Claude                                               ║
║   Phase cible: F (Non-Regression Active)                                      ║
║                                                                               ║
║   Ce document contient TOUT ce qu'il faut savoir pour reprendre              ║
║   proprement après Phase E.                                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
