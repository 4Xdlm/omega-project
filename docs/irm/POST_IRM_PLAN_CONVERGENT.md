# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — POST-IRM : ANALYSES COMPLÉMENTAIRES + PLAN D'ACTION CONVERGENT
#   Fusion : Claude (auto-audit) + ChatGPT (docs 11+13) + Gemini (doc 14)
#            + ChatGPT long (doc 12) — poussé au-delà des 3 retours
#
#   Date : 2026-04-02 | HEAD : 3fd22df7 | Standard : NASA-Grade L4
#   Autorité : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

# PARTIE 1 — ANALYSES COMPLÉMENTAIRES REQUISES

## 1.1 — FINDING CRITIQUE NON DÉTECTÉ PAR L'IRM

### FINDING NOUVEAU : Divergence poids macro-axes PRODUCTION vs CALIBRATION

Découvert par Gemini + vérifié sur repo live.

| Source | ECC | RCI | SII | IFI | AAI |
|--------|-----|-----|-----|-----|-----|
| macro-axes.ts (PROD) | 0.33 | 0.17 | 0.15 | 0.10 | 0.25 |
| weight-calibrator.ts (CALIB) | 0.30 | 0.17 | 0.18 | 0.15 | 0.20 |

Impact : Le calibrateur optimise sur une vérité DIFFÉRENTE de la production.
Statut : ABSENT de l'IRM L08 et L14. Finding NOUVEAU, CONFIRMÉ par repo live.
Action : SSOT unique dans core/thresholds.ts ou macro-axes.ts.

## 1.2 — 10 INVESTIGATIONS MANQUANTES

### INV-01 : Audit polarité GB V1 sur f26b — PARTIELLEMENT RÉSOLU
Vérifié : Tree 0, f26b HIGH = +0.435 (POSITIF). Direction COHÉRENTE avec L37.
Reste : 49 autres arbres non vérifiés. Script Python requis. Effort : 30 min.

### INV-02 : Cross-validation 3 scorers sur mêmes textes — ABSENTE
20-30 textes du corpus, scorer avec GB V1 + Ridge V2 + V3.
Matrice de concordance verdictaire. Effort : 2h.

### INV-03 : Budget token réel par run — NON MESURÉ
Tokens IN + OUT total, ratio utiles/morts, coût $ réel. Logger 5 runs. Effort : 1h.

### INV-04 : gateway/ scan profondeur — ABSENT
memory_layer_nasa : 17 fichiers + 10 tests (store, tiering, decay, query, snapshot)
creation_layer_nasa : 8 fichiers + 6 tests (engine, request, artifact, template)
gates/ : 5 fichiers (canon, emotion, truth, ripple)
Total : 34 fichiers + 16 tests NON SCANNÉS. Effort : 1h.

### INV-05 : Couverture test par module — NON MESURÉE
219 fichiers .test.ts mais répartition par module inconnue. Effort : 30 min.

### INV-06 : Inter-package dependency graph — ABSENT
Dépendances entre 45 packages non tracées. Effort : 1h.

### INV-07 : Slopes Phase W dans damage-gate.ts — VÉRIFICATION
Comparer damage-gate.ts vs données Phase W originales. Effort : 30 min.

### INV-08 : 74 JSON scoring/data — Audit d'obsolescence
Lesquels sont importés, lesquels sont des artefacts historiques. Effort : 1h.

### INV-09 : PVI interface TypeScript — CONCEPTION
Interface PVIBridge entre Python standalone et sovereign-engine. Effort : 30 min.

### INV-10 : Score régression par module — NON PRODUIT
risk = f(fan-in, fan-out, criticité, staleness). Effort : 1h.

## 1.3 — MÉTRIQUES MANQUANTES

