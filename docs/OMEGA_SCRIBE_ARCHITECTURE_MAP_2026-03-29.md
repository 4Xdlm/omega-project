# OMEGA — CARTOGRAPHIE ARCHITECTURALE SCRIBE + JUGE V2
**Date** : 2026-03-29
**Statut** : LECTURE SEULE — aucune modification
**Source** : 217 fichiers TS lus, 6 agents paralleles

---

## 1. CARTE TOPOLOGIQUE

```
[ForgePacket]
    |
    v
[engine.ts] ─────────────────────────────────────────────────────────
    |
    ├─1→ [symbol-mapper.ts] ───→ LLM (1 call) ──→ SymbolMap
    ├─2→ [signature-bridge.ts] ──→ Enrichit packet.lexicon
    ├─3→ [emotion-brief-bridge.ts] ──→ EmotionBrief
    ├─4→ [prompt-compiler.ts] ──→ V3 Partition (CALC)
    ├─5→ [prompt-assembler-v4.ts] ──→ Prompt 11 blocs ~800t
    |
    ├─6→ [chunked-generator.ts] ──→ LLM (4 calls x 750w) ──→ Draft 3000w
    |     └── Persona Flaubert+Proust, RAPPEL K2 Duras
    |
    ├─7→ [semantic-slicer.ts] ──→ Force 4+ paragraphes (CALC)
    ├─8→ [physics-audit.ts] ──→ Emotion audit (CALC, informatif)
    |
    ├─9→ [sovereign-loop.ts] ──→ Max 2 passes (delta→pitch→patch)
    |     ├── [delta-computer.ts] ──→ CALC
    |     ├── [triple-pitch.ts] ──→ LLM (3 strategies)
    |     ├── [patch-engine.ts] ──→ LLM (apply patch)
    |     └── [aesthetic-oracle.ts] ──→ Score V3 (LLM + CALC)
    |
    ├─10→ [duel-engine.ts] ──→ 3 modes + loop_refined
    |      ├── CV_GATE (1.05 seuil, CALC)
    |      ├── LLM (3 drafts, ~750w chacun)
    |      └── [aesthetic-oracle.ts] ──→ Score V3 par candidat
    |           └── Selection hostile: comp - 1.5*max(0, 85-min_axis)
    |
    ├─11→ [semantic-slicer.ts] ──→ Re-slice duel winner (CALC)
    ├─12→ [micro-surgeon.ts] ──→ 1-3 micro-interventions
    |      └── [damage-gate.ts] ──→ 6 categories, seuils 0.01-0.50
    |
    ├─13→ [aesthetic-oracle.ts] ──→ Score FINAL V3
    |      ├── [macro-axes.ts] ──→ ECC/RCI/SII/IFI/AAI
    |      ├── [llm-judge.ts] ──→ 5 axes LLM (interiority, impact, necessity, sensory, tension)
    |      ├── [text-features.ts] ──→ 42 features CALC
    |      └── [s-score.ts] ──→ Composite + Verdict
    |
    ├─14→ [targeted-patch.ts] ──→ P5 chirurgical (optionnel)
    └─15→ [quality-bridge.ts] ──→ M1-M12 (informatif)
    |
    v
[SovereignForgeResult]
  ├── final_prose
  ├── macro_score (ECC/RCI/SII/IFI/AAI + composite + verdict)
  └── verdict: SEAL | REJECT
```

---

## 2. COUCHES DU MODULE SCRIBE

### 2.1 Prompt Assembler V4 (`input/prompt-assembler-v4.ts`, 372 lignes)
**Role** : Construit le prompt 11 blocs envoye au LLM Scribe.

| Bloc | Contenu | Tokens |
|------|---------|--------|
| 1 Persona | "ecrivain fiction [register], maitre narration sensorielle" | ~30t |
| 2 Context | Resume scene + POV + tense + "MINIMUM [target_words] mots" | ~100t |
| 3 Trajectory | "4 paragraphes" + P1 incisif, P2 AMPLE, P3 HACHE, P4 AMPLE | ~200t |
| 4 Beats | Actions narratives + tags sensoriels (2 max) | ~130t |
| 5 Directives | 7 regles metriques (voir ci-dessous) | ~120t |
| 6 Voice | Instructions conflit-specifiques | ~25t |
| 7 Symbols | Palette signature (6 mots) + motifs + hooks (8 max) | ~80t |
| 8 Exemplar | 1 golden exemplar SAGA-ready (deterministe par packet_id) | ~150t |
| 8b Rhythm | Lore Flaubert/Proust : "periodes amples" + "portes qui se ferment" | ~80t |
| 9 Interdits | Pas d'emotion nommee, pas de resume, pas de lyrisme decoratif | ~40t |
| 10 Rosetta | Contraintes metriques (voir ci-dessous) | ~60t |
| 11 Final | "Ecris en 4 paragraphes" + asymetrie | ~30t |

