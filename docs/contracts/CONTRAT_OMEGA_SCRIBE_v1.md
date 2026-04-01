# CONTRAT OMEGA ↔ SCRIBE
## Séparation Définitive des Responsabilités

**Version** : 1.0 — 2026-03-14
**Autorité** : Francky (Architecte Suprême)
**Statut** : DOCUMENT CONTRACTUEL — IMMUABLE

## ARTICLE 1 — DÉFINITIONS
OMEGA : Système de contrôle, vérification, mémoire et certification du roman. Chef d'orchestre.
SCRIBE : Module de génération de prose (LLM). Artiste aveugle.
Ces deux entités ne se substituent jamais l'une à l'autre.

## ARTICLE 2 — MISSION DU SCRIBE
Le Scribe reçoit un brief dramatique et produit la prose la plus extraordinaire possible.
Sa seule mission : ÉCRIRE MAGNIFIQUEMENT.

### Ce que le Scribe REÇOIT
Tension dramatique, Objectif de scène, Mouvement attendu, Ancre sensorielle,
Style et voix, Trajectoire émotionnelle 14D, Contraintes de plume, Contexte minimal (2 phrases max).

### Ce que le Scribe NE REÇOIT PAS
- Liste de dettes narratives (DEBT[id])
- Identifiants de canon (cf-marie-medecin, canon-001)
- Instructions de vérification ("vérifie que", "assure-toi que")
- Rappels de cohérence, gestion d'arc, demandes d'auto-correction
- Bible brute ou dump de world model

Règle absolue : si une instruction commence par "vérifie", "assure", "n'oublie pas", "respecte le canon" → elle appartient à OMEGA, pas au Scribe.

## ARTICLE 3 — MISSION D'OMEGA
OMEGA porte la vérité du roman. Garantit cohérence sur 300K mots. Décide ce qui passe ou est rejeté.

PRÉ-GÉNÉRATION : Relevance Filter → CDE.distillBrief (≤150t) → ForgePacketAssembler → Pre-Write Validator → PromptAssembler
POST-GÉNÉRATION : S-Oracle → Canon Lock Gate → CDE.extractDelta → Genius Engine → Authenticity Gate → Physics Audit → Phase U Exit Validator → Polish Loop → ProofPack → World Model Update

## ARTICLE 4 — INTERFACE OMEGA → SCRIBE
Le SceneBrief est le seul point de contact. Il parle la langue de la scène, pas la langue du système.
Format : must_remain_true, in_tension, must_move, must_not_break (≤150 tokens).

## ARTICLE 5 — RÈGLES DE NON-DÉROGATION (ABSOLUES)
R1 : Le Scribe ne vérifie jamais la cohérence.
R2 : Le Canon ne passe jamais brut dans le prompt.
R3 : Les dettes narratives ne sont jamais exposées au Scribe.
R4 : La vérification canonique = gate post-génération uniquement.
R5 : Le SceneBrief ne contient jamais d'identifiants système.
R6 : Le Scribe génère à l'aveugle (ne sait pas ce qui suit).
R7 : La plume ne peut jamais être sacrifiée pour la cohérence dans le prompt.

## ARTICLE 6 — GESTION DES VIOLATIONS
Toute violation arrête la session → signalement Architecte → recâblage OMEGA → modification prompt.
Il n'existe pas de violation "temporaire".

---
*Pushé depuis project files — 2026-04-02*
*Version originale : 2026-03-14*
