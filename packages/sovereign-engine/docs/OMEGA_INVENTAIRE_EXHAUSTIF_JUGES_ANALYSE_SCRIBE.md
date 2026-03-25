# OMEGA — INVENTAIRE EXHAUSTIF
# Juges, Analyse Littéraire, Scribe
# Généré le 2026-03-25 par scan automatique du repo

## STATISTIQUES
- Fichiers scannés : ~90 (docs, code source, scripts, tests, données, omega-autopsie)
- Observations extraites : 127
- Par domaine : JUGE=52, ANALYSE=38, SCRIBE=37
- Par type : OBSERVATION=54, CONCLUSION=28, DECISION=31, BUG=5, SUGGESTION=6, HYPOTHESE=3

---

## A. DOMAINE JUGES

### A.1 Invariants actifs

| ID | Fichier | Description |
|---|---|---|
| INV-JUDGE-NECESSITY-02 | anthropic-provider.ts:219 | Prompt Necessity V2 — critères littéraires FR (remplace V1 utilitaire EN) |
| INV-JUDGE-IMPACT-01 | anthropic-provider.ts:256 | Rubric-based impact — 5 dimensions (HOOK, RESONANCE, SURPRISE, EMOTIONAL_PAYLOAD, MEMORABILITY) |
| INV-PROVIDER-RETRY-01 | anthropic-provider.ts:109 | Retry transient errors (529/503/500) avec backoff exponentiel, credit exhausted = abort immédiat |
| INV-RHYTHM-CV-01 | rhythm.ts:14 | Score Rhythm par CV, pas comptage mécanique |
| INV-RCI-RHYTHM-FR-01 | rhythm.ts:47 | CV calibré prose littéraire FR — plage [0.30, 1.30], pic 0.75 |
| INV-RCI-RHYTHM-FR-02 | rhythm.ts:46 | Paragraph CV — plage large [0.15, 1.20] |
| INV-RCI-CONF-01 | macro-axes.ts:408 | R3 confidence = POIDS du rhythm dans RCI (pas valeur) |
| INV-RCI-HOOKS-01/02 | macro-axes.ts:369 | hook_presence weight=0.20 dans RCI |
| INV-IFI-DISTRIB-01 | macro-axes.ts:615 | IFI inclut bonus distribution quartile |
| INV-EUPHONY-WEIGHT-01 | euphony-basic.ts:60 | euphony weight 1.0→0.5 (biais structurel floor 68-70) |
| INV-S-EMOTION-60 | s-oracle-v2.ts:27 | Poids émotion ≥ 60% (actuel 63.3%) |
| INV-S-DUEL-01 | duel-engine.ts:104 | Duel offline déterministe |
| INV-ZONE-FLOOR-01 | config.ts:444 | min_axis 85→80 (McCarthy BRUTAL impossible à 85) |
| INV-SII-FLOOR-01 | config.ts:427 | SII floor 85→80 (BRUTAL = lexique faible by design) |
| INV-PARADOX-01/02/03 | s-oracle-v2.ts:364 | Paradox gate Genesis v2 — hard REJECT |
| INV-SOMA-01 | s-oracle-v2.ts | Anatomie générique → REJECT immédiat |
| INV-BUDGET-01 | s-oracle-v2.ts | Révélation prématurée → REJECT immédiat |
| SII-FIX-01 | macro-axes.ts:572 | MN weight 1.5→1.0 (juge LLM conservateur baseline 71-79) |
| U-META-01 | anthropic-provider.ts:334 | generateStructuredJSON budget 200→800 tokens (truncation fix) |
| U-META-02 | metaphor-detector.ts:35 | Prompt v2.0.0 — max 5 métaphores, expressions courtes |
| U-ROSETTE-01 | voice-conformity.ts:70 | Shadow logging F31/F32/F33 (0 impact score) |
| ART-META-02 | novelty-scorer.ts:30 | Zéro dead metaphor — 0 métaphore = score 70 (neutre) |
| ART-SDT-02 | show-dont-tell.test.ts | show_dont_tell — weight=3.0, method=HYBRID |
| ART-AUTH-01 | authenticity.test.ts | authenticity — weight=2.0, method=HYBRID |
| ART-PHANTOM-03 | phantom-axes.test.ts | attention_sustain + fatigue_management (CALC, Sprint 14.3) |
| ART-TEMP-03 | temporal-pacing.test.ts | temporal_pacing — no contract → neutral 75, method=CALC |

