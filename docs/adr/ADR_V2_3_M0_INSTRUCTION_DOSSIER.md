# Dossier d'instruction V2.3-M0 — Couplage chunking → génération
Date: 2026-05-29
Statut: INSTRUCTION (doc-only) — support de décision GO_B / HOLD / REJECT
Parent: ADR_V2_3_CHUNKING_GENERATION_COUPLING (PROPOSED) — §4 Options, §5 Gates
Réfs: LAW-CHUNK-048 [SEALED], FORBID-PIPELINE-002/003, MEASURE-CHUNK-V22B-B2, MEASURE-CHUNK-V22C-SHADOW, MEASURE-OMEGA-V1-SEAL
But: permettre à l'Architecte de trancher en connaissance du cas d'usage, du protocole de preuve, du coût et du risque réels. **Aucun code.**

---

## 0. Rappel du verrou causal

Deux moteurs **non câblés** (LAW-CHUNK-048, prouvé grep) :
- **Scalpel** `chunkAdaptive` (+ optimiseur V2.2-C) : découpe un *texte existant* aux fractures sémantiques.
- **Planificateur** `ChunkPlan` (`generation/adaptive-chunker.ts`) : à partir d'un `EmotionContract` + `sceneBrief`, planifie la génération *ex nihilo* (qwen3:32b).

Seule l'**Option B** (pré-segmentation de source) a un mécanisme causal où une meilleure frontière peut changer la prose. Ce dossier instruit B.

---

## 1. Cas d'usage réécriture / expansion

**Génération actuelle = ex nihilo** : entrée = brief court + courbe d'intensité, sortie = prose neuve. Il n'y a **pas de texte source**. Coupler le Scalpel suppose donc un **mode produit nouveau** :

> **Mode RÉÉCRITURE/EXPANSION** : entrée = un *texte source* français cohérent (ébauche, trame longue, chapitre brut, ou prose existante à retravailler). OMEGA le **découpe** (Scalpel) en segments aux fractures sémantiques, puis **régénère/étend chaque segment** au standard OMEGA (K2+DUEL+R6+Oracle).

Décisions à acter (Architecte) :
- **(Q1)** Ce mode réécriture/expansion fait-il partie de la vision OMEGA ? Si NON → REJECT (le couplage n'a pas d'usage).
- **(Q2)** Texte source type : ébauche brute de l'auteur ? sortie d'un autre modèle ? œuvre du domaine public à pasticher ? Le choix fixe le corpus de test.
- **(Q3)** Transformation : réécriture iso-longueur (style OMEGA) OU expansion (segment court → scène développée) ? L'expansion est le cas où le découpage compte le plus.

**Sans réponse à Q1-Q3, le bench n'a pas de référent → ne pas coder (FORBID-PIPELINE-002).**

---

## 2. Mapping source → sceneBrief (le vrai coût technique)

Chaîne de génération actuelle (ancrée code) : `ForgePacket` → `forgePacketToSceneBrief(packet)` (`generation/forge-to-brief.ts`) → `ChunkedGenerationInput {sceneBrief, EmotionContract, seed}` → `generateChunkedDraft` (qwen3:32b).

L'`EmotionContract` (`src/types.ts:56`) requiert : `curve_quartiles[4]`, `tension {pic_position_pct, faille_position_pct, silence_zones[]}`, archétype, etc. **Il est aujourd'hui produit EN AMONT (CDE/forge), pas dérivé d'un texte.**

→ **Composant manquant (P0 du sprint)** : `deriveEmotionContractFromSegment(sourceSegment) → EmotionContract`. C'est une **brique d'ANALYSE neuve** (mesurer intensité/tension/silences sur un texte) — proche de l'esprit du Scalpel mais distincte. **C'est ici qu'est 70 % du coût d'ingénierie, pas dans le branchement.**

