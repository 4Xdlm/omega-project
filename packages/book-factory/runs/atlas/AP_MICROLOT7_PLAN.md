# AP_MICROLOT7_PLAN — plan d'incision des 7 SAFE (exécuté)

**Statut : EXÉCUTÉ. Canon de base INTACT (jamais écrasé). Sortie = NOUVEAU fichier.** Date : 2026-06-11.
Mandat convergent Gemini + ChatGPT : micro-lot = **7 SAFE uniquement** (gemma KEEP ∩ proxy non-dégradant), un par un, gardé, HALT si famille émerge. Second-rang (P008/A231/A007/P029) = **HOLD réserve** (Gemini votait DROP, ChatGPT HOLD → consigné, j'ai pris le moins destructif : réserve). ORANGE V6 / V4_ROMAN = HOLD.

## Base canonique (cible)
- Fichier : `runs/patch_v3/MANUSCRIT_V3_PATCHED.md`
- sha256 (NFC) = `buildCanonical.finalHash` = `24bb55dfa009108191d35f1b0a96f9eeed642314ed5c1c62311ff79302cb42be` (préfixe `24bb55df`).
- **Réconciliation hash (honnêteté)** : plusieurs docs antérieurs (triage, BREATH_PROXY_SPEC) citent le canon comme `dc1616e27193`. Ce hash **ne correspond à aucun fichier V3 sur disque** (ni raw, ni CRLF/NFC). Le fichier réellement patché — celui d'où viennent TOUTES les ancres AP, et que `buildCanonical` certifie (baseOk=true) — est `24bb55dfa009`. `dc1616e27193` est donc un hash **antérieur/périmé** (probablement pré-LANG-clean) propagé dans la doc. **À reconcilier par l'Architecte** ; n'affecte pas la validité du micro-lot (la base se certifie elle-même).

## Les 7 (ordre ChatGPT : du moins au plus incarné)
| # | id | ch | famille | tic retiré | gemma | proxy Δeuphonie |
|---|---|---|---|---|---|---|
| 1 | X033 | 6 | PHRASE | comme un coup de feu | 7 | +5 |
| 2 | A096 | 18 | GESTURAL | esquissa un sourire | 8 | +12 |
| 3 | A016 | 3 | GESTURAL | ne répondit pas immédiatement | 8 | +2 |
| 4 | A236 | 43 | GESTURAL | ne répondit pas | 8 | +17 |
| 5 | A279 | 49 | GESTURAL | ne répondit pas | 8 | +3 |
| 6 | A242 | 44 | GESTURAL | ne bougea pas | 8 | +6 |
| 7 | A169 | 31 | GESTURAL | esquissa un sourire | 8 | +4 |

## Triple garde par patch (toutes réutilisent des briques scellées)
1. **operateTic** (`tic-weaver` → seam-surgeon `guardPatch` + re-scan ciblé) — phrase : bornes, NEW_ENTITY, NO_RECALL, REPEAT, le tic ciblé baisse.
2. **patchAdmissible** (`RepetitionSensor`) — la famille ciblée baisse, aucune ne monte (compte).
3. **applyPatch** (`patch-v3.ts` → `guardRegen 'tic'` + `buildCanonical{enforceAuthorRules:true}`) — chapitre : casting intact, zéro mort ressuscité, longueur en bande, LANG_CLEAN, identité S7, vitalité S8 opposable. **REVERT bit-identique** si refus.
4. **bookGate** — `measureRepetition` book-wide : aucune famille ne monte vs base. **HALT total** si une monte.

Ancres vérifiées présentes exactement 1× dans la base AVANT exécution (7/7).

## Sorties
`MANUSCRIT_V3_MICROLOT7.md` (nouveau), `AP_MICROLOT7_LEDGER.jsonl` (hash raw+canon par patch), `AP_MICROLOT7_REPETITION_SCAN.md`, `AP_MICROLOT7_REPORT.md`.
