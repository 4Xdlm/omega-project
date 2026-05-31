# OMEGA — Audit comparatif de capacité E2E des deux moteurs (2026-05-31)

**Auteur** : Claude Code · **Mode** : read-only · **HEAD** : `085ac33e` · **Support** : NCR-DUAL-ENGINE + forensique genèse.
**But** : donner à l'Architecte une décision 1/2/3 sur **preuve de capacité**, pas sur intention. Répond aux 5 questions.

---

## 1. Réponses aux 5 questions
- **Q1 — Qui appelle l'utilisateur ?** Le bin produit `@omega/omega-runner` importe `@omega/creation-pipeline` + `@omega/scribe-engine`. **Jamais `@omega/sovereign-engine`.** → côté produit câblé, **ScribeEngine-P2A** est invoqué.
- **Q2 — Quel pipeline produit le texte final aujourd'hui ?** `omega-runner → creation-pipeline (runCreation/IntentPack) → runScribe`. Génération = `weave` (règle déterministe) par défaut, ou `weaveLLM` (via CLI scribe-llm + provider). → **ScribeEngine-P2A**, granularité **livre/IntentPack**.
- **Q3 — Tests prouvant SovereignEngine en génération COMPLÈTE ?** E2E existant `tests/e2e/sovereign-pipeline.test.ts` = **niveau SCÈNE** (`ForgePacket → DeltaComputer → SovereignLoop → TriplePitch → PitchOracle`), **OFFLINE sur mock-prose** (PROSE_GOOD/BAD/FLAT) pour scorer/looper. `executePipeline(packet: ForgePacket, provider)` prend **1 ForgePacket (scène)**, pas un plan-livre. La génération LLM réelle est exercée par **scripts bench** (book-gen prouvé : livre 10 ch ~21926w composite 87.8 via qwen3:32b). → SovereignEngine **génère de la vraie prose de qualité prouvée, mais au niveau SCÈNE + via scripts**, pas via une API packagée orchestrant un livre.
- **Q4 — Tests prouvant ScribeEngine-P2A en production ?** `creation-pipeline/tests/engine.test.ts` + `integration.test.ts` = niveau **orchestration** : `runCreation(IntentPack)` → assertions sur **pipeline_id / output_hash / intent_hash** (structurel/déterministe). **La qualité littéraire n'est PAS assertée** (pas de seuil esthétique). → câblé + E2E structurel, mais **qualité non prouvée**.
- **Q5 — SSOT unique ?** **NON.** `ENGINE_STATUS.md` (runtime) ET 4 versions du Codex (`v1-1/1-2/1-3/1-3-1`, doctrine) se déclarent toutes « autorité ». Gap de gouvernance : pas de hiérarchie SSOT explicite.

## 2. Matrice de capacité
| Critère | SovereignEngine | ScribeEngine-P2A + CreationPipeline |
|---|---|---|
| Input | **ForgePacket** (scène + contrat émotionnel) | **IntentPack** (création complète) |
| Granularité native | scène (forge+score) | livre/création (orchestration) |
| Orchestration livre | **dans des scripts bench/skills**, pas dans le package | **dans le package** (creation-pipeline, 8 gates, evidence) |
| Génération | K2 (PF+Duras) + Duel + SovereignLoop + Dédale | weave (règle) / weaveLLM (LLM via CLI) |
| **Qualité littéraire prouvée** | **OUI** (book-gen réel, composite 87.8, S-Oracle V2/R6) | **NON** (tests = hash/structure, pas de seuil esthétique) |
| Scoring esthétique | **S-Oracle V2 (5 macro-axes) + R6** | 6 oracles structurels CALC (pas esthétique global) |
| Câblé produit (bin) | **NON** (0 import ; bench/scripts only) | **OUI** (omega-runner) |
| Test E2E packagé | scène, offline mock-prose | orchestration, déterministe |
| Déterminisme | oui (seeds) ; gen réelle via provider | oui (weave) |

## 3. Constat décisif
**Ni l'un ni l'autre n'est un drop-in replacement de l'autre** — ils opèrent à des **granularités et entrées différentes** (ForgePacket scène vs IntentPack livre).
- La **qualité littéraire prouvée** vit dans **SovereignEngine** (book-gen réel + S-Oracle V2 + R6).
- L'**orchestration livre + evidence pack + câblage produit** vit dans **CreationPipeline + ScribeEngine-P2A** (mais avec une génération plus faible/non prouvée).
- **Personne n'a câblé les deux** : le seul orchestrateur livre packagé (creation-pipeline) utilise le générateur faible (scribe), tandis que le générateur de qualité (sovereign) n'a d'orchestration livre que dans des scripts.

## 4. Relecture des options 1/2/3 à la lumière de la capacité
- **Option 1 (Sovereign canonique, archiver scribe)** : exige de **construire/extraire l'orchestration livre** de sovereign (aujourd'hui dans des scripts) + un adaptateur `IntentPack/Scene → ForgePacket`. Gros chantier, mais met la qualité prouvée en production.
- **Option B/DEC-007 (creation-pipeline orchestre, délègue la génération+scoring scène à sovereign)** : creation-pipeline garde l'orchestration + evidence, mais remplace `runScribe` par un appel à `executePipeline(ForgePacket)` par scène. **Pré-requis = adaptateur `Scene → ForgePacket`** (le point dur déjà identifié DEC-008). C'est la voie la plus alignée avec les capacités réelles (chacun fait ce qu'il sait faire).
- **Option 2 (Scribe-P2A canonique)** : garde le câblage actuel, déclasse sovereign → **abandonne la seule qualité littéraire prouvée**. Contredit ENGINE_STATUS.
- **Option A (statu quo)** : laisse la qualité hors prod indéfiniment.

## 5. Recommandation (pour arbitrage Architecte — NON décision)
L'évidence de capacité pointe vers un **hybride Option B affiné** : **CreationPipeline = chef d'orchestre** (IntentPack → plan → evidence), **SovereignEngine = forge+juge par scène** (ForgePacket → K2 + S-Oracle V2 + R6), via un **adaptateur `Scene → ForgePacket`**. ScribeEngine-P2A n'est PAS archivé d'emblée (son orchestration + gates structurels ont de la valeur de transition), mais sa génération est remplacée par sovereign. Cela évite (1) de jeter la qualité prouvée (vs Option 2), (2) de reconstruire une orchestration livre dans sovereign (vs Option 1 pur), (3) le statu quo (Option A). **Gros chantier, ADR de câblage + adaptateur + bench avant/après obligatoires.** Décision finale = Architecte.

## VERDICT
- Statut : **PASS** (audit de capacité livré, 5 questions répondues sur preuve).
- Confiance : Haute sur les faits (entrées, tests, câblage) ; Moyenne sur la reco (le gain réel d'un câblage reste à benchmarker).
- Forces : distingue granularité (scène vs livre) ; prouve que la qualité est dans sovereign, l'orchestration dans creation-pipeline ; montre qu'aucun n'est drop-in ; recadre 1/2/3 sur capacité.
- Faiblesses : (1) la qualité de ScribeEngine-P2A n'a pas été benchmarkée ici (absence de test esthétique = absence de preuve, pas preuve d'absence) ; (2) l'effort d'extraction d'orchestration / adaptateur n'est pas chiffré.
- Action requise : **décision Architecte 1/2/3**. Si hybride B : ADR de câblage + adaptateur `Scene→ForgePacket` + bench comparatif. Aucun code avant. DEC-007/008 restent gelés jusqu'à cette décision.
