# OMEGA — DÉCISIONS VERROUILLÉES
## Sprint CLEAN-0 — Arbitrages définitifs de l'Architecte

**Version** : 1.0 — 2026-03-14
**Autorité** : Francky (Architecte Suprême)
**Statut** : 🔒 VERROUILLÉ — NON REDISCUTABLE

> Ces décisions sont arrêtées par l'Architecte Suprême.
> Elles ne sont pas rediscutables sauf ordre explicite de Francky.
> Toute IA qui tente de rouvrir ces questions viole le CONTRAT_TRAVAIL_OMEGA_v1.0.

---

## DÉCISIONS Q1 → Q6

| # | Question | Décision | Détail |
|---|----------|----------|--------|
| **Q1** | Open Threads dans `prompt-assembler-v2.ts` | **A — Supprimer entièrement** | La liste brute des fils narratifs est supprimée du prompt Scribe. Aucune reformulation. |
| **Q2** | `e1-multi-prompt-runner.ts` | **A — Archiver dans `ARCHIVE/`** | Module déplacé hors du path actif. Tests associés archivés. CDE remplace. |
| **Q3** | `oracle/genesis-v2/` | **A — Quarantaine documentaire** | Conservé avec README strict. Jamais activé en prod sans décision explicite de Francky. |
| **Q4** | `validation/continuity-plan.ts` | **A — Déplacer vers `ARCHIVE/phase-v-incoming/`** | Embryon Phase V préservé pour réutilisation. Sorti du moteur de scène atomique. |
| **Q5** | SceneBrief — contenu | **A — Garder la structure, reformater en dramatique** | Les 4 rubriques `must_remain_true / in_tension / must_move / must_not_break` sont conservées. Le contenu doit être en langage de théâtre — zéro `DEBT[id]`, zéro ID système. |
| **Q6** | Test `INV-PROMPT-01` | **A — Test unitaire strict obligatoire** | Invariant contractuel. Aucun prompt Scribe ne doit contenir : `DEBT[`, `openThreads`, `charStates`, IDs système. Test automatique en CI. |

---

## CONSÉQUENCES OPÉRATIONNELLES

### Ce que CLEAN-1 doit faire (en ordre)

1. `prompt-assembler-v2.ts` — supprimer la section `Open Threads` (lignes ~614-619)
2. Déplacer `e1-multi-prompt-runner.ts` + tests → `sessions/ARCHIVE/`
3. Mettre à jour `real-llm-provider.ts` — retirer l'import `runE1MultiPrompt`
4. Déplacer `validation/continuity-plan.ts` + tests → `sessions/ARCHIVE/phase-v-incoming/`
5. Ajouter `README.md` dans `src/oracle/genesis-v2/` marquant la quarantaine
6. Créer et implémenter le test `INV-PROMPT-01`

### Ce que CLEAN-2 doit faire

1. Créer `src/core/thresholds.ts` — centraliser `SAGA_READY_COMPOSITE_MIN`, `SAGA_READY_SSI_MIN`, `SEAL_ATOMIC_MIN`
2. Centraliser `computeMinAxis()` → `src/utils/math-utils.ts`
3. Centraliser `estimateTokens()` → `src/utils/token-utils.ts`
4. Documenter `s-score.ts` comme legacy dans JSDoc

---

## RÈGLE DE CONFORMITÉ

Avant CLEAN-1, Claude doit vérifier :

- [ ] Section Open Threads supprimée → prompt Scribe pur
- [ ] `e1-multi-prompt-runner.ts` hors du path actif
- [ ] `real-llm-provider.ts` ne contient plus d'import `runE1MultiPrompt`
- [ ] `continuity-plan.ts` hors du sovereign-engine
- [ ] README quarantaine dans `genesis-v2/`
- [ ] Test INV-PROMPT-01 écrit, passant, dans la CI

---

**FIN DU DOCUMENT DÉCISIONS VERROUILLÉES v1.0**
*2026-03-14 — Autorité : Francky (Architecte Suprême)*
