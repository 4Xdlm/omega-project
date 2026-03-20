# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — MASTER DOSSIER
# Marathon Phase R + Grand Parallèle + Opération Rosetta (P1+P2+P3)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Dates        : 2026-03-19 / 2026-03-20
# HEAD         : rosetta-complete (tag)
# Branche      : phase-w-mixer
# Tests        : 1852 GREEN
# API calls    : ~250 total (bench + Rosetta P1/P2/P3)
# Standard     : NASA-Grade L4 / DO-178C Level A
# Auteur       : Claude (IA Principal)
# Validé par   : Francky (Architecte Suprême), ChatGPT (Auditeur), Gemini (Guardian)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — CHRONOLOGIE COMPLÈTE

## Jour 1 (2026-03-19) — Phase R + Grand Parallèle

| Heure | Action | Résultat |
|-------|--------|----------|
| ~01h | R0 — Corpus 187 œuvres | tag phase-r0-complete |
| ~05h | R1 — 181 × 121 features × 12 fenêtres | tag phase-r1-complete |
| ~08h | R2 — 7 analyses topologiques | tag phase-r2-complete |
| ~10h | R3 — Coefficients proportionnels | tag phase-r3-complete |
| ~11h | Consultation IAs (ChatGPT hostile + Gemini validation) | 3/3 PASS |
| ~12h | R4 — Scorer TS 2 étages + 6 profils | tag phase-r4-complete |
| ~13h | R5 — F24-F38 en TS, cross-validation ±7.5% | tag phase-r5-complete |
| ~14h | R6 — Normalisation 0-100 | tag phase-r6-complete |
| ~15h | Bench legacy V3 seul | Médiane 91.64, Panique SEAL 93.58 |
| ~17h | Bench dual MOCK | Fix détecteur DIALOGUE, Spearman 0.500 |
| ~19h | Bench dual API (8 scènes réelles) | Médiane 51.10, Spearman 0.595 |
| ~20h | Bridge spaCy (49/49 features) | Médiane 46.78, Spearman 0.452 |
| ~21h | Ablation contrôlée | ARC validé (-3.16 pts sans) |
| ~22h | Vision Francky : Opération Rosetta | "Comprendre le LLM avant de le forcer" |
| ~23h | Consultation Rosetta (3 IAs) | Unanime : reverse engineering |
| ~23h30 | Alerte Francky anti-doublon | "Ne pas oublier OMEGA" |
| ~00h | Audit intégration (scan 50+ packages) | 4 dépréciés, 4 conservés |
| ~00h30 | Bench propre (type_modifiers OFF) | Médiane 46.11, Spearman 0.548 |

## Jour 1 — Bench API final (nuit)

| ~01h | Bench API final (type_modifiers OFF) | Médiane 50.42, Spearman 0.310 |
| | Constat : V3 et R6 lisent des dimensions DIFFÉRENTES de la qualité | DIVERGENT |

## Jour 2 (2026-03-20) — Opération Rosetta

| Heure | Action | Résultat |
|-------|--------|----------|
| ~03h | Rosetta P1 — 7 styles × 600 mots + mesure 49 features | 12 API calls |
| ~03h30 | Confusion matrix | 7/7 → INTROSPECTION (1 seul MATCH) |
| ~04h | Table de Rosette | Alignement moyen : 4-7/17 features par style |
| ~04h30 | Test amélioration | f1_mean monte mais R6 baisse (couplage) |
| ~05h | Test Flaubert | Bovary = 54.71/100 |
| ~07h | Rosetta P2 — 20 passages réels × rétro-ingénierie | 25 API calls |
| ~07h30 | Facteurs de conversion | f28d: 0.21, f17: 0.33, f29d: 1.03 |
| ~08h | Convergence itérative | ÉCHOUE (3/4 cas empirent) |
| ~08h30 | Dictionnaire v2 calibré | 8 efficaces, 9 irréductibles |
| ~09h | Rosetta P3 — Reverse prompting + auto-classification | 51 API calls |
| ~09h30 | Auto-classification LLM | 8 groupes (vs nos 5 styles) |
| ~09h45 | Recomposition indirecte | f28d=BLOQUÉ, f27d=PROGRÈS, f5c=SUSPECT |
| ~10h | Micro-chirurgie bornée | Proust +1.95 pts R6 avec 3 phrases |
| ~10h30 | Dictionnaire v3 (LLM-driven) | Instructions du LLM lui-même |
| ~11h | Consultation finale (3 rounds) | 13 décisions verrouillées |
| ~12h | Principe #6 Francky | "Le LLM ne se connaît pas lui-même" |

