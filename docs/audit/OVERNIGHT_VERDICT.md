# OMEGA — OVERNIGHT VERDICT (sensor validation)

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode**: READ-ONLY (0 code moteur · 0 floor · 0 destitution) · **Date**: 2026-05-31
> **STOP DUR respecté**: aucun floor baissé, aucun scribe destitué, DEC-009 / 14D / LFS intacts. Décisions = Architecte.
> Auto-généré par `scripts/metrology/overnight-report-v2.ts` depuis les artefacts canoniques.

## Phase 1 — ECC dedicated (NCR_ECC_CONTRACT_SENSOR)

**Verdict: B — CONTRAT (artefact), PAS prose incohérente ni capteur bruité. Confiance: HAUTE.** _(juge temp 0 ⇒ stdev=0, déterministe : N n'ajoute pas d'information.)_

Même prose FIXE (échantillons M0.b), seul le contrat varie :

| prose | contract | ECC | tension_14d | emotion_coherence | interiority | impact | temporal_pacing |
|---|---|---:|---:|---:|---:|---:|---:|
| sovereign | FORGE | **68.02** | 9.22 | 100 | 92 | 78 | 75 |
| sovereign | HAND | **92.42** | 86.49 | 100 | 92 | 78 | 75 |
| scribe | FORGE | **59.8** | 9.21 | 100 | 87 | 82 | 75 |
| scribe | HAND | **79.75** | 66.05 | 100 | 87 | 82 | 75 |

- **sovereign**: ECC FORGE=68.02 → HAND=92.42 (**lift +24.40**), carried by tension_14d 9.22→86.49; other axes unchanged.
- **scribe**: ECC FORGE=59.8 → HAND=79.75 (**lift +19.95**), carried by tension_14d 9.21→66.05; other axes unchanged.

**Cause racine** : assembleForgePacket("Le Gardien", horror) → `target_14d` trajectory: Q1: trust:1.00 · Q2: trust:1.00 · Q3: trust:1.00 · Q4: trust:1.00. A constant one-hot `trust=1.0` target for a horror scene is degenerate → `tension_14d` (CALC, weight ×3.0 = 31.6% of ECC raw) cannot be matched by correctly fearful prose → ECC collapses, while emotion_coherence/interiority/impact stay high (prose IS coherent).

Détail → [`minaxis/ECC_DEDICATED_BENCH.md`](minaxis/ECC_DEDICATED_BENCH.md) · données `minaxis/ecc_dedicated_bench.json` + `minaxis/ecc_contract_probe.json`.

**Action induite (NON appliquée, READ-ONLY)** : corriger la dérivation 14D amont (`assembleForgePacket` / planner→emotion→quartiles) qui produit `trust=1.0` constant. Défaut de **construction de contrat**, pas de scorer ni de prose. À traiter **avant DEC-009** (tout bench de fusion branché sur `assembleForgePacket` héritera d'un ECC bas structurel). Le capteur ECC n'est PAS fiable pour bencher la fusion sur ce chemin en l'état.

## Phase 2 — Literary RCI floor reachability

**Verdict: NON (floor 85 unreachable by real literature).**

- corpus: **57 passages**, 11 public-domain authors
- RCI: mean **68.12**, median 68.37, max 76.65
- **pass floor 85 (actual): 0/57** · ceiling (sig=hook=100): 28/57
- engine RCI reference mean: 82.6

Détail → [`minaxis/MINAXIS_E_LITERARY_RECOMPUTE.md`](minaxis/MINAXIS_E_LITERARY_RECOMPUTE.md) · sources [`minaxis/MINAXIS_E_LITERARY_SOURCES.md`](minaxis/MINAXIS_E_LITERARY_SOURCES.md)

## Phase 3 — M4 provisoire

⚠️ **NON exécuté / PROVISOIRE par nature.** Le capteur ECC est invalidé sur le chemin `assembleForgePacket` (Phase 1 = B). Toute comparaison sovereign-vs-scribe via ce capteur, sur ce chemin, est **biaisée par le contrat dégénéré** et **ne peut servir à décider** (ni destitution scribe, ni DEC-009). M4 réel = **NO-GO** tant que la dérivation 14D n'est pas corrigée et le capteur re-validé.

## Synthèse pour l'Architecte

1. **ECC** : le floor/min_axis ECC bas observé sur le chemin de production est un **artefact de contrat** (`trust=1.0`), pas un défaut moteur. Corriger la dérivation 14D amont. **Aucun patch produit.**
2. **RCI** : floor 85 empiriquement inatteignable (0/57 chefs-d'œuvre). Corpus-proof fourni. **Floor non modifié.** Revue Architecte.
3. **Déterminisme** : juge temp 0 ⇒ ECC reproductible (stdev 0) ; le verdict Phase 1 ne nécessite pas de N élevé.
4. **Aucune décision moteur prise.** Tout est PENDING Architecte (NCR_ECC_CONTRACT_SENSOR OPEN).
