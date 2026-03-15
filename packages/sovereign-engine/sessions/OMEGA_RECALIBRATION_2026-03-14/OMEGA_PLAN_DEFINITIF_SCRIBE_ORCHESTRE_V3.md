# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PLAN DÉFINITIF : SCRIBE ORCHESTRÉ v3.0
# Fusionné : Claude + ChatGPT + Gemini — Audit hostile croisé
# Zéro faille humaine. Tous modules existants réutilisés.
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date    : 2026-03-15
# Version : 3.0 — DÉFINITIF (4 audits hostiles fusionnés)
# Autorité: Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## DOCTRINE

"On ne limite pas OMEGA par peur du budget API. On vise le top du top.
Les économies se font sur les dry-runs, pas sur la production."

5 LOIS :
1. Un appel API répond à une question, pas à une curiosité.
2. Aucune passe n'a le droit de tout faire.
3. Toute amélioration est locale, mesurable, réversible.
4. OMEGA choisit. Le LLM propose.
5. On paie la puissance, jamais l'imprécision.

---

## CE QUI EXISTE DÉJÀ ET QU'ON RÉUTILISE (pas de double)

Les audits ont demandé des modules. La plupart EXISTENT DÉJÀ.

| Besoin identifié par les audits | Module OMEGA existant | Fichier |
|--------------------------------|----------------------|---------|
| Beat Lattice commun | **ForgePacket.beats** (ForgeBeat[]) | types.ts |
| Voice Core immuable | **StyleProfile.voice** + **tone** | types.ts |
| Scoring émotion local 0 API | **scoreEmotionCoherence()** — 100% CALC | emotion-coherence.ts |
| Scoring rythme local 0 API | **scoreRhythm()** — 100% CALC | rhythm.ts |
| Scoring anti-cliché local 0 API | **scoreAntiCliche()** — 100% CALC | anti-cliche.ts |
| Scoring signature local 0 API | **scoreSignature()** — 100% CALC | signature.ts |
| Damage Gate multi-axes | **evaluateDamage()** | damage-gate.ts |
| Static Analyzer pré-vol | **analyzePreFlight()** | static-analyzer.ts |
| Delta Compressor inter-scènes | **compressDelta()** | delta-compressor.ts |
| Compilateur de contraintes | **compilePartition()** | prompt-compiler.ts |
| Symbol Map | **generateSymbolMap()** | symbol-mapper.ts |
| Macro-axes scoring | **judgeAestheticV3()** | aesthetic-oracle.ts |
| Quartile émotionnel | **EmotionContract.curve_quartiles** (Q1-Q4) | types.ts |

→ ON NE CRÉE PAS DE NOUVEAUX MODULES DE SCORING.
→ ON NE CRÉE PAS DE BEAT LATTICE — IL EXISTE.
→ ON NE CRÉE PAS DE VOICE CORE — IL EXISTE.

---

## LA FAILLE RACINE (unanimité 4/4 audits)

Tous les audits convergent sur UN point :

  "Deux drafts générés par 2 profils différents ne racontent pas
   forcément la même scène dans le même ordre temporel.
   L'assemblage croisé par quartile est donc DANGEREUX en v1."

SOLUTION DÉFINITIVE en 2 phases :

  PHASE 1 (MODE SAFE) : 2 drafts focalisés → on garde le MEILLEUR ENTIER.
  Pas d'assemblage croisé. Pas de Frankenstein. Pas de risque.
  Le gain vient de la SPÉCIALISATION, pas du découpage.

  PHASE 2 (MODE CROSS — futur, après calibration) :
  Beat-aligned splitting (utilisant les ForgeBeat existants).
  Assemblage par BEAT (pas par quartile aveugle).
  Uniquement quand la différenciation A/B est prouvée compatible.

---

