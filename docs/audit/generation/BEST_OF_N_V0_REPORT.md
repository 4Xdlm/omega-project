# ATELIER BEST-OF-N v0 — RAPPORT (DEC-017, Phase 4)

**Date** : 2026-06-02 · **Modèle** : qwen3:32b (Ollama) · **Tooling pur** (zéro code moteur figé) · **Run** : DC autonome (PATHEXT corrigé)
**Artefacts** : `BEST_OF_N_V0.{json,jsonl}`, `_RESULTS.csv`, `_PAIRWISE_MATRIX.csv`, `_WINNER.txt`, script `scripts/generation/atelier-best-of-n.ts`

---

## 1. Protocole
- **1 brief** « Le Gardien » : gardien de phare, dernière nuit, micro-trajectoire émotionnelle (appréhension → peur → mélancolie → acceptation), prose FR littéraire, sans dialogue, ~1500 mots visés.
- **N=5 variantes** générées via `provider.generateDraft` (temp 0.85, seeds diversifiés `bestofn_v0..4`).
- **Scoring** profondeur/style/voix (module DEC-017) sur chaque variante.
- **Tournoi pairwise complet** : C(5,2)=10 paires × **2 ordres** (A1 anti-biais) = 20 comparaisons (juge choix forcé).

## 2. Résultats — scores advisory

| variante | mots | profondeur | style | voix | **mean** | gran. 1200-1800 | victoires pairwise |
|---|---|---|---|---|---|---|---|
| v0 | 1070 | 85 | 82 | 82 | 83.0 | non | 4 |
| v1 | 1080 | 85 | 87 | 87 | **86.33** | non | 4 |
| v2 | 1026 | 85 | 82 | 85 | 84.0 | non | 4 |
| v3 | 967 | 82 | 82 | 82 | 82.0 | non | 3 |
| **v4** | 1124 | 85 | 87 | 87 | **86.33** | non | **5** |

## 3. Matrice pairwise (lignes = bat colonnes, sur 2 ordres)
```
beats\  v0 v1 v2 v3 v4
v0       0  1  1  1  1
v1       1  0  1  1  1
v2       1  1  0  1  1
v3       1  1  1  0  0
v4       1  1  1  2  0
```
La plupart des paires sont serrées (1-1, départage par les 2 ordres). **v4 bat v3 dans les 2 ordres** (2-0), ce qui lui donne l'avantage décisif.

## 4. Verdict de sélection
- **Gagnante pairwise = v4** (5 victoires), `mean` 86.33.
- **Gagnante au score = v1** (mean 86.33, ex-æquo avec v4).
- **Cohérence** : les deux gagnantes sont les **deux plus hauts means (86.33)** ; le tournoi pairwise a tranché l'égalité v1/v4 en faveur de v4. Le sélecteur ne désigne pas une variante faible — il départage le haut du classement. **PASS** (le juge produit un classement cohérent et désigne une gagnante).

## 5. Observation marquante (à caveat)
La prose générée par OMEGA score **82-86** sur le nouveau juge — **au niveau de Flaubert (84) mesuré au smoke**.
**CAVEAT (METRIC_HONESTY)** : c'est le MÊME juge advisory (qwen3:32b, prompts DEC-017). Ce n'est PAS une validation indépendante du niveau littéraire ; ça indique que, selon ce juge, la prose OMEGA et les maîtres sont dans la même bande. Interprétation prudente : soit OMEGA écrit très bien, soit le juge sature vers le haut sur de la prose « propre ». À départager (juge plus fort / corpus aveugle).

## 6. Caveats
- **Granularité** : les 5 variantes font ~967-1124 mots, **sous le plancher 1200** (A2) → `gran=false`. qwen3:32b s'arrête ~1000 mots pour ce brief malgré la consigne 1500 et `draftMaxTokens=3200`. Les variantes restent **comparables entre elles** (longueur homogène), donc le tournoi reste valide ; mais le scoring absolu est hors plage idéale → à relancer avec des variantes plus longues (prompt renforcé / continuation) pour un usage advisory pleinement valide.
- **1 brief, 1 run, même juge** : v0, proof-of-concept du flux, pas une preuve statistique.
- Différence pairwise (v4) vs score (v1) = bruit dans le haut du classement (means identiques).

## 7. Verdict P4 : PASS
Le flux **génération → scoring → tournoi pairwise → sélection** fonctionne de bout en bout, en tooling pur, sans toucher le moteur. Le juge sélectionne le haut du classement de façon cohérente. Limites connues (granularité < 1200, same-judge) documentées.

**Prochain (P5)** : appliquer les passes de forge (voix / euphonie-rythme / sous-texte flaubertien) sur la gagnante v4 et mesurer avant/après — vérifier si la réécriture améliore profondeur/style/voix.
