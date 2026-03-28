# SESSION SAVE — AUDIT BLACK-BOX CLAUDE SONNET
**Date** : 2026-03-28
**Branche** : phase-r-metrology-rebuild

## Travail effectue

### Phase A (0 API) — Consolidation existant
- Rosetta pilotabilite (370 tests, 8 features)
- Confusion matrix (7 modes -> INTROSPECTION)
- BESTOF3 (5 briques + telemetrie)
- Volume tests (6 runs)
- Angostura (141K fenetres)
- 10 lois preliminaires

### Phase B (95 API) — Mesures directes
- B1 Baseline : 30 runs (10 scenes x 3)
- B2 Gradient semicolons : 15 runs (5 niveaux x 3)
- B3 Gradient mean_sent_len : 15 runs (5 targets x 3)
- B4 Conflits : 15 runs (5 paires x 3)
- B5 Stabilite : 20 runs (2 scenes x 10)
- **95/95 runs OK**

## Resultats cles

1. **Baseline** : mean_sent_len=42, cv_sent=0.875, semicolons=0.17, composite=89.6
2. **Semicolons NON PILOTABLES** : 11/15 runs = 0 malgre consignes fortes
3. **Plancher phrase** : Claude ne descend pas sous ~35 mots/phrase
4. **Plafond phrase** : ~42 mots/phrase (compresse les demandes > 50)
5. **Composite stable** (CV=1-2%) mais features instables (CV=20-80%)
6. **Conflits ameliorent** le composite dans 4/5 cas (+1.8 a +2.2)
7. **Menace/revelation** plafonnent a 87-88 (les plus difficiles)

## 15 lois consolidees

L01: Puits INTROSPECTION | L02: Illusion f17 | L03: Semicolon non pilotable
L04: Plancher 35 mots/phrase | L05: Compression volume | L06: Composite stable, features instables
L07: Conflits non destructifs | L08: Menace = plus difficile | L09: Ponctuation = signal non exploite
L10: f24e = 100% pilotable | L11: Micro-chirurgie = echec | L12: Conflit ECC/SII vs IFI
L13: Composite insensible au style | L14: Scene conditionne le plafond
L15: Forte variance = plus informatif

## Fichiers produits

- packages/sovereign-engine/scripts/blackbox-phase-b.ts
- packages/sovereign-engine/sessions/CLAUDE_BLACKBOX_PHASE_B/B1-B5.json
- scripts/blackbox_analyze_phase_b.py
- sessions/CLAUDE_BLACKBOX/PHASE_B_ANALYSIS.json
- docs/CLAUDE_OBSERVABLE_LAWS.md
- docs/CLAUDE_BLACKBOX_ARCHAEOLOGY.md
- docs/CLAUDE_OBSERVABLE_LITERARY_CONTRACT.md