## ARCHITECTURE MODE SAFE (v3.1.0 — CE QU'ON IMPLÉMENTE)

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  PHASE 1 — COMPILATION DUALE                                            ║
║                                                                          ║
║  1. Générer SymbolMap UNE SEULE FOIS (INV-ORCH-04)                     ║
║  2. compileWithProfile(DRAMATURGE) → Partition A                        ║
║  3. compileWithProfile(MUSICIEN) → Partition B                          ║
║  4. analyzePreFlight(A) + analyzePreFlight(B)                          ║
║     → Si les DEUX sont RED sévère (cognitive_load > 80) → ABORT        ║
║     → Si un seul est RED → WARNING, continuer                          ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  PHASE 2 — GÉNÉRATION FOCALISÉE                                        ║
║                                                                          ║
║  5. LLM(Partition A + SymbolMap partagé) → Draft A                     ║
║  6. LLM(Partition B + SymbolMap partagé) → Draft B                     ║
║                                                                          ║
║  Les 2 drafts reçoivent :                                               ║
║  • Même ForgePacket (même beats, même emotion_contract, même canon)     ║
║  • Même SymbolMap (mêmes signature_words, mêmes motifs)                ║
║  • Même StyleProfile (même voice genome, même tone, même rhythm cible) ║
║  • Même CDEInput (si mode CDE)                                         ║
║  • SEUL LE N2 DE LA PARTITION DIFFÈRE                                   ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  PHASE 3 — SÉLECTION OMEGA (algorithmique, 0-1 API)                    ║
║                                                                          ║
║  MODE SAFE (v3.1.0) :                                                   ║
║  7. Score CALC rapide sur Draft A :                                     ║
║     rhythm + anti_cliche + signature + emotion_coherence                ║
║     = calc_composite_A                                                   ║
║  8. Score CALC rapide sur Draft B :                                     ║
║     = calc_composite_B                                                   ║
║  9. Sélectionner le meilleur draft entier :                             ║
║     winner = argmax(calc_composite)                                      ║
║     (si écart < 3 pts → scorer les 2 avec judgeAestheticV3()           ║
║      pour trancher — coût API accepté pour la précision)                ║
║                                                                          ║
║  MODE CROSS (v3.2.0 — FUTUR, pas maintenant) :                         ║
║  7'. Découper par ForgeBeat (pas par % de mots)                        ║
║  8'. Scorer par segment de beat                                         ║
║  9'. Assembler + seam-polish                                            ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  PHASE 4 — SCORE FINAL + VERDICT                                        ║
║                                                                          ║
║  10. judgeAestheticV3(winner) → MacroAxesScores                         ║
║  11. Damage Gate → vérifier aucune régression vs baseline               ║
║  12. Verdict SEAL / REJECT                                               ║
║                                                                          ║
║  FALLBACK LADDER (si échec) :                                            ║
║  a. Meilleur draft focalisé entier                                      ║
║  b. Pipeline V3 standard (1 draft + partition unique)                   ║
║  c. Pipeline V2 classique                                                ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## LES 2 PROFILS DE PARTITION

### Principe validé par tous les audits :
"Spécialisés SANS être borgnes. Chaque profil a un FLOOR sur les axes secondaires."

### PROFIL A — LE DRAMATURGE

```
Focus : ECC + SII (émotion, intériorité, tension, nécessité)
Floor : RCI ≥ acceptable (le rythme n'est pas ignoré, juste secondaire)

N1 (LOIS — identique profil B) :
  • Kill-lists standard (clichés, patterns LLM)
  • Garde-fous voix (CV phrases ≥ 0.50, syncopes présentes)
  • Interdictions canoniques

N2 (TRAJECTOIRE — spécialisé ÉMOTION, budget 250t) :
  • Trajectoire Q1→Q4 émotionnelle complète (quartiles, rupture, arc)
  • Intériorité : "Montre le paysage intérieur par le corps"
  • Nécessité : "Chaque phrase doit SERVIR la progression dramatique"
  • Sous-texte : tensions implicites, non-dits
  • Beats : accent sur les beats émotionnels (action + subtext_type)
  • Contrat : "Priorité = émotion et tension. Le rythme est SECONDAIRE
    mais PAS ABSENT. Maintiens une prose sèche et musicale,
    mais ne sacrifie JAMAIS la vérité psychologique pour une belle phrase."

N3 (DÉCOR — identique profil B) :
  • Facts canon
  • Mots-clés signature (du SymbolMap partagé)
  • Continuité
```

