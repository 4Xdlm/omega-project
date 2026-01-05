# OMEGA SENTINEL

## Phase 16.1 — Security Watchdog

> Protection temps réel contre les inputs malicieux

## 📋 Fonctions

| Fonction | Description |
|----------|-------------|
| `check(input)` | Vérification complète (size + patterns + structure) |
| `checkPayloadSize(input)` | Limite 2MB par défaut |
| `checkPatterns(input)` | Détection XSS, SQL injection, etc. |
| `checkStructure(input)` | Profondeur, longueur arrays/strings |
| `getReport()` | Statistiques et métriques |

## 🔒 Patterns Détectés

- **XSS**: `<script>`, `javascript:`, `onclick=`, etc.
- **SQL Injection**: `SELECT FROM`, `' OR '1'='1`, `DROP TABLE`
- **Command Injection**: `; cat /etc/passwd`, `$(whoami)`, path traversal
- **NoSQL Injection**: `$where`, `$ne`, `$or`
- **Template Injection**: `{{}}`, `{% %}`, `<%= %>`
- **Prototype Pollution**: `__proto__`, `constructor.prototype`

## 🔒 Invariants

| ID | Description | Status |
|----|-------------|--------|
| INV-SEN-01 | Tout input vérifié | ✅ PROUVÉ |
| INV-SEN-02 | Payload > limit = BLOCK | ✅ PROUVÉ |
| INV-SEN-03 | Pattern malicieux = BLOCK | ✅ PROUVÉ |
| INV-SEN-04 | Résultat déterministe | ✅ PROUVÉ |
| INV-SEN-05 | Timestamp toujours présent | ✅ PROUVÉ |
| INV-SEN-06 | Report cohérent | ✅ PROUVÉ |

## 🚀 Usage

```typescript
import { Sentinel, check } from '@omega/sentinel';

// Quick check
const result = check({ userInput: 'hello' });
if (result.passed) {
  // Input is safe
}

// Custom configuration
const sentinel = new Sentinel({
  maxPayloadSize: 1024 * 1024, // 1MB
  maxDepth: 10,
  enableXssCheck: true,
  enableSqlCheck: true,
});

const result = sentinel.check(input);
console.log(result.status); // 'PASS' | 'BLOCK' | 'WARN'
```

## 📊 Report

```typescript
const report = sentinel.getReport();
console.log(report.overall.total);   // Total checks
console.log(report.overall.blocked); // Blocked count
console.log(report.byPatternCategory); // { XSS: 5, SQL_INJECTION: 2, ... }
```

## 📁 Structure

```
src/sentinel/
├── constants.ts  # Limits, patterns, exit codes
├── types.ts      # Interfaces
├── sentinel.ts   # Core watchdog
└── index.ts      # Public exports
```

## 📦 Version

- **SENTINEL**: v3.16.1
- **OMEGA Core**: v3.15.0-NEXUS_CORE-STABLE

---

*OMEGA Project — Phase 16.1 SENTINEL*
*NASA-Grade Security Watchdog*
