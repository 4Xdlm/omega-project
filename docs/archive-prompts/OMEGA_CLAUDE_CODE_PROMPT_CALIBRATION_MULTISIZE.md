# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — ÉTALONNAGE MULTI-TAILLE + TESTS API
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-23
# HEAD entrant : b6170c20 (tag r-diagnostic-total-complete)
# Branche      : phase-r-metrology-rebuild
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTE
#
# L'étalonnage sur 3 maîtres × 500 mots a montré que Flaubert = 4.09,
# Proust = 4.14, McCarthy = 3.70 — tous A-tier, PAS S-tier.
# Le seuil S = 4.5 est peut-être calibré pour des fenêtres longues (roman)
# et inadapté aux extraits courts (500 mots = nos scènes de bench).
#
# Ce prompt étalonne le juge sur 10+ maîtres × 4 tailles différentes
# pour déterminer si le score GB V1 dépend de la longueur du passage.
# Il lance ensuite les tests API (Intent Trace + FR vs EN).
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : NE PAS modifier le scoring — lecture seule
R-02 : 1911 tests doivent PASS
R-03 : Chronographe avec timestamps sur TOUT
R-04 : Les tests API nécessitent ANTHROPIC_API_KEY

# ═══════════════════════════════════════════════════════════════════════════════
# PARTIE 1 — ÉTALONNAGE MULTI-TAILLE (0 appels API, ~15 min)
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 — Les 10 maîtres de référence

Corpus path : omega-autopsie/corpus_r/txt/

### Maîtres FR natifs
1. flaubert_bovary_14155.txt
2. flaubert_salammbo_10884.txt
3. proust_swann_2650.txt
4. hugo_miserables_17489.txt
5. stendhal_chartreuse_7524.txt
6. maupassant_bel_ami_3088.txt
7. balzac_illusions_13141.txt

### Maîtres EN natifs
8. pdf_blood_meridian_cormac_mccarthy.txt
9. pdf_mrs_dalloway_virginia_woolf.txt
10. joyce_ulysse_4300.txt

### Contrôle C-tier (texte commercial/faible pour comparaison)
11. cinquante_nuances_de_grey_french_edition_el_james.txt
12. fourth_wing_tome_2_french_edition_rebecca_yarros.txt

## 1.2 — Les 4 tailles de fenêtre

Pour CHAQUE texte ci-dessus, extraire 4 passages de tailles différentes :

| Taille | Définition | Quoi |
|--------|-----------|------|
| **SHORT** | ~500 mots (~20 phrases) | Premiers 500 mots après le début du texte |
| **MEDIUM** | ~1000 mots (~40 phrases) | Premiers 1000 mots |
| **LONG** | ~2000 mots (~80 phrases) | Premiers 2000 mots |
| **FULL_WINDOW** | 20 phrases exactes | Les 20 premières phrases (la taille du corpus GB V1) |

Pour trouver le "début du texte" :
- Sauter les en-têtes Gutenberg (chercher "***" ou "CHAPITRE" ou le premier paragraphe narratif)
- Prendre le texte à partir de la première vraie prose

## 1.3 — Mesurer chaque passage dans le GB V1

Pour chaque passage (12 textes × 4 tailles = 48 mesures) :

```typescript
// Utiliser le même pipeline que le UnifiedBench
const features = computeTextFeatures(passageText);
const spacyFeatures = await computeSpacyFeatures(passageText);
const allFeatures = { ...features, ...spacyFeatures };
const gbScore = gbInference(allFeatures); // GB V1
```

Mesurer aussi :
- cv_sent (coefficient de variation des longueurs de phrases)
- f26b_long_sent_rate
- f17_knife_count (ou équivalent)
- f9a_contradiction_rate
- nombre de phrases
- nombre de mots

## 1.4 — Produire la MATRICE d'étalonnage

```json
// data/JUDGE_CALIBRATION_MULTI_SIZE.json
{
  "date": "2026-03-23",
  "masters": [
    {
      "file": "flaubert_bovary_14155.txt",
      "author": "Flaubert",
      "language": "FR",
      "tier_expected": "S",
      "windows": {
        "SHORT_500w": {
          "word_count": ???,
          "sentence_count": ???,
          "gb_v1": ???,
          "tier": "?",
          "cv_sent": ???,
          "f26b": ???,
          "f17_knife": ???,
          "f9a_contra": ???
        },
        "MEDIUM_1000w": { /* idem */ },
        "LONG_2000w": { /* idem */ },
        "FULL_20sent": { /* idem */ }
      }
    },
    // ... 11 autres textes
  ],
  "summary": {
    "by_size": {
      "SHORT_500w": {
        "master_mean_gb": ???,
        "master_max_gb": ???,
        "master_min_gb": ???,
        "control_mean_gb": ???,
        "gap": ???
      },
      "MEDIUM_1000w": { /* idem */ },
      "LONG_2000w": { /* idem */ },
      "FULL_20sent": { /* idem */ }
    },
    "size_effect": {
      "gb_increases_with_length": true/false,
      "correlation_words_gb": ???,
      "recommended_s_threshold_short": ???,
      "recommended_s_threshold_long": ???
    }
  }
}
```