### PROFIL B — LE MUSICIEN

```
Focus : RCI (rythme, euphonie, cadence, anti-clichés, voix)
Floor : ECC ≥ acceptable (l'émotion n'est pas ignorée, juste secondaire)

N1 (LOIS — identique profil A) :
  EXACTEMENT le même N1. Même hash. INV-PROF-03.

N2 (TRAJECTOIRE — spécialisé CRAFT, budget 250t) :
  • Trajectoire rythme : alternance longueurs, syncopes, respiration
  • Voix compliance : densité phrastique, CV cible, opening variety
  • Euphonie : sonorités, fluidité, musicalité des enchaînements
  • PDB rhythm-specific : LOT1-04 (si shape compatible), transitions
  • Contrat : "Priorité = musicalité et cadence. L'émotion est DÉJÀ
    dans le scénario et les beats. NE RÉDUIS JAMAIS la pression
    dramatique pour améliorer le son. Le rythme sert l'histoire,
    jamais l'inverse."

N3 (DÉCOR — identique profil A) :
  EXACTEMENT le même N3. Même hash. INV-PROF-04.
```

### SHARED CORE (ce que les 2 profils reçoivent identiquement)

```
LE MÊME ForgePacket :
  → mêmes beats (ForgeBeat[]) = le Beat Lattice
  → même emotion_contract (même Q1→Q4)
  → même style_genome (même voice, même tone) = le Voice Core
  → même kill_lists
  → même canon
  → même continuity
  → même seeds

LE MÊME SymbolMap (généré 1 seule fois avant les 2 drafts)

LE MÊME CDEInput (si mode CDE)

Les sections v2 conservées (Narrative Hook, Mission, Style Genome,
Kill Lists, Canon, Continuity, Seeds, Generation, Corporeal Anchoring,
Metaphor Pregeneration, Voice Compliance, Final Checklist)
→ IDENTIQUES entre les 2 drafts.
```

Ce "shared core" est la réponse à ChatGPT (Beat Lattice) et Gemini
(Voice Core) : ces modules EXISTENT DÉJÀ dans le ForgePacket.
On ne les crée pas. On s'assure qu'ils sont IDENTIQUES entre les 2 drafts.
Ce qui est GARANTI car les 2 drafts utilisent le MÊME ForgePacket.

---

## SCORE DE SÉLECTION — calc_composite ÉQUILIBRÉ

Faille identifiée : l'ancien calc_composite (rhythm 0.5 + anti_cliche 0.3
+ signature 0.2) était biaisé RCI. Le Musicien gagnait toujours.

### Nouveau calc_composite (4 axes CALC, 0 API)

```
calc_composite = (
    emotion_coherence × 0.30   // proxy ECC (CALC, 0 API)
  + rhythm × 0.30              // proxy RCI (CALC, 0 API)
  + anti_cliche × 0.20         // proxy RCI (CALC, 0 API)
  + signature × 0.20           // proxy identité (CALC, 0 API)
)

Équilibre : émotion 0.30 vs craft 0.70
→ le Musicien a TOUJOURS un avantage structurel en calc
→ MAIS emotion_coherence peut rattraper si le Dramaturge
   a une trajectoire émotionnelle beaucoup plus fluide

Pas parfait, mais HONNÊTE. Et gratuit.
```

### Règle de départage

```
Si |calc_composite_A - calc_composite_B| < 3.0 :
  → Trop proche pour trancher avec le proxy
  → Scorer les 2 avec judgeAestheticV3() (coût API accepté)
  → Sélectionner sur le VRAI composite avec macro-axes

Si |calc_composite_A - calc_composite_B| ≥ 3.0 :
  → Écart suffisant pour trancher
  → Sélectionner le meilleur sans scoring LLM complet
  → Le score final LLM est fait APRÈS sur le winner uniquement
```

---

## COÛT API RÉEL (honnête)

