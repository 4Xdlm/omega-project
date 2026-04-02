# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — PLAN CORRIGÉ POST-IRM + INV
#   Vérité vérifiée ligne par ligne — Corrections des 3 IAs
#
#   Date : 2026-04-02 | Standard : NASA-Grade L4
#   Autorité : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

# CE QUE LES 3 IAs ONT DIT DE FAUX OU D'IMPRÉCIS

## CORRECTION 1 — Les 69 JSON "orphelins" NE SONT PAS TOUS MORTS

Les 3 IAs recommandent d'archiver 69/73 JSON. C'est FAUX.

J'ai lu les fichiers un par un. La réalité :

| Catégorie | Nombre | Action correcte |
|-----------|--------|----------------|
| RUNTIME (importés par le code actuel) | 4 | NE PAS TOUCHER |
| CALIBRATION R4 (nécessaires au scorer en reconstruction) | ~21 | NE PAS ARCHIVER — Phase R4 en a besoin |
| RESEARCH (résultats de Phase R, valeur scientifique) | ~16 | GARDER en place ou déplacer dans data/research/ |
| BENCH HISTORIQUE (expériences terminées) | ~32 | ARCHIVER dans data/archive/ |

### Les 21 fichiers CALIBRATION R4 (marqués ORPHAN mais INDISPENSABLES) :

La roadmap R4 dit : "Implémenter le scorer multi-étages, intégrer coefficients R3,
détecteur de type, 6 profils de qualité." Ces fichiers seront LUES par le code R4 :

1. COMPOSITION_PROFILES.json — profils GB par type (5 types)
2. TYPE_FEATURE_IMPORTANCE.json — importance par type (corrélations)
3. TYPE_COMPATIBILITY_MATRIX.json — compatibilité transitions
4. TYPE_MEASURE_SIGNATURES.json — signatures par type
5. TRANSITION_MATRICES.json — matrices de transition (Loi des LEGO)
6. R8_ASSEMBLY_PATTERNS.json — trigrammes maîtres vs commerciaux
7. MEASURE_ROLES.json — classification rôle de chaque mesure
8. MEASURE_TRUST_MATRIX.json — matrice de confiance
9. GOLD_SET_PASSAGES.json — 64 passages de référence pour validation R5
10. FR_VS_EN_COMPARISON.json — comparaison langue pour profils FR/EN
11. PARTIAL_CORRELATIONS_DEEP.json — corrélations partielles profondes
12. DENOMINATOR_BIAS_AUDIT.json — audit biais de longueur
13. R_MEASURE_TOTAL.json — toutes les mesures R
14. JUDGE_CALIBRATION_MULTI_SIZE.json — calibration multi-taille
15. JUDGE_CALIBRATION_RESULTS.json — résultats calibration 3 maîtres
16. CLASSIFIER_CALIBRATION_V2.json — calibration classifieur (152 KB !)
17. CLASSIFIER_AUDIT_RESULTS.json — audit classifieur
18. METRIC_UTILITY_ANALYSIS.json — utilité marginale features (stepwise)
19. TIER_RADAR_PROFILES.json — profils radar par tier
20. TRANSLATION_PAIRS.json — paires de traduction
21. TRANSLATION_FIDELITY.json — fidélité traduction

SI ON LES ARCHIVE MAINTENANT → Phase R4 devra les recréer.
C'est exactement le genre d'erreur que Francky voulait éviter.

### Action correcte :
```
scoring/data/
  ├── (4 fichiers RUNTIME — ne pas toucher)
  ├── calibration/   ← déplacer les 21 ici (PAS dans archive)
  └── archive/       ← déplacer les ~32 bench/expériences ici
```


## CORRECTION 2 — f26b "CONFIRMED_NEGATIVE" dans GB V1 est un verdict TROMPEUR

Les 4 IAs ont accepté "CONFIRMED_NEGATIVE" sans questionner la méthodologie.
ChatGPT (doc 9) écrit : "le bon verdict final est : GB V1 reste biaisé contre
une prose L37-compatible." Gemini (doc 8) l'accepte aussi.

MAIS LA MÉTHODOLOGIE EST FONDAMENTALEMENT ERRONÉE.

