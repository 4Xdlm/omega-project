# Design P4 — Bench A/B réécriture (Oracle composite, kill-switch) (V2.3-A)
Date: 2026-05-29
Statut: DESIGN (doc-only) — attend GO_CODE Tribunal (run qwen multi-heures)
Parent: ADR_V2_3 (B) · P0 528e183e · P1 e37c8d04 · P2 6e00e909 · P3 0550ffc1 + smoke PASS
Périmètre: **doc-only · le run réel = qwen, opt-in/détaché · seuils figés AVANT run · pas de claim avant verdict**
But: prouver (ou réfuter) que le découpage SCALPEL produit une MEILLEURE prose réécrite que le découpage NAÏF. C'est le juge final d'Option B.

---

## 1. Hypothèse testée
H1 : à texte source + K segments identiques, réécrire les segments découpés par le **Scalpel** (frontières sémantiques) donne une prose de **meilleure qualité Oracle** que réécrire les segments découpés **naïvement**. Frontière = seule variable.

## 2. Métrique (ancrée code) — RÉVISÉE 2026-05-29 (Option D)
**Initialement** `judgeAestheticV3(...) → composite` (Oracle V2 standard). **BLOQUANT découvert au run** : `computeECC.sub_scores[0] = tension_14d` lit `curve_quartiles[].target_14d`, vide `{}` en V2.3 réécriture (14d GARAGE/DORMANT, NCR_EMOTION14_CANON_DRIFT) → **NaN → `canonicalize` FATAL**. Diagnostic isolé via `diag-v2_3-score.ts` (ECC.sub_scores[0]).
**Décision Architecte = Option D** (vs A=`target_14d` uniforme bidon, B'=amputation totale ECC) : métrique **REWRITE_ORACLE** scopée V2.3, `oracle/rewrite-oracle.ts` :
`scoreRewriteOracle(packet, prose, provider) → { composite, min_axis, axes }` = moyenne égale de **7 axes** : `RCI, SII, IFI, AAI` (macro) + `emotion_coherence, interiority, impact` (sous-axes ECC valides). **EXCLUT le seul axe incompatible : `tension_14d`.** `target_14d` reste `{}` (FORBID-CANON-GARAGE-001, zéro résurrection). `judgeAestheticV3` **NON modifié** (composite standard intact pour l'ex-nihilo). Réf : NCR_V2_3_ORACLE_ECC_14D_INCOMPATIBLE.
⚠️ **Coût réel** : chaque scoring = 7 axes, dont emotion_coherence/interiority/impact LLM-jugés 3-shot → ~15-20 appels qwen/prose. Le bench est **dominé par le SCORING**, pas la génération.

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
  | **GO_B_CANDIDATE** | Δcomposite **≥ +2.0** ET min_axis non dégradé (Δmin_axis ≥ −0.5) ET CI95 borne basse > 0 — *recommandation, décision Architecte (jamais auto-promotion)* |
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
