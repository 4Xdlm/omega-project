# SPEC_SENTINEL — Spécification Système de Décision v1.1

## 1. ORACLE

### 1.1 Rôle
Générer des options de décision avec scores calculés, SANS jamais choisir.

### 1.2 Interface
```typescript
interface OracleRequest {
  context: string;           // Contexte de la décision
  constraints: string[];     // Contraintes à respecter
  canon_refs: string[];      // Références CANON pertinentes
}

interface OracleOption {
  id: string;                // Déterministe: hash(request + index)
  description: string;       // Dérivée du contexte
  score: number;             // Calculé selon C_POLICY.json
  score_breakdown: {         // Détail du calcul
    canon_compliance: number;
    risk_mitigation: number;
    complexity: number;
    alignment: number;
  };
  justification: string;
  risks: string[];
  canon_compliance: boolean;
}

interface OracleResponse {
  request_id: string;        // hash(request)
  run_id: string;            // Importé depuis EVIDENCE
  options: OracleOption[];   // Triées par score décroissant
  recommendation: null;      // TOUJOURS null
}
```

### 1.3 Calcul du Score (v1.1)
```
score = τ_weight_canon_compliance * canon_score
      + τ_weight_risk_mitigation * risk_score
      + τ_weight_complexity * (1 - complexity_score)
      + τ_weight_alignment * alignment_score

Où tous les τ_* proviennent de C_POLICY.json
```

### 1.4 Invariants
- INV-ORACLE-01: `recommendation` = null (TOUJOURS)
- INV-ORACLE-02: `options.length >= τ_min_options`
- INV-ORACLE-03: Chaque option a `canon_compliance` explicite
- INV-ORACLE-04: Déterministe (même request → même response)
- INV-ORACLE-05: Aucune constante magique (tout de C_POLICY.json)

---

## 2. DECISION_ENGINE

### 2.1 Rôle
Valider ou rejeter une décision selon CANON et invariants.

### 2.2 Interface
```typescript
interface DecisionRequest {
  oracle_response_id: string;
  selected_option_id: string;
  selector: 'HUMAN' | 'RULE';
  rule_id?: string;
}

interface DecisionVerdict {
  request_id: string;
  run_id: string;
  selected_option_id: string;
  verdict: 'APPROVED' | 'REJECTED' | 'ESCALATE';
  reason: string;
  canon_check: { passed: boolean; violations: string[]; };
  invariant_check: { passed: boolean; violations: string[]; };
  trace_file: string;
}
```

### 2.3 Règles de Verdict
- score >= τ_approval_threshold ET checks OK → APPROVED
- score < τ_escalation_threshold OU checks FAIL → REJECTED
- Entre les deux avec conflits → ESCALATE

### 2.4 Invariants
- INV-DECISION-01: REJECTED si `canon_check.passed = false`
- INV-DECISION-02: REJECTED si `invariant_check.passed = false`
- INV-DECISION-03: ESCALATE si conflit non résolvable
- INV-DECISION-04: Chaque décision = fichier trace JSON

---

## 3. WAIVER EXPIRATION (v1.1)

### 3.1 Vérification Factuelle
L'expiration est déclenchée SI ET SEULEMENT SI:
- Tag git `phase-{X}-sealed` existe, OU
- Fichier `{X}_MANIFEST.sha256` existe

### 3.2 Implémentation
```typescript
function isPhaseSealed(phase: string): boolean {
  // Méthode 1: Tag git
  const tagExists = execSync(`git tag -l "phase-${phase.toLowerCase()}-sealed"`)
    .toString().trim() !== '';

  // Méthode 2: Manifest existe
  const manifestPath = `nexus/proof/phase_${phase.toLowerCase()}_*/${phase.toUpperCase()}_MANIFEST.sha256`;
  const manifestExists = glob.sync(manifestPath).length > 0;

  return tagExists || manifestExists;
}
```