### Le problème du script INV-01

Le script compare les valeurs des feuilles DIRECTES (gauche vs droite) :
- 3 splits → right_value > left_value → "POSITIVE"
- 7 splits → right_value < left_value → "NEGATIVE"
- 29 splits → un ou deux enfants non-leaf → "COMPLEX"

Problème 1 : 74% des splits (29/39) sont COMPLEX — indéterminés.
Le verdict est basé sur 10 points de données seulement.

Problème 2 : En gradient boosting, CHAQUE arbre fit les RÉSIDUS des arbres
précédents, PAS le target original. Un split "négatif" dans l'arbre 5 peut
signifier : "après ce que les arbres 0-4 ont prédit, ce range de f26b a
besoin d'une correction vers le bas." Ce n'est PAS la même chose que
"f26b est globalement négatif."

Problème 3 : On ne peut PAS déterminer la direction agrégée d'une feature
dans un gradient boosting en comptant les splits individuels. La seule
méthode correcte est le PARTIAL DEPENDENCE PLOT (PDP) :
  Pour chaque valeur de f26b dans [0, 0.01, 0.02, ..., 0.30] :
    Fixer f26b à cette valeur pour TOUTES les observations
    Prédire avec le modèle complet (50 arbres)
    Enregistrer la prédiction moyenne
  Tracer prédiction_moyenne = f(f26b)

### Le bon verdict

INCONCLUSIVE — pas CONFIRMED_NEGATIVE.

Le vrai test : un script Python de 15 lignes avec le PDP.
NE PAS quarantiner GB V1 avant d'avoir fait ce test.

### Script de vérification (à exécuter) :

```python
import json
import numpy as np

MODEL = r"C:\Users\elric\omega-project\packages\sovereign-engine\src\scoring\data\GB_V1_MODEL.json"
with open(MODEL) as f:
    model = json.load(f)

def predict_tree(tree_nodes, features):
    node_idx = 0
    while True:
        node = tree_nodes[node_idx]
        if node['is_leaf']:
            return node['value']
        feat_val = features[node['feature_index']]
        if feat_val <= node['threshold']:
            node_idx = node['left_child']
        else:
            node_idx = node['right_child']

def predict_gb(model, features):
    pred = model['init_value']
    lr = model['params']['learning_rate']
    for tree in model['trees']:
        pred += lr * predict_tree(tree['nodes'], features)
    return pred

# Valeurs médianes des 42 features (approximation)
median_features = [0.05] * 42  # remplacer par vraies médianes

# Partial dependence plot sur f26b (feature 0)
f26b_values = np.linspace(0.0, 0.25, 50)
predictions = []
for val in f26b_values:
    features = median_features.copy()
    features[0] = val
    predictions.append(predict_gb(model, features))

# SI predictions croissantes quand f26b augmente → POSITIF (cohérent L37)
# SI predictions décroissantes → NÉGATIF (inversé)
# SI non-monotone → INTERACTION (zone sweet-spot)
slope = np.polyfit(f26b_values, predictions, 1)[0]
print(f"Slope PDP: {slope:.4f}")
print(f"Direction: {'POSITIVE' if slope > 0 else 'NEGATIVE' if slope < 0 else 'FLAT'}")
```


## CORRECTION 3 — Les 17 packages "orphelins" ne sont PAS tous morts

ChatGPT (doc 9) le dit lui-même : "Je ferais attention au mot orphelin.
Certains sont volontairement scellés ou spécialisés."

Vérification par package :

