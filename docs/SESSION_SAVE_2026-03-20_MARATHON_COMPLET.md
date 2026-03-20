# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — 2026-03-20 MARATHON COMPLET
# S0 → P5 → DIAGNOSTIC SCORER → PHASE R LANCÉE
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. CE QUI A ÉTÉ FAIT AUJOURD'HUI

## S0 — Épreuve de vérité du langage LLM ✅
- Fix f5c (substring → exact match, +7 tests → 1859 GREEN)
- 370 API calls, 8 features testées, 3 variantes
- 7 SOLIDES, 1 ILLUSION (f17_knife)
- Principe #6 CONFIRMÉ : hybride métriques bat LLM 4/8
- Commit 48bf23cf, tag s0-language-calibration-complete

## P5 — Test Scribe Éduqué (6 modèles) ✅
- Prompt P5 de 1400 mots (persona + anti-règles + éducation)
- 6 modèles testés : Claude Code, Claude Opus, Gemini 3.1, GPT 5.4, DeepSeek, Perplexity
- Résultat : corridor 48-56 R6 (DeepSeek à 48, GPT à 56)
- f17 EXPLOSÉ de 0-2 à 49-95 → mur injectable
- f15b/f16a CHUTENT en compensation → couplage PROUVÉ
- f28d = 0 partout sauf DeepSeek (0.009) et Perplexity (0.010)
- Plafond CONFIRMÉ comme universel sur 6 modèles

## P5-CORRECTION — Chirurgie LLM-sur-LLM ✅
- 4 LLM corrigent le texte GPT 5.4
- Résultat : 0 gain, légèrement pire (-0.28 à -0.98)
- f28d reste à 0 → SIL non injectable par correction

## DIAGNOSTIC SCORER — TEST DÉCISIF ✅ (RÉSULTAT CRITIQUE)
- Extraits 500 mots : Flaubert vs Riviera vs GPT 5.4
- RÉSULTAT : GPT 5.4 = 61.56 / Riviera = 53.45 / FLAUBERT = 50.52
- **LE SCORER MET GPT AU-DESSUS DE FLAUBERT**
- Cause : composite = distance au centre, pas qualité
- Le LLM est conformiste → récompensé. Flaubert est extrême → pénalisé

## RIVIERA — Révélation ✅
- Riviera = Claude Sonnet 3.5, quasi zéro consigne ("écris bien, du suspens")
- R6 = 54.79 → MÊME corridor que les LLM P5 ultra-promptés
- Le prompt P5 de 1400 mots ne fait PAS MIEUX que "relis et améliore"

## DÉCISION : PHASE R — REFONDATION MÉTROLOGIQUE ✅
- R6 composite GELÉ — invalide comme juge littéraire
- 49 features individuelles CONSERVÉES sous audit
- Plan complet rédigé : 6 étapes, 665+ œuvres
- Tour de table 4 IAs : convergence totale
- Prompt Claude Code prêt pour R-1

---

# 2. ÉTAT ACTUEL

| Attribut | Valeur |
|----------|--------|
| HEAD | post s0-language-calibration-complete |
| Branche cible | phase-r-metrology-rebuild |
| Tests | 1859 GREEN (scorer v1 gelé) |
| R6 composite | **GELÉ — INVALIDE** |
| Phase en cours | **R — Refondation Métrologique** |
| Étape courante | R-1 (extraction corpus) |

---

# 3. FICHIERS CLÉS

| Fichier | Contenu |
|---------|---------|
| docs/OMEGA_PHASE_R_PLAN.md | Plan complet Phase R (6 étapes) |
| docs/OMEGA_PHASE_R_PROMPT_CLAUDE_CODE.md | Prompt pour R-1 + R-2 |
| docs/OMEGA_S0_CALIBRATION_REPORT.md | Rapport S0 |
| docs/OMEGA_PROMPT_P5_V2_FUSION.md | Prompt P5 Scribe Éduqué |
| docs/OMEGA_PROMPT_P5_CORRECTION.md | Prompt correction |
| results_rosetta/s0/p5_test/p5_results_all.json | Scores 12 fichiers |
| results_rosetta/s0/p5_test/scorer_diagnostic.json | Test Flaubert vs LLM |

---

# 4. CORPUS DISPONIBLE

| Source | Quantité | Format |
|--------|----------|--------|
| gutenberg_cache/ | 200 | .txt (prêts) |
| Downloads/livre/ | 255 | .epub (à convertir) |
| Downloads/livre/ | 209 | .pdf (à convertir) |
| P5 test | 6 | .txt (LLM promptés) |
| Riviera | 1 | .txt (LLM sans consigne) |
| **TOTAL** | **671** | |

---

# 5. DÉCOUVERTES DE LA JOURNÉE (classées par importance)

1. **Le scorer est cassé** — GPT > Flaubert = composite invalide
2. **Le plafond 54-56 est universel** — 6 modèles, même corridor
3. **f17 est injectable** — de 0-2 à 49-95, mur brisé
4. **Le couplage est prouvé** — f17↑ → f15b↓ sur 6 modèles
5. **Le prompt ne fait pas de différence** — "relis et améliore" = P5 1400 mots
6. **f28d (SIL) est quasi mort** — 0 sur 4/6 modèles, traces sur 2
7. **Les features individuelles marchent** — c'est l'agrégation qui ment

---

# 6. MESSAGE DE REDÉMARRAGE

```
OMEGA SESSION — PHASE R (REFONDATION MÉTROLOGIQUE)

HEAD : (post-commit Phase R)
Branche : phase-r-metrology-rebuild
Tests : 1859 GREEN (scorer v1 gelé)

CONTEXTE CRITIQUE :
  Le scorer R6 composite a été INVALIDÉ.
  Test décisif : GPT 5.4 score 61.56, Flaubert score 50.52.
  Le composite mesure la conformité au centre, pas la qualité.
  DÉCISION : Phase R — refondation complète de l'agrégation.

ÉTAT R :
  R-1 (extraction corpus 665+ œuvres) : [EN COURS]
  R-2 (classification en tiers S/A/B/C/D) : [EN ATTENTE]
  R-3 (mesure massive 49 features) : [EN ATTENTE]
  R-4 (audit features discriminantes/trompeuses) : [EN ATTENTE]
  R-5 (nouveau composite) : [EN ATTENTE]
  R-6 (validation croisée) : [EN ATTENTE]

DOCUMENTS À LIRE :
  docs/OMEGA_PHASE_R_PLAN.md
  docs/OMEGA_PHASE_R_PROMPT_CLAUDE_CODE.md
  results_rosetta/s0/p5_test/scorer_diagnostic.json

RÈGLE ABSOLUE :
  R6 composite = GELÉ. Aucune décision basée dessus.
  Aucun prompt engineering tant que R-6 n'est pas PASS.

Architecte Suprême : Francky
IA Principal : Claude
```

---

*SESSION_SAVE — Marathon complet 2026-03-20*
*S0 scellée. P5 testée. Scorer invalidé. Phase R lancée.*
*"Réparer le tribunal avant de juger la prose"*
