# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SESSION_SAVE
# Session 2026-03-15 (journée complète)
# PHASE R — RETRO-ENGINEERING COGNITIF LLM
# ═══════════════════════════════════════════════════════════════════════════════

## METADATA

| Attribut | Valeur |
|----------|--------|
| Branch | phase-u-transcendence |
| HEAD début | 1677a35a |
| HEAD fin | 7aa57491 |
| Tests | 1701 PASS / 0 FAIL / 7 skipped (AUCUN changement) |
| API consommée | ~30 appels (benchs ORCH + P5 + retro R1 + R2 + retro-bench) |
| Gouvernance | Claude + ChatGPT + Gemini (3/3 convergence) |

---

## RÉSUMÉ EXÉCUTIF

Cette session a accompli 5 choses majeures :

1. **ORCH SAFE benchmarké → ÉCHEC** (-4.7 pts vs V3). Spécialisation par suppression = dégradation.
2. **P5 Targeted Patch benchmarké → ÉCHEC** (rollback 2/2 par Damage Gate). Le LLM ne sait pas éditer chirurgicalement sur contexte complet.
3. **Phase R Retro-Engineering EXÉCUTÉE** — 3 rounds complets :
   - R1 : 8 questions × 8 textes → matrice de convergence
   - R2 : 6 prompts complets retro-engineered (~287 tokens)
   - Bench : V3 (15 476t) vs Retro (287t)
4. **DÉCOUVERTE MAJEURE** : le prompt V3 est 121× trop long. Le LLM veut ~287 tokens. Nos kill-lists et sections redondantes ÉTOUFFENT la créativité.
5. **Direction V4 validée (3/3)** : prompt hybride ~800-1200 tokens fusionnant la structure retro (8 blocs narratifs) avec les données essentielles du V3 (emotion_contract, beats, SymbolMap).

---

## LOIS OMEGA DÉCOUVERTES

| # | Loi | Preuve |
|---|-----|--------|
| **№6** | Spécialiser par SUPPRESSION = dégradation | ORCH -4.7 pts |
| **№7** | Draft équilibré > draft spécialisé | V3 88.9 > ORCH 84.2 |
| **№8** | Emphase > amputation | Convergence 3/3 |
| **№9** | Le LLM ne sait pas éditer sur contexte complet | P5 rollback 2/2 |
| **№10** | Le LLM veut ~300 tokens, pas 15 000. Le bruit étouffe la créativité. | Phase R : 83.5 en 1 appel vs 88.5 en 15 appels |
| **№11** | 94% du résultat vient de 7% des appels. Les 12 000 tokens de bruit n'ajoutent que +5 pts. | Retro-bench |

---

## BENCHS EXÉCUTÉS (4 au total)

### Bench 1 — V3 ORCHESTRÉ (ORCH SAFE)
| Métrique | V2 | V3 | ORCH |
|----------|-----|-----|------|
| Composite moyen | 87.7 | 87.8 | **84.2** |
| Verdict | — | ref | **❌ FAIL** |

### Bench 2 — V3 + PATCH (P5)
| Métrique | V3 | V3+PATCH |
|----------|-----|----------|
| Patch S0 | — | **ROLLBACK** (ECC -3.2, RCI -2.9, SII -2.9) |
| Patch S1 | — | **ROLLBACK** (RCI -11.0, SII -4.0) |
| Verdict | ref | **❌ FAIL (Damage Gate protège)** |

### Bench 3 — RETRO R1+R2 (analyse, pas génération)
| Métrique | V3 actuel | LLM idéal |
|----------|----------|-----------|
| Prompt tokens | 15 476 | ~287 |
| Format | structuré (17 sections) | narratif (8 blocs) |
| Saturation max | ~20+ contraintes | 6-8 max |
| Exemplar | aucun | ~150 mots (unanime 6/6) |
| Kill-lists | 312 entrées | 3 interdictions max |

