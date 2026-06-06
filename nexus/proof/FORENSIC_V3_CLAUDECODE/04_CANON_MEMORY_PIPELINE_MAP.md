# 04 — CANON ↔ MEMORY PIPELINE MAP

Comment les faits narratifs circulent (ou ne circulent pas) entre canon et mémoire, dans la machine réelle.

## Le pipeline canon↔mémoire VIVANT (book-factory, DRAFT)
```
ÉCRITURE (génération)
  ChapterSpec ─► [delta events planifiés]
       ▼
  story-state.append(events)  ──► projectStoryState (fold pur)  ──► StoryState{characters, places,
                                                                       threads, payoff_graph, timeline}
       │                                                                state_hash = sha256(canonicalize)  [canon-kernel]
       ▼
LECTURE (rappel borné)
  buildContextDigest(StoryState, ChapterSpec, plan, book)  ──► digest ≤600 mots
       │  (persos vivants TOUS, threads ouverts, 5 derniers events, seeds plant/bloom@c)
       ▼
  chapterSpecToIntent(digest) ──► prompt ──► generator(Ollama) ──► prose ──► [nouveaux events] ──► (boucle)

VÉRITÉ ÉPISTÉMIQUE (hors boucle prod — bench only)
  book-canon-adapter: recordTruth/Belief/Revelation ─► dual-rail log ─► knows()/isLie() projections
       ▲  consommé seulement par continuity-oracle(LEAK) en dry-run, JAMAIS par book-orchestrator (V3)
```

## Le pipeline canon↔mémoire DORMANT (gateway, ORPHAN)
```
  canon_engine (CanonState, addFact)  ◄──?──  truth_gate (verdict)  ◄──?──  ripple_engine (conséquences)
       │                                                                          │
       └──────────────► memory_digest_writer.writeDigest(source="RIPPLE_ENGINE") ─┘
                              ▼
                        memory_layer_nasa (store + tiering hot/cold + decay + snapshot + query)
       ⚠ TOUT ce pipeline est certifié mais SANS ENTRÉE NI SORTIE runtime (0 caller, V1).
         Le câblage ripple→digest_writer→memory existe en intention (source codée en dur "RIPPLE_ENGINE")
         mais aucun runtime ne le déclenche.
```

## Tableau : capacité canon/mémoire — où, état
| Capacité | Impl vivante | Impl dormante | Manquant |
|---|---|---|---|
| Stocker un fait | story-state (events) | canon_engine, src/canon, PHASE18/20 | — |
| Vérité vs croyance (rails) | book-canon-adapter (bench) | — | câblage dans la boucle |
| Promotion croyance→vérité + evidence | book-canon-adapter `promote` (bench) | — | câblage |
| Lignée / supersession | canon-kernel hash-chain ; src/canon (riche) | — | unifier sur canon-kernel |
| Digest/compression mémoire | context-manager (≤600w, vivant) | memory_digest (orphelin) | — |
| Tiering hot/cold | — | memory_tiering (orphelin, non exporté V2) | activer si besoin scale |
| Decay/oubli | — | memory_decay (orphelin) | — |
| Snapshot crash-safe | story-state.snapshot | memory_snapshot (orphelin) | — |
| Rappel par requête key/version | — | memory_query (orphelin) | — |
| **Rappel par mention de nom** | **— (n'existe pas)** | **—** | **TOUT (concept Architecte non codé)** |
| Conséquences (ripple) | — | ripple_engine (orphelin) | câblage |

## Synthèse pour l'Architecte
- Il existe **deux pipelines canon↔mémoire** : un **léger et vivant** (book-factory : story-state + context-manager) et un **lourd et dormant** (gateway : canon_engine + memory_layer_nasa avec tiering/decay/digest).
- Le pipeline lourd contient **exactement** les briques de délestage/compression que l'Architecte décrit (tiering hot/cold, decay, digest) — mais **débranchées et même non exportées** (V2).
- Le « marqueur sur mention → rappel auto » n'a **aucune brique** dans aucun des deux pipelines : c'est le seul vrai manque structurel (le reste est du câblage/réveil).
