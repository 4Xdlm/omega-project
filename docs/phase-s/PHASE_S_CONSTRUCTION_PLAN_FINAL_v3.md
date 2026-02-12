# ═══════════════════════════════════════════════════════════════════════════════
#
#  ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗
# ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗
# ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║
# ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║
# ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║
#  ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝
#
#     PHASE S — SOVEREIGN STYLE ENGINE
#     PLAN DE CONSTRUCTION FINAL v3.0
#     Document unique — remplace tous les précédents
#
#     Fusion : Claude SPEC v2 + Amendment A1 + ChatGPT Delta/Pitch/Sovereign
#     Standard: NASA-Grade L4 / DO-178C
#     Autorité: Francky (Architecte Suprême)
#     Date: 2026-02-12
#
# ═══════════════════════════════════════════════════════════════════════════════

Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.

---

## §0 — DÉCISIONS ARCHITECTE (GRAVÉES)

| Décision | Choix | Date |
|----------|-------|------|
| Standard qualité | C + B + A (signature + lisibilité + prix) | 2026-02-12 |
| Moteur par défaut | **SOVEREIGN** (pas option — standard) | 2026-02-12 |
| Mode rapide | Existe mais dégradé, jamais pour production | 2026-02-12 |
| Poids émotion | **60%** du score composite | 2026-02-12 |
| Seuil souverain | **≥ 92/100** | 2026-02-12 |
| Correction mode | **Hybride souverain** (3 pitches → oracle → patch) | 2026-02-12 |
| Catalogue ops | **Fermé** (pas de créativité LLM libre) | 2026-02-12 |
| PreWrite fail | **FAIL dur + auto-fill dérivables** | 2026-02-12 |
| Rejet assumé | 30-50% drafts rejetés = signe de rigueur | 2026-02-12 |
| Seuils | Fixés AVANT, jamais ajustés après | 2026-02-12 |

---

## §1 — LE SCANDALE (pourquoi Phase S existe)

### Arsenal OMEGA existant dans le repo (14 fonctions)

| Fonction | Package | Capacité |
|----------|---------|----------|
| `EMOTION14_ORDERED` | `@omega/genome/emotion14.ts` | 14 axes sanctuarisés |
| `normalizeDistribution()` | `@omega/genome/emotion14.ts` | Normalisation vecteurs |
| `cosineSimilarity14D()` | `omega-forge/emotion-space.ts` | Similarité R14 |
| `euclideanDistance14D()` | `omega-forge/emotion-space.ts` | Distance R14 |
| `computeValence()` | `omega-forge/emotion-space.ts` | Valence ±1 |
| `computeArousal()` | `omega-forge/emotion-space.ts` | Arousal 0-1 |
| `dominantEmotion()` | `omega-forge/emotion-space.ts` | Dominant d'un vecteur |
| `singleEmotionState()` | `omega-forge/emotion-space.ts` | Vecteur depuis nom |
| `toOmegaState()` | `omega-forge/omega-state.ts` | Conversion XYZ |
| `buildPrescribedTrajectory()` | `omega-forge/trajectory-analyzer.ts` | **14D cible PAR paragraphe** |
| `analyzeEmotionFromText()` | `omega-forge/trajectory-analyzer.ts` | 14D depuis texte (keywords) |
| `computeEmotionCurve()` | `mod-narrative/emotionv2-adapter` | Courbe peaks/valleys |
| `computeEmotionalInertia()` | `mod-narrative/emotionv2-adapter` | Inertie émotionnelle |
| `mapEmotions()` | `genesis-planner/emotion-mapper.ts` | Trajectoire waypoints |

### Ce que le LLM reçoit actuellement

```
"fear" + 0.72
```

### Ce qui vérifie l'émotion en sortie

```
Recherche du mot "afraid" dans le texte
```

**14 fonctions militaires. Pas branchées. Phase S les branche TOUTES.**

---

