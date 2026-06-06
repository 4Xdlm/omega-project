# 00_READ_ME_FIRST — POINT D'ENTRÉE OBLIGATOIRE DE TOUTE SESSION OMEGA
**Créé : 2026-06-06 · Mandat : Francky (Architecte) — « on remonte toutes les discussions et les docs et on reconceptualise OMEGA correctement, pour ne plus JAMAIS rien perdre ».**

## RÈGLE D'ENTRÉE (non négociable)
Aucune IA ne travaille sur OMEGA sans avoir lu, dans cet ordre :
1. **CE fichier** (2 min)
2. `01_OMEGA_LIVRE_MAITRE_v3.md` (ce qu'est OMEGA, tout entier)
3. `02_CONCEPT_LEDGER.md` — chercher le(s) Concept-ID liés à la demande du jour
4. `03_PRODUCT_MODES_LEDGER.md` — si la demande touche un usage produit
Puis seulement : répondre, concevoir, coder.

## CE QU'EST OMEGA (20 lignes)
OMEGA est un **système bio-informatique de traduction émotionnelle** (VISION_FINALE_SCELLEE v1.0, FROZEN, 2026-01-21) : transformer une intention émotionnelle en trajectoire narrative mathématiquement cohérente, puis en production textuelle industrielle. Le cœur est une **physique émotionnelle propriétaire V4.4** : 3 axes (X valence, Y énergie, **Z persistance = LE différenciateur**, Z(t)=Y₀·e^(−λt)), 6 lois gravées, 9 paramètres (M, λ, κ, E₀, C, ζ, μ, ω, φ), **16 émotions canoniques paramétrées** (la table EST la loi). Poids décisionnel : 60% émotion, 25% logique, 15% style. Hiérarchie stricte : ANALYSER → GUIDER → GÉNÉRER → ÉTENDRE. La loi émotionnelle prime TOUJOURS sur la performance.

**Les 6 usages produit** (tous actés/documentés — voir 03) : AUTONOMOUS_BOOK (écrire des livres seul, prouvé 88k mots), COAUTHOR_GPS (GPS narratif pendant que l'humain écrit — « le GPS ne décide JAMAIS »), REWRITE_DOCTOR (auditer/réparer un roman existant, GO_B 2026-05-29), MYCELIUM_DNA (l'ADN unique et reproductible d'une œuvre — pilier fondateur acté), STYLE_CONTINUATION (continuer une œuvre/un tome avec rights-gate machine-level), MIXER_CONTROL (potards tension/romance/mystère/violence/espoir qui modifient la TRAJECTOIRE, pas le texte).

**La colonne vertébrale runtime 2026-06** : canon-kernel (épine canonique unique) → CharacterRegistry (identité mint-once + alias) → Recall Bus (mention⇒RecallPack sinon INVALID) → Scribe AVEUGLE → boucle R6 (N=7 candidats, gates durs G1-G8, préséance, sélection 2 étages, admission rejouable SHA-256) → Double-Bible (extraction indépendante + diff) → contrôleur de cohérence C9 (phrase/chapitre/arc, ADVISORY) → juges LLM calibrés EMP-19 (étage B).

## LES INTERDITS PERMANENTS (extraits — liste complète : 06)
Scribe aveugle (jamais de Bible brute au générateur) ; N3 coaching esthétique INTERDIT à jamais ; zéro mutation gateway/FROZEN ; CALC contrôle la SÉLECTION, pas la génération (ADR-003) ; aucune modif moteur sans 3 preuves convergentes (EMP-16) ; l'historique = preuve, jamais déprécier (EMP-17) ; centroïdes sans LOAO = fuite (EMP-18) ; juge LLM sans profil calibré APPROVED = interdit (EMP-19) ; Plutchik/4-émotions/statique/sans-Z = MORTS (VISION:11) ; jamais `git add -A` (EMP-13).

## RÈGLE ANTI-OUBLI (la raison d'être de ce dossier)
Toute proposition doit d'abord chercher dans `02_CONCEPT_LEDGER.md` :
- L'idée existe → répondre **FOUND_EXISTING** + citer le Concept-ID + les sources + adapter.
- L'idée n'existe pas → répondre **NEW_CONCEPT** + créer l'ID + relier au Livre Maître.
Une IA qui propose une architecture sans citer le Concept Ledger est **HORS PROTOCOLE** (réponse invalide).

## LES FICHIERS DE CE DOSSIER
01 Livre Maître (l'encyclopédie) · 02 Concept Ledger (les idées avec adresses) · 03 Product Modes (les 6 usages) · 04 Module DNA (les ~25 modules et leur statut RÉEL) · 05 Decision Ledger (toutes les décisions) · 06 Codex Rules (toutes les lois) · 07 Runtime Map (ce qui TOURNE vs ce qui dort) · 08 Museum Map (ce qui est fossile — EMP-15) · 09 Gap & Build Map (ce qui manque, roadmap) · 10 Reprise Protocol (le rituel de chaque session).

## OÙ EST LA VÉRITÉ (hiérarchie des sources)
1. Le CODE du repo + ses tests (REPO = TRUTH, Golden Rule 9)
2. Les décisions scellées (`GOVERNANCE/`, `docs/architecture/DEC-*`, ce dossier)
3. Les specs actives (`docs/`, hors museum)
4. Le museum (`docs/archive/museum/`) = POURQUOI c'est devenu ainsi, JAMAIS ce que c'est maintenant (EMP-15)
5. La mémoire de conversation = piste, pas preuve (STRUCTURED_MEMORY_PRIORITY)
