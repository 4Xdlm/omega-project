# ═══════════════════════════════════════════════════════════════════════════════
#                    OMEGA — REGISTRE DES INVARIANTS STREAMING
#                    5 Nouveaux — Extension NASA-Grade L4
# ═══════════════════════════════════════════════════════════════════════════════

**Document ID**: INV-STREAM  
**Version**: 1.0.0  
**Date**: 03 janvier 2026  
**Status**: 5/5 À VALIDER PAR TESTS  

---

# SYNTHÈSE

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   INVARIANTS STREAMING — NOUVEAUX                                             ║
║                                                                               ║
║   ┌─────────────────────────────────────────────────────────────────────┐     ║
║   │                                                                     │     ║
║   │   Total:           5 nouveaux invariants                            │     ║
║   │   Tests:           streaming_invariants.test.ts                     │     ║
║   │   Catégorie:       STREAMING / Large Files                          │     ║
║   │                                                                     │     ║
║   │   INV-STR-01:      Streaming == Non-streaming                       │     ║
║   │   INV-STR-02:      Chunk-size invariant                             │     ║
║   │   INV-STR-03:      Offsets globaux valides                          │     ║
║   │   INV-STR-04:      Auto-stream consistency                          │     ║
║   │   INV-STR-05:      Multi-run determinism                            │     ║
║   │                                                                     │     ║
║   └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# INV-STR-01 — Streaming == Non-streaming

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-STR-01 |
| **Nom** | Streaming == Non-streaming |
| **Sévérité** | CRITICAL |
| **Description** | Le rootHash en mode streaming est identique au mode non-streaming |
| **Formule** | `rootHash(streaming=true) === rootHash(streaming=false)` |
| **Module(s)** | stream_segmenter.ts, run_pipeline_scale_v2.ts |
| **Tests L1** | Property: paragraph, scene, sentence modes |
| **Tests L2** | Boundary: fichier 1 ligne, fichier vide |
| **Tests L3** | Chaos: fichier avec UTF-8, CRLF, lignes vides |
| **Tests L4** | Differential: v1 vs v2 sur corpus de test |
| **Preuve** | streaming_invariants.test.ts::INV-STR-01 |
| **Status** | ⏳ À VALIDER |

**Mécanisme de garantie**:
1. Segment ID basé sur `{mode, index, start, end}` (pas sur text)
2. Segmentation hash calculé identiquement
3. Même ordre Merkle (tri par segment_index)

---

# INV-STR-02 — Chunk-size Invariant

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-STR-02 |
| **Nom** | Chunk-size Invariant |
| **Sévérité** | CRITICAL |
| **Description** | Le rootHash est identique quelle que soit la taille des chunks |
| **Formule** | `rootHash(chunk=16KB) === rootHash(chunk=64KB) === rootHash(chunk=256KB)` |
| **Module(s)** | utf8_stream.ts, carry_buffer.ts |
| **Tests L1** | Property: 3 chunk sizes (16KB, 64KB, 256KB) |
| **Tests L2** | Boundary: chunk=1 byte, chunk=1MB |
| **Tests L3** | Chaos: chunk size < segment average length |
| **Tests L4** | Differential: segment count stable |
| **Preuve** | streaming_invariants.test.ts::INV-STR-02 |
| **Status** | ⏳ À VALIDER |

**Mécanisme de garantie**:
1. CarryBuffer conserve le "reste" entre chunks
2. UTF-8 boundaries gérés par TextDecoder
3. Newline normalization stateful

---

# INV-STR-03 — Offsets Globaux Valides

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-STR-03 |
| **Nom** | Offsets Globaux Valides |
| **Sévérité** | HIGH |
| **Description** | Les offsets start/end sont sur le texte normalisé global |
| **Formule** | `segment[i].end <= segment[i+1].start` (non-overlapping) |
| **Module(s)** | stream_segmenter.ts, carry_buffer.ts |
| **Tests L1** | Property: offsets non-négatifs, end > start |
| **Tests L2** | Boundary: segment à l'offset 0, dernier segment |
| **Tests L3** | Chaos: segments vides, paragraphes multiples vides |
| **Tests L4** | Differential: offsets streaming vs non-streaming |
| **Preuve** | streaming_invariants.test.ts::INV-STR-03 |
| **Status** | ⏳ À VALIDER |