Pipeline B candidat :
```
texte source → chunkAdaptive (Scalpel, frontières V2.1 ou optimisées V2.2-C)
            → par segment : deriveEmotionContract(segment) [NEUF]
                          + buildForgePacket(segment) [NEUF/adapté]
                          → forgePacketToSceneBrief → generateChunkedDraft (qwen)
            → assemblage + Oracle composite
```

Risque : si `deriveEmotionContract` est faible, B échoue pour une raison **autre** que le découpage → confusion causale. Mitigation : tester `deriveEmotionContract` isolément avant le bench A/B.

---

## 3. Protocole A/B Oracle (falsifiable, pré-défini)

- **Unité** : 1 segment source → 1 scène générée. **n ≥ 6 segments** (LAW-NCR-BENCH-N-001 anti small-n), idéalement 8-10 pour CI95 vu σ qwen.
- **Bras** :
  - **Contrôle (A)** : pipeline actuel — `EmotionContract` dérivé du segment, **frontières = découpage naïf** (ex. découpage fixe / paragraphes) → briefs → génération.
  - **Traitement (B)** : **mêmes segments** mais frontières = **Scalpel** (chunkAdaptive, ou optimisées V2.2-C) → briefs → génération.
  - Variante isolée possible : A = frontières Scalpel V2.1 ; B = frontières optimisées V2.2-C (mesure l'apport de l'optimiseur seul).
- **Contrôles** : **mêmes seeds** (déterminisme qwen via seed), même texte source, même `deriveEmotionContract`, même config DUEL/R6. Seule la **frontière** varie entre A et B. C'est l'unique variable manipulée.
- **Mesure** : `composite` Oracle (5 macro-axes ECC/AAI/RCI/SII/IFI, `oracle/macro-axes.ts`) + `min_axis` par scène, par bras. Comparaison **appariée** (paired, même segment A vs B).
- **Réplications** : ≥ 2 seeds par segment pour estimer σ intra (qwen σ≈2 pts composite, cf historique).

---

## 4. Seuil composite + kill-switch (pré-défini AVANT bench)

Bruit de référence (ancré MEASURE-OMEGA-V1-SEAL + livre V2) : composites observés **85.3–90.8**, σ qwen intrinsèque **≈ 2 pts**. Un effet doit donc dépasser le bruit.

