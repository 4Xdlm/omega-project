# C9 EVIDENCE — Contrôleur de cohérence 3 niveaux + G5-TICS + audit éditorial + fix couture
Date : 2026-06-06 · Ordre : Francky (« audit du livre » + « contrôleur de cohérence phrases/chapitre/arc »)
## Livré
1. src/coherence/ : coherence-types, sentence-physics (PHRASE : FOOTWEAR/OBJECT/DOOR, négations, cas intra-phrase),
   chapter-coherence (CHAPITRE : LOCATION_JUMP présence-vs-mention, TIME_REGRESSION, GHOST_SPEAKER),
   arc-coherence (ARC : IDENTITY_DRIFT lowercase-presence-filter, fonctions par QUANTILES, mystery ledger),
   tics-gate (G5 durci : plafonds/chap EXPERIMENTAL 0.3/0.5 + floor 8 + cooldown ledger pour chapitres futurs).
   TOUT ADVISORY/SHADOW (EMP-16 : seuils non scellés, 1 seul livre mesuré).
2. Fix D-AUD-3 : chapter-extender couture (trimToCompleteSentence + dedupOverlap) — cas réel 60k en test.
3. editorial-audit.ts : script 4-instruments → EDITORIAL_AUDIT.{json,md} (copiés ici).
4. AUDIT_EDITORIAL_60K.md : audit complet (5 défauts majeurs à cause mécanique, claims tribunaux vérifiés sur pièce).
## Preuves
- tsc --noEmit : 0 erreur. Suite book-factory : 166/166 (162 + 4 stitch) — 25 tests C9 nouveaux.
- Findings clés (preuve manuscrit) : gardien Thomas(ch.2)/Henri Morel(ch.5)/Thomas(ch.21)/LES DEUX(ch.50) ;
  Saint-Marc×2+mer du Nord×1 (ch.1-2) vs Ker-Morvan×84 ; coutures cassées ×2 (« Elle l ») ; bottes/pieds-nus ch.1 attrapé ;
  ledger : naufrage 8→46 payé, lettre/registre UNPAID. Cause-racine commune D-AUD-1/2 : entités NON MINTÉES dérivent
  (les 4 mintées : zéro dérive ×50) — BF-01/BF-02 prouvés par l'absence.
- Limites honnêtes : proxys lexicaux (TIME 22 à échantillonner — flashbacks légitimes possibles) ; granularité 1 porte/fenêtre.
