# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT A — DIAGNOSTIC TOTAL + ROSETTA
# L'ÉPREUVE DE VÉRITÉ : QU'EST-CE QUE LE SCRIBE REÇOIT, COMPREND, ET PRODUIT ?
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-23
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : 2d996523 (tag phase-p-assault-v1)
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTE CRITIQUE
#
# Phase P a échoué (GB V1 de 3.80 → 3.61). L'audit croisé révèle que :
# 1. La couche Rosetta (reverse engineering LLM) n'a JAMAIS été branchée
# 2. Les features ciblées (f17 knife, f1b rhythm, f9a contradiction)
#    sont classées IRRÉDUCTIBLES par Rosetta (taux respect = 0%)
# 3. Le LLM écrit déjà des phrases de 35-120 mots — la consigne "40+ mots"
#    était INUTILE
# 4. Le SceneBrief contractuel ≤150 tokens est probablement violé
# 5. On ne sait PAS ce que le LLM comprend de nos consignes
#
# CE PROMPT NE GÉNÈRE PAS DE PROSE. Il DIAGNOSTIQUE le pipeline.
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : NE PAS modifier le scoring (GB V1, V3) — lecture seule
R-02 : 1911 tests doivent PASS
R-03 : TOUT est loggé dans un chronographe avec timestamps
R-04 : Le LLM doit S'EXPLIQUER à chaque étape via INTENT_TRACE

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1 — AUDIT DE CONFORMITÉ (QU'EST-CE QUE LE SCRIBE REÇOIT ?)
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 — Capturer le prompt EXACT envoyé au Scribe

Pour UNE scène (w4-panique), capturer et sauver INTÉGRALEMENT :

a) Le `system` message (SCRIBE_SYSTEM_PROMPT complet)
b) Le `user` message (buildMasterScenePrompt() complet)
c) La taille en tokens de chaque message
d) La taille combinée

Sauver dans : data/PROMPT_AUDIT_RAW.json

```json
{
  "scene": "w4-panique",
  "system_tokens": ???,
  "user_tokens": ???,
  "total_tokens": ???,
  "system_text_first_500_chars": "...",
  "user_text_first_500_chars": "...",
  "sceneBrief_present": true/false,
  "sceneBrief_tokens": ???,
  "contract_compliance": "≤150t = PASS/FAIL"
}
```

## 1.2 — Vérifier la conformité contractuelle

Le contrat OMEGA/Scribe dit :
- SceneBrief ≤ 150 tokens
- Pas d'IDs système
- Pas de backend brut
- Langage de metteur en scène

Vérifier :
- Y a-t-il un SceneBrief isolé dans le prompt ? OUI/NON
- La taille du user message dépasse-t-elle 150 tokens ? OUI/NON
- Y a-t-il des IDs système (INV-xxx, DEBT[xxx], etc.) ? OUI/NON
- Le prompt parle-t-il en langage dramatique ou en langage technique ? DRAMATIQUE/TECHNIQUE

Sauver dans : data/PROMPT_COMPLIANCE_AUDIT.json

## 1.3 — Vérifier si Rosetta est branchée

Chercher dans le code :
- Référence à `rosetta` → OUI/NON
- Référence à `dictionnaire_v2` ou `dictionnaire_v3` → OUI/NON
- Référence à `table_rosette` → OUI/NON
- Référence à `facteurs_conversion` → OUI/NON

Sauver dans : data/ROSETTA_INTEGRATION_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2 — INTENT TRACE (QU'EST-CE QUE LE LLM COMPREND ?)
# ═══════════════════════════════════════════════════════════════════════════════
#
# On va demander au LLM de S'EXPLIQUER AVANT de générer.
# Pas une dissertation — un JSON structuré.

## 2.1 — Créer le protocole INTENT_TRACE

Avant CHAQUE génération de prose, ajouter un appel API SÉPARÉ :

```typescript
const intentTracePrompt = `
Tu vas recevoir un brief de scène littéraire.
AVANT d'écrire quoi que ce soit, tu dois répondre UNIQUEMENT
avec un JSON structuré (pas de prose, pas de commentaire) :

{
  "comprehension": {
    "scene_type_understood": "...",     // quel TYPE de scène tu penses devoir écrire
    "dominant_emotion": "...",          // l'émotion DOMINANTE que tu vises
    "rhythm_strategy": "...",           // comment tu comptes gérer le rythme
    "sentence_plan": {
      "shortest_planned": "...",        // ta phrase la PLUS COURTE prévue (la copier)
      "longest_planned": "...",         // ta phrase la PLUS LONGUE prévue (la copier)
      "estimated_mean_length": ???,     // longueur moyenne prévue
      "knife_sentences_planned": ???    // nb de phrases < 8 mots prévues
    },
    "contradiction_strategy": "...",    // comment tu comptes intégrer la dialectique
    "adversatives_planned": ["..."],    // liste des adversatifs prévus
    "what_i_will_NOT_do": "...",        // ce que tu refuses de faire et POURQUOI
    "biggest_challenge": "...",         // la chose la plus DIFFICILE dans ce brief
    "language_thought_process": "..."   // en quelle langue tu STRUCTURES ta pensée
  }
}

Sois HONNÊTE. Ne dis pas ce que tu crois qu'on veut entendre.
Dis ce que tu vas RÉELLEMENT faire.
`;
```

## 2.2 — Exécuter l'INTENT_TRACE sur 3 scènes

Pour les scènes : w4-panique, w4-contemplation, w4-dialogue-tendu

a) Envoyer le SYSTEM PROMPT actuel + le BRIEF de la scène + l'INTENT_TRACE
b) Capturer le JSON de réponse
c) PUIS envoyer le même prompt SANS intent trace pour la génération réelle
d) Mesurer la prose générée avec text-features (les 42 features GB)
e) COMPARER ce que le LLM a ANNONCÉ vs ce qu'il a PRODUIT

