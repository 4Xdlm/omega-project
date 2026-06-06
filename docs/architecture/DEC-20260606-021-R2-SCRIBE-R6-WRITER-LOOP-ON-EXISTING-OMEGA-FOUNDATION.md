# DEC-20260606-021-R2 — SCRIBE R6 WRITER LOOP ON EXISTING OMEGA FOUNDATION
## « L'Écrivain Souverain — boucle fermée, Bible vivante, vérité non négociable »

**Statut** : PROPOSED — VALIDATION ARCHITECTE OBLIGATOIRE AVANT TOUT CODE · **Autorité** : Francky (EMP-14) · **Date** : 2026-06-06
**Type** : ADR architecture + doctrine + plan opératoire · **Remplace** : DEC-20260606-021 v1 (reclassée CONCEPTUAL_DRAFT)
**Compagnon opératoire** : `docs/architecture/book-factory/MEGA_ROADMAP_C0_C7_R6_SOUVERAIN_v1.md` (plan de construction détaillé, code exemplaire par phase)
**Niveau exigé** : BF-08 MAX_CODE_BAR · **Interdits jusqu'à validation** : code, adapter, refactor, nouveau module, commit automatique.

---

## 0. VERDICT EXÉCUTIF

> **R6 n'est pas un nouveau moteur. R6 est une boucle d'écriture souveraine greffée sur les organes déjà construits.**

Le Forensic V3 (2 instruments indépendants, convergence vérifiée ✓✓) a établi que l'essentiel existe : épine canonique à deux rails (prouvée runtime 284+217 tests), Bible mutable event-sourcée (46 tests), World Model certifié dormant (18 fichiers SEALED, ~273 tests), SKEPTIC implémenté, gates esthétiques codés, contrat Scribe-aveugle scellé, 10 organes actés en janvier 2026. **Le vrai neuf se réduit à trois composants** : CharacterRegistry (identité frappée une fois), Recall Bus (la Bible ne peut pas oublier d'être consultée), Double-Bible (le livre relu mécaniquement contre son canon).

La boucle cible :

```
PlanCanon(t) ──► RecallBus ──► ContextDigest ──► Scribe AVEUGLE (N candidats)
     ▲                                                    │
     │                                              Gates G1-G8 (post-génération)
     │                                                    │
ValidatedEvents(t) ◄── Selector 2 étages ◄── SKEPTIC ◄── Double-Bible diff ◄── Extracteur (passes)
```

La prose n'est pas acceptée parce qu'elle est belle. Elle est acceptée parce qu'elle est **admissible** (gates durs), **cohérente** (diff Double-Bible), **traçable** (evidence), **non contaminante** (rails), puis seulement **la meilleure parmi les survivantes** (sélection multi-objectif expérimentale).

**Pourquoi ça marche (mécanisme)** : chaque garantie repose sur un invariant structurel déjà prouvé, pas sur la discipline du LLM — la contamination croyance→vérité est impossible par construction (hash-chains séparées + PROMOTE-gardé-par-preuve, `v-rail-separation.ts:58`, prouvé P0.6b 13 tests) ; l'oubli d'entité devient un échec de gate, pas une espérance (INV-RECALL-001) ; l'hallucination devient un diff EXTRA mesurable, pas une opinion.
**Où ça casse (limites)** : l'extracteur prose→événements est le maillon faible épistémique (instrument LLM calibré EMP-19, confiance bornée → diffs UNCERTAIN ne gatent jamais durs) ; la qualité esthétique reste plafonnée par le générateur local (BB-02 : plancher 35 mots/phrase ; L01 : attracteur introspection).
**Ce qui pourrait casser le projet (risques systémiques)** : Goodhart si un score devient cible (mitigé : EXPERIMENTAL_DEFAULTS + EMP-16 + N3 interdit) ; lourdeur du rappel si le budget n'est pas physique (mitigé : ACL tiering/digest + équations §10.4).

---

## 1. SOURCES OBLIGATOIRES ET AUTORITÉ

