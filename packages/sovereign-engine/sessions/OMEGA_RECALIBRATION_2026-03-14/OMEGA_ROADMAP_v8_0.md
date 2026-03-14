# OMEGA — ROADMAP GÉNÉRALE v8.0
## État Complet + Phase Recalibration + Suite Détaillée

**Version : 8.0 — 2026-03-14
**Autorité** : Francky (Architecte Suprême)
**Statut** : 📋 PROPOSÉ — Soumis au contrôle final 3 IAs avant validation
**Standard** : NASA-Grade L4 / DO-178C

---

## PRÉAMBULE — CONTEXTE DE CETTE ROADMAP

Cette roadmap est produite après l'arrêt d'urgence du 2026-03-14 qui a identifié une dérive architecturale : les 3 IAs avaient progressivement reconstruit des fonctions OMEGA à l'intérieur du module Scribe. La roadmap intègre la phase de remise en état avant de reprendre la progression normale.

**Documents de référence produits le 2026-03-14 :**
- `OMEGA_CONCEPTION_PLAN_v1.0` — architecture complète
- `CONTRAT_OMEGA_SCRIBE_v1.0` — frontière OMEGA/Scribe
- `OMEGA_DRIFT_REPORT_v1.0` — rapport de dérive officiel
- `CONTRAT_TRAVAIL_OMEGA_v1.0` — rôles et gouvernance
- `OMEGA_SESSION_RESTART_v1.0` — template redémarrage
- `RAPPORT_SCAN_ARCHITECTURAL.md` — scan 194 fichiers

---

## PARTIE I — ÉTAT GLOBAL DU PROJET (2026-03-14)