## §2 — ARCHITECTURE SOUVERAINE COMPLÈTE

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                    SOVEREIGN DELTA ENGINE (DEFAULT)                            ║
║                                                                               ║
║   GENESIS PLAN                                                                ║
║       │                                                                       ║
║       ▼                                                                       ║
║   ┌─────────────────────────────────────────────────────────────────┐         ║
║   │  S0-A : FORGE_PACKET ASSEMBLER                                  │         ║
║   │  Branche les 14 fonctions existantes                           │         ║
║   │  Calcule : 14D×4 quartiles, valence, arousal, tension,        │         ║
║   │           rupture, peaks, genome, blacklist                     │         ║
║   │  Sort : FORGE_PACKET.json (hashé, gelé)                        │         ║
║   │  + SCENE_BATTLE_PLAN.json (simulateur 0 token)                 │         ║
║   └──────────────────────────┬──────────────────────────────────────┘         ║
║                              │                                                ║
║                              ▼                                                ║
║   ┌─────────────────────────────────────────────────────────────────┐         ║
║   │  PRE-WRITE VALIDATOR                                            │         ║
║   │  Vérifie : tous champs requis présents                         │         ║
║   │  FAIL dur → 0 token + auto-fill dérivables + retry             │         ║
║   │  INV-S-PACKET-01                                                │         ║
║   └──────────────────────────┬──────────────────────────────────────┘         ║
║                              │ PASS                                           ║
║                              ▼                                                ║
║   ┌─────────────────────────────────────────────────────────────────┐         ║
║   │  PROMPT ASSEMBLER v2                                            │         ║
║   │  Injection déterministe depuis FORGE_PACKET                    │         ║
║   │  12 sections, ordre fixe, format fixe                          │         ║
║   │  Émotion en clair : "Q1: fear(0.55) + anticipation(0.25),     │         ║
║   │    valence=-0.35, arousal=0.70 — menace se cristallise"        │         ║
║   └──────────────────────────┬──────────────────────────────────────┘         ║
║                              │                                                ║
║                              ▼                                                ║
║   ┌─────────────────────────────────────────────────────────────────┐         ║
║   │  DRAFT GENERATION                                               │         ║
║   │  Mode SOVEREIGN : 3 drafts (A tranchant / B sensoriel / C exp) │         ║
║   │  Mode RAPIDE    : 1 draft (preview/low-cost seulement)         │         ║
║   └──────────────────────────┬──────────────────────────────────────┘         ║
║                              │                                                ║
║                              ▼                                                ║
║   ┌─────────────────────────────────────────────────────────────────┐         ║
║   │  HARD GATE (existant, inchangé)                                 │         ║
║   │  Tense, POV, word_count, banned_words, dialogue_ratio          │         ║
║   │  FAIL → repair classique (multi-attempt, déjà implémenté)      │         ║
║   └──────────────────────────┬──────────────────────────────────────┘         ║
║                              │ PASS                                           ║
║                              ▼                                                ║
║   ┌─────────────────────────────────────────────────────────────────┐         ║
║   │  S0-B : DELTA_REPORT (100% déterministe, 0 token)              │         ║
║   │                                                                  │         ║
║   │  Mesure froide FORGE_PACKET (cible) vs PROSE (réel) :          │         ║
║   │                                                                  │         ║
║   │  A) DELTA ÉMOTION (60% du poids)                                │         ║
║   │     • distance 14D cible vs obtenu par quartile                │         ║
║   │       (euclideanDistance14D + cosineSimilarity14D)              │         ║
║   │     • valence/arousal/dominance delta (computeValence/Arousal)  │         ║
║   │     • corrélation courbe prescrite vs réelle                   │         ║
║   │     • rupture absente / déplacée                               │         ║
║   │     • pic timing error                                          │         ║
║   │     • impact terminal delta                                     │         ║
║   │                                                                  │         ║
║   │  B) DELTA TENSION                                               │         ║
║   │     • pente réelle vs cible                                    │         ║
║   │     • pic absent / trop tôt / trop tard                        │         ║
║   │     • faille absente (pas de bascule)                          │         ║
║   │     • conséquence trop faible                                  │         ║
║   │                                                                  │         ║
║   │  C) DELTA STYLE                                                 │         ║
║   │     • ratios phrases (Gini coefficient)                        │         ║
║   │     • densité sensorielle (images/100 mots)                    │         ║
║   │     • taux abstraction vs cible                                │         ║
║   │     • vocabulaire signature hit-rate                           │         ║
║   │     • monotonie séquentielle                                   │         ║
║   │                                                                  │         ║
║   │  D) DELTA ANTI-CLICHÉ                                          │         ║
║   │     • matchs blacklist (CLICHE_BLACKLIST.json)                 │         ║
║   │     • filter words détectés                                    │         ║
║   │     • AI patterns détectés                                     │         ║
║   │                                                                  │         ║
║   │  Sort : DELTA_REPORT.json                                       │         ║
║   └──────────────────────────┬──────────────────────────────────────┘         ║
║                              │                                                ║
║                              ▼                                                ║
║   ┌─────────────────────────────────────────────────────────────────┐         ║
║   │  DUEL ENGINE (si SOVEREIGN, 3 drafts)                           │         ║
║   │  Segmenter par paragraphe × beat                               │         ║
║   │  Scorer chaque segment via DELTA axes                          │         ║
║   │  Fusionner meilleurs segments                                  │         ║
║   │  Vérif transitions, liant 1 phrase si nécessaire               │         ║
║   │  Sort : DUEL_TRACE.json                                        │         ║
║   │  INV-S-DUEL-01                                                  │         ║
║   └──────────────────────────┬──────────────────────────────────────┘         ║
║                              │                                                ║
║                              ▼                                                ║
║   ┌─────────────────────────────────────────────────────────────────┐         ║
║   │  S-ORACLE V2 (9 axes, score 0-100)                              │         ║
║   │                                                                  │         ║
║   │  AXES ÉMOTIONNELS (63% du poids) :                              │         ║
║   │   1. Intériorité        ×2.0  [LLM-judge]                     │         ║
║   │   2. Tension 14D        ×3.0  [CALC — arme nucléaire OMEGA]   │         ║
║   │   8. Impact ouv+clôt    ×2.0  [LLM-judge]                     │         ║
║   │   9. Cohérence émot.    ×2.5  [CALC — 14D transitions]        │         ║
║   │                                                                  │         ║
║   │  AXES CRAFT (37% du poids) :                                    │         ║
║   │   3. Densité sensorielle ×1.5 [HYBRID]                        │         ║
║   │   4. Nécessité M8       ×1.0  [LLM-judge]                     │         ║
║   │   5. Anti-cliché        ×1.0  [CALC — blacklist]              │         ║
║   │   6. Rythme musical     ×1.0  [CALC — Gini]                   │         ║
║   │   7. Signature          ×1.0  [CALC — distance genome]        │         ║
║   │                                                                  │         ║
║   │  5 axes CALC PUR + 4 axes LLM-BOUND = hybride honnête         │         ║
║   │  Sort : S_SCORE.json                                            │         ║
║   │  INV-S-ORACLE-01                                                │         ║
║   └──────────────────────────┬──────────────────────────────────────┘         ║
║                              │                                                ║
║                      score ≥ 92 ?                                             ║
║                              │                                                ║
║                 ┌────────────┼────────────┐                                   ║
║                 │                         │                                   ║
║                OUI                       NON                                  ║
║                 │                         │                                   ║
║                 ▼                         ▼                                   ║
║        → Étape MUSICAL    ┌────────────────────────────────┐                  ║
║                           │  S0-C : TRIPLE PITCH ENGINE     │                  ║
║                           │                                  │                  ║
║                           │  Entrée : DELTA_REPORT           │                  ║
║                           │                                  │                  ║
║                           │  Génère 3 plans de correction :  │                  ║
║                           │                                  │                  ║
║                           │  PITCH A — Intensification émot  │                  ║
║                           │   (corporalité, perception,      │                  ║
║                           │    signaux internes)              │                  ║
║                           │                                  │                  ║
║                           │  PITCH B — Structure & rupture   │                  ║
║                           │   (architecture, micro-events,   │                  ║
║                           │    bascules)                      │                  ║
║                           │                                  │                  ║
║                           │  PITCH C — Compression & musique │                  ║
║                           │   (rythme, images fortes,        │                  ║
║                           │    suppression mou)               │                  ║
║                           │                                  │                  ║
║                           │  Chaque pitch : max 8 actions    │                  ║
║                           │  Catalogue d'ops FERMÉ :         │                  ║
║                           │  • inject_sensory_detail          │                  ║
║                           │  • convert_dialogue_to_indirect   │                  ║
║                           │  • add_micro_rupture_event        │                  ║
║                           │  • tighten_sentence_rhythm        │                  ║
║                           │  • replace_cliche                 │                  ║
║                           │  • increase_interiority_signal    │                  ║
║                           │  • compress_exposition            │                  ║
║                           │  • add_consequence_line           │                  ║
║                           │  • shift_emotion_register         │                  ║
║                           │  • inject_silence_zone            │                  ║
║                           │  • sharpen_opening                │                  ║
║                           │  • deepen_closing                 │                  ║
║                           │                                  │                  ║
║                           └────────────┬─────────────────────┘                  ║
║                                        │                                        ║
║                                        ▼                                        ║
║                           ┌────────────────────────────────┐                    ║
║                           │  PITCH ORACLE                   │                    ║
║                           │  Score chaque pitch AVANT patch │                    ║
║                           │  Score = Σ(gain × gravité delta)│                    ║
║                           │  Sélectionne le meilleur        │                    ║
║                           │  100% déterministe              │                    ║
║                           └────────────┬─────────────────────┘                  ║
║                                        │                                        ║
║                                        ▼                                        ║
║                           ┌────────────────────────────────┐                    ║
║                           │  PATCH ENGINE                   │                    ║
║                           │  LLM reçoit :                   │                    ║
║                           │  • prose + pitch sélectionné    │                    ║
║                           │  • interdit : facts/beats/canon │                    ║
║                           │  • applique ops dans l'ordre    │                    ║
║                           │  INV-S-POLISH-01                │                    ║
║                           └────────────┬─────────────────────┘                  ║
║                                        │                                        ║
║                                        ▼                                        ║
║                                 Re-score DELTA + S-ORACLE                       ║
║                                        │                                        ║
║                              passe ≤ 2 ?                                        ║
║                                        │                                        ║
║                           ┌────────────┼────────────┐                           ║
║                           │                         │                           ║
║                          OUI                       NON                          ║
║                           │                         │                           ║
║                     reboucle              garde meilleur draft                  ║
║                     (2e pitch)            (score le plus haut)                  ║
║                                                     │                           ║
║                                          score < 60 ?                           ║
║                                          OUI → REJECT (NCR)                    ║
║                                          NON → continue                        ║
║                                                                                 ║
║   ┌──────────────────────────────────────────────────────────────────┐          ║
║   │  MUSICAL POLISH (correction, pas juste mesure)                   │          ║
║   │  Monotonie → syncope. Répétition → variation. Plat → syncope.  │          ║
║   │  1 phrase max par intervention. Sort : RHYTHM_CORRECTIONS.json  │          ║
║   └──────────────────────────────┬───────────────────────────────────┘          ║
║                                  │                                              ║
║                                  ▼                                              ║
║   ┌──────────────────────────────────────────────────────────────────┐          ║
║   │  ANTI-CLICHÉ SWEEP                                               │          ║
║   │  Scan CLICHE_BLACKLIST.json. Match → remplacement ancré.        │          ║
║   │  Max 2 passes. Encore des matchs → FAIL-CLOSED.                │          ║
║   │  INV-S-NOCLICHE-01                                               │          ║
║   └──────────────────────────────┬───────────────────────────────────┘          ║
║                                  │                                              ║
║                                  ▼                                              ║
║   ┌──────────────────────────────────────────────────────────────────┐          ║
║   │  SIGNATURE ENFORCEMENT                                           │          ║
║   │  Distance prose ↔ STYLE_GENOME. Si trop loin → micro-corrections│          ║
║   │  Sort : STYLE_DIFF.json. INV-S-GENOME-01                       │          ║
║   └──────────────────────────────┬───────────────────────────────────┘          ║
║                                  │                                              ║
║                                  ▼                                              ║
║   ┌──────────────────────────────────────────────────────────────────┐          ║
║   │  FINAL ORACLE                                                    │          ║
║   │  Re-calcul S_SCORE complet. Compare initial vs final.           │          ║
║   │  Sort : S_SCORE_FINAL.json + FORGE_REPORT.json                  │          ║
║   │  Verdict : SEAL (publié) ou REJECT (archivé, NCR)              │          ║
║   └──────────────────────────────────────────────────────────────────┘          ║
║                                                                                 ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## §3 — CATALOGUE D'OPS FERMÉ (12 opérations)

