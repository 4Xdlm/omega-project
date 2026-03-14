# OMEGA — PLAN DE CONCEPTION COMPLET
## Architecture, Fonctions, Données, Responsabilités

**Version** : 1.0 — 2026-03-14
**Autorité** : Francky (Architecte Suprême)
**Statut** : DOCUMENT DE RÉFÉRENCE — NE PAS MODIFIER SANS DÉCISION ARCHITECTE

---

## PRINCIPE FONDAMENTAL

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   OMEGA = Démon de Maxwell de l'écriture                          ║
║                                                                    ║
║   Il ne génère pas. Il contrôle, filtre, mesure, corrige.         ║
║   Il interdit aux mots "tièdes" de passer.                        ║
║                                                                    ║
║   SCRIBE (LLM) = Artiste aveugle                                  ║
║                                                                    ║
║   Il génère la meilleure prose possible sur une scène donnée.     ║
║   Il ne sait rien du roman. Il ne vérifie rien. Il écrit.         ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## COUCHES DE L'ARCHITECTURE

```
COUCHE 0 — MONDE NARRATIF (Sources de vérité)
├── World Model          : canon, arcs, dettes, états personnages
├── Canon Lock           : faits immuables — gate strict
├── Debt Ledger          : dettes narratives ouvertes/résolues
├── Arc Tracker          : position de chaque personnage dans son arc
└── Persona Store        : psychologie profonde des personnages

COUCHE 1 — PRÉPARATION (OMEGA → Scribe)
├── Relevance Filter     : sélection des hot elements pertinents
├── CDE.distillBrief()   : compression → SceneBrief ≤ 150 tokens (DRAMATIQUE)
├── ForgePacketAssembler : assemblage du contrat de génération complet
├── PromptAssembler      : construction du prompt final
└── Pre-Write Validator  : validation du ForgePacket avant envoi

COUCHE 2 — GÉNÉRATION (Scribe)
└── LLM                  : reçoit le prompt, génère la prose, rien d'autre

COUCHE 3 — ÉVALUATION POST-GÉNÉRATION (OMEGA vérifie)
├── S-Oracle             : mesure la qualité prose (ECC/RCI/SII/IFI/AAI)
├── Delta Computer       : mesure l'écart entre prose et contrat (6D)
├── Canon Lock Gate      : REJECT si violation du canon
├── CDE.extractDelta()   : extrait ce qui a changé (faits, arcs, dettes)
├── Physics Audit        : conformité trajectoire émotionnelle
├── Authenticity Gate    : détection IA-smell (δ_AS)
└── Genius Engine        : D×S×I×R×V — mesure l'excellence littéraire

COUCHE 4 — DÉCISION & CORRECTION (OMEGA décide)
├── Polish Engine        : chirurgie ciblée si composite ∈ [89, 92)
├── Sovereign Loop       : boucle pitch→patch→rescore
├── Top-K Selection      : sélection du meilleur candidat parmi K
└── SEAL / REJECT        : verdict final

COUCHE 5 — CERTIFICATION & MÉMOIRE (OMEGA archive)
├── ProofPack            : artefacts hashés, traçabilité complète
├── World Model Update   : mise à jour du canon avec le delta certifié
├── Session Save         : sauvegarde de l'état pour continuité
└── Debt Ledger Update   : synchronisation des dettes ouvertes/résolues
```

---

## CATALOGUE DES MODULES — FONCTIONS EXACTES

### COUCHE 0 — MONDE NARRATIF

| Module | Fichier | Fonction | Entrée | Sortie |
|--------|---------|----------|--------|--------|
| World Model | *(Phase V — à construire)* | Stocker l'état complet de l'univers narratif | Deltas certifiés | État courant du monde |
| Canon Lock | *(Phase V — gate post-gen)* | REJECT si la prose viole un fait canonique | prose + canon_facts | PASS / REJECT + reason |
| Debt Ledger | *(Phase V — à construire)* | Tenir la liste des dettes narratives | StateDelta | DebtEntry[] updaté |
| Arc Tracker | *(Phase V — à construire)* | Suivre la position de chaque personnage | StateDelta | ArcState[] updaté |
| Persona Store | *(Phase V — à construire)* | Psychologie profonde des personnages | Faits scellés | PersonaProfile[] |