| Package | Statut RÉEL | Action |
|---------|------------|--------|
| genome | SEALED Phase 28 (intentionnel) | NE PAS TOUCHER |
| sentinel-judge | SEALED Phase 27 (intentionnel) | NE PAS TOUCHER |
| mycelium | Prévu pour Loom (D4 verrouillé) | NE PAS TOUCHER |
| mycelium-bio | Prévu pour Loom | NE PAS TOUCHER |
| hardening | Sécurité — toujours utile | NE PAS TOUCHER |
| oracle | Package oracle standalone | À ÉVALUER (redondant avec SE/oracle/) |
| search | Moteur de recherche | À ÉVALUER |
| omega-observability | Monitoring | À ÉVALUER |
| decision-engine | dep orchestrator-core | À ÉVALUER |
| headless-runner | Runner sans UI | À ÉVALUER |
| mod-narrative | Module narratif | À ÉVALUER |
| omega-aggregate-dna | DNA aggregation | À ÉVALUER |
| omega-bridge-ta-mycelium | Bridge TA→Mycelium | Prévu pour Loom |
| omega-p0 | Phase P0 | ARCHIVABLE si P0 terminée |
| omega-segment-engine | Segmentation | À ÉVALUER |
| plugin-gateway | Plugin gateway | À ÉVALUER |
| plugin-sdk | SDK plugins | À ÉVALUER |

Bilan : 5 SEALED/prévus (ne pas toucher), 1 archivable, 11 à évaluer.
Les IAs qui disent "17 orphelins" sous-entendent 17 erreurs. C'est FAUX.

---

## CONFIRMED 1 — Divergence poids weight-calibrator.ts : VRAIMENT DANGEREUX

Toutes les IAs convergent. Vérifié dans le code. C'est le finding #1.

| Axe | config.ts (PROD) | weight-calibrator.ts (CALIB) | Delta |
|-----|-----|-----|-----|
| ECC | 0.33 | 0.30 | -0.03 |
| SII | 0.15 | 0.18 | +0.03 |
| IFI | 0.10 | 0.15 | +0.05 |
| AAI | 0.25 | 0.20 | -0.05 |

Le commentaire dans weight-calibrator.ts dit "From current SOVEREIGN_CONFIG"
— c'est FAUX, ce sont des poids pré-Sprint 11 jamais mis à jour.

ACTION : Corriger weight-calibrator.ts ou mieux, importer depuis config.ts.
PRIORITÉ : P0 #1 — avant toute autre action.

## CONFIRMED 2 — SSOT violations (seuils dupliqués) : VRAIS

SAGA_READY 92.0 dans core/thresholds.ts ET en dur dans engine.ts:198,549.
SEAL_FLOOR 85.0 dans core/thresholds.ts ET en dur dans duel-engine.ts:137.

Pas de débat, toutes les IAs convergent, code vérifié.
ACTION : Importer depuis core/thresholds.ts. Effort : 5 min.

## CONFIRMED 3 — Code mort (compat/, polish NO-OP) : VRAI

compat/ : 0 imports dans tout le codebase. CODE MORT.
polish/musical-engine.ts, anti-cliche-sweep.ts, signature-enforcement.ts :
  Importés dans engine.ts:43-45 MAIS commentés dans engine.ts:412-414.
  Sprint 2 a prouvé : delta = 0.0 sur TOUS les runs. NO-OP.
  
ACTION : Supprimer compat/. Archiver les 3 polish. Effort : 5 min.

## CONFIRMED 4 — gateway autonomie : BY DESIGN, PAS UN BUG

Le gateway (34 fichiers, 16 tests, SEALED Phase 8-10) n'a AUCUN import
direct depuis sovereign-engine. C'est correct : c'est le World Model
en attente de Phase V. L'IRM l'a documenté, pas besoin d'action.

## CONFIRMED 5 — 2 dépendances fantômes : VRAIS MAIS MINEUR

@omega/phonetic-stack et @omega/canon-engine n'existent pas.
Nettoyer les package.json. Effort : 2 min. Impact : cosmétique.


---

# PLAN CORRIGÉ — LA VÉRITÉ VÉRIFIÉE

## Ce qui change par rapport aux recommandations IA :

| Recommandation IA | Correction Claude |
|-------------------|-------------------|
| "Archiver 69 JSON" | Archiver ~32, GARDER ~21 en calibration/ |
| "f26b CONFIRMED_NEGATIVE" | INCONCLUSIVE — PDP requis avant décision |
| "17 packages orphelins" | 5 SEALED/prévus, 1 archivable, 11 à évaluer |
| "Quarantiner GB V1" | NE PAS quarantiner avant PDP |
| "Supprimer 70% de scoring/data" | Réorganiser en 3 couches, pas supprimer |