```json
// Pour chaque scène :
{
  "scene": "w4-panique",
  "intent": { /* le JSON de l'étape a */ },
  "production": {
    "actual_mean_length": ???,
    "actual_min_length": ???,
    "actual_max_length": ???,
    "actual_cv_sent": ???,
    "actual_knife_count": ???,
    "actual_contradiction_rate": ???,
    "actual_f26b_long_sent_rate": ???,
    "actual_gb_v1": ???
  },
  "alignment": {
    "mean_length_delta": ???,    // annoncé vs produit
    "knife_count_delta": ???,
    "contradiction_delta": ???,
    "understood_correctly": true/false,
    "executed_correctly": true/false,
    "diagnosis": "COMPRIS_ET_REUSSI | COMPRIS_MAIS_RATE | MAL_COMPRIS"
  }
}
```

Sauver dans : data/INTENT_TRACE_RESULTS.json

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3 — TEST DE LANGUE (EN vs FR)
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 — Même scène, même prompt, langue différente

Pour UNE seule scène (w4-panique) :

a) Condition FR : Prompt actuel → générer en français
b) Condition EN : MÊME prompt MAIS ajouter :
   "Write the prose ENTIRELY IN ENGLISH. Think and structure in English natively."
c) Pour CHAQUE condition, faire l'INTENT_TRACE d'abord

Mesurer les features sur les DEUX versions :

```json
{
  "scene": "w4-panique",
  "fr": {
    "intent": { /* JSON intent FR */ },
    "cv_sent": ???,
    "mean_length": ???,
    "knife_count": ???,
    "f26b": ???,
    "contradiction_rate": ???,
    "gb_v1": ???
  },
  "en": {
    "intent": { /* JSON intent EN */ },
    "cv_sent": ???,
    "mean_length": ???,
    "knife_count": ???,
    "f26b": ???,
    "contradiction_rate": ???,
    "gb_v1": ???
  },
  "delta": {
    "cv_sent": ???,
    "knife_count": ???,
    "f26b": ???,
    "diagnosis": "TRANSLATION_BOTTLENECK | RLHF_LIMIT | BOTH | NEITHER"
  }
}
```

Sauver dans : data/LANGUAGE_TEST_RESULTS.json

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4 — ÉTALONNAGE DU JUGE (LE GB V1 JUGE-T-IL BIEN ?)
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 — Faire passer 3 extraits de maîtres dans le GB V1

Prendre 3 extraits de ~500 mots du corpus :

a) Flaubert Bovary (flaubert_bovary_14155.txt — premiers 500 mots après le début)
b) Proust Swann (proust_swann_2650.txt — premiers 500 mots après le début)
c) McCarthy Blood Meridian (pdf_blood_meridian_cormac_mccarthy.txt — premiers 500 mots)

Les faire passer EXACTEMENT dans le même pipeline que le bench :
- computeTextFeatures()
- computeSpacyFeatures()
- GB V1 scoring

```json
{
  "flaubert": {
    "gb_v1": ???,
    "tier": "?",
    "cv_sent": ???,
    "f26b": ???,
    "top_features": [...]
  },
  "proust": {
    "gb_v1": ???,
    "tier": "?",
    "cv_sent": ???,
    "f26b": ???,
    "top_features": [...]
  },
  "mccarthy": {
    "gb_v1": ???,
    "tier": "?",
    "cv_sent": ???,
    "f26b": ???,
    "top_features": [...]
  },
  "verdict": {
    "all_s_tier": true/false,
    "lowest_score": ???,
    "judge_calibration": "CORRECT | BIASED | BROKEN"
  }
}
```