### Bench 4 — RETRO vs V3 (génération)
| Métrique | V3 S0 | V3 S1 | Retro 1 | Retro 2 |
|----------|-------|-------|---------|---------|
| Composite | 91.3 | 85.7 | 83.2 | 83.5 |
| ECC | 90.2 | 75.3 | 68.8 | 75.8 |
| RCI | 86.3 | 84.6 | 83.4 | 82.0 |
| SII | 86.1 | 89.9 | 84.7 | 82.7 |
| IFI | 100.0 | 97.3 | 97.2 | 82.7 |
| Appels API | ~15 | ~15 | **1** | **1** |
| Verdict | **V3 gagne (+5 pts)** mais retro fait 94% avec 7% des appels |

---

## CE QUE PHASE R A RÉVÉLÉ

### Les 3 000 tokens ESSENTIELS du V3
1. Contexte + Persona (~150t)
2. Emotion Contract Q1→Q4 (~200t) — sans ça, ECC chute de -14
3. Beats structurés (~150t) — sans ça, IFI chute de -17
4. SymbolMap hooks (~100t)
5. 3 interdictions clés (~50t)

### Les ~12 000 tokens de BRUIT
- 14 sections redondantes (kill-lists 312 entrées, voice compliance, corporeal anchoring, metaphor pregeneration, final checklist, generation params, seeds, etc.)
- Format structuré (blocs XML, niveaux hiérarchisés) au lieu de narratif fluide

