# WS-D R5 — CHANTIER CAPTEUR QUALITÉ FRANÇAIS (design, doc-only)

**Date** : 2026-06-02 · **Statut** : DESIGN (option B ratifiée Architecte) · **Doctrine** : EMP-16, EMP-12 METRIC_HONESTY, DEC-011 (anti-circularité)
**Origine** : WS_D_R4_LARGE_VERDICT — en français, aucun axe LLM existant ne discrimine la qualité de façon robuste (euphony/authenticity = anglophone-dominants).

---

## 1. Diagnostic : pourquoi les axes LLM échouent en FR

- **Saturation du scoring absolu** : necessity 82-94 pour TOUT le monde, show_dont_tell/anti_cliche = 100 partout. Un juge LLM
  noté en absolu sur 0-100 n'OSE pas sanctionner un texte publié → il sature haut, ne discrimine pas. (Confirmé R4-large.)
- **necessity = inversé/mécanique** : mesure la nécessité de l'intrigue (forte chez la pulp plot-driven), pénalise la digression
  littéraire (forte chez les maîtres). Mesure la mécanique commerciale, pas l'art.
- **Biais anglophone** : euphony FR 0.59 vs EN 0.94 ; authenticity FR 0.58 vs EN 0.86. Les prompts/CALC sont calibrés EN.
- **Hypothèse centrale** : le scoring ABSOLU est le mauvais paradigme. Un juge LLM discrimine bien mieux en **choix forcé par paires**
  ("lequel de ces deux passages est la prose la plus accomplie ?") — calibration-free, robuste à la saturation.

## 2. Deux pistes expérimentales (R5), zéro code moteur

### Piste 1 (PRINCIPALE) — Juge PAR PAIRES en choix forcé (FR)
Pour chaque paire (passage maître FR, passage pulp FR) de même longueur : demander au LLM, en français, lequel est la prose
la plus accomplie littérairement. **Randomiser l'ordre A/B** (chaque paire jouée 2 fois, ordres inversés) pour neutraliser le
biais de position. Métrique : **taux de victoire du maître** = AUC pairwise (calibration-free).
- Avantage : pas de seuil absolu, pas de saturation, mesure directe du pouvoir discriminant.
- Si le taux de victoire maître ≥ ~0.75 stable (et symétrique sur les 2 ordres) → **le LLM SAIT discriminer la qualité FR**,
  c'est le scoring absolu qui était le problème → on pourra bâtir un capteur qualité FR sur un protocole pairwise/ELO.

### Piste 2 — Prompts ABSOLUS candidats (FR), few-shot ancré
3 dimensions ciblant ce qui sépare Flaubert de la pulp en français, avec consigne explicite de NOTER LARGE (anti-saturation) :
- **PROFONDEUR** : densité de sens / pensée au-delà de l'action ; littérature exigeante vs divertissement.
- **STYLE** : sophistication syntaxique, justesse lexicale, contrôle du registre, absence de facilité.
- **VOIX** : singularité irremplaçable vs prose générique/interchangeable.
Métrique : AUC FR maîtres vs pulp par dimension. Comparer à pairwise.

## 3. Protocole (R5 harnais — `scripts/metrology/wsd-r5-fr-quality-probe.ts`)

- Corpus FR : maîtres (9) × pulp (9) de corpus_r ; échelle(s) configurable(s) (défaut 1500 mots, option 600/3000).
- Appels via `provider.generateStructuredJSON(prompt)` → JSON {score} ou {winner} — **AUCUNE modification moteur** (prompts dans le tooling).
- Pairwise : 81 paires × 2 ordres (anti-biais) ; absolu : 18 passages × 3 dimensions.
- Stats : AUC pairwise (taux victoire maître), AUC absolu par dimension, **contrôle biais position** (écart ordre A/B), IC95 bootstrap.
- EN en regard (contrôle) : refaire pairwise EN pour comparer le pouvoir discriminant FR vs EN du MÊME protocole.
- Crash-safe JSONL, scores+sha+mots only (droits), preflight Ollama, terminal Architecte.

## 4. Critères (EMP-16)

- **Pairwise probant** si taux victoire maître ≥ 0.75 en FR, **symétrique** (biais position < 0.10), p<0.05 → le LLM discrimine la qualité FR.
- **Prompt absolu valide** si AUC FR ≥ 0.70, IC_bas > 0.60, sur ≥2 échelles.
- Si pairwise FR ≥ 0.75 mais absolu sature → conclusion : **adopter un capteur qualité pairwise/ELO**, pas absolu (refonte juge).
- Si même le pairwise FR échoue (~0.5) → conclusion lourde (METRIC_HONESTY) : le LLM local (qwen3:32b) ne perçoit pas la
  qualité littéraire française → besoin d'un modèle plus fort ou d'un autre paradigme. À acter.

## 5. Gates

- **Zéro code moteur** en R5 : tout se fait dans le tooling (prompts expérimentaux). Une intégration moteur (nouveau capteur)
  ne viendra qu'APRÈS un signal FR prouvé 3/3 (EMP-16) + ADR + EMP-10 terminal.
- **Anti-circularité (DEC-011)** : on ne dérive aucun contrat depuis la prose ; on mesure une préférence de qualité intrinsèque.
- **Droits** : corpus sous droits = mesure interne, scores only.
- O2 reste shadow ; aucun seuil prod touché.

## 6. Livrables R5

`wsd-r5-fr-quality-probe.ts` + `WS_D_R5_FR_QUALITY.{jsonl,json,csv}` + verdict `WS_D_R5_RESULTS_VERDICT.md` (après run terminal).
