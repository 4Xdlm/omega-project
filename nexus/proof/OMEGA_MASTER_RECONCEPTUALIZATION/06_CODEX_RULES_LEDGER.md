# 06_CODEX_RULES_LEDGER — toutes les lois, avec raison et type de violation
**Format : règle · texte court · raison (mécanisme) · source · statut · violation.**

## LOIS BOOK-FACTORY (ADR R2 signée A — BF-01..08 ACTIVES ; BF-09..15 PROPOSED)
| Règle | Texte | Raison | Violation |
|---|---|---|---|
| BF-01 IDENTITY_MINT_ONCE | ID minté par NONCE de naissance, JAMAIS dérivé du nom/contenu | Renommage/REVEAL ne doit pas casser l'identité (forensic : gematria=f(nom) partout avant) | ID=f(nom) ⇒ rejet |
| BF-02 RECALL_OR_INVALID | Mention canonique sans RecallPack ⇒ candidat INVALID | Le non-rappelé dérive (PROUVÉ : gardien) | mention nue ⇒ G_RECALL FAIL |
| BF-03 DOUBLE_BIBLE_DIFF | La prose admise est RELUE par extraction indépendante ; diff = gate | La déclaration ne prouve pas l'exécution | admission sans diff ⇒ invalide |
| BF-04 SINGLE_CANON_SPINE | canon-kernel UNIQUE épine ; zéro store parallèle | Deux canons = schisme | nouveau store ⇒ rejet |
| BF-05 WORLD_MODEL_VIA_ACL | Lecture seule via port épinglé ; FROZEN jamais muté | Golden Rule 4 | import direct gateway ⇒ rejet |
| BF-06 BIB_AS_VIEWS | Bibliothèques = vues, pas de données propres | Cohérence unique | vue qui écrit ⇒ rejet |
| BF-07 BLIND_SCRIBE | Le générateur ne voit jamais la Bible brute (R1-R7) | Anti-fuite, anti-récitation | Bible dans prompt ⇒ rejet |
| BF-08 MAX_CODE_BAR | Brands/Result/assertNever/readonly/zéro any/seed injecté/INV 1:1/property/adversarial/evidence/hostile review | Loi Francky 2026-06-06 : code moteur = standard modules scellés | code basique ⇒ refonte |
| BF-09..15 (PROPOSED) | router explicite · potards traçables · auteur souverain · intention préservée · ADN déterministe · rights-mode · anti-Goodhart | ancêtres : VISION §6/7/8, ADR-003, GO_B | — pendantes ratification |

## FORBID (ADR R2, FORBID-001..012 — extraits critiques)
N3 coaching esthétique INTERDIT À JAMAIS (FORBID-006, audit lexical à la construction des directives) · zéro nouvelle entité canon hors mint planifié · zéro mutation FROZEN · persistance 1 run/root (FORBID-007) · pas de seuils scellés sans multi-corpus.

## EMP (doctrine repo — CLAUDE.md §H, détails 05)
EMP-09 MASK_REVEAL · EMP-10 TEST_BEFORE_COMMIT (wrapper) · EMP-11 PRE_SEAL_AUDIT 7+7 axes · EMP-12/12.1 CODEX_PREFLIGHT + CONTROL_BEFORE_WRITE · EMP-13 staging ciblé (jamais add -A ; vérifier .exe/.msi absents du stage) · EMP-14 Trame 2000 (17 gates, ligne d'invocation) · EMP-15 museum non-source · **EMP-16 triple preuve avant modif moteur (3/3 corpus distincts, une divergence ⇒ STOP)** · EMP-17 historique=preuve · EMP-18 LOAO obligatoire sur centroïdes · **EMP-19 calibration couple + Power-On Self-Test + biais position ⇒ DISQUALIFIED**.

## RÈGLES SCRIBE / R6 (scellées par ADR-003 + R2)
Rejection sampling (douanier) ; feedback features→directives INTERDIT (échec empirique : surcorrection en cascade) ; température progressive aux retries ; fallback A (meilleur sous seuil + flag below_threshold) ; préséance : advisory ne renverse JAMAIS un gate dur ; étage A inviolable par le juge (un inéligible ne gagne jamais via étage B) ; gabarit N2 figé hashé (factuel nommé G2/G3/G4 only, ≤2 retries).

## RÈGLES GPS / MODES (vision scellée)
« Le GPS ne décide JAMAIS. Il montre des chemins » (VISION:279) · potards ⇒ trajectoire, pas texte (VISION:282) · Reader Model : avertit, ne décide pas (DEC:78) · l'utilisateur peut imposer son « mauvais style » : OMEGA informe, mémorise, ne juge pas (DEC:84) · rights-gate machine-level (VISION:311).

## RÈGLES MYCELIUM
Même roman + même config ⇒ même génome + même hash (INV-GEN-01, futur BF-13) · Emotion14 sanctuarisé (INV-GEN-12) · entrée validée par mycelium (gardien, contrat DNA_INPUT) · museum ≠ runtime pour toute doc génome ancienne.

## RÈGLES DE PROSE / MESURE (acquis empiriques scellés)
Tout tri observable/hashé = compareStrings code-unit (JAMAIS localeCompare — ×3 morsures) · `\b` JS inopérant devant lettre accentuée ⇒ lookarounds \p{L} (morsure C10) · hash d'instrument = sha256 du prompt BRUT (morsure C8) · BB-02 ~600 mots/génération ⇒ extension par continuations cousues (trim+dedup) · kill-switch jamais baissé post-hoc · lang_corrected = autorité langue · proxys lexicaux = ADVISORY tant qu'EMP-16 non satisfait (leçon faux-UNPAID).

## RÈGLE ANTI-OUBLI (ce dossier)
Toute proposition cite le Concept Ledger (FOUND_EXISTING/NEW_CONCEPT) sinon HORS PROTOCOLE · toute session lit 00_READ_ME_FIRST d'abord · toute découverte de session significative met à jour les ledgers concernés AVANT la fin de session (SESSION_SAVE_RITUAL, DEC:151).
