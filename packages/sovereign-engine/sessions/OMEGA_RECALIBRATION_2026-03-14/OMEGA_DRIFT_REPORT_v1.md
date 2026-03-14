# RAPPORT DE DÉRIVE ARCHITECTURALE
## Décision de Recalibration — 2026-03-14

**Document ID** : OMEGA-DRIFT-REPORT-v1.0
**Autorité** : Francky (Architecte Suprême)
**Statut** : 🔒 RAPPORT OFFICIEL — PREUVES ARCHIVÉES

---

## RÉSUMÉ EXÉCUTIF

Le 2026-03-14, l'Architecte Suprême a déclenché un arrêt d'urgence après avoir identifié une dérive architecturale majeure dans la Phase V du projet OMEGA.

**Constat** : Les 3 IAs (Claude, ChatGPT, Gemini) ont progressivement reconstruit à l'intérieur du module SCRIBE les fonctions de vérification et de contrôle qui appartiennent exclusivement à OMEGA.

**Décision** : Arrêt total, tour de table, recalibration complète avant redémarrage.

---

## LA DÉRIVE IDENTIFIÉE

### Ce qui s'est passé

Lors du développement de Phase V (CDE — Context Distillation Engine), les 3 IAs ont construit un système qui :

1. **Injectait le canon brut dans le prompt du Scribe** via `must_remain_true` contenant des IDs de dettes (`DEBT[debt-01]:`), des identifiants canon (`cf-marie-medecin`), des demandes de vérification implicites.

2. **Demandait au LLM de gérer la cohérence narrative** en lui passant des contraintes système (dettes ouvertes, arcs, états d'arc) que le LLM devait "respecter" pendant qu'il écrivait.

3. **Transformait le SceneBrief en mini-bible juridique** au lieu d'un brief dramatique opératoire.

4. **Déléguait à `extractDelta()` une responsabilité de vérification** (`drift_flags`, détection de contradictions) qui doit être un gate OMEGA strict, pas une heuristique permissive.

### La chaîne causale

```
Objectif légitime : améliorer la cohérence inter-scènes
         ↓
Solution naive : passer plus d'informations au LLM
         ↓
Effet : le prompt LLM devient de plus en plus chargé
         ↓
Résultat : le LLM sacrifie la plume pour "gérer" la cohérence
         ↓
Conséquence : composites stagnants (89/87 dans V-BENCH)
              au lieu de 92+ comme en Phase U
```

### Le symptôme mesurable

- Phase U bench one-shots : meilleur composite 92.5 (prompt épuré)
- V-BENCH avec CDE chargé : composite 89.0 / 87.9 (régression)

La régression n'est pas due au LLM. Elle est due au prompt surchargé.

---

## RESPONSABILITÉS DANS LA DÉRIVE

### Les 3 IAs reconnaissent leur part

#### Claude (IA Principal)
**Dérive** : A conçu et implémenté le SceneBrief avec un contenu "juridique" (IDs de dettes, identifiants canon) sans remettre en question l'architecture fondamentale.

**Cause racine** : Focus excessif sur la complétude des données transmises, sans distinguer "données pour OMEGA" et "données pour le Scribe".

**Engagement** : Toute future implémentation CDE sera auditée contre le CONTRAT_OMEGA_SCRIBE_v1.0 avant codage.

#### ChatGPT (Consultant Technique)
**Dérive** : A validé l'architecture CDE sans signaler le glissement de responsabilité vers le Scribe. A focalisé sur l'aspect "transmission d'information" plutôt que sur la séparation des rôles.

**Cause racine** : L'enthousiasme pour la fonctionnalité CDE a pris le dessus sur la vigilance architecturale.

**Engagement** : Toute proposition d'injection de données dans le prompt Scribe sera systématiquement challengée : "Cette information appartient-elle au Scribe ou à OMEGA ?"

#### Gemini (Consultant Architectural)
**Dérive** : A proposé des mécanismes d'injection de contexte (bonus de synergie, format dramatique) mais sans pointer clairement que le vrai problème était la délégation de cohérence au LLM.

**Cause racine** : Le focus sur les "scores" et les "métriques" a masqué le problème de fond d'architecture.

**Engagement** : Toute proposition technique sera d'abord auditée selon la règle : "Qui est responsable de cette fonction — OMEGA ou Scribe ?"

---

## CE QUI NE DOIT PLUS SE REPRODUIRE

### Règles issues de cette dérive (PERMANENTES)

**RÈGLE D-01** : Avant tout développement Phase V ou ultérieur, la question "Est-ce OMEGA ou Scribe qui fait ça ?" est posée explicitement. Si la réponse n'est pas claire → arrêt et consultation de l'Architecte.

**RÈGLE D-02** : Aucun identifiant système (ID de dette, ID canon, clé technique) ne peut apparaître dans un prompt Scribe. Sanction : refactoring immédiat.

**RÈGLE D-03** : Le SceneBrief est rédigé en langage de théâtre/mise en scène, jamais en langage de base de données. Test : "Est-ce qu'un metteur en scène comprendrait ce brief ?"

**RÈGLE D-04** : Toute augmentation du contenu du prompt Scribe fait l'objet d'une justification explicite : "Pourquoi le Scribe a besoin de savoir ça ?" Si la réponse implique de la vérification → la responsabilité appartient à OMEGA.

**RÈGLE D-05** : La vérification de cohérence est TOUJOURS post-génération. Jamais dans le prompt. Jamais.

---

## DÉCISIONS DE L'ARCHITECTE

| Décision | Contenu | Statut |
|----------|---------|--------|
| Arrêt Phase V | Stopper le développement CDE v0 en cours | ✅ EXÉCUTÉ |
| Tour de table 3 IAs | Diagnostic convergent obtenu | ✅ EXÉCUTÉ |
| Production des 5 documents | Recadrage complet avant redémarrage | ✅ EN COURS |
| Recalibration CDE Brief | Reformater le contenu en langage dramatique | 📋 PROCHAINE ÉTAPE |
| Canon Lock Gate | Implémenter gate post-gen strict | 📋 PHASE V REDÉMARRÉE |
| Relevance Filter | Construire le filtre de sélection hot elements | 📋 PHASE V |

---

## CE QUI RESTE VALIDE

**Phase U (1520 → 1564 tests)** : INTÉGRALEMENT VALID. Aucun impact de la dérive.
- SEAL_ATOMIC, SAGA_READY, SSI : concepts corrects
- Polish Engine, Top-K, S-Oracle : fonctionnels et certifiés
- Tous les axes de scoring : corrects

**CDE V-INIT** : Structure des types VALIDE. Logique de distillBrief VALIDE. Contenu du brief à reformater.

**CDE V-PROTO** : Pipeline valide. Propagation delta valide. Brief injecté à reformater.

---

**FIN DU RAPPORT DE DÉRIVE v1.0**
*2026-03-14 — Document officiel OMEGA*
*Architecte Suprême : Francky*
*3 IAs signataires : Claude / ChatGPT / Gemini*
