# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — CLAUDE CODE MEGA-PROMPT — PHASE R4 REVALIDATION
#   "Scorer V3 — Activation type modifiers + validation post-P0+P1"
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   Date         : 2026-04-02
#   HEAD entrant : bbc67be6 (post SESSION_SAVE DEFINITIF)
#   Branche      : phase-r-metrology-rebuild
#   Standard     : NASA-Grade L4 / DO-178C Level A
#   Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   CONTEXTE :
#   Phase R4 a été implémentée dans la session marathon 2026-03-19.
#   Le code existe (multi-stage-scorer V1/V2/V3, type detector, 6 profils).
#   MAIS : type modifiers OFF (ablation +0.06), Spearman 0.548 (cible 0.75).
#   P0+P1 ont corrigé : weight-calibrator aligné, SSOT unifié, s-score migré.
#
#   MISSION : Revalider le scorer post-corrections + activer type modifiers
#   + validation sur corpus + rapport d'autorité des scorers.
#
#   RÈGLE : Vérifier 2 fois avant de modifier. Tests GREEN à chaque étape.
#   Python 3.11 : C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe
#
# ═══════════════════════════════════════════════════════════════════════════════

# CHEMINS
REPO     = C:\Users\elric\omega-project
SE_SRC   = packages\sovereign-engine\src
SCORING  = packages\sovereign-engine\src\scoring
CALIB    = packages\sovereign-engine\src\scoring\data\calibration
PY311    = C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe
CORPUS   = omega-autopsie\results_r1


# ═══════════════════════════════════════════════════════════════════════════════
# INVENTAIRE SCORERS — COMPRENDRE AVANT D'AGIR
# ═══════════════════════════════════════════════════════════════════════════════

Avant toute modification, LIRE et DOCUMENTER l'état de chaque scorer :

## Scorers existants dans src/scoring/

| Fichier | Version | Phase | Méthode | Spearman |
|---------|---------|-------|---------|----------|
| multi-stage-scorer.ts | V1 | R4 | R3 coefficients, LOCAL+ARC, α=0.43/β=0.57 | ~0.548 |
| multi-stage-scorer-v2.ts | V2 | R5 | Ridge, 11 discriminant + 5 inversés | ? |
| multi-stage-scorer-v3.ts | V3 | R6 | Ridge + depth + interactions, λ=50 | 0.52 |
| multi-scale-scorer.ts | R7 | R7+P2 | GB V1, multi-fenêtre endurance | ? |
| gb-scorer.ts + gb-inference.ts | GB V1 | P0 | Gradient Boosting 50 arbres 42 features | 0.79 (corpus) |

## Aussi utilisé en production (engine.ts) :

| Module | Rôle | Utilisé par |
|--------|------|-------------|
| oracle/aesthetic-oracle.ts | V3 judge (9 axes + 5 macro-axes LLM) | engine.ts étape 10,15 |
| oracle/macro-axes.ts | ECC/RCI/SII/IFI/AAI (poids config.ts) | aesthetic-oracle |
| oracle/s-oracle-v2.ts | scoreV2 (legacy 9-axes weighted) | sovereign-pipeline offline |

## Question clé pour R4 :
Quel scorer fait AUTORITÉ pour quel contexte ?
  - engine.ts LIVE : aesthetic-oracle V3 (LLM-based axes) → DÉCISIONNEL
  - bench OFFLINE : multi-stage-scorer V1/V2/V3 → COMPARATIF
  - GB V1 : microbench uniquement (PDP a prouvé cohérence L37)

LIRE chaque scorer pour comprendre les différences.

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 0 — SNAPSHOT + TESTS
# ═══════════════════════════════════════════════════════════════════════════════

1. `git rev-parse HEAD` → attendu bbc67be6
2. `cd packages\sovereign-engine && npx vitest run` → attendu 2022 passed
3. Si FAIL → STOP TOTAL


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION R4-01 — VALIDATION CROSS-SCORER SUR CORPUS (Python)
# Livrable : docs/irm/R4_SCORER_VALIDATION.json
# ═══════════════════════════════════════════════════════════════════════════════

## Objectif
Scorer 30 textes du corpus (15 FR + 15 EN, mix tiers S/A/B/C/D) avec
les 3 scorers multi-stage (V1/V2/V3) et comparer avec le tier humain.

## Méthode
Écrire un script Python qui :
1. Charge 30 fichiers de résultats du corpus (dans omega-autopsie/results_r1/)
2. Pour chaque texte, extrait les features (déjà calculées dans les JSON résultats)
3. Appelle chaque scorer TS via un script Node.js wrapper
   OU utilise directement les coefficients en Python (plus simple)
