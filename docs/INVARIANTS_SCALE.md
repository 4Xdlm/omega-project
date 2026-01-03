# ═══════════════════════════════════════════════════════════════════════════════
#                    OMEGA — REGISTRE DES INVARIANTS SCALE
#                    5 Nouveaux — Extension NASA-Grade L4
# ═══════════════════════════════════════════════════════════════════════════════

**Document ID**: INV-SCALE  
**Version**: 1.0.0  
**Date**: 03 janvier 2026  
**Status**: 5/5 À VALIDER PAR TESTS  

---

# SYNTHÈSE

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   INVARIANTS SCALE — NOUVEAUX                                                 ║
║                                                                               ║
║   ┌─────────────────────────────────────────────────────────────────────┐     ║
║   │                                                                     │     ║
║   │   Total:           5 nouveaux invariants                            │     ║
║   │   Tests:           scale_invariants.test.ts                         │     ║
║   │   Catégorie:       SCALE / Performance                              │     ║
║   │                                                                     │     ║
║   │   INV-SCALE-01:    Concurrency-invariant hash                       │     ║
║   │   INV-SCALE-02:    Batch idempotent                                 │     ║
║   │   INV-SCALE-03:    Mode-sensitive hash                              │     ║
║   │   INV-SCALE-04:    Text exclusion from hash                         │     ║
║   │   INV-SCALE-05:    Ordered aggregation                              │     ║
║   │                                                                     │     ║
║   └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# INV-SCALE-01 — Concurrency-Invariant Hash

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-SCALE-01 |
| **Nom** | Concurrency-Invariant Hash |
| **Sévérité** | CRITICAL |
| **Description** | Le rootHash final est identique quelle que soit la valeur de concurrency (1, 4, 8, N) |
| **Formule** | `rootHash(c=1) === rootHash(c=N)` pour tout N ≥ 1 |
| **Module(s)** | run_pipeline_scale.ts |
| **Tests L1** | Property: 5 runs avec concurrency 1,2,4,8,16 |
| **Tests L2** | Boundary: c=1 (séquentiel) vs c=max_cpus |
| **Tests L3** | Chaos: c=1 vs c=8 avec fichiers multiples |
| **Tests L4** | Differential: comparaison run_pipeline.ts vs run_pipeline_scale.ts |
| **Preuve** | scale_invariants.test.ts::INV-SCALE-01 |
| **Status** | ⏳ À VALIDER |

**Mécanisme de garantie**:
1. Traitement parallèle des fichiers (pas des segments)
2. Tri par `segment_index` AVANT agrégation Merkle
3. Seed fixe propagé à tous les workers

---

# INV-SCALE-02 — Batch Idempotent

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-SCALE-02 |
| **Nom** | Batch Idempotent |
| **Sévérité** | CRITICAL |
| **Description** | Deux runs identiques (même config) produisent exactement le même output |
| **Formule** | `run(config) === run(config)` (excluant perf metrics) |
| **Module(s)** | run_pipeline_scale.ts |
| **Tests L1** | Property: 10 runs consécutifs |
| **Tests L2** | Boundary: fichier vide, fichier 1 mot |
| **Tests L3** | Chaos: runs parallèles sur même input |
| **Tests L4** | Differential: hash de l'output JSON complet |
| **Preuve** | scale_invariants.test.ts::INV-SCALE-02 |
| **Status** | ⏳ À VALIDER |