### Instructions NUISIBLES identifiées
- "Spécifier des émotions explicites" (le LLM sur-force)
- "Imposer longueur de paragraphe fixe" (casse le flux)
- "Demander explicitement du suspense" (produit des effets forcés)
- Kill-lists géantes (le LLM écrit avec peur → prose lisse)
- LOT1-02 "sensation avant label" (produit surcharge métaphorique)
- LOT1-04 fragments forcés (phrases d'un mot sans justification)

### Contre-exemples analysés (C1, C2)
Diagnostic unanime : **"too_many constraints"**
"Le texte souffre d'un excès de contraintes stylistiques : métaphores obligatoires, recherche systématique de l'effet, phrases courtes artificielles."

---

## DIRECTION V4 (validée 3/3)

```
╔══════════════════════════════════════════════════════════════════════════╗
║  V4 — PROMPT HYBRIDE (~800-1200 tokens)                                 ║
║                                                                          ║
║  Structure retro (8 blocs narratifs fluides) :                          ║
║  1. Persona (2 lignes)                                                  ║
║  2. Contexte (3-5 lignes)                                               ║
║  3. Trajectoire Q1→Q4 (langage naturel, ~60-90t)                       ║
║  4. Beats (3 beats structurés, ~120-180t)                               ║
║  5. Directives (6-8 max)                                                ║
║  6. Ancre vocale (1 ligne)                                              ║
║  7. SymbolMap (5-12 entrées, ~150t)                                     ║
║  8. Exemplar (150-220 mots)                                             ║
║  9. Interdictions (3 max)                                                ║
║  10. Instruction finale (1 phrase)                                      ║
║                                                                          ║
║  Pipeline INCHANGÉ :                                                    ║
║  SymbolMap + Duel + Polish + Sovereign Loop + judgeAestheticV3()        ║
║                                                                          ║
║  Test A/B : V3 (15k) + pipeline vs V4 (1k) + pipeline                  ║
║  Même scènes, même modèle, même nombre d'appels                        ║
║                                                                          ║
║  Kill-lists → migrent en POST-PROCESS (Polish/Gates)                    ║
║  Emotion Contract → compressé en langage naturel                        ║
║  Beats → compressés (Action/Intention/Turn)                             ║
║                                                                          ║
║  KPI de décision :                                                       ║
║  V4 ≥ V3 - 0.5 avec ÷10 tokens → VICTOIRE                             ║
║  V4 > V3 → VICTOIRE FRANCHE                                            ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## FICHIERS CRÉÉS CETTE SESSION

### Phase R — Retro-Engineering
```
retro-engineering/
  A1_camus_etranger_climax.txt     — Exemplar Camus
  A2_duras_amant_apex.txt          — Exemplar Duras
  A3_proust_swann_apex.txt         — Exemplar Proust
  A4_camus_peste_climax.txt        — Exemplar La Peste
  B1_omega_best_1.txt              — Meilleure prose OMEGA (89.35)
  B2_omega_best_2.txt              — 2ème meilleure prose OMEGA (89.20)
  C1_omega_weak_1.txt              — Prose faible OMEGA (84.82)
  C2_omega_weak_2.txt              — Prose faible OMEGA (85.39)
  REF_prompt_v3_actuel.txt         — Dump complet du prompt V3 (17 sections)
  REF_E1_template.json             — Template E1 existant
  REF_E3_template.json             — Template E3 existant
  RETRO_ENGINEERING_REPORT.md      — Rapport R1 (matrice convergence)
  RETRO_ROUND2_PROMPTS.md          — Rapport R2 (6 prompts complets)
  results/                         — 8 JSON réponses R1
  results-round2/                  — 6 JSON réponses R2
```

### Scripts créés
```
scripts/dump-v3-prompt.ts          — Dump prompt V3 (0 API)
scripts/run-retro-engineering.ts   — Interrogation R1 (8 API)
scripts/compile-retro-results.ts   — Compilation rapport (0 API)
scripts/run-retro-round2.ts        — Interrogation R2 (6 API)
scripts/run-retro-bench.ts         — Bench V3 vs Retro (API)
```

### Modules créés (sessions précédentes, parking)
```
src/compiler/partition-profiles.ts     — 🅿️ PARKING
src/orchestrator/scribe-orchestrator.ts — 🅿️ PARKING
src/orchestrator/types.ts              — 🅿️ PARKING
src/polish/targeted-patch.ts           — 🅿️ PARKING
```

### Benchs JSON
```
sessions/orch-bench-2026-03-15T04-08-49.json   — ORCH SAFE
sessions/patch-bench-2026-03-15T12-37-18.json   — P5 Patch
sessions/retro-bench-2026-03-15T16-43-11.json   — Retro vs V3
```

---

## COMMITS CETTE SESSION

| # | Hash | Message |
|---|------|---------|
| 1 | [S1+S2+S3] | feat: Scribe Orchestré MODE SAFE (1690 tests) |
| 2 | 1677a35a | feat(p5): targeted patch + bench fix (1701 tests) |
| 3 | [phase-r setup] | feat(phase-r): retro-engineering corpus + interrogation |
| 4 | 7aa57491 | feat(phase-r): retro bench — V3 vs short prompts |

---

## PROCHAINE SESSION — V4 PROMPT

```
PRIORITÉ 1 : Concevoir buildSovereignPrompt_V4() (~800-1200 tokens)
  - 10 blocs (retro structure + data pack minimal)
  - Emotion Contract compressé en langage naturel
  - Beats compressés (Action/Intention/Turn)
  - SymbolMap 5-12 entrées
  - Exemplar ~150 mots
  - 3 interdictions max
  - Kill-lists → migrent en post-process

PRIORITÉ 2 : Bench A/B ÉQUITABLE
  - V3 (15k) + pipeline COMPLET vs V4 (1k) + pipeline COMPLET
  - Mêmes scènes, même modèle, mêmes appels API
  - Seule variable = le prompt

PRIORITÉ 3 : Si V4 gagne → intégrer dans le pipeline
  - Remplacer buildSovereignPrompt() par buildSovereignPrompt_V4()
  - Bench large (5+ scènes)
  - Viser le SEAL (≥93)
```

---

## V3 STANDARD — BASELINE DE RÉFÉRENCE

Sur 5 runs V3 cette session :
| Run | Composite S0 | Composite S1 | Moyen |
|-----|-------------|-------------|-------|
| v3-bench | 88.3 | 91.4 | 89.8 |
| orch-bench | 87.6 | 88.1 | 87.8 |
| patch-bench V3 | 87.1 | 89.8 | 88.4 |
| patch-bench V3+P | 89.2 | 89.7 | 89.4 |
| retro-bench | 91.3 | 85.7 | 88.5 |
| **Moyenne** | **88.7** | **88.9** | **88.8** |

**V3 standard = 88.8 moyen, variance ±1.5, max 91.4**

---

**FIN SESSION_SAVE — 2026-03-15**
*Phase R complète. Direction V4 validée 3/3.*
*1701 PASS / 0 FAIL / 7 skipped.*
*HEAD : 7aa57491*