4. Compare le score de chaque scorer avec le tier humain connu

ALTERNATIVE PLUS SIMPLE (recommandée) :
  Les scorers V1/V2/V3 sont des formules linéaires (Ridge regression).
  On peut les réimplémenter en 20 lignes de Python chacun.
  Les coefficients sont dans les fichiers .ts (hardcodés) ou dans les JSON.

## Script Python (squelette)

```python
# Fichier : scripts/r4_validation.py
import json, os, glob
import numpy as np
from scipy import stats

RESULTS_DIR = r"C:\Users\elric\omega-project\omega-autopsie\results_r1"
COEFFS_FILE = r"C:\Users\elric\omega-project\packages\sovereign-engine\src\scoring\data\OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json"

# 1. Charger les coefficients R3
with open(COEFFS_FILE) as f:
    coeffs = json.load(f)

# 2. Charger 30 textes (15 FR + 15 EN, mix tiers)
# Lister les fichiers dans results_r1/, trouver ceux avec tier_label
results = []
for fp in sorted(glob.glob(os.path.join(RESULTS_DIR, "*.json")))[:30]:
    with open(fp) as f:
        data = json.load(f)
    # Extraire features, tier, language
    if 'features' in data and 'tier_label' in data:
        results.append(data)

# 3. Score V1 (multi-stage R3 coefficients)
def score_v1(features, word_count):
    # Implémentation simplifiée du multi-stage-scorer.ts
    local_weights = coeffs['weight_table'].get('LOCAL_600', {})
    arc_weights = coeffs['weight_table'].get('ARC_2500', {})
    
    local_score = sum(
        features.get(feat, 0) * entry['weight_effective']
        for feat, entry in local_weights.items()
        if features.get(feat) is not None
    )
    arc_score = sum(
        features.get(feat, 0) * entry['weight_effective']
        for feat, entry in arc_weights.items()
        if features.get(feat) is not None
    )
    
    alpha = 0.43
    beta = 0.57
    return alpha * local_score + beta * arc_score

# 4. Comparer avec les tiers humains
tier_to_num = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}
human_tiers = [tier_to_num.get(r.get('tier_label', 'C'), 3) for r in results]
v1_scores = [score_v1(r['features'], r.get('word_count', 600)) for r in results]

spearman_v1, pval_v1 = stats.spearmanr(human_tiers, v1_scores)
print(f"V1 Spearman: {spearman_v1:.4f} (p={pval_v1:.4e})")

# 5. Produire le rapport
output = {
    "date": "2026-04-02",
    "corpus_size": len(results),
    "scorers": {
        "V1_multi_stage": {"spearman": round(spearman_v1, 4), "p_value": round(pval_v1, 6)},
    },
    "target_spearman": 0.75,
    "texts": [{"file": r.get("file",""), "tier": r.get("tier_label",""), "v1_score": round(s,2)} 
              for r, s in zip(results, v1_scores)]
}

with open(r"C:\Users\elric\omega-project\docs\irm\R4_SCORER_VALIDATION.json", 'w') as f:
    json.dump(output, f, indent=2)
```

NOTE : Ce script est un SQUELETTE. Claude Code devra l'adapter en fonction
de la structure réelle des fichiers dans results_r1/. LIRE les fichiers
d'abord pour comprendre le format (features, tier_label, etc.).

Si les features ne sont PAS pré-calculées dans results_r1/ :
  → Utiliser OMEGA_METROLOGIE_EMPIRIQUE_v1.json (25 MB dans results_r1/)
  → Ou charger les features depuis les fichiers individuels


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION R4-02 — EXPÉRIMENTATION TYPE MODIFIERS
# Livrable : docs/irm/R4_TYPE_MODIFIERS_EXPERIMENT.json
# ═══════════════════════════════════════════════════════════════════════════════

## Contexte
Les type modifiers sont OFF dans multi-stage-scorer.ts (paramètre applyTypeModifiers=false).
L'ablation précédente montrait +0.06 impact (MINOR). Mais c'était AVANT P0+P1.
Les données de calibration sont maintenant dans scoring/data/calibration/ :
  - TYPE_FEATURE_IMPORTANCE.json (corrélations feature × type)
  - R8_TYPOLOGICAL_CONSTANTS.json (CIF + lambda par type × feature, RUNTIME)
  - COMPOSITION_PROFILES.json (profils GB par type)

