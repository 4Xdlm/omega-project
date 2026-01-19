# MYCELIUM_PROOF_REQUIREMENTS.md
## Sprint 29.1 — Exigences de Preuve

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DOCUMENT:     MYCELIUM_PROOF_REQUIREMENTS.md                                        ║
║   TYPE:         EXIGENCES DE PREUVE                                                   ║
║   VERSION:      1.0.0                                                                 ║
║   DATE:         2026-01-07                                                            ║
║   STANDARD:     NASA-Grade L4 / OMEGA                                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. DÉFINITION D'UNE PREUVE

### 1.1 Qu'est-ce qu'une preuve ?

Une **preuve** est un artefact vérifiable qui démontre qu'un invariant est respecté ou qu'un comportement attendu se produit.

### 1.2 Caractéristiques obligatoires

| Caractéristique | Description |
|-----------------|-------------|
| Reproductible | Même input → même résultat par n'importe qui |
| Vérifiable | Peut être contrôlée par un tiers |
| Traçable | Lien explicite entrée → traitement → sortie |
| Horodatée | Date et heure d'exécution |
| Hashée | Intégrité vérifiable |

---

## 2. CE QUI EST UNE PREUVE ACCEPTABLE

### 2.1 Preuves de premier rang (GOLD)

| Type | Description | Valeur probante |
|------|-------------|-----------------|
| Rapport structuré | Document avec entrée, sortie, verdict | MAXIMALE |
| Table de traçabilité | Mapping INV → Test → Input → Output → Verdict | MAXIMALE |
| Hash d'exécution | SHA-256 des inputs et outputs | MAXIMALE |
| Log déterministe | Séquence reproductible d'événements | HAUTE |

### 2.2 Preuves de second rang (SILVER)

| Type | Description | Valeur probante |
|------|-------------|-----------------|
| Capture console | Output terminal horodaté | MOYENNE |
| Fichier de sortie | Résultat sérialisé (JSON, etc.) | MOYENNE |

### 2.3 Preuves insuffisantes (REJECTED)

| Type | Raison du rejet |
|------|-----------------|
| Screenshot | Non reproductible, falsifiable |
| "Ça marche" | Aucune traçabilité |
| Log non horodaté | Non vérifiable dans le temps |
| Témoignage verbal | Non auditable |
| Email/Chat | Non structuré, non hashé |
| Assertion sans input | Impossible à reproduire |

---

## 3. FORMAT ATTENDU DES PREUVES

### 3.1 Structure minimale d'un rapport de preuve

```
PROOF-[CAT]-[NUM]
================

INVARIANT:    INV-MYC-XX
CATÉGORIE:    CAT-X (nom)
DATE:         YYYY-MM-DD HH:MM:SS UTC
EXÉCUTEUR:    [identifiant]

INPUT
-----
Type:         [string | file | ...]
Hash SHA-256: [64 chars hex]
Taille:       [N bytes]
Extrait:      [premiers 100 chars si applicable]

PARAMÈTRES
----------
seed:         [valeur ou défaut]
mode:         [paragraph | sentence]

OUTPUT
------
Verdict:      [ACCEPT | REJECT]
Code:         [REJ-MYC-PLACEHOLDER si rejet]
Message:      [message si rejet]
Hash SHA-256: [64 chars hex si accept]

VÉRIFICATION
------------
Attendu:      [verdict attendu]
Obtenu:       [verdict obtenu]
PASS/FAIL:    [PASS | FAIL]

SIGNATURE
---------
Hash rapport: [SHA-256 de ce rapport]
```

### 3.2 Exemple concret

```
PROOF-B-003
===========

INVARIANT:    INV-MYC-01
CATÉGORIE:    CAT-B (Encoding Validation)
DATE:         2026-01-07 15:30:00 UTC
EXÉCUTEUR:    validation-runner-v1

INPUT
-----
Type:         string
Hash SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
Taille:       5 bytes
Extrait:      [0x80, 0x81, 0x82, 0x83, 0x84]

PARAMÈTRES
----------
seed:         42 (défaut)
mode:         paragraph (défaut)

OUTPUT
------
Verdict:      REJECT
Code:         REJ-MYC-100
Message:      Invalid UTF-8 sequence at byte offset 0

VÉRIFICATION
------------
Attendu:      REJECT (séquence UTF-8 invalide)
Obtenu:       REJECT (REJ-MYC-100)
PASS/FAIL:    PASS

SIGNATURE
---------
Hash rapport: [calculé à la génération]
```

---

## 4. TRAÇABILITÉ EXIGÉE

### 4.1 Chaîne de traçabilité

```
INVARIANT (29.0)
     │
     ▼
CATÉGORIE (29.1)
     │
     ▼
CAS DE TEST
     │
     ▼
INPUT (hashé)
     │
     ▼
EXÉCUTION (horodatée)
     │
     ▼
OUTPUT (hashé)
     │
     ▼
VERDICT (PASS/FAIL)
     │
     ▼
RAPPORT (signé)
```

### 4.2 Table de traçabilité obligatoire

Pour chaque invariant, une table doit exister :

| Invariant | Catégorie | Test ID | Input Hash | Output | Verdict | Date |
|-----------|-----------|---------|------------|--------|---------|------|
| INV-MYC-01 | CAT-B | B.1 | abc123... | ACCEPT | PASS | 2026-01-07 |
| INV-MYC-01 | CAT-B | B.3 | def456... | REJECT | PASS | 2026-01-07 |
| ... | ... | ... | ... | ... | ... | ... |

### 4.3 Couverture minimale

| Exigence | Seuil |
|----------|-------|
| Chaque INV-MYC-* doit avoir au moins 1 test | 100% |
| Chaque REJ-MYC-* doit être déclenché au moins 1 fois | 100% |
| Chaque catégorie CAT-* doit avoir au moins 3 tests | 100% |

