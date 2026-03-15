# 🚀 OMEGA SESSION — REPRISE

Version: V4.1.1 (prompt-assembler-v4.ts non committé)
Dernier commit pushé: `dbf705d4` (feat(v4): prompt assembler V4 — 10 blocs natifs ~800t + golden exemplars + bench)
Branche: `phase-u-transcendence`
Tests dernière exécution: 1721 PASS / 2 FAIL / 7 skipped → tests fixés sur disque, non re-run
Objectif: **CORRIGER les 2 tests, re-run tests, lancer bench V4.1.1, mesurer l'ECC**

---

## RAPPEL:
- Lire les docs minutieusement AVANT d'agir
- Présenter un bilan de compréhension
- Attendre ma validation

Architecte Suprême: Francky
IA Principal: Claude

---

## CONTEXTE COMPLET DU PROJET OMEGA

### Qu'est-ce qu'OMEGA ?
OMEGA est un système AI-driven de génération littéraire (TypeScript monorepo) visant à produire de la prose française de qualité supérieure, évaluée par un scorer multi-axes (20 axes, 5 macro-axes : ECC, RCI, SII, IFI, AAI). Le standard est NASA-Grade L4 / DO-178C / MIL-STD. Gouvernance 3 IAs : Claude (principal) + ChatGPT (audit) + Gemini (garde-fou architectural). Francky a l'autorité finale.

### Repo & chemins
- Repo local : `C:\Users\elric\omega-project\packages\sovereign-engine`
- Repo GitHub : `https://github.com/4Xdlm/omega-project` branche `phase-u-transcendence`
- HEAD pushé : `dbf705d4`
- Tests totaux : 1716 PASS (V4.0) — après V4.1.1 : 2 FAIL sur les tests V4 (version + keyword)

---

## OÙ ON EN EST — PHASE V4 (PROMPT NATIF)

### La chaîne complète de ce qui a été fait CETTE SESSION (2026-03-15) :

#### Partie 1 — Phase R : Retro-Engineering Cognitif LLM
On a demandé AU LLM LUI-MÊME ce qu'il voulait comme instructions pour écrire de la prose de haute qualité.

**Round 1** (8 questions × 8 textes) :
- Corpus : 4 exemplars humains (Camus L'Étranger, Duras L'Amant, Proust Swann, Camus La Peste) + 2 best OMEGA (89.35, 89.20) + 2 worst OMEGA (84.82, 85.39)
- Résultats stockés dans `retro-engineering/results/` (8 JSON)
- Rapport compilé : `retro-engineering/RETRO_ENGINEERING_REPORT.md`
- DÉCOUVERTE : le LLM veut ~287 tokens, format narratif fluide, 6-8 contraintes max, exemplar de ~150 mots

**Round 2** (6 prompts complets retro-engineered) :
- Pour chaque texte A+B : le LLM a écrit le prompt EXACT qu'il voudrait recevoir
- Résultats : `retro-engineering/results-round2/` (6 JSON)
- Rapport : `retro-engineering/RETRO_ROUND2_PROMPTS.md`
- Structure universelle en 8 blocs : Persona → Contexte → Trajectoire → Beats → Directives → Ancre vocale → Exemplar → Interdictions (3 max)

**Bench Retro vs V3** (prompt court seul vs pipeline complet) :
- V3 standard = 88.5 (avec 15 appels API, prompt 15 476 tokens)
- Retro prompt = 83.5 (avec 1 appel API, prompt 287 tokens)
- Conclusion : 94% du résultat avec 7% des appels. Le prompt V3 contient ~12 000 tokens de BRUIT.

