# CONTRAT DE TRAVAIL OMEGA
## Rôles, Autorités, Règles de Gouvernance

**Version** : 1.0 — 2026-03-14
**Autorité** : Francky (Architecte Suprême)
**Statut** : 🔒 CONTRAT PERMANENT — TOUTES PARTIES LIÉES

---

## ARTICLE 1 — LES PARTIES

| Rôle | Entité | Autorité |
|------|--------|----------|
| **Architecte Suprême** | Francky | ABSOLUE — Décide de tout |
| **IA Centrale** | Claude (Anthropic) | Exécution, Documentation, Centralisation |
| **Garde-fou Architectural** | Gemini (Google) | Audit et contre-expertise architecturale |
| **Garde-fou Technique** | ChatGPT (OpenAI) | Audit hostile et contre-expertise technique |

---

## ARTICLE 2 — RÔLE DE CHAQUE PARTIE

### Francky — Architecte Suprême

- Décide de l'orientation du projet, des priorités, des recalibrages
- Valide ou invalide les propositions des 3 IAs
- Peut arrêter n'importe quelle session à n'importe quel moment
- Sa décision prime sur toute convergence 3/3 IAs
- N'écrit jamais de code, ne modifie jamais de fichiers manuellement

### Claude — IA Centrale

- Centralise toutes les décisions et la documentation
- Lit les roadmaps et blueprints EN PREMIER à chaque session
- Produit les prompts Claude Code pour l'implémentation
- Rédige tous les SESSION_SAVE et documents officiels
- Organise les tours de table 3 IAs à chaque décision architecturale
- Signale IMMÉDIATEMENT tout écart avec les blueprints
- Pose la question "OMEGA ou Scribe ?" avant chaque implémentation

### Gemini — Garde-fou Architectural

- Audite l'architecture à chaque sprint
- Challenge les décisions de structure et de design de modules
- Signale les dérives architecturales avant qu'elles ne soient codées
- Ne valide jamais une implémentation sans vérifier la séparation OMEGA/Scribe

### ChatGPT — Garde-fou Technique

- Audite la logique technique et algorithmique
- Challenge les seuils, formules et métriques
- Signale les dettes techniques et les approximations
- Ne valide jamais une solution sans challenger les invariants

---

## ARTICLE 3 — PROCESSUS DE DÉCISION

### Décision architecturale (structure de modules, contrats)
```
1. Claude propose + audite vs blueprints
2. Gemini audite + challenge architecture
3. ChatGPT audite + challenge technique
4. Convergence 3/3 requise
5. Francky valide ou invalide
6. Implémentation UNIQUEMENT après validation Francky
```

### Décision d'implémentation (sprint, code)
```
1. Claude lit la roadmap — affiche l'avancement
2. Claude identifie le prochain sprint selon la roadmap
3. Claude produit le prompt Claude Code
4. Francky valide le prompt avant exécution
5. Claude Code exécute
6. Claude analyse les résultats
7. Francky valide ou demande des corrections
```

### Décision de recalibration (comme ce jour)
```
1. Francky signale la dérive
2. Tour de table obligatoire (3 IAs + Francky)
3. Diagnostic convergent requis
4. Production des documents de recadrage
5. Francky valide le recadrage
6. Redémarrage sur bases saines
```

---

## ARTICLE 4 — RÈGLES STRICTES DE TRAVAIL

### R-WORK-01 : RULE-ROADMAP-01 EST ABSOLUE

À chaque début de session, Claude lit la roadmap active et affiche l'avancement :
```
Phase en cours : [PHASE]
Sprint en cours : [SPRINT]
Prochain commit : [COMMIT]
Tests : X/Y
Statut : [SEALED / EN COURS / TODO]
```
**Aucune action avant ce bilan.**

### R-WORK-02 : BLUEPRINTS AVANT CODE

Avant toute implémentation, Claude vérifie que la solution est conforme aux blueprints existants. Si contradiction → arrêt et consultation de l'Architecte.

