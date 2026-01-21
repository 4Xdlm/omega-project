# OMEGA — PHASE 6: SENTINEL GOVERNANCE

## Statut: ❌ ABSENT (bloqué par Phase 5)

---

## OBJECTIF

Implémenter la **gouvernance machine-level** d'OMEGA.
SENTINEL valide TOUTES les décisions des autres modules.
**Aucune action non validée ne passe.**

---

## ARCHITECTURE SENTINEL

```
┌─────────────────────────────────────────────────────────────────┐
│                         SENTINEL CORE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ JUDGE_V44   │  │ JUDGE_CANON │  │ JUDGE_BUDGET│             │
│  │ Conformité  │  │ Continuité  │  │ Token Meter │             │
│  │ loi émotion │  │ faits       │  │ ressources  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ JUDGE_STYLE │  │ JUDGE_INTENT│  │ JUDGE_LEGAL │             │
│  │ Déviations  │  │ Intention   │  │ Licences    │             │
│  │ assumées    │  │ respectée   │  │ droits      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AUDIT ENGINE                          │   │
│  │  Peut formuler des requêtes vers:                       │   │
│  │  - Snapshots                                            │   │
│  │  - Bibliothèque (docs/canon)                           │   │
│  │  - Lois V4.4                                           │   │
│  │  - Moteur émotion                                      │   │
│  │  - Mémoire                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## MODULES À CRÉER

```
packages/sentinel/
├── src/
│   ├── core/
│   │   ├── sentinel.ts         # Orchestrateur principal
│   │   ├── decision.ts         # Types de décision
│   │   └── verdict.ts          # PASS / FAIL / ASK
│   ├── judges/
│   │   ├── judge-v44.ts        # Conformité V4.4
│   │   ├── judge-canon.ts      # Continuité/canon
│   │   ├── judge-budget.ts     # Token meter
│   │   ├── judge-style.ts      # Déviations style
│   │   ├── judge-intent.ts     # Intention respectée
│   │   └── judge-legal.ts      # Licences
│   └── audit/
│       ├── audit-engine.ts     # Requêtes d'audit
│       └── query-builder.ts    # Construction requêtes
└── tests/
    ├── sentinel.test.ts
    └── judges/*.test.ts
```

---

## INTERFACE SENTINEL

```typescript
interface SentinelDecision {
  action: string;
  module: string;
  payload: unknown;
  timestamp: number;
}

interface SentinelVerdict {
  decision: SentinelDecision;
  verdict: 'PASS' | 'FAIL' | 'ASK';
  judges: JudgeResult[];
  reason?: string;
  auditTrail?: AuditEntry[];
}

interface JudgeResult {
  judgeId: string;
  vote: 'APPROVE' | 'REJECT' | 'ABSTAIN';
  confidence: number;
  reason: string;
}
```

---

## RÈGLES DE GOUVERNANCE

1. **Unanimité requise:** Tous les juges concernés doivent APPROVE
2. **Veto possible:** Un seul REJECT = FAIL global
3. **Audit on-demand:** Si confiance < seuil, audit automatique
4. **Logs immutables:** Chaque décision hashée et archivée

---

## GATE 6

| Critère | Requis |
|---------|--------|
| Tous juges implémentés | ✅ |
| Audit engine fonctionnel | ✅ |
| Tests: décisions bloquées si non conforme | ✅ |
| Logs hashés | ✅ |

**Emplacement proof:** `PROOFS/phase6-SENTINEL/`

---

## PERF AUTORISÉE

✅ **Oui:**
- Latence de validation
- Cache des verdicts
- Parallélisation des juges

---

## PROCHAINE PHASE

→ **PHASE 7: INTENT LAYER** (si GATE 6 = PASS)
