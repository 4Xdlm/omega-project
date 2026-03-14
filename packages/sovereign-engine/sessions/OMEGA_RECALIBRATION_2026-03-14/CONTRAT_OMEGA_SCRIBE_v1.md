# CONTRAT OMEGA ↔ SCRIBE
## Séparation Définitive des Responsabilités

**Version** : 1.0 — 2026-03-14
**Autorité** : Francky (Architecte Suprême)
**Statut** : 🔒 DOCUMENT CONTRACTUEL — IMMUABLE

---

## ARTICLE 1 — DÉFINITIONS

**OMEGA** : Le système de contrôle, vérification, mémoire et certification du roman.
OMEGA est le chef d'orchestre. Il porte l'intelligence de la saga.

**SCRIBE** : Le module de génération de prose (LLM — claude-sonnet).
SCRIBE est l'artiste aveugle. Il porte l'excellence stylistique de la scène.

**Ces deux entités ne se substituent jamais l'une à l'autre.**

---

## ARTICLE 2 — MISSION DU SCRIBE

### Ce que le Scribe FAIT

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   Le Scribe reçoit un brief dramatique et produit             ║
║   la prose la plus extraordinaire possible pour cette scène. ║
║                                                                ║
║   Sa seule mission : ÉCRIRE MAGNIFIQUEMENT.                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

Le Scribe produit :
- Une prose à intensité émotionnelle maximale
- Un rythme organique et singulier
- Des images nécessaires et inédites
- Une voix reconnaissable mais non imitable
- Une incarnation qui rend les personnages réels

### Ce que le Scribe REÇOIT (et seulement ça)

| Catégorie | Contenu | Format |
|-----------|---------|--------|
| Tension dramatique | Ce qui crée la friction de la scène | Phrase courte, langage de théâtre |
| Objectif de scène | Ce qui doit se passer | 1 phrase active |
| Mouvement attendu | Ce qui doit changer | Formulation dramatique |
| Ancre sensorielle | Point de départ concret | Détail sensoriel |
| Style et voix | Genome vocal + killlist | Paramètres stylistiques |
| Trajectoire émotionnelle | Courbe 14D de la scène | Données mathématiques |
| Contraintes de plume | Mots interdits, patterns IA | Liste fermée |
| Contexte minimal | Résumé scène précédente | ≤ 2 phrases humaines |

### Ce que le Scribe NE REÇOIT PAS

```
❌ Liste de dettes narratives (DEBT[id]: ...)
❌ Identifiants de canon (cf-marie-medecin, canon-001...)
❌ Instructions de vérification ("vérifie que", "assure-toi que")
❌ Rappels de cohérence (cohérence_globale, continuité...)
❌ Gestion d'arc explicite (arc_phase, arc_movement...)
❌ Demandes d'auto-correction ("si tu vas à l'encontre de X")
❌ Bible brute ou dump de world model
❌ Listes de règles narrative longues
```

**Règle absolue :** Si une instruction dans le prompt commence par "vérifie", "assure", "n'oublie pas", "respecte le canon" → elle n'appartient pas au prompt du Scribe. Elle appartient à OMEGA.

---

## ARTICLE 3 — MISSION D'OMEGA

### Ce qu'OMEGA FAIT

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   OMEGA porte la vérité du roman.                             ║
║   OMEGA garantit la cohérence sur 300 000 mots.               ║
║   OMEGA décide ce qui passe et ce qui est rejeté.             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

#### PRÉ-GÉNÉRATION (OMEGA prépare)

| Action | Module | Règle |
|--------|--------|-------|
| Sélectionner les hot elements | Relevance Filter | Max 10, par priorité |
| Comprimer en brief dramatique | CDE.distillBrief() | ≤ 150 tokens, langage de scène |
| Assembler le ForgePacket | ForgePacketAssembler | Haché, déterministe |
| Valider avant envoi | Pre-Write Validator | FAIL si incomplet |
| Construire le prompt | PromptAssembler v2 | Brief → section prompt |

#### POST-GÉNÉRATION (OMEGA vérifie, décide, corrige)