```
╔══════════════════════════════════════════════════════════════════════════╗
║  OMEGA PROJECT — ÉTAT AU 2026-03-14                                      ║
║                                                                          ║
║  Branch active       : phase-u-transcendence                             ║
║  Commit actif        : f2a801ae (V-BENCH fix)                            ║
║  Tests               : 1564 / 1564 — 0 failures                         ║
║                                                                          ║
║  Phases SEALED       : 33+ (BUILD A, GOV, PR, Phase S, Phase U)         ║
║  Phase U             : 🔒 SEALED — SAGA_READY + SEAL_ATOMIC certifiés   ║
║  Phase V             : ⚠️  V-INIT + V-PROTO VALIDES, V-BENCH OK          ║
║                         DÉRIVE IDENTIFIÉE — RECALIBRATION REQUISE        ║
║                                                                          ║
║  Score max one-shot  : 92.51 (OS26)                                      ║
║  Score max top-K     : 92.91 (TK0)                                       ║
║  SEAL_ATOMIC (≥93)   : 0/60 runs                                         ║
║  SAGA_READY (≥92+85) : ≥5/60 runs (~8%)                                 ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## PARTIE II — PHASES SEALED (HISTORIQUE)

### BUILD A — Infrastructure de base
| Phase | Tests | Status |
|-------|-------|--------|
| Phase 0 (Foundation) | — | 🔒 SEALED |
| Phase A-INFRA | — | 🔒 SEALED |
| Phase B-FORGE | — | 🔒 SEALED |
| Phase C+CD | — | 🔒 SEALED |
| Phase D (Memory) | — | 🔒 SEALED |
| Phase E (Canon Kernel) | — | 🔒 SEALED |
| Phase G-J-K-L-M | — | 🔒 SEALED |
| **Total BUILD A** | **~971** | 🔒 |

### Industrial Hardening
| Phase | Tests | Status |
|-------|-------|--------|
| Phase 27 (Sentinel Self-Seal) | 927 | 🔒 SEALED |
| Phase 28+28.5 (Genome) | 109 | 🔒 SEALED |
| Phase 29.0-29.2 (Mycelium) | 97 | 🔒 SEALED |
| **Total Hardening** | **1133** | 🔒 |

### Governance B + Plugins + Q + PR
| Bloc | Tests | Status |
|------|-------|--------|
| Governance D→J | 877+ | 🔒 SEALED |
| Plugin Gateway + SDK | 230 | ✅ PROVEN |
| Trust v1.0 | 4791 | 🔒 SEALED |
| Phase Q | — | 🔒 SEALED |
| Phase PR L5 | 339 | 🔒 SEALED |

### Phase S — Sovereign Style Engine
| Sprint | Tests | Status |
|--------|-------|--------|
| S0-A → S3 (complet) | ~800 | 🔒 SEALED |

### Phase U — Transcendance U-ROSETTE-01 à 18
| Sprint | Commit | Tests | Status |
|--------|--------|-------|--------|
| U-ROSETTE-01 à 16 | ... | 1515 | 🔒 SEALED |
| U-ROSETTE-17 | f137f235 | 1515 | 🔒 SEALED |
| **U-ROSETTE-18** | **bbd448d2** | **1520** | **🔒 SEALED** |
| SESSION_SAVE | 8e8dc39f | 1520 | 🔒 |

### Phase V — CDE (partiellement valide)
| Sprint | Commit | Tests | Status |
|--------|--------|-------|--------|
| V-INIT (distillBrief + extractDelta) | bd7a4a9f | 1543 | ✅ VALIDE |
| V-PROTO (pipeline + scene-chain) | d4be8c03 | 1564 | ✅ VALIDE (brief à recadrer) |
| V-BENCH (bench 2 scènes) | f2a801ae | 1564 | ✅ VALIDE (diagnostic: brief trop juridique) |
| **V-RECALIBRATION** | — | — | **🔄 EN COURS** |

---

## PARTIE III — PHASE DE REMISE EN ÉTAT (RECALIBRATION)

### Contexte
Le scan architectural (194 fichiers, 2026-03-14) a identifié 2 contaminations confirmées et plusieurs modules mal placés. La phase de remise en état précède la reprise de Phase V.

### MATRICE DE CONSERVATION FONCTIONNELLE
*(Contrôle que le nettoyage ne casse pas les fonctions critiques d'OMEGA)*

| Fonction OMEGA critique | Packages concernés | Touché par CLEAN ? | Verdict |
|-------------------------|-------------------|-------------------|---------|
| Analyse de roman / style | `omega-autopsie/` (Python) | ❌ NON | ✅ PRÉSERVÉ |
| Extraction ADN stylistique | `packages/genome/`, `omega-narrative-genome/` | ❌ NON | ✅ PRÉSERVÉ |
| Carte Mycelium / ADN | `packages/mycelium/`, `omega-aggregate-dna/` | ❌ NON | ✅ PRÉSERVÉ |
| Tables personnages / lore | `packages/genome/`, `gateway/memory/` | ❌ NON | ✅ PRÉSERVÉ |
| World Model / mémoire | `gateway/src/memory/memory_layer_nasa/` | ❌ NON | ✅ PRÉSERVÉ |
| Pipeline création auteur | `gateway/src/creation/creation_layer_nasa/` | ❌ NON | ✅ PRÉSERVÉ |
| Continuité longue portée | `continuity-plan.ts` → déplacé Phase V | Déplacé, pas détruit | ✅ PRÉSERVÉ (relogé) |
| Scribe-engine alternatif | `packages/scribe-engine/` | ❌ NON | ✅ PRÉSERVÉ |
| Scoring prose (S-Oracle) | `src/oracle/` dans sovereign-engine | ❌ NON | ✅ PRÉSERVÉ |
| Polish Engine | `src/validation/phase-u/polish-engine.ts` | ❌ NON | ✅ PRÉSERVÉ |

**Conclusion du contrôle de conformité :** CLEAN-1/2/3 opèrent exclusivement dans `packages/sovereign-engine/` et ne touchent aucun des packages d'analyse, ADN, mémoire, ou assistance auteur. La donnée `open_threads` reste dans le ForgePacket — seule son injection brute dans le prompt Scribe est retirée.

---

### Sprint CLEAN-0 — Décisions architecturales (en cours)

**Décisions Q1 à Q6 à arrêter par Francky avant tout code :**

| # | Question | Option A | Option B | Recommandation 3 IAs |
|---|----------|----------|----------|----------------------|
| Q1 | Open Threads dans prompt Scribe | Supprimer entièrement | Reformuler en tension dramatique (1 phrase) | A (Gemini+Claude) / B acceptable (ChatGPT) |
| Q2 | `e1-multi-prompt-runner.ts` | Archiver dans `ARCHIVE/` | Quarantaine marquée EXPERIMENTAL | A (Gemini+Claude) — jamais actif en prod |
| Q3 | `oracle/genesis-v2/` | Quarantaine documentaire | Déplacer dans package séparé | A unanime |
| Q4 | `validation/continuity-plan.ts` | Déplacer vers `ARCHIVE/phase-v-incoming/` | Laisser avec tag PHASE_V | A unanime — embryon Phase V |
| Q5 | SceneBrief contenu | Garder structure, reformater contenu en dramatique | Restructuration complète | A unanime |
| Q6 | Test INV-PROMPT-01 | Test unitaire strict obligatoire | Documentation seule | A unanime — invariant contractuel |

---

### Sprint CLEAN-1 — Purge contamination

**Prérequis :** décisions Q1 à Q6 validées par Francky.

| Action | Fichier | Risque | Tests impactés |
|--------|---------|--------|----------------|
| Retirer/reformater section Open Threads | `prompt-assembler-v2.ts` | Nul | Tests prompt à mettre à jour |
| Archiver module | `e1-multi-prompt-runner.ts` | Nul (double flag env) | Tests e1-multi-prompt archivés |
| Mettre à jour import | `real-llm-provider.ts` | Mineur | — |
| Archiver embryon Phase V | `continuity-plan.ts` | Nul | Tests continuity archivés |
| Ajouter `INV-PROMPT-01` | nouveau test | Positif | +N tests de protection |
| Ajouter `ADR_OMEGA_SCRIBE_RECALIBRATION.md` | doc | — | — |

**Résultat attendu :** 1564+ tests, 0 régression sur Phase U.

---

### Sprint CLEAN-2 — Consolidation SSOT

| Action | Fichier cible | Élimine |
|--------|--------------|---------|
| Créer `src/core/thresholds.ts` | nouveau | DOUBLON-04 × 3 emplacements |
| Centraliser `computeMinAxis()` | `src/utils/math-utils.ts` | DOUBLON-03 × 3 emplacements |
| Centraliser `estimateTokens()` | `src/utils/token-utils.ts` | DOUBLON-01 × 3 emplacements |
| Documenter `s-score.ts` legacy | JSDoc update | SUSPECT-03 |
| Documenter `genesis-v2/` quarantaine | README ajouté | SUSPECT-02 |
| Documenter `pipeline/` outil bench | JSDoc update | Clarté |

**Résultat attendu :** tests stables, 0 régression, repo consolidé.

---

### Commit de clôture Recalibration

```
refactor(recalibration): CLEAN-1+2 — purge contamination OMEGA/Scribe + SSOT [INV-PROMPT-01]
tag : v-recal-complete
```

---

## PARTIE IV — PHASE V SUITE (POST-RECALIBRATION)

### V-RECAL-1 — Reformatage SceneBrief

**Objectif :** le brief transmis au Scribe doit passer le test "metteur en scène de théâtre".

| Action | Détail |
|--------|--------|
| Reformater contenu `distillBrief()` | Supprimer `DEBT[id]:`, IDs système, langage backend |
| Format dramatique obligatoire | `must_remain_true` → tension permanente ; `in_tension` → friction active ; `must_move` → mouvement dramatique ; `must_not_break` → ce qui ne peut pas se résoudre |
| Purger `open_debts` du brief propagé | `scene-chain.ts` : propager la tension, pas les IDs |
| Test de non-contamination | brief ne contient pas : `DEBT[`, `open_debts`, IDs système |
| Relancer V-BENCH | Mesure impact composites (attendu : retour vers 91-92) |

**Succès :** composites V-BENCH ≥ 91.0, brief pur validé par INV-CDE-01/02/06.

---

### V-WORLD-1 — World Model minimal (Persona Store + Debt Ledger)

**Objectif :** OMEGA porte la mémoire narrative, pas le Scribe.

| Module | Fonction | Entrée | Sortie |
|--------|----------|--------|--------|
| `PersonaStore` | Psychologie + état des personnages | StateDelta certifié | PersonaProfile[] persistant |
| `DebtLedger` | Dettes narratives ouvertes/résolues | StateDelta certifié | DebtEntry[] updaté |
| `ArcTracker` | Position de chaque personnage dans son arc | StateDelta certifié | ArcState[] updaté |

**Invariants :**
- `INV-WM-01` : PersonaStore est immutable en lecture pendant la génération Scribe
- `INV-WM-02` : DebtLedger est mis à jour uniquement après SEAL_ATOMIC ou SAGA_READY
- `INV-WM-03` : ArcTracker ne peut pas être consulté pendant le prompt Scribe

---

### V-WORLD-2 — Relevance Filter

**Objectif :** OMEGA sélectionne les hot elements depuis le World Model — jamais le Scribe.

| Module | Fonction | Sortie |
|--------|----------|--------|
| `RelevanceFilter` | Sélectionner max 10 éléments pertinents pour la scène | HotElement[] triés par priorité |

**Règle :** les hot_elements sélectionnés sont transformés par `distillBrief()` en langage dramatique avant injection.

---

### V-CANON-1 — Canon Lock Gate

**Objectif :** OMEGA rejette post-génération toute prose qui viole un fait canonique.

| Module | Fonction | Entrée | Sortie |
|--------|----------|--------|--------|
| `CanonLockGate` | REJECT si StateDelta viole CanonFact | StateDelta + CanonFacts | PASS / REJECT + raison |

**Invariant :**
- `INV-CANON-01` : CanonLockGate est toujours post-génération — jamais dans le prompt Scribe
- `INV-CANON-02` : REJECT canon = log obligatoire + pas de polish — regénération uniquement

---

### V-CHAIN-1 — Multi-scènes recalibré

**Objectif :** valider que le chaînage 2-3 scènes avec brief dramatique produit des composites ≥ 91.

| Action | Mesure |
|--------|--------|
| Relancer `run-cde-bench.ts` après V-RECAL-1 | Composites scène 0 vs 1 |
| Vérifier propagation delta | Hashes différents, arcs propagés |
| Vérifier CanonLockGate | 0 violation canonique sur 2 scènes |

**Critère de succès Phase V :** composite moyen ≥ 91.5 sur 2 scènes chaînées, SAGA_READY ≥ 1/2.

---

## PARTIE V — PHASE W ET SUIVANTES (SPÉCIFICATION PRÉLIMINAIRE)

### Phase W — Fractal Judge

**Objectif :** OMEGA évalue non plus une scène isolée mais la cohérence d'un ensemble de scènes.

| Module | Rôle |
|--------|------|
| `SceneJudge` | Score qualité scène isolée (Phase U — existant) |
| `TransitionJudge` | Score qualité de la transition entre scène i et i+1 |
| `ArcJudge` | Score cohérence de l'arc sur 3-5 scènes |
| `FractalAggregator` | Score composite "roman" = moyenne pondérée des 3 juges |

**Prérequis :** Phase V complète (World Model + Canon Lock + multi-scènes).

---

### Phase X — Showrunner Engine

**Objectif :** OMEGA pilote la production d'un roman/saga de bout en bout.

| Module | Rôle |
|--------|------|
| `ShowrunnerEngine` | Orchestration N scènes → roman complet |
| `WritersRoomVirtuel` | Planification des arcs sur l'œuvre entière |
| `BibleBuilder` | Construction et maintenance de la bible canonique |

**Prérequis :** Phase W complète.

---

### Phase VALIDATION — 3 Expériences ultimes

| Expérience | Objectif |
|-----------|---------|
| E1 — Continuité impossible | 300k mots, cohérence totale sans erreur canonique |
| E2 — Texte non-classifiable | Prose indétectable comme IA ou humaine |
| E3 — Nécessité absolue | Chaque mot est indispensable |

---

### Phase INTERFACE — UI Auteur

Interface permettant à l'auteur de :
- Définir le canon et les lois du monde
- Consulter la carte Mycelium de son style
- Piloter la génération scène par scène
- Valider ou rejeter les propositions OMEGA

---

## PARTIE VI — PACKAGES NON COUVERTS PAR LE SCAN (DÉCOUVERTE 2026-03-14)

*Ces packages existent dans le repo mais n'ont pas été couverts par le scan architectural du sovereign-engine. Ils ne sont pas touchés par les décisions CLEAN-1/2/3. Ils sont listés ici pour que les 3 IAs en aient connaissance pour la suite.*

| Package | Rôle | Lien Phase V |
|---------|------|--------------|
| `omega-autopsie/full_work_analyzer_v4.py` | Analyse corpus 150+ œuvres, F1-F30 features | Source de calibration des styles |
| `packages/genome/` | Extraction ADN narratif (EmotionAxis, StyleAxis) | Voice Genome Phase V |
| `omega-narrative-genome/` | Fingerprint avancé œuvres narratives | Voice Genome Phase V |
| `packages/mycelium/` | Carte Mycelium — structure narrative | Outil d'analyse pré-génération |
| `omega-aggregate-dna/` | Merkle ADN narratif, agrégation | Certification style |
| `packages/omega-bridge-ta-mycelium/` | Bridge analyse ↔ mycelium | Interface modules |
| `gateway/src/memory/memory_layer_nasa/` | Memory engine : store, tiering, decay, query | **Fondation du World Model Phase V** |
| `gateway/src/creation/creation_layer_nasa/` | Creation engine, template registry | **Fondation de l'assistance auteur** |
| `packages/scribe-engine/` | Moteur d'écriture alternatif (weaver, segmenter) | À évaluer vs sovereign-engine |
| `packages/creation-pipeline/` | Pipeline création avec gates, evidence | À évaluer vs sovereign-engine |
| `packages/mod-narrative/` | Adaptateur emotion v2 | À connecter avec CDE |

**Points d'attention pour les 3 IAs :**

1. `gateway/src/memory/memory_layer_nasa/` est une implémentation complète de mémoire avec tiering, decay, query, snapshot. C'est exactement ce dont Phase V (World Model) a besoin. **Avant de construire le World Model from scratch, vérifier si ce package peut être réutilisé.**

2. `omega-autopsie/full_work_analyzer_v4.py` analyse déjà 30 features stylistiques (F1-F30) sur un corpus de 150+ œuvres. Cette analyse est la source de calibration pour le Voice Genome. **Phase V Voice Genome doit consommer ces résultats, pas les recalculer.**

3. `packages/genome/` extrait déjà EmotionAxis, StyleAxis, StructureAxis, TempoAxis. C'est le substrat du Voice Genome. **Phase V ne doit pas le dupliquer.**

---

## PARTIE VII — TABLEAU DE BORD DÉCISIONS ARCHITECTURALES

### Décisions GRAVÉES (immuables)
| Décision | Date | Source |
|----------|------|--------|
| SEAL_ATOMIC ≥ 93.0 + min_axis ≥ 85 | 2026-03-13 | U-ROSETTE-18 |
| SAGA_READY ≥ 92.0 + min_axis ≥ 85 | 2026-03-13 | U-ROSETTE-18 |
| SceneBrief ≤ 150 tokens (INV-CDE-01) | 2026-03-13 | V-INIT |
| Scribe = artiste aveugle (génère seulement) | 2026-03-14 | CONTRAT_OMEGA_SCRIBE |
| OMEGA = gardien vérité (vérifie tout) | 2026-03-14 | CONTRAT_OMEGA_SCRIBE |
| Aucun ID système dans prompt Scribe | 2026-03-14 | DRIFT_REPORT |
| Vérification canonique = post-génération OMEGA | 2026-03-14 | DRIFT_REPORT |

### Décisions EN ATTENTE (Francky — CLEAN-0)
| # | Question | Décision |
|---|----------|---------|
| Q1 | Open Threads dans prompt | À décider |
| Q2 | e1-multi-prompt archivage | À décider |
| Q3 | genesis-v2 quarantaine | À décider |
| Q4 | continuity-plan déplacement | À décider |
| Q5 | SceneBrief reformatage | À décider |
| Q6 | INV-PROMPT-01 test strict | À décider |

---

## PARTIE VIII — ROADMAP VISUELLE COMPLÈTE

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    PASSÉ — TOUT SEALED ✅                                ║
╠══════════════════════════════════════════════════════════════════════════╣
║  BUILD A (11 phases) ─────────────────────────────────── ~971 tests     ║
║  Industrial Hardening (4 phases) ─────────────────────── 1133 tests     ║
║  Governance B (7 phases) ─────────────────────────────── 877+ tests     ║
║  Trust v1.0 (6 phases) ────────────────────────────────── 4791 tests    ║
║  Plugins (2) ────────────────────────────────────────────── 230 tests   ║
║  Phase Q + PR L5 ────────────────────────────────────────── 339 tests   ║
║  Phase S (Sovereign Style Engine) ───────────────────────── ~800 tests  ║
║  Phase U (U-ROSETTE-01→18) ─────────────────────────────── 1520 tests  ║
╠══════════════════════════════════════════════════════════════════════════╣
║                    PRÉSENT — EN COURS                                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  V-INIT / V-PROTO / V-BENCH ─────────────────────────────── 1564 tests  ║
║  ▶ CLEAN-0 : Décisions Francky (Q1→Q6)                                  ║
║  ▶ CLEAN-1 : Purge contamination OMEGA/Scribe                           ║
║  ▶ CLEAN-2 : Consolidation SSOT (thresholds, utils)                     ║
╠══════════════════════════════════════════════════════════════════════════╣
║                    FUTUR PROCHE — PHASE V SUITE                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  V-RECAL-1 : SceneBrief dramatique + V-BENCH recalibré                  ║
║  V-WORLD-1 : PersonaStore + DebtLedger + ArcTracker                     ║
║  V-WORLD-2 : RelevanceFilter                                             ║
║  V-CANON-1 : Canon Lock Gate post-génération                             ║
║  V-CHAIN-1 : Multi-scènes recalibré + V-BENCH final                     ║
║  V-SEAL    : Certification Phase V                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                    FUTUR — PHASE W                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  W-FRACTAL : TransitionJudge + ArcJudge + FractalAggregator             ║
║  W-SEAL    : Certification Phase W                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                    FUTUR — PHASE X                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  X-SHOW    : ShowrunnerEngine + WritersRoom                              ║
║  X-BIBLE   : BibleBuilder                                                ║
║  X-SEAL    : Certification Phase X                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                    FUTUR — VALIDATION + INTERFACE                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  E1 : Continuité impossible (300k mots)                                  ║
║  E2 : Texte non-classifiable                                             ║
║  E3 : Nécessité absolue                                                  ║
║  UI : Interface Auteur                                                   ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## PARTIE IX — CHECKLIST CONTRÔLE FINAL (3 IAs)

Avant validation de cette roadmap, les 3 IAs doivent vérifier :

- [ ] La recalibration CLEAN-1/2 ne casse aucune fonction des packages externes
- [ ] Le plan Phase V est conforme au CONTRAT_OMEGA_SCRIBE_v1.0
- [ ] Chaque sprint Phase V pose la question "OMEGA ou Scribe ?" avant tout code
- [ ] Les packages `gateway/memory/` et `packages/genome/` sont évalués avant de reconstruire le World Model from scratch
- [ ] La roadmap est cohérente avec les objectifs saga 300k mots
- [ ] Les tests INV-PROMPT-01 sont obligatoires dans CLEAN-1

---

**FIN DE LA ROADMAP OMEGA v7.0**
*2026-03-14 — Proposé pour contrôle final 3 IAs*
*Autorité : Francky (Architecte Suprême)*
*Standard : NASA-Grade L4 / DO-178C*
