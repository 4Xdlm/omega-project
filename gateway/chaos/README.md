# OMEGA CHAOS_HARNESS

## Phase 16.4 — Fault Injection & Resilience Testing

> Ingénierie du chaos contrôlée

## 📋 Types de Fautes

| Type | Description |
|------|-------------|
| `LATENCY` | Ajoute un délai |
| `ERROR` | Lance une erreur |
| `NULL_RESPONSE` | Retourne null |
| `CORRUPT_DATA` | Corrompt les données |
| `TIMEOUT` | Ne répond jamais |
| `INTERMITTENT` | Échecs intermittents |

## 🔒 Invariants

| ID | Description | Status |
|----|-------------|--------|
| INV-CHA-01 | Faults only injected when enabled | ✅ PROUVÉ |
| INV-CHA-02 | Original behavior preserved when disabled | ✅ PROUVÉ |
| INV-CHA-03 | Fault probability respected | ✅ PROUVÉ |
| INV-CHA-04 | Experiments isolated | ✅ PROUVÉ |
| INV-CHA-05 | Metrics accurate | ✅ PROUVÉ |
| INV-CHA-06 | Safe shutdown | ✅ PROUVÉ |

## 🚀 Usage

```typescript
import { ChaosHarness, FaultType } from '@omega/chaos-harness';

// Créer une instance
const chaos = new ChaosHarness({ enabled: false });

// Enregistrer une faute
const faultId = chaos.registerFault({
  type: FaultType.LATENCY,
  latencyMs: 500,
  probability: 0.1, // 10% chance
  target: 'api/',   // Pattern matching
});

// Activer le chaos
chaos.enable();

// Wrapper une fonction
const result = await chaos.injectWithBehavior(
  { operation: 'api/users' },
  () => fetchUsers()
);

if (result.faultInjected) {
  console.log('Fault was injected!');
}

// Créer une expérience
const expId = chaos.startExperiment({
  name: 'Latency Test',
  faults: [
    { type: FaultType.LATENCY, latencyMs: 200 },
    { type: FaultType.ERROR, probability: 0.05 },
  ],
  durationMs: 60000, // 1 minute
});

// Statistiques
const metrics = chaos.getMetrics();
console.log(`Injection rate: ${metrics.injectionRate}%`);

// Arrêter proprement
chaos.shutdown();
```

## 📊 Métriques

```typescript
const metrics = chaos.getMetrics();
console.log(metrics.totalAttempts);    // Total tentatives
console.log(metrics.totalInjections);  // Total injections
console.log(metrics.injectionRate);    // % injections
console.log(metrics.activeFaults);     // Fautes actives
console.log(metrics.activeExperiments);// Expériences actives
```

## 📁 Structure

```
src/chaos/
├── constants.ts  — FaultTypes, config
├── types.ts      — Interfaces
├── chaos.ts      — Core implementation
└── index.ts      — Exports
```

## 📦 Version

- **CHAOS_HARNESS**: v3.16.4
- **RATE_LIMITER**: v3.16.3
- **QUARANTINE_V2**: v3.16.2
- **SENTINEL**: v3.16.1
- **NEXUS_CORE**: v3.15.0

---

*OMEGA Project — Phase 16.4 CHAOS_HARNESS (FINAL)*
*NASA-Grade Fault Injection*