**Note**: Les offsets sont sur le texte APRÈS normalisation (\r\n → \n).

---

# INV-STR-04 — Auto-stream Consistency

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-STR-04 |
| **Nom** | Auto-stream Consistency |
| **Sévérité** | HIGH |
| **Description** | Auto-stream produit le même résultat que --stream explicite |
| **Formule** | `rootHash(auto-stream) === rootHash(--stream)` |
| **Module(s)** | run_pipeline_scale_v2.ts |
| **Tests L1** | Property: threshold=0 → force streaming |
| **Tests L2** | Boundary: fichier exactement au threshold |
| **Tests L3** | Chaos: batch avec mix auto/explicit |
| **Tests L4** | Differential: output.streaming.used correct |
| **Preuve** | streaming_invariants.test.ts::INV-STR-04 |
| **Status** | ⏳ À VALIDER |

---

# INV-STR-05 — Multi-run Determinism

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-STR-05 |
| **Nom** | Multi-run Determinism |
| **Sévérité** | CRITICAL |
| **Description** | N runs consécutifs produisent le même rootHash |
| **Formule** | `rootHash(run[1]) === rootHash(run[2]) === ... === rootHash(run[N])` |
| **Module(s)** | Tous |
| **Tests L1** | Property: 10 runs consécutifs |
| **Tests L2** | Boundary: 1 run, 100 runs |
| **Tests L3** | Chaos: runs parallèles sur même input |
| **Tests L4** | Differential: streaming + concurrency stable |
| **Preuve** | streaming_invariants.test.ts::INV-STR-05 |
| **Status** | ⏳ À VALIDER |

---

# MATRICE DE TRAÇABILITÉ

| Invariant | Test File | Test Function | Status |
|-----------|-----------|---------------|--------|
| INV-STR-01 | streaming_invariants.test.ts | "paragraph mode: streaming produces same rootHash" | ⏳ |
| INV-STR-01 | streaming_invariants.test.ts | "scene mode: streaming produces same rootHash" | ⏳ |
| INV-STR-01 | streaming_invariants.test.ts | "sentence mode: streaming produces same rootHash" | ⏳ |
| INV-STR-02 | streaming_invariants.test.ts | "different chunk sizes produce identical rootHash" | ⏳ |
| INV-STR-03 | streaming_invariants.test.ts | "segment offsets are contiguous" | ⏳ |
| INV-STR-04 | streaming_invariants.test.ts | "auto-stream produces same result" | ⏳ |
| INV-STR-05 | streaming_invariants.test.ts | "10 consecutive runs produce identical rootHash" | ⏳ |

---

# DÉPENDANCES AVEC INVARIANTS EXISTANTS

Les invariants STREAMING dépendent de et renforcent :

| Invariant existant | Relation |
|--------------------|----------|
| INV-SCALE-01 (Concurrency-invariant) | INV-STR-05 inclut concurrency |
| INV-SCALE-02 (Batch idempotent) | INV-STR-05 équivalent streaming |
| INV-SCALE-05 (Ordered aggregation) | Requis pour INV-STR-01 |
| INV-CORE-01 (Déterminisme) | INV-STR-01, 02, 05 l'étendent |

---

# TOTAL INVARIANTS PROJET

```
Après intégration STREAMING:
- INV-CORE: 5
- INV-SCALE: 5  
- INV-STR: 5 (nouveau)
───────────────
TOTAL: 15 invariants core
```

---

**Document ID**: INV-STREAM  
**Version**: 1.0.0  
**Profile**: L4 NASA-Grade  
**Last Updated**: 2026-01-03