Sauver dans : data/JUDGE_CALIBRATION_RESULTS.json

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 5 — CHRONOGRAPHE (TOUT EST LOGGÉ)
# ═══════════════════════════════════════════════════════════════════════════════

Créer un fichier de log chronologique qui enregistre TOUT :

```json
// data/DIAGNOSTIC_CHRONOGRAPH.json
{
  "started_at": "2026-03-23T...",
  "events": [
    {
      "timestamp": "...",
      "step": "1.1",
      "action": "PROMPT_AUDIT_CAPTURE",
      "result": "system=X tokens, user=Y tokens, total=Z",
      "verdict": "PASS/FAIL"
    },
    {
      "timestamp": "...",
      "step": "1.2",
      "action": "COMPLIANCE_CHECK",
      "result": "SceneBrief ≤150t = FAIL (actual: Xt)",
      "verdict": "FAIL"
    },
    {
      "timestamp": "...",
      "step": "2.1",
      "action": "INTENT_TRACE_w4-panique",
      "result": "LLM says: type=ACTION, knife=3, cv=0.70",
      "verdict": "—"
    },
    {
      "timestamp": "...",
      "step": "2.2",
      "action": "PRODUCTION_w4-panique",
      "result": "Actual: knife=0, cv=0.58, gb=3.58",
      "verdict": "COMPRIS_MAIS_RATE"
    },
    {
      "timestamp": "...",
      "step": "3.1",
      "action": "LANGUAGE_TEST_FR",
      "result": "cv=0.58, knife=0, gb=3.58",
      "verdict": "—"
    },
    {
      "timestamp": "...",
      "step": "3.2",
      "action": "LANGUAGE_TEST_EN",
      "result": "cv=0.72, knife=4, gb=3.91",
      "verdict": "TRANSLATION_BOTTLENECK"
    },
    {
      "timestamp": "...",
      "step": "4.1",
      "action": "JUDGE_CALIBRATION_FLAUBERT",
      "result": "gb=4.82, tier=S",
      "verdict": "JUDGE_CORRECT"
    }
  ],
  "completed_at": "...",
  "total_api_calls": ???,
  "total_duration_seconds": ???
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 6 — CHARGER LA ROSETTA ET IDENTIFIER LES FEATURES PILOTABLES
# ═══════════════════════════════════════════════════════════════════════════════

## 6.1 — Lire les données Rosetta existantes

Les fichiers sont dans omega-autopsie/results_rosetta/ :
- 08_dictionnaire_omega_llm_v1.json (features alignées vs divergentes par type)
- 05_table_rosette.json (ratios LLM/Classiques par feature × type)
- phase2/dictionnaire_v2_calibre.json (contraintes efficaces vs ignorées)
- phase3/dictionnaire_v3_llm_driven.json (instructions LLM-driven par type)

## 6.2 — Résumer les features par catégorie

À partir du dictionnaire_v2_calibre.json :

```
FEATURES PILOTABLES (taux_respect > 0.5) :
  f29d_ttr_score : 100%
  f15b_redundancy : 100%
  f16a_bigram_rarity : 100%
  f24e_contrast_score : 75%

FEATURES PARTIELLES (taux_respect 0.25-0.5) :
  f1_mean : 50%
  f5a_verb_density : 25%
  f25g_description : 25%
  f38c_speed : 25%
  f21c_diacope : 25%
  f36c_cliff : 50%
  f35c_hook : 25%

FEATURES IRRÉDUCTIBLES (taux_respect = 0) :
  f28d_sil_score : 0%     ← style indirect libre
  f27d_modal_score : 0%   ← modalisateurs
  f1b_rhythm_ratio : 0%   ← VARIATION RYTHMIQUE !!!
  f5c_action_verb : 0%    ← verbes d'action
  f17_knife_count : 0%    ← PHRASES-COUTEAUX !!!
  f9a_contradiction : 0%  ← ADVERSATIFS !!!
