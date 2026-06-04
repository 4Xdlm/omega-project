# N7 — Forge sémantique causale (leviers de scène vs leviers lexicaux)

**Date** : 2026-06-04 · **Générateur** : gemma4:31b · **Juge** : gemma4 calibré `ecfb32d6` (pairwise A/B+TIE, double-ordre, biais 0.55) · **Radar** : bge-m3, centroïdes maître/pulp LOAO · **Standard** : EMP-16 (3 preuves convergentes), EMP-19 (juge calibré), advisory/shadow.
**Directive Tribunal 2/2** : tester des leviers de SCÈNE (pas lexicaux), 1 levier/passe, thermostat de masse, PASS = ≥1 levier gagne 2/3 chapitres au juge, **STOP après analyse — pas de fusion combinée.**
**Mode** : advisory / mesure pure. **ZÉRO modification moteur.**

## Protocole
3 chapitres OMEGA (low/mixed/master de la télémétrie N5) × 6 leviers sémantiques **isolés** (1 levier/passe) : sous-texte incarné, focalisation/POV, nécessité des images, tension interne, voix singulière, + **few-shot mimétique** (exemplaire maître choisi par proximité tonale bge-m3 parmi les 10 `*-style.txt`). Thermostat de masse ±10 % (rejet <90 % cible). 18 cellules. Script : `scripts/metrology/n7_forge_semantique.py`.

## Résultat agrégé (vs Forge Chirurgicale lexicale = 0/12 victoires)

| Levier | victoires juge | PASS (juge+radar↑) | Δradar moyen | classement |
|---|---|---|---|---|
| **voice (voix singulière)** | **2/3** | 2/3 | −0.00119 | **1er — seul à passer le bar 2/3** |
| internal_tension | 1/3 | 1/3 | −0.00001 | 2e (low Δradar **+0.0066** fort) |
| subtext (sous-texte) | 1/3 | 1/3 | −0.00323 | 3e |
| mimetic (few-shot maître) | 1/3 | 0/3 | −0.00099 | 4e |
| image_necessity | 0/3 | 0/3 | +0.00099 | 5e |
| focalisation | 0/3 | 0/3 | −0.00453 | 6e |

Détail par chapitre : low-like = 3 victoires juge (subtext, internal_tension, voice) ; mixed = **0 victoire** (tout TIE, zone morte, comme en Forge Chir) ; master-like = 2 victoires (voice REWRITE, mimetic REWRITE).

## Lecture causale

1. **Les leviers sémantiques battent les leviers lexicaux — hypothèse Tribunal confirmée.** Là où 4 leviers Rosetta lexicaux faisaient **0/12** au juge (Forge Chir), les leviers de scène font **6 victoires sur 18** et **voice passe le bar 2/3**. L'étage qui sépare OMEGA des maîtres est bien **sémantique** (voix, tension, sous-texte), pas métrique. C'est le premier levier de toute la campagne qui satisfait le critère de promotion-candidate du Tribunal.

2. **DISSOCIATION JUGE ⊥ RADAR (résultat de métrologie majeur).** voice gagne le juge 2/3 mais son **Δradar moyen est négatif** (−0.0012) : il améliore la qualité *perçue* sans déplacer la géométrie bge-m3 vers le maître. Inversement, en Forge Chir les leviers lexicaux bougeaient un peu le radar sans gagner le juge. **Les deux instruments mesurent des axes orthogonaux** : le radar bge-m3 capte une signature lexicale/structurelle, le juge capte la qualité sémantique. Le radar n'est **pas** un proxy de qualité littéraire perçue au niveau sémantique. → ne jamais utiliser le radar seul comme cible de qualité.

3. **Le few-shot mimétique DÉÇOIT.** mimetic = 1/3 victoire, **0 PASS**, Δradar moyen négatif — il ne bat ni voice ni internal_tension. « Montrer un maître » (RAG few-shot, 1 exemplaire par tonalité) n'a PAS surpassé une instruction sémantique directe. Donnée pour la fork V5 : **la voie A (mimétisme contextuel) telle que testée ici est faible** — penche légèrement contre le RAG few-shot naïf, sans le clore (n=3, sélection mono-exemplaire, risque de mimétisme de surface).

4. **EMP-16 : pas de modification moteur.** voice = 2/3, **pas 3/3** ; et radar non convergent (négatif). La règle des 3 preuves indépendantes **convergentes** n'est pas remplie → **aucune promotion en gate, aucune modif moteur, advisory uniquement.** Le chapitre mixed reste une zone morte (0 victoire tous leviers, 2 forges) — confound de packet/scène probable, à isoler.

## Mécanisme — pourquoi / limites / risques
- **Pourquoi voice gagne** : singulariser la voix injecte de la nécessité énonciative (choix de phrase non interchangeables) que le juge lit comme « plus littéraire » — exactement ce que les boutons lexicaux ne peuvent pas fabriquer.
- **Où ça casse** : le gain est perceptuel, pas géométrique (radar plat/négatif) ; instable hors low/master ; mixed insensible ; mimétique sous-performant.
- **Risques** : (1) le juge gemma pourrait récompenser un sur-style « voix » au-delà du goût maître réel (pas de 2e juge — cf N2) ; (2) n=3 → puissance faible, 2/3 ≠ preuve ; (3) la dissociation juge/radar peut signaler que NI l'un NI l'autre ne capture seul « la grandeur » → besoin d'un 3e axe.

## VERDICT
- **Statut : PASS conditionnel** (critère script rempli : voice 2/3 au juge). **Mais EMP-16 NON satisfait** (pas 3/3, radar non convergent) → **aucune action moteur**.
- **Confiance : Moyenne** (juge calibré, thermostat propre, mais n=3, juge unique, dissociation juge/radar non résolue).
- **Forces** : 1er signal positif de toute la campagne ; confirme l'étage sémantique ; thermostat 18/18 OK ; découverte de la dissociation juge⊥radar ; mimétique testé empiriquement (pas seulement spéculé).
- **Faiblesses** : (1) voice 2/3 pas 3/3 ; (2) Δradar voice négatif (incohérence d'instrument) ; (3) few-shot mimétique faible ; (4) mixed = zone morte non expliquée ; (5) juge unique non corroboré.
- **Risques restants** : promouvoir voice prématurément sur n=3 ; prendre le juge gemma pour vérité absolue ; ignorer que le radar dit l'inverse.
- **Action requise (Architecte)** : décision. Recommandation : **confirmer voice + internal_tension en protocole dimensionné** (n≥6 chapitres, bootstrap par livre, idéalement 2e juge) AVANT toute idée d'intégration ; **résoudre la dissociation juge/radar** (lequel suivre ?) ; pour la fork V5 (RAG vs LoRA), le few-shot naïf ayant déçu, la voie LoRA gagne en intérêt relatif mais reste non tranchée. **Pas de fusion combinée** (directive Tribunal respectée).
