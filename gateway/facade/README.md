# OMEGA GATEWAY

## Phase 17 — Unified Security Entry Point

> Single entry point: `Gateway.run(input, context)`

## 🔐 Pipeline

```
INPUT → RATE_LIMITER → SENTINEL → QUARANTINE → OUTPUT
         (throttle)    (validate)   (isolate)
```

## 📋 Features

| Stage | Function |
|-------|----------|
| Rate Limiting | Reject floods before expensive analysis |
| Validation | XSS, SQL Injection, Path Traversal, Command Injection |
| Quarantine | Isolate high-severity threats |
| Metrics | Complete tracking & statistics |

## 🔒 Invariants

| ID | Description | Status |
|----|-------------|--------|
| INV-GW-01 | Rate limit checked before validation | ✅ PROUVÉ |
| INV-GW-02 | Blocked input never reaches output | ✅ PROUVÉ |
| INV-GW-03 | Quarantine preserves original data | ✅ PROUVÉ |
| INV-GW-04 | Result always contains complete context | ✅ PROUVÉ |
| INV-GW-05 | Metrics accurate | ✅ PROUVÉ |
| INV-GW-06 | Deterministic processing | ✅ PROUVÉ |

## 🚀 Usage

```typescript
import { Gateway, createContext, GatewayStatus } from '@omega/gateway';

// Create gateway
const gateway = new Gateway({
  rateLimit: 100,
  rateWindowMs: 60000,
  strictMode: false,
});

// Create context
const ctx = createContext('user-123', 'req-456', { role: 'admin' });

// Process request
const result = await gateway.run({ data: userInput }, ctx);

if (result.status === GatewayStatus.ALLOWED) {
  // Safe to process
  processData(result.data);
} else if (result.status === GatewayStatus.RATE_LIMITED) {
  // Too many requests
  return res.status(429).send('Rate limited');
} else if (result.status === GatewayStatus.BLOCKED) {
  // Critical threat detected
  logThreat(result.threats);
  return res.status(403).send('Blocked');
} else if (result.status === GatewayStatus.QUARANTINED) {
  // Data quarantined for review
  notifyAdmin(result.reports.quarantine?.quarantineId);
}
```

## 📊 Metrics

```typescript
const metrics = gateway.getMetrics();
console.log(`Total: ${metrics.totalRequests}`);
console.log(`Allowed: ${metrics.allowed}`);
console.log(`Blocked: ${metrics.blocked}`);
console.log(`Allow rate: ${metrics.allowRate}%`);
```

## 🪝 Hooks

```typescript
gateway.onBefore((input, ctx) => {
  console.log(`Processing ${ctx.requestId}`);
});

gateway.onAfter((result) => {
  console.log(`Result: ${result.status}`);
});

gateway.onError((error, ctx) => {
  console.error(`Error in ${ctx.requestId}:`, error);
});
```

## 📁 Structure

```
src/gateway/
├── constants.ts  — Status, Stages, Defaults
├── types.ts      — Interfaces
├── gateway.ts    — Core implementation
└── index.ts      — Exports
```

## 📦 Versions

- **GATEWAY**: v3.17.0
- **CHAOS_HARNESS**: v3.16.4
- **RATE_LIMITER**: v3.16.3
- **QUARANTINE_V2**: v3.16.2
- **SENTINEL**: v3.16.1
- **NEXUS_CORE**: v3.15.0

---

*OMEGA Project — Phase 17 Gateway Facade*
*NASA-Grade Quality*
