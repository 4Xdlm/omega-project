# ADR: L35 Collision Resolution — Création L35b
Date: 2026-04-02
Statut: RÉSOLU
Signalé par: Gemini (audit IRM 2026-04-02)

## Problème
L35 apparaît avec deux significations dans les documents :
- Sens A : "sub_per_sentence = méga-levier FR" (élasticité +205% f26b)
- Sens B : "modèle survit au retrait d'un auteur FR (robustesse V6)"

## Résolution
- **L35** = sub_per_sentence est le méga-levier FR (SEALED)
  Source : OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md
  Preuve : élasticité sub→f26b = +205% (corpus FR 500w)

- **L35b** = robustesse V6 : le modèle survit au retrait d'un auteur FR (SEALED)
  Source : Phase R3, validation V6
  Preuve : robustesse 114-194% après retrait auteur

## Impact
Aucune loi n'est modifiée. Seul l'identifiant est dédoublé pour éviter la confusion.
Les deux lois restent SEALED.