---

# PARTIE 2 — TAGS SCELLÉS

| Tag | Commit | Phase |
|-----|--------|-------|
| phase-r0-complete | cc1f83ea | Corpus 187 œuvres |
| phase-r1-complete | 5ccaa9dd | 181 × 121 features × 12 fenêtres |
| phase-r2-complete | ff7a9a1e | 7 analyses topologiques |
| phase-r3-complete | cac21aa3 | Coefficients proportionnels |
| phase-r4-complete | 1ae8a7e8 | Scorer TS + 6 profils |
| phase-r5-complete | bc4794db | F24-F38 en TS |
| phase-r6-complete | 9ea5c2fc | Normalisation 0-100 |
| grand-parallel-ready | 9900570f | Bench dual-scoring |
| audit-fix-complete | 29c13c32 | 44/49 + ablation |
| full-coverage-49 | (post-bridge) | Bridge spaCy 49/49 |
| bench-clean-49 | (bench propre) | type_modifiers OFF |
| rosetta-v1-complete | 4862baf7 | Infra Rosetta P1 |
| rosetta-complete | (final) | Rosetta P1+P2+P3 complètes |

---

# PARTIE 3 — RÉSULTATS CLÉS

## Phase R — Refondation métrologique

| Métrique | Valeur |
|----------|--------|
| Corpus | 187 œuvres, 181 analysées, 3 langues (FR/EN/ES) |
| Features | 121 mesurées, 92 actives, 29 OFF (compteurs absolus) |
| Fenêtres | 12 (30 → 20000 mots) |
| Positions | 5 par fenêtre (P_rel 0.05 → 0.95) |
| Topologie | 7 analyses (heatmap, hooks, chapitres, moments, types, coupure) |
| Coefficients | α=0.43, β=0.57 (LOCAL/ARC) |
| Features universelles cross-langue | 66/121 |

## Grand Parallèle — Résultats API

| Scène | V3 | R6 | Type R6 |
|-------|-----|-----|---------|
| Action pure | **93.01** (SEAL) | 52.94 | DESCRIPTION |
| Contemplation | 92.44 | 48.97 | DESCRIPTION |
| Panique | 92.24 | 51.16 | DESCRIPTION |
| Description lyrique | 91.82 | 52.37 | DESCRIPTION |
| Élégie | 91.54 | 45.02 | DESCRIPTION |
| Dialogue tendu | 90.98 | 51.47 | ACTION |
| Confrontation | 89.40 | 48.99 | DESCRIPTION |
| Monologue | 88.11 | 49.67 | DESCRIPTION |
| **Médiane** | **91.68** | **50.42** | |
| **Spearman ρ** | | **0.310** | DIVERGENT |

**Constat :** V3 mesure la DRAMATURGIE (émotion, tension, impact). R6 mesure l'ARTISANAT (lexique, contraste, structure). Les deux sont nécessaires, le pont = Rosetta.

## Rosetta P1 — Confusion matrix

| Demandé | Produit (plus proche classique) |
|---------|-------------------------------|
| DESCRIPTION | INTROSPECTION |
| ACTION | INTROSPECTION |
| INTROSPECTION | **INTROSPECTION** (seul MATCH) |
| CONTEMPLATION | INTROSPECTION |
| LYRIQUE | INTROSPECTION |
| DIALOGUE | INTROSPECTION |
| TRANSITION | INTROSPECTION |

**Le LLM a UN SEUL MODE d'écriture : prose introspective aplatie.**

## Rosetta P1 — Scores R6 par style

| Style | R6 |
|-------|-----|
| ACTION | **58.78** (paradoxe : le meilleur) |
| TRANSITION | 56.05 |
| LYRIQUE | 55.56 |
| DIALOGUE | 49.40 |
| DESCRIPTION | 43.89 |
| CONTEMPLATION | 41.95 |
| INTROSPECTION | **35.67** (paradoxe : le pire) |