**Metriques injectees dans le prompt (Bloc 5 + 10)** :
- "70 mots uniques pour 100 mots" (vocabulaire)
- "une phrase sur trois < 8 mots, une sur trois > 25 mots" (contraste)
- "aucun bigramme > 2 fois" (redondance)
- "> 85% bigrammes uniques" (originalite)
- "premiere phrase < 15 mots" (accroche)
- "6 mots sensoriels pour 100 mots" (sensoriel)
- Ref maitres : "28.8 mots/phrase en moyenne"

### 2.2 Chunked Generator K2 (`generation/chunked-generator.ts`, 201 lignes)
**Role** : Genere le draft initial en 4 chunks de ~750 mots.

- 4 appels LLM sequentiels
- Contexte : 200 derniers mots du chunk precedent
- Persona : duo Flaubert + Proust (hardcode)
- RAPPEL chunks 1-2 : souffle Flaubert + murmure Duras
- RAPPEL chunks 3-4 : correcteur de rythme + ancre de tenue

### 2.3 Draft Modes (`duel/draft-modes.ts`, 42 lignes)
**Role** : 3 instructions de style pour le Duel.

| Mode | Cible | Caractere |
|------|-------|-----------|
| tranchant_minimaliste | 8-12 mots/phrase | Compression, syncopes |
| sensoriel_dense | 15-20 mots/phrase | Saturation sensorielle |
| experimental_signature | Variable | Ruptures, risques |

### 2.4 Duel Engine (`duel/duel-engine.ts`, 226 lignes)
**Role** : Competition entre 4 candidats (loop_refined + 3 modes).

- CV_GATE : rejette si CV_sent > 1.05 (calibre Duras max = 1.031)
- Max retries : 2 par mode
- Selection hostile : `comp - 1.5 * max(0, 85 - min_axis)`

### 2.5 Golden Exemplars (`input/golden-exemplars.ts`, 47 lignes)
**Role** : 2 exemplars SAGA-ready injectes dans le prompt.

- GE-SAGA-01 : 362 mots, comp=92.3 (bergamote, the, falaises)
- GE-SAGA-02 : 241 mots, comp=91.9 (Rosa Mundi, souvenir horticole)
- Selection deterministe par hash(packet_id)

---

## 3. COUCHES DU JUGE V2

### 3.1 Aesthetic Oracle (`oracle/aesthetic-oracle.ts`)
**Role** : Calcule les 5 macro-axes + composite + verdict.
**Methode** : HYBRIDE (CALC + LLM pour certains sous-axes)

### 3.2 Macro-Axes (`oracle/macro-axes.ts`)

| Axe | Poids | Plancher | Methode | Sous-composants |
|-----|-------|---------|---------|-----------------|
| ECC | 33% | 88 | HYBRIDE | tension_14d(3.0), emotion_coherence(2.5), interiority(2.0 LLM), impact(2.0 LLM) |
| RCI | 17% | 85 | CALC | rhythm(1.0), signature(1.0), hook_presence(0.20), euphony |
| SII | 15% | 80 | HYBRIDE | anti_cliche(1.0 CALC), necessity(1.0 LLM), metaphor_novelty(1.0 LLM) |
| IFI | 10% | 85 | HYBRIDE | sensory(0.25 CALC), corporeal(0.25 CALC), focalisation(0.25 LLM), attention(0.125), fatigue(0.125) |
| AAI | 25% | 85 | LLM | show_dont_tell(0.60 LLM), authenticity(0.40 LLM) |

**Poids emotion total** : 63.3% du composite (9.5/15.0)

### 3.3 Verdicts

| Zone | Composite | min_axis | ECC | Verdict |
|------|-----------|----------|-----|---------|
| GREEN | >= 93 | >= 80 | >= 88 | SEAL |
| YELLOW | >= 85 | >= 75 | - | PITCH |
| RED | < 85 | < 75 | - | REJECT |

**SAGA_READY** : composite >= 92 AND min_axis >= 85 (dans best-of-n)

