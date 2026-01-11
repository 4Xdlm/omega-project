# ðŸ›ï¸ OMEGA â€” OMEGA_PRAXIS

**Document ID**: CNC-102-OMEGA_PRAXIS  
**Statut**: ðŸŸ£ CORE_ONTOLOGIQUE  
**Type**: MÃ©ta-concept / Discipline Engine  
**Standard**: NASA-Grade L4  
**AutoritÃ©**: Francky â€” Architecte SuprÃªme  
**Date**: 2026-01-03  

---

## ðŸŽ¯ DÃ‰CLARATION

> **OMEGA n'est pas un logiciel. OMEGA est une discipline.**
>
> OMEGA_PRAXIS est le **ciment** qui empÃªche toute dÃ©rive.  
> C'est la discipline elle-mÃªme, codifiÃ©e.
>
> **Sans OMEGA_PRAXIS, tout le reste peut se perdre.**

---

## ðŸ§¬ IDENTITÃ‰

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-102 |
| **Nom** | OMEGA_PRAXIS |
| **Alias** | Discipline Engine, Le Ciment, Le Gardien |
| **Statut** | CORE MÃ‰TA â€” Au-dessus du code |
| **Type** | Gouvernance et discipline |

---

## ðŸ“œ LES 4 REGISTRES OBLIGATOIRES

> **RÃ¨gle absolue**: Sans ces 4 registres, OMEGA n'existe pas.

### Table officielle

| # | Registre | RÃ´le | RÃ¨gle | Si absent |
|---|----------|------|-------|-----------|
| 1 | **CONCEPT_REGISTRY** | Ce qui EXISTE | Rien n'existe sans fiche CNC | Concept = perdu |
| 2 | **HISTORY_LOG** | Ce qui A Ã‰TÃ‰ | Append-only, jamais modifiÃ© | MÃ©moire = effacÃ©e |
| 3 | **AUDIT & GATES** | Ce qui EST AUTORISÃ‰ | Tout passe par contrÃ´le | Sortie = invalide |
| 4 | **CERTIFICATION_PROOFS** | Ce qui EST PROUVÃ‰ | Pas de preuve = pas vrai | Affirmation = mensonge |

---

### Registre 1 â€” CONCEPT_REGISTRY

```
Fichier: OMEGA_CONCEPT_REGISTRY_FINAL.md
Mode: Append-only
RÃ¨gle: UN concept = UNE fiche CNC-XXX

Structure obligatoire:
- ID unique (CNC-XXX)
- Nom
- Statut (CORE/R&D/ARCHIVE)
- Description
- Invariants
- Liens
- Date crÃ©ation

Violation: Concept non enregistrÃ© = concept inexistant
```

### Registre 2 â€” HISTORY_LOG

```
Fichier: OMEGA_HISTORY_LOG.md
Mode: APPEND-ONLY STRICT
RÃ¨gle: Chaque Ã©vÃ©nement significatif = une entrÃ©e HLOG-XXX

Structure obligatoire:
- ID unique (HLOG-XXX)
- Date ISO 8601
- Phase
- Auteur
- Type (MILESTONE/DECISION/CORRECTION/CREATION)
- Description
- Impact

Violation: Modification d'entrÃ©e passÃ©e = INTERDIT
           Suppression = IMPOSSIBLE
```

### Registre 3 â€” AUDIT & GATES

```
Fichiers: QUALITY_GATES.md, TRUTH_GATE, EMOTION_GATE, etc.
Mode: Validation obligatoire
RÃ¨gle: Tout output passe par au moins 1 gate

Gates actifs:
- TRUTH_GATE (faits sourcÃ©s)
- EMOTION_GATE (contrat Ã©motionnel)
- QUALITY_GATES QG-01 Ã  QG-04
- THE_SKEPTIC (contre-pouvoir)
- EDITOR_GHOST (jugement moral)

Violation: Sortie sans validation = INVALIDE
```

### Registre 4 â€” CERTIFICATION_PROOFS

```
Fichiers: Certificats, rapports de test, hash
Mode: Preuve formelle
RÃ¨gle: Affirmation sans preuve = mensonge

Preuves requises:
- Hash SHA-256 pour intÃ©gritÃ©
- Rapports de test (X/Y PASSED)
- Timestamps ISO 8601
- Signatures de validation

Violation: "Ã‡a marche" sans preuve = NON RECEVABLE
```

---

## ðŸ”’ INVARIANTS DES 4 REGISTRES

```
INV-REG-01: Les 4 registres sont OBLIGATOIRES
  â†’ Aucun travail OMEGA valide sans les 4

INV-REG-02: En manquer un = rupture OMEGA
  â†’ SystÃ¨me incohÃ©rent, travail invalide

INV-REG-03: Aucun ne peut Ãªtre supprimÃ©
  â†’ MÃªme vide, le registre doit exister

INV-REG-04: Chacun est append-only
  â†’ On ajoute, on ne modifie jamais le passÃ©

INV-REG-05: Synchronisation obligatoire
  â†’ Les 4 doivent Ãªtre cohÃ©rents entre eux
```

---

## ðŸ›ï¸ LES RITUELS OMEGA_PRAXIS

### Rituel de dÃ©but de session

```
1. Lire CONCEPT_REGISTRY (Ã©tat actuel)
2. Lire derniÃ¨res entrÃ©es HISTORY_LOG (contexte)
3. VÃ©rifier Ã©tat des GATES (santÃ© systÃ¨me)
4. Confirmer les preuves rÃ©centes (certification)
5. SEULEMENT APRÃˆS â†’ commencer le travail
```