## Rosetta P1 — Features divergentes systématiques

| Feature | Ratio LLM/Classique | Interprétation |
|---------|---------------------|----------------|
| f28d_sil_score | **0** | Le LLM ne produit JAMAIS de style indirect libre |
| f27d_modal_score | **0** (5/7 styles) | Pas de modalité épistémique naturelle |
| f5c_action_verb_ratio | **0.32** | 3× moins de verbes d'action que les classiques |
| f17_knife_count | **0** | Aucun mot-couteau |
| f1b_rhythm_ratio | **2.4** | Rythme 2.4× trop régulier |
| f21c_diacope_rate | **~0** | Pas de répétitions stylistiques |

## Rosetta P2 — Facteurs de conversion

| Feature | Facteur Y/X | Si on demande X, il produit... |
|---------|-------------|-------------------------------|
| f28d_sil | **0.21** | 5× moins que demandé |
| f17_knife | **0.33** | 3× moins |
| f21c_diacope | **0.30** | 3× moins |
| f9a_adversatifs | **0.62** | 40% de moins |
| f1_mean | **0.75** | 25% plus court |
| f25g_description | **1.26** | Surpasse la cible (+26%) |
| f29d_ttr | **1.03** | Quasi parfait |
| f24e_contrast | **0.98** | Quasi parfait |

## Rosetta P2 — Convergence itérative

| Passage | Distance iter 1 | Distance iter 2 | Verdict |
|---------|----------------|----------------|---------|
| INTROSPECTION/Proust | 0.46 | 8489 | **EMPIRE — catastrophique** |
| DESCRIPTION/Flaubert | 0.59 | 2.70 | **EMPIRE** |
| INTROSPECTION/Dostoïevski | 0.68 | 0.70 | **STAGNE** |
| DESCRIPTION/Hugo | 0.77 | 0.57 → 0.66 | **OUI puis stagne** |

**Conclusion : La convergence itérative NE FONCTIONNE PAS. Le premier tir est le meilleur.**

## Rosetta P3 — Reverse prompting

Le LLM nomme nos styles autrement :