### COUCHE 1 — PRÉPARATION

| Module | Fichier | Fonction | Entrée | Sortie |
|--------|---------|----------|--------|--------|
| Relevance Filter | *(Phase V — à construire)* | Sélectionner les hot elements pertinents pour la scène | World Model + scène cible | HotElement[] (max 10) |
| CDE.distillBrief | `src/cde/distiller.ts` | Comprimer hot elements en brief DRAMATIQUE ≤ 150t | CDEInput | SceneBrief (langage de scène, pas de backend) |
| ForgePacketAssembler | `src/input/forge-packet-assembler.ts` | Assembler le contrat de génération complet | GenesisPlan + Scene + Style | ForgePacket (hashé) |
| ConstraintCompiler | `src/constraints/constraint-compiler.ts` | Compiler les contraintes physiques/stylistiques | ForgePacket | Section prompt ≤ 800t |
| PromptAssembler v2 | `src/input/prompt-assembler-v2.ts` | Construire le prompt final pour le Scribe | ForgePacket + SceneBrief | Prompt complet |
| Pre-Write Validator | `src/input/pre-write-validator.ts` | Valider le ForgePacket — FAIL si incomplet | ForgePacket | PASS / FAIL |
| Pre-Write Simulator | `src/input/pre-write-simulator.ts` | Prédire les obstacles avant génération | ForgePacket | SceneBattlePlan |

### COUCHE 2 — GÉNÉRATION (SCRIBE)

| Module | Rôle | Reçoit | Produit |
|--------|------|--------|---------|
| LLM (Anthropic) | Générer la meilleure prose possible | Prompt OMEGA (cadre dramatique + style) | Prose brute |

**LE SCRIBE NE REÇOIT PAS :** liste de dettes, identifiants de canon, instructions de vérification, rappels de continuité, demandes de cohérence.

**LE SCRIBE REÇOIT :** tension dramatique active, objectif de scène, identité stylistique, contexte sensoriel, contraintes de plume.

### COUCHE 3 — ÉVALUATION POST-GÉNÉRATION

| Module | Fichier | Fonction | Entrée | Sortie |
|--------|---------|----------|--------|--------|
| S-Oracle V2 | `src/oracle/s-oracle-v2.ts` | Mesure composite (ECC/RCI/SII/IFI/AAI) | Prose + ForgePacket | MacroSScore [0-100] |
| ECC | `src/oracle/axes/emotion-coherence.ts` | Cohérence émotionnelle + complexité | Prose + trajectoire 14D | Score ECC |
| RCI | `src/oracle/axes/rhythm.ts` + sous-axes | Rythme + cadence + identité | Prose | Score RCI |
| SII | `src/oracle/axes/metaphor-novelty.ts` + sous-axes | Innovation stylistique | Prose | Score SII |
| IFI | `src/oracle/axes/interiority.ts` + autres | Immersion + fidélité | Prose | Score IFI |
| AAI | `src/oracle/axes/authenticity.ts` + autres | Authenticité + art | Prose | Score AAI |
| Delta Computer | `src/delta/delta-computer.ts` | Mesure écart prose vs contrat (6D) | Prose + ForgePacket | DeltaReport |
| Physics Audit | `src/oracle/physics-audit.ts` | Conformité trajectoire émotionnelle | Prose + ForgeEmotionBrief | PhysicsAuditResult |
| CDE.extractDelta | `src/cde/delta-extractor.ts` | Extraire ce qui a changé dans la prose | Prose + context | StateDelta |
| Canon Lock Gate | *(Phase V — à construire)* | REJECT si violation canonique | StateDelta + CanonFacts | PASS / REJECT |
| Authenticity Gate | `src/genius/as-gatekeeper.ts` | Filtre IA-smell — kill switch | Prose | δ_AS (0 ou 1) |
| Genius Engine | `src/genius/genius-metrics.ts` + scorers | D×S×I×R×V — excellence littéraire | Prose | GeniusScore |

