# S1D — CHOC DES TITANS : VERDICT (embeddings vs qwen3 vs gemma4)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Gold-Set** : v4 scellé (4388b4b6) · **Run** : 480 jugements pairwise double-ordre, cache crash-safe

## Tableau final
| Contraste | Embeddings nomic (AUC) | qwen3:32b (win_rate / biais) | gemma4:31b indép. (win_rate / biais) |
|---|---|---|---|
| FR MASTER_NATIVE vs D_SOURCE_REAL | **0.840** [0.55,0.91] | 0.763 [0.65,0.86] / **pb 0.71** | **0.988** [0.96,1.0] / pb 0.51 |
| FR MASTER_NATIVE vs C_FORMULAIC | **0.821** [0.56,0.92] | 0.750 [0.67,0.83] / **pb 0.75** | **1.000** [1.0,1.0] / pb 0.50 |
| EN MASTER_NATIVE vs C_FORMULAIC | **0.860** [0.63,0.96] | 0.838 [0.77,0.93] / pb 0.64 | **1.000** [1.0,1.0] / pb 0.50 |

## Constats
1. **gemma4:31b = discriminateur quasi parfait ET non biaisé** (0.99-1.00 ; position_bias 0.50-0.51 sur les 3 contrastes). Il écrase embeddings (0.82-0.86) et qwen3.
2. **qwen3:32b = juge médiocre et fortement biaisé en position** (0.75-0.84 ; pb 0.64-0.75). **Disqualifié** comme juge propre. (Mon comparatif provisoire « embeddings ≥ juge » venait d'avoir comparé au MAUVAIS juge.)
3. **Embeddings = signal réel, non-circulaire, sans biais de position, FR-robuste**, mais point estimate inférieur à gemma et IC large (n faible).

## ⚠️ CAVEAT BLOQUANT (METRIC_HONESTY) — pourquoi 0.99-1.00 est SUSPECT
Un score quasi parfait sur ce contraste **n'est PAS une preuve de discrimination de QUALITÉ**, parce que le contraste est **confondu par l'ÉPOQUE** :
- Maîtres = surtout canon **ancien** (Flaubert 1857, Hugo, Proust 1913, Mérimée, Chateaubriand…) — langue/registre du 19ᵉ-début 20ᵉ.
- D/C = pulp/genre **moderne** (Thilliez, Musso, Bussi, romance 2000-2024) — langue contemporaine.
- gemma détecte très probablement **archaïque vs moderne** (vocabulaire, syntaxe, registre), voire des **artefacts de format** (Gutenberg vieux vs epub récent), **PAS** la qualité littéraire intrinsèque. Un juge parfait sur un axe confondu mesure le confond, pas la cible.

→ **Le 0.99 de gemma ne peut pas être pris pour argent comptant.** C'est exactement le piège « époque » signalé par l'Architecte, ici sur l'axe qualité.

## VERDICT FORK (honnête)
- **Pas de pivot net.** gemma = le plus fort MAIS sa quasi-perfection = drapeau rouge de confond d'époque ; embeddings = honnête mais IC large.
- **Juge retenu = gemma4** (qwen3 disqualifié pour biais). Mais **statut = NON VALIDÉ comme juge de qualité** tant que le confond d'époque n'est pas neutralisé.
- **Test décisif requis** : re-jouer sur des paires **APPARIÉES PAR ÉPOQUE** — maîtres MODERNES (Ernaux, Modiano, Le Clézio, Quignard + holdout `livres_payants` Carrère/McCarthy/Duras/Morrison) **vs** pulp/genre moderne. Si gemma reste >0.85 sur du moderne-vs-moderne → il mesure vraiment la qualité. S'il s'effondre vers 0.5 → il mesurait l'époque.

## VERDICT
- **Statut** : S1D Choc des Titans COMPLET. gemma4 >> embeddings > qwen3, MAIS résultat **confondu par l'époque** → discrimination de qualité **non prouvée**.
- **Confiance** : Haute sur les mesures ; Basse sur l'interprétation « qualité » (confond non neutralisé).
- **Forces** : juge indépendant gemma (anti-circularité) non biaisé ; embeddings non-circulaires confirmés ; qwen disqualifié sur preuve (biais 0.71-0.75).
- **Faiblesses** : (1) confond époque massif (maîtres anciens vs bas modernes) ; (2) 0.99-1.00 = trop parfait, artefact probable ; (3) embeddings IC large (n) ; (4) granularité fine non testée.
- **Action requise** : test **époque-apparié** (modern-vs-modern) avant toute conclusion sur le juge de qualité. FORK reste HOLD. Décision Architecte.