| Action | Module | Verdict possible |
|--------|--------|-----------------|
| Mesurer la qualité prose | S-Oracle | Score 0-100 |
| Vérifier le canon | Canon Lock Gate | PASS / REJECT + raison |
| Extraire les changements | CDE.extractDelta() | StateDelta |
| Mesurer l'excellence | Genius Engine | GeniusScore |
| Détecter l'IA-smell | Authenticity Gate | δ_AS (0 ou 1) |
| Vérifier la physique émotionnelle | Physics Audit | Conformité 14D |
| Décider | Phase U Exit Validator | SEAL / SAGA_READY / REJECT |
| Corriger si nécessaire | Polish Engine + Loop | Prose chirurgicale |
| Certifier | ProofPack | Artefacts hashés |
| Mettre à jour le canon | World Model Update | Canon v+1 |

---

## ARTICLE 4 — INTERFACE OMEGA → SCRIBE

### Le SceneBrief — Règle de contenu

Le SceneBrief est le seul point de contact entre OMEGA et SCRIBE.

**Il doit parler la langue de la scène, pas la langue du système.**

#### Format obligatoire

```
must_remain_true  : [TENSION DRAMATIQUE ACTIVE, pas de règle système]
in_tension        : [FRICTION EN COURS, pas de liste de dettes]
must_move         : [MOUVEMENT ATTENDU, pas de demande de vérification]
must_not_break    : [CE QUI NE PEUT PAS SE RÉSOUDRE, pas d'ID de canon]
token_estimate    : ≤ 150
```

#### Exemple CORRECT
```
must_remain_true  : "la promesse non tenue continue de peser sur chaque geste"
in_tension        : "Pierre attend un signe, Marie retarde l'aveu depuis des semaines"
must_move         : "la tension doit se matérialiser en un acte concret — quitter ou rester"
must_not_break    : "aucun dialogue ne résout le conflit — la scène finit ouverte"
```

#### Exemple INTERDIT
```
must_remain_true  : "DEBT[debt-01]: Marie a promis — cf-marie-medecin"    ← INTERDIT
in_tension        : "arc_phase=confrontation, canon_locked=true"           ← INTERDIT
must_not_break    : "vérifier que canon_facts sont respectés"              ← INTERDIT
```

---

## ARTICLE 5 — RÈGLES DE NON-DÉROGATION

Ces règles sont absolues. Aucune exception n'est autorisée sans décision explicite de l'Architecte.

**R1** : Le Scribe ne vérifie jamais la cohérence. C'est OMEGA.

**R2** : Le Canon ne passe jamais brut dans le prompt du Scribe. OMEGA l'interprète d'abord.

**R3** : Les dettes narratives ne sont jamais exposées au Scribe. OMEGA les compresse en tension dramatique.

**R4** : La vérification canonique est toujours un gate post-génération. Jamais une instruction dans le prompt.

**R5** : Le SceneBrief ne contient jamais d'identifiants système (IDs, clés, codes).

**R6** : Le Scribe génère à l'aveugle. Il ne sait pas ce qui suit la scène. OMEGA le sait.

**R7** : La plume ne peut jamais être sacrifiée pour la cohérence dans le prompt. La cohérence est le rôle d'OMEGA. La plume est le rôle du Scribe. Ces deux responsabilités ne se mélangent pas.

---

## ARTICLE 6 — GESTION DES VIOLATIONS

Si une instruction dans le prompt contient des éléments de l'Article 4 "INTERDIT" :

1. La session s'arrête
2. L'instruction est signalée à l'Architecte
3. OMEGA est recâblé pour absorber cette responsabilité
4. Le prompt est modifié avant relance

**Il n'existe pas de violation "temporaire" ou "pour simplifier".**

---

## ARTICLE 7 — ÉVOLUTION DU CONTRAT

Ce contrat ne peut être modifié que par décision explicite de l'Architecte Suprême, après convergence 3/3 IAs, avec versioning du document.

Toute modification sans décision architecte = VIOLATION CRITIQUE.

---

**FIN DU CONTRAT OMEGA ↔ SCRIBE v1.0**
*2026-03-14 — Architecte Suprême : Francky*
*Validé par : Claude (IA Principal), ChatGPT (Audit), Gemini (Audit)*
