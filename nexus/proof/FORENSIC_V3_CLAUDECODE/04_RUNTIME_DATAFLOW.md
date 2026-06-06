# 04 — RUNTIME DATAFLOW (données de bout en bout)

## Flux A — Forge Python (le flux de production réel)
```
[intent/prompt + contraintes longueur]
   │  scripts/metrology/forge_length_enforced.py
   ▼
urllib POST http://localhost:11434/api/generate  (model gemma4:31b)   ← forge_length_enforced.py:26
   ▼
[prose générée] ──► fichier JSON (docs/research/ | omega-autopsie/results_rosetta/)
   │
   ▼  scoring
n5_radar_reference.py ──► POST /api/embeddings (bge-m3) ──► vecteurs ──► radar LOAO (distance centroïdes, EMP-18)
n2_judge_hunt.py      ──► POST /api/generate (gemma4)   ──► verdict juge
   ▲
calibration_check.py (EMP-19 PoST) garde-fou amont : profil calibration requis sinon RECALIBRATION_REQUIRED=STOP
```
**Données** : texte brut → JSON résultats. Pas d'objet canon, pas de Bible, pas de mémoire persistante structurée dans ce flux.

## Flux B — Analyse émotionnelle TS
```
[texte] ─► bin/omega-pipe.mjs ─► gateway/cli-runner/.../analyze.ts
   ─► tables mots-clés lang/{fr,en,es,de} ─► scores Plutchik ─► NDJSON stdout
```
**Données** : texte → scores. Déterministe, sans état.

## Flux C — Book-factory (DRAFT, démo)
```
[book plan + ChapterSpec[]]
   │ book-orchestrator.generateBook()  (book-orchestrator.ts:54-102)
   ▼ pour chaque chapitre c:
   ┌─ delta planifié (events prévus)
   ├─ checkContinuity(current, delta, spec)            → PASS/RETRY   (continuity-oracle.ts ; SANS adapter)
   ├─ buildContextDigest(current, spec, plan, book)    → digest ≤600 mots (context-manager.ts:15-39)
   │     contenu: persos vivants (TOUS), threads ouverts, 5 derniers events, seeds plant/bloom@c
   ├─ chapterSpecToIntent(digest, spec)                → intent prompt
   ├─ generator.generate(intent)                       → prose  (Ollama gemma4:31b OU déterministe)
   ├─ story-state.append(events)                       → Bible mutable mise à jour (projectStoryState fold)
   └─ previousTail = prose.slice(-180)                 → continuité locale chapitre suivant
   ▼
[prose chapitres + NarrativeEvent log + state_hash déterministe]
```
**Données** : plan → events → projection StoryState (la « Bible ») → digest borné réinjecté → prose. La vérité = log d'events append-only ; l'état = fold pur (`story-state.ts:1-15`).

## Flux D — Forge souveraine TS (NON exécuté en prod)
```
[ForgePacket] ─► runSovereignForge(packet, provider)  (sovereign-engine/src/index.ts:21)
   ─► SymbolMap ─► EmotionBrief ─► draft ─► passes (oracle, gates, microsurgery, dedale…)
   ─► provider.generate()  ⚠ provider INJECTÉ, jamais câblé à un vrai LLM par un entrypoint live
```
**Statut** : data-flow buildable mais inerte (aucun appelant ne fournit un provider réel ; le job est fait par Flux A).

## Ce qui relie (et ne relie pas) les flux
- **Pont A↔C** : le `chapter-generator` de book-factory appelle Ollama gemma4:31b, **le même backend** que la forge Python. C'est le seul point commun (le modèle), pas le code.
- **Aucun pont** vers le World Model (memory_layer_nasa) ni vers les canons gateway/src : ils ne reçoivent ni n'émettent de données runtime.
