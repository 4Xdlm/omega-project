# AP_MICROLOT7_REPORT — incision des SAFE sur le V3

**Statut FINAL : 6/7 RETENUS (A236 reverté), toutes gardes vertes. Canon de base INTACT. Sortie = nouveau fichier.** Date : 2026-06-11.
Première écriture réelle sur le manuscrit du chantier tics — guardée, vérifiée, réversible.

## ⚠ MISE À JOUR — A236 ch.43 REVERTÉ (objet fantôme, catch au contrôle humain)
Le verdict humain (ChatGPT) avait marqué A236 « KEEP **surveillé** : vérifier que le verre est local ». Vérification : **le verre n'est PAS dans la main d'Yvon** dans la scène (confrontation physique, Yvon s'élance pour arracher le carnet — il ne boit pas). Le seul autre « verre » du chapitre apparaît APRÈS, un verre posé sur une table qui tinte quand Garcia heurte un pied de table. Donc « Yvon posa le verre sur la table » **inventait un objet** que les gardes (guardRegen/buildCanonical) ne voient pas à ce grain. → **A236 REVERTÉ**. L'original « Yvon ne répondit pas. Il s'élança. » est restauré (vérifié). **Leçon → garde nouvelle V6 : anti-invention d'objet via pointeur d'objets (MARK-1).**

## Chiffres FINAUX (6 patchs)
- **Appliqués : 6/6** (X033, A096, A016, A279, A242, A169). A236 = reverté.
- Sortie `MANUSCRIT_V3_MICROLOT7.md` : **canon `buildCanonical` `054f6785…`** (raw sha à jour au LEDGER). 0 corruption UTF-8.
- Répétition : **GESTURAL 285 → 280 (−5)**, PHRASE 207 → 206 (−1), ATMO/SATU/exactRepeats inchangés. Aucune famille ne monte.
- Base canon re-hashée = `24bb55df` (intacte).

## Pré-publication — blocage typo consigné (mini-scan)
`différe` (faute, é+e) **×22** vs `diffère` (correct) ×4 — **pré-existant** (présent dans la base, hors micro-lot). Item de nettoyage AP-8 TYPO_DIACRITICS avant publication finale. Non corrigé ici (passe gardée séparée).

---
_(Section d'origine ci-dessous : rédigée pour le 1ᵉʳ run 7/7 — voir MISE À JOUR ci-dessus pour l'état final 6/7.)_

## Résultat
- **Base** : `MANUSCRIT_V3_PATCHED.md` (sha256/canon `24bb55dfa009…`, 85 068 mots) — **inchangée après run** (re-vérifié `24bb55df`).
- **Sortie** : `MANUSCRIT_V3_MICROLOT7.md` (85 054 mots, raw sha256 `cf756bbf…`, **canon `buildCanonical` `4cc04883…`**).
- **7/7 ACCEPT** : chaque patch a passé operateTic + patchAdmissible + guardRegen('tic') ACCEPT + `buildCanonical{enforceAuthorRules:true}` certifie + bookGate. Chaîne de hash raw continue dans `AP_MICROLOT7_LEDGER.jsonl`.

## Répétition book-wide (aucune famille ne monte — preuve)
| famille | base | final | Δ |
|---|---|---|---|
| GESTURAL | 285 | 279 | **−6** |
| PHRASE | 207 | 206 | **−1** |
| ATMOSPHERIC | 256 | 256 | 0 |
| SATURATION | 82 | 82 | 0 |
| exactRepeats | 60 | 60 | 0 |

Les 7 tics retirés (6 gestuels + 1 phrase) baissent leur famille ; **aucune autre ne monte** — la machine n'a PAS repeint un tic en un autre. C'est la différence nette avec les 223 candidats bruts (où la fabrique remontait).

## Gardes franchies par patch (mandat ChatGPT)
operateTic (seam-surgeon) · patchAdmissible (RepetitionSensor) · guardRegen 'tic' ACCEPT · buildCanonical LANG_CLEAN + identité S7 + vitalité S8 opposable + narrative · hash avant/après · bookGate (aucune famille ↑) · ancre unique vérifiée. **REVERT bit-identique** armé (non déclenché). **HALT** armé (non déclenché).

## Intégrité vérifiée (post-run, sandbox indépendant)
- 0 caractère corrompu (U+FFFD) dans la sortie — UTF-8 intact (le mojibake console ≠ fichier).
- 7/7 ancres absentes de la sortie, 7/7 remplacements présents 1×.
- Diff borné aux régions ciblées (13 blocs d'opcode, cohérent avec 7 substitutions dont 2 multi-phrases).
- Base canon re-hashée `24bb55df` = identique → **canon non écrasé**.

## Écart de hash consigné (honnêteté, à reconcilier Architecte)
`dc1616e27193` (cité comme « canon » dans triage/BREATH_PROXY_SPEC) ne matche AUCUN fichier V3 sur disque. Le fichier réellement opéré, source de toutes les ancres AP et certifié par buildCanonical, est `24bb55dfa009`. `dc1616` = hash antérieur périmé propagé dans la doc. N'affecte pas la validité (base auto-certifiée), mais à corriger dans les docs.

## Statut & HOLD
- `MANUSCRIT_V3_MICROLOT7.md` = **machine-certifié, publication HOLD** (oreille auteur sur le souffle final).
- Second-rang (P008/A231/A007/P029) = **réserve** (divergence Gemini DROP / ChatGPT HOLD consignée).
- ORANGE V6, V4_ROMAN, NARRATIVE_CLEAN forcé, proxy-en-gate = **HOLD**.
- **Non commité** (commit = terminal Architecte, hooks husky+lfs bloquent DC).

### VERDICT
- **Statut** : PASS — 7/7 appliqués, triple garde verte, aucune famille ne monte, canon de base intact, sortie certifiée.
- **Confiance** : Haute sur la mécanique/sécurité (gardes empiriques + buildCanonical + vérif indépendante) ; le **souffle final** reste à valider à l'oreille (gemma+proxy = avis, pas vérité humaine).
- **Forces** : 1ʳᵉ incision réelle propre du chantier ; réutilise 100 % de la machinerie scellée (zéro doublon) ; GESTURAL −6 / PHRASE −1 sans report ; réversibilité prouvée.
- **Faiblesses** : (1) gain qualitatif modeste (7 phrases sur 85k) ; (2) hash `dc1616` périmé dans la doc à nettoyer ; (3) substitutions jugées par LLM+proxy, pas encore par l'auteur.
- **Risques restants** : aucun sur l'intégrité ; risque éditorial = une des 7 pourrait sonner plate à la relecture humaine (mitigé : proxy non-dégradant + gemma KEEP).
- **Action requise** : relecture Francky des 7 (souffle) → GO publication V3-microlot OU ajustement ; décision commit ; reconcilier hash `dc1616`. HOLD reste.