### A.2 Prompts des juges (état actuel)

**scoreNecessity (V2 — INV-JUDGE-NECESSITY-02)** :
- Langue : FRANÇAIS
- Critères : JUSTESSE, COUVERTURE, DENSITÉ_LITTÉRAIRE, PROGRESSION, IRRÉDUCTIBILITÉ
- Calibration : "Flaubert/Duras = 85-95"
- Ce qui EST nécessaire : atmosphère, respiration, dilatation temporelle, échos intérieurs, silence narratif
- Ce qui N'EST PAS nécessaire : redite, remplissage décoratif, transitions mécaniques
- Budget : 300 tokens, judgeStable=true

**scoreImpact (V1 — INV-JUDGE-IMPACT-01)** :
- Langue : ANGLAIS
- Critères : HOOK, RESONANCE, SURPRISE, EMOTIONAL_PAYLOAD, MEMORABILITY
- Input : opening=3 premières phrases, closing=3 dernières phrases
- Budget : 300 tokens

**scoreInteriority (V0 — pas de rubric)** :
- Langue : ANGLAIS
- Prompt minimal : "Rate interiority depth (0-100)"
- Contexte : POV + character_state
- Pas de rubric multi-critères (risque de variance élevée)

**scoreSensoryDensity (V0 — pas de rubric)** :
- Langue : ANGLAIS
- Prompt minimal : "Rate sensory density (0-100)"
- Input : sensory_counts + prose

### A.3 Observations et conclusions

1. **Necessity V1 trop sévère** [anthropic-provider.ts, SESSION_SAVE_2026-03-25] : NEC=54-75 sur prose dense. Flaubert obtiendrait ~65. Critères utilitaires ("no filler", "compressed storytelling") pénalisaient la respiration littéraire. → **FIX : V2 implémenté**

2. **Impact V1 non-discriminant** [anthropic-provider.ts:260] : retournait 87 sur 18/24 scènes à temp=0. Pas de différence BRUTAL vs INTERIOR. → **FIX : rubric 5 dimensions**

3. **AAI identique sur 5 briques** [VATOMIC_RESULTS.json] : AAI=95.6 pour contemplation, confrontation, souvenir, menace, révélation. Valeur invariante suspecte — indique CALC path déterministe identique ou mock provider.

4. **SII = axe le plus bloquant** [VATOMIC_RESULTS.json] : bloque 3/5 briques du min_axis ≥ 85. metaphor_novelty=73 tire SII vers le bas. SII-FIX-01 réduit le poids MN 1.5→1.0 mais le juge reste conservateur.

5. **voice_conformity neutralisée** [voice-conformity.ts:392] : weight=0. style_genome.voice jamais peuplé dans ForgePacket → retournait 70 (neutre) systématiquement, tirant RCI de ~5 pts.

6. **Correction A vs B sur rhythm** [VATOMIC_RESCORED_A.json, VATOMIC_RESCORED_B.json] : Correction A (confidence × VALEUR) → ΔRCI=-4.1, tous FAIL. Correction B (confidence × POIDS) → ΔRCI=+1.2, 1/5 SAGA_READY (souvenir). **Correction B implémentée.**

7. **Divergence seuil REJECT** [s-oracle-v2.ts:405 vs config.ts:50] : s-oracle-v2 utilise composite<92, config.ts déclare SOVEREIGN_THRESHOLD=93 (Sprint 12). Incohérence potentielle selon le path d'exécution.

