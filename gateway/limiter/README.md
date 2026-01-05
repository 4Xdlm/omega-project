# OMEGA RATE_LIMITER

## Phase 16.3 — Request Throttling

> Limitation de débit multi-stratégies

## 📋 Stratégies

| Stratégie | Description |
|-----------|-------------|
| `FIXED_WINDOW` | Fenêtre fixe (reset complet) |
| `SLIDING_WINDOW` | Fenêtre glissante (expiration individuelle) |
| `TOKEN_BUCKET` | Seau de jetons (refill continu) |
| `LEAKY_BUCKET` | Seau percé (fuite continue) |

## 🔒 Invariants

| ID | Description | Status |
|----|-------------|--------|
| INV-LIM-01 | Request count never exceeds limit | ✅ PROUVÉ |
| INV-LIM-02 | Window reset at correct time | ✅ PROUVÉ |
| INV-LIM-03 | Tokens refill at correct rate | ✅ PROUVÉ |
| INV-LIM-04 | Per-key isolation | ✅ PROUVÉ |
| INV-LIM-05 | Deterministic allow/deny | ✅ PROUVÉ |
| INV-LIM-06 | Stats accurate | ✅ PROUVÉ |

## 🚀 Usage

```typescript
import { RateLimiter, Strategy } from '@omega/rate-limiter';

// Sliding window (recommandé)
const limiter = new RateLimiter({
  strategy: Strategy.SLIDING_WINDOW,
  limit: 100,           // 100 requêtes
  windowMs: 60000,      // par minute
  warningThreshold: 0.8, // warning à 80%
});

// Vérifier une requête
const result = limiter.check('user-123');

if (result.allowed) {
  // Requête autorisée
  console.log(`Remaining: ${result.remaining}`);
} else {
  // Rate limited
  console.log(`Retry in: ${result.resetInMs}ms`);
}

// Token bucket pour burst control
const tokenLimiter = new RateLimiter({
  strategy: Strategy.TOKEN_BUCKET,
  bucketCapacity: 100,
  refillRate: 10, // 10 tokens/seconde
});

// Consommer plusieurs tokens
const consumed = tokenLimiter.consume('user-123', 5);
```

## 📊 Statistiques

```typescript
const stats = limiter.getStats();
console.log(stats.totalChecks);    // Total vérifications
console.log(stats.totalAllowed);   // Total autorisées
console.log(stats.totalDenied);    // Total refusées
console.log(stats.allowRate);      // % autorisées
console.log(stats.activeKeys);     // Clés actives
```

## 📁 Structure

```
src/limiter/
├── constants.ts  — Strategies, limits
├── types.ts      — Interfaces
├── limiter.ts    — Core implementation
└── index.ts      — Exports
```

## 📦 Version

- **RATE_LIMITER**: v3.16.3
- **QUARANTINE_V2**: v3.16.2
- **SENTINEL**: v3.16.1
- **NEXUS_CORE**: v3.15.0

---

*OMEGA Project — Phase 16.3 RATE_LIMITER*
*NASA-Grade Request Throttling*