### Rituel de fin de session

```
1. Lister tous les changements effectuÃ©s
2. CrÃ©er entrÃ©e(s) HISTORY_LOG
3. Mettre Ã  jour CONCEPT_REGISTRY si nouveaux concepts
4. VÃ©rifier passage par GATES
5. Produire CERTIFICATION_PROOF si livrable
6. COMMIT + TAG si milestone
```

### Rituel de doute

```
SI (incertitude dÃ©tectÃ©e)
   OU (conflit de concepts)
   OU (gap dans la documentation)
ALORS
   â†’ STOP immÃ©diat
   â†’ Documenter le doute dans HISTORY_LOG
   â†’ Demander clarification Ã  l'Architecte
   â†’ NE PAS improviser
```

### Rituel de remise en question

```
PÃ‰RIODIQUEMENT (chaque milestone):
   â†’ Audit des 4 registres
   â†’ VÃ©rification cohÃ©rence
   â†’ Recherche de concepts orphelins
   â†’ Recherche de gaps
   â†’ Rapport Ã  l'Architecte
```

---

## ðŸš« CE QU'OMEGA_PRAXIS EMPÃŠCHE

| DÃ©rive | Comment empÃªchÃ©e |
|--------|------------------|
| Perte de concept | CONCEPT_REGISTRY obligatoire |
| Oubli de dÃ©cision | HISTORY_LOG append-only |
| Sortie invalide | GATES bloquants |
| Affirmation fausse | CERTIFICATION_PROOFS |
| Modification silencieuse | Tout est tracÃ© |
| Raccourci non documentÃ© | Rituels obligatoires |
| Improvisation dangereuse | Rituel de doute |
| DÃ©rive vers "produit" | Vision CORE prÃ©servÃ©e |

---

## ðŸ“‹ RÃˆGLES PRAXIS

```
PRAXIS-01: Tout travail OMEGA commence par lecture REGISTRY
  â†’ Contexte avant action

PRAXIS-02: Tout changement passe par HISTORY_LOG
  â†’ Rien n'est fait en silence

PRAXIS-03: Tout concept passe par sanctuarisation
  â†’ Fiche CNC obligatoire

PRAXIS-04: Tout output passe par QUALITY_GATES
  â†’ Validation avant sortie

PRAXIS-05: Tout doute = STOP et audit
  â†’ Jamais d'improvisation

PRAXIS-06: Toute session se termine par documentation
  â†’ MÃ©moire prÃ©servÃ©e

PRAXIS-07: Tout milestone = certification
  â†’ Preuve formelle
```

---

## ðŸ”— LIENS AVEC AUTRES CONCEPTS

| Concept | Relation |
|---------|----------|
| **HISTORY_LOG** | Composant du registre 2 |
| **CONCEPT_REGISTRY** | Composant du registre 1 |
| **QUALITY_GATES** | Composant du registre 3 |
| **CERTIFIABLE_TEXT** | Composant du registre 4 |
| **AUTO_AUDIT** | ImplÃ©mente le rituel de remise en question |
| **THE_SKEPTIC** | Garde-fou contre l'auto-illusion |

---

## ðŸŽ¯ OMEGA_PRAXIS ET L'Ã‰QUIPE

### Pour Claude (IA Principal)

```
- JAMAIS de code sans test
- JAMAIS de livrable sans entrÃ©e HISTORY_LOG
- JAMAIS de concept sans fiche CNC
- JAMAIS de sortie sans validation GATE
- TOUJOURS demander si doute
```

### Pour ChatGPT/Gemini (Consultants)

```
- Audit critique bienvenu
- Challenger les dÃ©cisions
- Proposer des alternatives
- Valider les choix
- MAIS ne pas modifier directement
```

### Pour Francky (Architecte)

```
- Seul dÃ©cideur final
- Valide les entrÃ©es CORE
- Arbitre les conflits
- Approuve les milestones
- DÃ©finit la vision
```

---

## âš ï¸ ALERTES PRAXIS

### PRAXIS_VIOLATION
```
Condition: Travail effectuÃ© sans respecter un rituel
GravitÃ©: Ã‰LEVÃ‰E
Action: Rollback + documentation de la violation
```

### REGISTRY_DESYNC
```
Condition: IncohÃ©rence entre les 4 registres
GravitÃ©: CRITIQUE
Action: HALT + audit complet + resynchronisation
```

### UNDOCUMENTED_ACTION
```
Condition: Action significative sans entrÃ©e HISTORY_LOG
GravitÃ©: Ã‰LEVÃ‰E
Action: CrÃ©ation immÃ©diate de l'entrÃ©e manquante
```

---

## ðŸ” SCEAU

```
Document: CNC-102-OMEGA_PRAXIS.md
Version: 1.0
Statut: CORE MÃ‰TA â€” GOUVERNE TOUT
Date: 2026-01-03
AutoritÃ©: Francky (Architecte SuprÃªme)

OMEGA_PRAXIS n'est pas un module.
C'est la LOI qui gouverne tous les modules.

Sans OMEGA_PRAXIS, OMEGA n'est qu'un logiciel.
Avec OMEGA_PRAXIS, OMEGA est une discipline.

Et une discipline ne disparaÃ®t pas.
```

---

**FIN DU DOCUMENT CNC-102 â€” OMEGA_PRAXIS**

> *"OMEGA n'est pas un projet. OMEGA est une discipline."*