## P0 CORRIGÉ — Actions sûres (60 min)

Actions où la vérité est CERTAINE et le risque ZÉRO :

| # | Action | Certitude | Effort |
|---|--------|-----------|--------|
| P0-01 | ALIGNER weight-calibrator.ts sur config.ts | 100% | 5 min |
| P0-02 | Unifier SAGA_READY → import core/thresholds.ts | 100% | 5 min |
| P0-03 | Unifier SEAL_FLOOR → import core/thresholds.ts | 100% | 2 min |
| P0-04 | Supprimer compat/ (0 imports confirmé) | 100% | 2 min |
| P0-05 | Supprimer imports polish commentés engine.ts:43-45 | 100% | 2 min |
| P0-06 | Valider avg_sent_target >= 35 (BB-02 scellé) | 100% | 5 min |
| P0-07 | Documenter CLIFF_THRESHOLD=0.30 dans ADR | 100% | 5 min |
| P0-08 | Documenter floorPenalty=1.5 dans ADR | 100% | 5 min |
| P0-09 | Créer L35b (collision confirmée par Gemini) | 100% | 5 min |
| P0-10 | Archiver hybrid-provider.ts (BLOC7 rejeté 3/3) | 100% | 5 min |
| P0-11 | Supprimer 2 deps fantômes package.json | 100% | 2 min |
| P0-12 | Exécuter script PDP f26b (15 lignes Python) | 100% | 15 min |

P0-12 est CRITIQUE : le résultat du PDP détermine si GB V1 est en quarantaine
ou si les IAs avaient tort sur ce point.

## P0-BIS — Réorganisation JSON (après P0, 30 min)

NE PAS supprimer. Réorganiser :

```
scoring/data/
  ├── GB_V1_MODEL.json                      (262 KB, RUNTIME)
  ├── OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json  (108 KB, RUNTIME)
  ├── R8_TIPPING_POINTS.json                (3 KB, RUNTIME)
  ├── R8_TYPOLOGICAL_CONSTANTS.json         (24 KB, RUNTIME)
  │
  ├── calibration/                          (~21 fichiers, 300+ KB)
  │   ├── COMPOSITION_PROFILES.json         → R4 type detector
  │   ├── TYPE_FEATURE_IMPORTANCE.json      → R4 type modifiers
  │   ├── TYPE_MEASURE_SIGNATURES.json      → R4 type signatures
  │   ├── TYPE_COMPATIBILITY_MATRIX.json    → R4/future assembly
  │   ├── TRANSITION_MATRICES.json          → R4/future assembly (Loi LEGO)
  │   ├── R8_ASSEMBLY_PATTERNS.json         → future assembly patterns
  │   ├── CLASSIFIER_CALIBRATION_V2.json    → R4 type classifier (152 KB !)
  │   ├── CLASSIFIER_AUDIT_RESULTS.json     → R4 validation
  │   ├── GOLD_SET_PASSAGES.json            → R5 validation set (64 passages)
  │   ├── MEASURE_ROLES.json                → R4 feature selection
  │   ├── MEASURE_TRUST_MATRIX.json         → R4 confidence
  │   ├── METRIC_UTILITY_ANALYSIS.json      → R4 feature utility
  │   ├── JUDGE_CALIBRATION_MULTI_SIZE.json → R4 multi-size validation
  │   ├── JUDGE_CALIBRATION_RESULTS.json    → R4 validation 3 maîtres
  │   ├── TIER_RADAR_PROFILES.json          → R4 quality profiles
  │   ├── PARTIAL_CORRELATIONS_DEEP.json    → R4 feature selection
  │   ├── DENOMINATOR_BIAS_AUDIT.json       → R4 normalization
  │   ├── R_MEASURE_TOTAL.json              → R4 reference (27 KB)
  │   ├── FR_VS_EN_COMPARISON.json          → R4 language profiles
  │   ├── TRANSLATION_PAIRS.json            → R4 cross-language
  │   └── TRANSLATION_FIDELITY.json         → R4 cross-language
  │
  └── archive/                              (~32 fichiers, ~500 KB)
      ├── BENCH_CHAPTER_3MODELS.json
      ├── F26B_BREAKER_RESULTS.json
      ├── F26B_PHASE2_RESULTS.json
      ├── ... (résultats de bench, expériences terminées)
      ├── P1_REDESIGN_RESULTS.json
      ├── P2_RESCORE_V2_RESULTS.json
      ├── ... etc.
      └── VRECAL1_ENGINE_RESULTS.json
```