Le LLM ne peut PAS inventer d'opérations. Il choisit dans ce catalogue.

| Op ID | Nom | Description | Axe impacté |
|-------|-----|-------------|-------------|
| `OP-01` | `inject_sensory_detail` | Ajouter image concrète (texture, odeur, son) | Densité sens. |
| `OP-02` | `convert_dialogue_to_indirect` | Transformer dialogue en narration intérieure | Intériorité |
| `OP-03` | `add_micro_rupture_event` | Insérer micro-événement irréversible (1 phrase) | Tension |
| `OP-04` | `tighten_sentence_rhythm` | Raccourcir/allonger pour varier cadence | Rythme |
| `OP-05` | `replace_cliche` | Remplacer phrase fatiguée par image spécifique | Anti-cliché |
| `OP-06` | `increase_interiority_signal` | Ajouter pensée interne/perception subjective | Intériorité |
| `OP-07` | `compress_exposition` | Condenser passage explicatif en action/image | Nécessité |
| `OP-08` | `add_consequence_line` | Ajouter phrase montrant que le monde a changé | Tension |
| `OP-09` | `shift_emotion_register` | Modifier registre émotionnel vers cible 14D | Cohérence émot. |
| `OP-10` | `inject_silence_zone` | Insérer zone de basse intensité (repos narratif) | Tension |
| `OP-11` | `sharpen_opening` | Réécrire première phrase pour hook sensoriel | Impact |
| `OP-12` | `deepen_closing` | Réécrire dernière phrase pour résonance | Impact |