Cette ADR est fondée EXCLUSIVEMENT sur les intrants verrouillés (`ADR_R6_R2_INPUTS_LOCK.md`) :
`00_CARTE_MEMOIRE_OMEGA.md` · `D1-D5_FINAL_ARBITRATION.md` (✍ signés 2026-06-06) · `REUSE_ADAPT_EXTEND_CREATE_FINAL_TABLE.md` · `BIB_TO_MODULE_MAPPING_FINAL.md` · `FORENSIC_V3_{COWORK,CLAUDECODE}/` · CODEX v1.4 PROPOSED (BF-01→BF-08) · `GOVERNANCE/DECISIONS/DEC-20260121-001` (10 organes 🔒) · `GOVERNANCE/VISION_FINALE_SCELLEE.md` · `CONTRAT_OMEGA_SCRIBE_v1.md` (R1-R7) · `docs/architecture/book-factory/*` · ADR-003 (rejection sampling scellé) · DEC-20260531-007 §D4 (boucle interdite) · DEC-20260325-001 4/4 (Canon Lock/World Model/Bible/CDE) · lois BB-01/BB-02/M1/L37/L06 · EMP-16/17/19.

**Règle d'autorité** : `code vivant > tests > décisions scellées > docs actives > museum > mémoire humaine`. Toute proposition future contredisant ces sources = NCR d'abord.

## 2. DÉCISIONS SIGNÉES (D1-D5) — INTÉGRÉES

| ID | Décision signée | Conséquence architecturale dans R2 |
|---|---|---|
| D1 | memory_layer_nasa = **ADAPT via ACL read-only** | §10 `MemoryLayerACL` — l'ACL importe les sous-modules NON exportés d'`index.ts` (tiering/decay/digest — constat V2 ✓✓) sans toucher au gateway |
| D2 | decision-engine = **MUSEUM-RÉFÉRENCE** | sa logique verdict/escalade/trace inspire le format `GateReport` ; zéro import runtime |
| D3 | **CREATE CharacterRegistry mint-once + alias** | §8 — pivot de tout ; AUCUN canon ne référence un nom nu |
| D4 | organes actés = **intrants nommés** | §6 table de mapping intégrale (aucun organe ne disparaît) |
| D5 | « 6 IA » = **non bloquant** | mémoire Architecte documentée non-totalement-retrouvée ; archives privées versables plus tard |

## 3. LOIS CODEX (BF-01 → BF-08) — TEXTE D'APPLICATION

