# WS-D R1 — TRIPLE-PREUVE : DIVERGENCE → STOP (le garde-fou a fonctionné)

**Date** : 2026-06-01 · CALC autonome, READ-ONLY. Doctrine Architecte : aucune modif moteur sans **3 preuves indépendantes convergentes (3/3, pas 2/3)**.
**Outil** : `scripts/metrology/wsd-r1-triple-proof.ts`. Claim testé : « IFI est un bottleneck dominant du min_axis ; le reclasser ADVISORY relève le min_axis / récupère la prose. »

## 1. Résultats par corpus indépendant

| Corpus | n | IFI = axe min | min_axis médiane OLD→NEW | claim |
|---|---|---|---|---|
| **maîtres (WS-C)** | 95 | **87 %** | 49.2 → 72.4 (lift +23.2) | ✅ CONVERGE |
| **ALTERNANCE** (OMEGA output, phases 1-3) | 12 | **17 %** | 81.4 → 83.1 (lift +1.7) | ❌ DIVERGE |
| goldens (legacy flat-axis) | 7 | n/a (schéma legacy) | signature=100, anti_cliche=100, sensory_density=71, tension_14d=52 | directionnel |

## 2. VERDICT : 1/2 macro convergent → **STOP. R1 NON confirmé. AUCUN code.**
La doctrine 1000% exige 3/3. On a 1/2 sur les corpus macro → **divergence → on n'applique RIEN.** La triple-preuve a fait exactement son travail : **empêcher une modification moteur fondée sur une preuve corpus-spécifique (les maîtres seuls).**

## 3. Ce que la divergence RÉVÈLE (plus important que R1)
- Sur les **maîtres** (littérature classique), IFI est le goulot (min dans 87 %) → reclasser récupère.
- Sur la **sortie OMEGA** (ALTERNANCE, goldens), IFI **n'est PAS le goulot** (17 %, min_axis déjà ~81) : la prose K2 **sature les capteurs keyword** (signature 100, anti_cliche 100, sensory_density 71) que les maîtres ratent.
- → **IFI n'est pas "cassé/toujours bas" : il est K2-CIRCULAIRE.** Il récompense la densité-keyword du style de l'engine. Les chefs-d'œuvre classiques (immersion indirecte, anglais) ne la produisent pas → ils chutent ; l'output OMEGA la produit → il passe.
- **Conséquence** : « reclasser IFI advisory » ne change le verdict que pour le **scoring de littérature**, pas pour le **gating de la génération**. Les deux usages divergent → **pas de fix universel naïf**. C'est la même circularité que RCI (calibré-K2) — généralisée à IFI.

## 4. Implication pour la reconstruction (rien appliqué)
- R1 tel que formulé (« IFI advisory ») est **insuffisant et corpus-dépendant** → ne PAS l'appliquer.
- Le vrai problème = **circularité** : les capteurs keyword (IFI sensory/corporeal, signature, anti_cliche) mesurent la conformité au style-keyword de l'engine, pas la qualité littéraire absolue. Ils sont satisfaits par l'output OMEGA et ratés par les maîtres.
- La voie correcte (R2, à prouver ×3 elle aussi) : **remplacer le keyword par du sémantique langue-aware** ET **distinguer le rôle scoring-littérature (calibration) du rôle gating-génération**. Un capteur peut être advisory pour l'un et gating pour l'autre.
- 3ᵉ preuve macro (goldens re-scorés moteur macro, terminal) reste requise pour TOUTE décision ultérieure.

## VERDICT
- Statut : PASS (triple-preuve exécutée ; DIVERGENCE détectée ; STOP respecté).
- Confiance : Haute (2 corpus macro indépendants mesurés ; divergence nette 87% vs 17%).
- Forces : la discipline 1000% a empêché un mauvais changement ; révèle la circularité K2 d'IFI (plus profond que « IFI bas ») ; aucune modif moteur.
- Faiblesses : (1) goldens en schéma legacy → 3ᵉ preuve macro pas faite (re-score terminal requis) ; (2) ALTERNANCE n=12 (petit) ; (3) le claim R1 était mal formulé (corpus-spécifique) — à reformuler autour de la circularité.
- Action requise : ABANDONNER R1 « IFI advisory » comme fix universel. Reformuler : (a) capteurs keyword = K2-circulaires → R2 sémantique ; (b) séparer rôle calibration-littérature vs gating-génération. Chaque future décision : triple-preuve 3/3 sur 3 corpus indépendants AVANT code. Aucun code engagé.