8. **Header macro-axes.ts obsolète** : indique "ECC 60%, RCI 15%, SII 15%, IFI 10%" mais poids actuels = ECC=0.33, RCI=0.17, SII=0.15, IFI=0.10, AAI=0.25.

9. **tension_14d calibration** [tension-14d.ts:100] : Courbe boostée — sim<0.3→score=sim×80, 0.3-0.6→steep climb, >0.6→plateau. Pénalité monotonie=-20 si prose monotone mais trajectoire demande variation.

10. **RCI_PERFECT_PENALTY=-5** [config.ts:494] : Malus si Gini+syncope+compression "trop parfaits". Anti-métronomique.

11. **ECC anti-gaming cap** [config.ts:466] : bonus max +3 (cap dur ChatGPT). entropy_bonus=+3, entropy_malus=-5.

12. **SovereignLoop DÉGRADE les composites** [SESSION_SAVE_2026-02-25] : mean delta E1=-1.22 (Phase S, 300 runs). Root cause : re-score avec seed différent. INV-LOOP-01 implémenté : rollback monotone.

### A.4 Suggestions non implémentées

1. **Architecture 3 juges** [OMEGA_SYNTHESE_FINALE_ROSETTA.md] : JUGE 0 (Profileur probabiliste), JUGE 1 LOCAL (score par type), JUGE 2 ARC (score dramaturgique). Non implémenté — concept Phase Rosetta.

2. **Templates dynamiques par composition** [OMEGA_SYNTHESE_FINALE_ROSETTA.md] : template_effectif = Σ composition_i × template_i au lieu de profils fixes. Idée C2 Claude.

3. **alignment_score comme feature** [OMEGA_SYNTHESE_FINALE_ROSETTA.md] : si < 0.50, le scorer SIGNALE le désalignement au lieu de pénaliser le texte. Idée C5.

4. **scoreInteriority rubric** : actuellement prompt minimal sans discrimination. Candidat à upgrade rubric comme Necessity/Impact.

### A.5 Bugs identifiés

| # | Description | Statut |
|---|---|---|
| BUG-01 | AAI=95.6 invariant sur 5 briques différentes — suspect | KNOWN |
| BUG-02 | Divergence seuil REJECT 92 vs 93 (s-oracle-v2 vs config.ts) | KNOWN |
| BUG-03 | voice_conformity retourne 70 (neutre) car voice non peuplé | FIX: weight=0 |
| BUG-04 | GB V1 invalide pour mean < 8w (Duras OOD, score inversé vs V2) | FIX: LOI L15/L17 |
| BUG-05 | Header macro-axes.ts désynchronisé des poids réels | KNOWN |

### A.6 Poids et formules actuels

**Macro-axes (composite)** : ECC×0.33 + RCI×0.17 + SII×0.15 + IFI×0.10 + AAI×0.25 = 1.00

**ECC sub-scores** : tension_14d(×3.0) + emotion_coherence(×2.5) + interiority(×2.0) + impact(×2.0) + physics_compliance(×0, informatif) + temporal_pacing(×1.0)

**RCI sub-scores** : rhythm(×conf) + signature(×1.0) + hook_presence(×0.20) + euphony_basic(×0.5→1.0) + voice_conformity(×0, neutralisé)

**SII sub-scores** : anti_cliche(×1.0) + necessity(×1.0) + metaphor_novelty(×1.0)

**IFI sub-scores** : sensory_richness(×0.25) + corporeal_anchoring(×0.25) + focalisation(×0.25) + attention_sustain(×0.125) + fatigue_management(×0.125) + distribution_bonus

**AAI sub-scores** : show_dont_tell(×0.60) + authenticity(×0.40)

**Seuils** : SEAL_ATOMIC=93, SEAL_FLOOR_MIN=85, SAGA_READY=92+min_axis≥85, ECC_FLOOR=88, SII_FLOOR=80, min_axis_FLOOR=80

