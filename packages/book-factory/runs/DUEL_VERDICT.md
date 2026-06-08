# VERDICT DUEL SCRIBES — gemma4 vs mistral-small (50 chap, même PLAN_LOCK)

**Date** : 2026-06-08 · **Méthode** (plan Francky) : chaque modèle avec SA config d'escalade calibrée (neutralise l'avantage terrain) · même `PLAN_LOCK df8d650f`.

## Le résultat majeur : la dérive dramatique est GUÉRIE (les deux)

| | 88k | EMP-16 | V2 | **gemma4 V3** | **mistral V3** |
|---|---|---|---|---|---|
| TRANSITION ratio | 0.72 | 0.58 | 0.48 | **0.38** | **0.42** |
| RÉVÉLATION (count) | 0 | 2 | 2 | **14** | **16** |

L'escalade calibrée (gemma4 few-shot ; mistral REV-natif/CONF-few-shot) a fermé la dérive que tout le travail S0/V2 cherchait. C'est le gain principal — plus grand que le choix du scribe.

## Comparaison tête-à-tête (batterie complète)

| Dimension | gemma4 (fewshot) | mistral-small (natif/fewshot) | Avantage |
|---|---|---|---|
| Mots / chap | 1689 | 1884 | mistral |
| **SEMANTIC_CLEAN** | ✅ true (0 résidu) | ❌ false (3 résidus) | **gemma4** |
| **Tics /1000w** | **1.50** | 3.19 | **gemma4** (2× plus propre) |
| Incipits uniques | 40/50 | **47/50** | mistral |
| Incipits clones | 0 | 0 | égalité |
| Incipits météo | 0 | 0 | égalité |
| RÉVÉLATION | 14 | **16** | mistral |
| CONFRONTATION | **11** | 9 | gemma4 |
| TRANSITION ratio | **0.38** | 0.42 | gemma4 (les 2 ≤ 0.45 ✅) |
| Graines payées | 5/5 | 5/5 | égalité |
| Pacing cv | **0.59** | 0.499 | gemma4 (moins plat) |
| Drift C17 | 0.69 | 0.70 | ~égalité |
| Regens C17 | 14 | **17** | gemma4 (moins) |
| Entropie sélecteur | 0.94 | **0.99** | mistral (plus varié) |

## Lecture

- **gemma4 = le scribe le plus PROPRE et CONTRÔLABLE** : 2× moins de tics, SEMANTIC_CLEAN (0 résidu vs 3), moins de regens, rythme moins plat, TRANSITION la plus basse. C'est aussi toute la base de calibration existante.
- **mistral-small = le plus DIVERS et PRODUCTIF** : plus d'incipits uniques, plus de révélations, entropie de sélecteur quasi-parfaite, chapitres plus longs — mais 3 résidus sémantiques et 2× plus de tics à nettoyer.
- **Aucun n'est NARRATIVE_CLEAN** (gemma4 : redites de fonction résiduelles ; mistral : 3 résidus sémantiques) — le notaire reste honnête.

## VERDICT

- **Statut** : **PASS** — duel concluant, calibration validée sur livre complet ×2.
- **Recommandation (avis, décision Architecte)** : **garder gemma4 en scribe de production.** Il est nettement plus propre (tics, sémantique, regens) et représente l'intégralité de la base de calibration ; passer à mistral-small échangerait un gain marginal de diversité contre 2× plus de tics + 3 résidus à réparer, et invaliderait le corpus gemma4. **mistral-small reste un challenger calibré sérieux** à garder sous le coude (variété, modes spécifiques, ou si on veut pousser la diversité d'incipits).
- **Faiblesses** : N=1 livre/modèle (pas de réplication multi-seed du livre entier) ; relecture qualitative humaine non substituable (les marqueurs mesurent la structure, pas le souffle) ; mistral non encore optimisé sur ses 3 résidus.
- **Action requise** : **ta décision** sur le scribe de production. Si gemma4 : rien à changer (déjà câblé). Si mistral : il faut traiter ses 3 résidus sémantiques + son profil de tics avant production.
