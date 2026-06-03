# ATELIER FORGE PASSES v0 — RAPPORT (DEC-017 P5)

**Date** : 2026-06-02 · **Modèle** : qwen3:32b · **Tooling pur** · **Entrée** : v4 gagnante de P4 (BEST_OF_N_V0_WINNER.txt)
**Artefacts** : `ATELIER_PASSES_V0.{json,jsonl}`, `_RESULTS.csv`, `_PAIRWISE_MATRIX.csv`, `_FINAL.txt` · script `scripts/generation/forge-passes.ts`

---

## 1. Protocole
3 passes CUMULATIVES de réécriture (générées via Ollama, temp 0.4) : p1 LANGUE → p2 SOUS-TEXTE → p3 RYTHME/EUPHONIE/FLAUBERT.
Score profondeur/style/voix après chaque + tournoi pairwise {original, p1, p2, p3} (C(4,2)×2 = 12 comparaisons, 2 ordres).

## 2. Résultats

| version | mots | profondeur | style | voix | **mean** | victoires pairwise |
|---|---|---|---|---|---|---|
| original (v4) | 1124 | 82 | 87 | 87 | 85.33 | **5** |
| **p1_langue** | 1123 | 85 | 87 | 87 | **86.33** | **5** |
| p2_soustexte | **546** | 78 | 78 | 72 | 76.0 | 1 |
| p3_rythme_flaubert | **529** | 78 | 78 | 78 | 78.0 | 1 |

Matrice : original et p1 se partagent 1-1 (vrai ex-æquo) ; **tous deux battent p2 et p3 2-0**. final p3 vs original = **0-2**.

## 3. Verdict P5 : critère NON atteint (FAIL littéral) — mais résultat très instructif

Critère roadmap = « la version finale (p3) bat l'original en pairwise sans devenir explicative/décorative ». **NON atteint** : p3 perd 0-2.

**Mais la vérité est nuancée et utile :**
1. **La passe de NETTOYAGE (p1) est un gain RÉEL et vérifié.** mean 85.33 → **86.33**, **longueur préservée** (1124→1123), et — vérifié à l'œil — les fautes signalées sont corrigées (« que à la certitude » → « qu'à », « les émotions se réveilla » → accord corrigé). p1 fait au moins jeu égal avec l'original (1-1), avec un meilleur score. **Le marteau « langue » forge correctement.**
2. **Les passes de TRANSFORMATION (p2, p3) ont ÉCHOUÉ par DÉRIVE DE LONGUEUR.** Le modèle, sommé de « montrer pas dire » puis de « casser le rythme », a **compressé le texte de moitié** (1123 → 546 → 529 mots) au lieu de transformer sur place : matière perdue → score chute (76, 78) → défaite 0-4 contre original+p1.
3. **Le juge a été ROBUSTE (point positif majeur, anti-« religion du score »).** Il n'a PAS été berné : il a préféré l'original plus complet aux réécritures tronquées. Le sélecteur protège contre la dégradation — exactement ce que le Tribunal demandait de vérifier.

## 4. Cause-racine & correctif (P5.1 proposé)

**Cause** : les prompts de réécriture p2/p3 n'imposaient pas de contrainte de longueur → le LLM a résumé. Le chaînage cumulatif a amplifié la perte.
**Correctif P5.1** (à valider) :
- contrainte dure « **conserve ±10 % du nombre de mots, transforme SUR PLACE, ne résume pas** » dans chaque prompt de transformation ;
- passes **non cumulatives** (chacune repart de p1-langue, la version saine) OU garde-fou de longueur entre passes ;
- re-tournoi {original, p1, p2', p3'}.

## 5. Conclusion honnête (METRIC_HONESTY)
- **L'atelier SAIT améliorer la langue** (p1 : +mean, fautes corrigées, longueur tenue) — le travail « forge » est validé sur ce registre.
- **L'atelier de transformation stylistique (sous-texte/rythme) n'est PAS encore au point** : dérive de compression à corriger (P5.1). Ce n'est pas un échec du concept, c'est un défaut de garde-fou de prompt, diagnostiqué.
- **Le juge ne se laisse pas tromper** par une réécriture qui perd de la matière — résultat rassurant pour DEC-017.
- Caveats P4 toujours valides (même juge advisory, granularité <1200, 1 brief/run).

**P5 = FAIL sur le critère littéral, PASS comme diagnostic** : on sait maintenant que la forge marche pour la langue, dérive sur la transformation, et que le juge protège contre la dégradation. Décision P5.1 (garde-fou longueur) = Architecte.