*(Texte intégral : `CODEX_AMENDMENT_PROPOSAL_BOOK_FACTORY_FORENSIC_V3_2026-06-06.md`. Ici : l'application.)*

- **BF-01 IDENTITY_MINT_ONCE** — interdit : `id=hash(name)`, `id=gematria(name)`, `id=hash(contenu)`, `id=timestamp+random` hors registre (les 4 formes existantes, toutes prouvées non rename-stables). Obligatoire : CHAR_ID frappé une fois via `createDeterministicId('ent', seed_unique_de_frappe, 'CHARACTER_MINT', {mint_nonce})` — le payload de frappe est un NONCE de naissance, jamais le nom.
- **BF-02 RECALL_OR_INVALID** — `entité canonique mentionnée ∧ ¬RecallPack ⇒ candidat INVALID`. La loi qui matérialise « la Bible ne peut pas oublier d'être consultée ».
- **BF-03 DOUBLE_BIBLE_DIFF** — diff mécanique MISSING/EXTRA/MUTATED/TEMPORAL/EPISTEMIC + famille UNCERTAIN_* ; signaux, jamais réécriture auto.
- **BF-04 SINGLE_CANON_SPINE** — canon-kernel unique ; les ≥8 stores rivaux recensés → MUSEUM/RÉFÉRENCE (marquage gâté GO).
- **BF-05 WORLD_MODEL_VIA_ACL** — zéro mutation, zéro import sauvage de `gateway/`.
- **BF-06 BIB_AS_VIEWS** — BIB_WORLD/CHARACTER/STYLE/PLOT = vues, pas modules (« des vues, pas des dieux »).
- **BF-07 BLIND_SCRIBE** — le générateur ne voit jamais canon brut/dettes/métriques/verdicts (contrat R1-R7) ; il reçoit un digest d'écriture borné.
- **BF-08 MAX_CODE_BAR** — branded types, `Result<T,E>`, INV-* testés un à un, seed+clock injectés, property-based + adversarial + golden replay, evidence pack par module. Plancher : memory_layer_nasa.

## 4. GLOSSAIRE DE CONTINUITÉ (vocabulaire Architecte → système) — *aucun concept des 4000 h n'est renommé en douce*

| Mot de l'Architecte | Réalisation R2 | Substrat |
|---|---|---|
| « bibliothèques multiples » | les 4 vues BIB_* (§7) | memory_layer/ledger/atlas/raw, registry, voice, planners |
| « sous-agents qui répondent aux appels » | **librarians** = fonctions de réponse pures de l'ACL + résolveurs du Recall Bus (héritiers des sous-juges SENTINEL, DEC-001:29) | memory_query, atlas, search, integration-nexus-dep si dispatch |
| « agents dormants qui viennent aider » | **fonctions de délestage à seuil** (§9.6) : déclenchées par `context_budget_exceeded`, `too_many_facts`… → digest/tier/prune/escalade | memory_tiering/decay/digest (CNC-054/075/055) via ACL |
| « marqueur unique derrière le nom » | **CHAR_ID + AliasRecord** ; chaque mention résolue → RecallPack | CharacterRegistry (C1) + Recall Bus (C2) |
| « matrice quantum / multi-vérités » | rails truth/interpretation + branches + QUANTUM_TRUTH_MANAGER mappé (§6) | canon-kernel (prouvé), CKG |
| « la bible note tout, sort une carte et compare » | Double-Bible + MapProjection + diff (§11) | StoryState ×2 + extracteur |
| « relire à voix haute / à voix basse » | G8 prosodie-rythme (advisory) / G6 SKEPTIC + G3 canon (durs) | temporal/silence/phonetic ; profiles.ts |
| « faire relire par une autre personne » | multi-lecteurs sous EMP-19 (§14) — V1 : gemma4 seul calibré | étalonneur DEC-020 |
| « corriger par phases (perso, monde, vérité, interconnexions, dates/météo) » | **Pass Registry P0-P8 configurable** (§11.5) — les « 5 passes » étaient un exemple, acté | extracteur |
| « INTENT_LOCK / ACTIVE_INVENTORY / SAGA_CONTRACT / GARBAGE_COLLECTOR / COST_LEDGER » (specs §8.3 jamais codées) | réutilisés comme NOMS canoniques : intent-lock=immutabilité BookIntent ; active-inventory=vue « en scène » du RecallPack ; cost-ledger=NarrativeDebt ledger ; saga-contract=V2 inter-livres ; garbage-collector=clôture auditée de fils | MASTER_PLAN v2 §8.3 l.822-828 ✓ |

## 5. ARCHITECTURE GÉNÉRALE — FRONTIÈRES DE RESPONSABILITÉ

```
┌────────────────────────── BOOK-FACTORY (autorité STRUCTURELLE) ──────────────────────────┐
│ book-planner (plan, pacing, seeds) · story-state (Bible-RÉELLE, fold pur) · CKG · debts  │
│ continuity-oracle (gate inter-chap) · context-manager (digest ≤600w prouvé P2)           │
└──────────┬──────────────────────────────────────────────────────────────────┬────────────┘
           │ ChapterSpec + RecallPacks (jamais canon brut)                     │ events validés
┌──────────▼──────────┐   ┌──────────────────────────┐   ┌───────────────────▼───────────┐
│ SCRIBE (prose only) │──►│ GATES G1-G8 + SKEPTIC    │──►│ EXTRACTEUR → Bible-EXTRAITE    │
│ N profils, aveugle  │   │ + Selector 2 étages      │   │ → diffBibles → IncoherenceRpt  │
└─────────────────────┘   └──────────┬───────────────┘   └───────────────────┬───────────┘
                                     │ verdicts/evidence                      │ diffs
┌────────────────────────────────────▼────────────────────────────────────────▼───────────┐
│ canon-kernel (rails+PROMOTE, épine UNIQUE) · MemoryLayerACL (read-only : hot/warm/cold,  │
│ digest, snapshot — D1) · CharacterRegistry (C1) · Evidence/Replay ledger (§13)           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
Scribe n'est JAMAIS responsable de la cohérence. L'Oracle n'est JAMAIS la vérité. Le diff ne réécrit JAMAIS. Chaque flèche = contrat typé + hash.

## 6. MAPPING DES 10 ORGANES ACTÉS (D4 — DEC-20260121-001, aucun ne disparaît)

| Organe (🔒 2026-01-21) | Composant R2 | Statut |
|---|---|---|
| 1 SENTINEL (sous-juges + requêtes bibliothèque/mémoire/snapshots) | le JURY de gates G1-G8 + l'échelle de préséance §12.3 ; ses « requêtes » = librarians ACL | MAPPÉ (forme jury) |
| 2 QUANTUM_TRUTH_MANAGER (multi-vérités) | rails truth/interpretation + branches d'hypothèses sur rail interpretation + résolution PROMOTE-par-preuve | MAPPÉ (substrat prouvé) |
| 3 NARRATIVE_FLOW_CONTROLLER (branches mortes/vivantes, relances) | payoff_graph OVERDUE + continuity-oracle + (V2) suggestions de scènes de relance | MAPPÉ partiel ; relances=V2 |
| 4 INTENT_LAYER (intention auteur > émotion) | BookIntent/ChapterIntent (codés P1/P2) + **intent-lock** : immuable post-GO, hashé | MAPPÉ |
| 5 READER_MODEL (poids faible, avertit) | readerState séparé (P0.6b prouvé) + dramatic-irony tracking CKG ; advisory only | MAPPÉ |
| 6 STYLE_DEVIATION_MANAGER (mauvais style assumé) | dérogations de style par chapitre dans ChapterSpec (mémorisées) ; G7/G8 advisory les respectent | MAPPÉ V2 (V1 : champ réservé) |
| 7 EXECUTION_MODE (OFF/SEMI_OFF/BOOST) | §12.5 : OFF=CALC only (gates durs sans LLM-juge) ; SEMI=+gemma4 ciblé ; BOOST=N=7+extracteur complet | MAPPÉ |
| 8 TOKEN_METER (mesurer/tracer/plafonner) | budget physique §10.4 : chaque RecallPack porte `tokenCost`, chaque chapitre un plafond, dépassement→delestage→sinon DOWNGRADE/STOP/ASK | MAPPÉ |
| 9 PLUGIN_CONTRACT + NEXUS_DEP | ChapterGenerator (interface prouvée P2) = le contrat plugin du générateur ; plugin-sdk noté substrat | MAPPÉ |
| 10 SESSION_SAVE_RITUAL | déjà appliqué + rituel carte (§15.3) | APPLIQUÉ |

## 7. BIBLE MESH — LES QUATRE VUES (BF-06)

**Définition** : `Bible Mesh = Canon spine (rails) + Bible-RÉELLE (StoryState fold) + 4 vues BIB_* + Recall Bus + ACL mémoire`. Une vue = fonction de projection PURE sur les substrats ; zéro stockage propre ; zéro autorité propre.

| Vue | Substrats (paths réels) | Sert |
|---|---|---|
| BIB_WORLD | MemoryLayerACL (store/query/snapshot) ; ledger.project(entityId) ; atlas ; ripple (V2) | lieux, objets, état du monde, trajectoires |
| BIB_CHARACTER | CharacterRegistry + CKG + story-state.characters + adapter épistémique (knows/isLie JTB, 13 tests) | identité, alias, états, relations, savoirs, mensonges, rumeurs, dettes |
| BIB_STYLE | voice-genome (V1 frozen/V2), personas lore-coding L3, muse (src/oracle/muse, câblage à vérifier) | voix, rythme, tics, écarts — **V1 : advisory uniquement** |
| BIB_PLOT | book-planner + story-state.payoff_graph + continuity-oracle + genesis-planner | arcs, beats, graines, payoffs, dettes, branches |

## 8. C1 — CHARACTERREGISTRY (le pivot ; spec détaillée + code exemplaire → MEGA_ROADMAP §C1)

Identité = **frappe** (mint), jamais dérivation. Contrats clés (extrait normatif) :

```ts
type CharacterId = Brand<string, 'CharacterId'>;      // ent_<sha256(seed_mint, 'CHARACTER_MINT', {nonce})> — nonce ≠ nom
type AliasSurface = Brand<string, 'AliasSurface'>;     // forme de surface normalisée NFC, casefold
interface AliasRecord { readonly aliasId: AliasId; readonly characterId: CharacterId;
  readonly surface: AliasSurface; readonly kind: 'name'|'nickname'|'title'|'epithet'|'cover_identity'|'misdirection';
  readonly validFrom?: ChapterRef; readonly validTo?: ChapterRef; readonly revealedAt?: ChapterRef;
  readonly confidence: Confidence01; readonly evidenceRefs: readonly EvidenceId[]; }
type Resolution = | { kind:'RESOLVED_UNIQUE'; id: CharacterId; via: AliasId }
  | { kind:'AMBIGUOUS'; candidates: readonly CharacterId[] } | { kind:'UNKNOWN_NEW_ENTITY' }
  | { kind:'EPITHET_NEEDS_CONTEXT'; candidates: readonly CharacterId[] } | { kind:'PRONOUN_UNRESOLVED' };
```

**Invariants (chacun = ≥1 test nommé)** : INV-CHAR-001 id immuable · 002 rename ne frappe jamais un nouvel id · 003 collision d'alias ⇒ AMBIGUOUS, jamais choix silencieux · 004 même surface→plusieurs persos seulement avec désambiguïsation contextuelle explicite · 005 aucun fait canon ne stocke un perso par nom seul · 006 registre = projection d'un journal append-only (replay) · 007 `revealedAs` (fausse identité) relie deux CHAR_ID sans fusion destructive · 008 transfert de titre (« le maire ») = réassignation d'alias datée · 009 toute résolution porte `evidenceRefs`.
**Adversarial canon (PASS obligatoire)** : Marie→la Comtesse (déjà citée avant révélation) ; deux Paul ; faux nom ; surnom devenu public ; pronom ambigu non résolu sans preuve ; titre changeant de porteur.

## 9. C2 — RECALL BUS (BF-02 ; détail → MEGA_ROADMAP §C2)

Pipeline : `texte/ChapterSpec → MentionScanner (CALC : surfaces normalisées + fenêtres) → AliasResolver (Resolution, jamais de hasard) → RecallQuery → librarians (ACL/StoryState/CKG) → RecallPack (borné, hashé) → ContextDigest`.

```ts
interface RecallPack { readonly packId: RecallPackId; readonly entityId: CharacterId | PlaceId | ObjectId;
  readonly trigger: MentionTrigger; readonly facts: readonly CanonFactSummary[]; readonly beliefs: readonly BeliefSummary[];
  readonly relationships: readonly RelationshipSummary[]; readonly openThreads: readonly ThreadSummary[];
  readonly debts: readonly NarrativeDebtSummary[]; readonly recentEvents: readonly EventSummary[];
  readonly forbiddenDrifts: readonly DriftRule[]; readonly tokenCost: TokenCount; readonly sourceHashes: readonly Sha256[]; }
```

**INV-RECALL-001 (loi centrale)** : entité canonique mentionnée dans un candidat sans RecallPack actif ⇒ candidat INVALID. **INV-RECALL-002** : résolution AMBIGUOUS/PRONOUN_UNRESOLVED ⇒ jamais d'injection silencieuse — marquage incertitude + (si entité critique) retry doux. **INV-RECALL-003** : tout RecallPack porte les hashes de ses sources (replay).
**§9.6 Agents dormants (forme V1)** : pas des daemons — **fonctions de délestage à seuil** (héritage direct CNC-054/075/055) : déclencheurs `too_many_facts | high_risk_entity | active_secret | pending_payoff | timeline_sensitive | context_budget_exceeded | low_confidence_resolution` → réponses `summarize | digest | tier | prune_non_critical (jamais les faits critiques) | escalate_SKEPTIC | mark_uncertainty`.

## 10. C3 — MEMORYLAYERACL (D1 ; détail → MEGA_ROADMAP §C3)

Fonctions : `queryHot/queryWarm/queryColdDigest(entityId)`, `getSnapshot(scope)`, `buildDigest(query, budget)` — **read-only, déterministe, hashs propagés**. INV-MEM-ACL-001 read-only absolu · 002 zéro mutation gateway · 003 zéro modification d'index.ts requise (l'ACL importe les sous-modules par chemin) · 004 même requête ⇒ même résultat (result_hash) · 005 source hashes → RecallPack. **R6 consomme. Il ne répare pas.**
**§10.4 Physique des budgets (TOKEN_METER)** : `budget_contexte(chap) = digest_écriture(≤600w prouvé P2) + Σ tokenCost(RecallPacks) ≤ PLAFOND_CHAPITRE [EXPERIMENTAL_DEFAULT: 1400w]` ; dépassement → délestage §9.6 dans l'ordre (digest→tier→prune non-critique) ; si encore dépassé → DOWNGRADE (BOOST→SEMI) puis ASK. Les faits critiques (`forbiddenDrifts`, secrets actifs, payoffs du chapitre) ne sont JAMAIS élagués.

## 11. C4 — DOUBLE-BIBLE, EXTRACTEUR PAR PASSES, MAPPROJECTION (BF-03)

**Bible-RÉELLE** = StoryState projeté du journal validé. **Bible-EXTRAITE** = StoryState projeté des événements extraits de la prose réelle (même type — le diff est donc mécanique, champ à champ).
**Diff (types complets)** : MISSING (graine non plantée, perso attendu absent, payoff oublié) · EXTRA (perso fantôme, lieu inventé, fait halluciné — **la détection d'hallucination devient un diff**) · MUTATED (Léna enquêtrice→secrétaire ; Ker-Morvan→Ker-Mor ; carnet brûlé→intact) · TEMPORAL (jour/heure/météo/durée incompatibles) · EPISTEMIC (révèle ce qu'il ne sait pas ; ment sans connaître la vérité ; lecteur informé trop tôt ; rumeur traitée en vérité) · UNCERTAIN_{EXTRA,MUTATION} + LOW_CONFIDENCE_EXTRACTION.
**Échelle de confiance** : diff high-confidence → gate possible (G3/G2) ; low-confidence → SKEPTIC/review/retry doux — **FORBID-011 : un diff basse confiance ne rejette jamais automatiquement** (le capteur ne devient pas tyran).
**§11.5 PASS REGISTRY (configurable — les « 5 passes » étaient un exemple, acté)** : P0_SEGMENTATION_ENTITIES · P1_CHARACTERS_POV_VOICE_STATE · P2_WORLD_LOCATIONS_OBJECTS_MAP · P3_TIMELINE_DATES_WEATHER_DURATION · P4_TRUTH_BELIEF_RUMOR_REVELATION · P5_RELATIONSHIPS_POWER_CONFLICT · P6_PLOT_SEEDS_PAYOFFS_DEBTS · P7_STYLE_RHYTHM_REPEAT_PROSODY (advisory) · P8_SKEPTIC_CAUSALITY. Sélection dynamique par type de chapitre (action→P1/P2/P3/P5/P8 ; révélation→P4/P6/P8 ; atmosphérique→P2/P7/P8 ; finale→P1/P3/P4/P5/P6/P8). Aucune passe n'est source de vérité ; les passes produisent des événements CANDIDATS + signaux. Nombre non scellé.
**MapProjection** : cartes spatiale/relationnelle/graines/timeline/savoirs des DEUX Bibles + diff de graphes (lieu fantôme, trajet impossible, relation oubliée, objet téléporté). Advisory d'abord ; gate seulement sur high-confidence.

## 12. LA BOUCLE R6 — CANDIDATS, GATES, SÉLECTION, CORRECTIONS

**12.1 Profils candidats (on varie la PLUME, jamais la réalité)** : canon-strict · tension-interne · sensoriel · dialogue · rythme-compressé · voix-sèche · synthèse. Tous partagent : même canon, mêmes seeds, mêmes RecallPacks, mêmes interdits. Seeds dérivés déterministes (`seed_chap ⊕ profil`).
**12.2 Gates** : G1 Format/Langue (CALC) · G2 Fidelity-intention (CALC+extraits) · G3 Canon/Truth (diff Double-Bible high-conf) · G4 Matter/longueur utile (CALC ; cf. BB-02) · G5 Repeat (SHADOW V1 — observé, ne rejette pas) · G6 SKEPTIC (dur ; via ACL profiles.ts) · G7 S-Oracle esthétique (ADVISORY — jamais rejet direct V1) · G8 Rythme/prosodie (ADVISORY ; « voix haute »).
**12.3 Échelle de préséance (conflits de verdicts)** : `G3 canon > G2 fidelity > G4 matter > G6 SKEPTIC > G1 format > [advisory: G7, G8, G5-shadow]`. Un advisory ne peut JAMAIS renverser un dur ; deux durs en conflit ⇒ candidat rejeté + IncoherenceReport (jamais d'arbitrage silencieux).
**12.4 Sélection 2 étages (anti-Goodhart, hérite R7)** : Étage A éligibilité = G1∧G2∧G3∧G4∧¬SKEPTIC_hard_fail ∧ INV-RECALL-001. Étage B = score multi-objectif **EXPERIMENTAL_DEFAULTS** (composite gemma4 calibré + min_axis hostile + repeat_shadow informatif) — poids non scellés, non production, log obligatoire.
**12.5 EXECUTION_MODE** : OFF = gates CALC seuls (G1/G4/format du diff) — déterministe pur ; SEMI_OFF = + gemma4 ciblé (G3 extraction partielle + G7 advisory) ; BOOST = N=7 + extracteur complet + SKEPTIC. Chaque module déclare son comportement par mode.
**12.6 Corrections** : **N1** régénération aveugle (nouveau seed, zéro feedback) = AUTORISÉ (ADR-003). **N2** correction factuelle nommée = AUTORISÉ SOUS LIMITES (ratification 3-IA requise avant implémentation — réserve maintenue) : uniquement G2/G3/G4, max 2 retries, cite le fait canonique violé + le diff, zéro vocabulaire esthétique (« Léna est enquêtrice, pas secrétaire municipale. Corrige cette violation. »). **N3** coaching esthétique (« plus littéraire », « plus Flaubert », « plus de tension ») = **INTERDIT DÉFINITIVEMENT** (Goodhart ; Mode C bench : Δ−0.264, passage 10%).

## 13. LOI DE REJOUABILITÉ (le « jamais vu » : un ROMAN PROUVABLE)

**INV-REPLAY-BOOK-001** : l'intégralité d'un run livre est reconstructible depuis le journal : `BookIntent(hash) + plan_hash + ∀chap: {seed_chap, RecallPack.sourceHashes, candidats(hash texte + profil + seed), GateReports, diffs, sélection, events validés}`. Même journal ⇒ même Bible-RÉELLE bit-à-bit (state_hash). La prose LLM n'est pas regénérable à l'identique (non-déterminisme du modèle) mais elle est ARCHIVÉE et son admission est REJOUABLE : on peut re-prouver chaque décision d'acceptation des années plus tard. C'est l'extension du replay SHA256 du moteur au LIVRE ENTIER. Persistance : FORBID-007 (aucun run sans persistance de TOUS les candidats, y compris rejetés — matière d'audit et de calibration future).

## 14. MULTI-LECTEURS (EMP-19)

V1 : lecteurs = CALC + SKEPTIC + **gemma4:31b calibré** (seul juge LLM autorisé — 5 modèles disqualifiés N1-N6) + repeat-shadow + diff Double-Bible. Persona-lecteur n°2 = NOUVEL INSTRUMENT : HOLD jusqu'à profil de calibration complet (couple modèle+prompt+temp+corpus — DEC-020) ; route de calibration documentée en MEGA_ROADMAP §C7. FORBID-012 : aucun jury non calibré, aucun « second avis » décoratif.

## 15. ÉVIDENCE, RITUELS, TRAÇABILITÉ

**15.1 Evidence pack obligatoire PAR PHASE C1→C6** (exigence signée) : `MODULE_EVIDENCE_PACK/ = README verdict + invariants list + unit + property + adversarial + golden replay + determinism proof + exemples I/O + failure catalog + hash traces + PASS/FAIL`. **15.2** log_quality.md à chaque jalon + verdict strict. **15.3 Rituel carte** : `00_CARTE_MEMOIRE_OMEGA.md` + mémoire carte mises à jour à CHAQUE phase scellée (loi « ne plus rien perdre »). **15.4** commits = terminal Architecte, staging ciblé (EMP-13).

## 16. SEUILS — TOUS `EXPERIMENTAL_DEFAULTS` (aucun scellé sans logs multi-livres + EMP-16)

| Paramètre | Défaut expérimental | Scellable seulement après |
|---|---|---|
| N candidats Lite/Core | 3 / 7 | bench multi-chapitres |
| Plafond contexte chapitre | 1400 mots (digest 600 + recalls 800) | mesures tokenCost réelles |
| Retries N2 | ≤2 | ratification 3-IA N2 |
| Seuil high-confidence diff | 0.8 | calibration extracteur EMP-19 |
| Gate fidélité G2 | dérive rôle/lieu/temps = 0 toléré sur entités critiques | bench R6-Lite |
| Poids sélection étage B | composite-centré + pénalité min_axis (héritage R7 : comp − 1.5·max(0, 85−min_axis)) | EMP-16 (3 preuves) |

## 17. RISQUES RÉSIDUELS (mécanisme d'échec → mitigation)

R1 extracteur imparfait → UNCERTAIN + SKEPTIC + seuils + no-auto-rewrite. R2 RecallPack lourd → budgets §10.4 + délestage (faits critiques jamais élagués). R3 alias ambigu → AMBIGUOUS + retry doux, jamais de résolution silencieuse. R4 N2 dérive en coaching → bornes §12.6 + audit des prompts N2 dans l'evidence. R5 scores-idoles → EXPERIMENTAL_DEFAULTS + EMP-16 + aucun seuil scellé. R6 era-drift gateway → ACL version-pinnée + tests d'intégration dédiés. R7 sous-production LLM (BB-02, P2B : 900-1200→350-540) → G4 mesure la matière UTILE, plan absorbe (chapitres plus courts × plus nombreux possibles). R8 contamination épistémique → impossible par construction (rails, prouvé P0.6b) — risque résiduel = erreurs d'EXTRACTION, couvertes par P4+EPISTEMIC diff+SKEPTIC.

## 18. INTERDITS ABSOLUS

FORBID-001 nouveau canon · 002 nouveau truth-gate · 003 ID dérivé du nom · 004 mention canonique sans RecallPack · 005 Scribe voit canon brut/dettes/métriques · 006 coaching esthétique (N3) · 007 run R6 sans persistance des candidats · 008 mutation gateway/FROZEN · 009 pondérations scellées sans logs multi-livres (EMP-16) · 010 LoRA/DPO avant stabilisation R6 · 011 diff basse-confiance ⇒ rejet automatique · 012 multi-lecteur non calibré (EMP-19).

## 19. PLAN C0→C7 (résumé — détail intégral : MEGA_ROADMAP compagnon)

| Phase | Objet | Critère PASS (résumé) |
|---|---|---|
| C0 | Ratification ADR + commits pack forensic + marquage MUSEUM (GO) + N2 ratification 3-IA | signatures + repo propre |
| C1 | CharacterRegistry mint-once + alias | identité stable sous les 7 scénarios adversariaux |
| C2 | Recall Bus (scanner, resolver, RecallPack, invariant) | zéro entité canonique sans rappel ; zéro résolution silencieuse |
| C3 | MemoryLayerACL read-only | World Model consommé sans mutation ; requêtes déterministes hashées |
| C4 | Extracteur + Pass Registry + Double-Bible diff + MapProjection | fautes injectées détectées ; low-conf jamais gate dur |
| C5 | R6-Lite (N=3, G1/G2/G5-shadow/INV-RECALL, sélecteur simple) | gagnant ≥ direct sur ≥2/3 chapitres ; packs complets |
| C6 | R6-Core (N=7, tous gates, Double-Bible, SKEPTIC, N2 si ratifié) | 3 chapitres zéro contradiction majeure, audit complet |
| C7 | Run LIVRE complet (GO explicite) + calibration persona n°2 + V2 (rêves, ripple, relances, saga-contract) | — |

**Aucun run livre complet avant C1→C6 PASS + GO Architecte explicite.**

## 20. CRITÈRE DE VALIDATION ET DÉCISION DEMANDÉE

Cette ADR est complète au sens de l'INPUTS_LOCK §5 : chaque capacité de la table finale a sa section ; chaque organe mappé ou différé explicitement ; chaque durcissement tribunal intégré ; D1-D5 cités ; phases avec gates de preuve. **Décision demandée** : **A** VALIDATE AS PROPOSED · **B** AMEND THEN VALIDATE · **C** HOLD. **Recommandation : A avec réserve maintenue — N2 factuel reste soumis à ratification 3-IA avant implémentation (§12.6).**

---
**Phrase scellée** : *R6 ne fabrique pas une nouvelle intelligence à côté d'OMEGA. Il fait circuler le sang entre les organes déjà construits, greffe le nerf du rappel automatique, puis ferme la boucle entre ce que le livre devait dire et ce qu'il a réellement écrit.*

```
VERDICT ADR R2 : PASS (rédaction) — Confiance : Haute
Forces : 100% fondée sur l'existant prouvé ; vrai neuf nommé et minimal ; vocabulaire Architecte préservé ; rejouabilité livre entier
Faiblesses : extracteur = pari instrumental (mitigé §17 R1) ; estimations de seuils non calibrées (assumé : EXPERIMENTAL_DEFAULTS)
Action requise : signature Architecte (A/B/C) + ratification 3-IA du N2
```