Format d'un item de pitch :
```json
{
  "id": "PITCH-A-003",
  "zone": "Q2_paragraph_3",
  "op": "inject_sensory_detail",
  "reason": "delta sensory_density = -0.22 sur Q2",
  "instruction": "Remplacer 'il ressentait une tension' par contraction musculaire + température ambiante",
  "expected_gain": { "axe": "sensory_density", "delta": "+0.15" }
}
```

---

## §4 — INVARIANTS PHASE S (COMPLET)

| ID | Description | Type |
|----|-------------|------|
| **INV-S-PACKET-01** | FORGE_PACKET validé et hashé avant tout appel LLM | Sûreté |
| **INV-S-PACKET-02** | emotion_contract.curve_quartiles obligatoire (4×14D) | Contrat |
| **INV-S-PACKET-03** | Pre-Write Validator FAIL → 0 token dépensé | Économie |
| **INV-S-EMOTION-60** | Poids émotionnels ≥ 60% du S_SCORE composite | Formule |
| **INV-S-ORACLE-01** | Même prose + même seed = même S_SCORE | Déterminisme |
| **INV-S-BOUND-01** | Max 2 passes correction (INV-DELTA-LOOP-01) | Sûreté |
| **INV-S-GENOME-01** | Style genome gelé par run, diff mesuré | Contrat |
| **INV-S-DUEL-01** | Duel reproductible (seeded), sélection traçable | Déterminisme |
| **INV-S-NOCLICHE-01** | 0 match blacklist après sweep final | Qualité |
| **INV-S-POLISH-01** | Patch préserve beats, faits canon, structure | Intégrité |
| **INV-S-EMOTION-01** | Corrélation 14D prose vs courbe cible ≥ 0.70 | Traçabilité |
| **INV-S-TENSION-01** | Scène sans pic+faille+conséquence = REJECT | Qualité |
| **INV-S-MUSICAL-01** | Correction musicale = 1 phrase max, documentée | Sûreté |
| **INV-S-CATALOG-01** | Pitch n'utilise QUE les 12 ops du catalogue | Contrôle |