---

## 5. REPRODUCTIBILITÉ

### 5.1 Exigences

| Exigence | Description |
|----------|-------------|
| Inputs archivés | Tous les inputs de test doivent être conservés |
| Hashs vérifiables | SHA-256 de chaque input |
| Environnement documenté | Version, plateforme, dépendances |
| Seed fixé | Pas de randomisation non contrôlée |

### 5.2 Test de reproductibilité

Pour qu'une preuve soit valide, elle doit passer ce test :

```
1. Prendre le rapport de preuve
2. Extraire l'input (via hash ou archive)
3. Ré-exécuter la validation
4. Comparer output obtenu vs output documenté
5. Si différent → PREUVE INVALIDÉE
```

---

## 6. SEUILS D'ACCEPTATION

### 6.1 Pour un invariant

| Condition | Verdict invariant |
|-----------|-------------------|
| Tous les tests PASS | INV-MYC-xx PROUVÉ |
| Au moins 1 test FAIL | INV-MYC-xx NON PROUVÉ |
| Tests insuffisants (< 1) | INV-MYC-xx NON COUVERT |

### 6.2 Pour Mycelium globalement

| Condition | Verdict Mycelium |
|-----------|------------------|
| Tous les invariants PROUVÉS | MYCELIUM VALIDE |
| Au moins 1 invariant NON PROUVÉ | MYCELIUM INVALIDE |
| Au moins 1 invariant NON COUVERT | MYCELIUM INCOMPLET |

---

## 7. FORMAT DU RAPPORT FINAL

### 7.1 Structure du rapport de validation Mycelium

```
MYCELIUM VALIDATION REPORT
==========================

DATE:         YYYY-MM-DD
VERSION:      X.Y.Z
EXÉCUTEUR:    [identifiant]

RÉSUMÉ
------
Invariants:   12
Prouvés:      X/12
Non prouvés:  Y/12
Non couverts: Z/12

Rejets:       20
Déclenchés:   A/20
Non testés:   B/20

Catégories:   8
Complètes:    C/8

VERDICT GLOBAL: [VALIDE | INVALIDE | INCOMPLET]

DÉTAIL PAR INVARIANT
--------------------
[Table INV-MYC-xx → Verdict]

DÉTAIL PAR REJET
----------------
[Table REJ-MYC-xxx → Déclenché O/N]

DÉTAIL PAR CATÉGORIE
--------------------
[Table CAT-X → Tests / Pass / Fail]

PREUVES
-------
[Liste des rapports de preuve avec hash]

SIGNATURE
---------
Hash rapport final: [SHA-256]
```

---

## 8. CONSERVATION DES PREUVES

### 8.1 Durée de conservation

| Type | Durée |
|------|-------|
| Rapports de preuve | Indéfinie (archivage permanent) |
| Inputs de test | Indéfinie |
| Logs d'exécution | 1 an minimum |

### 8.2 Format d'archivage

| Élément | Format |
|---------|--------|
| Rapports | Markdown (.md) |
| Inputs | Binaire original + hash |
| Bundle | ZIP avec manifest SHA-256 |

---

## 9. AUDIT HOSTILE

### 9.1 Principe

Un auditeur hostile doit pouvoir, en 5 minutes :

1. Identifier quel invariant est testé
2. Retrouver l'input utilisé (via hash)
3. Comprendre le verdict attendu
4. Vérifier le verdict obtenu
5. Reproduire le test si nécessaire

### 9.2 Checklist audit

| Question | Réponse attendue |
|----------|------------------|
| L'invariant est-il identifié ? | OUI, explicitement |
| L'input est-il hashé ? | OUI, SHA-256 |
| L'output est-il documenté ? | OUI, verdict + code |
| Le test est-il reproductible ? | OUI, input archivé |
| Le rapport est-il signé ? | OUI, hash du rapport |

---

## 10. CE QUI INVALIDE UNE PREUVE

### 10.1 Motifs d'invalidation

| Motif | Description |
|-------|-------------|
| Hash input manquant | Impossible de vérifier l'entrée |
| Hash input incorrect | Input modifié ou corrompu |
| Output non documenté | Verdict non traçable |
| Date absente | Non situable dans le temps |
| Non reproductible | Résultat différent à la ré-exécution |
| Invariant non spécifié | On ne sait pas ce qui est prouvé |

### 10.2 Procédure en cas d'invalidation

```
1. Marquer la preuve comme INVALIDÉE
2. Documenter le motif
3. Régénérer la preuve si possible
4. Si impossible → Invariant NON PROUVÉ
```

---

## 11. RÉSUMÉ EXÉCUTIF (5 MINUTES)

### Pour un auditeur hostile :

1. **Preuve = Artefact vérifiable** — Pas une affirmation, un document.

2. **Format obligatoire** — Input hashé, output documenté, verdict tracé.

3. **Reproductibilité** — Même input doit donner même résultat.

4. **Couverture 100%** — Chaque INV-MYC, chaque REJ-MYC testé.

5. **Invalidation claire** — Hash manquant = preuve rejetée.

6. **Verdict global** — VALIDE seulement si TOUT est prouvé.

---

## SIGNATURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   EXIGENCES DE PREUVE MYCELIUM — VERSION 1.0.0                                        ║
║                                                                                       ║
║   Types de preuve:      GOLD (2), SILVER (2), REJECTED (6)                            ║
║   Format:               Structuré, hashé, horodaté                                    ║
║   Couverture exigée:    100% INV-MYC, 100% REJ-MYC                                    ║
║   Reproductibilité:     OBLIGATOIRE                                                   ║
║   Audit hostile:        5 minutes max                                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT**