## 1.5 — Produire le tableau de synthèse

```
═══════════════════════════════════════════════════════════════════
  ÉTALONNAGE GB V1 — MAÎTRES × TAILLES
═══════════════════════════════════════════════════════════════════
  Auteur               500w    1000w   2000w   20sent  Langue
  ─────────────────────────────────────────────────────────────
  Flaubert Bovary      4.09    ???     ???     ???     FR
  Flaubert Salammbô    ???     ???     ???     ???     FR
  Proust Swann         4.14    ???     ???     ???     FR
  Hugo Misérables      ???     ???     ???     ???     FR
  Stendhal Chartreuse  ???     ???     ???     ???     FR
  Maupassant Bel-Ami   ???     ???     ???     ???     FR
  Balzac Illusions     ???     ???     ???     ???     FR
  McCarthy Blood M.    3.70    ???     ???     ???     EN
  Woolf Dalloway       ???     ???     ???     ???     EN
  Joyce Ulysse         ???     ???     ???     ???     EN/FR
  ─────────────────────────────────────────────────────────────
  50 Nuances (C-tier)  ???     ???     ???     ???     FR
  Fourth Wing (C-tier) ???     ???     ???     ???     FR
  ─────────────────────────────────────────────────────────────
  MOYENNE MAÎTRES      ???     ???     ???     ???
  MOYENNE C-TIER       ???     ???     ???     ???
  ÉCART                ???     ???     ???     ???
═══════════════════════════════════════════════════════════════════
```

## 1.6 — Conclusion sur l'étalonnage

Si les scores MONTENT avec la taille :
→ Le seuil S = 4.5 est calibré pour les passages longs
→ Il faut un seuil SHORT_S_TIER différent pour les scènes de bench
→ L'objectif Phase P doit être recalibré

Si les scores sont STABLES quelle que soit la taille :
→ Le seuil S = 4.5 est correct partout
→ Le LLM est vraiment loin des maîtres

Documenter le VERDICT.

# ═══════════════════════════════════════════════════════════════════════════════
# PARTIE 2 — TESTS API (8 appels, ~10 min)
# Nécessite : $env:ANTHROPIC_API_KEY
# Si la clé n'est pas définie, SAUTER cette partie et documenter "SKIPPED"
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 — Intent Trace (3 scènes × 2 appels = 6 appels)

Pour les scènes w4-panique, w4-contemplation, w4-dialogue-tendu :

### Appel 1 : Demander au LLM de s'expliquer AVANT de générer

Envoyer le SYSTEM PROMPT + le BRIEF de la scène + ce message :

```
Tu vas recevoir un brief de scène littéraire.
AVANT d'écrire quoi que ce soit, réponds UNIQUEMENT avec un JSON :

{
  "scene_type_understood": "...",
  "rhythm_strategy": "...",
  "sentence_plan": {
    "shortest_planned_quote": "...",
    "longest_planned_length": ???,
    "estimated_mean_length": ???,
    "knife_sentences_planned": ???
  },
  "contradiction_strategy": "...",
  "adversatives_planned": [],
  "what_i_refuse_to_do": "...",
  "biggest_challenge": "...",
  "language_of_thought": "..."
}

Sois HONNÊTE. Dis ce que tu vas RÉELLEMENT faire.
```

### Appel 2 : Générer la prose normalement

Envoyer le MÊME system + brief SANS l'intent trace.
Mesurer les features sur la prose produite.

### Comparer annoncé vs produit

```json
{
  "scene": "w4-panique",
  "announced": { /* JSON intent */ },
  "measured": {
    "mean_length": ???,
    "cv_sent": ???,
    "knife_count": ???,
    "f26b": ???,
    "contradiction_rate": ???,
    "gb_v1": ???
  },
  "diagnosis": "COMPRIS_ET_REUSSI | COMPRIS_MAIS_RATE | MAL_COMPRIS"
}
```

## 2.2 — Test de langue FR vs EN (2 appels)

Pour w4-panique UNIQUEMENT :

### Appel FR : Prompt normal → prose en français
### Appel EN : MÊME prompt + "Write ENTIRELY IN ENGLISH" → prose en anglais

Mesurer les features sur les DEUX versions.
Comparer cv_sent, f26b, knife_count, gb_v1.

