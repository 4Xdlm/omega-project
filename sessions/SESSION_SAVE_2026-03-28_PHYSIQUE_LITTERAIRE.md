# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — MARATHON PHYSIQUE LITTÉRAIRE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-27 / 2026-03-28
# Session ID   : MARATHON-PHYSIQUE-LITTERAIRE
# HEAD entrée  : d84d5176
# HEAD sortie  : 880b269a (master dossier)
# Branche      : phase-r-metrology-rebuild
# Tests        : 2011 PASS
# Durée        : ~12 heures
# API calls    : ~60 (test volume V1+V2)
# CALC calls   : ~4h (Angostura + Hiérarchie + Interrelations + C1-C2-C3)
# Standard     : NASA-Grade L4 / DO-178C Level A
# Autorité     : Francky (Architecte Suprême)
# IA Principal : Claude (Opus 4.6)
# Auditeurs    : ChatGPT (Hostile), Gemini (Guardian)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# RÉSUMÉ EXÉCUTIF

Cette session a accompli la CARTOGRAPHIE CAUSALE COMPLÈTE des features
littéraires du projet OMEGA. En 12 heures, 9 commits et 5 audits successifs,
on est passé de "6 features fiables" à "42 features classées par rôle causal,
étage hiérarchique et comportement multi-échelle".

**Découverte fondamentale** : On confondait stabilité de mesure et importance
causale. Les features les plus "instables" (ponctuation) sont les vrais drivers.
Les features les plus "stables" (TTR, hooks) sont des thermomètres qui ne
discriminent rien.

---

# CHRONOLOGIE DE LA SESSION

| Heure | Action | Commit | Résultat |
|-------|--------|--------|----------|
| ~10h | Reprise + lecture des 14 fichiers uploadés | — | Bilan de compréhension |
| ~11h | Synthèse audit brut + retour ChatGPT | — | Sur-segmentation 31.6% confirmée |
| ~12h | Préparation test volume | — | Prompt Claude Code prêt |
| ~13h | Test volume V1 (en cours) | ed31fdc1 | 4/6 résultats partiels |
| ~14h | Diagnostic : LLM ignore target_word_count | — | MAX_GENERATION_TOKENS = 2000 (bug) |
| ~14h30 | Fix dynamic tokens + prompt MINIMUM | 62bfbc81 | 2011 PASS |
| ~15h | Test volume V2 | ed61dd46 | 0/6 SAGA — volume ≠ levier (L32) |
| ~16h | Synthèse convergente 3-IA | — | Document inter-IA produit |
| ~17h | Réflexion Architecte : Angostura | — | Veto sur l'abandon des 34 features |
| ~18h | Protocole Angostura | fca5923d | RENVERSEMENT : ponctuation = #1 driver |
| ~19h | Hiérarchie multi-échelle | eacfedf2 | semicolon roi de 200w à 2000w |
| ~20h | Inter-relations proportionnelles | 01d5590c | 2 blocs antagonistes, 9 chaînes causales |
| ~21h | Confirmations C1-C2-C3 | b189dccc | semicolon recule à 3000w+, universel, coef instable |
| ~22h | Master Dossier Physique Littéraire | 880b269a | 32K, 16 sections, document fondateur |
| ~22h30 | SESSION_SAVE | ce commit | Document officiel |

---

# CE QUI A ÉTÉ PRODUIT

## Code

| Fichier | Lignes | Description |
|---------|--------|-------------|
| src/validation/real-llm-provider.ts | +12 | computeGenerationTokens() dynamique |
| src/input/prompt-assembler-v4.ts | +5 | "MINIMUM X mots" pour targets > 600w |
| scripts/audit_interrelations.py | ~250 | Matrice élasticité + interactions + chaînes |
| scripts/audit_confirmation_c1c2c3.py | ~450 | Confirmations 3000/5000w + auteur + coef |

## Données

