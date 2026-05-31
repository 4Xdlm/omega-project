# DEC-20260531-007 — Frontière Scribe / Sovereign (version ultime, fusion 3-IA + correction empirique)

**Status** : PROPOSED · **Date** : 2026-05-31 · **Decision Owner** : Architecte (Francky) · **Severity** : HIGH
**Participants** : Claude Code (synthèse + vérification repo), Gemini (rôles douanier/juge), ChatGPT (matrice d'autorité + boucle interdite).
**Doctrine** : NO CODE BEFORE ADR · CONTROL_BEFORE_WRITE · REPO = TRUTH · PROVE IT · MINIMIZE IT · feedback-toxique-interdit (Codex 3.x) · DÉTERMINISME.

---

## 0. ⚠️ CORRECTION EMPIRIQUE PRÉALABLE (REPO = TRUTH)
Les 3 visions IA partageaient une prémisse implicite : *« scribe propose des candidats → sovereign juge/rejette dans une boucle commune »*. **Le code la contredit** (vérifié 2026-05-31, HEAD `085571db`) :

1. **`@omega/sovereign-engine` n'est importé par AUCUN autre package** (grep repo-wide : 0 consommateur hors lui-même).
2. **scribe-engine ↔ sovereign-engine = totalement découplés** (aucun import croisé).
3. **Le chemin de production** = `creation-pipeline → stage-scribe → runScribe` (`@omega/scribe-engine`). **Aucun import `@omega/sovereign-engine`** dans creation-pipeline ni ailleurs.
4. **Les DEUX sont des moteurs de génération complets** : scribe (weave/weaveLLM + 7 gates + 6 oracles + rewriteLoop) ; sovereign (K2 Chunked, Duel, Sovereign Loop, Dédale, S-Oracle V2, R6).

➡️ **Le « palimpseste / double souveraineté » n'est pas un risque futur : c'est l'ÉTAT ACTUEL.** Deux moteurs complets, déconnectés ; seul scribe est câblé en production ; sovereign (toute la machinerie de qualité V1-SEALED) est une **île**. La vraie décision n'est donc PAS « qui a l'autorité dans la boucle » mais **« quelle relation cible entre deux moteurs aujourd'hui déconnectés »**.

**Correction de la matrice 3-IA** : l'affirmation « LLM generation reste sovereign-owned » est **fausse côté code** — `weaveLLM` est dans scribe, et sovereign a sa PROPRE génération (K2). La ligne pertinente n'est pas *qui génère* (les deux génèrent) mais *qui détient le verdict esthétique final et l'orchestration*.

---

## 1. Synthèse des 3 visions (ce qui converge, corrigé)
| Point | Gemini | ChatGPT | Claude (repo) | **Fusion retenue** |
|---|---|---|---|---|
| Rôle scribe | Douanier structurel + forgeron | Substrat local déterministe | Moteur génération+correction câblé prod | **Scribe = moteur structurel/déterministe (génération + gates CALC + correction locale), autorité STRUCTURELLE** |
| Rôle sovereign | Juge esthétique | Autorité esthétique/R6/finale | Moteur avancé (S-Oracle V2/R6/K2), île non câblée | **Sovereign = autorité ESTHÉTIQUE (S-Oracle V2 + R6 + sélection finale)** |
| LLM generation | Scribe forge | Reste sovereign | **Scribe owns weaveLLM ; sovereign owns K2** (fait) | **Génération = des deux côtés ; ce qui compte = le VERDICT, pas le générateur** |
| Boucle interdite | régénération totale, pas micro-tweak | scribe juge+rejette+accepte seul = interdit | idem | **INTERDIT : un moteur qui génère→juge esthétiquement→accepte le verdict final SEUL** |
| Prochaine étape | trancher avant code | ADR avant code | ADR avant code | **ADR (ce doc), NO CODE** |

---

## 2. Décision (reformulée par la vérité repo)

### D0 — Reconnaître l'état réel
Scribe (production) et Sovereign (île) sont deux moteurs **disjoints**. Toute « frontière » est aujourd'hui **théorique** tant qu'aucun câblage n'existe. L'ADR fixe la frontière **cible** + interdit les anti-patterns, sans présumer un pipeline inexistant.

### D1 — Autorité STRUCTURELLE = scribe-engine
Génération structurée (weave/weaveLLM), validation `IntentArtifact` (fail-closed, LAW-SCRIBE-INTENT-001), 7 gates + 6 oracles **CALC déterministes**, correction locale déterministe, prosepack/contraintes/subtext local, **diagnostics structurés**. Scribe **ne détient pas** le verdict esthétique global.

### D2 — Autorité ESTHÉTIQUE = sovereign-engine
S-Oracle V2 (5 macro-axes), R6 (rejection sampling esthétique, ADR-003), Duel/Best-of-N, sélection finale, tension globale, verdict de qualité littéraire. Sovereign **ne porte pas** les contraintes structurelles bas-niveau de scribe.

### D3 — Génération : pas de monopole, mais un verdict unique
Les deux moteurs peuvent générer. **Le verdict esthétique FINAL appartient à sovereign.** Scribe peut produire et auto-corriger structurellement, mais son output n'est **jamais** « scellé esthétiquement » par scribe lui-même.

### D4 — Boucle INTERDITE (anti double-souveraineté + anti-feedback-toxique)
```
INTERDIT : <moteur> génère → <moteur> juge esthétiquement → <moteur> réécrit sur la base des scores → <moteur> accepte le verdict final, SEUL.
```
Raisons : (a) double souveraineté / verdicts contradictoires ; (b) le feedback scores→directives est déclaré TOXIQUE par le Codex (3.x, ADR-003) → la correction doit être **régénération/rejection**, jamais coaching.

### D5 — Diagnostics, pas verdicts
Les gates/oracles scribe émettent **diagnostics + raisons + contraintes violées** (structurés), consommables par un orchestrateur. Ils ne décident pas du verdict narratif global.

---

## 3. Options pour la relation cible (à trancher par l'Architecte)
- **Option A — Statu quo assumé** : scribe = moteur production, sovereign = labo de recherche séparé. Effort NUL. Risque : la qualité V1-SEALED (S-Oracle V2/R6) reste hors production.
- **Option B — Brancher sovereign en aval de scribe** : scribe génère+gates structurels → sovereign juge (S-Oracle V2 + R6) → sélection. *Pré-requis* : câblage + **vérif cycle DAG** (creation-pipeline dépendrait de sovereign ; sovereign ne doit pas dépendre de scribe). Effort HIGH. Le plus aligné sur « scribe = écriture, sovereign = jugement ».
- **Option C — Promouvoir la machinerie sovereign dans la production** : remplacer/augmenter les oracles scribe par S-Oracle V2 + R6. Effort HIGH, risque de fusion. 

**Recommandation de synthèse** : **Option B** (brancher, pas fusionner) — conforme à la séparation des préoccupations des 3 IA, préserve le découplage des moteurs, met la qualité sovereign en production sans créer un 3ᵉ moteur. À valider par ADR de câblage dédié + vérif cycle.

---

## 4. Matrice d'autorité (corrigée)
| Capacité | Owner | Note |
|---|---|---|
| Validation Intent (fail-closed) | scribe | LAW-SCRIBE-INTENT-001 |
| Contraintes structurelles / prosepack / clichés interdits | scribe | CALC déterministe |
| Génération prose (weave/weaveLLM) | scribe | **fait** (corrige « sovereign-owned ») |
| Génération avancée (K2/Duel/Loop/Dédale) | sovereign | moteur île actuel |
| Gates/oracles structurels (diagnostics) | scribe | remontée structurée |
| S-Oracle V2 (5 macro-axes) | sovereign | autorité esthétique |
| R6 rejection esthétique | sovereign | ADR-003 |
| Sélection finale / verdict qualité | sovereign | autorité finale |
| Câblage scribe↔sovereign | **N'EXISTE PAS** | décision Option A/B/C |

## 5. Non-goals (cet ADR)
Ne refactore rien ; ne câble pas scribe↔sovereign ; ne déplace ni R6 ni S-Oracle ; ne touche ni `weaveLLM` ni prompts ; ne crée aucun flag dans le code ; ne fusionne pas les moteurs.

## 6. Conséquences
- **+** Frontière d'autorité explicite ; anti-palimpseste documenté ; vérité du découplage actée (corrige une fausse prémisse 3-IA).
- **−** Ne livre pas immédiatement « scribe = LE moteur complet » ; la qualité sovereign reste hors prod tant qu'Option B/C non décidée.
- **Risque si ignoré** : on coderait une boucle scribe↔sovereign sur une prémisse fausse → cycle DAG, double rejection, feedback toxique.

## 7. Travaux futurs (gatés, après cet ADR)
- **ADR de câblage** (si Option B) : pipeline `scribe → sovereign R6`, vérif cycle, contrat de diagnostics.
- **Phase D** (expérimentale, flag `SCRIBE_R6_LOOP_EXPERIMENTAL=false` par défaut) : variantes LLM scribe sous garde-fou CALC → candidats transmis à sovereign pour verdict. Bench avant/après, rollback, validation Architecte. Sprint séparé.
- **Phase E** : régénération ciblée, seulement si Phase D prouve un gain.

## 8. Alternatives rejetées
- Scribe devient souverain esthétique complet → REJET (double souveraineté).
- Déplacer R6 dans scribe sans bench → REJET (régression archi).
- Deux moteurs jugent indépendamment → REJET (palimpseste, déjà le risque actuel).
- Fusion scribe+sovereign maintenant → REJET (scope/risque, zéro preuve de bénéfice).

## 9. Critères d'acceptation (PASS)
Frontière explicite ; verdict esthétique = sovereign ; boucle interdite documentée ; **vérité du découplage actée** ; expérience future flaggée non-active ; **0 code modifié** ; commit doc-only ; tree clean.

## Final Decision Statement
`scribe-engine` = substrat d'écriture + correction **structurelle déterministe** (autorité structurelle, diagnostics CALC). `sovereign-engine` = autorité **esthétique** (S-Oracle V2 + R6 + sélection finale). **Aujourd'hui les deux moteurs sont DÉCOUPLÉS** ; la mise en relation (Option A/B/C) est une décision Architecte distincte, à instruire par ADR de câblage + vérif cycle, AVANT tout code. La boucle « un moteur génère→juge→accepte seul » est INTERDITE (anti double-souveraineté + feedback-toxique-interdit). R6 et S-Oracle V2 restent l'autorité esthétique de sovereign.

## Corrections Applied
- **Correction majeure** vs consensus 3-IA : « LLM generation sovereign-owned » → faux (scribe possède weaveLLM ; sovereign possède K2). Et « scribe alimente sovereign » → inexistant en code (moteurs découplés, sovereign sans consommateur). Source : grep repo-wide 2026-05-31, REPO=TRUTH.
- Reformulation de la frontière en termes de **verdict/autorité** (pas de *qui génère*), et de **relation cible entre 2 îles** (pas de division d'une boucle existante).