## Expérience
1. Prendre les mêmes 30 textes que R4-01
2. Pour chaque texte, classifier le type (passage-type-detector.ts ou passage-classifier.ts)
3. Scorer AVEC type modifiers ON
4. Scorer SANS type modifiers (résultats R4-01)
5. Comparer les Spearman

## Implémentation
Lire multi-stage-scorer.ts pour comprendre comment applyTypeModifiers fonctionne.
Le CoefficientsLoader.getTypeModifier(feature, passageType) charge les modifiers
depuis OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json (champ type_modifiers).

Modifier le script R4-01 pour ajouter :
  - score_v1_with_type(features, word_count, passage_type)
  - Comparer spearman_without vs spearman_with

## Décision automatique
SI spearman_with > spearman_without + 0.02 :
  → Recommander activation type modifiers
SI spearman_with ≈ spearman_without (±0.02) :
  → Type modifiers ne changent rien (confirme ablation)
SI spearman_with < spearman_without :
  → Type modifiers DÉGRADENT → garder OFF

Écrire le résultat et la recommandation dans R4_TYPE_MODIFIERS_EXPERIMENT.json.

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION R4-03 — RAPPORT D'AUTORITÉ DES SCORERS
# Livrable : docs/irm/R4_SCORER_AUTHORITY.md
# ═══════════════════════════════════════════════════════════════════════════════

## Objectif
Produire le document définitif : quel scorer fait foi dans quel contexte.

## Structure du rapport

```markdown
# OMEGA — Registre d'Autorité des Scorers

## Contexte décisionnel
| Contexte | Scorer autorité | Justification |
|----------|----------------|---------------|
| engine.ts LIVE (production) | AestheticOracle V3 (LLM-based) | 9 axes + 5 macro-axes |
| Bench OFFLINE | multi-stage-scorer V? (le meilleur Spearman) | Ridge empirique |
| Microbench ≤600w | GB V1 (PDP +0.63, cohérent L37) | 42 features |
| Calibration | multi-stage-scorer V1 (R3 coefficients) | Confiance affichée |
| Phase R5 validation | [le gagnant de R4-01] | Spearman mesuré |

## Scorers actifs
| Scorer | Fichier | Spearman | Statut |
|--------|---------|----------|--------|
| V1 | multi-stage-scorer.ts | [R4-01] | ACTIF |
| V2 | multi-stage-scorer-v2.ts | [R4-01] | ACTIF/ARCHIVE |
| V3 | multi-stage-scorer-v3.ts | [R4-01] | ACTIF/ARCHIVE |
| Multi-scale | multi-scale-scorer.ts | [R4-01] | ACTIF/ARCHIVE |
| GB V1 | gb-scorer.ts | 0.79 (corpus) | MICROBENCH ONLY |
| Aesthetic V3 | aesthetic-oracle.ts | N/A (LLM-based) | PRODUCTION LIVE |

## Recommandation
Le scorer avec le meilleur Spearman sur les 30 textes devient le juge
AUTORITÉ pour le bench offline. Les autres sont archivés ou gardés en
shadow mode.

## Type modifiers
[Résultat R4-02] : ACTIVÉS / GARDÉS OFF
```

Écrire dans docs/irm/R4_SCORER_AUTHORITY.md


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION R4-04 — ACTIVER TYPE MODIFIERS (si R4-02 le recommande)
# ═══════════════════════════════════════════════════════════════════════════════

## Condition : SEULEMENT si R4-02 conclut spearman_with > spearman_without + 0.02

## AVANT de modifier :
Lire multi-stage-scorer.ts, trouver le paramètre applyTypeModifiers.
Vérifier qu'il est bien à false par défaut.

## MODIFICATION :
Changer le default de false à true :
```typescript
score(features: Record<string, number>, options: ScoringOptions): MultiStageScore {
    const { ..., applyTypeModifiers = true } = options;  // était false
```

Ajouter un commentaire :
```typescript
    // R4 revalidation 2026-04-02: type modifiers activés
    // Résultat R4-02: spearman +X.XX avec type modifiers
```

## Si R4-02 conclut "garder OFF" :
NE PAS modifier. Documenter dans R4_SCORER_AUTHORITY.md.

## APRÈS modification :
Tests → 2022 passed.

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION R4-05 — TYPOLOGICAL NORMALIZER : VÉRIFIER INTÉGRATION
# ═══════════════════════════════════════════════════════════════════════════════

## Objectif
Vérifier que typological-normalizer.ts utilise correctement les données R8.

