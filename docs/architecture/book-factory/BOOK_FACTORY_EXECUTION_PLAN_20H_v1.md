# OMEGA Book-Factory — Plan d'exécution ~20 h (P0.6b → P1), turnkey

**Date** : 2026-06-05 · **Statut** : PLAN À VALIDER (par dispatch — aucune question) · **Standard** : NASA-Grade L4 · **Régime** : 100 % CALC/déterministe, **zéro LLM**, zéro mutation du noyau, commit gaté terminal.
**Principe de validation** : chaque phase se termine par un **gate GO/NO-GO** auto-prouvé (tests verts + tsc 0 + non-régression). Tu valides la continuité d'un mot par dispatch (« continue »). Si un gate échoue → STOP automatique, je ne franchis pas.

---

## 0. Arbitrage des deux tribunaux (tranché)
- **Gemini** : « GO P1, fonce. » — valide P0.6, salue l'event-sourcing, veut le book-planner tout de suite.
- **ChatGPT** : « HOLD P1, GO P0.6b d'abord. » — P0.6 prouve l'anti-contamination, **mais** le *modèle* a 4 failles épistémiques.
- **Mon arbitrage = ChatGPT, et j'assume pourquoi** : la revue adverse a validé le **scénario** (les entrées testées) ; ChatGPT a audité le **modèle général** et a raison sur les 4 points. Construire P1 sur un `knows()` faux = bâtir sur du sable. **P0.6b est non négociable avant P1.** Gemini est satisfait juste après (P1 suit immédiatement, avec sa démo squelette console).

**Les 4 failles réelles de mon adapter P0.6 (à corriger en P0.6b)** :
1. `knows = (belief == truth)` → confond *croire vrai par hasard* et *savoir*. Manque la **justification** (Gettier). Risque : faux mensonges.
2. `recordRevelation()` n'exige **pas de preuve** → fabrique du savoir sans preuve.
3. `readerState() === truthState()` → lecteur **omniscient** → mort du suspense.
4. `PROMOTE` ne référence **pas** la croyance-source → c'est un `SET truth` déguisé.

---

## 1. LE MODÈLE ÉPISTÉMIQUE DÉFINITIF (pièce maîtresse, Gettier-safe)

### 1.1 Quatre champs séparés (jamais fusionnés)
| Champ | Définition | Source (fold du journal) |
|---|---|---|
| **TruthState** | la réalité objective | rail `truth` (WORLD_FACT + PROMOTION acceptée) |
| **BeliefState(perso)** | ce que le perso tient pour vrai | rail `interpretation`, BELIEF/REVELATION par actor |
| **ReaderState** | ce que le **lecteur** a appris | événements `READER_REVEAL` **uniquement** (≠ truth) |
| **RumorState** | qui porte quelle croyance | comptage rail `interpretation` (jamais → truth) |

### 1.2 Taxonomie d'événements (tous via le truth-gate, sur les rails canon)
```
WORLD_FACT(subject,predicate,value)                 → truth rail SET   (l'auteur établit la réalité)
BELIEF(actor, claim, value, source?)                → interp rail SET  (justified=false : devinette/ouï-dire)
REVELATION(actor, claim, value, evidence_refs!)     → interp rail SET  (justified=true ; preuve OBLIGATOIRE)
ASSERTION(speaker, claim, value, audience[])        → interp rail SET  (acte de parole ; ne change pas la croyance)
READER_REVEAL(claim, value)                         → canal lecteur    (alimente ReaderState SEULEMENT)
PROMOTION(source_interpretation_tx_id!, evidence!)  → truth rail PROMOTE (référence la croyance promue + preuve)
```

### 1.3 Les fonctions épistémiques (corrigées)
```
justified(actor, claim)  = la dernière entrée de croyance de l'actor sur claim est une REVELATION
                           portant ≥1 evidence_ref  (sinon : non justifiée)
knows(actor, claim)      = beliefState(actor)[claim] == truthState[claim]  ∧  justified(actor, claim)
                           ← CROYANCE VRAIE JUSTIFIÉE (corrige faille #1)
readerKnows(claim)       = readerState a une valeur pour claim            (corrige faille #3)
isLie(actor, claim)      = asserts(actor,claim)=V ∧ truth=¬V ∧ knows(actor,claim)        (sait, dit le contraire)
isMistake(actor, claim)  = asserts(actor,claim)=V ∧ beliefState(actor)=V ∧ truth=¬V ∧ ¬knows(actor)  (sincère)
isBluff(actor, claim)    = asserts(actor,claim)=V ∧ beliefState(actor)≠V                  (dit ce qu'il ne croit pas)
dramaticIrony(claim)     = readerKnows(claim)=truth ∧ ∃ perso c : ¬knows(c, claim)
```

