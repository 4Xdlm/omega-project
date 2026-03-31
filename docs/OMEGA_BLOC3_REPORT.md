# OMEGA BLOC 3 — Integration decisionnelle
**Date** : 2026-03-31 | **Branch** : phase-r-metrology-rebuild
**Moteur** : Ollama qwen3.5:35b-a3b (local, 0€ API)
**Runs** : 8/8 OK | Scene : contemplation | Scoring : CALC pur (0 LLM judge)

---

## 1. Decisions implementees

| Decision | Source BLOC 2 | Implementation BLOC 3 |
|----------|---------------|----------------------|
| D-B3-4 | cliff moyen=0.450, 0/31 < 0.30 | `cliff_quality` (>=0.50) ajoute au logging engine.ts |
| D-B3-2 | PROFILE_FR=67.4 vs EN_MAX=83.6 | `branching_signal` (EN_MAX - FR) ajoute au logging engine.ts |
| D-B3-1 | CI_L37 r=0.044, sature | Reste shadow — confirme par Ollama (variance CI_L37 apparue) |
| D-B3-3 | DUAL_SCALE r=0.939 | Monitoring seulement (pas d'integration verdict) |

---

## 2. Resultats bench 8 runs (Ollama qwen3.5:35b-a3b)

### Metriques de generation

| Run | Words | Duration | cliff | cliff_quality | branching | flag | CI_L37_c |
|-----|-------|----------|-------|---------------|-----------|------|----------|
| 1 | 4940 | 71s | 0.700 | true | 19.1 | BRANCH_CANDIDATE | 0.0 |
| 2 | 5526 | 63s | 0.600 | true | 7.1 | NEUTRAL | 100.0 |
| 3 | 5671 | 64s | 0.700 | true | 6.6 | NEUTRAL | 22.9 |
| 4 | 5481 | 64s | 0.700 | true | 5.3 | NEUTRAL | 65.7 |
| 5 | 5532 | 65s | 0.500 | true | 7.5 | NEUTRAL | 100.0 |
| 6 | 5859 | 64s | 0.700 | true | 5.0 | NEUTRAL | 61.2 |
| 7 | 4954 | 64s | 0.300 | false | 8.2 | NEUTRAL | 100.0 |
| 8 | 5995 | 65s | 0.400 | false | 18.7 | BRANCH_CANDIDATE | 100.0 |

### Statistiques

| Metrique | Valeur | Seuil | Statut |
|----------|--------|-------|--------|
| cliff_score moyen | **0.575** | — | Eleve (suspension narrative forte) |
| cliff_quality=true (>=0.50) | **75%** (6/8) | > 50% | **ATTEINT** |
| cliff_score min | 0.300 | — | Seuil minimal OK |
| cliff_score max | 0.700 | — | Excellent |
| branching_signal moyen | **9.7** | — | Zone NEUTRAL dominante |
| BRANCH_CANDIDATE (>10) | 2/8 (25%) | — | Minoritaire |
| FR_STABLE (<5) | 0/8 | — | Aucun run entierement stable FR |
| NEUTRAL (5-10) | 6/8 (75%) | — | Zone principale |
| word_count moyen | 5495 | ~2500 cible | 2x plus long (Ollama generous) |
| duration moyenne | 65s | — | ~110 t/s effectif |
| CI_L37_corpus moyen | 68.7 | — | **Plus de saturation** (contrairement a Claude: 98.1) |

---

## 3. Comparaison Claude (BLOC 2) vs Ollama (BLOC 3)

| Metrique | Claude Sonnet (BLOC 2) | Ollama qwen3.5 (BLOC 3) | Delta |
|----------|----------------------|-------------------------|-------|
| cliff_score moyen | 0.450 | **0.575** | +0.125 |
| cliff_quality (>=0.50) | ~50% est. | **75%** | +25% |
| branching_signal | 16.2 (FR vs EN_max) | **9.7** | -6.5 |
| CI_L37_corpus | 98.1 (sature) | **68.7** (desature) | -29.4 |
| word_count moyen | ~2250 | ~5500 | +3250 |
| Cout par run | ~$0.15 | **$0.00** | -100% |

### Observations cles

1. **CI_L37 desature** : Ollama produit une prose avec CI_L37 variable (0-100),
   contrairement a Claude qui sature a 100. Cela signifie que CI_L37 pourrait
   devenir un signal utile si le moteur de production change.

2. **cliff_quality superieur** : Ollama produit des fins plus ouvertes (cliff=0.575)
   que Claude (cliff=0.450). Le cliff gate serait moins necessaire.

3. **branching_signal plus bas** : La prose Ollama est plus "FR-stable" (signal 9.7)
   que Claude (signal 16.2). Le branching conditionnel EN_max serait moins pertinent.

4. **Longueur double** : Ollama genere ~5500 mots vs ~2250 pour Claude. Le prompt
   demande ~2500 mots mais Ollama est plus generous. A calibrer si besoin.

---

## 4. Correlations

| Paire | r | Interpretation |
|-------|---|----------------|
| r(cliff, branching) | -0.221 | Faible negativ — pas de lien significatif |

Note : N=8, trop faible pour des correlations fiables. Les tendances sont indicatives.

---

## 5. Decisions Bloc 4

### VALIDE pour integration

| Composant | Evidence BLOC 3 | Action Bloc 4 |
|-----------|----------------|---------------|
| **cliff_quality** | 75% >= 0.50 (cible > 50%) | Integrer comme metrique qualite dans le dashboard |
| **branching_signal** | 9.7 moyen, 25% BRANCH_CANDIDATE | Conserver en monitoring, seuil a affiner |

### REVELATION : CI_L37 utile avec Ollama

| Composant | Evidence | Action |
|-----------|----------|--------|
| **CI_L37** | Desature a 68.7 (vs 98.1 Claude) | **RE-EVALUER** pour integration si Ollama devient moteur principal |

### CONFIGURATION MOTEUR

| Aspect | Recommandation |
|--------|---------------|
| Longueur | Ajouter `num_predict: 4096` pour limiter a ~2500 mots |
| Cliff gate | Seuil 0.30 potentiellement trop bas pour Ollama (cliff moyen deja a 0.575) |
| Branching | Seuil 10 OK — 75% des runs sont NEUTRAL |

---

## 6. Cout

| Moteur | Runs | Cout total | Cout par run |
|--------|------|------------|-------------|
| Claude Sonnet (BLOC 2) | 32 | ~$4.80 | ~$0.15 |
| Ollama qwen3.5 (BLOC 3) | 8 | **$0.00** | **$0.00** |

---

**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**
**Genere le 2026-03-31 par analyse BLOC 3 Ollama**
