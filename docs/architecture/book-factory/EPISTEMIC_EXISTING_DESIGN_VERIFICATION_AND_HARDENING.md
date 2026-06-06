# Vérification FINALE de la conception existante + durcissement anti-contamination

**Date** : 2026-06-05 · **Statut** : VÉRIFICATION (read-only, ZÉRO code, ZÉRO mutation) · **Standard** : NASA-Grade L4 · **Doctrine** : EMP-17 (respect du travail historique — 4000 h ne se gâchent pas par rapidité/vanité).
**Déclencheur (Architecte)** : *« une croyance/un mensonge peut être cru et répété par certains pendant que d'autres connaissent la vérité ; la construction doit être précise pour qu'un événement important ne passe pas en croyance/mensonge, et que son implication dans la trame ne soit pas biaisée. On vérifie une dernière fois la conception existante. »*

---

## 0. Réponse en une phrase
**La crainte est déjà couverte par la conception existante — et plus solidement que prévu.** Une croyance répétée **ne peut PAS** devenir vérité : c'est interdit *structurellement* (rails séparés + promotion gardée par preuve), prouvé par 284 tests. Les ajouts utiles (typage fin des événements, rumeur/propagation, portée) sont **minces et additifs sur le rail interprétation, en projection** — ils ne touchent **jamais** le noyau prouvé ni ne créent de canon. **On n'écrase rien : on étend.**

---

## 1. Ce que les 4000 h GARANTISSENT DÉJÀ (vérifié file:line)

| Crainte / besoin | Déjà couvert ? | Mécanisme existant (preuve) |
|---|---|---|
| **Une croyance répétée devient « vraie » par accumulation** | **IMPOSSIBLE déjà** | Rails séparés `truth` / `interpretation` à **chaînes de hash distinctes** (`canon-kernel/transactions.ts:10`) ; **aucune voie de fusion** des rails (grep = néant) ; la **seule** voie interp→truth = `PROMOTE` (`operations.ts:18`) qui **exige une preuve** (`v-rail-separation.ts:58`). Il n'existe **aucune** opération « promouvoir par N répétitions ». → 100 croyances ≠ 1 preuve, **par construction**. 284 tests verts. |
| **Un événement objectif rétrogradé en croyance, son rôle dans la trame biaisé** | Couvert (substrat) | Un fait objectif vit sur le rail `truth`, **indépendant** des croyances. Le rail interprétation **ne peut pas modifier** une entité `truth:`/`canon:` (`v-rail-separation.ts:83-92`). Donc l'événement garde son statut et peut piloter les conséquences. |
| **Vérité unique, pas 4 bibles concurrentes** | Invariant scellé | `CANON_ENGINE` = « Source de Vérité Unique », **INV-CANON-01 : un seul canon actif** (CNC-201). L'event-sourcing « 1 journal » est **doctrine OMEGA native** (pas un import extérieur). |
| **Un fait critique écrasé en silence** | Couvert | Résolution de conflit : `critical_field` + `constraint_violation` = **NON auto-résolvables → escalade humaine** (`conflicts.ts:77-80`). |
| **« Ça passe mais c'est faux » (incohérence, deus ex machina, erreur de timeline)** | Déjà un module | **THE_SKEPTIC** (CNC-100, IMPLEMENTED) : « fonction de vérité », détecte le confort narratif, `TIMELINE_ERROR`, `PLOT_ARMOR`, `PHYSICS_VIOLATION`, **« mémoire parfaite des causes/effets »** (INV-SKEP-03). |
| **Provenance d'un fait (comment on le sait)** | Couvert | `EvidenceRef` 8 types : `file/url/hash/signature/timestamp/oracle/human/gate_approval` (`evidence.ts:6-14`). |
| **Qui affirme quoi** | Couvert | `CanonTx.actor` + `reason` (`transactions.ts:15-16`) → une assertion = un tx d'un acteur sur le rail interprétation. |
| **Zéro nombre magique (seuils calibrés)** | Couvert | Tous les seuils = Symboles calibrés au runtime (`calibration.ts`), dont `Ω_ESCALATION_THRESHOLD`. |

➡ **Conclusion §1** : ton inquiétude n°1 (contamination par répétition) est **déjà rendue impossible** par l'architecture. Le travail est sain et robuste.

> ⚠ Nuance honnête : `THE_SKEPTIC` et la résolution de conflit vivent dans des zones **dormantes** (`gateway/`, ou latentes) — implémentées et testées mais non câblées au pipeline courant. Ce sont des **atouts à réveiller/ADAPTER**, pas à recréer (cf décision de consolidation).

---

## 2. Ce qui est VRAIMENT à ajouter (mince, additif, jamais dans le noyau)

ChatGPT propose un durcissement. Vérifié : ces éléments **ne sont pas codés** (grep `scope|source_actor|belief_transfer|rumor|assertion` = néant). Mais ils s'ajoutent **par-dessus** le rail interprétation, **en projection**, sans toucher au cœur prouvé :