```json
{
  "scene": "w4-panique",
  "fr": { "cv_sent": ???, "f26b": ???, "knife_count": ???, "gb_v1": ??? },
  "en": { "cv_sent": ???, "f26b": ???, "knife_count": ???, "gb_v1": ??? },
  "translation_bottleneck": true/false,
  "cv_delta": ???,
  "gb_delta": ???
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# PARTIE 3 — CHRONOGRAPHE COMPLET
# ═══════════════════════════════════════════════════════════════════════════════

Tout est loggé dans :

```json
// data/FULL_DIAGNOSTIC_CHRONOGRAPH.json
{
  "started_at": "...",
  "events": [
    { "ts": "...", "step": "1.1", "action": "EXTRACT_flaubert_bovary_SHORT",
      "result": "500w, 22 sentences", "duration_ms": ??? },
    { "ts": "...", "step": "1.3", "action": "GB_SCORE_flaubert_bovary_SHORT",
      "result": "gb=4.09, tier=A, cv=0.76", "duration_ms": ??? },
    // ... 48 mesures pour l'étalonnage
    { "ts": "...", "step": "2.1", "action": "INTENT_TRACE_w4-panique",
      "result": "LLM says: knife=3, cv_target=0.70", "duration_ms": ??? },
    { "ts": "...", "step": "2.1", "action": "GENERATE_w4-panique",
      "result": "gb=3.58, cv=0.71, knife=0", "duration_ms": ??? },
    { "ts": "...", "step": "2.2", "action": "LANGUAGE_TEST_EN",
      "result": "gb=???, cv=???, knife=???", "duration_ms": ??? }
  ],
  "completed_at": "...",
  "total_api_calls": ???,
  "total_duration_seconds": ???
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# RAPPORT FINAL
# ═══════════════════════════════════════════════════════════════════════════════

Créer : docs/R_CALIBRATION_AND_DIAGNOSTIC_REPORT.md

## 1. ÉTALONNAGE MULTI-TAILLE
  Tableau complet 12 textes × 4 tailles
  Le GB V1 dépend-il de la longueur ? OUI/NON
  Seuil S-tier recommandé pour fenêtres courtes = ???
  Seuil S-tier recommandé pour fenêtres longues = ???

## 2. PROFILS DES MAÎTRES (features clés)
  CV moyen des maîtres = ???
  f26b moyen des maîtres = ???
  f17 moyen des maîtres = ???
  → Ce sont les CIBLES RÉELLES pour le Scribe

## 3. INTENT TRACE (si API lancée)
  Le LLM comprend-il les consignes ? 3 diagnostics
  Ses prédictions sont-elles correctes ?
  En quelle langue dit-il penser ?

## 4. TEST DE LANGUE (si API lancée)
  FR vs EN sur w4-panique
  Translation Bottleneck OUI/NON

## 5. DÉCISION STRATÉGIQUE
  L'objectif Phase P doit-il être recalibré ?
  La micro-chirurgie Rosetta P3 est-elle la meilleure voie ?
  Le test anglais change-t-il la donne ?

# ═══════════════════════════════════════════════════════════════════════════════
# LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

| Fichier | Contenu |
|---------|---------|
| data/JUDGE_CALIBRATION_MULTI_SIZE.json | 12 textes × 4 tailles × features |
| data/INTENT_TRACE_RESULTS.json | 3 scènes : annoncé vs produit |
| data/LANGUAGE_TEST_RESULTS.json | FR vs EN sur w4-panique |
| data/FULL_DIAGNOSTIC_CHRONOGRAPH.json | Log complet avec timestamps |
| docs/R_CALIBRATION_AND_DIAGNOSTIC_REPORT.md | Rapport final |

## Commit

```bash
git add -A
git commit -m "feat(R-CALIBRATION): multi-size judge calibration + intent trace + language test

CALIBRATION: 12 texts × 4 sizes (500w, 1000w, 2000w, 20sent)
  Masters SHORT: mean=X.XX, max=X.XX
  Masters LONG: mean=X.XX, max=X.XX
  Size effect: GB [INCREASES/STABLE] with length
  Recommended S-threshold SHORT: X.XX
  
INTENT TRACE: [X/3] scenes correctly understood
LANGUAGE TEST: FR cv=X.XX vs EN cv=X.XX → [BOTTLENECK/NO_BOTTLENECK]

1911 tests PASS"
git tag r-calibration-complete
```

# CRITÈRES DE SORTIE

- [ ] 10 maîtres + 2 contrôles extraits à 4 tailles chacun
- [ ] 48 scores GB V1 calculés (12 × 4)
- [ ] Tableau synthèse complet
- [ ] Corrélation taille ↔ GB V1 calculée
- [ ] Seuil S-tier SHORT recommandé
- [ ] Profils features des maîtres (CV, f26b, f17, f9a)
- [ ] Intent Trace sur 3 scènes (si API dispo)
- [ ] Test FR vs EN sur w4-panique (si API dispo)
- [ ] Chronographe complet
- [ ] Rapport final
- [ ] 1911 tests PASS
- [ ] Commit + tag

# BUDGET
# Étalonnage : 0 appels API (~15 min de calcul local)
# Intent Trace : 6 appels API (~5 min)
# Test langue : 2 appels API (~3 min)
# TOTAL : 8 appels API + 15 min calcul local
