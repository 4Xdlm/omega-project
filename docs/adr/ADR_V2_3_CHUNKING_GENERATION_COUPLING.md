# ADR: V2.3 — Couplage chunking adaptatif → génération
Date: 2026-05-29
Statut: PROPOSED (décision d'implémentation DIFFÉRÉE — ce document cadre options + gates)
Signalé par: Tribunal 2/2 IA (Gemini + ChatGPT) 2026-05-29, arbitrage Architect Francky
Réfs: LAW-CHUNK-048 [SEALED], FORBID-PIPELINE-002/003, MEASURE-CHUNK-V22B-B2, MEASURE-CHUNK-V22C-SHADOW

---

## 1. Contexte

OMEGA possède **deux moteurs de découpage distincts et aujourd'hui non câblés entre eux** (LAW-CHUNK-048, prouvé par grep : `chunkAdaptive` n'est importé que dans `chunking/` + `tests/`) :

- **Le Scalpel — `chunkAdaptive` (analytique)** : découpe un *texte existant* en cherchant les fractures sémantiques. C'est ce que la chaîne V2.2-B/C analyse et optimise.
- **Le Planificateur — `ChunkPlan` (génératif, `generation/adaptive-chunker.ts`)** : ne découpe rien ; à partir d'un `sceneBrief` + `EmotionContract` (curve_quartiles, tension, silence_zones, archétype), il planifie comment le LLM (qwen3:32b) écrit la prose *ex nihilo*.

Deux résultats empiriques motivent la question du couplage :
- **B2 (48 livres FR+EN)** : 52.4 % des frontières V2.1 sont SUB_OPTIMAL (une coupe voisine donnerait une rupture sémantique plus nette). `random_control_gap ≈ 0` → les frontières V2.1 sont quasi-aléatoires (HALLU-IA-014).
- **V2.2-C SHADOW** : un optimiseur déplace 77.4 % des frontières vers une coupe plus nette (cosinus 0.763 → 0.722), de façon déterministe et valide.

**Le Scalpel sait donc trouver de meilleures frontières — mais il n'est relié à rien.** Il améliore un découpage qui n'alimente ni la génération ni le scoring V3.4.

## 2. Question de décision

Faut-il, et comment, câbler le découpage adaptatif (Scalpel, éventuellement optimisé V2.2-C) pour **influencer la génération de prose** — afin de tester l'hypothèse « meilleur découpage → meilleure prose générée » ?

## 3. Décision

**DIFFÉRÉ.** Le couplage n'est PAS adopté en l'état. Aucune implémentation n'est autorisée sous ce document seul. Ce document **définit l'architecture candidate, les options, et les conditions falsifiables d'adoption** d'un futur sprint V2.3. La décision d'implémenter appartient à l'Architecte, après instruction de ce dossier.

Raison : (a) le couplage touche le pipeline qui *génère* la prose (risque le plus élevé du projet) ; (b) il n'existe aujourd'hui aucun chemin par lequel un découpage de texte source devienne un plan de génération — c'est une **fonctionnalité nouvelle**, pas un branchement ; (c) la doctrine impose ADR → feature flag → bench A/B → rollback → tests avant tout code sur le pipeline génératif.

## 4. Options analysées

### Option A — Statu quo (ne rien coupler) [baseline]
- Le Scalpel reste `SHADOW_BOUNDARY_ANALYZER` (analyse de corpus existant). La génération continue sur `EmotionContract`.
- **Pour** : zéro risque, zéro dette, conforme LAW-CHUNK-048. **Contre** : on n'explore jamais l'hypothèse « meilleur découpage → meilleure prose ».
- Mécanisme : aucun changement causal.

### Option B — Pré-segmentation de source (le Scalpel découpe, le Planificateur génère par segment)
- Nouveau mode : un texte source (ébauche, trame longue, chapitre brut) est découpé par `chunkAdaptive` (optionnellement optimisé V2.2-C) ; chaque segment produit un `sceneBrief` qui alimente la génération.
- **Pour** : c'est le seul chemin où une *meilleure frontière* peut réellement changer la prose (briefs mieux découpés). **Contre** : suppose un cas d'usage « réécriture/expansion d'un texte source », distinct de la génération `ex nihilo` actuelle. Lourd : nouveau pont source→brief.
- Mécanisme causal candidat : frontière plus nette → segment sémantiquement cohérent → brief moins ambigu → prose plus cohérente. **À PROUVER.**

### Option C — Conseiller (advisory) sur le plan de génération
- Le Scalpel, appliqué à une ébauche/trame, fournit des *indices* de coupe au Planificateur, qui reste maître de son `ChunkPlan` (`EmotionContract` prioritaire, indices Scalpel pondérés).
- **Pour** : moins invasif que B, `EmotionContract` préservé. **Contre** : mélange deux logiques hétérogènes (intensité émotionnelle vs fracture lexicale) → « soupe technique » (ChatGPT) si non contrôlé ; effet probablement faible.
- Mécanisme : couplage mou, signal dilué — risque de mesurer ~0.