#### Partie 2 — V4.0 : Implémentation du Prompt Natif
Direction V4 validée unanimement (3/3 IAs) :
- `src/input/prompt-assembler-v4.ts` — 10 blocs narratifs, ~800-1200 tokens
- `src/input/golden-exemplars.ts` — 3 exemplars (GE-01, GE-02, GE-03)
- Intégration dans `engine.ts` via flag `OMEGA_PROMPT_V4=1`
- 11 tests INV-V4-01..10 + version + 4 tests golden-exemplars
- Pipeline IDENTIQUE (SymbolMap + Duel + Polish + Loop + Score) — seul le prompt change

**Bench V4.0 vs V3** (même pipeline, seule variable = prompt) :
```
| Métrique    | V3 moyen | V4.0 moyen | Delta  |
|-------------|----------|------------|--------|
| Composite   | 89.7     | 84.8       | -4.9   |
| ECC         | 86.4     | 72.5       | -13.9  | ← LE COUPABLE
| RCI         | 85.2     | 83.3       | -1.9   |
| SII         | 89.1     | 85.9       | -3.2   |
| IFI         | 94.7     | 99.3       | +4.6   | ← V4 GAGNE
| AAI         | 95.6     | 95.6       | 0.0    |
```
Verdict : ÉCHEC. L'ECC s'est effondré de -14 points.

#### Partie 3 — Diagnostic chirurgical de l'ECC
On a lu le code source du scorer `tension_14d.ts` :
- Le scorer découpe la prose en 4 quartiles **par paragraphes**
- Il analyse chaque quartile avec `analyzeEmotionSemantic()` (LLM-based, `SEMANTIC_CORTEX_ENABLED=true`)
- Il compare avec `target_14d` par cosine similarity
- Penalty -20 si monotonie (tous quartiles similaires)

**Cause racine identifiée** :
1. V4.0 fondait les 4 quartiles en 1 paragraphe fluide → le LLM écrivait une émotion UNIFORME
2. Le LLM produisait 2-3 gros paragraphes au lieu de 4+ → le mapping Q1-Q4 était cassé
3. Le scorer détectait monotonie → penalty -20

#### Partie 4 — V4.1.1 : Fix chirurgical (EN COURS — pas encore testé)
4 corrections appliquées dans `prompt-assembler-v4.ts` (écrit sur disque, PAS committé) :

| # | Correction | Cible |
|---|-----------|-------|
| 1 | Quartiles SÉPARÉS avec frontières explicites : "Premier quart (0-25%)", "Deuxième quart (25-50%)" | Le LLM sait QUAND changer d'émotion |
| 2 | EMOTION_PHYSICAL_MAP : anger → "mâchoires serrées, gestes saccadés" | Le juge sémantique comprend les comportements physiques |
| 3 | **FORCE 4 PARAGRAPHES** : "STRUCTURE OBLIGATOIRE : ton texte DOIT comporter au minimum 4 paragraphes" | Le scorer peut mapper Q1→paragraphe 1, Q2→paragraphe 2, etc. |
| 4 | Anti-monotonie + directive de variation émotionnelle | Contrer la penalty -20 |

Tests mis à jour dans `tests/input/prompt-assembler-v4.test.ts` :
- `'Trajectoire'` → `'Arc émotionnel'` (nouveau label du bloc 3)
- Version `'4.0.0'` → `'4.1.1'`

---

## CE QUI EST SUR DISQUE MAIS PAS COMMITTÉ

| Fichier | Statut |
|---------|--------|
| `src/input/prompt-assembler-v4.ts` | MODIFIÉ (V4.0 → V4.1.1) |
| `tests/input/prompt-assembler-v4.test.ts` | MODIFIÉ (2 fixes) |

---

## ACTION IMMÉDIATE À FAIRE

1. **Vérifier que les tests passent** :
```powershell
cd C:\Users\elric\omega-project\packages\sovereign-engine
npx vitest run
```
Attendu : 1716 PASS / 0 FAIL / 7 skipped

2. **Lancer le bench V4.1.1** :
```powershell
npx tsx scripts/run-v4-bench.ts
```
Le bench compare V3 (15k tokens) vs V4.1.1 (~1020 tokens), même pipeline complet.

