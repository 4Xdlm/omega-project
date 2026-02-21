# GENIUS DUAL SCORING MODE — Architecture Decision Record

**Date**: 2026-02-21
**Status**: ACTIVE (dual mode transitoire)
**Invariant**: ART-GENIUS-DUAL
**Tests**: 834/834 PASS (127 suites)

## Context

Le Sovereign Engine (SE) possédait un GENIUS scorer avec 5 axes (D,S,I,R,V)
calculés par des scorers internes et combinés via moyenne géométrique à poids égaux.

omega-p0 (`@omega/phonetic-stack`) a été développé comme stack phonétique calibrée
sur un corpus 10H+10AI, avec des poids empiriques et une somme pondérée.

## Decision

**Stratégie A+ : Adapter + Phase Dual Courte**

Ni remplacement brut (risque de régression) ni double voie permanente (entropie).
On injecte omega-p0 via un adapter, on compare en shadow mode, on bascule sur preuve.

## Modes

| Mode | G formula | Verdict source | layer2_dual |
|------|-----------|---------------|-------------|
| `legacy` (défaut) | (D×S×I×R×V)^(1/5) SE scorers | G_old | absent |
| `dual` | G_old (SE) + G_new (omega-p0) | G_old | présent |
| `omegaP0` | 0.35R+0.25D+0.20V+0.15S+0.05I | G_new | absent |

## DualProofRecord Schema

Chaque run `dual` produit un record dans `layer2_dual.proof` :

| Field | Type | Description |
|-------|------|-------------|
| text_hash | SHA-256 hex (64 chars) | Hash du texte brut |
| segments_hash | SHA-256 hex (64 chars) | Hash du texte normalisé (whitespace) |
| G_old | number | Score legacy (geometric mean) |
| G_new | number | Score omega-p0 (weighted sum) |
| delta | number | G_new - G_old |
| axes_old | {D,S,I,R,V} | Axes SE |
| axes_new | {D,S,I,R,V} | Axes omega-p0 |
| verdict_old | string | Verdict legacy |
| verdict_new | string | Verdict omega-p0 |
| schema_version_old | string | 'GENIUS_SE_V1' |
| schema_version_new | string | 'GENIUS_SCHEMA_V1' |
| axis_def_hash_old | string (16 hex) | Hash des paramètres legacy |
| axis_def_hash_new | string (16 hex) | Hash des poids calibrés |
| delta_explain | string[] (max 3) | Top 3 axes par delta absolu |
| decision_mode | string | 'legacy'|'dual'|'omegaP0' |
| timestamp | ISO 8601 | Horodatage du run |

## Sunset Contract

| Paramètre | Valeur |
|-----------|--------|
| Dual TTL | 14 jours OU 50 runs golden (premier atteint) |
| Bascule si | median(G_new - G_old) >= 0 ET regressions = 0 ET determinism = PASS |
| Purge legacy | Sprint suivant la bascule |

## Files Modified

- `src/genius/omega-p0-adapter.ts` — NEW: bridge omega-p0 → SE
- `src/genius/genius-metrics.ts` — MODIFIED: 7 surgical additions
- `tests/genius/genius-dual-mode.test.ts` — NEW: 8 integration tests
- `package.json` — ADDED: `@omega/phonetic-stack` dependency

## How to Verify

```typescript
import { computeGeniusMetrics } from './genius-metrics.js';

// Legacy (default) — unchanged behavior
const legacy = computeGeniusMetrics({ text, mode: 'original' });

// Dual — both engines, verdict from legacy
const dual = computeGeniusMetrics({ text, mode: 'original', scorerMode: 'dual' });
console.log(dual.layer2_dual.G_new);       // omega-p0 score
console.log(dual.layer2_dual.delta_G);     // G_new - G_old
console.log(dual.layer2_dual.proof);       // full proof record

// omegaP0 — calibrated engine only
const p0 = computeGeniusMetrics({ text, mode: 'original', scorerMode: 'omegaP0' });
```