### COUCHE 4 — DÉCISION & CORRECTION

| Module | Fichier | Fonction | Entrée | Sortie |
|--------|---------|----------|--------|--------|
| Polish Engine | `src/validation/phase-u/polish-engine.ts` | Chirurgie ciblée SII/RCI si ∈ [89, 92) | Prose + MacroSScore | Prose polie |
| Sovereign Loop | `src/pitch/sovereign-loop.ts` | Boucle pitch→patch→rescore (max 2 passes) | Prose + ForgePacket | SovereignLoopResult |
| Triple Pitch Engine | `src/pitch/triple-pitch-engine.ts` | 3 stratégies de correction | DeltaReport | CorrectionPitch[3] |
| Pitch Oracle | `src/pitch/pitch-oracle.ts` | Sélectionner le meilleur pitch | CorrectionPitch[3] | Pitch sélectionné |
| Patch Engine | `src/pitch/patch-engine.ts` | Appliquer le pitch → nouvelle prose | Prose + Pitch | Prose corrigée |
| Top-K Selection | `src/validation/phase-u/top-k-selection.ts` | Sélectionner le meilleur candidat K=8 | K SovereignForgeResults | KSelectionReport |
| Phase U Exit Validator | `src/validation/phase-u/phase-u-exit-validator.ts` | SEAL_ATOMIC / SAGA_READY / REJECT | MacroSScore + floors | Verdict final |

### COUCHE 5 — CERTIFICATION & MÉMOIRE

| Module | Fichier | Fonction | Entrée | Sortie |
|--------|---------|----------|--------|--------|
| ProofPack V3 | `src/proofpack/proofpack-v3.ts` | Archiver tous les artefacts hashés | Run complet | ProofPack (SHA256) |
| World Model Update | *(Phase V — à construire)* | Mettre à jour le canon avec delta certifié | StateDelta certifié | World Model v+1 |
| Seal Lock | `src/proofpack/seal-lock.ts` | Verrouiller une phase certifiée | ProofPack | Sceau cryptographique |

---

## FORMULES DE SCORING

### Score composite (Phase U actuel)
```
MacroSScore = f(ECC × 0.33, RCI × 0.27, SII × 0.20, IFI × 0.12, AAI × 0.08)
composite ∈ [0, 100]

SEAL_ATOMIC = composite ≥ 93.0 AND min_axis ≥ 85.0
SAGA_READY  = composite ≥ 92.0 AND min_axis ≥ 85.0
```

### Score OMEGA complet (Genius Engine — à activer)
```
OMEGA_SCORE = M × G × δ_AS

M = (ECC × RCI × SII × IFI × AAI) ^ (1/5)   [Émotion]
G = (D × S × I × R × V) ^ (1/5)               [Génie]
δ_AS = 1 si AS ≥ 85, sinon 0 (kill switch)    [Authenticité]
```

### Genius Engine — 5 dimensions
```
D = densité narrative (compression_proxy, sentence_utility, verbiage_penalty)
S = surprise (TTR, entropie Shannon, semantic_shift, anti_clustering)
I = inévitabilité (logique causale, setup→payoff, non-contradiction)
R = résonance (impact mémoire, écho, universal_truth_score)
V = voix (singularité, non-imitable, signature émergente)
```

---

## SÉPARATION DES RESPONSABILITÉS — TABLE DE VÉRITÉ