Le scoring complet `judgeAestheticV3()` appelle internement :
  scoreTension14D (LLM), scoreInteriority (LLM), scoreSensoryDensity (LLM),
  scoreNecessity (LLM), scoreImpact (LLM) = 5 appels LLM
  + scoreRhythm (CALC), scoreAntiCliche (CALC), scoreSignature (CALC),
  scoreEmotionCoherence (CALC) = 0 appels

Coût réel par scène :

| Opération | Mode SAFE (écart ≥ 3) | Mode SAFE (écart < 3) |
|-----------|-----------------------|-----------------------|
| SymbolMap (1×) | 1 appel | 1 appel |
| Draft A | 1 appel | 1 appel |
| Draft B | 1 appel | 1 appel |
| CALC scoring A+B | 0 appel | 0 appel |
| Score LLM complet (départage) | 0 appel | 2 × 5 = 10 appels |
| Score LLM final (winner) | 5 appels | 0 (déjà fait) |
| **Total** | **~8** | **~13** |

Vs pipeline actuel : 1 symbolMap + 1 draft + 3 duel + 5 score + 3 polish = ~13

**Mode SAFE coûte PAREIL ou MOINS. Et les 2 drafts sont MEILLEURS car focalisés.**

---

## SPRINTS D'IMPLÉMENTATION

### Sprint S1 : Profils de Partition (S — 0 API)

```
Fichier : src/compiler/partition-profiles.ts
Test   : tests/compiler/partition-profiles.test.ts

function compileWithProfile(
  packet: ForgePacket,
  cdeInput: CDEInput | null,
  profile: 'DRAMATURGE' | 'MUSICIEN',
  activeInstructions: PDBInstruction[],
): CompiledPartition

Implémentation :
  • Réutilise compilePartition() existant
  • Passe une CompilerConfig différente par profil
  • Le DRAMATURGE filtre les contraintes : garde ECC/SII, allège RCI
  • Le MUSICIEN filtre : garde RCI, allège ECC/SII
  • Les contraintes N1 et N3 sont IDENTIQUES (même hash)

Invariants :
  INV-PROF-01 : 2 partitions valides
  INV-PROF-02 : hash N2 différent (partitions distinctes)
  INV-PROF-03 : hash N1 identique
  INV-PROF-04 : hash N3 identique
  INV-PROF-05 : les 2 contrats contiennent un floor sur l'axe secondaire
```

### Sprint S2 : Orchestrateur Mode SAFE (M — 0 API pour tests)

```
Fichiers :
  src/orchestrator/scribe-orchestrator.ts
  src/orchestrator/types.ts
  tests/orchestrator/scribe-orchestrator.test.ts

interface OrchestratedResult {
  draft_a: { prose: string; calc_composite: number; profile: 'DRAMATURGE' };
  draft_b: { prose: string; calc_composite: number; profile: 'MUSICIEN' };
  winner: 'A' | 'B';
  winner_reason: 'CALC_CLEAR' | 'LLM_TIEBREAK' | 'FALLBACK';
  final_prose: string;
  final_score: MacroAxesScores;
  verdict: 'SEAL' | 'REJECT';
  cost: { api_calls: number };
  symbol_map: SymbolMap;  // partagé
  partition_dumps: { dramaturge: PartitionDump; musicien: PartitionDump };
  preflight_reports: { dramaturge: PreFlightReport; musicien: PreFlightReport };
}

function runOrchestratedGeneration(
  input: ForgePacketInput,
  provider: SovereignProvider,
  cdeInput?: CDEInput,
): Promise<OrchestratedResult>

Pipeline :
  1. symbolMap = generateSymbolMap(packet, provider) — UNE SEULE FOIS
  2. enrichedPacket = bridgeSignatureFromSymbolMap(packet, symbolMap)
  3. partitionA = compileWithProfile(DRAMATURGE)
  4. partitionB = compileWithProfile(MUSICIEN)
  5. preflightA = analyzePreFlight(partitionA)
  6. preflightB = analyzePreFlight(partitionB)
  7. Si DEUX RED sévères (cognitive_load > 80 chacun) → ABORT, fallback V3 standard
  8. draftA = provider.generateDraft(promptA)
  9. draftB = provider.generateDraft(promptB)
  10. calcA = scoreCALC(draftA)  // 4 axes, 0 API
  11. calcB = scoreCALC(draftB)  // 4 axes, 0 API
  12. Si |calcA - calcB| < 3.0 :
      → fullScoreA = judgeAestheticV3(draftA)
      → fullScoreB = judgeAestheticV3(draftB)
      → winner = max(fullScoreA.composite, fullScoreB.composite)
  13. Sinon : winner = argmax(calcA, calcB)
  14. finalScore = judgeAestheticV3(winner.prose) — si pas déjà fait
  15. damageGate = evaluateDamage(baseline, finalScore)
  16. Si damageGate.verdict === 'REJECT' → fallback V3 standard
  17. Return OrchestratedResult

Intégration engine.ts :
  Si OMEGA_ORCHESTRATED_MODE=1 :
    return runOrchestratedGeneration()
  Sinon : pipeline classique

CRITIQUE : l'orchestrateur passe le symbolMap aux 2 drafts.
  Modifier runSovereignForge() pour accepter un symbolMap? optionnel.
  Si fourni, NE PAS regénérer. Économie 1 appel API.

Tests avec mock provider :
  - V3 orchestré actif → 2 drafts générés
  - SymbolMap généré 1 seule fois
  - PreFlight exécuté sur les 2 partitions
  - Sélection par calc_composite
  - Fallback si double RED sévère
  - Fallback si Damage Gate rejette
  - Mode V2/V3 standard inchangé
```

