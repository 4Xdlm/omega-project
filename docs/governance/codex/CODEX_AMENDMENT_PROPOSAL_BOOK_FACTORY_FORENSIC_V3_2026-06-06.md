# CODEX OMEGA — AMENDEMENT PROPOSÉ v1.4 : « BOOK-FACTORY / BIBLE MESH — VÉRITÉS FORENSIC V3 »

**Statut** : PROPOSED (fichier ADDITIF — le CODEX v1.3.x n'est PAS modifié ; intégration + commit = Architecte) · **Date** : 2026-06-06 · **Sources** : Forensic V3 double-instrument (`nexus/proof/FORENSIC_V3_{COWORK,CLAUDECODE,COMPARISON}/`), arbitrages D1-D5 signés.
**But** : que le CODEX porte ces vérités pour qu'AUCUNE session future ne les re-déduise (coût évité : ~3h+ d'analyse).

## PARTIE XVII (proposée) — LOIS BOOK-FACTORY / BIBLE

| ID | Loi | Statut proposé |
|---|---|---|
| **BF-01 IDENTITY_MINT_ONCE** | Aucun identifiant d'entité narrative ne peut être DÉRIVÉ d'un nom ou d'un contenu (gematria, sha(payload.name), timestamp+random : tous prouvés non rename-stables, zéro alias dans le repo). Toute entité = **CHAR_ID frappé une fois, immuable** + table d'alias {nom_courant, aliases[], epithets[], renamed_at[], revealed_at_chapter}. Tous les canons pivotent sur l'ID, jamais sur le nom. | SEALED PROPOSED |
| **BF-02 RECALL_OR_INVALID** | Toute mention d'une entité canonique (plan ou prose) DOIT déclencher un RecallPack (résolution alias → état + knows + fils + dettes). **Entité mentionnée sans RecallPack ⇒ candidat INVALID.** (« La Bible ne peut pas oublier d'être consultée. ») | SEALED PROPOSED |
| **BF-03 DOUBLE_BIBLE_DIFF** | La cohérence d'un manuscrit se prouve par DIFF mécanique entre Bible-RÉELLE (plan/canon) et Bible-EXTRAITE (relue depuis la prose, même type StoryState) : MISSING / EXTRA(=hallucination) / MUTATED / TEMPORAL / EPISTEMIC / UNCERTAIN_*. Le diff produit des SIGNAUX, jamais de réécriture automatique. Extracteur = instrument calibré EMP-19. | SEALED PROPOSED |
| **BF-04 SINGLE_CANON_SPINE** | canon-kernel (rails truth/interpretation + PROMOTE-gardé-par-preuve) = épine canonique UNIQUE. Interdiction de créer un nouveau canon ou truth-gate (le repo en a déjà ≥8 stores : rivaux → MUSEUM, jamais mutés). | SEALED PROPOSED (entérine décision 2026-06-05) |
| **BF-05 WORLD_MODEL_VIA_ACL** | `gateway/memory_layer_nasa` (store/query/snapshot/tiering/decay/digest/hybrid — SEALED Ph.8-10D, ORPHAN, délestage non exporté d'index.ts) se consomme EXCLUSIVEMENT via Anti-Corruption Layer read-only. Zéro mutation, zéro import sauvage. (= D1 signé.) | SEALED PROPOSED |
| **BF-06 BIB_AS_VIEWS** | BIB_WORLD/CHARACTER/STYLE/PLOT = nomenclature de VUES sur les substrats existants (mapping : `BIB_TO_MODULE_MAPPING_FINAL.md`), PAS des modules à créer. | OPERATIONAL |
| **BF-07 BLIND_SCRIBE** | Le générateur ne voit JAMAIS : canon brut, dettes narratives, métriques, état des gates (contrat R1-R7). Vérification = gates POST-génération. N1 régen aveugle ✅ ; N2 correction factuelle nommée 🟡 (bornée G2/G3/G4, ≤2 retries, cite le fait canon + diff) ; N3 coaching esthétique ❌ (Goodhart, Mode C). | reprend doctrine existante |
| **BF-08 MAX_CODE_BAR** | Tout code Book-Factory/R6 (C1→C6) au niveau des modules scellés : branded types (zéro string nu pour les IDs), Result<T,E>, invariants INV-* testés un à un, déterminisme (seed+clock injectés), property-based + tests adversariaux + golden replay, façade minimale, évidence + verdict par module. Référence plancher : memory_layer_nasa. (Loi Architecte 2026-06-06.) | SEALED PROPOSED |

## REGISTRE (à reporter au CODEX)
- FORBID-BF-001 : créer un canon/truth-gate supplémentaire. FORBID-BF-002 : ID dérivé du nom. FORBID-BF-003 : coaching N3. FORBID-BF-004 : code construction avant ADR R2 validée.
- Pointeurs : arbitrages signés `FORENSIC_V3_COMPARISON/D1-D5_FINAL_ARBITRATION.md` ; intrants ADR `ADR_R6_R2_INPUTS_LOCK.md` ; carte de reprise `00_CARTE_MEMOIRE_OMEGA.md` ; ordre de construction C1 CharacterRegistry → C2 Recall Bus → C3 ACL memory → C4 Double-Bible → C5 R6-Lite → C6 R6-Core.
- Hallucinations évitées documentées : World Model « ACTIF » (doc 2026-03-24) contredit par code (ORPHAN) — le code fait foi ; « panel 6-IA » non attesté (max 4/4) ; MUSE n'était PAS spec-only (src/oracle/muse/ existe).