```

ALERTE : Les 3 lois Phase P ciblaient EXACTEMENT les 3 features IRRÉDUCTIBLES.
Phase P était vouée à l'échec dès le départ.

## 6.3 — Documenter cette découverte

Sauver dans : data/ROSETTA_VS_PHASE_P_DIAGNOSIS.json

```json
{
  "phase_p_targets": [
    { "law": "Rhythm CV > 0.65", "feature": "f1b_rhythm_ratio", "rosetta_pilotability": 0.0, "status": "IRREDUCTIBLE" },
    { "law": "Contradiction", "feature": "f9a_contradiction_rate", "rosetta_pilotability": 0.0, "status": "IRREDUCTIBLE" },
    { "law": "Knife sentences", "feature": "f17_knife_count", "rosetta_pilotability": 0.0, "status": "IRREDUCTIBLE" }
  ],
  "verdict": "Phase P ciblait 3 features IRRÉDUCTIBLES. Échec prévisible.",
  "alternative": "Micro-chirurgie bornée (Rosetta P3) = seule méthode ayant produit +1.95 pts"
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# RAPPORT FINAL
# ═══════════════════════════════════════════════════════════════════════════════

Créer : docs/R_DIAGNOSTIC_TOTAL_REPORT.md

Structure OBLIGATOIRE :

## 1. CE QUE LE SCRIBE REÇOIT
  Taille du prompt, conformité contractuelle, présence/absence de SceneBrief

## 2. CE QUE LE LLM COMPREND (INTENT TRACE)
  Pour chaque scène : ce qu'il annonce vs ce qu'il produit
  Diagnostic : COMPRIS_ET_REUSSI / COMPRIS_MAIS_RATE / MAL_COMPRIS

## 3. L'EFFET DE LA LANGUE (EN vs FR)
  Les features changent-elles entre EN et FR ?
  Y a-t-il un Translation Bottleneck ?

## 4. LE JUGE EST-IL CALIBRÉ ?
  Flaubert, Proust, McCarthy → scores GB V1
  Le juge donne-t-il bien S-tier aux maîtres ?

## 5. ROSETTA vs PHASE P : POURQUOI C'A ÉCHOUÉ
  Les 3 lois ciblaient des features IRRÉDUCTIBLES
  La Rosetta le savait déjà

## 6. RECOMMANDATION POUR LA SUITE
  Quelle méthode utiliser si les features cibles sont irréductibles ?
  La micro-chirurgie bornée est-elle la seule voie ?
  Le test anglais change-t-il la donne ?

# ═══════════════════════════════════════════════════════════════════════════════
# LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

| Fichier | Contenu |
|---------|---------|
| data/PROMPT_AUDIT_RAW.json | Prompt exact envoyé au Scribe |
| data/PROMPT_COMPLIANCE_AUDIT.json | Conformité contractuelle |
| data/ROSETTA_INTEGRATION_AUDIT.json | Rosetta branchée OUI/NON |
| data/INTENT_TRACE_RESULTS.json | Ce que le LLM annonce vs produit |
| data/LANGUAGE_TEST_RESULTS.json | FR vs EN sur w4-panique |
| data/JUDGE_CALIBRATION_RESULTS.json | Flaubert/Proust/McCarthy dans GB V1 |
| data/DIAGNOSTIC_CHRONOGRAPH.json | Log chronologique complet |
| data/ROSETTA_VS_PHASE_P_DIAGNOSIS.json | Pourquoi Phase P a échoué |
| docs/R_DIAGNOSTIC_TOTAL_REPORT.md | Rapport final |

## Commit

```bash
git add -A
git commit -m "feat(R-DIAGNOSTIC): total pipeline audit + intent trace + language test + judge calibration

1. Prompt audit: system=Xt, user=Yt, SceneBrief compliance=[PASS/FAIL]
2. Rosetta integration: [BRANCHED/NOT_BRANCHED]
3. Intent trace: LLM announces X, produces Y → [COMPRIS/RATE/MAL_COMPRIS]
4. Language test FR vs EN: cv_fr=X, cv_en=Y → [BOTTLENECK/RLHF/BOTH]
5. Judge calibration: Flaubert=X, Proust=Y, McCarthy=Z → [CORRECT/BIASED]
6. Phase P post-mortem: 3/3 target features were IRRÉDUCTIBLE per Rosetta

1911 tests PASS"
git tag r-diagnostic-total-complete
```

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] Prompt EXACT capturé (system + user, taille en tokens)
- [ ] Conformité SceneBrief ≤150t vérifiée
- [ ] Rosetta branchée OUI/NON vérifié dans le code
- [ ] INTENT_TRACE exécuté sur 3 scènes (JSON avant + mesures après)
- [ ] Diagnostic COMPRIS/RATE/MAL_COMPRIS pour chaque scène
- [ ] Test FR vs EN sur w4-panique (même prompt, langue différente)
- [ ] Flaubert, Proust, McCarthy dans le GB V1 (scores + tiers)
- [ ] Chronographe complet avec timestamps
- [ ] Diagnostic Rosetta vs Phase P (3 features irréductibles)
- [ ] Rapport final
- [ ] 1911 tests PASS
- [ ] Commit + tag

# ═══════════════════════════════════════════════════════════════════════════════
# BUDGET API ESTIMÉ
#
# Intent trace : 3 scènes × 1 appel = 3 appels
# Génération prose : 3 scènes × 1 appel = 3 appels
# Test EN : 1 trace + 1 génération = 2 appels
# Étalonnage juge : 0 appels (scoring local)
# TOTAL : ~8 appels API (~10 minutes)
#
# Ce n'est PAS un bench de 10h. C'est un DIAGNOSTIC de 10 minutes.
# ═══════════════════════════════════════════════════════════════════════════════