---

## B. DOMAINE ANALYSE LITTÉRAIRE

### B.1 Résultats R5/R6/R7/R8

**R4 — Feature Audit** : Sur 72 features, seules 4 discriminantes (Spearman>0.3) : f34a_paragraph_count (+0.565), f34b_para_per_1000w (+0.565), f28b_irony_density (+0.486). 43 features NEUTRES.

**R5 — Ridge V2** : 16 features, lambda=1.0, n=571. Features inverted (higher=worse) : f29d_ttr_score (w=-4.71), f35c_hook_score (w=-1.51), f17_knife_count. TTR élevé et hook trop fort = patterns commerciaux.

**R6 — Ridge V3** : lambda=50 (régularisation forte). Spearman 0.52. Top weights : f24c_contrast_delta (+0.196), f19a_approx_entropy (+0.153), f29d_ttr_score (-0.120). Verdict : [FAIL] R²<0.40 holdout, [FAIL] 581 inversions S/D. R6 déclaré LEGACY_DIAGNOSTIC_ONLY.

**R6B — Diagnostic Séparation Flaubert/Claude** : TOUS les modèles prédisent Claude Opus > Flaubert. GB_All est le moins mauvais (gap -0.292). **Aucun modèle ne sépare correctement les maîtres des LLM.**

**R7 — Preseal Audit** : Maîtres performent mieux sur passages courts (delta_court>0), LLM inversement. Flaubert delta_court=+0.232, GPT-5.4=-0.315. Best separateur S/LLM = delta_court (separation=0.223). Enrichissement classe D (+40 synthétiques) améliore discrimination mais dégrade holdout.

**R8 — GB V1 reste champion** : V1(42 features)=Spearman 0.787, holdout R²=0.326, 19 inversions S/D. V2(+assembly, 47f)=Spearman 0.699, 50 inversions. V3(+typo, 55f)=Spearman 0.710, 78 inversions. **V2/V3 n'améliorent pas V1.** Decision : R-8 non intégré au scorer par-œuvre.

### B.2 Corrélations documentées

**Top 20 features corrélées à la qualité (241 FR, Pearson)** :

| # | Feature | r | Catégorie |
|---|---|---|---|
| 1 | f19_sentences_analyzed | -0.463 | ENTROPIE |
| 2 | f_motif_concentration | -0.458 | IMAGE |
| 3 | f33b_commas_count | +0.454 | PONCTUATION |
| 4 | f35c_hook_score | -0.437 | ACCROCHE |
| 5 | f17_banal_count | -0.435 | IMAGE |
| 6 | f24c_contrast_delta | +0.430 | IMAGE |
| 7 | f19f_window_stdev | +0.394 | ENTROPIE |
| 8 | f26b_long_sent_rate | +0.393 | RYTHME |
| 9 | f12_tense_switches | -0.392 | NARRATION |
| 10 | f29b_ttr_window | -0.392 | VOCABULAIRE |

**Features TROMPEUSES** (maîtres ont MOINS) : hook_score, cliff_score, cliff_tension, knife_count, banal_count, motif_concentration, sentences_analyzed, dot_comma_ratio.

### B.3 Feature importance GB

| # | Feature | Importance GB | Note |
|---|---|---|---|
| 1 | f26b_long_sent_rate | 0.290 | Dominant absolu (4× le suivant) |
| 2 | f_pov_stability | 0.058 | Sémantique |
| 3 | ix_variance_x_longrate | 0.056 | Interaction |
| 4 | f_pov_shift_rate | 0.044 | Sémantique |
| 5 | f29d_ttr_score | 0.042 | INVERSÉ (TTR élevé = commercial) |
| 6 | f_causal_density | 0.039 | Sémantique |
| 7 | f1a_rhythm_variance | 0.036 | Rythme |
| 8 | f_pov_drift_rate | 0.036 | Sémantique |
| 9 | f19a_approx_entropy | 0.035 | Entropie |
| 10 | f_clause_per_sentence | 0.026 | Sémantique |