---

## §5 — PLAN D'EXÉCUTION (sprints)

### Sprint S0-A : FORGE_PACKET + Pre-Write (PRIORITÉ #1)

**Objectif** : Le LLM ne devine plus. Il suit un contrat.

| Livrable | Description |
|----------|-------------|
| `forge-packet-assembler.ts` | Branche les 14 fonctions existantes, assemble FORGE_PACKET.json |
| `pre-write-validator.ts` | FAIL dur si incomplet + auto-fill dérivables |
| `pre-write-simulator.ts` | SCENE_BATTLE_PLAN.json (0 token) |
| `prompt-assembler-v2.ts` | `buildSovereignPrompt()` — injection déterministe 12 sections |
| `CLICHE_BLACKLIST.json` v1 | 300+ patterns versionnés |
| `STYLE_PROFILE.json` v1 | Pour les 3 goldens existants |
| Types : `ForgePacket`, etc. | Interfaces TypeScript |
| Tests unitaires | Assembleur, validateur, simulateur |

**Sessions : 2-3**

---

### Sprint S0-B : DELTA_REPORT

**Objectif** : Mesurer froidement la distance cible vs réel.

| Livrable | Description |
|----------|-------------|
| `delta-report.ts` | 100% déterministe. Mesure 14D, tension, style, clichés |
| `delta-emotion.ts` | euclideanDistance14D, cosineSimilarity, valence/arousal deltas |
| `delta-tension.ts` | Pente, pic, faille, conséquence |
| `delta-style.ts` | Gini, densité, abstraction, signature |
| `delta-cliche.ts` | Scan blacklist |
| `DELTA_REPORT.json` schema | Format de sortie |
| Tests | Déterminisme garanti |