| Verdict | Condition (paired, n≥6) |
|---|---|
| **GO_B (adopter)** | Δcomposite moyen **≥ +2.0** ET min_axis non dégradé (Δmin_axis ≥ −0.5) ET CI95 borne basse > 0 |
| **SHADOW** | Δcomposite ∈ [−1.0, +2.0[ (signal sous le bruit) → garder opt-in shadow, ne pas activer |
| **REJECT** | Δcomposite < −1.0 OU régression d'un axe (min_axis Δ < −2.0) |

Kill-switch dur : **toute régression EmotionContract** (un axe Oracle du bras B < bras A au-delà du bruit) = REJECT immédiat, peu importe le composite. Seuil **figé avant** le bench (anti post-hoc, doctrine P3).

---

## 5. Coût runtime qwen3:32b (estimé, ancré data réelle)

Ancrage : livre V2 (MEASURE-OMEGA-V1-SEAL / project_book_generation_v2) = pipeline K2+DUEL(4)+R6+Oracle, **~14-18 min/scène** nominal (outliers 28-64 min sur reprises), 10 scènes ≈ 4.5h. Anti-eviction keep_alive='24h' actif (NCR_OLLAMA_TIMEOUT, mean/call ~1.17 min).

Estimation bench A/B :
- n=6 segments × 2 bras × ~2 seeds = **24 scènes** → 24 × ~16 min ≈ **~6.4h** (fourchette **5–9h** avec variance + relances).
- n=8 × 2 bras × 2 seeds = 32 scènes → ~8.5h (fourchette 7–12h).
- **Mode obligatoire** : détaché (Desktop Commander) + reprise sur crash (EPIPE tue le process ~7 scènes — cf book V2). Découper en lots ≤ 6 scènes/run.
- **Incertitude** : ± selon longueur segments + charge GPU. Marquer ESTIMATION, re-mesurer sur 1 scène smoke avant le run complet.

Le composant `deriveEmotionContract` + harness A/B = **2-4 j d'ingénierie** AVANT le run (estimation, non mesurée).

---

## 6. Feature flag + rollback

- **Flag** : `OMEGA_V2_3_CHUNK_COUPLING = '0' | 'shadow' | '1'` (défaut `'0'`). `'0'` = pipeline actuel intact (génération ex nihilo). `'shadow'` = calcule le plan couplé + logue, ne génère pas dessus. `'1'` = mode réécriture actif (opt-in explicite).
- **Additif** : aucune modification du chemin ex-nihilo existant ; le mode réécriture est une **branche séparée** (nouveau entry point), pas une mutation de `generateChunkedDraft`.
- **Rollback** : flag → `'0'` (instantané, zéro effet de bord puisque additif). Aucun fichier sealed RC1 touché. EmotionContract pipeline existant inchangé.
- **Tests** : unitaires `deriveEmotionContract` + mapping segment→brief (mock provider, **pas de qwen réel en CI** — cf MEASURE-VITEST-SUITE-V22, suite doit rester ~5s) ; intégration shadow.

---

## 7. Recommandation finale argumentée

**Lean : HOLD (ne pas ouvrir V2.3-implémentation maintenant), conditionné à Q1.**

Raisons :
1. **Dépendance produit non tranchée (Q1)** : le couplage n'a de valeur que si le **mode réécriture/expansion** entre dans la vision OMEGA. OMEGA est aujourd'hui un générateur *ex nihilo* qualité publication qui fonctionne (composite 87.8, V1 scellé). Tant que Q1 n'est pas « oui » explicite, coder le pont = pont entre deux rives non choisies (FORBID-PIPELINE-002).
2. **Le coût réel est le composant neuf** `deriveEmotionContract` (analyse d'intensité sur texte), pas le branchement — 70 % de l'effort, et c'est un risque de confusion causale (un B faible pourrait venir de cette brique, pas du découpage).
3. **Coût/risque vs gain incertain** : 5-9h qwen + 2-4j d'ingénierie pour un Δcomposite **non garanti** (le SHADOW V2.2-C ne prouve qu'une coupe « plus nette » sémantiquement, pas une meilleure prose — c'est précisément ce que ce bench testerait).

**Si Q1 = OUI** (Francky veut un mode réécriture) → **GO_B en SHADOW d'abord** : (a) construire + tester `deriveEmotionContract` isolément ; (b) harness A/B ; (c) smoke 1 scène (valider coût/pipeline) ; (d) bench n≥6 détaché ; (e) verdict kill-switch §4. ADR_V2_3 → ACCEPTED option B.

**Si Q1 = NON / indécis** → **HOLD** : le Scalpel reste `SHADOW_BOUNDARY_ANALYZER` (usage prouvé, zéro risque). ADR_V2_3 reste PROPOSED. Réouvrir si le besoin réécriture émerge.

**REJECT** seulement si Francky exclut définitivement tout mode réécriture → clore ADR_V2_3 RÉSOLU(rejeté).

---

## 8. Décision attendue (Architecte)

Cocher : **[ ] GO_B (Q1=oui, shadow d'abord)** · **[ ] HOLD (défaut recommandé)** · **[ ] REJECT (pas de mode réécriture)**

Prochaine action selon choix :
- GO_B → sprint V2.3-A : `deriveEmotionContract` (P0) + harness A/B + smoke, ADR avant code (déjà fait), feature flag.
- HOLD → rien à coder ; ce dossier reste le point de reprise.
- REJECT → clore ADR_V2_3 + NCR ADR_V2_3 (RÉSOLU rejeté).
