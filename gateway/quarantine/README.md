# OMEGA QUARANTINE_V2

## Phase 16.2 — Isolation Chamber

> Système d'isolation sécurisé pour données suspectes

## 📋 Fonctions

| Fonction | Description |
|----------|-------------|
| `quarantine(payload, options)` | Mettre en quarantaine un élément |
| `release(id, options)` | Libérer un élément (avec validation) |
| `inspect(id, options)` | Inspecter un élément en quarantaine |
| `purge(options)` | Supprimer les éléments expirés |
| `list(options)` | Lister les éléments en quarantaine |
| `getStats()` | Obtenir les statistiques |

## 🔒 Invariants

| ID | Description | Status |
|----|-------------|--------|
| INV-QUA-01 | Quarantined item isolated | ✅ PROUVÉ |
| INV-QUA-02 | Metadata always preserved | ✅ PROUVÉ |
| INV-QUA-03 | TTL/expiration enforced | ✅ PROUVÉ |
| INV-QUA-04 | Audit trail immutable | ✅ PROUVÉ |
| INV-QUA-05 | Release requires validation | ✅ PROUVÉ |
| INV-QUA-06 | Deterministic behavior | ✅ PROUVÉ |

## 🚀 Usage

```typescript
import { Quarantine, QuarantineReason, Severity } from '@omega/quarantine';

// Créer une instance
const q = new Quarantine({
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 jours
  maxItems: 10000,
  requireReleaseReason: true,
});

// Mettre en quarantaine
const result = q.quarantine(suspiciousInput, {
  reason: QuarantineReason.SENTINEL_BLOCK,
  reasonMessage: 'XSS pattern detected',
  severity: Severity.HIGH,
});

// Inspecter
const inspection = q.inspect(result.id, { includePayload: true });

// Libérer
const released = q.release(result.id, {
  reason: 'Manually verified as safe',
  releasedBy: 'admin@example.com',
});

// Purger les éléments expirés
q.purgeExpired();

// Statistiques
const stats = q.getStats();
```

## 📊 Reasons

- `SENTINEL_BLOCK` — Bloqué par SENTINEL
- `MALICIOUS_PATTERN` — Pattern malicieux détecté
- `OVERSIZED_PAYLOAD` — Payload trop grand
- `STRUCTURE_VIOLATION` — Violation de structure
- `MANUAL` — Quarantaine manuelle
- `DATA_CORRUPTION` — Corruption de données

## 📁 Structure

```
src/quarantine/
├── constants.ts   — Status, reasons, defaults
├── types.ts       — Interfaces
├── quarantine.ts  — Core implementation
└── index.ts       — Exports
```

## 📦 Version

- **QUARANTINE_V2**: v3.16.2
- **SENTINEL**: v3.16.1
- **NEXUS_CORE**: v3.15.0

---

*OMEGA Project — Phase 16.2 QUARANTINE_V2*
*NASA-Grade Isolation Chamber*