### 1.4 Les 6 lois gravées (invariants du moteur narratif)
1. **Causalité = rail truth uniquement** (les conséquences d'intrigue se calculent sur TruthState, jamais sur les croyances).
2. **Aucune vérité sans preuve** (PROMOTE exige evidence — gate-enforced).
3. **Aucune vérité par répétition** (N croyances n'ouvrent aucune voie vers truth).
4. **Aucun savoir sans justification** (croire vrai ≠ savoir — corrige #1).
5. **Le lecteur n'est pas omniscient** (ReaderState ≠ TruthState — corrige #3).
6. **Toute promotion référence sa croyance-source** (PROMOTE lié à un interpretation tx — corrige #4).

---

## 2. PHASES (≈20 h), chacune avec livrable + tests + gate

### P0.6b — Hardening épistémique · **~3 h** · (corrige les 4 failles)
**Code (additif, dans `packages/book-factory/src/`)** :
- `book-canon-adapter.ts` : `recordBelief(... justified=false)` ; **`recordRevelation(actor,claim,value,evidence_refs)`** (rejette si evidence vide → ce n'est pas une révélation) ; `knows()` = JTB (ajoute `justified()`) ; **`readerReveal(claim,value)`** + `readerState()` séparé ; **`promote(source_interpretation_tx_id, evidence)`** (rejette si la tx source est absente / pas sur interp rail / sans evidence).
- `epistemic-types.ts` : la taxonomie d'événements + types projetés.

**Matrice de tests (≥10, hors-LLM)** :
| Test | Attendu |
|---|---|
| croyance vraie **par hasard** (BELIEF sans preuve, == truth) | `knows=false` (pas justifiée) |
| REVELATION **sans** evidence | rejetée ; `knows=false` |
| REVELATION **avec** evidence | `knows=true` |
| reader avant `readerReveal` | `readerKnows=false` même si truth existe |
| reader après `readerReveal` | `readerKnows=true` |
| PROMOTE sans `source_interpretation_tx_id` | **refusé** (adapter) |
| PROMOTE avec source + evidence | accepté ; truth mis à jour |
| 3 persos rumeur | truth intact (régression du Test du Puits) |
| devine-juste puis affirme contraire | `isBluff=true`, `isLie=false` (corrige le faux mensonge) |
| sait puis affirme contraire | `isLie=true` |

**Gate P0.6b** : tous verts + `tsc --noEmit` 0 + non-régression (canon-kernel 67, truth-gate 217) + **re-run ×2 déterministe** + revue adverse sur la logique `knows/isLie`.

---

### P1.A — `story-state` = PROJECTION (la Bible mutable) · **~5 h**
**Principe** : la Bible n'est **pas** un stock — c'est un ensemble de **folds purs** du journal canon (event-sourcing), via l'adapter. Crash → replay du journal → état restauré à l'octet.

**Projections (toutes déterministes, calculées) :**
```
characters[]  : { id, name, status(alive|dead|unknown), location, knows[](claims justifiées),
                  believes[](claims), relationships[], arc_position, last_seen_chapter }
places[]      : { id, name, state }            (world_changes : ch5 incendie → ch6 ruines)
timeline[]    : événements ordonnés (chrono)
threads[]     : { id, question, opened_chapter, status(open|resolved), resolved_chapter }
payoff_graph[]: { seed_id, planted_chapter, bloom_target_chapter, status(planted|reinforced|bloomed|OVERDUE) }
facts_learned : par (perso|lecteur) → claims  (dérivé de knows/readerKnows)
```
**Livrables** : `story-state.ts` (folds) + `story-state-snapshot.ts` (sérialisation déterministe + `state_hash`).
**Tests (hors-LLM)** : (a) reconstruire l'état depuis un journal synthétique ; (b) **replay déterministe** (même journal → même `state_hash`) ; (c) `knows[]` d'un perso = exactement ses croyances justifiées ; (d) mort = reste mort (statut critique non écrasé sans gate) ; (e) `payoff_graph` marque OVERDUE quand `bloom_target_chapter` dépassé.
**Gate P1.A** : tests verts + `state_hash` stable sur 2 runs + non-régression.

---

### P1.B — `book-planner` (planificateur macro) · **~5 h**
**Entrée** `BookIntent` : `{ title, premise, genre, core_question, protagonist, cast[], setting, tone, target_word_count(~60000), target_chapters(~30), pov, tense }`.
**Sortie** `BookPlan` : `{ book_id, chapters: ChapterSpec[], pacing_curve[], seed_schedule: PayoffEdge[], act_structure: Act[], plan_hash }`.
`ChapterSpec` : `{ index, act, objective, tension_target, target_word_count, pov_character, seeds_to_plant[], seeds_to_bloom[], threads_to_open/advance/close[], entering_state_requirements[] }`.

**Algorithme (déterministe)** :
1. **Template d'actes par genre** (V1 = polar/thriller) : Acte I exposition+incident (~20 %), Acte II enquête/fausses pistes (~55 %), Acte III révélation/résolution (~25 %).
2. **Découpe en N chapitres** : `mots/chap ≈ 60000/N`, modulé par la courbe de pacing.
3. **Courbe de pacing** : dents de scie montantes vers le climax (dérivée des 6 arcs de Reagan, L9 — heuristique, advisory, jamais gate dur).
4. **Seed schedule** (le différenciateur) : chaque indice = `planted_chapter` (Acte I/II) → `bloom_target_chapter` (Acte II/III), distance bornée + un `reinforced` intermédiaire (anti-oubli). C'est ce qui crée la cohérence d'intrigue longue (résout « indice ch2 → ch25 »).
5. **Pont** : chaque `ChapterSpec` → `Intent` du `genesis-planner` existant (objective→premise, tension→waypoints, seeds→Scene.seeds). Réutilisation maximale, zéro réécriture du planner de scènes.

**Démo obligatoire (Gemini)** : sortie **console** = le **squelette mathématique des 30 chapitres** d'un thriller (index, acte, objectif, tension cible, mots, graines plantées/récoltées).
**Tests** : (a) `plan_hash` stable (déterminisme) ; (b) somme des mots ≈ target ; (c) chaque seed planté est récolté (pas d'orphelin) ; (d) monotonie de la courbe de pacing vers le climax ; (e) ChapterSpec→Intent valide pour genesis-planner.
**Gate P1.B** : tests verts + squelette console affiché + non-régression.

---

### P1.C — `continuity-oracle` (gate INTER-chapitres) · **~4 h**
**Entrée** : `story-state` (projections) + `ChapterSpec` du chapitre. **Sortie** : verdict `PASS | RETRY(reasons[])`.
**Contrôles (CALC-first)** :
- **Contradiction de fait** : un delta de chapitre contredit TruthState (perso mort qui agit, lieu détruit réutilisé intact).
- **Chronologie** : ordre temporel cohérent (timeline monotone).
- **Asymétrie valide** : un perso ne peut **révéler/agir sur** un claim que s'il le `knows` (justifié) — sinon le narrateur fuit (fix R8).
- **Payoff OVERDUE** : une graine dont `bloom_target_chapter` est dépassé sans `bloomed` → RETRY.
- **Cohérence mensonge** : un `isLie` n'est valide que si le perso `knows` la vérité (sinon c'est mistake/bluff — pas une incohérence).
**Tests (deltas synthétiques)** : injecter chaque type de faute → RETRY ; chapitre propre → PASS.
**Gate P1.C** : matrice de fautes attrapées à 100 % + non-régression.

---

### P1.D — Dry-run d'intégration 30 chapitres **synthétiques** + evidence · **~3 h**
**But** : prouver que la **boucle livre** tient sans LLM. On alimente l'orchestrateur avec des **deltas de chapitre synthétiques** (pas de génération) et on vérifie l'épine dorsale.
**Scénario de preuve** :
- `book-planner` génère le plan 30 chapitres (avec une graine `planted:2 → bloom:25`).
- Boucle 1..30 : appliquer le delta synthétique → `story-state.update` → `continuity-oracle.check`.
- **Preuves attendues** : (a) la graine du ch.2 est réinjectée et **récoltée au ch.25** (payoff fire) ; (b) une **contradiction injectée** au ch.18 (perso mort qui parle) est **attrapée** (RETRY) ; (c) une rumeur portée par 3 persos ne contamine jamais TruthState sur 30 chapitres ; (d) **replay déterministe** (même seeds → même `book_hash`).
**Livrables** : `dry-run.ts` + `P1_DRYRUN_EVIDENCE.md` (sorties + hashes) + verdict + log_quality.
**Gate P1.D** : les 4 preuves vertes + non-régression globale.

---

## 3. Budget horaire (≈20 h)
| Phase | Heures | Cumul |
|---|---|---|
| P0.6b hardening épistémique | 3 | 3 |
| P1.A story-state (projection) | 5 | 8 |
| P1.B book-planner (+ démo console) | 5 | 13 |
| P1.C continuity-oracle | 4 | 17 |
| P1.D dry-run 30 chap + evidence | 3 | **20** |

---

## 4. Protocole de vérification (appliqué à CHAQUE phase — « recontrôle ×2 »)
1. `vitest run` du paquet (vert).
2. `tsc --noEmit` (0 erreur, zéro `any`).
3. **Non-régression** : canon-kernel 67 + truth-gate 217 (+ tests des phases précédentes).
4. **Re-run déterministe** (×2, hashes stables).
5. **Revue adverse** (sous-agent) sur toute phase à logique épistémique (P0.6b, P1.C).
6. Evidence pack + verdict PASS/FAIL + log_quality. **Commit gaté terminal** (hooks) → Architecte/Claude Code.

---

## 5. Décisions pré-prises (aucune question — verrouillées)
- **Genre V1** = polar/thriller (structure la plus forte, marché). SF/romance = templates suivants.
- **N chapitres** = 30 par défaut (déduit si absent). **Cible** = 60 000 mots.
- **Pacing** = dents de scie type Reagan (L9), **advisory**, jamais gate dur (anti-Goodhart EMP-16).
- **Épistémique** : `knows` = croyance vraie **justifiée** ; mensonge V1 ; rumeur V1 ; **rêve/hallucination = V2**.
- **Reader** = champ séparé, alimenté par `READER_REVEAL` (suspense préservé).
- **Régime** = 100 % CALC/déterministe **hors-LLM** sur ces 20 h (génération = P2, après ce socle). Zéro coût API, zéro non-déterminisme.
- **Noyau** = `canon-kernel` (rails) intouché ; tout est additif dans `packages/book-factory/`.
- **Rythme appliqué** : via `target_avg_sentence_length` du genome, advisory.

---

## 6. Registre des risques (réels) + mitigations
| # | Risque | Mitigation |
|---|---|---|
| 1 | `knows` mal défini → faux mensonges | **P0.6b** : JTB + tests « devine-juste ≠ sait » / « bluff ≠ mensonge » |
| 2 | Reader omniscient → pas de suspense | ReaderState séparé + `READER_REVEAL` (P0.6b) |
| 3 | PROMOTE = SET truth déguisé | `source_interpretation_tx_id` obligatoire (P0.6b) |
| 4 | story-state redevient un stock (anti-event-sourcing) | folds purs + test replay `state_hash` (P1.A) |
| 5 | Templates de genre = heuristiques non prouvées | advisory + calibrables ; squelette inspectable (P1.B) |
| 6 | continuity-oracle rate une contradiction | matrice de fautes injectées 100 % attrapées (P1.C) |
| 7 | Extracteur prose→événement (le vrai maillon faible) | **hors périmètre 20 h** ; viendra en P2 avec SKEPTIC en filet + calibration EMP-19 |
| 8 | Dérive d'intégration (gate mono-tx en P0.6) | P1.D exerce un vrai store/snapshot + chaîne sur 30 chap |

---

## 7. Checkpoints « dispatch » (ce que « continue » valide)
- **Après P0.6b** : les 4 failles corrigées + matrice verte → continue P1.A.
- **Après P1.A** : Bible reconstructible + replay stable → continue P1.B.
- **Après P1.B** : squelette 30 chapitres affiché → continue P1.C.
- **Après P1.C** : fautes attrapées 100 % → continue P1.D.
- **Après P1.D** : boucle livre prouvée (payoff + contradiction + déterminisme) → **socle Book-Factory CALC scellé**, prêt pour P2 (génération LLM).
Si un gate est rouge, je m'arrête et je te le dis — pas de passage en force.

---

## VERDICT
- **Statut : PLAN LIVRÉ, turnkey.** Confiance : Haute sur P0.6b/P1.A/P1.C/P1.D (CALC pur, prouvable) ; Moyenne sur P1.B (templates de genre = heuristiques à calibrer — assumé).
- **Forces** : (1) corrige les 4 failles épistémiques réelles avant de bâtir (sécurité L4) ; (2) modèle Gettier-safe (savoir ≠ croire vrai) — vraie théorie de l'esprit ; (3) 100 % déterministe/hors-LLM → indiscutable, reproductible, sans coût ; (4) tout additif, noyau intouché ; (5) chaque phase auto-prouvée par un gate → validation par simple dispatch.
- **Faiblesses** : (1) l'extracteur prose→événement (le pont vers la vraie génération) est hors de ces 20 h — c'est le prochain grand risque (P2) ; (2) les templates de genre restent à calibrer empiriquement ; (3) 20 h est une estimation — un gate rouge peut allonger une phase (je préviens, je ne masque pas).
- **Action** : valider la continuité par dispatch. Je démarre **P0.6b** au premier « go », j'enchaîne les phases en m'arrêtant à chaque gate rouge. Aucune question d'ici la fin du socle.