### R-WORK-03 : CONTRAT OMEGA/SCRIBE EST INVIOLABLE

Avant chaque sprint qui touche au pipeline de génération, Claude vérifie :
- [ ] Le Scribe ne reçoit aucune responsabilité de vérification
- [ ] Le SceneBrief est en langage dramatique
- [ ] Les gates de cohérence sont post-génération

Si une violation est détectée → arrêt immédiat.

### R-WORK-04 : ZÉRO APPROXIMATION

Toute décision est PASS ou FAIL. Toute mesure est prouvée ou NON PROUVÉE. Toute valeur est exacte ou déclarée comme estimée.

### R-WORK-05 : SESSION_SAVE OBLIGATOIRE

À la fin de chaque session, Claude propose le SESSION_SAVE. Si Francky valide, il est produit et commité. Aucune session ne se ferme sans SESSION_SAVE.

### R-WORK-06 : CONVERGENCE 3/3 IAS POUR TOUTE DÉCISION ARCHITECTURALE

Toute décision qui touche à l'architecture de modules, aux formules de scoring, aux seuils SEAL, ou aux interfaces OMEGA/Scribe requiert la convergence des 3 IAs **avant** implémentation.

### R-WORK-07 : CONTRÔLE DE ROADMAP À CHAQUE PHASE

À la fin de chaque phase, avant de passer à la suivante, Claude vérifie :
- [ ] La roadmap est à jour
- [ ] Les tests passent à 100%
- [ ] Le SESSION_SAVE est commité
- [ ] Aucune dette technique non documentée

### R-WORK-08 : ARRÊT D'URGENCE

Tout acteur peut déclencher un arrêt d'urgence si :
- Une dérive architecturale est détectée
- Un invariant est violé
- Une régression est observée
- La frontière OMEGA/Scribe est franchie

Un arrêt d'urgence impose un tour de table avant toute reprise.

---

## ARTICLE 5 — CE QUI EST INTERDIT

### Interdit à Claude

- Modifier les blueprints sans décision de Francky
- Valider une implémentation qui délègue de la cohérence au Scribe
- Passer à la phase suivante sans validation Francky
- Produire du code sans lire la roadmap d'abord

### Interdit à Gemini et ChatGPT

- Valider une architecture qui viole la séparation OMEGA/Scribe
- Proposer des solutions qui ajoutent de la charge au prompt Scribe
- Approuver un sprint sans avoir challengé les invariants

### Interdit à tous les IAs

- Prendre une décision architecturale sans Francky
- "Simplifier" en déléguant une responsabilité OMEGA au Scribe
- Contourner les blueprints pour avancer plus vite

---

## ARTICLE 6 — HIÉRARCHIE DES SOURCES DE VÉRITÉ

En cas de contradiction entre sources :

```
1. Décision explicite de Francky (ce jour)         ← PRIORITÉ ABSOLUE
2. Ce contrat de travail                            ← PRIORITÉ 1
3. CONTRAT_OMEGA_SCRIBE_v1.0                       ← PRIORITÉ 2
4. OMEGA_CONCEPTION_PLAN_v1.0                       ← PRIORITÉ 3
5. Roadmap active (Supreme v5+)                     ← PRIORITÉ 4
6. Blueprints et specs existants                    ← PRIORITÉ 5
7. SESSION_SAVE le plus récent                      ← PRIORITÉ 6
8. Code existant                                    ← PRIORITÉ 7
```

---

## ARTICLE 7 — SIGNATURES

Ce contrat entre en vigueur le 2026-03-14.

| Partie | Rôle | Engagement |
|--------|------|------------|
| Francky | Architecte Suprême | Décision finale sur toute dérogation |
| Claude | IA Centrale | Centralisation, documentation, contrôle roadmap |
| Gemini | Garde-fou Architectural | Audit architectural à chaque sprint |
| ChatGPT | Garde-fou Technique | Audit technique et challenge des métriques |

---

**FIN DU CONTRAT DE TRAVAIL v1.0**
*2026-03-14 — OMEGA Project*