| Métrique | Importance |
|----------|-----------|
| Token budget réel par run (IN + OUT + ratio gaspillage) | HAUTE |
| Coût $ par run (avec 30-35 appels réels) | HAUTE |
| Concordance inter-scorers (GB V1 vs Ridge V2 vs V3) | HAUTE |
| Couverture test par module | MOYENNE |
| Dépendances inter-packages (graphe) | MOYENNE |
| Staleness gateway/ (34 fichiers non scannés) | MOYENNE |

# PARTIE 2 — PLAN D'ACTION CONVERGENT (3 IAs + Claude Opus 4.6)

## DIAGNOSTIC CONVERGENT 4/4

| IA | Formulation | Traduction |
|----|-------------|-----------|
| ChatGPT (doc 11) | "Tu sais mesurer. Tu ne sais pas encore produire de facon controlee." | Mesure en avance sur generation |
| ChatGPT (doc 12) | "Le goulot est le couplage cible theorique - ecriture obtenue" | S1 corpus et S2 LLM decouplés |
| ChatGPT (doc 13) | "Le pipeline compense par complexite ce qu'il ne maitrise pas en amont" | 30 appels = pansement structurel |
| Gemini (doc 14) | "La physique litteraire est defaillante dans sa transposition mathematique" | Lois prouvees != lois injectees |
| Claude (auto-audit) | "8.3/10 mais couverture hors SE = 5/10" | IRM profonde mais pas totale |

CONVERGENCE 4/4 : Le probleme n'est plus de mesurer.
C'est d'INJECTER la verite mesuree dans le pipeline de generation.

## LE VRAI PROBLEME

OMEGA a 3 systemes brillants qui ne communiquent pas assez :
  S1 — MESURE (Phase R, corpus, features, lois) = TRES SOLIDE
  S2 — GENERATION (Sovereign, LLM, pipeline) = PUISSANT MAIS AVEUGLE
  S3 — GOUVERNANCE (contrats, SEAL, governance) = MATURE

Le COUPLAGE S1->S2 est le verrou central.
Rosetta l'a identifie. L'IRM le confirme.
Les 30 appels LLM par run en sont le SYMPTOME.

Sur les ~30 appels par run :
  ~5 sont PRODUCTIFS (draft + symbol map)
  ~25 sont COMPENSATOIRES (loop, duel, judge, patch, micro-surgery)
  Ratio productif/compensatoire = 1:5.
  Cible du plan : reduire de 1:5 a 1:2.