| Ajout | Pourquoi | Où il vit (sans casser le noyau) | Périmètre |
|---|---|---|---|
| **Typage fin des événements** (OBSERVATION / ASSERTION / BELIEF / REVELATION / CONTRADICTION / PROMOTION_REQUEST) | distinguer « ce qui s'est passé » de « ce qui est rapporté/affirmé/cru » | un **champ `event_type`** sur le claim du rail interprétation (le rail+actor existent déjà ; on raffine le label) | V1 |
| **Rumeur / propagation de croyance** (`source_actor` : « Paul l'a dit à Irina ») | une fausse piste circule sans devenir vraie | claim interprétation + `lineage.sourceId` = de qui je le tiens. **Projection `RumorState`** = compte les porteurs, **sans jamais promouvoir** | **V1** (vital polar) |
| **Portée (`scope`)** | un fait vrai dans un sous-cadre (un huis-clos, une époque) | via `field_path`/`metadata` du claim | V1 léger |
| **Distinction mensonge / erreur sincère** | « ment » seulement s'il **connaît** la vérité | **calcul** : `assert(X) ∧ truth=¬X ∧ knows(¬X)` (cf `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md`) | V1 |
| Rêve / hallucination | plan onirique, narrateur non fiable | sous-rail futur | **V2** |

**Règle d'or du durcissement (à graver)** : *toute « rumeur/croyance/assertion » vit sur le rail interprétation et reste une **projection** ; elle ne peut atteindre le rail truth que par `PROMOTE` + preuve + gate. Aucune accumulation, aucune répétition ne promeut.*

---

## 3. Les 4 LOIS à enshriner pour la trame (ta précision)
1. **Causalité = rail truth uniquement.** Les conséquences dans l'intrigue (ripple/continuity-oracle) se calculent **sur `TruthState`**, **jamais** sur les croyances. → un événement objectif garde son implication, même si tous les persos croient le contraire.
2. **Aucune vérité sans preuve.** `PROMOTE` exige une `EvidenceRef` (déjà codé/testé).
3. **Aucune vérité par répétition.** Pas d'opération de promotion par compte (déjà : inexistante).
4. **Croyance/rumeur = projection attribuée.** Toujours « qui croit / qui a dit », jamais un fait flottant.

---

## 4. P0.6 DURCI — le mini-test doit inclure la rumeur (ChatGPT a raison)
Le mini-scénario passe de « 1 personnage » à « **vérité + rumeur multi-personnages** », pour prouver exactement ta crainte :
```
Ch.1  truth: « la clé est dans le puits ».  Paul croit « chambre ».
Ch.2  Paul dit « chambre » à Irina ; Irina le croit ; Garcia le répète.
      ✅ attendu : 3 porteurs de la croyance « chambre »
                  → TruthState reste « puits ». AUCUNE promotion. Fait objectif intact.
Promotion tentée « chambre » → truth SANS preuve  ✅ REFUSÉE.
Ch.3  le lecteur reçoit la preuve du puits.   ✅ ironie dramatique ; Paul ne ment pas encore (ignore).
Ch.4  Paul découvre la preuve.                ✅ Paul SAIT.
Ch.5  Paul redit « chambre ».                 ✅ MENSONGE (sait et dit le contraire) ; Irina peut encore croire ; TruthState = puits.
```
**Critère de réussite** : à aucun moment `TruthState` n'est contaminé par la croyance répétée. Si ça passe → la construction est sûre. Sinon → on s'arrête.

---

## VERDICT
- **Statut : PASS** (vérification finale, conception existante saine + plus robuste que la crainte). **Confiance : Haute** (file:line + 284 tests + invariants scellés).
- **Forces** : (1) prouve que la contamination répétition→vérité est **déjà impossible** ; (2) respecte les 4000 h — on étend, on n'écrase pas ; (3) retrouve des atouts oubliés (THE_SKEPTIC, escalade conflit) à réveiller ; (4) cadre les ajouts (rumeur/scope/typage) comme **projections additives**, jamais cœur ; (5) durcit le P0.6 sur ta crainte exacte.
- **Faiblesses** : (1) THE_SKEPTIC + conflit-escalade sont **dormants** (gateway) → leur réveil reste à éprouver (intégration non testée) ; (2) le typage fin d'événements doit être figé proprement pour ne pas redevenir un fourre-tout ; (3) la qualité de l'**extracteur** prose→événement reste le maillon faible (un fait objectif mal typé en « assertion » par le LLM fausserait la trame) → CALC d'abord + SKEPTIC en filet + EMP-19 ; (4) `scope` mal défini pourrait fuir entre sous-cadres → à border.
- **Risques restants** : si on bâtissait la rumeur « en dur » comme une donnée (réflexe « fonce »), on risquerait la contamination — **évité** en la gardant en projection sur le rail interprétation.
- **Action** : intégrer ce durcissement au `CHARACTER_KNOWLEDGE_GRAPH_SPEC` et au P0.6 **avant** tout code. Décision Architecte sur le périmètre V1 (rumeur incluse) + GO P0.6. ZÉRO code avant ton feu vert.
```
