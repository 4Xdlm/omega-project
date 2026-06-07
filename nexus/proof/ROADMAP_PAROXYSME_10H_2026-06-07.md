# ROADMAP PAROXYSME 10H — RÉSOLUTION TOTALE POST-VERDICT EMP-16

**Date** : 2026-06-07 · **Mandat** : Francky (« on ne joue plus, on performe ») + tribunal Gemini/ChatGPT
**Mode** : autonomie totale, zéro question terminal, chaque décision auto-auditée AVANT application.

---

## CONTROL_BEFORE_WRITE (EMP-12.1)

- **Domaine** : book-factory (gates runtime, Sceau d'Auteur, chirurgie supervisée). AUCUN module moteur sovereign-engine touché.
- **Documents lus** : EMP16_VERDICT_REPORT.md, retours Gemini + ChatGPT 2026-06-07, ADR-003 (rejection sampling, fallback A), CONCEPT-AUTHOR-SEAL-001, NCR-P0B-001 (fermée).
- **Lois applicables** : EMP-16 (3 preuves avant modif moteur — la gate dure N'EXISTERA PAS dans le code), EMP-13 (staging ciblé), EMP-17 (historique=preuve), BF-08 (tests obligatoires), zéro code mort.
- **Mesures historiques** : verdict EMP-16 (commit dcb279ab) = preuve 1/3 pour toute gate dure future ; Mode C « laisse élastique » TOXIQUE (bench R6) → la gate soft ne renvoie JAMAIS de feedback sémantique, seulement une directive de re-génération bornée.
- **Hallucinations à éviter** : consensus 3-IA déjà faux une fois (dispatch FR/EN) → chaque affirmation tribunal vérifiée contre le code avant exécution.
- **Verdict** : GO_WRITE.

## ARBITRAGES TRANCHÉS (auto-audités, traçables)

| # | Sujet | Gemini | ChatGPT | DÉCISION | Mécanisme causal |
|---|---|---|---|---|---|
| 1 | Marc Vallet | MINT | MINT_AS_ENTITY | **MINT** (2/2) | Rôle cohérent ×5 ; règle maintenue : tout futur hors-PLAN_LOCK ⇒ Author Review, zéro laissez-passer |
| 2 | Résidu ch39 | REPAIR (Surgeon) | REPAIR_SUPERVISED | **REPAIR_SUPERVISED** (2/2) | Literal author-sealed sur V0 (précédent bottes/couvercle), zéro fait nouveau, re-scan + re-hash + SPAN_LOCK |
| 3 | 11 incipits clones | REPAIR (opérer) | REPAIR_SYSTEMIC (interdit manuel) | **REPAIR_SYSTEMIC** | Intersection sûre : Gemini diagnostique lui-même un défaut GÉNÉRATIONNEL ; 11 chirurgies manuelles = risque de défauts neufs sur échantillon clinique ; la prévention runtime corrige la CAUSE |
| 4 | Gate dramatique runtime | Gate DURE immédiate | SHADOW + BLOCKING_SOFT | **SHADOW + SOFT, 'hard' inexistant** | Tranché par la LOI : EMP-16 exige 3 preuves convergentes, on en a 1 (verdict EMP-16). Coder un mode hard dormant = code mort + footgun ⇒ interdit. Précédent exact : OMEGA_R6_GATE '0'\|'shadow'\|'1' (ADR-003) |

**Règle nouvelle gravée** : `BOOK_SCOPED_LEDGER` — un fichier AUTHOR_DECISIONS par livre. Mécanisme : `verifyAnchors` contrôle TOUS les locks actifs contre LE texte ; mélanger les ancres de deux livres ⇒ UNRESOLVED_LOCK garanti ⇒ BUILD FAIL faux positif.

**Interdits actifs (ChatGPT, non contestés)** : promotion `temporal_pacing` ; déclaration `NARRATIVE_CLEAN` ; patch manuel massif ; bypass casting total.

## PHASES (budget ~10h)

| Phase | Contenu | Budget | Commit |
|---|---|---|---|
| PX-0 | Ce document (contrat) | 0h30 | — |
| PX-1 | Sceaux d'Auteur EMP-16 : ledger book-scoped `AUTHOR_DECISIONS_EMP16.json` (Vallet ENTITY_LOCK, ch39 DECISION_LOCK→REPAIR, clones DECISION_LOCK→SYSTEMIC) | 1h00 | A |
| PX-2 | Chirurgie ch39 (literal V0, fermeture » sans fait nouveau) + Vallet minté dans la mesure + **re-verdict complet** : SEMANTIC_CLEAN=true attendu, déficit casting −5, nouveau hash + SPAN_LOCK | 1h30 | A |
| PX-3 | `incipit-gate.ts` : tête 4 mots normalisée, 3ᵉ occurrence interdite, météo détectée, modes '0'\|'shadow'\|'1' défaut shadow, hook admission c7 additif, tests unit+property+intégration | 2h30 | B |
| PX-4 | `dramatic-gate.ts` : fn réalisée (classifieur Doctor) vs fn planifiée (PLAN_LOCK), budget TRANSITION roulant ≤0.45/acte + RÉVÉLATION/acte, modes '0'\|'shadow'\|'soft' (WARN + 1 round regen + fallback flaggé `below_budget` — fallback A ADR-003), télémétrie = futures preuves 2/3, tests complets | 3h00 | C |
| PX-5 | ROBUSTNESS_PROBE du classifieur sur 130 chapitres (18k+88k+EMP16) : stabilité sous contexte variable, marges borderline, distributions — SANS fausse vérité terrain, limites écrites | 1h00 | D |
| PX-6 | Ledgers (2 NEW_CONCEPT + décisions) + mémoire + log_quality + dispatch | 0h30 | D |

## CRITÈRES DE SORTIE (mesurables, pas déclaratifs)

1. `buildCanonical(EMP-16 + locks)` ⇒ SEMANTIC_CLEAN **true**, locks intacts, hash scellé ×2.
2. Suite complète book-factory ≥ 296 + nouveaux tests, **0 FAIL**.
3. `tsc --noEmit` **0 erreur** sur le paquet.
4. Gates : rejouables, déterministes, env-pilotées, **aucun chemin 'hard'** dans le binaire.
5. Chaque commit : message avec claims empiriques + staging ciblé (zéro chap_NNN, zéro binaire).
6. NARRATIVE_CLEAN reste **false** et reste DIT false (clones = dette systémique adressée par PX-3, pas maquillée).
