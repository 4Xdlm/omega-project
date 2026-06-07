# NCR-EXPORT-V1-001 — CLOSEOUT (les 3 preuves du tribunal, INSTRUMENTALES, sur l'export)
## Cause-racine (autoaudit)
TROIS artefacts V1 divergents coexistaient (V1_REPAIRED manuel C10, DOCTOR_V1, SURGICAL démo jamais appliqué) ; la grille et les IA ont reçu le moins bon. fixBrokenStitch supprimait le fragment SANS dédupliquer la reprise (doublon « Le métal... » vu par l'Architecte). Le ch.50 du V0 était TRONQUÉ depuis le run — aucun contrôle de terminaison n'existait.
## Corrections
1. fixBrokenStitch V2 : suppression du fragment + DÉDUP de la reprise (testé cas réel). 2. dedupAdjacentDuplicateSentences (tracé). 3. isTailTruncated : nouveau contrôle de terminaison. 4. Directive SURGICAL durcie (verbe de retrait EXPLICITE exigé). 5. UNSHOD_RE bidirectionnel (bottes...retirer).
## EXPORT CANONIQUE UNIQUE : MANUSCRIT_V1_FINAL.md — hash 3837eed5aea43a30ed79fa83c2ab4111caac6d765dfbaa51af249f0d81c68a4e
Pipeline COMPLET en un passage : Doctor mécanique fixé + overrides C10 + **SURGICAL APPLIQUÉ DANS L'EXPORT** + tail réparé (coupe propre, perte « Il… » 1 mot).
## LES 3 PREUVES (critère INSTRUMENTAL, pas un rapport)
1. proof1 doublon « Le métal » : **ABSENT** ✓ (1 seule occurrence ch.1)
2. proof2 contradiction bottes : **FOOTWEAR=0 sur tout l'export** ✓ — phrase finale : « Elle retire ses bottes, la semelle restée accrochée à la porte, et avance pieds nus. » (retrait explicite, image conservée). Élucidation : il n'y a qu'UNE occurrence bottes (ch.1 scène cabane) ; le « passage introuvable » de la grille venait de la divergence d'artefacts — corrigée par l'export unique.
3. proof3 ch.50 : **COMPLET** ✓ (terminaison ponctuée).
Toutes les réparations antérieures re-prouvées sur CE fichier : Thomas 16→0, Saint-Marc 2→0, coutures ch.1+47 (targetedProof dans le JSON).
## GOLD-SET V3 — annotation Francky DÉPOUILLÉE
Accord humain-IA : **92.2%** (59/64). Regex V2 vs labels HUMAINS : précision 1.000, recall 0.727 (vs 0.75 IA — la calibration TIENT face à l'humain). 5 désaccords listés pour arbitrage (GOLDSET_V3_CONFUSION.json) — statut ARBITRATION_REQUIRED avant scellement V3.
## POINTEUR PERSONNAGE (proposition Architecte) — LIVRÉ
src/identity/mention-annotator.ts : chaque mention → pointeur chiffrable inline {{charId}} (alias résolus au même id, longest-match-first), UNRESOLVED jamais silencieux, **CONTRÔLE DE SITUATION par chapitre** (DEAD qui parle/agit = SUSPECT avec evidence ; vitalOverrides par chapitre pour les morts en cours de livre). E2E V1_FINAL : 3405 mentions, 82.8% résolues (Garcia 973, Yvon 823, Léna 551, Gaspard 451, Henri 22), MANUSCRIT_V1_FINAL_ANNOTATED.md produit. Bruit connu : pronoms Ils/Elles (stoplist V2) ; Dubois = secondaire réel à caster.
## Tests : 232/232 — tsc 0.
