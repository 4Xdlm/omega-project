# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA POLICY v9.1
# Règles d'Exécution et de Gouvernance
# ═══════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   OMEGA POLICY v9.1                                                           ║
║   Date: 2026-01-11                                                            ║
║   Status: ACTIVE                                                              ║
║   Standard: NASA-Grade L4 / DO-178C                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. RÈGLES FONDAMENTALES

### 1.1 Hiérarchie d'Autorité

```yaml
hierarchy:
  level_1: "Architecte Suprême (Francky)"
  level_2: "IA Principal (Claude)"
  level_3: "Consultants (ChatGPT, Gemini)"
  
authority:
  francky: ABSOLUTE
  claude: EXECUTION
  consultants: ADVISORY
```

### 1.2 Standards Exigés

| Standard | Description | Obligatoire |
|----------|-------------|-------------|
| NASA-Grade L4 | Engineering critique niveau maximum | ✅ OUI |
| AS9100D | Aerospace Quality Management | ✅ OUI |
| DO-178C | Logique de sûreté logicielle | ✅ OUI |
| MIL-STD | Standards militaires de fiabilité | ✅ OUI |

---

## 2. RÈGLES DE CODE

### 2.1 Validation Obligatoire

```yaml
code_rules:
  tests_required: true
  coverage_minimum: 80%
  determinism: required
  hash_verification: required
  
forbidden:
  - TODO
  - FIXME
  - TBD
  - "à faire"
  - "plus tard"
```

### 2.2 Commits

```yaml
commit_format: "type(scope): description [INV-xxx]"

types:
  - feat      # Nouvelle fonctionnalité
  - fix       # Correction de bug
  - docs      # Documentation
  - test      # Tests
  - refactor  # Refactoring
  - perf      # Performance
  - chore     # Maintenance

scope_required: true
invariant_reference: required
```

---

## 3. RÈGLES DE DOCUMENTATION

### 3.1 Format Obligatoire

```yaml
documentation:
  format: markdown
  encoding: UTF-8
  hash: SHA-256
  
required_sections:
  - EN-TÊTE (date, version, auteur)
  - OBJECTIF
  - CONTENU
  - PREUVES
  - SIGNATURES
```

### 3.2 Naming Convention

| Type | Convention | Exemple |
|------|------------|---------|
| Fichiers | UPPER_SNAKE_CASE.md | `CERTIFICATION_PHASE_29.md` |
| Modules | kebab-case | `integration-nexus-dep` |
| Invariants | INV-BLOC-XX | `INV-CORE-01` |
| Versions | vMAJOR.MINOR.PATCH | `v3.61.0` |

---

## 4. RÈGLES DE TEST

### 4.1 Exigences

```yaml
testing:
  unit_tests: required
  integration_tests: required
  edge_cases: required
  
execution:
  before_commit: true
  before_merge: true
  after_deploy: true
  
failure_policy:
  any_failure: BLOCK_MERGE
  flaky_test: INVESTIGATE
```

### 4.2 Couverture

| Bloc | Minimum | Cible |
|------|---------|-------|
| Core | 90% | 100% |
| Integration | 80% | 95% |
| UI | 70% | 85% |

---

## 5. RÈGLES DE SÉCURITÉ

### 5.1 Données

```yaml
security:
  sensitive_data: NEVER_IN_REPO
  credentials: ENVIRONMENT_ONLY
  logs: NO_PII
  
encryption:
  at_rest: AES-256
  in_transit: TLS 1.3
```

### 5.2 Accès

```yaml
access:
  master_branch: PROTECTED
  direct_push: FORBIDDEN
  review_required: true
  approvers_minimum: 1
```

---

## 6. RÈGLES DE DÉPLOIEMENT

### 6.1 Process

```yaml
deployment:
  stages:
    - build
    - test
    - review
    - deploy
    
rollback:
  automatic: true
  trigger: "test_failure OR health_check_failure"
  
verification:
  hash_check: required
  smoke_test: required
```

### 6.2 Environnements

| Env | Protection | Accès |
|-----|------------|-------|
| dev | Aucune | Tous |
| staging | Tests requis | Équipe |
| production | Approbation + Tests | Architecte |

---

## 7. RÈGLES DE SESSION

### 7.1 Ouverture

```yaml
session_start:
  read_docs: MANDATORY
  comprehension_check: MANDATORY
  wait_validation: MANDATORY
  
required_docs:
  - 00_INDEX_MASTER.md
  - OMEGA_SUPREME_v1.0.md
  - Dernier SESSION_SAVE
```

### 7.2 Clôture

```yaml
session_end:
  question_required: true
  question_text: |
    "Architecte, m'autorises-tu à rédiger le document historique officiel
    SESSION_SAVE reprenant toutes les preuves, le code et la certification
    pour mise à jour du Master Dossier ?"
  
deliverables:
  - SESSION_SAVE_[DATE].md
  - CHANGELOG update
  - Hash verification
```

---

## 8. INTERDICTIONS ABSOLUES

```yaml
forbidden_actions:
  - Approximation sans mesure
  - Code partiellement fonctionnel
  - Optimisation non faite
  - Dette "temporaire"
  - Validation sans test
  - Documentation sans preuve
  - Chiffre inventé
  - Risque masqué

forbidden_words:
  - "environ"
  - "normalement"
  - "ça devrait"
  - "probablement"
  - "robuste" (sans test)
  - "rapide" (sans mesure)
  - "optimisé" (sans benchmark)
```

---

## 9. MÉTRIQUES DE QUALITÉ

| Métrique | Cible | Description |
|----------|-------|-------------|
| Efficacité | 2000% | Un effort = 20x résultats |
| Inventivité | 10000% | Solutions jamais pensées |
| Fonctionnel | 100% | Rien de partiel |
| Déterminisme | 100% | Même input = même output |

---

## 10. ENFORCEMENT

```yaml
enforcement:
  policy_check: AUTOMATED
  violations: BLOCK
  exceptions: NONE
  
monitoring:
  continuous: true
  alerts: IMMEDIATE
  audit_trail: PERMANENT
```

---

## SIGNATURES

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   Document:    POLICY_v9.1.md                                                 ║
║   Date:        2026-01-11                                                     ║
║   Auteur:      Claude (IA Principal)                                          ║
║   Autorité:    Francky (Architecte Suprême)                                   ║
║   Standard:    NASA-Grade L4                                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT POLICY**
