# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — PHASE S0 : ÉPREUVE DE VÉRITÉ DU LANGAGE LLM
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-20
# HEAD sortie  : (à tagger s0-language-calibration-complete)
# Branche      : phase-w-mixer
# Tests        : 1859 GREEN
# API calls    : 370
# Standard     : NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. CE QUI A ÉTÉ FAIT

## S0.1 — Audit f5c ✅
- Bug DOUBLE DÉFAUT confirmé (substring matching + dénominateur incohérent)
- Fix appliqué : ACTION_VERB_FORMS (70 formes exactes, Set.has())
- 1859 tests GREEN (+7 vs 1852)

## S0.2 — Bench pilotables ✅ (100 API calls)
- 4/4 CORE SOLIDES : f29d=0.80, f24e=1.00, f15b=1.00, f16a=1.00

## S0.3 — Bench contradictoire ✅ (240 API calls)
- Principe #6 VALIDÉ : 5/8 features battues ou égalées par humain/hybride
- C (hybride métriques) gagne 4/8 : f29d, f15b, f16a, f25g
- B (humain) gagne 1/8 : f24e
- A (LLM) gagne 3/8 : f17 (ILLUSION), f35c, f36c

## S0.4 — Bench contournables ✅ (30 API calls)
- f27d_modal : S3 (hybride) gagne, mean=0.594 (+117% vs baseline)
- f5c_action : S2 (humain) gagne, mean=0.426 MAIS R6 chute -7.7 pts

## S0.5 — Micro-chirurgie ⚠️ (0 API calls — bug script)
- Extraits P2 ont file+offset, pas texte inline
- Script cherchait `passage || text` → 0 passages trouvés
- Non bloquant : validé en P3 (+1.95 pts Proust)

## S0.6 — Classification ✅
- 7 SOLIDES, 0 PROMETTEUSE, 0 EXPÉRIMENTALE, 1 ILLUSION

## S0.7 — Matrice Rosetta v1 ✅
- rosetta_claude-sonnet-4-20250514_v1.json créé (3 couches)

## S0.8 — Rapport ✅
- OMEGA_S0_CALIBRATION_REPORT.md

---

# 2. DÉCOUVERTE CENTRALE

**"Donnez-lui des MÉTRIQUES, pas des labels."**

Les instructions avec cibles chiffrées (variante C hybride) battent les instructions
vagues du LLM dans 4/8 features. Le LLM ne se connaît pas parfaitement (Principe #6
confirmé sur 370 tests).

---

# 3. CLASSIFICATION FINALE

| Feature | Catégorie | Instruction gagnante |
|---------|-----------|---------------------|
| f29d_ttr | SOLIDE | C : "MÉTRIQUE : ratio > 0.75 / 100 mots" |
| f24e_contrast | SOLIDE | B : "1/3 < 8 mots, 1/3 > 25 mots" |
| f15b_compression | SOLIDE | C : "MÉTRIQUE : aucun bigramme > 2×" |
| f16a_bigram | SOLIDE | C : "MÉTRIQUE : > 90% bigrammes uniques" |
| f25g_description | SOLIDE | C : "MÉTRIQUE : ≥ 8 mots sensoriels / 100" |
| f17_knife | ILLUSION | NON PILOTABLE (taux 0.20) |
| f35c_hook | SOLIDE | A : "Accroche qui crée de la tension" |
| f36c_cliff | SOLIDE | A : "Suspense ou incomplétude" |

---

# 4. FICHIERS MODIFIÉS/CRÉÉS

## Code
| Fichier | Action |
|---------|--------|
| src/scoring/text-features.ts | FIX S0.1 (ACTION_VERB_FORMS) |
| scripts/rosetta-s0-calibration.ts | CRÉÉ (657 lignes) |

## Données (omega-autopsie/results_rosetta/s0/)
| Fichier | Taille |
|---------|--------|
| s01_audit_f5c.json | Audit |
| s02_bench_pilotables.json | 100 tests |
| s03_bench_contradictoire.json | 240 tests |
| s04_bench_contournables.json | 30 tests |
| s05_bench_micro_chirurgie.json | 0 tests (bug) |
| s06_classification_regles.json | Classification |
| rosetta_claude-sonnet-4-20250514_v1.json | Matrice v1 |

## Documentation
| Fichier | Contenu |
|---------|---------|
| docs/OMEGA_S0_CALIBRATION_REPORT.md | Rapport complet |
| docs/SESSION_SAVE_S0.md | Ce fichier |

---

# 5. MESSAGE DE REDÉMARRAGE

```
OMEGA SESSION — POST-S0 (Phase S1 : Profileur V1)

Dernier état : SESSION_SAVE_S0
HEAD : s0-language-calibration-complete (tag à créer)
Branche : phase-w-mixer
Tests : 1859 GREEN

CONTEXTE :
  S0 COMPLET — 370 API calls, 7 SOLIDES, 1 ILLUSION
  Principe #6 VALIDÉ : hybride métriques bat LLM 4/8
  Matrice Rosetta v1 créée
  Fix f5c appliqué (1859 tests)
  Micro-chirurgie S0.5 NON EXÉCUTÉE (bug script, à fixer en S1)

OBJECTIF PHASE S1 :
  1. Fixer S0.5 (ajouter reExtractPassage())
  2. Intégrer 7 instructions SOLIDES dans prompt-assembler
  3. Implémenter PROFILEUR V1 (composition + alignment + feasibility)
  4. Bench contrôlé : baseline vs prompt optimisé
  5. Go/No-Go injection prod

DOCUMENTS À LIRE :
  docs/OMEGA_S0_CALIBRATION_REPORT.md
  docs/SESSION_SAVE_S0.md
  results_rosetta/s0/s06_classification_regles.json
  results_rosetta/s0/rosetta_claude-sonnet-4-20250514_v1.json

PRINCIPES ROSETTA :
  #1-#5 inchangés
  #6 CONFIRMÉ : "Donnez-lui des MÉTRIQUES, pas des labels"
  #7 NOUVEAU : f17_knife_count = ILLUSION. Ne pas injecter.

Architecte Suprême : Francky
IA Principal : Claude
```

---

*SESSION_SAVE — S0 complète — 2026-03-20*
*Standard NASA-Grade L4 / DO-178C Level A*
*370 API calls. 7 SOLIDES. 1 ILLUSION. Principe #6 VALIDÉ.*
*"Donnez-lui des MÉTRIQUES, pas des labels" — S0*