| Responsabilité | Module | Couche | OMEGA ou Scribe ? |
|----------------|--------|--------|------------------|
| Générer la prose | LLM | 2 | **SCRIBE** |
| Tenir la bible canon | Canon Lock + World Model | 0 | **OMEGA** |
| Vérifier la cohérence | Canon Lock Gate | 3 | **OMEGA** |
| Suivre les arcs | Arc Tracker | 0 | **OMEGA** |
| Gérer les dettes | Debt Ledger | 0 | **OMEGA** |
| Mesurer la qualité prose | S-Oracle | 3 | **OMEGA** |
| Mesurer l'excellence | Genius Engine | 3 | **OMEGA** |
| Décider SEAL/REJECT | Phase U Exit Validator | 4 | **OMEGA** |
| Corriger la prose | Polish Engine / Loop | 4 | **OMEGA** |
| Archiver les preuves | ProofPack | 5 | **OMEGA** |
| Mettre à jour le canon | World Model Update | 5 | **OMEGA** |
| Comprimer le contexte | CDE.distillBrief | 1 | **OMEGA** |
| Extraire les changements | CDE.extractDelta | 3 | **OMEGA** |

**RÉSUMÉ** : Le Scribe fait UNE chose. OMEGA fait tout le reste.

---

## DONNÉES PAR MODULE

### CDEInput (entrée distillation)
```typescript
{
  hot_elements:    HotElement[]    // max 10, priority 1-10
  canon_facts:     CanonFact[]     // faits immuables
  open_debts:      DebtEntry[]     // dettes ouvertes
  arc_states:      ArcState[]      // positions d'arc
  scene_objective: string          // objectif dramatique
}
```

### SceneBrief (sortie distillation — LE CONTENU DOIT ÊTRE DRAMATIQUE)
```typescript
{
  // CORRECT : langage de scène
  must_remain_true:  "la promesse non tenue pèse sur chaque geste"
  in_tension:        "Pierre attend un signe, Marie retarde l'aveu"
  must_move:         "la tension doit se matérialiser en acte concret"
  must_not_break:    "aucun geste ne résout le conflit — scène ouverte"
  token_estimate:    ≤ 150
  input_hash:        SHA256 (déterminisme)

  // INTERDIT : langage de backend
  // ❌ "DEBT[debt-01]: Marie a promis..."
  // ❌ "vérifier que le canon cf-marie-medecin est respecté"
}
```

### ForgePacket (contrat de génération)
- Trajectoire émotionnelle 14D complète
- Contrat émotionnel par quartile
- Beats narratifs
- SubtextLayer
- StyleProfile + KillLists
- ForgeContinuity (résumé humain, états personnages, fils ouverts)
- Seeds + déterminisme

### StateDelta (extraction post-génération)
```typescript
{
  new_facts:       string[]           // faits nouveaux établis
  modified_facts:  {id, new_value}[]  // faits modifiés
  debts_opened:    {content, evidence}[]  // nouvelles dettes
  debts_resolved:  {id, evidence}[]       // dettes soldées
  arc_movements:   {character_id, movement}[]
  drift_flags:     string[]           // incohérences détectées
  prose_hash:      SHA256
}
```

---

## CE QUI EXISTE DANS LE CODE VS CE QUI RESTE À CONSTRUIRE

### ✅ EXISTANT ET OPÉRATIONNEL
- sovereign-engine complet (Phase U — 1564 tests)
- S-Oracle V2, Genius Engine, Polish Engine
- CDE.distillBrief(), CDE.extractDelta() (V-INIT)
- CDE pipeline + scene-chain (V-PROTO)
- Tous les axes de scoring (18 axes)
- ProofPack V3, Seal Lock, gates

### 🔴 MANQUANT — PHASE V (À CONSTRUIRE)
- World Model (stockage persistant de l'univers)
- Canon Lock Gate (post-gen REJECT si violation)
- Relevance Filter (sélection hot elements depuis World Model)
- Debt Ledger (gestion des dettes)
- Arc Tracker (suivi des arcs)
- Persona Store (psychologie des personnages)
- World Model Update (sync après scène certifiée)

### ⚠️ CDE À RECADRER (Brief trop "juridique")
- `distillBrief()` : structure valide, CONTENU à reformater en langage dramatique
- `scene-chain.ts` : propagateDelta correct, mais le brief propagé doit rester dramatique

---

**FIN DU DOCUMENT OMEGA_CONCEPTION_PLAN_v1.0**
*2026-03-14 — Architecte Suprême : Francky*