## P0 — ASSAINISSEMENT IMMEDIAT (40 min, 0 risque)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| P0-01 | Unifier SAGA_READY import core/thresholds.ts | engine.ts:198,549 | 5 min |
| P0-02 | Unifier SEAL_FLOOR import core/thresholds.ts | duel-engine.ts:137 | 2 min |
| P0-03 | Supprimer compat/ (code mort, 0 imports) | compat/*.ts | 2 min |
| P0-04 | Supprimer imports polish commentes | engine.ts:43-45,412-414 | 2 min |
| P0-05 | Ajouter validation avg_sent_target >= 35 | pre-write-validator.ts | 5 min |
| P0-06 | Documenter CLIFF_THRESHOLD = 0.30 | engine.ts:455 + ADR | 5 min |
| P0-07 | Documenter floorPenalty = 1.5 | duel-engine.ts:137 + ADR | 5 min |
| P0-08 | Creer L35b (resoudre collision) | docs/irm/ | 5 min |
| P0-09 | ALIGNER weight-calibrator.ts sur macro-axes.ts | weight-calibrator.ts | 5 min |
| P0-10 | Archiver hybrid-provider.ts + nettoyer env var | runtime/ + duel/ | 5 min |

Total P0 : ~40 min. PASS/FAIL : npm test doit rester GREEN.

## P1 — NETTOYAGE STRUCTURAL (12h, risque faible)

| # | Action | Effort |
|---|--------|--------|
| P1-01 | Migrer computeMacroSScore hors de s-score.ts | 30 min |
| P1-02 | Supprimer s-score.ts apres migration | 15 min |
| P1-03 | Archiver polish NO-OP (3 fichiers) | 15 min |
| P1-04 | Archiver prompt-assembler-v2.ts | 15 min |
| P1-05 | Archiver ollama-provider.ts | 10 min |
| P1-06 | Executer les 10 INV manquantes (INV-01 a INV-10) | 8h |
| P1-07 | Produire COST_MODEL_BY_PIPELINE.json | 1h |
| P1-08 | Produire REGRESSION_RISK_MATRIX.json | 1h |
| P1-09 | Scanner gateway/ en profondeur (34 fichiers) | 1h |

Total P1 : ~12h. Dette reduite de ~2100 lignes.


## P2 — ALIGNEMENT S1->S2 : LE VERROU CENTRAL (6 semaines)

### P2-01 : Phase R4 — Scorer V3 reconstruction (PROCHAIN selon roadmap)
Le scorer est le TRADUCTEUR entre S1 (mesure) et S3 (verdict).

| Etape | Action | Critere PASS |
|-------|--------|-------------|
| R4-a | Fixer poids macro-axes dans UN fichier unique | 1 SSOT, 0 duplication |
| R4-b | Integrer coefficients Phase R3 proportionnels | alpha/beta verifies |
| R4-c | Integrer profils typologiques (R8 CIF + lambda) | Profils 5 types |
| R4-d | Scorer multi-etages LOCAL + ARC | alpha=0.43, beta=0.57 |
| R4-e | Validation sur 30 textes corpus (FR+EN) | Spearman >= 0.75 |

### P2-02 : Rosetta Bridge — Traduction S1->S2 (NOUVEAU MODULE)
Le COUPLING ENGINE que ChatGPT propose. Rosetta S0 a DEJA les donnees.

  Interface :
    input:  { target_features: FeatureVector, archetype: string }
    output: { prompt_directives: string[], expected_compliance: number }

  Logique :
    Feature PILOTABLE -> generer consigne calibree Rosetta
    Feature IRREDUCTIBLE -> NE PAS injecter (post-processing)
    Feature CONTOURNABLE -> marquer "post-processing"

  Fichier : src/coupling/rosetta-bridge.ts
  Donnees : scoring/data/rosetta_s0_matrix.json

### P2-03 : Reduction appels LLM (IMPACT COUT)

| Composant | Actuel | Cible | Comment |
|-----------|--------|-------|---------|
| Chunked Gen K2 | 4 | 2-3 | Chunks plus gros (1000-1500w) |
| Duel (drafts + judges) | ~10 | 4-5 | 2 drafts + V3 only |
| Sovereign Loop | ~4 | 2 | 1 passe si score > 88 |
| Polish/MicroSurgery | ~4 | 2 | Seulement si delta > seuil |
| Symbol Map | 1 | 0-1 | CALC si possible |
| TOTAL | ~30 | ~15 | -50% appels |

Impact : cout divise par 2, latence divisee par 2.


## P3 — MUTATION ARCHITECTURALE (3+ mois, risque controle)

### P3-01 : Inverse Engine (innovation ChatGPT doc 11)
ACTUEL :   Prompt -> Texte -> Score (pray and score)
PROPOSE :  Score cible -> Contraintes -> Prompt optimise -> Texte -> Validation

  1. Definir cible : {f26b >= 0.15, sub >= 0.08, cliff < 0.30}
  2. Rosetta Bridge traduit en directives realistes
  3. Prompt calibre envoye au LLM
  4. Resultat mesure
  5. SI ecart > seuil -> ajuster les directives (pas le texte)
  6. SI 3 iterations sans convergence -> best-of-N

### P3-02 : Scorer V5 — Couche semantique (long terme)
Pour resoudre L38 (mur semantique EN maximaliste, R²=-0.187) :
  Embeddings LLM, features semantiques, Genius Engine G=(DxSxIxRxV)
  Prerequis : P2-01 + P2-02 + D2 (Genius backtest)

### P3-03 : Decouplage types.ts (fan-in = 111)
Scinder en domaines : types/forge.ts, types/scoring.ts, types/delta.ts, types/pipeline.ts
Reexporter depuis types/index.ts. Fan-in 111 -> ~30 par fichier.
Risque ELEVE : shadow branch obligatoire.

### P3-04 : ChromaDB Loom (D4)
LOOM-1 : ChromaDB local (coherence ~10-15K mots)
LOOM-2 : tracking motifs isotopiques (30-60K mots)
LOOM-3 : gate derive isotopique (300K mots)

## CHRONOLOGIE RECOMMANDEE

SEMAINE 1 : P0 complet (40 min) + P1-01 a P1-05 (1.5h)
SEMAINE 2 : P1-06 a P1-09 (investigations manquantes, 12h)
SEMAINES 3-4 : P2-01 (Phase R4 scorer V3)
SEMAINES 5-6 : P2-02 (Rosetta Bridge)
SEMAINES 7-8 : P2-03 (Reduction appels LLM 30->15)
MOIS 3+ : P3 (Inverse Engine, V5, decouplage, Loom)


## CE QUI VA AU-DELA DES 3 RETOURS IA

### 1. Finding weight-calibrator.ts (NOUVEAU)
Personne sauf Gemini ne l'a vu. Verifie sur repo live :
macro-axes.ts = ECC 0.33, SII 0.15, IFI 0.10, AAI 0.25
weight-calibrator.ts = ECC 0.30, SII 0.18, IFI 0.15, AAI 0.20
Chaque recalibration depuis ce fichier a optimise sur la MAUVAISE cible.

### 2. Direction f26b dans GB V1 est CORRECTE
Verifie Tree 0 : f26b HIGH = +0.435 (POSITIF). Coherent avec L37.
L'alarme etait un faux positif partiel (49 arbres restants a verifier).

### 3. gateway/ = organe NON SCANNE de 34 fichiers + 16 tests
memory_layer_nasa = module complet (store, tiering, decay, query, snapshot, hash, digest)
creation_layer_nasa = 8 fichiers (engine, request, artifact, template)
C'est la FONDATION du futur World Model. Ignorer = ignorer le cerveau limbique.

### 4. Les 42 features GB V1 != les 42 de text-features.ts
GB V1 utilise 18 features semantiques (referent, entity, lexical, tension,
desire, perception, causal, temporal, echo, motif) de depth-features.ts
et semantic-depth-features.ts. Correspondance exacte non cartographiee.

### 5. Ratio productif/compensatoire = 1:5
Sur ~30 appels : ~5 productifs, ~25 compensatoires.
C'est le SYMPTOME quantifie du probleme central.
Metrique de succes du plan : 1:5 -> 1:2.

## METRIQUES DE SUCCES DU PLAN

| Metrique | Actuel | Cible P0+P1 | Cible P2 | Cible P3 |
|----------|--------|-------------|----------|----------|
| Duplications SSOT | 7 | 0 | 0 | 0 |
| Magic numbers | 2 | 0 | 0 | 0 |
| Code mort (lignes) | ~2100 | ~0 | ~0 | ~0 |
| Appels LLM/run | ~30 | ~30 | ~15 | ~10 |
| Ratio productif/compensatoire | 1:5 | 1:5 | 1:2 | 1:1.5 |
| SAGA_READY rate | 8% | 8% | 30%+ | 50%+ |
| Contradictions doc/code | 9 | 0 | 0 | 0 |
| Phantoms documentes | 11 | 11 | 8 | 3 |

---

Document produit le 2026-04-02
Fusion : Claude Opus 4.6 + ChatGPT + Gemini
Standard : NASA-Grade L4 / DO-178C Level A
Autorite : Francky (Architecte Supreme)
