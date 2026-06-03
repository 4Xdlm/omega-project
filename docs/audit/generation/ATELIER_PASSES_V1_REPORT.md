# ATELIER FORGE PASSES v0.1 (length-guarded) — RAPPORT (DEC-017 P5.1)

**Date** : 2026-06-02 · **Modèle** : qwen3:32b · **Tooling pur** · **Baseline** : p1_langue (1123 mots) · non cumulatif · garde-fou longueur ±10 %
**Artefacts** : `ATELIER_PASSES_V1.{json,jsonl}`, `_RESULTS.csv`, `_BEST.txt` · script `scripts/generation/forge-passes-v2.ts`

---

## 1. Objectif & correctif testé
Corriger le défaut P5 (compression : 1123 → 546/529 mots). Garde-fou DUR ajouté aux prompts (« conserve ≈ 1120 mots, JAMAIS < 1010, ne résume pas, réécris sur place »), passes **non cumulatives** (chacune repart de p1_langue).

## 2. Résultats

| version | mots | profondeur | style | voix | **mean** | pairwise (sur 12) | drift |
|---|---|---|---|---|---|---|---|
| original (v4) | 1124 | 82 | 87 | 87 | 85.33 | 3 | — |
| p1_langue | 1123 | 85 | 87 | 87 | **86.33** | 3 | ok |
| p2a_soustexte | 1123 | 85 | 87 | 87 | **86.33** | 3 | **ok** |
| p3a_rythme_flaubert | 1116 | 82 | 82 | 85 | 83.0 | 3 | **ok** |

p2a vs p1 = **1-1** ; p3a vs p1 = **1-1**. Tournoi global = **3-3-3-3** (ex-æquo).

## 3. Verdict P5.1

**OBJECTIF CORRECTIF : ATTEINT.** Le garde-fou de longueur **élimine la compression** : p2a 1123 mots, p3a 1116 mots (vs 546/529 en P5). `drift_ok=true` partout. La dérive prouvée en P5 est corrigée.

**MAIS la transformation stylistique n'améliore toujours pas :**
- **p2a (sous-texte)** = strictement **neutre** (scores identiques à p1, 1-1 en pairwise) ;
- **p3a (rythme/Flaubert)** = légèrement **négatif** (mean 83 < 86.33 ; profondeur/style retombent à 82) ;
- aucune transformée ne **bat** p1. **Critère P5.1 (transformée bat p1) : NON atteint.**

## 4. Découverte de fond (METRIC_HONESTY)

**Le tournoi est un quasi-ex-æquo (3-3-3-3) : le juge ne discrimine PAS des variantes stylistiques PROCHES d'un même texte propre.**
- En P4/smoke, le juge sépare nettement les **grands écarts** (Flaubert 84 vs pulp 33 ; original complet vs compressions tronquées en P5).
- Ici, sur 4 versions proches (~1120 mots, toutes « propres »), il ne tranche plus → **3-3-3-3**.
- **Conclusion** : le juge DEC-017 est un **sélecteur GROSSIER fiable** (gros écarts de qualité) mais **PAS un discriminateur FIN** (variantes subtiles du même texte). Cohérent avec R5-large (force « modérée », AUC ~0.85, pas SEAL-grade).

Conséquence pour l'atelier : la **valeur prouvée de la forge est concentrée dans la passe LANGUE** (p1 : +mean, fautes corrigées, longueur tenue). Les passes de **transformation stylistique** sont, à ce stade, **neutres-à-négatives** ET le juge ne saurait de toute façon pas mesurer un gain fin. Forger « le style » au-delà du nettoyage n'est pas démontré utile par ce protocole.

## 5. Décisions / pistes (non lancées)
- **Garder la passe LANGUE** comme acquis (nettoyage = gain réel).
- **Suspendre les passes de transformation stylistique** tant qu'on n'a pas (a) un juge plus FIN (modèle plus fort / pairwise multi-juges / critère par dimension), ou (b) une preuve à l'œil humain qu'un transform améliore (le score ne suffit pas à ce grain).
- Ne PAS empiler des passes que le juge ne peut pas évaluer — risque de dérive non détectée.

**P5.1 = PASS sur le correctif (drift éliminé), FAIL sur l'amélioration (transforms ≤ p1), + découverte : juge grossier non-fin.**
Le juge reste robuste (rejette la dégradation P5 ; ne fabrique pas de faux gain ici — il dit « ex-æquo », ce qui est honnête).