**Sessions : 1-2**

---

### Sprint S0-C : TRIPLE PITCH + PITCH ORACLE

**Objectif** : 3 stratégies de correction. Oracle sélectionne la meilleure.

| Livrable | Description |
|----------|-------------|
| `triple-pitch.ts` | Génère 3 pitches (A/B/C) depuis DELTA_REPORT |
| `pitch-oracle.ts` | Score chaque pitch = Σ(gain × gravité delta). Sélectionne. |
| `patch-engine.ts` | Applique pitch sélectionné sur prose |
| `correction-catalog.ts` | 12 ops fermées, typées |
| `sovereign-loop.ts` | Boucle complète : delta → pitch → oracle → patch → re-score, max 2 |
| Tests | Reproductibilité, bornes |

**Sessions : 2-3**

---

### Sprint S1 : S-ORACLE V2 + BASELINE

**Objectif** : Mesurer le vrai niveau.

| Livrable | Description |
|----------|-------------|
| `aesthetic-oracle.ts` | Orchestrateur 9 axes |
| 5 axes CALC | tension-14d, anti-cliché, rythme, signature, cohérence-émot |
| 4 axes LLM | intériorité, densité, nécessité, impact |
| `S_SCORE.json` schema | Format de sortie |
| **BASELINE** | Score des 3 goldens existants AVEC FORGE_PACKET |
| Tests | Déterminisme des 5 axes CALC |

**Sessions : 2-3**

---

### Sprint S2 : DUEL ENGINE + MUSICAL + SWEEP

**Objectif** : Multi-voix + polissage final.

| Livrable | Description |
|----------|-------------|
| `duel-engine.ts` | 3 drafts → segmentation → scoring → fusion |
| `musical-engine.ts` | Analyse + correction (syncopes, compressions) |
| `anti-cliche-sweep.ts` | Scan + remplacement borné |
| `signature-enforcement.ts` | Distance genome + micro-corrections |
| Tests | Duel reproductible, musical borné |