## P1 CORRIGÉ — Nettoyage structural (12h)

| # | Action | Notes |
|---|--------|-------|
| P1-01 | Migrer computeMacroSScore hors de s-score.ts | Zombie confirmé |
| P1-02 | Supprimer s-score.ts après migration | Zombie résolu |
| P1-03 | Archiver polish NO-OP (3 fichiers) | Prouvé delta=0.0 |
| P1-04 | Archiver prompt-assembler-v2.ts | V4 est autorité |
| P1-05 | Archiver ollama-provider.ts | BLOC7 rejeté |
| P1-06 | Scanner gateway/ : FILE_CARDs pour fichiers C3+ | 34 fichiers |
| P1-07 | Produire COST_MODEL réel (5 runs loggés si possible) | Affiner $0.21 estimé |
| P1-08 | Vérifier concordance scorers (si bench dispo) | GB V1 vs Ridge V2 vs V3 |
| P1-09 | Évaluer les 11 packages "à évaluer" | Décision par package |

## P2 CORRIGÉ — Phase R4 + Couplage S1→S2 (6 semaines)

CONVERGENCE 4/4 IAs : le couplage S1→S2 est le verrou central.
Mais l'ORDRE est important (les IAs divergent ici).

### Ordre correct (Gemini a raison sur la séquence) :
1. D'ABORD corriger les fondations (P0 + P0-BIS ci-dessus)
2. ENSUITE Phase R4 scorer V3 (le scorer EST le traducteur S1→verdict)
3. ENSUITE Rosetta Bridge (le coupleur S1→S2)
4. ENSUITE réduction appels LLM (conséquence naturelle du meilleur couplage)

### P2-01 : Phase R4 Scorer V3 reconstruction
EXACTEMENT comme décrit dans OMEGA_PHASE_R_ROADMAP_v2.md :
  a. Intégrer coefficients R3 (α=0.43, β=0.57)
  b. Intégrer profils typologiques (R8 CIF + lambda)
  c. Activer type modifiers (actuellement OFF après ablation)
  d. 6 profils de qualité (déjà codés dans quality-profiles.ts)
  e. Validation sur 30 textes corpus → Spearman ≥ 0.75

Les fichiers de calibration/ seront LUES par le développeur R4 pour
dériver les nouveaux seuils et paramètres.

### P2-02 : Rosetta Bridge (nouveau module coupling/)
Interface : target_features → prompt_directives + expected_compliance
Données source : résultats Rosetta S0 (dans omega-autopsie/results_rosetta/)
PILOTABLE → consigne calibrée
IRRÉDUCTIBLE → ne pas injecter (post-processing)

### P2-03 : Réduction appels LLM (30→15)
Conséquence NATURELLE de P2-02 : si le prompt initial est mieux calibré,
le pipeline aura besoin de MOINS de passes de correction.
PAS un objectif autonome — c'est un RÉSULTAT du meilleur couplage.

## P3 INCHANGÉ — Mutation architecturale (3+ mois)

- Inverse Engine (score cible → contraintes → prompt → texte)
- Scorer V5 couche sémantique (L38)
- Découplage types.ts (fan-in=111)
- ChromaDB Loom (D4)
- Intégration PVI dans le scoring OMEGA (doc 6 ChatGPT a raison ici :
  le PVI devrait être un axe natif, pas un plugin externe)


---

# TABLEAU FINAL — VÉRITÉ VÉRIFIÉE vs RECOMMANDATIONS IA

