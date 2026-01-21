# OMEGA — TOKEN METERING

## Module Transversal — Resource Governance

**Référence:** DEC-20260121-001
**Statut:** Structure dès Phase 1, actif dès Phase 7+

---

## OBJECTIF

Mesurer, tracer, plafonner et prévoir la consommation de ressources (tokens, compute units).
Permettre le contrôle du mode BOOST sans surprises.

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                       TOKEN_METER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   COUNTER       │  │   ESTIMATOR     │  │   BUDGET        │ │
│  │   (usage réel)  │  │   (prévision)   │  │   (limites)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AUDIT LEDGER                          │   │
│  │   Logs hashés, immutables, traçables                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   EXECUTION_MODE       SENTINEL            BOOT/CALL/SAVE
   (OFF/SEMI/BOOST)    (validation)        (état inclus)
```

---

## UNITÉS TRACKÉES

| Unité | Description |
|-------|-------------|
| `token_input` | Tokens en entrée (prompt) |
| `token_output` | Tokens en sortie (réponse) |
| `token_total` | Total consommé |
| `cost_estimate` | Coût estimé (si API tarifée) |
| `latency_estimate` | Latence estimée |

---

## GRANULARITÉ

| Niveau | Description |
|--------|-------------|
| **Module** | Consommation par module (Scribe, GPS, etc.) |
| **Fonction** | Consommation par fonction appelée |
| **Commande** | Consommation par commande CLI |
| **Session** | Total de la session courante |
| **Rolling** | Jour / Semaine glissante |

---

## BUDGETS

| Type | Description |
|------|-------------|
| `budget_session` | Limite par session |
| `budget_day` | Limite journalière |
| `budget_boost` | Limite en mode BOOST |
| `budget_module` | Limite par module (Scribe coûteux, analyse moins) |

---

## POLITIQUE DE DÉPASSEMENT

| Action | Description |
|--------|-------------|
| **DOWNGRADE** | BOOST → SEMI_OFF automatique |
| **STOP** | Bloque l'action |
| **ASK** | Demande validation humaine |

**Règle:** C'est une règle **machine-level**, pas au bon vouloir.

---

## CONNEXIONS

### Avec EXECUTION_MODE

```typescript
interface ExecutionModeConfig {
  mode: 'OFF' | 'SEMI_OFF' | 'BOOST';
  tokenBudget?: number;
  autoDowngrade: boolean;
}
```

### Avec SENTINEL

Règle: **Aucune action consommatrice ne part sans validation SENTINEL**

SENTINEL vérifie:
- Budget restant
- Coût estimé
- Priorité (bloquant / optionnel)
- Autorisation (profil utilisateur)

### Avec BOOT/CALL/SAVE

- **BOOT:** Inclut la situation tokens (budget + consommé)
- **SAVE:** Inclut le ledger tokens de la session

---

## CONTRACT (Structure Phase 1)

```typescript
// packages/resource-governance/src/contract/types.ts

interface TokenUsage {
  input: number;
  output: number;
  total: number;
  timestamp: number;
  module: string;
  function: string;
}

interface TokenEstimate {
  estimated_input: number;
  estimated_output: number;
  estimated_total: number;
  confidence: number; // 0-1
}

interface BudgetPolicy {
  session_limit: number;
  day_limit: number;
  boost_limit: number;
  module_limits: Record<string, number>;
  on_exceed: 'DOWNGRADE' | 'STOP' | 'ASK';
}

type ExecutionMode = 'OFF' | 'SEMI_OFF' | 'BOOST';

interface TokenMeterState {
  current_usage: TokenUsage[];
  total_session: number;
  total_day: number;
  budget: BudgetPolicy;
  mode: ExecutionMode;
}
```

---

## APPLICATION PAR PHASE

| Phase | Application |
|-------|-------------|
| **1** | Définir le format des logs tokens (structure) |
| **2-5** | Tracking minimal (usage dev) |
| **6** | SENTINEL valide budget avant action |
| **7+** | Estimation + budget obligatoires |
| **BOOST** | Aucune action "grosse" sans estimation + validation |

---

## GATE (intégré à Phase 19)

| Critère | Requis |
|---------|--------|
| Counter fonctionnel | ✅ |
| Estimator fonctionnel | ✅ |
| Budget enforcement | ✅ |
| Audit ledger hashé | ✅ |
| Intégration SENTINEL | ✅ |
| Intégration BOOT/SAVE | ✅ |

---

**RÉSULTAT: OMEGA devient pilotable comme une usine.**