**Sessions : 2-3**

---

### Sprint S3 : INTÉGRATION + CALIBRATION

**Objectif** : Pipeline E2E souverain, preuves.

| Livrable | Description |
|----------|-------------|
| Pipeline E2E | Tout branché de FORGE_PACKET à SEAL/REJECT |
| Calibration | Baseline avant/après Phase S sur 3 goldens |
| Comparaison | S_SCORE initial vs après S0 vs après S1 |
| ProofPack | SHA256, invariants, tests |
| FORGE_REPORT.json | Étapes, durées, coûts, deltas, verdict |

**Sessions : 1-2**

---

## §6 — ARTEFACTS DE SORTIE (par run)

| Fichier | Contenu | Nouveau |
|---------|---------|---------|
| `FORGE_PACKET.json` | Contrat d'entrée complet (14D×4Q, tension, genome, kill lists) | ✅ |
| `SCENE_BATTLE_PLAN.json` | Plan d'attaque simulé (0 token) | ✅ |
| `DELTA_REPORT.json` | Distance cible vs réel (émotion, tension, style, clichés) | ✅ |
| `TRIPLE_PITCH.json` | 3 plans de correction + oracle selection | ✅ |
| `S_SCORE.json` | 9 axes × score + composite par scène | ✅ |
| `S_SCORE_FINAL.json` | Score après corrections | ✅ |
| `DUEL_TRACE.json` | Sélection segments (si multi-draft) | ✅ |
| `RHYTHM_CORRECTIONS.json` | Interventions musicales | ✅ |
| `STYLE_DIFF.json` | Distance prose ↔ genome | ✅ |
| `FORGE_REPORT.json` | Rapport complet (étapes, durées, coûts, deltas) | ✅ |
| `ProsePack.json` | Validation structurelle (existant) | — |
| `repair-report.json` | Rapport repair (existant) | — |
| `scribe-prose-final.txt` | Prose finale | — |

---

## §7 — CRITÈRE DE SUCCÈS

Phase S est **SEALED** quand :

1. ✅ FORGE_PACKET assemble les 14 fonctions existantes
2. ✅ Pre-Write Validator : 0 token si incomplet
3. ✅ DELTA_REPORT : 100% déterministe, mesure 14D réelle
4. ✅ Triple Pitch : 3 stratégies, catalogue fermé, oracle sélectionne
5. ✅ S-ORACLE : 9 axes, 5 CALC + 4 LLM, score 0-100
6. ✅ Baseline 3 goldens mesuré (avant vs après)
7. ✅ Forge améliore S_SCORE d'au moins **+15 points** en moyenne
8. ✅ Pipeline SOVEREIGN produit S_SCORE **≥ 92/100** sur 3/3 goldens
9. ✅ **0 cliché** dans toute sortie finale
10. ✅ Corrélation 14D **≥ 0.70**
11. ✅ Tous les 14 invariants **PASS**
12. ✅ Reject rate documenté (**30-50% = signe de rigueur**)
13. ✅ Tous artefacts hashés SHA256

---

## §8 — CE QUE ÇA PRODUIT

### Avant Phase S

```
"fear" + 0.72 → LLM devine → mot "afraid" cherché → "ça passe"
```

### Après Phase S

```
14D×4 quartiles + tension + rupture + genome + blacklist
→ LLM suit un contrat émotionnel
→ 3 drafts forgés → meilleurs segments fusionnés
→ distance 14D mesurée froidement → 3 stratégies de correction
→ oracle sélectionne la meilleure → patch chirurgical
→ polish musical → clichés éradiqués → signature enforced
→ score ≥ 92/100 ou REJECT
→ chaque artefact hashé, traçable, exportable
```

**Le moteur passe de "improvisateur capricieux" à "forge industrielle d'excellence littéraire."**

---

**FIN DU PLAN DE CONSTRUCTION FINAL v3.0**

*Ce document remplace : SPEC v2, Amendment A1, et tous les documents intermédiaires.*
*Il est le blueprint de construction de Phase S.*
*Aucune discussion supplémentaire. On construit.*
