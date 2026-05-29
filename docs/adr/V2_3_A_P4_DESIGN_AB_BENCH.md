# Design P4 — Bench A/B réécriture (Oracle composite, kill-switch) (V2.3-A)
Date: 2026-05-29
Statut: DESIGN (doc-only) — attend GO_CODE Tribunal (run qwen multi-heures)
Parent: ADR_V2_3 (B) · P0 528e183e · P1 e37c8d04 · P2 6e00e909 · P3 0550ffc1 + smoke PASS
Périmètre: **doc-only · le run réel = qwen, opt-in/détaché · seuils figés AVANT run · pas de claim avant verdict**
But: prouver (ou réfuter) que le découpage SCALPEL produit une MEILLEURE prose réécrite que le découpage NAÏF. C'est le juge final d'Option B.

---

## 1. Hypothèse testée
H1 : à texte source + K segments identiques, réécrire les segments découpés par le **Scalpel** (frontières sémantiques) donne une prose de **meilleure qualité Oracle** que réécrire les segments découpés **naïvement**. Frontière = seule variable.

## 2. Métrique (ancrée code)
`judgeAestheticV3(packet, prose, provider, null) → MacroSScore { composite, min_axis, macro_axes{ECC,RCI,SII,IFI,AAI} }` (oracle/aesthetic-oracle.ts). C'est l'Oracle V2 qui a scoré le livre V1 (composite 87.8). **PAS Δρ V3.4** (découplé, LAW-CHUNK-048).
⚠️ **Coût réel** : chaque scoring V3 = ~10-15 appels qwen (axes ECC/RCI/SII/IFI/AAI LLM-jugés : interiority/impact/necessity 3-5shot, emotion_coherence...). Le bench est **dominé par le SCORING**, pas la génération.

## 3. Protocole A/B
- **Sources** : M textes (corpus SPLIT_V2.1.1), ex M=2-3 chapitres. Pour chacun : K = scalpelSegments(text).length.
- **Bras CONTRÔLE (naïf)** : découpage à K segments de mots ~égaux, **aligné aux frontières de PHRASES** (raffinement vs P2 : éviter les coupes mid-phrase qui handicaperaient injustement le contrôle — les 2 bras ont des phrases complètes, seul le GROUPEMENT diffère).
- **Bras TRAITEMENT (scalpel)** : `scalpelSegments(text)` (chunkAdaptive, frontières sémantiques).
- Par segment : P0 → P1 → forgePacketToSceneBrief → P3 buildRewritePrompt → `provider.generateDraft(prompt,'rewrite_v2_3',seed)` (qwen) → `judgeAestheticV3` → composite/min_axis.
- **n ≥ 6 segments/bras** (LAW-NCR-BENCH-N-001), **≥ 2 seeds/segment** (estimer σ qwen intra). Cible : n=6-8 segments, 2 seeds.

## 4. Comparaison + seuils (FIGÉS avant run — anti post-hoc, doctrine P3)
- **Pairing** : par (source, région) — segment i naïf ↔ segment i scalpel couvrent ~la même portion du texte. Comparaison appariée quand l'alignement régional tient ; sinon moyennes par bras + CI95.
- Δcomposite = mean(treatment) − mean(control) (moyenne sur seeds puis segments).
- **Kill-switch (pré-défini)** :
  | Verdict | Condition |
  |---|---|
  | **GO_B** | Δcomposite **≥ +2.0** ET min_axis non dégradé (Δmin_axis ≥ −0.5) ET CI95 borne basse > 0 |
  | **SHADOW** | Δcomposite ∈ [−1.0, +2.0[ (sous le bruit σ≈2 qwen) → opt-in shadow permanent |
  | **REJECT** | Δcomposite < −1.0 OU régression d'un macro-axe (Δaxe < −2.0) |
- Seuil +2.0 justifié : composites V1 observés 85-91, σ qwen intrinsèque ≈2 → l'effet doit dépasser le bruit (cf MEASURE-OMEGA-V1-SEAL).

## 5. Coût runtime (révisé, ancré smoke + Oracle)
- Génération directe (rewrite_v2_3, sans DUEL/R6) : ~20-60s/segment (smoke = 19s).
- Scoring V3 : ~10-15 appels qwen courts/prose ≈ 2-5 min/prose.
- n=6 × 2 bras × 2 seeds = **24 proses** → 24 gen (~12 min) + 24 scoring (~1-2h). **Total ≈ 1.5-3h détaché** (dominé par l'Oracle). keep_alive 24h.
- **Run strategy** : détaché (Desktop Commander), **JSONL incrémental** (1 ligne/prose scorée) → **reprise sur crash** (EPIPE ~7 scènes, cf book V1). Lots ≤ 6 proses/run. Ollama health PRE/POST.

## 6. Déterminisme / invariants
- Sélection sources + seeds + seuil FIGÉS avant le run (loggés dans le script). qwen seedé (generateDraft(seed)) — note : qwen σ résiduel ~2pts même seedé.
- Aucun changement du chemin ex-nihilo (generateChunkedDraft intact). Feature flag opt-in `OMEGA_V2_3_CHUNK_COUPLING=1` pour le run réel. CI = mock (zéro qwen).

## 7. Tests (CI, ZÉRO qwen)
- Harness A/B avec **generate mock + score mock** → vérifier : routage 2 bras, n compté, pairing, agrégation Δcomposite, application kill-switch (seuils), JSONL append/reprise, déterminisme de la sélection. Aucun qwen en CI.

## 8. Interdits
- Pas de seuil abaissé post-hoc. Pas de claim prose avant verdict. Pas de Δρ V3.4 comme métrique. Pas de modif generateChunkedDraft/Oracle. n<6 interdit (small-n luck, HALLU-IA-009).

## 9. Critère PASS P4 (sceller)
- Bench exécuté n≥6×2 bras×≥2 seeds, 0 crash non-repris, JSON résultats complet, verdict kill-switch appliqué (GO_B/SHADOW/REJECT), seuils prouvés figés avant run, ex-nihilo intact. Harness + tests CI (mock) PASS via wrapper EMP-10.

## 10. Verdict design
P4 est le juge final : Oracle composite (métrique adaptée, pas Δρ V3.4), n≥6 + seuils figés, naïf aligné-phrases pour un contrôle juste, run détaché reprenable. **Honnêteté** : (a) coût dominé par le scoring Oracle (1.5-3h) ; (b) pairing régional imparfait (frontières divergent par nature) → reporter moyennes + CI ; (c) σ qwen ~2 → seuil +2.0 exigeant volontairement. Le smoke P3 a prouvé la faisabilité ; P4 prouve (ou non) la SUPÉRIORITÉ. **Demande GO_CODE P4** : harness + tests CI (mock) d'abord, puis run qwen détaché opt-in séparé.
