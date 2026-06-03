# S0 — AUDIT RUNTIME DE L'EXISTANT

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Méthode** : lecture runtime repo + workspace + API Ollama · **Statut** : COMPLET
**Doctrine** : conforme `OMEGA_ABSOLUTE_PROOF_STANDARD.md` (S-1). Aucun module stratégique supposé ; toute preuve absente = marquée evidence-gap.

---

## 1. INVENTAIRE PACKAGES — 43 (corrigé)

`packages/` contient **43 packages** (et non 38 du rapport externe, ni 45 d'estimations antérieures). Liste vérifiée :
canon-kernel, contracts-canon, creation-pipeline, decision-engine, emotion-gate, genesis-planner, genome, gold-cli, gold-internal, gold-master, gold-suite, hardening, headless-runner, hostile, integration-nexus-dep, mycelium, mycelium-bio, omega-aggregate-dna, omega-bridge-ta-mycelium, omega-forge, omega-governance, omega-metrics, omega-observability, omega-p0, omega-release, omega-runner, omega-segment-engine, orchestrator-core, performance, phase-q, plugin-gateway, plugin-sdk, proof-pack, sbom, schemas, scribe-engine, search, sentinel-judge, signal-registry, sovereign-engine, style-emergence-engine, trust-version, truth-gate.

**Action** : corriger le rapport de transmission IA externe (38 → 43).

---

## 2. AUDIT DES PACKAGES ADN / MYCÉLIUM / STYLE (OBJ4)

> Découverte majeure : **OBJ4 n'est PAS un terrain vierge**, MAIS l'écosystème ADN existant est **centré ÉMOTION 14D**, pas sur les dimensions QUALITÉ (euphony/style/voix) qu'envisageaient les tribunaux. Et le package nommé `mycelium` est un piège : ce n'est PAS la carte ADN littéraire.

| Package | Version | Rôle réel | Tests | Classification | Pertinence OBJ4 |
|---|---|---|---|---|---|
| `@omega/mycelium` | 1.0.0 | **Gardien de validation d'entrée** du pipeline DNA/Genome (gatekeeper intégrité). PAS une carte ADN littéraire. | 97/97, 12 invariants, SEAL 2026-01-09 | **FROZEN_VALID** | ❌ Hors sujet (nom trompeur). Intouchable. |
| `@omega/aggregate-dna` | 1.0.0 | Agrège des **segments DNA** → DNA global (moyenne pondérée word_count, Merkle root, Adapter). Types `MyceliumDNA`/`Fingerprint`/`Node`/`EmotionState`. | 27, 6 invariants | **ACTIVE_VALID** | ✅ Substrat d'agrégation ADN. Émotion-centric. |
| `@omega/mycelium-bio` | 1.0.0 | **Moteur d'empreinte ADN** : bio_engine, dna_builder, emotion_field, fingerprint, gematria, morpho_engine, merkle. | **2** (10 src) | **ACTIVE_UNDERTESTED** | ✅ Cœur fingerprint, mais couverture test faible (risque). |
| `@omega/bridge-ta-mycelium` | 1.0.0 | Pont **TextAnalyzer → Mycelium Bio**, 14D aligné emotion_engine. | 22, 4 invariants | **ACTIVE_VALID** | ✅ Adaptateur texte→ADN. |
| `@omega/style-emergence-engine` | 0.1.0 | Moteur d'**analyse/transformation de style** : runStyleEmergence, harmonize, generateStyleReport, EConfig, evidence chain. | 22 (21 src) | **ACTIVE_EARLY** | ✅ Le plus proche des dimensions QUALITÉ/style. v0.1.0. |

**Conséquence pour S3 (ADN v1)** : décision à trancher (Architecte) — (a) **étendre** l'ADN émotion-14D existant (aggregate-dna + mycelium-bio + bridge) avec des dimensions QUALITÉ validées, ou (b) bâtir une **DNA-qualité parallèle** s'appuyant sur style-emergence-engine. Dans les deux cas : ne PAS reconstruire l'existant émotion-14D, ne PAS toucher `mycelium` (FROZEN).

---

## 3. CORPUS DE RÉFÉRENCE (matière première S1)

- **Localisation réelle** : `omega-autopsie/corpus_r/txt/` = **881 livres .txt** (et non « corpus_r/ » à la racine ; correction d'une imprécision de session).
- **Labels disponibles** : `CORPUS_TIERS_V3.json`, `CORPUS_INVENTORY.json`, `FULL_CORPUS_MANIFEST.json` (tiers/familles).
- **Features pré-calculées** : `CORPUS_FEATURES_MASTER.json` (1.5 MB), `CORPUS_DEPTH_FEATURES.json`, `SENSOR_CORPUS_RESULTS_V2.json`.
- **Composition** (échantillon) : maîtres domaine public (Zola, Trollope, Christie…), commercial/genre, multi-langue (FR ~162+, EN ~355+, ES présent — comptage exact à faire via CORPUS_TIERS_V3).
- **Statut** : **EXPLOITABLE** pour constituer le Gold-Set S1 (familles + langues + tiers déjà étiquetés). Split par auteur réalisable.

---

## 4. MODÈLES OLLAMA LOCAUX (faisabilité pivot + anti-circularité)

API `localhost:11434/api/tags` (Windows-side) :

| Modèle | Taille | Rôle dans le plan |
|---|---|---|
| `nomic-embed-text:latest` | 0.3 GB | **Embedding** → pivot géométrique S1 FAISABLE localement. ⚠️ nomic = EN-centré ; qualité FR = la question ouverte de S1. Alternative FR (`bge-m3`, `e5-multilingual`) à puller si nomic sous-performe en FR. |
| `qwen3:32b` | 18.8 GB | Générateur + juge actuel. |
| `gemma4:31b` | 18.5 GB | **Second modèle ≠ qwen3** → juge INDÉPENDANT pour briser la circularité (S2). DISPONIBLE. |

**Conséquence** : les deux verrous du plan (pivot embedding S1, anti-circularité S2) sont **techniquement débloqués localement**. Reste à valider empiriquement (nomic-FR ; accord gemma/qwen).

---

## 5. ARTEFACTS M0b V3.4 (ρ=0.6138) — voir registre dédié

Synthèse : coefficients **câblés** (`coefficients-v3-4.ts`), provenance **auto-documentée**, JSON coefficients + feature matrices **présents dans le WORKSPACE** (`outputs/corpus-analysis/`), MAIS **hors repo versionné** + **NCR P1 SHA-drift OUVERT**. Statut détaillé : `S0_EVIDENCE_GAP_REGISTER.md`.

---

## 6. VERDICT S0

VERDICT :
- **Statut** : PASS (audit complet)
- **Confiance** : Haute (tout vérifié runtime)
- **Forces** : 3 ancres corrigées (43 pkgs ; mycelium = validation ≠ ADN ; corpus localisé 881) ; verrous techniques S1/S2 levés (nomic-embed + gemma4 présents) ; matière première S1 étiquetée disponible.
- **Faiblesses** : (1) `mycelium-bio` (cœur fingerprint) sous-testé (2 tests) = risque qualité ; (2) ADN existant est émotion-14D, désaligné des dimensions QUALITÉ visées → décision de conception S3 non triviale ; (3) reproductibilité ρ=0.6138 partielle (cf. registre).
- **Risques restants** : nomic-embed-text potentiellement faible en FR (à mesurer S1) ; données M0b en workspace volatile (à versionner ou remesurer).
- **Action requise** : ratification + dispatch S1 (Gold-Set + embedding vs LLM). Décision conception ADN (S3 : étendre vs parallèle) réservée Architecte.