### Option D — Métrique d'analyse seulement (pas de génération)
- Utiliser le Scalpel optimisé uniquement comme *outil de diagnostic* (où un texte se fracture), sans toucher la génération.
- **Pour** : valeur réelle (analyse de corpus, étude des maîtres), zéro risque. **Contre** : ne répond pas à la question du couplage. = extension d'Option A.

## 5. Conditions d'adoption (gates falsifiables, AVANT tout code)

Tout sprint V2.3 implémentant B ou C DOIT satisfaire, dans l'ordre :

1. **Cas d'usage explicite** : définir le mode (génération `ex nihilo` actuelle ≠ réécriture/expansion de source). Le couplage n'a de sens que si un *texte source* existe à découper.
2. **Métrique de succès = prose générée, PAS Δρ V3.4** (V3.4 est découplé, LAW-CHUNK-048). Mesure = score Oracle composite (ECC/AAI/RCI/SII/IFI) sur prose générée, bench **A/B** : génération sous plan `EmotionContract` (contrôle) vs plan couplé (traitement), mêmes briefs/seeds.
3. **n ≥ 6 scènes + CI 95 %** (LAW-NCR-BENCH-N-001, anti small-n luck) ; seuil d'adoption pré-défini AVANT le bench (anti post-hoc).
4. **Feature flag opt-in** (ex. `OMEGA_V2_3_CHUNK_COUPLING='0'|'shadow'|'1'`, défaut `0`), shadow d'abord.
5. **Non-régression `EmotionContract`** : prouver que le mode couplé ne dégrade aucun axe Oracle vs contrôle (kill-switch : si Δcomposite < 0 → REJECT).
6. **Rollback** documenté + **tests** (unitaires plan couplé + intégration mock provider, pas de qwen réel en CI).
7. **ADR de clôture** (ce document → RÉSOLU) consignant le verdict empirique.

Kill-switch chunking-approprié (remplace l' illusoire Δρ V3.4) : **Δcomposite Oracle ≥ +seuil** sur bench A/B ; sinon SHADOW permanent ou REJECT.

## 6. Risques

- **Mélange de deux moteurs hétérogènes** (fracture lexicale vs courbe d'intensité) → comportement émergent non maîtrisé si couplage mou (Option C).
- **Toucher le pipeline génératif** = zone la plus sensible (prose qualité publication). Toute régression `EmotionContract` est inacceptable.
- **Mesurer du vide** si le cas d'usage (texte source) n'est pas défini — répétition de l'erreur Phase 4 (FORBID-PIPELINE-002).
- Coût qwen3:32b : un bench A/B génération = heures (détaché), à budgéter.

## 7. Recommandation (non contraignante)

Si V2.3 est ouvert : commencer par **Option B en shadow** sur un *cas d'usage réécriture/expansion de source explicite*, avec bench A/B Oracle (n ≥ 6), feature flag, et le kill-switch Δcomposite. Sinon, **Option A/D** (le Scalpel reste un analyseur de corpus — usage déjà prouvé et sans risque).

## 8. Impact (en l'état)

Aucun code modifié. Aucune loi modifiée. `chunkAdaptive` et `EmotionContract` restent découplés (LAW-CHUNK-048 intact). Ce document devient le prérequis documentaire de tout sprint V2.3 (NCR `ADR_V2_3_CHUNKING_GENERATION_COUPLING` [DEFERRED] → ce fichier).

## 9. Verdict

**DÉCISION : DIFFÉRÉ — gates définis.** Implémentation suspendue jusqu'à décision Architecte d'ouvrir V2.3. Statut de ce document : PROPOSED ; passera à ACCEPTED (option retenue) ou RÉSOLU (après bench V2.3) lors de l'instruction.

## 10. Décision de cycle (2026-05-29) — Tribunal 2/2 IA

**Option A/D actée pour ce cycle.** Le Scalpel (`chunkAdaptive` + optimiseur V2.2-C) reste `SHADOW_BOUNDARY_ANALYZER` : outil de diagnostic / analyse de corpus (comprendre où le texte se fracture), **non câblé** à la génération. **V2.3 (couplage génératif) N'EST PAS OUVERT** — l'effort (nouveau pont source→brief, heures qwen3:32b) ne justifie pas le risque de déstabiliser le moteur de génération qui tourne sur son propre `EmotionContract`.
- Gemini : valide forme+fond, acte A/D, ne pas ouvrir V2.3.
- ChatGPT : PASS ADR ; si poursuite un jour → **prochaine étape = dossier d'instruction V2.3-M0 (doc-only, read-only)** définissant cas d'usage / protocole A/B Oracle / n≥6 / seuil composite / kill-switch / flag / rollback / coût qwen — AUCUN code. Sinon STOP, état propre.

LAW-CHUNK-048 intact. FORBID-PIPELINE-002/003 en vigueur. Cet ADR reste scellé sur origin et balise le terrain ; prochain incrément autorisé = V2.3-M0 (doc) sur décision Architecte, jamais du code V2.3 en autonomie.
