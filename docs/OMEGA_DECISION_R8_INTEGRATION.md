# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DÉCISION ARCHITECTURALE R-8.7
# Séparation Juge / Physicien / Metteur en scène
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date    : 2026-03-21
# Commit  : 5be9c789
# Status  : VERROUILLÉ
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# DÉCISION : R-8 NON INTÉGRÉ AU SCORER PAR-ŒUVRE

## Résultat empirique

| Modèle | Features | Spearman | Holdout R² | S/D inversions |
|--------|----------|----------|-----------|----------------|
| V1 (baseline) | 42 | 0.7865 | 0.326 | 19/2780 |
| V2 (+assembly) | 47 | 0.6989 | 0.297 | 50/2780 |
| V3 (+typological) | 55 | 0.7095 | 0.317 | 78/2780 |

V2 et V3 DÉGRADENT les 3 métriques. Décision : NE PAS INTÉGRER.

## Cause identifiée

r8_assembly_bonus_rhythm capture 37.6% de l'importance dans V2.
Le GB overfit sur ce signal bruyant (moyenne de ~10 blocs par œuvre)
au détriment des 42 features stables mesurées au niveau texte entier.

## Architecture résultante : 3 couches séparées

### Couche 1 — LE JUGE (scorer officiel)

GB V1, 42 features, Spearman 0.79.
Évalue l'ŒUVRE ENTIÈRE. Ne change PAS tant qu'un successeur ne le bat pas.

### Couche 2 — LE PHYSICIEN (R-8 explicatif)

Ci,f + λ + γ + Tk + trigrams + bonus assemblage.
Explique POURQUOI une prose tient ou craque.
Ne JUGE PAS directement.

### Couche 3 — LE METTEUR EN SCÈNE (R-8 passage-level)

Normaliseur typologique pour évaluation de PASSAGES (500-2000w).
Contraintes pour le Scribe : Tk, Circuit Flaubert, inversions TTR/POV.
Ne remplace PAS le juge. GUIDE la génération.

## Règles verrouillées

1. Scorer officiel = V1 uniquement
2. R-8 non intégrable tel quel au niveau œuvre
3. R-8 validé comme couche explicative et passage-level
4. Toute future intégration doit battre V1 sur Spearman + inversions + holdout
5. Interdiction de réinjecter features R-8 globales sans nouveau comparatif

---

*Décision validée par Francky (Architecte) + ChatGPT (Auditeur)*
*Commit: 5be9c789 — Tag: phase-r8-complete*