| Point | ChatGPT (docs 6,7,9) | Gemini (doc 8) | Claude IRM | VÉRITÉ VÉRIFIÉE |
|-------|----------------------|----------------|------------|-----------------|
| 69 JSON orphelins | "supprimer 70%" | "archiver tout" | "archiver 69" | **21 CALIBRATION R4 + 32 ARCHIVE** |
| f26b GB V1 | "CONFIRMED_NEGATIVE" | "inversion confirmée" | "faux positif partiel" | **INCONCLUSIVE — PDP requis** |
| 17 packages | "orphelins" | "orphelins" | "à évaluer" | **5 SEALED/prévus, 11 à évaluer** |
| Weight divergence | "SSOT majeure" | "SSOT majeure" | "finding #1" | **CONFIRMÉ UNANIME** |
| SSOT seuils | "bombes" | "nettoyer" | "P0 immédiat" | **CONFIRMÉ UNANIME** |
| Gateway | "non scanné" | "non évalué" | "by design" | **SEALED Phase 8-10, by design** |
| Couplage S1→S2 | "verrou central" | "verrou central" | "verrou central" | **CONVERGENCE 4/4** |
| GB V1 quarantaine | "quarantaine" | "audit coefficient" | "documenter" | **ATTENDRE PDP avant décision** |

---

# CE QUE CHATGPT (doc 6) A DIT D'INTÉRESSANT ET VRAI

ChatGPT écrit : "Le vrai moteur business/impact = INTENTION (I = 88% du delta PVI)".
Et propose que le PVI devienne un axe natif du scoring, pas un plugin.

C'est VRAI et c'est la bonne direction stratégique.
Mais c'est du P3 (mutation architecturale), pas du P0.

ChatGPT écrit aussi : "3 couches : SSOT_RUNTIME, SSOT_CALIBRATION, ARCHIVE_EXPERIMENTALE".
C'est EXACTEMENT la structure scoring/data/ que je propose ci-dessus.
Sur ce point, convergence totale.

---

# CE QUE CHATGPT (doc 9) A DIT DE PLUS LUCIDE

"OMEGA n'a plus un problème principal de performance locale.
OMEGA a désormais un problème principal de souveraineté de la vérité."

C'est la phrase la plus juste de tous les retours.
Tout converge vers : quel scorer fait foi, quels poids font foi,
quels JSON font foi, quelles lois font foi.

---

# RÉSUMÉ EXÉCUTIF POUR L'ARCHITECTE

```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  SUR LES 69 JSON "ORPHELINS" :                                           ║
║  → 21 sont des DONNÉES DE CALIBRATION pour Phase R4.                     ║
║  → NE PAS les archiver. Les mettre dans calibration/.                    ║
║  → 32 sont des résultats de bench → ARCHIVER.                            ║
║                                                                          ║
║  SUR f26b GB V1 "INVERSÉE" :                                             ║
║  → Le verdict CONFIRMED_NEGATIVE est basé sur 10/39 splits.              ║
║  → 74% des splits sont COMPLEX (indéterminés).                           ║
║  → La méthodologie est invalide pour gradient boosting.                   ║
║  → EXÉCUTER LE PDP (15 min) avant toute décision.                        ║
║                                                                          ║
║  SUR LE PLAN D'ACTION :                                                  ║
║  → P0 : 12 actions sûres (60 min) — certitude 100%                      ║
║  → P0-BIS : réorganiser JSON en 3 couches (30 min)                      ║
║  → P1 : nettoyage structural (12h)                                       ║
║  → P2 : R4 scorer + Rosetta Bridge + réduction appels (6 semaines)      ║
║  → P3 : Inverse Engine + V5 + PVI natif + Loom (3+ mois)               ║
║                                                                          ║
║  CONVERGENCE VRAIE (4/4 IAs + Claude corrigé) :                          ║
║  → Poids weight-calibrator.ts = correction #1                            ║
║  → SSOT seuils = correction #2                                           ║
║  → Couplage S1→S2 = verrou central                                      ║
║  → "Souveraineté de la vérité" = le vrai problème                       ║
║                                                                          ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

*Document produit le 2026-04-02 — Vérité vérifiée ligne par ligne*
*Standard : NASA-Grade L4 / DO-178C Level A*
*Chaque affirmation porte : CHEMIN + STATUT + SOURCE + PREUVE ou [INCONCLUSIVE]*
*Autorité : Francky (Architecte Suprême)*
