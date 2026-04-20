# NCR-FROZEN-BREACH-DUEL-ENGINE-2026-04-20

**Status**: CLOSED-FIX_VALIDATED
**Severity**: HIGH
**Opened**: 2026-04-20
**Opened by**: Claude (sur demande Francky, après revue convergente 3-IA)
**Scope**: `packages/sovereign-engine/src/duel/duel-engine.ts`
**V1_SEAL_CERTIFICATE**: VALID (HEAD `10d9fbcf` intact, Scenario Ω1 prouvé)
**Related**: NCR_M2 Phase 1 A.1 (closure `10d9fbcf`), V1_SEAL_CERTIFICATE, phase-s-sealed proofpack

---

## 1. Issue

Trois modifications fonctionnelles ont été appliquées au working tree de
`duel-engine.ts` sans création préalable d'une nouvelle phase de scellé
(`phase-s-r7/`) :

1. **P8-FIX** — lazy env var read (fonction `getDuelRuns()` remplaçant
   `const DUEL_RUNS` module-scope, fix du bug ESM hoisting qui donnait
   `DUEL_RUNS=4` au lieu de 7 quand l'env var était set par le script appelant)
2. **P8-bis** — runtime mode quarantine via `OMEGA_DUEL_EXCLUDE_MODES`
   (filtrage non-destructif de `SOVEREIGN_CONFIG.DRAFT_MODES`)
3. **V2-B** — propagation `emotionContract` à `generateChunkedDraft`
   (chaque candidat duel peut utiliser le plan adaptatif quand
   `OMEGA_ADAPTIVE_CHUNKING='shadow'|'1'`)

Le fichier est listé dans `proofpack/phase-s-sealed/HASHES.sha256` sous le hash
`3BB2C6FFA7C0F1224ADE976AEB0E318E5484FE9E91527172A1AB72A65AA86463`.

**Détection** : T08 INV-VAL-05 test FAIL pendant T7 gate consolidation drift.
Working tree hash `4F11EA54F5E3BEA9603432A545F4F0B2294DD3987B77CE2156E1823F194B668A`,
attendu `3BB2C6FF...`.

---

## 2. Scope (Bloc K1 Scenario Ω1)

| Élément | Hash | État |
|---|---|---|
| HEAD `10d9fbcf` `duel-engine.ts` (raw via `cmd /c`) | `3BB2C6FF...A86463` | == sealed ✓ |
| Working tree pré-Bloc J | `4F11EA54...F194B668A` | drift 3 fonctionnalités |
| Sealed `HASHES.sha256` entry | `3BB2C6FF...A86463` | référence |
| 11 autres fichiers sealed | HEAD raw == sealed | artefact BOM Bloc I v2 ignoré |

**Breach scope confirmé** : 1 fichier, working tree uniquement. HEAD intact.
V1_SEAL_CERTIFICATE conservé.

---

## 3. Méthode invalidée — Bloc I v2

Le diagnostic 12/12 HEAD drift produit par le Bloc I v2 **est invalide car
pollué par la BOM UTF-8 injectée par `Out-File -Encoding UTF8` sous
PowerShell 5.x** (bytes `EF BB BF` préfixés, hash calculé sur le fichier
temporaire diffère du blob Git raw).

**Seule la vérification raw via `cmd /c "git show ... > %TEMP%\file"` fait
foi pour les hashes HEAD** (redirection shell Windows native, bypass de
l'encodage PowerShell).

Le Bloc K1, qui utilise ce mécanisme `cmd /c`, a établi la vérité référente :
HEAD intact sur les 12 fichiers sealed, drift réel uniquement sur
`duel-engine.ts` working tree.

Toute future vérification de hash HEAD dans l'écosystème OMEGA **doit**
utiliser `cmd /c` ou `git hash-object --path=...`, jamais `Out-File -Encoding UTF8`.

---

## 4. Impact traçabilité bench

**Les résultats NCR_M2 Phase 1 A.1 ne sont pas invalidés scientifiquement
mais leur traçabilité seal-level est dégradée car obtenus sur working tree
non scellé (hash `4F11EA54...`).**

Distinction à maintenir :

- **Validité empirique** : PRÉSERVÉE. Les 15/15 runs OK, 0 timeout, G1..G5 PASS
  sont des faits empiriques reproductibles en ré-appliquant P8-FIX+P8-bis+V2-B.
- **Validité de traçabilité** : DÉGRADÉE. Le bench n'est pas strictement
  reproductible depuis HEAD `10d9fbcf` nu (HEAD a `3BB2C6FF`, bench ran sur
  `4F11EA54`). Un auditeur qui clone `10d9fbcf` et lance le bench obtient
  des résultats potentiellement différents sans les 3 diffs appliqués.

**Mitigation** : Option α produit un nouveau commit scellé reproductible,
restaurant la traçabilité full. Les benchs récents (NCR_M2 A.1,
NCR_GAMMA_INERT si applicable) doivent être re-tagués comme "pre-phase-s-r7"
dans le log qualité pour traçabilité historique.

---

## 5. Options

### Option α — Extraction chirurgicale + nouveau scellé [ADOPTÉE]

1. Branche `phase-s-r7-integration` depuis `10d9fbcf`
2. Reset disque `duel-engine.ts` → `3BB2C6FF...` (HEAD state)
3. Commit 1 : P8-FIX `feat(duel): lazy env var read` + test DUEL_RUNS=7 honored
4. Commit 2 : P8-bis `feat(duel): mode quarantine` + test `OMEGA_DUEL_EXCLUDE_MODES`
5. Commit 3 : V2-B `feat(duel): emotionContract propagation` + test adaptive chunking E2E
6. `npm test` baseline 2411 PASS maintenu à chaque commit
7. Génération `proofpack/phase-s-r7/HASHES.sha256` + `EVIDENCE.md` + `MANIFEST.json`
8. Merge strategy retenue : **C — PARALLÈLE + CURRENT_REF.md** (cf. Section 8)

**Pros** : atomicité complète, traçabilité par commit, tests séparés par
feature, V1 conservé intact en parallèle, bisect possible sur régressions futures.
**Cons** : ~1h effort, discipline tests entre chaque commit.

### Option β — Nouveau scellé in-place [TOLÉRÉ]

Accepter l'état disque actuel, créer `phase-s-r7/` avec hash `4F11EA54...`
directement, committer les 3 features dans un seul commit.

**Pros** : rapide (~15 min).
**Cons** : 3 features fusionnées en un seul hash, aucune traçabilité atomique,
bisect impossible en cas de régression future, viol partiel
"MINIMIZE IT" D-03 (DO-178C), perte de la discipline CI sur chaque feature
isolée.

### Option γ — Reset disque sans extraction [REJETÉ]

Reset `duel-engine.ts` → HEAD state, perdre P8-FIX/P8-bis/V2-B,
repartir de zéro.

**Pros** : alignement immédiat HEAD ↔ disque ↔ sealed.
**Cons** : perte de travail validé (bench NCR_M2 A.1), régression sur
DUEL_RUNS hoisting bug, régression sur mode quarantine testée, V2-B
adaptive chunking perdu.

---

## 6. Decision rule

```
α RECOMMANDÉ   — standard OMEGA, atomicité + traçabilité + bisect
β TOLÉRÉ       — acceptable en urgence si bench V4 bloqué prod, sinon éviter
γ REJETÉ       — perte de travail empiriquement validé inacceptable
```

Hiérarchie d'arbitrage : tout consensus 3-IA doit justifier explicitement
tout écart par rapport à α. β accepté uniquement avec preuve de contrainte
temporelle critique. γ interdit sauf invalidation scientifique ultérieure
des 3 features.

**Arbitrage 3-IA 2026-04-20** : α ADOPTÉE (Claude + Gemini + ChatGPT).

---

## 7. Interdictions immédiates (jusqu'à fin du Bloc O, scellement phase-s-r7)

```
✗ pas de consolidation drift (les 16 fichiers restent unstaged)
✗ pas de nouveau seal (phase-s-r7/ créé uniquement en Bloc O)
✗ pas de commit sur duel-engine.ts en dehors de la branche phase-s-r7-integration
✗ pas de bench V4
✗ pas de git add sur duel-engine.ts en dehors du flow α
✗ pas de re-run bench NCR_M2 A.1 (pollution traçabilité)
✗ pas de bench expérimental réutilisant duel-engine.ts drifté
```

Autorisés pendant la phase d'extraction chirurgicale :
```
✓ analyses read-only (git log, diff, show, grep)
✓ rédaction documentaire (NCR, ADR, reports, memos)
✓ consultation 3-IA (Gemini, ChatGPT)
✓ tests unitaires isolés sur la branche phase-s-r7-integration
```

---

## 8. Merge strategy — PARALLÈLE + CURRENT_REF.md (Option C)

**Arbitrage Francky + revue 3-IA 2026-04-20 : Option C retenue.**

Structure proofpack après scellement `phase-s-r7/` :

```
packages/sovereign-engine/proofpack/
├── phase-s-sealed/          # V1.0 — IMMUABLE, ne jamais modifier
│   ├── HASHES.sha256
│   ├── EVIDENCE.md
│   └── MANIFEST.json
├── phase-s-r7/              # V1.1 — nouvelle prod (P8-FIX+P8-bis+V2-B)
│   ├── HASHES.sha256
│   ├── EVIDENCE.md
│   └── MANIFEST.json
└── CURRENT_REF.md           # pointeur top-level, source unique de vérité courante
```

**Contenu `CURRENT_REF.md`** :

```markdown
# Current Proofpack Reference

**Active seal** : phase-s-r7/ (V1.1)
**Updated** : 2026-04-20
**Supersedes** : phase-s-sealed/ (V1.0, reste immuable en archive)

## Règle
Tout test d'invariant INV-VAL-*, tout bench traçable, tout audit scellé
doit utiliser `phase-s-r7/` comme source de vérité courante.
Le précédent `phase-s-sealed/` reste accessible pour audit historique
mais n'est plus la référence active.

## Historique
- phase-s-sealed/ : scellé 2026-04-13, V1 OMEGA, commit 0c3cbc48
- phase-s-r7/     : scellé [date Bloc O], V1.1 OMEGA, commit [hash Bloc O]
```

**Règles dures** :

1. `phase-s-sealed/` reste immuable à perpétuité. Aucune modification directe, aucun renommage, aucune suppression.
2. `phase-s-r7/` devient la référence courante dès Bloc O complet.
3. `CURRENT_REF.md` est le point d'entrée unique pour les scripts de validation / tests d'invariants / audits externes.
4. Toute future itération (R8, V2, etc.) crée un nouveau répertoire `phase-s-rX/` + mise à jour `CURRENT_REF.md`. Jamais de remplacement, jamais d'écrasement.
5. `HASHES.sha256` le plus récent est référencé par `CURRENT_REF.md` (actuellement `phase-s-r7/HASHES.sha256`).

**Impact test INV-VAL-05** : `validation-runner.test.ts` T08 devra être mis à jour Bloc O pour lire `CURRENT_REF.md` puis charger le `HASHES.sha256` pointé, au lieu du chemin dur `phase-s-sealed/HASHES.sha256`. Alternative : garder T08 sur phase-s-sealed (test de non-régression V1) + ajouter T08b sur phase-s-r7 (test de l'état courant).

---

## 9. Decision

**Status** : ADOPTÉE (Claude + Gemini + ChatGPT + Francky, 2026-04-20).

Décisions actées :
1. Option α (extraction chirurgicale 3 commits atomiques)
2. Merge strategy C (PARALLÈLE + CURRENT_REF.md)
3. Ordre commits : P8-FIX → P8-bis → V2-B (sauf dépendance bloquante découverte en Bloc N)
4. Réassignation traçabilité NCR_M2 A.1 : tag "pre-phase-s-r7" à ajouter dans `outputs/log_quality.md` en clôture Bloc O

---

## 10. Attachments

- `outputs/duel-engine_P8FIX_preserved_20260420.ts.bak` — backup working copy,
  hash `4F11EA54F5E3BEA9603432A545F4F0B2294DD3987B77CE2156E1823F194B668A`
- Bloc K1 output (HEAD raw via `cmd /c`, Scenario Ω1 confirmé) — session log
- `outputs/consolidation_t7_test_20260420_072615.log` — T08 FAIL original
- `outputs/seal_breach_inventory_20260420_073337.csv` — Bloc I v2 output
  (HEAD column pollué par BOM, Disk column seule fiable, **référence d'échec
  méthodologique**)

---

## 11. Traçabilité

- Session Claude (continuation post-compaction)
- Validations :
  - Gemini : GO absolu Bloc J, validation chemin 2 workspace, adoption α + merge REMPLACEMENT initialement
  - ChatGPT : GO Bloc J + 4 amendements A/B/C/D intégrés v1, 3 micro-corrections intégrées v2, adoption α + merge PARALLÈLE
  - Francky : arbitrage final α + merge C (PARALLÈLE + CURRENT_REF.md)
- Bloc J exécuté : backup + reset HEAD, invariants préservés (disque inchangé, staging vide, hash backup `4F11EA54...` vérifié match)
- NCR draft v1 : `outputs/NCR_FROZEN_BREACH_DUEL_ENGINE_2026-04-20_v1.md`
- NCR draft v2 (canonique pour propagation) : ce document

---

**Ce NCR v2 est prêt pour propagation vers `nexus/proof/NCR_FROZEN_BREACH_DUEL_ENGINE_2026-04-20.md` (sans suffixe `_v1`/`_v2`).**

---

## 12. Closure — 2026-04-20

**Status** : OPEN → **CLOSED-FIX_VALIDATED**
**Closed by** : Claude (exécution Bloc N + Bloc O, validation Francky)
**Consensus** : unanimité 3-IA (Claude + Gemini + ChatGPT) sur α + merge C + MANIFEST minimal

### 12.1 Commits atomiques livrés (branche `phase-s-r7-integration`)

| Commit | Description | Stat |
|---|---|---|
| `5d2d51ea` | feat(duel): P8-FIX lazy env var read for OMEGA_DUEL_RUNS | 15i/10d |
| `66fc183e` | feat(duel): P8-bis mode quarantine via OMEGA_DUEL_EXCLUDE_MODES | 11i/1d |
| `9a2a6f97` | feat(duel): V2-B propagate emotion_contract to K2 chunked draft | 4i/0d |

**Diff consolidé vs parent `10d9fbcf`** : 1 fichier modifié, 30i/11d (somme exacte des 3 commits, zéro overlap vérifié).
**Hash final `duel-engine.ts`** : `2c29ce57a9b548102b193dd828f4aa5908d7f866f607495cd5bd2ffc968600a1`
**Zéro NUL byte** vérifié sur le working tree.

### 12.2 Seal livré (Bloc O)

Merge strategy C (PARALLÈLE + CURRENT_REF.md) appliquée conformément à §8 :

```
proofpack/
├── phase-s-sealed/         # V1 — IMMUABLE (intact, non modifié)
├── phase-s-r7/             # V1.1 — nouveau seal (HASHES + EVIDENCE + MANIFEST)
└── CURRENT_REF.md          # pointeur top-level, active=phase-s-r7
```

**Tag** : `phase-s-r7-sealed-2026-04-20`

### 12.3 Test INV-VAL-05 (T08)

Arbitrage Option α adopté : `validation-runner.test.ts:131` mis à jour pour lire
`CURRENT_REF.md` et résoudre le sceau actif dynamiquement.

**Baseline tests cible** : 2411/2411 PASS, T08 PASS sur phase-s-r7.
**V1 non-régression** : `phase-s-sealed/` intact, accessible via commit `0c3cbc48` + tag `phase-s-sealed`.

### 12.4 Traçabilité benchs historiques

Les benchs NCR_M2 Phase 1 A.1 (2026-04-19 nuit) sont tagués "pre-phase-s-r7" dans
`outputs/log_quality.md` pour traçabilité historique. Empirie préservée, traçabilité
seal-level dégradée → restaurée via reproductibilité sur `phase-s-r7`.

### 12.5 Invariants préservés

- V1_SEAL_CERTIFICATE (2026-04-13, commit `0c3cbc48`) : **intact**
- Scenario Ω1 (HEAD `10d9fbcf` = phase-s-sealed hashes sauf duel-engine.ts breach) : **résolu**
- INV-VAL-05 : **opérationnel** sur sceau actif via CURRENT_REF.md
- Aucun FROZEN module touché hors duel-engine.ts (scope déclaré)
- Aucune modification `src/` hors duel-engine.ts (vérifié via diff consolidé)

---

**NCR CLOSED-FIX_VALIDATED**. Aucune action résiduelle.