### 3.4 LLM Judge (`oracle/llm-judge.ts`)
**Role** : Juge LLM pour 5 axes (interiority, impact, necessity, sensory_density, tension_14d).

- Max tokens : 150 par axe
- Retries : 3 (backoff 2s*n)
- Timeout : 30s (fail-closed)
- Rate limit : 1000ms entre appels
- Cache SHA256(axe + prose + PROMPT_VERSION)
- Version : 'v2'

### 3.5 Text Features (`scoring/text-features.ts`)
**Role** : Calcul CALC-pur de 42 features depuis le texte brut.

Familles : F1 rythme (5), F5 verbes (5), F9 adversatif (2), F12 temps (1), F15 redondance (1), F16 hapax/bigram (4), F17 couteau/banal (3), F18 ellipse (1), F19 entropie (3), F21 repetition (3), F24 contraste (5), F25 description (7), F26 periode (3), F27 modalite (4), F28 SIL (4), F29 TTR (4), F30 temps verbal (4), F33 ponctuation (3), F34 paragraphes (2), F35 hook (2), F36 cliff (3), F38 vitesse (3).

### 3.6 GB Scorer (`scoring/gb-scorer.ts` + `gb-inference.ts`)
**Role** : Gradient Boosting V1, 50 arbres, 42 features.
- Spearman : 0.79
- Output : 1-5 (tier scale)
- Non utilise dans le pipeline principal (reference/benchmark seulement)

---

## 4. MATRICE DES COMMUNICATIONS

| Source | Destination | Donnees | Frequence |
|--------|------------|---------|-----------|
| engine.ts | symbol-mapper | ForgePacket | 1x/run |
| engine.ts | prompt-assembler-v4 | Enriched packet + SymbolMap | 1x/run |
| engine.ts | chunked-generator | Prompt + provider | 1x/run (4 API) |
| engine.ts | sovereign-loop | Draft + packet + provider | 1x/run (2-6 API) |
| engine.ts | duel-engine | Packet + prompt + provider + loopProse | 1x/run (3-9 API) |
| engine.ts | micro-surgeon | Packet + prose + provider | 1x/run (0-3 API) |
| engine.ts | aesthetic-oracle | Packet + prose + provider | **3x/run** (post-loop, post-duel, post-patch) |
| aesthetic-oracle | llm-judge | Prose + axis name | **5x/scoring** (5 axes) |
| aesthetic-oracle | text-features | Prose | 1x/scoring (CALC) |
| aesthetic-oracle | s-score | MacroAxes | 1x/scoring (CALC) |
| duel-engine | aesthetic-oracle | Prose candidat | **4x/duel** (4 candidats) |

**Total API calls par run** : ~25-40 (4 chunks + 3-6 loop + 3 duel drafts + 15-20 juges + 0-3 micro)

---

## 5. DOUBLONS ET ANOMALIES DETECTES

### 5.1 Seuils SAGA definis a MULTIPLES endroits

| Seuil | Fichier | Ligne | Forme |
|-------|---------|-------|-------|
| 92.0 | core/thresholds.ts | 34 | SAGA_READY_COMPOSITE_MIN (AUTORITE) |
| 92.0 | assembly/best-of-n.ts | 53 | early_exit_composite (DOUBLON) |
| 92.0 | validation/phase-u/polish-engine.ts | 58 | NEAR_SEAL_THRESHOLD (DOUBLON) |
| 92.0 | validation/phase-u/phase-u-exit-validator.ts | 97 | SAGA_READY_COMPOSITE_MIN (DOUBLON) |
| 85.0 | core/thresholds.ts | 27,37 | SEAL_FLOOR_MIN + SAGA_READY_SSI_MIN (AUTORITE) |
| 85.0 | assembly/best-of-n.ts | 54 | early_exit_min_axis (DOUBLON) |
| 85.0 | duel-engine.ts | 135 | floor dans selection hostile (DOUBLON) |
| 85.0 | validation/phase-u/polish-engine.ts | 45,48 | SII_FLOOR, RCI_FLOOR (DOUBLON) |

**Risque** : modification dans un fichier sans les autres = incoherence silencieuse.

### 5.2 Scoring appele 3+ fois dans engine.ts

`judgeAestheticV3` est appele a 3 endroits dans engine.ts (lignes 310, 393, 472) + 4x dans duel-engine.ts. Chaque appel = 5 axes LLM. Cout : ~15-20 API calls par scoring.

