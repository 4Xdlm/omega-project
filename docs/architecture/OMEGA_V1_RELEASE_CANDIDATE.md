# OMEGA V1 — Release Candidate (positionnement de production)

**Date** : 2026-06-04 · **Statut** : RELEASE CANDIDATE (positionnement ; ne re-scelle rien, référence le sceau existant) · **Décision parente** : [DEC-20260604-022 Prompt-Forge Exhausted](DEC-20260604-022-PROMPT-FORGE-EXHAUSTED.md).

## But
Acter OMEGA V1 comme **plafond du paradigme prompt-forge** et standard de production courant, après épuisement empirique des leviers de forge (lexicaux + sémantiques + mimétiques). Ce document **positionne** ; il ne crée pas de nouveau scellement — le sceau de référence reste `outputs/OMEGA_V1_SEAL_CERTIFICATE.md` (V1 SCELLÉ 2026-04-13, commit `0c3cbc48`, unanimité 3 IA).

## Ce que V1 EST (propriétés mesurées, sans surinterprétation)
- Pipeline scellé : K2 Chunked + DUEL + R6 Gate + R7 Best-of-N (DUEL_RUNS=2, N=7), scoring S-Oracle V2.
- Plafonds documentés au sceau : SDT=100, auth≈80, rhythm≈82, SII≈86 ; bench R7-B avg≈90.07.
- Position géométrique bge-m3 (radar LOAO, télémétrie N5) : prose OMEGA ≈ **+0.52 sur l'axe pulp→maître normalisé** (entre les deux pôles, du côté supérieur au pulp brut, **en-deçà** du centroïde maître). C'est une mesure de **position relative**, pas un label de qualité absolu.

## Ce que V1 N'EST PAS (honnêteté)
- Pas au niveau « maître » (Tier S). Les 3 campagnes de forge (Forge Chir, N7, N8) prouvent que cet écart n'est pas franchissable par directive de prompt à longueur constante.
- Le qualificatif « supra-commercial / monétisable » est une **hypothèse de positionnement**, PAS une métrique validée. Aucune étude de réception commerciale n'a été conduite — à traiter comme une orientation à tester, pas un fait scellé (SSOT : hypothèse).

## Décision de gel
- **Code de génération + métrologie figés** à l'état HEAD courant (branche `phase-r-dispatcher-v33`). Toute évolution = nouvelle branche V2.
- Modules advisory/shadow (IntrinsicQuality bge-m3 radar, juge calibré, registre EMP-19) restent en place, **sans gate**.
- Leviers de forge (voice/internal_tension/subtext/lexicaux) : **non intégrés**, archivés comme advisory testés-rejetés.

## Deux axes ouverts (décision Architecte)
1. **Axe commercial** — finaliser le pipeline de production de livres automatisés sur V1 (génération multi-chapitres fiable, déterministe). V1 est un produit fini exploitable.
2. **Axe prestige (V2 / LoRA)** — franchir le plafond par modification des poids. Gaté par le pré-flight L0 (doc-only) avant tout entraînement.

## VERDICT
- Statut : PASS (positionnement honnête, référence le sceau existant sans le dupliquer). Confiance : Haute sur les mesures ; Basse sur le qualificatif commercial (hypothèse non testée).
- Forces : clôture nette du paradigme ; gel explicite ; deux axes documentés ; pas de re-scellement aveugle (respecte l'interdit M0b).
- Faiblesses : (1) « supra-commercial » non prouvé ; (2) position 0.52 = mesure bge-m3 relative, dépend des centroïdes LOAO ; (3) plafonds hérités du sceau d'avril, non re-mesurés ici.
- Action requise : Architecte choisit l'axe de la prochaine session (commercial book-pipeline vs L0 LoRA R&D).
