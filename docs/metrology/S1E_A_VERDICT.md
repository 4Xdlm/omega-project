# S1E-A — VERDICT (crash-test anti-confond : MODERN-vs-MODERN source-blind)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Gold-Set** : v4 scellé (4388b4b6), sous-ensemble MODERNE source-blind
**Cellules** : MODERN_MASTER_FR (16 œuvres / 10 auteurs : Ernaux, Modiano, Le Clézio, Quignard, Duras, Perec, Sarraute, Robbe-Grillet, Butor, Beauvoir) vs MODERN_LOW_FR (23 œuvres / 12 auteurs : Thilliez, Bussi, Chattam, Werber, Musso?, Valognes, Lugand, Legardinier, Giacometti, Higgins Clark, Jacq, Byrd…). Époque neutralisée + extraits source-blind (titres/auteurs/chapitres/en-têtes retirés).

## Résultats
| Instrument | MODERN-vs-MODERN (source-blind) | Rappel S1D (mixte époque) | Biais position | n |
|---|---|---|---|---|
| **gemma4:31b** (pairwise) | **win_rate 1.000** · 0 tie | 0.99 | 0.50 (sain) | 80 jugements |
| **embeddings nomic** (AUC, K-fold/auteur) | **0.785** | 0.84 | n/a | 39 scorés |

## INTERPRÉTATION — le confond d'ÉPOQUE est RÉFUTÉ comme explication unique
Mon soupçon S1D était que le 0.99 = détection « ancien vs moderne ». **Faux** : avec l'époque neutralisée (tout post-1950) ET source-blind, **gemma reste 1.0** et **les embeddings restent 0.79**. Les deux instruments captent un signal **réel** de séparation maître-littéraire / pulp-commercial qui **survit à la neutralisation temporelle**. C'est un résultat POSITIF majeur.

## CAVEATS (ce qui reste suspect)
1. **gemma 1.0 = encore trop parfait** → le **GENRE** n'est pas neutralisé : maîtres = fiction littéraire/introspective, bas = thriller/romance/feel-good. gemma détecte probablement **littéraire-vs-genre** (réel mais catégoriel), pas la qualité pure. → **SAME_GENRE (S1E-B)** = test décisif suivant (littéraire vs commercial DANS le même genre).
2. **Calibration NON mesurée** : 0 tie sur le contraste fort (normal, écart réel), MAIS les **negative-controls (master-vs-master, pulp-vs-pulp) ont HANG** côté gemma (reload VRAM) → le tie_rate sur paires proches reste à mesurer (re-run isolé requis). Un juge à 0% de tie même entre deux maîtres = mal calibré.
3. **embeddings 0.79** : baisse modeste vs 0.84 → une part du 0.84 mixte ÉTAIT de l'époque, mais le résiduel 0.79 est **réel** et pile au **plafond mondial qualité (~0.75-0.80)** → géométrie viable, era-robuste.

## VERDICT
- **Statut** : S1E-A discrimination = PASS (signal réel, era-robuste, source-blind) ; calibration = INCOMPLET (NC hang) ; robustesse genre = À TESTER (S1E-B).
- **Confiance** : Haute sur « le signal n'est pas QUE l'époque » ; Moyenne sur « c'est de la qualité » (genre non disentangled) ; Basse sur calibration (NC manquant).
- **Forces** : era réfutée comme confond unique ; gemma 0 biais position ; embeddings era-robustes au niveau SOTA ; source-blind appliqué.
- **Faiblesses** : (1) gemma 1.0 → confond GENRE non écarté ; (2) calibration non mesurée (NC à relancer) ; (3) embeddings non testés vs challenger bge-m3 ; (4) n modéré (10/12 auteurs).
- **Action** : (a) re-run isolé des NEGATIVE_CONTROLS (calibration/tie_rate) ; (b) **SAME_GENRE** (S1E-B, le test qui sépare qualité de catégorie) ; (c) jury 3ᵉ modèle mistral si erreurs indépendantes ; (d) challenger embedding bge-m3. **Pas de pivot/gate avant.**