### Sprint S3 : Script Bench + Dry-Run (S — 0 API pour dry-run, ~8-13 API pour bench)

```
Fichier : scripts/run-orchestrated-bench.ts
Test   : tests/orchestrator/dry-run.test.ts

DRY-RUN (0 API, dans les tests) :
  - Construire le pipeline orchestré complet avec mock provider
  - Vérifier que Partition A ≠ Partition B (hash N2 différent)
  - Vérifier que SymbolMap est partagé (même hash)
  - Vérifier que les sections v2 conservées sont identiques entre A et B
  - Vérifier que le contrat d'attention A ≠ contrat B
  - Dumper les 2 prompts complets → vérifier visuellement que le focus diffère

BENCH (API, à lancer manuellement) :
  Protocole :
  1. V2 baseline (2 scènes) → scores
  2. V3 standard (2 scènes) → scores (déjà connu : 89.8 moyen)
  3. V3 ORCHESTRÉ MODE SAFE (2 scènes) → scores
  4. Tableau comparatif 3 colonnes (V2, V3, ORCHESTRÉ)
  5. Fail-fast : si orchestré scene 0 < 80 → abort
  6. Damage Gate WARN
  7. Dumps : partitions A+B, SymbolMap, prompts, scores détaillés
  8. Verdict automatique

  Seed fixe, même modèle, même température V2/V3/orchestré.

  Bench ID unique : BENCH_ORCH_V2V3_YYYYMMDD_HHMM

  Sous-scores détaillés obligatoires :
  tension_14d, emotion_coherence, interiority, impact,
  physics_compliance, temporal_pacing, rhythm, signature,
  hook_presence, euphony_basic, voice_conformity, anti_cliche,
  necessity, metaphor_novelty, sensory_richness, corporeal_anchoring,
  focalisation, attention_sustain, fatigue_management

  Critères de victoire (définis AVANT le run) :

  VICTOIRE FRANCHE :
  - Composite orchestré moyen > V3 standard (89.8)
  - min_axis ≥ 82.0 (pas de plancher catastrophique)
  - AUCUN axe < 78 (le plancher des vases communicants est repoussé)
  - delta S0→S1 ≤ -2 pts (fatigue maîtrisée)
  - Au moins 1 des 2 drafts focalisés bat le V3 standard sur son axe cible

  VICTOIRE PARTIELLE :
  - Meilleur draft focalisé > V3 standard en composite
  - Sans régression > 3 pts sur aucun axe

  ÉCHEC :
  - Composite ≤ V3 standard
  - OU régression > 5 pts sur un axe
  - OU les 2 drafts sont quasi-identiques (différenciation échouée)
```