## Méthode
1. Lire typological-normalizer.ts en entier
2. Vérifier qu'il charge R8_TYPOLOGICAL_CONSTANTS.json (RUNTIME, pas dans calibration/)
3. Vérifier que les 3 couches (ADDITIVE, LAMBDA, GAMMA) sont implémentées
4. Vérifier que les 5 types correspondent aux 5 du passage-type-detector

## Si divergence trouvée → documenter dans R4_SCORER_AUTHORITY.md
## Si tout est cohérent → noter "VERIFIED" dans R4_SCORER_AUTHORITY.md

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION R4-06 — BENCH COMPARATIF LIVE vs OFFLINE (si possible)
# ═══════════════════════════════════════════════════════════════════════════════

## Objectif
Comparer le score AestheticOracle V3 (LIVE, LLM-based) avec le meilleur
multi-stage-scorer (OFFLINE, CALC-based) sur les mêmes textes.

## Méthode
Chercher dans packages/sovereign-engine/sessions/ les résultats de bench
récents qui contiennent BOTH le V3 score et un multi-stage score.

Si aucune session n'a les deux :
  Documenter "[DONNÉES INSUFFISANTES — bench dual-scorer requis]"
  Proposer le protocole pour le bench dual.

Si des données existent :
  Calculer la corrélation entre V3 (LLM) et multi-stage (CALC).
  C'est le "pont" entre S1 (mesure CALC) et le verdict LIVE (LLM).

## Livrable : Intégrer dans R4_SCORER_AUTHORITY.md section "Pont V3 ↔ multi-stage"


# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT FINAL
# ═══════════════════════════════════════════════════════════════════════════════

## Tests finaux
```powershell
Set-Location C:\Users\elric\omega-project\packages\sovereign-engine
npx vitest run
```

## Nettoyer scripts temporaires
```powershell
Remove-Item "C:\Users\elric\omega-project\scripts\r4_validation.py" -ErrorAction SilentlyContinue
```

## Commit
```
docs+feat(r4): Phase R4 revalidation — scorer authority + type modifiers

R4-01: Validation cross-scorer sur 30 textes corpus (FR+EN mix tiers)
       V1 Spearman: [X.XX], V2: [X.XX], V3: [X.XX]
R4-02: Expérimentation type modifiers ON vs OFF
       Résultat: [ACTIVÉS/GARDÉS OFF] (delta: [+X.XX])
R4-03: Rapport d'autorité des scorers (docs/irm/R4_SCORER_AUTHORITY.md)
R4-04: Type modifiers [activés/inchangés] dans multi-stage-scorer.ts
R4-05: Typological normalizer vérifié [OK/DIVERGENCE]
R4-06: Bench comparatif LIVE vs OFFLINE [données/protocole]

Tests: 2022 passed, 0 failed
```

```powershell
Set-Location C:\Users\elric\omega-project
git add -A
git commit -F commit_msg.txt
git tag omega-r4-revalidation-v1
git push origin phase-r-metrology-rebuild --tags
```

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKLIST FINALE — 10 CONTRÔLES
# ═══════════════════════════════════════════════════════════════════════════════

[ ] 1. R4_SCORER_VALIDATION.json produit (30 textes scorés × 3 scorers)
[ ] 2. Spearman V1 mesuré et documenté
[ ] 3. Spearman V2 mesuré et documenté
[ ] 4. Spearman V3 mesuré et documenté
[ ] 5. R4_TYPE_MODIFIERS_EXPERIMENT.json produit (ON vs OFF)
[ ] 6. R4_SCORER_AUTHORITY.md produit (tableau d'autorité)
[ ] 7. Type modifiers : décision documentée (activés ou OFF)
[ ] 8. Typological normalizer : vérifié
[ ] 9. Bench LIVE vs OFFLINE : documenté (données ou protocole)
[ ] 10. Tests = 2022 passed, 0 FAIL

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLE D'OR
# ═══════════════════════════════════════════════════════════════════════════════
#
# Si les données corpus ne sont pas dans le format attendu → ADAPTER le script.
# Si un scorer ne peut pas être exécuté → documenter POURQUOI et scorer les autres.
# Si Spearman < 0.50 pour TOUS les scorers → c'est un FINDING, pas un échec.
# Si doute → [DOUTE], ne pas modifier, Francky décide.
#
# L'objectif n'est pas d'atteindre 0.75 dans cette passe.
# L'objectif est de MESURER où on en est et DÉCIDER qui fait autorité.
#
# "Ce qui n'est pas mesuré n'est pas acceptable."
# Standard : NASA-Grade L4 / DO-178C Level A
# Autorité : Francky (Architecte Suprême)
# ═══════════════════════════════════════════════════════════════════════════════
