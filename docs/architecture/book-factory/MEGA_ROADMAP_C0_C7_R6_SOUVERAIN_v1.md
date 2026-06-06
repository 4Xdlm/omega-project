# MEGA-ROADMAP C0→C7 — R6 L'ÉCRIVAIN SOUVERAIN (compagnon opératoire de DEC-20260606-021-R2)

**Statut** : PROPOSED (exécution gâtée : validation ADR R2 + GO Architecte par phase) · **Barre** : BF-08 MAX_CODE_BAR partout · **Tout code ci-dessous = CONTRAT NORMATIF D'EXEMPLE** (à implémenter tel quel ou mieux — jamais moins bien). Estimations = indicatives, pas des promesses. Chaque phase se termine par : evidence pack + verdict + log_quality + mise à jour carte + commit (terminal Architecte).

**Socle de style commun (obligatoire, toutes phases)** :
```ts
// — Branded types : zéro string nu pour un identifiant, l'erreur de croisement devient une erreur de COMPILATION.
declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };
export type CharacterId  = Brand<string, 'CharacterId'>;   export type AliasId  = Brand<string, 'AliasId'>;
export type RecallPackId = Brand<string, 'RecallPackId'>;  export type Sha256   = Brand<string, 'Sha256'>;
export type ChapterRef   = Brand<number, 'ChapterRef'>;    export type TokenCount = Brand<number, 'TokenCount'>;
export type Confidence01 = Brand<number, 'Confidence01'>;  // smart-constructor : asConfidence01(x) → Result
// — Result : aucune exception de flux ; l'échec est une VALEUR typée, exhaustivement gérée.
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
// — Horloge et graine INJECTÉES : le déterminisme est une propriété du design, pas une discipline.
export interface Determinism { readonly seed: Brand<string,'Seed'>; readonly now: () => Brand<string,'IsoUtc'>; }
// — Exhaustivité : tout switch sur union discriminée se ferme par assertNever (le compilateur garde la porte).
export function assertNever(x: never): never { throw new Error(`Unreachable: ${JSON.stringify(x)}`); }
```
**Mécanisme (pourquoi cette barre marche)** : chaque classe d'erreur est déplacée vers une strate plus tôt — croisement d'IDs→compilation ; cas oublié→compilation (`assertNever`) ; non-déterminisme→impossible par construction (pas de `Date.now()`/`Math.random()` importables dans src, lint dédié) ; régression silencieuse→golden replay hashé. **Limites** : la barre ne protège pas de specs fausses (d'où les tests adversariaux par phase) ni de la qualité de l'extracteur LLM (d'où UNCERTAIN + SKEPTIC).

---

## C0 — RATIFICATIONS & ASSAINISSEMENT (Architecte ; ~0.5 j)
**Livrables** : ① signature ADR R2 (A/B/C) ; ② commits du pack (forensic ×3 dossiers, carte, codex proposal, ADR, roadmap — staging ciblé EMP-13) ; ③ marquage MUSEUM (doc-only, EMP-15, jamais muter) : `gateway/canon_engine` (NCR existante), `src/canon` (idées DISPUTED→à porter), `OMEGA_PHASE18/20_*`, `decision-engine` (MUSEUM-RÉFÉRENCE D2), `src/runner` (mock) ; ④ lancement ratification 3-IA du N2 (§12.6 ADR) ; ⑤ réponses Q-A (genesis-forge) / Q-B (archives) si disponibles.
**PASS** : repo propre, signatures tracées dans le repo (RULES_OF_EXECUTION : toute décision = fichier).

---

## C1 — CHARACTERREGISTRY (~6 h) — *le pivot : sans identité stable, tout le reste ment*
**Fichiers** : `packages/book-factory/src/identity/{character-registry.ts, alias-resolver.ts, identity-types.ts, identity-errors.ts}` + `tests/identity/{registry.test.ts, resolver.test.ts, registry.adversarial.test.ts, registry.property.test.ts}`.
**Mécanisme** : le registre est une PROJECTION d'un journal append-only (même pattern que story-state — replay natif) ; la frappe utilise `createDeterministicId` de canon-kernel avec un NONCE de naissance (déterminisme de replay SANS dérivation du nom).
```ts
// identity-types.ts — extraits normatifs
export type MintEvent  = { readonly kind:'MINT';   readonly id: CharacterId; readonly nonce: MintNonce;
  readonly displayName: string; readonly introducedAt: ChapterRef; readonly evidence: EvidenceId; };
export type AliasEvent = { readonly kind:'ALIAS';  readonly alias: AliasRecord; };
export type RenameEvent= { readonly kind:'RENAME'; readonly id: CharacterId; readonly newDisplayName: string;
  readonly at: ChapterRef; readonly evidence: EvidenceId; };           // ⚠ ne frappe JAMAIS un nouvel id (INV-CHAR-002)
export type RevealEvent= { readonly kind:'REVEAL'; readonly outerId: CharacterId; readonly innerId: CharacterId;
  readonly at: ChapterRef; readonly evidence: EvidenceId; };           // fausse identité : lien, pas fusion (INV-CHAR-007)
export type IdentityEvent = MintEvent | AliasEvent | RenameEvent | RevealEvent | TitleTransferEvent | StatusEvent;

// character-registry.ts — API publique (façade minimale)
export class CharacterRegistry {
  static fromJournal(events: readonly IdentityEvent[], det: Determinism): Result<CharacterRegistry, IdentityError>;
  mint(req: MintRequest): Result<MintEvent, IdentityError>;            // id = createDeterministicId('ent', det.seed, 'CHARACTER_MINT', { nonce })
  resolve(surface: AliasSurface, ctx: ResolutionContext): Resolution;  // union 5 cas — JAMAIS de choix silencieux
  aliasesOf(id: CharacterId): readonly AliasRecord[];
  stateHash(): Sha256;                                                  // canonicalize + sha256 (canon-kernel) — replay proof
}
```
**Invariants→tests (1:1)** : INV-CHAR-001 `id_never_changes` · 002 `rename_never_mints` · 003 `alias_collision_returns_ambiguous` · 004 `same_surface_two_chars_needs_context` · 005 `no_canon_fact_by_name_lint` (test statique : grep des canons) · 006 `journal_replay_same_hash_50x` · 007 `reveal_links_without_merge` · 008 `title_transfer_dated` · 009 `resolution_carries_evidence`.
**Adversarial (PASS exigé, 7 scénarios ADR §8)** + **property-based** : ∀ séquence aléatoire d'événements valides : replay⇒même hash ; ∀ rename : `resolve(ancienne_surface, période_validité)` retombe sur le même id.
**Evidence pack** : `C1_CHARACTER_REGISTRY_EVIDENCE/` (modèle §15.1 ADR). **PASS chiffré** : 100% invariants verts ×2 runs, tsc 0, zéro régression book-factory 46 + canon-kernel 67 + truth-gate 217.

---

## C2 — RECALL BUS (~8 h) — *« la Bible ne peut pas oublier d'être consultée »*
**Fichiers** : `src/recall/{mention-scanner.ts, recall-query.ts, recall-pack.ts, recall-invariant.ts, dormant-triggers.ts}` + tests (unit/adversarial/property).
**Mécanisme** : le scanner est CALC pur (normalisation NFC+casefold, fenêtres de surface, n-grammes des alias connus → candidats) ; le resolver délègue à C1 ; le pack-builder interroge les librarians (StoryState, CKG, ACL C3) et BORNE par budget ; l'invariant est vérifié sur le CANDIDAT GÉNÉRÉ (post-prose) autant que sur le ChapterSpec (pré-prose) — double filet.
```ts
// mention-scanner.ts — CALC pur, déterministe
export function scanMentions(text: NormalizedText, known: AliasIndex): readonly Mention[];
// recall-pack.ts — construction bornée, traçable
export function buildRecallPack(id: CharacterId, sources: Librarians, budget: TokenCount, det: Determinism):
  Result<RecallPack, RecallError>;   // RecallError = 'BUDGET_UNSATISFIABLE_CRITICAL' | 'SOURCE_UNAVAILABLE' | ...
// recall-invariant.ts — LA loi BF-02, appliquée aux deux bouts
export function enforceRecallOrInvalid(candidate: CandidateText, packs: readonly RecallPack[],
  registry: CharacterRegistry): Result<void, RecallViolation>; // mention canonique sans pack ⇒ violation typée
// dormant-triggers.ts — agents dormants V1 = fonctions de délestage à seuil (héritage CNC-054/075/055)
export type DormantTrigger = 'too_many_facts'|'high_risk_entity'|'active_secret'|'pending_payoff'
 |'timeline_sensitive'|'context_budget_exceeded'|'low_confidence_resolution';
export function applyDormantResponse(pack: RecallPack, t: DormantTrigger, acl: MemoryLayerACL):
  Result<RecallPack, RecallError>;  // summarize|digest|tier|prune_non_critical|escalate_SKEPTIC|mark_uncertainty
```
**Invariants** : INV-RECALL-001 (mention⇒pack sinon INVALID) · 002 (ambiguïté jamais résolue silencieusement) · 003 (sourceHashes complets) · 004 (faits critiques jamais élagués par délestage) · 005 (même texte+même index ⇒ mêmes mentions, hash).
**Adversarial** : alias inconnu ; pronom seul ; deux candidats homonymes ; entité mentionnée UNIQUEMENT dans la prose générée (pas dans le spec) → le filet post-prose l'attrape ; budget impossible avec secret actif → BUDGET_UNSATISFIABLE_CRITICAL (jamais de silence).
**PASS chiffré** : 0 entité canonique sans pack sur le corpus de test (30 specs P1 + 30 proses P2 archivées) ; 0 résolution silencieuse ; déterminisme ×2.

---

## C3 — MEMORYLAYERACL (~5 h) — *réveiller le World Model sans le toucher (D1)*
**Fichiers** : `src/acl/{memory-layer-acl.ts, acl-types.ts}` + `tests/acl/{acl.test.ts, acl.readonly.test.ts, acl.determinism.test.ts, acl.integration.test.ts}`.
**Mécanisme** : l'ACL importe les SOUS-MODULES par chemin (`memory_tiering.ts`, `memory_decay.ts`, `memory_digest.ts`, `memory_hybrid.ts`, `memory_query.ts`, `memory_store.ts`) — contournement PROPRE du non-export d'`index.ts` (constat V2 ✓✓) sans modifier le gateway ; version-pin par hash de fichiers (era-drift → test d'intégration rouge AVANT tout dégât).
```ts
// memory-layer-acl.ts — read-only ABSOLU, déterministe, hashé
export class MemoryLayerACL {
  static attach(pin: GatewayPin): Result<MemoryLayerACL, AclError>;     // pin = {files: ReadonlyMap<path, Sha256>} — INV-MEM-ACL-006 era-drift détecté à l'attach
  queryHot(id: EntityKey): Result<QuerySlice, AclError>;                // wrap memory_query — result_hash propagé
  queryWarm(id: EntityKey): Result<QuerySlice, AclError>;
  queryColdDigest(id: EntityKey, budget: TokenCount): Result<DigestSlice, AclError>; // wrap digest_rules PURE
  snapshot(scope: SnapshotScope): Result<SnapshotRef, AclError>;
}
// INTERDIT par construction : aucune méthode d'écriture n'EXISTE sur le type. (read-only = absence, pas discipline)
```
**Invariants** : INV-MEM-ACL-001 read-only (l'API n'expose aucune écriture) · 002 zéro mutation gateway (test fs-hash avant/après suite) · 003 zéro modif index.ts requise · 004 même requête⇒même result_hash ×50 · 005 hashes→RecallPack · 006 era-drift = échec d'attach explicite.
**PASS chiffré** : suite verte ×2 ; hash du dossier gateway identique avant/après TOUTE la suite ; intégration C2↔C3 (RecallPack alimenté par les 3 tiers) verte.

---

## C4 — EXTRACTEUR + PASS REGISTRY + DOUBLE-BIBLE + MAPPROJECTION (~12 h) — *le livre relu mécaniquement*
**Fichiers** : `src/extraction/{pass-registry.ts, extractor.ts, extracted-events.ts, confidence.ts}`, `src/diff/{bible-diff.ts, incoherence-report.ts, map-projection.ts}` + tests massifs (fautes injectées).
**Mécanisme** : chaque passe = instrument (CALC quand possible : P0 segmentation, P3 dates/nombres regex+calendrier ; LLM gemma4 calibré EMP-19 pour P1/P4/P5 avec sortie JSON contrainte + `Confidence01` par événement) ; les événements extraits sont des CANDIDATS typés (jamais écrits au canon) ; `projectStoryState(extractedEvents)` (RÉUTILISE le fold P1.A — même type, zéro nouveau modèle) ; le diff est champ-à-champ, chaque item porte sa confiance et sa préséance.
```ts
// pass-registry.ts — taxonomie configurable (les « 5 passes » étaient un exemple — acté)
export interface ExtractionPass { readonly id: PassId; readonly mode: 'CALC'|'LLM_CALIBRATED';
  readonly produces: readonly ExtractedEventKind[];
  run(prose: NormalizedText, ctx: PassContext): Result<readonly ExtractedEvent[], PassError>; }
export function selectPasses(chapterKind: ChapterKind, registry: PassRegistry): readonly ExtractionPass[]; // dynamique
// bible-diff.ts — mécanique, exhaustif, jamais de réécriture
export function diffBibles(real: StoryState, extracted: StoryState, conf: ConfidenceIndex): BibleDiff;
export type DiffItem = { readonly kind:'MISSING'|'EXTRA'|'MUTATED'|'TEMPORAL'|'EPISTEMIC';
  readonly confidence: Confidence01; readonly subject: EntityKey; readonly expected?: unknown; readonly observed?: unknown;
  readonly gateEligible: boolean; /* = confidence ≥ seuil ∧ kind ∈ {MUTATED,EXTRA,EPISTEMIC,TEMPORAL} */ };
```
**Invariants** : INV-XTR-001 événements extraits jamais écrits au canon sans validation · 002 toute sortie LLM porte confiance + prompt_hash (EMP-19) · 003 diff exhaustif (property : toute mutation injectée d'un champ de StoryState produit ≥1 DiffItem) · 004 FORBID-011 (low-conf ⇒ jamais gate dur) · 005 MapProjection = même projection appliquée aux deux Bibles (symétrie).
**Adversarial (catalogue de fautes injectées, chacune DOIT être attrapée)** : graine non plantée (MISSING) ; perso fantôme (EXTRA) ; Léna secrétaire (MUTATED role) ; Ker-Morvan→Ker-Mor (MUTATED name→via alias C1 : pas de faux positif si alias légitime !) ; mardi→jeudi (TEMPORAL) ; perso révèle le secret qu'il ignore (EPISTEMIC — réutilise knows() JTB) ; extraction volontairement bruitée (UNCERTAIN, pas de gate).
**PASS chiffré** : 100% du catalogue attrapé ; 0 gate dur sur low-conf ; symétrie MapProjection prouvée ; déterminisme CALC ×2 ; sorties LLM archivées+hashées.

---

## C5 — R6-LITE (~8 h) — *observer avant de punir (N=3)*
**Fichiers** : `src/loop/{candidate-factory.ts, gates-lite.ts, selector-lite.ts, persistence.ts, r6-lite-runner.ts}`.
**Mécanisme** : 3 profils (canon-strict / sensoriel / synthèse), seeds dérivés `seed_chap⊕profil` ; gates DURS minimum (G1 format, G2 fidélité entités critiques, INV-RECALL-001) ; G5 repeat + G7 S-Oracle en OBSERVATION (loggés, ne rejettent pas) ; persistance TOTALE (FORBID-007) : `runs/r6lite/<book>/<chap>/candidate_<n>/{prose.txt, meta.json(hash,seed,profil), gates.json, recallpacks.json}`.
```ts
export interface R6LiteResult { readonly chapter: ChapterRef; readonly candidates: readonly PersistedCandidate[];
  readonly eligible: readonly CandidateRef[]; readonly winner: CandidateRef | { readonly kind:'NONE_ELIGIBLE'; readonly fallback:'BEST_UNDER_GATES_FLAGGED' };
  readonly evidence: EvidencePackRef; }   // fallback hérité ADR-003 : meilleur sous seuil + flag, jamais de silence
```
**PASS chiffré (3 chapitres « Le Silence du Phare » rejoués)** : 9 candidats persistés ; INV-RECALL-001 appliqué partout ; gagnant ≥ génération directe P2 sur ≥2/3 (juge gemma4 calibré + review humaine) ; repeat_score non aggravé vs direct ; evidence packs complets.

## C6 — R6-CORE (~12 h) — *boucle souveraine complète (N=7)*
Ajoute : 7 profils ; G3 = diff Double-Bible high-conf (C4) ; G6 SKEPTIC via ACL (`gateway/src/profiles.ts`, FROZEN — lecture seule) ; G8 prosodie advisory ; sélection 2 étages (éligibilité → score expérimental loggé) ; N2 si ratifié 3-IA (bornes ADR §12.6, prompts N2 archivés dans l'evidence) ; échelle de préséance §12.3 ; EXECUTION_MODE OFF/SEMI/BOOST opérationnel.
**PASS chiffré** : 3 chapitres consécutifs zéro contradiction majeure (0 diff dur non résolu) ; tous candidats+verdicts audités ; replay de la décision d'admission prouvé (INV-REPLAY-BOOK-001) ; zéro vocabulaire esthétique dans les prompts N2 (audit automatique).

## C7 — LIVRE COMPLET + EXTENSIONS (gâté GO explicite)
Run 30 chapitres sous R6-Core (détaché, crash-safe par replay) → manuscrit + Bible-RÉELLE + diffs + carte + evidence livre entier. Puis : calibration persona-lecteur n°2 (protocole EMP-19 complet — corpus, biais position, tie-rate) ; V2 : rêves/hallucinations (CKG), ripple_engine, relances NARRATIVE_FLOW, SAGA_CONTRACT inter-livres, MIMESIS+/BIB_STYLE actif.

---

## TOTAUX & DÉPENDANCES
`C1→C2→{C3∥C4}→C5→C6→C7` (C3 et C4 parallélisables après C2). Estimation cumulée C1-C6 : **~51 h** de construction + evidence (hors ratifications C0 et runs C7). Chaque phase est un point d'arrêt propre (rien n'est à moitié câblé entre deux phases).

## VERDICT (roadmap)
- **Statut : PASS (plan) — Confiance : Haute** sur l'architecture (tout est ancré sur du prouvé), **Moyenne** sur les durées (estimations) et sur le rendement de l'extracteur P1/P4/P5 (instrument LLM — encadré UNCERTAIN/SKEPTIC).
- **Faiblesses assumées** : ① l'efficacité du MentionScanner CALC sur les épithètes inédites dépendra du registre d'alias vivant (mitigation : UNKNOWN_NEW_ENTITY → escalade, jamais silence) ; ② les seuils chiffrés sont tous EXPERIMENTAL_DEFAULTS (scellage = EMP-16 après logs multi-livres).
- **Action requise** : signature ADR R2 (A/B/C) + GO C0. Zéro ligne de code avant.
