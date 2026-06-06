# C1 — CHARACTERREGISTRY — EVIDENCE PACK (BF-08)

**Date** : 2026-06-06 · **Phase** : C1 (MEGA_ROADMAP §C1 ; ADR DEC-20260606-021-R2 §8 ; D3 signé ; BF-01) · **HEAD base** : 4f7fa2ab · **Mode session** : autonomie dispatch (zéro question).

## VERDICT : **PASS** (après correction du P0 de revue adverse — cycle complet produire→critiquer→corriger→re-prouver)

## LIVRÉ (additif strict — zéro mutation hors packages/book-factory/)
`src/identity/identity-types.ts` (brands, journal IdentityEvent 6 genres, Resolution 5 cas, smart-constructors, **compareStrings cross-machine**) · `identity-errors.ts` (union 11 codes + format déterministe + assertNever) · `character-registry.ts` (projection immuable du journal ; mint par NONCE via canon-kernel `createDeterministicId('ent', seed, 'CHARACTER_MINT', {nonce})` ; apply valide-puis-projette ; trueIdentityOf daté, garde anti-cycle DOCUMENTÉ ; stateHash=sha256(canonicalize(tri codeunit))) · `alias-resolver.ts` (résolution pure, jamais silencieuse, dédup ordre-journal documentée) · `tests/identity/` : fixtures + 4 suites (28 tests).

## INVARIANTS → TESTS (1:1, tous verts)
INV-CHAR-001 `id_never_changes` · 002 `rename_never_mints` · 003 `alias_collision_returns_ambiguous` · 004 contexte explicite (résout) + insuffisant (AMBIGUOUS) · 005 type-level `@ts-expect-error` · 006 `journal_replay_same_hash` + property P1 ×50 · 007 `reveal_links_without_merge` + trueIdentityOf daté · 008 `title_transfer_dated` (3 dates, frontière exclusive propre) · 009 `resolution_carries_evidence` + MISSING_EVIDENCE rejeté.
**Adversarial (8)** : les 7 scénarios ADR §8 + MINT dupliqué rejeté. **Property (4, LCG seedé, zéro dépendance)** : P1 replay ×50 ; P2 ids stables ; P3 surface de naissance fidèle ; P4 frappes disjointes entre seeds ; **P5 journal non-rejouable sous la graine d'un autre livre (anti-contamination inter-livres PAR CONSTRUCTION)**.

## PREUVES D'EXÉCUTION (logs joints)
| Preuve | Résultat |
|---|---|
| `tsc --noEmit` (pré-fix, post-fix) | **EXIT 0** les deux |
| vitest run #1 pré-fix (`vitest_c1.log`) | 72/73 + 1 FAIL (P4 v1 mal formulé — voir Journal des échecs) |
| vitest pré-fix re-run (`rerun2.log`) | 74/74 (P4/P5 reformulés) |
| **vitest POST-FIX P0 ×2 (`r1.log`, `r2.log`)** | **74/74 PASS ×2** |
| non-régression canon-kernel (`ck.log`) | **67/67** |
| non-régression truth-gate (`tg.log`) | **217/217** (le fix P0 ne touche que book-factory ; aucun chemin d'import inverse) |
| **Total final** | **358 verts, zéro régression** |

## REVUE ADVERSE (sub-agent hostile — findings et traitement)
| # | Sévérité | Finding | Traitement |
|---|---|---|---|
| P0-01 | **BLOQUANT — CONFIRMÉ** | `localeCompare()` sans locale = tri dépendant de la machine → `stateHash` différent selon la locale système = **replay cross-machine cassé** (INV-CHAR-006 violé entre 2 PC) | **CORRIGÉ** : `compareStrings` (unités de code UTF-16, zéro ICU) partout (stateHash ×2, aliasesOf, candidats resolver) ; re-prouvé 74/74 ×2 |
| P0-02 | Sémantique sous-documentée | garde anti-cycle de `trueIdentityOf` retourne le nœud de fermeture sans contrat écrit | **DOCUMENTÉ** dans la docstring : cycle impossible en journal valide (ALREADY_REVEALED) ; fail-safe déterministe sinon ; corruption = détectée par replay en amont |
| P1-01 | Fragilité fixtures | positions d'alias hardcodées côté tests = collision théorique | accepté (test-side) ; src utilise journalLength replay-stable |
| P1-02 | readonly compile-time only | pas d'`Object.freeze` runtime | limite DÉCLARÉE (déjà au pack) ; à durcir si consommateur non-TS |
| P1-03 | frontière transfert « chanceuse » | — en fait TESTÉE à la date exacte (ch.15) ; commentaire frontière ajouté au code | clos |
| P2-01..05 | notes (shallow-copy/canonicalize read-only adossé aux 67 tests scellés ; toLowerCase locale FR-ok ; dédup ordre-journal ; tautologie INV-005 runtime (le vrai test = tsc) ; journalLength non persisté → règle ajoutée en docstring : PERSISTER LE JOURNAL, jamais l'état) | commentaires/docs ajoutés |

## JOURNAL DES ÉCHECS (rien n'est caché)
1. **P4 v1 FAIL** : testait « même journal sous autre seed ⇒ autre hash » — faux test : les ALIAS embarquent les ids d'origine ⇒ rejet `UNKNOWN_CHARACTER`, comportement CORRECT. Reformulé P4 + **propriété P5 découverte et scellée** (anti-contamination inter-livres).
2. Auto-relecture pré-run : champ mort `MintRequest.nameAlias` supprimé ; cast superflu remplacé par type interne `CharRow`.
3. **Revue adverse → P0-01 localeCompare** : corrigé + re-prouvé (tableau ci-dessus). Le cycle BF-08 a fonctionné : le bug n'a JAMAIS atteint un commit.

## DÉTERMINISME
Zéro `Date.now()`/`Math.random()`/locale dans src/identity. Temps = diégétique (ChapterRef). Frappe/hash via canon-kernel (primitives scellées). Replay ×50 journaux + suite ×2 + indépendance machine garantie par compareStrings.

## LIMITES DÉCLARÉES
1. Coréférence pronominale ABSENTE par contrat (C2+). 2. `readonly` compile-time (pas de freeze runtime). 3. Persistance : le JOURNAL est l'objet à persister, jamais l'état projeté (docstring). 4. toLowerCase : correct FR (V1) ; multilingue = décision EMP-16.