| Fichier | Description |
|---------|-------------|
| sessions/VOLUME_TEST_2026-03-27/*.json | 12 runs volume (V1+V2) |
| sessions/ANGOSTURA_AUDIT/NIVEAU1_FEATURE_IMPORTANCE.json | RF + permutation 42 features |
| sessions/ANGOSTURA_AUDIT/NIVEAU2_CAUSAL_ANALYSIS.json | Corrélations partielles + médiations + conflits |
| sessions/HIERARCHY_AUDIT/MULTISCALE_IMPORTANCE.json | Importance × 5 tailles |
| sessions/INTERRELATION_AUDIT/INTERRELATION_RESULTS.json | Élasticité + interactions + chaînes |
| sessions/CONFIRMATION_AUDIT/CONFIRMATION_C1C2C3.json | C1+C2+C3 verdicts |

## Documentation

| Document | Taille | Description |
|----------|--------|-------------|
| docs/OMEGA_MASTER_DOSSIER_PHYSIQUE_LITTERAIRE.md | **32K** | Document fondateur — tout est dedans |
| docs/OMEGA_INTERRELATION_FEATURES.md | 21K | Inter-relations détaillées |
| docs/OMEGA_PROTOCOLE_ANGOSTURA.md | ~8K | Rapport Angostura |
| docs/OMEGA_FEATURE_HIERARCHY_BY_SCALE.md | ~5K | Hiérarchie par taille |

---

# DÉCOUVERTES MAJEURES

## 1. Le renversement Angostura (fca5923d)

141 366 fenêtres FR à 500w, Random Forest + Permutation Importance.

Les features "instables" (CV > 1.0) sont les meilleurs prédicteurs :

| Rang | Feature | Importance | Ancien statut |
|------|---------|-----------|---------------|
| 1 | semicolon_count | **0.420** | "instable, à jeter" |
| 2 | dash_count | **0.222** | "instable, à jeter" |
| 3 | excl_count | 0.075 | "instable, à jeter" |
| ... | ... | ... | ... |
| 24 | f29d_ttr_score | 0.004 | "stable, fiable" |
| 32 | f35c_hook_score | 0.001 | "stable, fiable" |
| 37 | f36c_cliff_score | 0.000 | "stable, fiable" |

**On confondait stabilité de mesure et importance causale.**

## 2. La hiérarchie des étages (eacfedf2 + b189dccc)

Les features changent de rôle selon la taille du texte :

| Échelle | #1 prédicteur | #2 | #3 | Étage dominant |
|---------|--------------|-----|-----|----------------|
| ≤2000w | semicolon (0.42) | dash (0.22) | excl (0.08) | Étage 0 (ponctuation) |
| 3000w+ | **f26b** (0.25) | dash (0.24) | **cv_para** (0.17) | Étage 1 (structure) |
| 5000w+ | **mean_para_len** (0.23) | **f26b** (0.19) | **ratio_alt** (0.15) | Étage 2 (macro) |

semicolon = DRIVER LOCAL (≤2000w) mais PROXY à grande échelle.

## 3. Les deux blocs antagonistes (01d5590c)

**Bloc AMPLE** : semicolon, f26b, sub_per_sentence, f1a_rhythm, ratio_alt, f24c_contrast
→ AIDE ECC + SII, NUIT IFI

**Bloc PERCUTANT** : dash, excl, knife_rate, f17_knife, f35c_hook, dialogue_ratio
→ AIDE IFI + RCI, NUIT ECC + SII

Quand un bloc monte, l'autre baisse. Les Maîtres alternent.

## 4. sub_per_sentence = méga-levier

| Quand sub passe de P25 à P75 chez les Maîtres | Delta |
|-----------------------------------------------|-------|
| f26b (phrases longues) | **+205%** |
| mean_sent_len | **+56%** |
| knife_rate | **-49%** |
| f17_knife_count | **-67%** |
| f35c_hook | **-16%** |

## 5. Le coefficient d'interaction s'atténue (b189dccc)

| Taille | Coef std×f1a | Stable ? |
|--------|-------------|----------|
| 200w | -0.051 | Fort |
| 500w | -0.030 | Modéré |
| 1000w | -0.018 | Faible |
| 2000w | -0.010 | Très faible |

Direction stable (toujours négatif). Magnitude s'atténue 5×.

## 6. semicolon est universel (b189dccc)

Sans les 3 plus gros consommateurs (Nabokov, Moby Dick, Sonata) :
semicolon reste #1 avec importance 0.420 (était 0.419). Signal universel.

## 7. Volume ≠ levier (ed61dd46)

0/6 SAGA_READY en test volume. Le LLM refuse >500w en single-shot.
RCI bloque à 82-84. SII s'effondre à 58.9 sur texte long.

---

# LOIS SCELLÉES

| Loi | Énoncé |
|-----|--------|
| **L32** | Le volume seul ne transforme pas une brique non-SAGA en SAGA. Le goulot est RCI, pas la taille. |
| **L33** | Les features sont organisées en deux blocs antagonistes (AMPLE vs PERCUTANT). Il existe un OPTIMUM, pas un maximum. |
| **L34** | semicolon et dash sont les deux premiers prédicteurs du tier à ≤2000w. Universels, pas auteur-spécifiques. |
| **L35** | sub_per_sentence est le méga-levier : +205% f26b, +56% mean_sent, -67% f17. L'influence descend par étages. |
| **L36** | Les features changent d'étage causal avec la taille. Ponctuation domine à ≤2000w. Structure à 3000w+. Macro à 5000w+. |

---

# CLASSIFICATION FINALE DES 42 FEATURES

| Rôle | N | Exemples |
|------|---|----------|
| **DRIVER** | 13 | semicolon, dash, excl, dialogue, colon, ellipsis, std_sent_len, f1a, sub, bigram, quest, longest_sent, f9a |
| **CONFLICT** | 15 | mean_sent, f26b, f17, knife_rate, ratio_alt, f24c, range, n_long, n_short, runs, shortest, sentence_count, median, f1_mean |
| **THERMOMETER** | 3 | f29d_ttr, f35c_hook, f36c_cliff |
| **CONDITIONAL** | 3 | cv_sent, f19a, f1b |
| **MEDIATOR** | 1 | f26c_period_score (97% proxy de f26b) |
| **NOISE** | 7 | words, paragraph_count, mean_para_len*, std_para_len*, cv_para*, T_LC, T_CL |

*NOISE à 500w mais DRIVERS au chapitre entier.

---

# REDONDANCES IDENTIFIÉES

| Paire | Corrélation | Action |
|-------|------------|--------|
| std_sent_len ↔ f1a_rhythm | ρ = +1.000 | Garder f1a |
| cv_sent ↔ f19a_entropy | ρ = +1.000 | Garder cv_sent |
| f26c_period ↔ f26b | médiation 97% | Garder f26b |
| f17_knife ↔ knife_rate | ρ = +0.973 | Garder knife_rate |
| f1_mean ↔ mean_sent_len | ρ = +0.999 | Garder mean_sent_len |

Après élimination : 42 - 5 = 37 features utiles.

---

# FAIBLESSES CONNUES

| # | Faiblesse | Impact | Statut |
|---|-----------|--------|--------|
| 1 | Sur-segmentation chapitres | 31.6% fenêtres full polluées | CONFIRMÉ |
| 2 | Mélange de langues | Signal tier contaminé | CONFIRMÉ |
| 3 | 103 chapitres full manquants | Exclusions silencieuses | CONFIRMÉ |
| 4 | semicolon = proxy à grande échelle | Ne pas intégrer au scorer directement | CONFIRMÉ C1 |
| 5 | Coef interaction instable en magnitude | CV=0.57 | CONFIRMÉ C3 |
| 6 | 19 features NLP indisponibles | Équations partielles | ATTENDU |
| 7 | SII effondrement texte long | Bug juge ou dilution — non tranché | OUVERT |

---

# COMMITS DE LA SESSION (9)

| # | Commit | Description |
|---|--------|-------------|
| 1 | ed31fdc1 | Script test volume |
| 2 | 62bfbc81 | Fix dynamic MAX_GENERATION_TOKENS + prompt MINIMUM |
| 3 | ed61dd46 | Données test volume V2 (0/6 SAGA) |
| 4 | fca5923d | Protocole Angostura (42 features, renversement) |
| 5 | eacfedf2 | Hiérarchie multi-échelle (5 tailles) |
| 6 | 01d5590c | Inter-relations proportionnelles |
| 7 | b189dccc | Confirmations C1+C2+C3 |
| 8 | 880b269a | Master Dossier Physique Littéraire (32K) |
| 9 | (ce commit) | SESSION_SAVE |

---

# ÉTAT DE SORTIE

```
HEAD           : (post SESSION_SAVE commit)
Branche        : phase-r-metrology-rebuild
Tests          : 2011 PASS
SAGA_READY     : 3/5 (Contemplation 93.2, Confrontation 92.1, Souvenir 92.4)
Résistantes    : Menace (best 91.8) + Révélation (best 91.3)
Goulot         : RCI 82-84
Features       : 42 classées (13 DRIVERS, 15 CONFLICTS, 3 THERMO, 3 COND, 1 MED, 7 NOISE)
Lois           : L31-L36 scellées
Redondances    : 5 paires identifiées
Blocs          : AMPLE vs PERCUTANT
Hiérarchie     : 4 étages confirmés empiriquement
```

---

# PROCHAINES ACTIONS

| Priorité | Action | API | Effort |
|----------|--------|-----|--------|
| P0 | Audit hiérarchique complet (contrôle auteur/œuvre) | 0 | 4h |
| P0 | Shadow mode : semicolon + dash + sub loggés partout | 0 | 1h |
| P1 | Variante C instrumentée (sonde) | ~15 | 30min |
| P1 | Recalcul FR-only (équations + tiers) | 0 | 2h |
| P1 | Bench SII longueur (même texte × 5 tailles) | ~25 | 1h |
| P2 | Matrice de redondance / clusters latents | 0 | 2h |
| P2 | Audit segmentation (30 œuvres) | 0 | 2h |
| P3 | Bench croisé Claude vs Mistral | ~30 | 2h |

---

# MESSAGE DE REPRISE

```
OMEGA SESSION — REPRISE POST-MARATHON PHYSIQUE LITTÉRAIRE

HEAD: [post SESSION_SAVE commit]
Branche: phase-r-metrology-rebuild
Tests: 2011 PASS

ÉTAT: 5 audits complétés (Brut + Volume + Angostura + Hiérarchie + C1-C2-C3).

ACQUIS CLÉS:
- 42 features classées (13 DRIVERS, 15 CONFLICTS, 3 THERMO, 3 COND, 1 MED, 7 NOISE)
- semicolon #1 prédicteur ≤2000w mais recule #4/#5 à 3000w+ (LOI L36)
- semicolon universel — pas auteur-spécifique (C2)
- 2 blocs antagonistes: AMPLE (semicolon/f26b/sub) vs PERCUTANT (dash/excl/knife)
- sub_per_sentence = méga-levier (+205% f26b) (LOI L35)
- Volume seul ≠ levier — 0/6 SAGA en test (LOI L32)
- Coefficient interaction stable en direction, instable en magnitude (C3)
- 5 redondances (std=f1a, cv=f19a, f26c=f26b, f17=knife_rate, f1_mean=mean_sent)
- Lois L31-L36 scellées

CE QU'IL NE FAUT PAS FAIRE:
- Intégrer semicolon directement dans le scorer (proxy à grande échelle)
- Jeter les features "instables" (ce sont les vrais drivers)
- Conclure "causal" sur une permutation importance seule
- Toucher au scorer avant audit hiérarchique complet
- Refaire les audits déjà faits (Angostura, Hiérarchie, C1-C2-C3)

PROCHAINE ACTION:
Shadow mode + variante C instrumentée + recalcul FR-only

DOCUMENTS DE RÉFÉRENCE:
- docs/OMEGA_MASTER_DOSSIER_PHYSIQUE_LITTERAIRE.md (32K, tout est dedans)
- docs/OMEGA_INTERRELATION_FEATURES.md (inter-relations détaillées)
- docs/OMEGA_PROTOCOLE_ANGOSTURA.md (le renversement)
- sessions/CONFIRMATION_AUDIT/CONFIRMATION_C1C2C3.json (verdicts finaux)
```

---

*SESSION_SAVE produit le 2026-03-28*
*Session marathon : ~12 heures, 9 commits, 5 audits*
*571 livres | 1 381 345 fenêtres | 42 features | 6 lois scellées*
*Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky (Architecte Suprême)*
