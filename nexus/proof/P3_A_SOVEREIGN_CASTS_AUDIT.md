# P3-A — Cartographie des casts `sovereign-engine/src` (LECTURE SEULE, aucun patch)

**Date** : 2026-05-30 · **Baseline** : HEAD `f1329c2c`, tree CLEAN, sovereign-engine **2522 pass / 0 fail** · **Scope** : `packages/sovereign-engine/src/**` (hors tests, hors scripts)
**Méthode** : `as any\b|as unknown as`, 45 occurrences classées en 5 catégories + flag 14D.

## Découverte structurante
**9 des 45 casts (20%) sont COUPLÉS au 14D dormant** → **FROZEN / FORBID-CANON-GARAGE-001 / INTERDICTION DE TOUCHER**. Le « 45 casts de dette » de l'audit était donc surévalué : la dette *lazy réellement fixable* est petite (~4-7). La majorité sont des frontières légitimes (cache non typé, chargement de modèle, accès dynamique à champs optionnels).

## Classification

### 🔴 CAT-FROZEN-14D (9) — NE PAS TOUCHER (14D dormant)
Tous alimentent la machinerie 14D (`cosineSimilarity14D`/`euclideanDistance14D`/`target_14d`) :
- `delta/delta-emotion.ts:55,56,89` — `target.target_14d as any`
- `oracle/axes/tension-14d.ts:95,107,108,126` — `targetState/actualState as any`, `as unknown as Record<string,number>`, mutation `(existing as any).emotion_14d`
- `microsurgery/micro-surgeon.ts:128` — `targetState as any, actualState as any`
- `oracle/s-oracle-v2.ts:109` — `cosineSimilarity14D(target as any, actual as any)`
> Le 14D est GARAGE/DORMANT (target_14d={}). Ces casts existent parce que le type 14D n'est volontairement pas peuplé. Les « corriger » = réanimer le canon → INTERDIT. **KEEP, documenté.**

### 🟢 CAT-1 — Mutation post-création évitable (truth-gate pattern, SÛR à fixer) (~4)
- `pitch/triple-pitch.ts:255,256` — `(pitchA as any).total_expected_gain = ...` → **CLUSTER SÛR #1** (construction immuable, non-14D, isolé, exact pattern truth-gate).
- `engine.ts:622,650` — `axes: {} as any, // Non utilisé en v3` → placeholder mort ; typer proprement ou retirer le champ inutilisé.

### 🟡 CAT-1b — Injection de dépendance (test seam) (~3)
- `validation/phase-u/greatness-judge.ts:362` — `(inst as unknown as {adapter}).adapter = adapter`
- `validation/phase-u/top-k-selection.ts:173` — `(inst as unknown as {judge}).judge = judge`
- `voice/voice-genome.ts:320` — `{} as any` (Record<keyof VoiceGenome>) puis peuplé
> Hacks d'injection. Fixables (interface DI explicite) mais touchent des seams ; risque moyen → cluster séparé, pas le premier.

### 🔵 CAT-2 — Accès dynamique à champ optionnel (légitime, narrowing) (~10)
`compat/version-guard.ts:35`, `oracle/axes/temporal-pacing.ts:39`, `scoring/sensors/dictionaries/anchor-lexicon-fr.ts:171` (index par clé), `scoring/sensors/dictionaries/exclusion-patterns.ts:399`, `validation/real-llm-provider.ts:101,110`, `validation/phase-u/phase-u-exit-validator.ts:189,218`, `validation/phase-u/benchmark/run-dual-benchmark.ts:595`, `validation/phase-u/top-k-selection.ts:359`.
> Accès à des champs optionnels/dynamiques sur des objets faiblement typés. **Largement légitimes** ; améliorables par narrowing fort mais faible valeur, risque de sur-ingénierie. KEEP ou cas-par-cas.

### 🟣 CAT-3 — Frontière désérialisation / cache (légitime) (~5)
`authenticity/adversarial-judge.ts:97,128` (cache non typé), `scoring/gb-inference.ts:80` (`modelData as unknown as GBModel`), `scoring/r8-diagnostic.ts:57,58` (données chargées → typées).
> Frontières I/O (cache, modèle GB, données diagnostiques). Casts de désérialisation **légitimes**. KEEP (idéalement valider par schéma, mais hors scope P3).

### 🟠 CAT-4 — Type drift / adaptation de signature (~13)
`oracle/physics-audit.ts:148` (StyledParagraph a plus de champs), `:169,:173` (cast de signature de fonction), `quality/quality-bridge.ts:142,143` (`as unknown as Parameters<typeof ...>`), `validation/phase-u/benchmark/run-dual-benchmark.ts:195,196,392,396,400,431` (sub_scores readonly Axis, fix TS2352 documenté), `validation/phase-u/top-k-selection.ts:220` (`null as unknown as SovereignForgeResult`), `validation/prose-directive-builder.ts:162`.
> Casts qui papier-mâchent un écart de type réel (readonly, champs surnuméraires, placeholder null). **À auditer cas-par-cas** ; certains (sub_scores readonly) ont déjà un commentaire justificatif. Risque variable.

## Recommandation (1 cluster, STOP gate ensuite)
**Premier patch sûr = CLUSTER #1 : `pitch/triple-pitch.ts:255,256`** (2 casts `(pitch as any).total_expected_gain = ...`).
- Pattern identique à truth-gate (mutation→construction immuable), non-14D, isolé, faible risque.
- Protocole : construire `total_expected_gain` à la création de l'objet pitch (ou via type incluant le champ), TSC + tests sovereign-engine avant/après, recompte delta, 1 commit wrapper EMP-10. **STOP gate.**

## Verdict P3-A
- Statut : **PASS** (cartographie livrée, lecture seule, zéro patch, zéro régression).
- Vérité corrigée : sur 45 casts, **9 FROZEN-14D** (interdits), ~15 légitimes (CAT-2/3), ~13 à auditer (CAT-4), **~7 réellement fixables** (CAT-1/1b) dont **2 trivialement sûrs** (triple-pitch).
- Faiblesses : (1) CAT-4 nécessite un audit cas-par-cas (pas un cluster homogène) ; (2) les seams DI (CAT-1b) touchent des points sensibles.
- Risques restants : aucun (lecture seule).
- Action requise : GO Architecte pour patcher CLUSTER #1 (triple-pitch), puis STOP gate avant d'étendre.
