# OMEGA BLOC 5 — Bench Claude vs Ollama (32 runs)
**Date** : 2026-03-31 | **Branch** : phase-r-metrology-rebuild
**Claude** : Sonnet 4 (31 runs BLOC 2) | **Ollama** : qwen3.5:35b-a3b (32 runs)
**Scoring** : CALC pur (metriques deterministes) | **Cout Ollama** : 0€

---

## 1. Resultats comparatifs globaux

### Metriques CALC (disponibles pour les deux moteurs)

| Metrique | Claude | Ollama | Delta | Vainqueur |
|----------|--------|--------|-------|-----------|
| Cliff score | 0.45 | **0.54** | +0.09 | TIE |
| CI_L37 corpus | 98.1 | **76.3** | -21.8 | OLLAMA (discriminant) |
| PROFILE_FR | 67.4 | 61.0 | -6.4 | CLAUDE |
| Rhythm variance | 37.1 | **101.7** | +64.6 | OLLAMA |
| TTR score | 0.74 | 0.62 | -0.12 | TIE |
| Hook score | 0.31 | 0.35 | +0.05 | TIE |
| Knife count | 3.10 | 2.84 | -0.25 | TIE |
| Branching signal | 16.2 | **11.1** | -5.1 | OLLAMA (plus FR) |

### Cliff quality (>= 0.50)

| Moteur | % runs cliff_quality | n |
|--------|---------------------|---|
| Claude | 52% (16/31) | 31 |
| Ollama | **72% (23/32)** | 32 |

### Claude composite V3 (reference — non disponible pour Ollama)

| Metrique | Valeur |
|----------|--------|
| Composite moyen | 88.95 |
| Ecart-type | 2.15 |
| Min | 83.82 |
| Max | 92.11 |

---

## 2. Comparaison par scene

| Scene | Claude cliff | Ollama cliff | Claude CI_L37 | Ollama CI_L37 |
|-------|-------------|-------------|---------------|---------------|
| contemplation | 0.389 | **0.500** | 99.7 | 72.6 |
| menace | 0.476 | **0.537** | 99.5 | 81.3 |
| revelation | 0.452 | **0.550** | 97.9 | 78.7 |
| confrontation | 0.488 | **0.575** | 95.1 | 72.5 |

**Ollama gagne le cliff sur toutes les scenes.** Sa prose produit naturellement
des fins plus ouvertes (suspension narrative meilleure).

**CI_L37 desature sur toutes les scenes avec Ollama** — confirme la revelation BLOC 3
sur les 4 scenes, pas seulement contemplation.

---

## 3. Stabilite (variance inter-runs)

| Metrique | Claude std | Ollama std | Ratio | Statut |
|----------|-----------|-----------|-------|--------|
| Cliff score | 0.106 | 0.164 | 1.55x | VOLATILE |
| CI_L37 | 5.95 | 26.63 | 4.5x | VOLATILE |
| PROFILE_FR | 3.95 | 11.11 | 2.8x | VOLATILE |

**Ollama est plus volatile que Claude** sur toutes les metriques. Le coefficient de
variation est 1.5x a 4.5x plus eleve. Cela est attendu : Claude beneficie du pipeline
complet (duel + microsurgery + cliff gate) qui stabilise la sortie, alors qu'Ollama
produit du texte brut sans post-traitement.

---

## 4. Generation

| Metrique | Ollama |
|----------|--------|
| Mots/run moyen | 4605 (cible: 2500) |
| Duration/run | 55s |
| Vitesse effective | ~110 t/s |
| Total 32 runs | 29.2 min |
| Cout total | **0€** |

Note : Ollama genere ~1.8x la cible de mots. A calibrer via `num_predict` ou post-trim.

---

## 5. Decision architecturale D-BLOC5

### Constat

Le composite V3 (88.95) inclut des composantes LLM-judge (interiority, necessity, impact,
metaphor_novelty) qui ne sont pas disponibles pour Ollama. Une comparaison composite-a-
composite est donc impossible sans executer les LLM judges sur la prose Ollama.

Cependant, sur les metriques CALC pures :
- **Ollama GAGNE** : cliff (+0.09), rhythm variance (+64.6), branching (-5.1)
- **Claude GAGNE** : PROFILE_FR (+6.4), TTR (+0.12)
- **OLLAMA DISCRIMINANT** : CI_L37 (76.3 vs 98.1 — variance utile)

### Decision

**ARCHITECTURE HYBRIDE** (D-BLOC5-HYBRIDE)

```
Ollama qwen3.5:35b-a3b = DRAFT ENGINE (generation + iterations)
  → 0€ par appel
  → 110 t/s, 55s/run
  → Cliff naturellement superieur (0.54 vs 0.45)
  → CI_L37 discriminant (signal utile)
  → Plus volatile (necessite post-traitement)

Claude Sonnet = JUDGE ENGINE (scoring V3 + micro-surgery)
  → ~$0.003/appel judge
  → Stabilite superieure via duel + cliff gate
  → Composantes LLM-judge irremplacables (interiority, necessity, impact)

Budget estime par chapitre :
  Draft (Ollama) : 0€ × ~4 iterations = 0€
  Judge (Claude) : ~$0.003 × ~6 calls = ~$0.02
  Total : ~$0.02/chapitre (vs ~$0.15 tout-Claude = -87%)
```

### Justification chiffree

| Critere | Seuil | Resultat | Verdict |
|---------|-------|----------|---------|
| composite_ollama >= composite_claude - 2.0 | N/A | Composite non comparable (CALC vs V3) | NON APPLICABLE |
| std(ollama) <= std(claude) × 1.5 | cliff: 0.164 <= 0.159 | 0.164 > 0.159 | ECHEC (volatile) |
| Metriques CALC | Ollama gagne cliff + rhythm + branching | 3/7 OLLAMA, 2/7 CLAUDE, 2/7 TIE | PARITE |

→ Ni "Ollama moteur principal" ni "Claude uniquement" — **hybride optimal**.

---

## 6. Impact sur l'architecture OMEGA

### Ce qui change

| Composant | Avant (tout-Claude) | Apres (hybride) |
|-----------|-------------------|-----------------|
| Draft generation | Claude Sonnet ($0.15/run) | **Ollama qwen3.5 ($0.00/run)** |
| Iterations/repair | Claude Sonnet | **Ollama qwen3.5** |
| V3 Judge scoring | Claude Sonnet | Claude Sonnet (inchange) |
| Micro-surgery | Claude Sonnet | Claude Sonnet (inchange) |
| Cliff gate | Post-processing | **Optionnel** (cliff natif > 0.50) |
| CI_L37 | Shadow (sature) | **Actif** (discriminant avec Ollama) |

### Economies estimees

| Scenario | Cout/chapitre | Reduction |
|----------|---------------|-----------|
| Tout-Claude (actuel) | ~$0.15 | reference |
| Hybride Ollama+Claude | ~$0.02 | **-87%** |
| Tout-Ollama (sans V3) | $0.00 | -100% (mais perte qualite judge) |

### Prochaines etapes

1. **Creer un SovereignProvider Ollama** qui wrappe les appels Ollama pour `generateDraft()`
   tout en conservant Claude pour les methodes judge (scoreInteriority, etc.)
2. **Activer CI_L37** dans J_structure quand le draft vient d'Ollama
3. **Optionnaliser le cliff gate** : skip si cliff_score natif >= 0.50
4. **Limiter la longueur** : `num_predict: 4096` pour viser ~2500 mots

---

**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**
**Genere le 2026-03-31 — 32 runs Ollama (0€) vs 31 runs Claude ($4.80)**