**Champs exclus du déterminisme** (intentionnel):
- `perf.read_ms`, `perf.segment_ms`, etc. (temps d'exécution variable)

**Champs garantis déterministes**:
- `global_dna.rootHash`
- `global_dna.merkle_root`
- `segmentation.segmentation_hash`
- `segments[]`
- `segment_dnas[]`

---

# INV-SCALE-03 — Mode-Sensitive Hash

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-SCALE-03 |
| **Nom** | Mode-Sensitive Hash |
| **Sévérité** | HIGH |
| **Description** | Des modes de segmentation différents produisent des hashes différents |
| **Formule** | `rootHash(mode=sentence) !== rootHash(mode=paragraph)` |
| **Module(s)** | run_pipeline_scale.ts, omega-segment-engine |
| **Tests L1** | Property: sentence vs paragraph vs scene |
| **Tests L2** | Boundary: texte 1 phrase vs 1 paragraphe |
| **Tests L3** | Chaos: modes mixtes sur batch |
| **Tests L4** | Differential: comparaison segment counts |
| **Preuve** | scale_invariants.test.ts::INV-SCALE-03 |
| **Status** | ⏳ À VALIDER |

**Impact du mode**:
- `sentence`: découpe sur `.`, `!`, `?`
- `paragraph`: découpe sur double newline
- `scene`: découpe sur `###`, `***`, `---`

---

# INV-SCALE-04 — Text Exclusion From Hash

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-SCALE-04 |
| **Nom** | Text Exclusion From Hash |
| **Sévérité** | HIGH |
| **Description** | L'inclusion ou exclusion du texte dans l'output ne change pas le rootHash |
| **Formule** | `rootHash(--no-text) === rootHash(--include-text)` |
| **Module(s)** | run_pipeline_scale.ts |
| **Tests L1** | Property: 10 fichiers avec/sans texte |
| **Tests L2** | Boundary: segment text très long |
| **Tests L3** | Chaos: batch mixte |
| **Tests L4** | Differential: taille fichier différente mais hash identique |
| **Preuve** | scale_invariants.test.ts::INV-SCALE-04 |
| **Status** | ⏳ À VALIDER |

**Raison**: Le texte est ajouté APRÈS le calcul du hash, uniquement pour debug/export.

---

# INV-SCALE-05 — Ordered Aggregation

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-SCALE-05 |
| **Nom** | Ordered Aggregation |
| **Sévérité** | CRITICAL |
| **Description** | Les segments sont triés par index AVANT l'agrégation Merkle |
| **Formule** | `sort(segments, by: index) → aggregate()` |
| **Module(s)** | run_pipeline_scale.ts, omega-aggregate-dna |
| **Tests L1** | Property: vérifier ordre dans output |
| **Tests L2** | Boundary: 1 segment, 1000 segments |
| **Tests L3** | Chaos: processing ordre aléatoire → même hash |
| **Tests L4** | Differential: segment_dnas.map(s => s.segment_index) === [0,1,2,...] |
| **Preuve** | scale_invariants.test.ts::INV-SCALE-05 |
| **Status** | ⏳ À VALIDER |

**Code critique**:
```typescript
// CRITICAL: Sort by segment_index before aggregation
segmentDNAs.sort((a, b) => a.segment_index - b.segment_index);
```

---

# MATRICE DE TRAÇABILITÉ

| Invariant | Test File | Test Function | Lines |
|-----------|-----------|---------------|-------|
| INV-SCALE-01 | scale_invariants.test.ts | "concurrency=1 produces same rootHash" | 85-110 |
| INV-SCALE-02 | scale_invariants.test.ts | "two identical runs produce identical output" | 120-145 |
| INV-SCALE-03 | scale_invariants.test.ts | "sentence mode produces different hash" | 155-180 |
| INV-SCALE-04 | scale_invariants.test.ts | "--no-text and --include-text produce same rootHash" | 195-225 |
| INV-SCALE-05 | scale_invariants.test.ts | "segment_dnas are ordered by segment_index" | 235-255 |

---

# COMMANDES DE VALIDATION

```powershell
# Lancer tous les tests SCALE
npx vitest run tests/scale_invariants.test.ts

# Lancer un test spécifique
npx vitest run tests/scale_invariants.test.ts -t "INV-SCALE-01"

# Verbose mode
npx vitest run tests/scale_invariants.test.ts --reporter=verbose
```

---

# INTÉGRATION AU REGISTRE PRINCIPAL

Ces 5 invariants doivent être ajoutés au document `50_REGISTRE_INVARIANTS.md` :

```markdown
## BLOC 6 — INVARIANTS SCALE (5)

### INV-SCALE-01 à INV-SCALE-05
Voir document INV-SCALE pour détails complets.

Total après intégration: 20 + 5 = 25 invariants
```

---

**Document ID**: INV-SCALE  
**Version**: 1.0.0  
**Profile**: L4 NASA-Grade  
**Last Updated**: 2026-01-03
