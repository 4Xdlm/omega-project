# NIGHT RUN 2026-06-02 — IntrinsicQuality shadow + Atelier Best-of-N (clôture P0→P5.1)

**Branche** : phase-r-dispatcher-v33 · **Mode** : roadmap nocturne dispatch phase par phase · **Modèle** : qwen3:32b (Ollama local)
**Cadre** : OPÉRATION SHADOW — aucun seuil prod touché, O2/DEC-009/fusion/gate-dur en HOLD, FROZEN intact, EMP-10/EMP-16.

---

## 0. Résumé exécutif
La nuit a transformé le module `IntrinsicQuality` (validé standalone, DEC-017) en **outil shadow câblé** et a ouvert l'**atelier de génération Best-of-N**. Tout est poussé sur origin, suite de tests **100 % verte**, moteur de production **inchangé**. Bilan : le **sélecteur** fonctionne, la **forge-langue** améliore, la **forge-style** est neutre, et la **limite du juge est cartographiée** (sélecteur grossier fiable, pas discriminateur fin).

## 1. Commits poussés (origin, sync 0/0)
| commit | objet |
|---|---|
| `8fea60c9` | docs(ops) PATHEXT recovery |
| (P0) | push des 21 commits métrologie + evidence ECC/R2.1 |
| `42773dc5` | feat P2 — câblage shadow `judgeAestheticV3` |
| `71c7c944` | feat P4 — Atelier Best-of-N v0 |
| `7aadc335` | feat P5 — Forge passes v0 (drift diagnostic) |
| `25f61bca` | feat P5.1 — Forge passes length-guarded |

## 2. PATHEXT fix (déblocage système)
Cause des « node/ollama/git non reconnu » = **PATHEXT=.CPL** corrompu dans les terminaux app Claude (pas le PATH). Fix : `set PATHEXT=.COM;.EXE;.BAT;.CMD;.PS1`. Documenté `docs/ops/PATHEXT_CLAUDE_TERMINAL_RECOVERY.md`. **Conséquence** : cycle complet (tsc, vitest, Ollama, commits) exécutable depuis DC — toute la nuit l'a confirmé.

## 3. Module shadow — état
- `packages/sovereign-engine/src/oracle/intrinsic-quality/intrinsic-quality.ts` : `scoreIntrinsicQuality` (profondeur+style+voix @scène) + `pickBestPairwise` (best-of-N, 2 ordres) + `shadowLogIntrinsicQuality`.
- **Câblé** dans `judgeAestheticV3` (aesthetic-oracle.ts) en miroir de `maybeAttachDispatcher` : appel APRÈS verdict, return inchangé.
- Flag `OMEGA_INTRINSIC_QUALITY` : `'0'` (défaut, **zéro appel LLM, comportement bit-identique**) | `'shadow'` (télémétrie log only, ne modifie jamais le verdict, ne lève jamais).
- **Advisory only** : n'entre ni dans min_axis, ni composite, ni SEAL. Gate dur = DEC futur (n≥30).

## 4. Tests / gates (EMP-10)
| gate | résultat |
|---|---|
| `tsc --noEmit` (package) | PASS, 0 erreur (avant + après câblage) |
| `vitest tests/intrinsic-quality` | 20/20 PASS (logique pure + orchestration + non-régression câblage) |
| `vitest run` (suite complète) | **2544 passed, 0 failed**, 56 skipped (240 fichiers) |
| smoke live Ollama | Flaubert mean 84 vs pulp 33 ; pickBest maître 2/2 ordres |
Note : les 5 « échecs » d'environnement (gate-roadmap/proofpack) de la baseline étaient l'artefact PATHEXT ; corrigé → suite 100 % verte.

## 5. Atelier Best-of-N v0 (P4) — PASS
Brief « Le Gardien », 5 variantes (~1000-1124 mots), scoring + tournoi pairwise 20 comparaisons (2 ordres).
- Scores 82-86 ; gagnante **v4** (5 victoires, mean 86.33, ex-æquo v1) → le sélecteur départage le haut du classement, ne choisit pas une variante faible. **PASS** (flux génération→scoring→pairwise→sélection validé).
- Observation : prose OMEGA 82-86 ≈ Flaubert 84 **sur ce juge** — à caveat (même juge advisory, pas validation indépendante).

## 6. Passes de forge (P5 puis P5.1) — diagnostic + correctif
**P5 (cumulatif, sans garde-fou)** : p1 LANGUE = gain réel (mean 85.33→86.33, longueur tenue, **fautes corrigées vérifiées** « qu'à », accord « se réveillaient »). p2 SOUS-TEXTE + p3 RYTHME = **échec par compression** (1123→546→529 mots) → perdent 0-4. Le **juge a rejeté les versions tronquées** (robustesse). Cause : pas de garde-fou longueur + chaînage cumulatif.

**P5.1 (length-guarded, non cumulatif depuis p1)** : garde-fou **élimine la dérive** (p2a 1123, p3a 1116, drift_ok). MAIS transforms **neutres-à-négatifs** (p2a = p1 86.33 ; p3a 83). Tournoi **3-3-3-3 ex-æquo** → **le juge ne discrimine pas des variantes proches**.

## 7. Gagnante de la nuit
**`p1_langue`** (v4 nettoyée) — 1123 mots, mean **86.33**, fautes corrigées, en tête du tournoi (à égalité). Prose dans `BEST_OF_N_V0_WINNER.txt` (jet v4) et `ATELIER_PASSES_V1_BEST.txt`. La forge-langue est le seul gain de qualité prouvé.

## 8. Limites (METRIC_HONESTY)
- **Juge GROSSIER, pas FIN** : sépare les grands écarts (maître/pulp, complet/tronqué) mais pas les variantes subtiles d'un même texte propre (3-3-3-3). Cohérent R5-large (force modérée, AUC ~0.85, EN>FR).
- **Même juge** pour générer-et-juger ; scores « niveau Flaubert » = encourageants, **non prouvés** indépendamment.
- **Granularité** : variantes ~1000-1120 mots, souvent sous le plancher 1200 (`gran=false`), comparables entre elles mais hors plage absolue idéale.
- **Forge-style non démontrée utile** : sous-texte neutre, rythme/Flaubert légèrement négatif à ce grain.
- 1 brief, runs uniques : proof-of-flow, pas preuve statistique.

## 9. Prochaines décisions (gatées, non lancées)
1. **Conserver la forge-LANGUE** (nettoyage) comme acquis ; **suspendre la forge-style** tant que le juge ne sait pas mesurer un gain fin.
2. **Juge plus fin** (futur) : modèle plus fort, ou pairwise multi-juges, ou critère par dimension — pré-requis pour évaluer la transformation stylistique et pour un éventuel gate dur (n≥30).
3. **Génération 1200-1800 mots** : renforcer le prompt/continuation pour rester dans la plage de granularité valide.
4. **O2 flip / paliers / DEC-009 / fusion moteur** : restent HOLD (hors périmètre nuit).
5. **DEC-011** (genesis micro-trajectoire) : pré-requis matière première de qualité — à coder (terminal) quand priorisé.

## 10. État final
Repo **propre, poussé, sync 0/0**. Suite **2544 pass / 0 fail**. Moteur prod **inchangé** (flag défaut '0'). Aucun module FROZEN touché. Tout tracé en docs + commits.

**Phrase de clôture** : *cette nuit, OMEGA n'est pas devenu plus sévère — il est devenu capable de choisir mieux, de nettoyer ce qu'il choisit, et d'avouer honnêtement ce que son juge ne sait pas encore voir.*