Note : f28b_irony_density = 0.0 dans GB (contraste avec R4 où elle est #3 par Spearman). Ridge la valorise, GB non.

### B.4 Conclusions sur les maîtres

**Cohen's d (Tier A vs reste, 241 FR)** :
- f26c_period_score : d=+1.095 (maîtres ont PLUS de phrases périodiques)
- f19f_window_stdev : d=+1.056 (maîtres ont PLUS de variation entropique)
- f26b_long_sent_rate : d=+1.054 (maîtres ont PLUS de phrases >40 mots)
- f1a_rhythm_variance : d=+1.045 (maîtres ont PLUS de variance rythmique)
- f26a_mean_sub_markers : d=+1.037 (maîtres ont PLUS de subordination)

**Profils ROM mesurés (production FR)** :
- Flaubert : mean 37.9±6.6w, f26b=0.52, knife=0.35, CV=0.81, GB=3.909
- Duras : mean 3.8±0.6w, f26b=0.000 TOUJOURS, knife=0.99, CV=0.46, GB=3.909
- Proust : mean→periods amples, CV faible (~0.23 solo), profondeur/temps dilaté

**CV Gate étalonnage** : Flaubert max=0.795, Proust max=0.784, Duras max=1.031. Seuil=1.05.

**Observations non-monotones** [OMEGA_AUDIT_DEEP_CROISEMENTS.md] : Le S-tier est SUBTIL pas INTENSE. Plus de malaise (+0.455) mais MOINS de tension. Plus d'ironie (+0.443) mais MOINS de mystère. 3 axes réels : AXE A (Malaise+Vertige, ×6.5), AXE B (Irréversibilité+Négation, ×3.9), AXE C (Silence+Mélancolie, ×2.7).

### B.5 Étalonnages faits

- **Phase R3** : 181 œuvres, OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json → rhythmConfidence()
- **Phase R4** : 571 œuvres × 72 features → Feature Audit complet
- **Phase R6B** : Ridge + semantic features → diagnostic Flaubert vs Claude
- **Phase R8** : GB V1/V2/V3 comparaison, tipping points, gamma interactions
- **Metric Utility Analysis** : 241 FR × 94 features → corrélations, stepwise R²=0.624, Cohen's d
- **Benchmark 3 modèles** [SESSION_SAVE_2026-03-24] : 66+ API calls, Claude vs Mistral vs GPT-4o

### B.6 Hypothèses non testées

1. **f_semantic_density** (anti-gras de Flaubert) — feature manquante identifiée [OMEGA_PHYSIQUE_LITTERAIRE_v3.md]
2. **f_register_divergence** (polyphonie) — feature manquante
3. **f_phonetic_collision** (gueuloir automatisé) — feature manquante
4. **f_subtext_gap** (plan caché du dialogue) — feature manquante
5. **f_necessity_index** (test du mot juste) — feature manquante
6. **Gamma pour famille syntaxique seule** — identifié comme bénéfique (+23-27%) mais non intégré au scorer production

---

## C. DOMAINE SCRIBE

### C.1 Architecture moteur actuelle

**Moteur scellé** : `PF_base_Duras_correcteur_K2_v4` (tag moteur-production-v1, commit 9e0263b4)

```
4 chunks × 750w = ~3000w
Chunk 1: PF_PERSONA + RAPPEL_CHUNKS12 + SceneBrief
Chunk 2: PF_PERSONA + RAPPEL_CHUNKS12 + last200w
Chunk 3: PF_PERSONA + RAPPEL_CHUNKS34_V4 + last200w
Chunk 4: PF_PERSONA + RAPPEL_CHUNKS34_V4 + last200w + "conclus"
LLM: claude-sonnet-4-20250514, temp=0.75, max_tokens=2500/chunk
```

**Pipeline 19 étages** : ForgePacket → SymbolMap(LLM) → EmotionBrief → ChunkedDraft(4×LLM) → SemanticSlicer → PhysicsAudit → SovereignLoop → Duel(si<92) → MicroSurgery → judgeAestheticV3 → TargetedPatch P5

**Prompt V4.3.0** : 10 blocs (persona, context, trajectory, beats, directives, voice anchor, symbols, exemplar, RHYTHM_ANCHOR, interdictions, rosetta, final instruction). Token budget ≤1500t.

### C.2 Personas et ROM

**PF_PERSONA** = Flaubert (structure, gueuloir, subordonnées en cascade) + Proust (profondeur, temps dilaté, sensations dépliées). **Duras = correcteur EXTERNE** dans RAPPEL_CHUNKS34 (LOI L21 : pas co-auteur).

**Profils ROM stables** (identiques 5 runs × 5 températures × 2 langues) :
- Les personas sont des ATTRACTEURS fixes, pas des paramètres ajustables
- Le NOM d'auteur active des poids profonds (LOI L2) — +0.060 GB vs rôle anonyme
- Champion solo : Dickens (GB 4.155, écart E1=+2.1 le plus aligné)
- Champion trio : FDP (GB 4.087-4.119, CV 0.884-0.937)
- Duras solo : GB 4.243 (meilleur absolu) mais NON VIABLE (LOI L19 — takeover Duras)

**Table R-CONVERSION** (LOI L6) : CAS B linéaire confirmé (r>0.88 sur 4/5 dim). Le LLM ne produit pas ce qu'il déclare mais la transformation est PRÉDICTIBLE. CV = IMPRÉDICTIBLE (r=0.000).

### C.3 Prompts actuels

**Golden Exemplars** : GE-SAGA-01 (composite 92.3, Théière) + GE-SAGA-02 (composite 91.9, Rosiers). Sélection déterministe par hash(packet_id).

**RHYTHM_ANCHOR** : "ANCRE RYTHMIQUE — Le souffle de Bovary : des périodes amples ponctuées de verdicts nets." Lore-coding pur, zéro chiffre (LOI L3).

**RAPPEL_CHUNKS12** : Souffle de Flaubert + Murmure de Duras (mini-correcteur précoce). **RAPPEL_CHUNKS34_V4** : Correcteur Duras externe + Ancre de tenue + Cohérence de longueur.

**Rosetta Constraints** (D-SYNTH-1) : 7 contraintes mécaniques validées sur 450 tests. ≥70 mots uniques/100, contraste 1/3<8 1/3>25, bigrammes uniques >85%, accroche<15 mots, suspense 20 derniers mots, ≥6 sensoriels/100.

**Interdictions** : 3 seulement — (1) ne nomme jamais une émotion directement, (2) pas de résumé d'action, (3) pas de lyrisme décoratif. Kill-lists ABSENTES (LOI : elles PRODUISENT les défauts).

### C.4 Leviers testés et résultats

| Levier | Phase | Résultat |
|---|---|---|
| V4.0 (10 blocs ~800t) | Sprint 2 | ECC collapsed -14pts — LLM écrit 1 bloc |
| V4.1.1 (FORCE 4 para) | Sprint 2 | ECC +8.6pts |
| V4.2 (EXACTEMENT) | Sprint 2 | ECC variance 9.4→0.8 MAIS CV_para=0.03 → RCI -6.4 |
| V4.3 (Asymétrie) | Sprint 2 | Convergence 3/3. Cible CV_para≥0.40 |
| Rosetta seule | Phase P | Gap FR/EN Claude réduit de 72% |
| Chiffres prescriptifs | Phase 4b | GB -0.26 à -0.43 → LOI L3 |
| Duras co-auteur (FDP trio) | Phase 5B | Takeover Duras, V2 chute → LOI L21 |
| Mini-correcteur précoce | Moteur v3 | Résout drift -9.7 (vs v2 drift -47.4) → LOI L25 |
| Exemplar SAGA 92+ | Phase R | GE-01/02/03 (score 89) → GE-SAGA-01/02 (92.3/91.9) |
| RHYTHM_ANCHOR (Bovary) | Phase R | Guide CV 0.60-0.90 via mimétisme littéraire |
| CV Gate Duel | Phase R | Pre-filtre CV>1.05, max 2 retries, fail-open |
| Hostile Selection Duel | Sprint 1 | selection_score = composite - 1.5×max(0, 85-min_axis) |
| MicroSurgery | Phase R | +0.2 pts (2 interventions hook Q3 + tension Q2) |
| Duel sensoriel_dense | V-RECAL-1 | 78% du gain composite (85.5→92.1), winner=470w |

### C.5 Lois du Scribe (L1-L28)

| Loi | Description | Source |
|---|---|---|
| L1 | Le verrou f26b = verrou de FORMULATION, pas d'incapacité modèle | Phase 5B |
| L2 | Le NOM d'auteur active des poids profonds dans l'espace latent LLM | Phase 5B |
| L3 | Zéro consigne métrique chiffrée dans le prompt Scribe (lore-coding obligatoire) | Phase 5B, SCELLÉE |
| L6 | Table R-CONVERSION linéaire — le LLM ne produit pas ce qu'il déclare | Phase 5B |
| L8 | Les auteurs nommés produisent des GB supérieurs aux anonymes | Phase 5B |
| L15 | GB V1 invalide pour mean < 8w (biais OOD) | Phase 5B |
| L16 | GB V1 = microbench, V2 = longue forme | Phase 5B |
| L17 | Classement inverse V1/V2 PROUVÉ pour Duras | Phase 5B |
| L18 | Min 3 runs pour sceller | Phase 5B |
| L19 | Duras co-auteur → takeover + chute V2 (Goodhart) | Phase 5B |
| L21 | Duras = correcteur EXTERNE (pas co-auteur) | Moteur v3 |
| L22 | Le mini-correcteur précoce ancre le mean | Moteur v3 |
| L23 | Le rappel "souvent" (pas "exceptionnellement") active le correcteur | Moteur v3 |
| L24 | L'ancre "cohérence de longueur" réduit le drift stochastique | Moteur v3 |
| L25 | Le mini-correcteur précoce stabilise TOUTE la trajectoire | Moteur v3 |
| L27 | Seuils contextuels par type de scène (contemplation, dialogue, confrontation) | Scellage |
| L28 | P4 continuité : ΔV2<15, Δf26b<0.150, ΔCV<0.250, ΔMean<15w. ΔGB=monitoring only | Scellage |

### C.6 Suggestions non implémentées

1. **Linker (agent Ciment)** [DEC-20260325-001] : src/assembly/linker.ts — 50-150w transitions entre briques. Input : fin A 200m + début B 200m. Contrainte : ne jamais réécrire les briques.
2. **Assemblage Niveau 2 (Chapitre)** : briques + ciments, 2500-4000w, score chapitre + P4 continuité.
3. **Rosetta + Persona combinés** [OMEGA_DOSSIER_REFERENCE_PISTES_ET_MIROIR.md] : jamais testés ensemble.
4. **Variation température** : jamais testée systématiquement.
5. **CoT sophistiqué** (plan d'arc avant écriture) : peu testé.
6. **Injection exemplar S-tier avec trio** : jamais testée.
7. **Voice Genome dans prompt Scribe** [RCI_VOICE_GENOME_REPORT.md] : recommandé mais non implémenté.

---

## D. PISTES OUVERTES

### D.1 Pistes prioritaires (mentionnées plusieurs fois)

1. **metaphor_novelty lever** : juge conservateur (baseline 71-79), bloque SII. Poids réduit (SII-FIX-01) mais le juge lui-même n'a pas été recalibré. Mentionné dans : macro-axes.ts, VATOMIC_RESULTS, SESSION_SAVE_2026-03-25.
2. **Voice Genome dans le prompt** : voice_conformity neutralisée car voice jamais peuplé. Si câblé correctement → RCI+5 potentiel. Mentionné dans : voice-conformity.ts, RCI_VOICE_GENOME_REPORT.md.
3. **Longue forme vs briques** : draft 2427w=85.5, brique 470w=92.1. Paradigme fractal adopté mais robustesse non prouvée (1 seul run SAGA_READY). Mentionné dans : SESSION_SAVE_2026-03-25, DEC-20260325-001.
4. **Linker (agent Ciment)** : critique pour assemblage chapitre. Non implémenté. Mentionné dans : DEC-20260325-001, SESSION_SAVE_2026-03-25.

### D.2 Pistes secondaires (mentionnées une fois)

1. Profileur probabiliste (JUGE 0 Rosetta) — concept avancé, non implémenté
2. Templates dynamiques par composition — idée C2 Claude
3. Feature f_semantic_density (anti-gras Flaubert) — identifiée manquante
4. Trigrammes description-introspection comme feature directe (ratio 8-12× enrichi chez S)
5. Enrichissement classe D (10 œuvres → insuffisant)
6. Polisher post-génération (2 passes) — jamais testé
7. Multi-modèle pipeline — rejeté (complexité non justifiée pour 0.09 delta)

### D.3 Pistes abandonnées (avec raison)

1. **Correction A (confidence × VALEUR rhythm)** : ΔRCI=-4.1, aggrave le problème → Correction B adoptée
2. **Kill-lists dans le prompt** : PRODUISENT les défauts → supprimées (V4.3)
3. **"EXACTEMENT 4 paragraphes"** : CV_para=0.03, RCI -6.4pts → supprimé (V4.3)
4. **Stratégie EN-first** : rejetée comme doctrine (benchmark 3 modèles)
5. **Architecture hybride Claude/Mistral** : rejetée (complexité non justifiée)
6. **Duras co-auteur (trio FDP)** : takeover Duras, V2 chute → LOI L19/L21
7. **R8 intégré au scorer GB** : V2/V3 dégradent Spearman et inversions → rejeté
8. **R6 Ridge V3 comme scorer production** : R²<0.40, 581 inversions → LEGACY_DIAGNOSTIC_ONLY
9. **Polish (polishRhythm/sweepCliches/enforceSignature)** : NO-OP prouvé, delta 0.0 → désactivé (V4.3)

---

## E. CONTRADICTIONS ET INCOHÉRENCES

| # | Source A | Source B | Nature |
|---|---|---|---|
| 1 | s-oracle-v2.ts (seuil 92) | config.ts (SOVEREIGN_THRESHOLD=93) | Seuil REJECT divergent |
| 2 | macro-axes.ts header (ECC=60%, 4 axes) | MACRO_WEIGHTS actuels (ECC=33%, 5 axes) | Header obsolète |
| 3 | Orchestrateur rhythm weight=1.5 | SOVEREIGN_CONFIG.WEIGHTS.rhythm=1.0 | Poids divergents |
| 4 | ZONES.GREEN.min_axis=80 | SEAL_FLOOR_MIN=85 | Floor divergent selon path |
| 5 | AAI=95.6 invariant 5 briques | 5 scènes radicalement différentes | Suspicion CALC fixe |
| 6 | R4 : f28b_irony_density #3 (Spearman) | GB : f28b_irony = 0.0 (importance) | Ridge vs GB divergent |
| 7 | SESSION_SAVE ART (ECC=0.30, RCI=0.17, SII=0.18) | config.ts (ECC=0.33, SII=0.15) | Légère variation entre versions |

---

*Généré par scan automatique — 0 API, lecture pure de ~90 fichiers.*
*Standard: NASA-Grade L4 / DO-178C Level A*