### 5.3 Deux damage-gates distincts

| Fichier | Role |
|---------|------|
| microsurgery/damage-gate.ts | CALC-pur, 6 categories, seuils 0.01-0.50 |
| validation/damage-gate.ts | Post-polish, compare axes avant/apres, seuils 1.5-2.0 |

Pas un doublon au sens strict (roles differents) mais nommage ambigu.

### 5.4 s-score.ts marque @deprecated

`oracle/s-score.ts` ligne 24 : `@deprecated LEGACY — Utiliser s-oracle-v2.ts comme autorite de scoring.`
Mais engine.ts importe et utilise MacroSScore de s-score.ts.

### 5.5 LEGACY dans voice-genome.ts

`voice/voice-genome.ts` contient V1_LEGACY_PROFILE (ligne 81) et INV-VOICE-LEGACY-01. Code mort potentiel.

---

## 6. TOKENS MORTS (consignes irréductibles BB-P03/BB-P04)

### 6.1 Point-virgule dans les prompts

| Fichier | Ligne | Texte |
|---------|-------|-------|
| input/prompt-assembler-v2.ts | 1250 | "Couper en 2 phrases minimum, ou utiliser un point-virgule." |
| genius/benchmark/rotating-pool.json | 62 | "Au moins 3 phrases doivent contenir un point-virgule." |

**Verdict** : Token MORT. BB-P03 (Phase B) a prouve : semicolons non pilotables (13% respect). Le V2 est inactif (V4 actif) mais le benchmark pool contient encore cette consigne.

### 6.2 Cibles mean_sent < 35 dans les modes

| Fichier | Ligne | Texte |
|---------|-------|-------|
| duel/draft-modes.ts | 19 | tranchant_minimaliste : "8-12 words" |
| duel/draft-modes.ts | 27 | sensoriel_dense : "15-20 words" |

**Verdict** : Tokens MORTS. BB-P04 (Phase B) a prouve : plancher incompressible a ~35 mots/phrase. Les cibles 8-12 et 15-20 sont ignorees par le modele (produit 31-42).

### 6.3 avg_sentence_length_target = 18

| Fichier | Ligne | Contexte |
|---------|-------|---------|
| types.ts | 156 | Interface ForgePacket.style_genome.rhythm.avg_sentence_length_target |
| Tous les buildPacket | - | Defini a 18 par defaut |

**Verdict** : Token MORT. La cible 18 est systematiquement ignoree (produit ~35-42). DEC-20260328-BB-02 scelle : retirer toutes cibles < 35.

### 6.4 Subordination target dans prompts

Pas de cible explicite > 0.10 trouvee dans les prompts V4. Le Bloc 8b (Rhythm Anchor) utilise du lore-coding ("periodes amples") sans chiffre.

---

## 7. RECOMMANDATIONS PRE-V-ATOMIC v5

**NE PAS MODIFIER MAINTENANT — cartographie seulement.**

| # | Recommandation | Fichier(s) | Raison |
|---|---------------|-----------|--------|
| R1 | Centraliser seuils SAGA dans core/thresholds.ts | best-of-n.ts, duel-engine.ts, polish-engine.ts | 5+ doublons = risque incoherence |
| R2 | Retirer cible "8-12 mots" de tranchant_minimaliste | draft-modes.ts:19 | Token mort (BB-P04, plancher 35) |
| R3 | Retirer cible "15-20 mots" de sensoriel_dense | draft-modes.ts:27 | Token mort (BB-P04, plancher 35) |
| R4 | Changer avg_sentence_length_target default de 18 a 35 | types.ts, tous les builders | DEC-20260328-BB-02 |
| R5 | Retirer "point-virgule" de prompt-assembler-v2.ts | prompt-assembler-v2.ts:1250 | Token mort (BB-P03) |
| R6 | Ajouter injection conflit orthogonal dans V4 | prompt-assembler-v4.ts | DEC-20260328-BB-03 (conflits feconds) |
| R7 | Clarifier nommage des 2 damage-gates | microsurgery/ vs validation/ | Confusion possible |
| R8 | Nettoyer V1_LEGACY_PROFILE | voice-genome.ts | Code mort |
| R9 | Resoudre @deprecated s-score.ts | oracle/s-score.ts | Importe mais marque deprecated |
| R10 | Evaluer cout API : 25-40 calls/run | engine.ts + oracle | Optimisation possible du nombre de scorings |