3. **Commit + push si bench positif** :
```powershell
cd C:\Users\elric\omega-project
git add -A
git commit -m "fix(v4.1.1): force 4 paragraphs + quartile boundaries — recover ECC"
git push origin phase-u-transcendence
```

---

## KPI DE DÉCISION

```
VICTOIRE V4 FRANCHE :
  V4 composite moyen > V3 composite moyen
  ET aucune régression > 3 pts sur un axe
  → V4 remplace V3

VICTOIRE V4 SUFFISANTE :
  V4 composite moyen ≥ V3 - 0.5
  ET aucune régression > 3 pts
  → V4 remplace V3 (moins de tokens = plus maintenable)

ÉCHEC :
  V4 < V3 - 1.0
  → Analyser quel axe reste faible, itérer V4.2
```

---

## HISTORIQUE DES BENCHS (cette session)

| Bench | V3 moyen | Challenger | Delta | Verdict |
|-------|---------|-----------|-------|---------|
| ORCH SAFE | 87.8 | 84.2 | -3.6 | ❌ FAIL |
| P5 Patch | 88.4 | rollback | — | ❌ FAIL |
| Retro seul (287t, 1 appel) | 88.5 | 83.5 | -5.0 | Info |
| V4.0 pipeline (800t) | 89.7 | 84.8 | -4.9 | ❌ FAIL (ECC -14) |
| **V4.1.1 pipeline (~1020t)** | **?** | **?** | **?** | **⏳ EN ATTENTE** |

V3 standard baseline = **88.8 moyen** sur 5 runs, variance ±1.5, max 91.4.

---

## LOIS OMEGA DÉCOUVERTES (gravées)

| # | Loi | Preuve |
|---|-----|--------|
| №6 | Spécialiser par SUPPRESSION = dégradation | ORCH -4.7 pts |
| №7 | Draft équilibré > draft spécialisé | V3 88.9 > ORCH 84.2 |
| №8 | Emphase > amputation | Convergence 3/3 |
| №9 | Le LLM ne sait pas éditer sur contexte complet | P5 rollback 2/2 |
| №10 | Le LLM veut ~300 tokens, pas 15 000. Le bruit étouffe la créativité | Phase R unanime |
| №11 | 94% du résultat vient de 7% des appels | Retro-bench |

---

## ARCHITECTURE V4 — LES 10 BLOCS

```
BLOC 1  — Persona (~30t)     : "Tu es un écrivain de fiction..."
BLOC 2  — Contexte (~100t)   : Qui, où, quand, quoi, enjeux, POV, tense
BLOC 3  — Trajectoire (~180t): 4 quartiles SÉPARÉS avec émotion + incarnation physique
BLOC 4  — Beats (~130t)      : Points de passage narratifs (1 ligne/beat)
BLOC 5  — Directives (~120t) : 5-7 instructions concrètes (ancrage physique, rythme, registre)
BLOC 6  — Ancre vocale (~25t): 1 phrase = north star du LLM
BLOC 7  — Symboles (~80t)    : Mots-palette + motifs + accroches + ancrage sensoriel
BLOC 8  — Exemplar (~150t)   : Golden passage (meilleur OMEGA, sélection déterministe)
BLOC 9  — Interdictions (~40t): 3 règles max (pas d'émotions nommées, pas de transitions, pas de lyrisme)
BLOC 10 — Instruction (~25t) : "Écris la scène en 4 paragraphes minimum..."

TOTAL : ~1020 tokens (÷15 vs V3)
```

Pipeline IDENTIQUE après le prompt : SymbolMap → Duel (3 drafts) → Polish → Sovereign Loop → judgeAestheticV3()

---

## FICHIERS CLÉS