| Notre nom | Son nom |
|-----------|---------|
| DESCRIPTION | "Prose narrative psychologique du XIXe siècle" |
| ACTION | "Prose dramatique à pivots émotionnels" |
| INTROSPECTION | "Prose périodique à incises méditatives" |
| CONTEMPLATION | "Corpus Hétéroclite Falsifié" (n'a PAS reconnu) |
| LYRIQUE | "Prose Narrative Hypnotique à Accumulation Cyclique" |

## Rosetta P3 — Auto-classification

Le LLM voit **8 groupes** (pas 5) :
1. Prose classique narrative
2. Prose épique antique
3. Fragments dramatiques
4. Prose ornementale impressionniste
5. Prose philosophique anglaise
6. Dialogue romanesque anglais
7. Références documentaires
8. Prose hybride traductive

**Nos 5 styles sont DISPERSÉS dans ses 8 groupes. Sa taxonomie ≠ la nôtre.**

## Rosetta P3 — Recomposition indirecte

| Feature | Stratégie | Baseline → Après | Verdict |
|---------|-----------|-------------------|---------|
| f28d_sil | Combinaison contraste + lexique introspectif | 0.078 → 0 | **BLOQUÉE** |
| f27d_modal | Vocabulaire d'approximation + incertitude | 0.273 → 0.337 | **CONTOURNABLE** (+0.064) |
| f5c_action | Substantifs de mouvement + métaphores dynamiques | 0.193 → 3.5 | **⚠️ SUSPECT** (audit requis) |

## Rosetta P3 — Micro-chirurgie bornée

| Passage | Phrases modifiées | Delta R6 | Verdict |
|---------|-------------------|----------|---------|
| DESCRIPTION/Flaubert | 3 | -0.02 | Neutre |
| INTROSPECTION/Proust | 3 | **+1.95** | **SUCCÈS** |
| LYRIQUE/García Márquez | 3 | +0.28 | Léger progrès |

**La micro-chirurgie phrase par phrase FONCTIONNE (vs réécriture globale qui empire).**

## Test Flaubert

| Métrique | Valeur |
|----------|--------|
| Source | Madame Bovary (mots 5000-5600) |
| Score R6 | **54.71** |
| Feature la plus faible | f21c_diacope_rate (0.014) |
| f1_mean | 21.43 (typique classique) |
| f24e_contrast | 0.945 (excellent) |
| f35c_hook | 0.80 |
| f36c_cliff | 0.70 |

---

# PARTIE 4 — LES 6 PRINCIPES ROSETTA

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   PRINCIPE 1 : Classiques = ancre. LLM = espace à cartographier.                     ║
║   PRINCIPE 2 : Le LLM ne comprend pas les labels stylistiques,                        ║
║                il faut des contraintes mécaniques.                                     ║
║   PRINCIPE 3 : La convergence itérative EMPIRE la prose.                               ║
║                Le premier tir est le meilleur.                                         ║
║   PRINCIPE 4 : La micro-chirurgie bornée (phrase par phrase) FONCTIONNE.              ║
║   PRINCIPE 5 : OMEGA garde sa langue. Le traducteur s'adapte au LLM.                  ║
║   PRINCIPE 6 : Le LLM ne se connaît pas parfaitement lui-même.                        ║
║                Ses instructions sont des HYPOTHÈSES à vérifier                         ║
║                par VARIATIONS et MÉTRIQUES (Francky).                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# PARTIE 5 — LES 13 DÉCISIONS VERROUILLÉES

| # | Décision | Source | Unanime |
|---|----------|--------|---------|
| D1 | type_modifiers OFF pour bench | 3/3 IAs | ✅ |
| D2 | PROFILEUR probabiliste (composition, pas binaire) | 3/3 + Francky | ✅ |
| D3 | Reverse engineering LLM avant calibration | Francky + 3/3 | ✅ |
| D4 | Dictionnaire OMEGA↔LLM versionné par modèle | ChatGPT + Gemini | ✅ |
| D5 | Désalignement = WARNING en V1, pas blocage | ChatGPT + Gemini | ✅ |
| D6 | Architecture 3 Juges (Profileur + LOCAL + ARC) | Gemini | ✅ |
| D7 | Template par composition (top-2 en V1) | ChatGPT | ✅ |
| D8 | PROFILEUR réutilise archetype + style_genome d'OMEGA | Francky | ✅ |
| D9 | Scoring legacy V3 INTACT et parallèle | Tous | ✅ |
| D10 | Moteur émotionnel = autorité indépendante | Francky + ChatGPT | ✅ |
| D11 | Pas de remplacement silencieux de style-emergence | ChatGPT | ✅ |
| D12 | Registre d'autorité fonctionnelle AVANT implémentation | ChatGPT | ✅ |
| D13 | Instructions LLM = HYPOTHÈSES à vérifier par bench contradictoire | Francky | ✅ |

---

# PARTIE 6 — PILOTABILITY MATRIX

## Par feature

| Feature | Mesurable | Stable | Pilotable | Couplée | Bloquée | Contournable |
|---------|-----------|--------|-----------|---------|---------|-------------|
| f29d_ttr | ✅ | ✅ | ✅ 100% | ❌ | ❌ | N/A |
| f15b_compression | ✅ | ✅ | ✅ 100% | ❌ | ❌ | N/A |
| f16a_bigram | ✅ | ✅ | ✅ 100% | ❌ | ❌ | N/A |
| f24e_contrast | ✅ | ✅ | ✅ 88% | ❌ | ❌ | N/A |
| f25g_description | ✅ | ✅ | ⚠️ 75% (LYRIQUE) | ❌ | ❌ | N/A |
| f17_knife | ✅ | ✅ | ⚠️ style-dépendant | ❌ | ❌ | N/A |
| f35c_hook | ✅ | ✅ | ⚠️ style-dépendant | ❌ | ❌ | N/A |
| f36c_cliff | ✅ | ✅ | ⚠️ style-dépendant | ❌ | ❌ | N/A |
| f1_mean | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| f5a_verb_density | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| f1b_rhythm_ratio | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| f5c_action_verb | ✅ | ❌ | ❌ | ✅ | ❌ | ⚠️ (audit requis) |
| f27d_modal | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (+0.064) |
| f28d_sil | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| f9a_adversatifs | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| f21c_diacope | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| f38c_speed | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

## Résumé

| Catégorie | Nombre | Action |
|-----------|--------|--------|
| **PILOTABLE** (100%) | 4 | → CORE V1 prompt |
| **PILOTABLE** (style-dépendant) | 4 | → EXP V1.1 |
| **COUPLÉE** (dangereuse seule) | 4 | → Ne PAS cibler directement |
| **CONTOURNABLE** | 2 | → Stratégie de substitution |
| **BLOQUÉE** | 4 | → Micro-chirurgie ou accepter |

---

# PARTIE 7 — REGISTRE D'AUTORITÉ FONCTIONNELLE

| Responsabilité | Source of Truth | Consommateurs | Interdit de réimplémenter |
|---------------|----------------|---------------|--------------------------|
| Baselines corpus | `omega-autopsie/` | Scorer R6, PROFILEUR | ✅ |
| ADN / Genome | `packages/genome/` | ForgePacket, scoring | ✅ |
| Validation input | `packages/mycelium/` | Pipeline entrée | ✅ |
| Archétype scène | `engine.ts` deriveArchetype() | PROFILEUR, Damage Gate | ✅ |
| Style genome (cibles) | ForgePacket.style_genome | PROFILEUR | ✅ |
| Moteur émotionnel | `sovereign-engine/oracle/` | Scoring V3 | ✅ ABSOLUMENT |
| Damage Gate | `damage-gate.ts` | Micro-surgeon | ✅ |
| Features F24-F38 | `text-features.ts` | Scorer R6 | ✅ |
| Coefficients R3 | `OMEGA_COEFFICIENTS_v1.json` | Scorer R6 | ✅ |
| Type passage PRODUIT | **FUTUR : PROFILEUR V1** | Juges LOCAL + ARC | N/A |
| Désalignement | **FUTUR : PROFILEUR V1** | Scoring, garde-fou | N/A |
| Dictionnaire OMEGA↔LLM | **FUTUR : rosetta_matrix** | Prompt-assembler | N/A |
| Matrice Rosetta | **results_rosetta/** | Calibration, traducteur | N/A |

---

# PARTIE 8 — ARCHITECTURE DU TRADUCTEUR (Francky)

## Principe

```
OMEGA (notre langue)              TRADUCTEUR                  LLM (sa langue)
──────────────────────            ─────────────────           ───────────────────
"INTROSPECTION"           →       rosetta_matrix        →    "Phrases 80-150 mots,
                                  [modèle_version]           3 niveaux emboîtement,
                                                             incises car/parce que"
```

## Structure du Language Pack

```json
{
  "matrix_id": "rosetta_claude-sonnet-4-20250514_v1",
  "model": "claude-sonnet-4-20250514",
  "calibration_date": "2026-03-20",
  "calibration_protocol": "rosetta-p3",
  "translations": {
    "INTROSPECTION": {
      "declared_translation": {...},
      "validated_translation": {...},
      "optimized_translation": {...},
      "features_pilotables": [...],
      "features_bloquees": [...],
      "features_contournables": [...],
      "facteurs_conversion": {...}
    }
  },
  "validation_test": {
    "protocol": "20 phrases sentinelles",
    "seuil_compatibilite": 0.70
  }
}
```

## 3 couches du langpack (ChatGPT)

| Couche | Contenu | Confiance |
|--------|---------|-----------|
| `declared_translation` | Ce que le LLM DIT vouloir | HYPOTHÈSE |
| `validated_translation` | Ce que les tests PROUVENT | RÈGLE |
| `optimized_translation` | Ce qui MARCHE MIEUX que ce qu'il dit | PRIORITAIRE |

## Protocole de changement de modèle/version

1. Nouveau LLM ou version détecté
2. Test sentinelle (20 phrases de référence)
3. Si taux respect > 70% → MÊME MATRICE
4. Si taux < 70% → RECALIBRATION (relancer Rosetta)
5. Nouvelle matrice : `rosetta_[model]_[version]_v1.json`
6. Ancienne matrice ARCHIVÉE (réutilisable)

---

# PARTIE 9 — AUDIT INTÉGRATION

## Modules style-emergence-engine

| Module | Statut | Remplacé par |
|--------|--------|-------------|
| cadence-analyzer.ts | **DÉPRÉCIÉ** | text-features.ts (R6) |
| lexical-analyzer.ts | **DÉPRÉCIÉ** | text-features.ts (f29b, f16a) |
| density-analyzer.ts | **DÉPRÉCIÉ** | passage-type-detector.ts (R6) |
| style-profiler.ts | **DÉPRÉCIÉ** | PROFILEUR V1 |
| syntactic-analyzer.ts | **CONSERVÉ** | Extension future (9 structures) |
| genre-detector.ts | **CONSERVÉ** | Extension future (genre littéraire) |
| ia-detector.ts | **CONSERVÉ** | Garde-fou qualité |
| banality-detector.ts | **CONSERVÉ** | Complémentaire f17_knife |

## Moteur émotionnel : ZÉRO doublon avec R6

tension_14d, emotion_coherence, interiority, impact, damage-gate → INTACTS.

---

# PARTIE 10 — ALERTES ET QUARANTAINES

## Alerte f5c (ratio 0.19 → 3.5)

Le ratio f5c_action_verb_ratio passe de 0.19 à 3.5 en Rosetta P3 Bloc D.
Un ratio normalement entre 0 et 1 qui atteint 3.5 est SUSPECT.
**Audit humain requis** : lire les textes générés et vérifier si c'est un
vrai progrès ou un bug de normalisation/parseur.

## Quarantaine

| Élément | Raison | Durée |
|---------|--------|-------|
| Labels LLM | Hypothèses, pas vérités | Jusqu'à bench 300 tests |
| 8 groupes auto-classifiés | Taxonomie non consolidée | Jusqu'à bench |
| Stratégies substitution Bloc D | Résultats partiels | Jusqu'à bench |
| Dictionnaire v3 complet | Instructions = hypothèses (P#6) | Jusqu'à bench contradictoire |

---

# PARTIE 11 — FICHIERS DANS LE REPO

## Documents d'architecture (docs/)

| Fichier | Contenu |
|---------|---------|
| SESSION_SAVE_2026-03-20_MARATHON_COMPLET.md | Session jour 1 |
| SESSION_SAVE_ROSETTA_COMPLETE.md | Rosetta P1+P2+P3 |
| OMEGA_ROSETTA_REPORT.md | Rapport P1 |
| OMEGA_ROSETTA_PHASE2_REPORT.md | Rapport P2 |
| OMEGA_ROSETTA_PHASE3_REPORT.md | Rapport P3 |
| OMEGA_AUDIT_INTEGRATION_GLOBALE.md | Matrice doublons |
| OMEGA_SYNTHESE_INTEGREE_FINALE.md | Architecture anti-doublon |
| OMEGA_SYNTHESE_FINALE_ROSETTA.md | Idées "ultra instinct" |
| OMEGA_DOSSIER_REVERSE_ENGINEERING_LLM.md | Protocole RE |
| OMEGA_DOSSIER_DETECTION_TYPE.md | Problème détecteur |
| OMEGA_PROTOCOLE_ANALYSE_COMPLET.md | Pipeline reproductible |
| OMEGA_PHYSIQUE_LITTERAIRE_v3.md | Guide technique R0-R3 |
| OMEGA_PHASE_R_ROADMAP_v2.md | Roadmap Phase R |

## Données Rosetta (omega-autopsie/results_rosetta/)

| Dossier | Contenu | Phase |
|---------|---------|-------|
| / | 19 fichiers (définitions, proses, features, table, confusion, dictionnaires) | P1 |
| phase2/ | 20 extraits + 20 tests + 4 convergences + dict v2 | P2 |
| phase3/ | 5 blocs (reverse micro/macro, auto-class, recomposition, chirurgie) + dict v3 | P3 |

## Scripts

| Script | Rôle | API |
|--------|------|-----|
| rosetta-orchestrator.ts | P1 pipeline (8 phases) | OUI |
| rosetta-measure.ts | Mesure standalone | NON |
| rosetta-phase2.ts | P2 pipeline (5 phases) | OUI |
| rosetta-phase3.ts | P3 pipeline (5 blocs) | OUI |
| run-benchmark-dual.ts | Grand Parallèle | OUI |

---

# PARTIE 12 — ROADMAP POST-ROSETTA

| Phase | Action | Budget API | Prérequis |
|-------|--------|-----------|-----------|
| **S0** | Bench consolidation : 100 tests × 3 variantes par feature pilotable | ~150 | Rosetta P3 |
| **S0b** | Audit humain f5c (ratio 3.5) | 0 | Lire textes P3 |
| **S0c** | Bench contradictoire : instructions LLM vs variations humaines vs hybrides | ~200 | S0 |
| **S1** | Classifier : SOLIDES / PROMETTEUSES / EXPÉRIMENTALES / ILLUSIONS | 0 | S0+S0c |
| **S2** | Créer rosetta_claude-sonnet-4-20250514_v1.json (3 couches) | 0 | S1 |
| **S3** | Implémenter PROFILEUR V1 minimal | 0 | S2 + audit |
| **S4** | Brancher 4 features CORE dans le prompt | 0 | S1 |
| **S5** | Protocole micro-chirurgie bornée V2 | ~50 | S0 |
| **S6** | Bench contrôlé (sans vs avec profileur + prompt) | ~30 | S3+S4 |
| **S7** | Go/No-Go injection prod | 0 | S6 |
| **S8** | Test sentinelle changement de modèle | ~20 | S2 |

---

# PARTIE 13 — MESSAGE DE REDÉMARRAGE

```
OMEGA SESSION — CONSOLIDATION POST-ROSETTA (Phase S0)

Dernier état : SESSION_SAVE_MASTER_DOSSIER_ROSETTA
HEAD : rosetta-complete
Branche : phase-w-mixer
Tests : 1852 GREEN

CONTEXTE :
  Phase R (R0→R6) COMPLÈTE — 7/7 PASS
  Grand Parallèle : Spearman 0.310 (V3 vs R6 = dimensions différentes)
  Rosetta P1+P2+P3 COMPLÈTES — 88 API calls
  13 décisions verrouillées — 6 principes gravés
  Tags : rosetta-complete

  DÉCOUVERTES MAJEURES :
  - Le LLM produit TOUJOURS de l'introspection (7/7 styles)
  - 8 features pilotables, ~6 bloquées, 2 contournables
  - La convergence itérative ÉCHOUE
  - La micro-chirurgie bornée FONCTIONNE
  - Le LLM ne se connaît pas parfaitement (Principe #6)

OBJECTIF PHASE S0 :
  1. Bench consolidation 100 tests par feature pilotable × 3 variantes
     (A: instructions LLM, B: variations humaines, C: hybride métriques)
  2. Audit humain f5c ratio 0.19→3.5 (bug ou réel ?)
  3. Classifier les règles : SOLIDES / PROMETTEUSES / EXPÉRIMENTALES / ILLUSIONS DÉCLARATIVES
  4. NE PAS injecter en prod avant S6 (bench contrôlé avec profileur)

DOCUMENTS À LIRE :
  docs/SESSION_SAVE_MASTER_DOSSIER_ROSETTA.md (CE FICHIER)
  docs/OMEGA_ROSETTA_PHASE3_REPORT.md
  docs/OMEGA_ROSETTA_PHASE2_REPORT.md
  docs/OMEGA_AUDIT_INTEGRATION_GLOBALE.md
  omega-autopsie/results_rosetta/ (tous les résultats)
  omega-autopsie/results_rosetta/phase2/dictionnaire_v2_calibre.json
  omega-autopsie/results_rosetta/phase3/dictionnaire_v3_llm_driven.json

PRINCIPES ROSETTA :
  #1 Classiques = ancre
  #2 Contraintes mécaniques, pas labels
  #3 Premier tir > itération
  #4 Micro-chirurgie bornée > réécriture globale
  #5 OMEGA garde sa langue
  #6 Le LLM ne se connaît pas — vérifier par variations (Francky)

Architecte Suprême : Francky
IA Principal : Claude
```

---

*SESSION_SAVE — Master Dossier Rosetta — 2026-03-20*
*Standard NASA-Grade L4 / DO-178C Level A*
*"Le LLM ne se connaît pas parfaitement lui-même" — Francky*
*"On ne change pas la langue d'OMEGA ; on industrialise une couche de traduction" — Francky*