---

## INVARIANTS COMPLETS (12)

| ID | Description | Sprint |
|----|-------------|--------|
| INV-PROF-01 | 2 partitions valides | S1 |
| INV-PROF-02 | Hash N2 différent entre profils | S1 |
| INV-PROF-03 | Hash N1 identique entre profils | S1 |
| INV-PROF-04 | Hash N3 identique entre profils | S1 |
| INV-PROF-05 | Chaque profil a un floor sur l'axe secondaire | S1 |
| INV-ORCH-01 | Mode orchestré activé par flag OMEGA_ORCHESTRATED_MODE=1 | S2 |
| INV-ORCH-02 | PreFlight exécuté sur les 2 partitions avant API | S2 |
| INV-ORCH-03 | Double RED sévère → ABORT (fallback V3 standard) | S2 |
| INV-ORCH-04 | SymbolMap généré 1 SEULE FOIS, partagé entre les 2 drafts | S2 |
| INV-ORCH-05 | Damage Gate après score final (fallback si REJECT) | S2 |
| INV-ORCH-06 | Mode orchestré REMPLACE le duel-engine (pas d'ajout) | S2 |
| INV-ORCH-07 | Dry-run obligatoire avec mock avant tout bench API | S3 |

---

## FALLBACK LADDER (5 niveaux)

```
NIVEAU 1 : Orchestré SAFE (meilleur draft focalisé entier)
    ↓ si échec (Damage Gate REJECT ou double RED)
NIVEAU 2 : V3 standard (partition unique)
    ↓ si échec
NIVEAU 3 : V3 standard sans CDE (one-shot)
    ↓ si échec
NIVEAU 4 : V2 classique (pipeline linéaire)
    ↓ si échec
NIVEAU 5 : Draft brut sans polish
```

Chaque niveau est atteint AUTOMATIQUEMENT si le précédent échoue.
L'orchestrateur ne crash JAMAIS — il descend l'échelle.

---

## FEUILLE DE ROUTE COMPLÈTE (SAFE → CROSS)

```
╔══════════════════════════════════════════════════════════════════════════╗
║  v3.1.0 — MODE SAFE (ce qu'on implémente maintenant)                   ║
║                                                                          ║
║  S1 : Profils de partition (2 profils)              — 0 API             ║
║  S2 : Orchestrateur SAFE (sélection draft entier)   — 0 API             ║
║  S3 : Dry-run + Bench orchestré                     — ~8-13 API         ║
║                                                                          ║
║  Sessions : 2 (S1+S2 en une session, S3 la suivante)                    ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  v3.2.0 — MODE CROSS (après validation SAFE)                            ║
║                                                                          ║
║  Conditions d'entrée :                                                   ║
║  • SAFE prouve que les 2 drafts sont différenciés                       ║
║  • Les 2 drafts suivent la même chronologie (beats alignés)             ║
║  • Le paradigme multi-draft bat le mono-draft                           ║
║                                                                          ║
║  S4 : Beat-aligned splitter (découpe par ForgeBeat, pas par %)         ║
║  S5 : Assembleur par beat + Continuity Check LLM (1 appel API)         ║
║  S6 : Seam-polish micro-chirurgical (phrase par phrase, pas texte)      ║
║       → Gemini : extraire 2 phrases adjacentes, demander 1 phrase      ║
║         de transition, OMEGA insère. Contrôle déterministe.             ║
║  S7 : Bench CROSS vs SAFE vs V3 vs V2                                  ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  v3.3.0+ — ÉVOLUTIONS FUTURES                                           ║
║                                                                          ║
║  • Feedback loop (scores passés → ajustement profils)                   ║
║  • 3ème profil si nécessaire (Le Poète, focus SII)                      ║
║  • Multi-LLM (Claude draft + Gemini critique)                           ║
║  • Proxy Calibration Harness (corrélation scores locaux vs finaux)      ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## RÉPONSE POINT PAR POINT AUX AUDITS

### ChatGPT — 7 ajouts demandés

| Ajout | Réponse |
|-------|---------|
| Beat Lattice commun | EXISTE DÉJÀ (ForgePacket.beats). Partagé car même ForgePacket. |
| Recherche globale 16 combinaisons | REPORTÉ à v3.2.0 (mode CROSS). En mode SAFE, pas d'assemblage. |
| Voice Core immuable | EXISTE DÉJÀ (StyleProfile.voice + tone). Partagé car même ForgePacket. |
| Proxy Calibration Harness | REPORTÉ à v3.3.0. En mode SAFE, le proxy sert juste à départager, pas à assembler. |
| No-Run Rule si double RED sévère | INTÉGRÉ (INV-ORCH-03). |
| Fallback Ladder | INTÉGRÉ (5 niveaux). |
| Audit artifact complet | INTÉGRÉ dans S3 (dumps partitions, prompts, scores, SymbolMap). |

### Gemini — 4 piliers demandés

| Pilier | Réponse |
|--------|---------|
| Micro-Scorer LLM tension_14d par quartile | REPORTÉ à v3.2.0. En mode SAFE, pas d'assemblage par quartile. |
| Balises sémantiques [BEAT_X] | REPORTÉ à v3.2.0. Les beats sont dans le ForgePacket. En v3.2.0, on demandera au LLM d'insérer des marqueurs. |
| Voix de base verrouillée dans les 2 profils | INTÉGRÉ. Même StyleProfile, même N1, même N3. Contrats reformulés ("secondaire PAS absent"). |
| Seam-polish micro-chirurgical (2 phrases → 1 transition) | INTÉGRÉ dans la roadmap v3.2.0 S6. En mode SAFE, pas de seam-polish. |

### Mon auto-audit — 12 failles

| Faille | Réponse |
|--------|---------|
| 1.1 Continuity Check naïf | ÉLIMINÉ. Mode SAFE = pas d'assemblage croisé. |
| 1.2 Quand utiliser quel mode | DÉFINI. Chaque scène orchestrée indépendamment. |
| 1.3 Assembleur aveugle SII/IFI | ÉLIMINÉ. Mode SAFE = pas d'assemblage. |
| 2.1 calc_composite biaisé RCI | CORRIGÉ. emotion_coherence ajouté (0.30). |
| 2.2 4 quartiles arbitraire | REPORTÉ à v3.2.0. |
| 2.3 Coût API sous-estimé | CORRIGÉ. Tableau honnête (8-13 appels). |
| 3.1 Chronologie divergente | ÉLIMINÉ. Mode SAFE = draft entier. |
| 3.2 Contrat mensonger "rythme corrigé après" | CORRIGÉ. "Secondaire pas absent". |
| 4.1 Pas de dry-run texte réel | INTÉGRÉ (S3, fixtures des bench précédents). |
| 4.2 SymbolMap généré 2× | CORRIGÉ. INV-ORCH-04. |
| 4.3 Scoring fallback coûteux | CORRIGÉ. CALC d'abord, LLM si écart < 3. |
| 5.2 Seam-polish insuffisant | REPORTÉ. Mode SAFE = pas de seam. |

---

## CE QUI N'EST PAS DANS CE PLAN (intentionnellement)

❌ Assemblage croisé par quartile (v3.2.0)
❌ Seam-polish (v3.2.0)
❌ 3ème profil (v3.3.0)
❌ Multi-LLM (v3.3.0)
❌ Feedback loop (v3.3.0)
❌ Proxy Calibration (v3.3.0)
❌ Beat-aligned splitter (v3.2.0)
❌ Continuity Check LLM (v3.2.0)

TOUT ce qui touche à l'assemblage croisé est REPORTÉ.
Le mode SAFE prouve le PARADIGME (2 drafts focalisés > 1 draft généraliste).
L'assemblage est le BONUS qui viendra après.

---

**FIN DU PLAN DÉFINITIF — SCRIBE ORCHESTRÉ v3.0**
*4 audits hostiles fusionnés — zéro faille non traitée*
*Tous les modules existants réutilisés — zéro duplication*
*Autorité finale : Francky (Architecte Suprême)*