### Code V4
- `src/input/prompt-assembler-v4.ts` — Compilateur V4.1.1 (10 blocs, ~1020t)
- `src/input/golden-exemplars.ts` — 3 exemplars (GE-01, GE-02, GE-03)
- `engine.ts` — if/else V4/V3/V2 via flag OMEGA_PROMPT_V4=1

### Phase R (retro-engineering)
- `retro-engineering/RETRO_ENGINEERING_REPORT.md` — Rapport R1
- `retro-engineering/RETRO_ROUND2_PROMPTS.md` — Rapport R2 (6 prompts complets)
- `retro-engineering/results/` — 8 JSON réponses R1
- `retro-engineering/results-round2/` — 6 JSON réponses R2
- `retro-engineering/REF_prompt_v3_actuel.txt` — Dump complet prompt V3 (17 sections, 15 476t)

### Scripts
- `scripts/run-retro-engineering.ts` — Interrogation R1
- `scripts/run-retro-round2.ts` — Interrogation R2
- `scripts/run-retro-bench.ts` — Bench retro vs V3
- `scripts/run-v4-bench.ts` — Bench V4 vs V3 (pipeline complet)

### Benchs
- `sessions/retro-bench-2026-03-15T16-43-11.json` — Retro 287t vs V3
- `sessions/v4-bench-2026-03-15T18-40-53.json` — V4.0 vs V3

### Session saves
- `sessions/SESSION_SAVE_2026-03-15_PHASE_R.md` — SESSION_SAVE complète

---

## DÉCOUVERTES CRITIQUES DU SCORER

Le scorer `tension_14d.ts` (poids ×3.0 dans ECC) :
1. Découpe la prose en 4 quartiles PAR PARAGRAPHES
2. `SEMANTIC_CORTEX_ENABLED=true` → utilise `analyzeEmotionSemantic()` (LLM-based, PAS keyword)
3. Calcule cosine similarity avec `target_14d` par quartile
4. Bonus +10 si rupture au bon timing
5. Penalty -20 si monotonie (tous quartiles émotionnellement similaires)

→ Forcer 4 paragraphes minimum est CRITIQUE pour le mapping Q1→Q4
→ Le juge sémantique comprend "mâchoires serrées" comme colère (pas besoin de keywords)

## MODULES EN PARKING (construits, suspendus)

| Module | Tests | Statut | Réactivation |
|--------|-------|--------|-------------|
| `partition-profiles.ts` (DRAM/MUS) | 8 | 🅿️ PARKING | Si emphase validée post-R |
| `scribe-orchestrator.ts` | 10 | 🅿️ PARKING | Recyclable en Best-of-N |
| `targeted-patch.ts` | 11 | 🅿️ PARKING | Si micro-patch validé post-R |

---

## GOUVERNANCE 3 IAS — DÉCISIONS VERROUILLÉES

| Question | Réponse | Consensus |
|----------|---------|-----------|
| Trajectoire format | Langage naturel pur (pas de vecteurs 14D) | 3/3 |
| Exemplar type | Best OMEGA générique (v1), contextualisé en v2 | 3/3 |
| Nombre interdictions | 3 max | 3/3 |
| Diversité Duel | T=1.0 suffit, prompt court = plus de diversité | 3/3 |
| Recency reminder | Instruction finale suffit (800t = tout en mémoire) | 3/3 |
| Kill-lists | Post-process (sweepCliches) — libérer le Scribe | 3/3 |

---

## PROCHAINES ÉTAPES (ordre)

1. ⏳ **Vérifier tests V4.1.1** → npx vitest run → 0 FAIL attendu
2. ⏳ **Bench V4.1.1** → npx tsx scripts/run-v4-bench.ts → mesurer ECC
3. Si ECC remonte ≥ 85 → VICTOIRE → commit + SESSION_SAVE
4. Si ECC reste bas → analyser si c'est le paragraphing, l'exemplar, ou le symbolMap
5. Post-V4 : bench large (5+ scènes), viser SEAL (≥93)

---

Let's go! 🚀
