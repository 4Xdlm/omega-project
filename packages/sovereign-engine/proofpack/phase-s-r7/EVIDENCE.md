# EVIDENCE — phase-s-r7 Seal

**Seal ID** : `phase-s-r7`
**Sealed** : 2026-04-20
**Supersedes** : `phase-s-sealed` (V1, 2026-04-13, commit `0c3cbc48`, reste immuable)
**Branch** : `phase-s-r7-integration` (fork depuis `phase-r-dispatcher-v33` @ `10d9fbcf`)
**Standard** : NASA-Grade L4 / DO-178C Level A

---

## 1. Scope

Ce sceau capture l'état du pipeline sovereign-engine après intégration atomique
de 3 modifications fonctionnelles sur `src/duel/duel-engine.ts` :

- **P8-FIX** — lazy env var read pour `OMEGA_DUEL_RUNS` (fix ESM hoisting bug)
- **P8-bis** — runtime mode quarantine via `OMEGA_DUEL_EXCLUDE_MODES` (sealed config intact)
- **V2-B** — propagation `emotion_contract` à `generateChunkedDraft` (adaptive chunking K2 duel)

Les 11 autres fichiers scellés (`src/delta/*`, `src/pitch/*`, `src/oracle/s-oracle-v2.ts`,
`src/polish/*`, `src/pipeline/sovereign-pipeline.ts`) sont **inchangés** par rapport
à `phase-s-sealed` V1. Hashes identiques ligne pour ligne sauf ligne 8 (duel-engine.ts).

---

## 2. Chain de dérivation

```
10d9fbcf (phase-r-dispatcher-v33, NCR_M2 closure) — parent
   └─ 5d2d51ea — feat(duel): P8-FIX lazy env var read for OMEGA_DUEL_RUNS (15i/10d)
      └─ 66fc183e — feat(duel): P8-bis mode quarantine via OMEGA_DUEL_EXCLUDE_MODES (11i/1d)
         └─ 9a2a6f97 — feat(duel): V2-B propagate emotion_contract to K2 chunked draft (4i/0d)
            └─ [O.5] — feat(proofpack): phase-s-r7 seal + CURRENT_REF + NCR closures
```

**Diff consolidé vs `10d9fbcf`** : 1 fichier modifié, 30i/11d. Somme stricte des 3 commits (zéro overlap vérifié).

---

## 3. Hash final duel-engine.ts

```
2c29ce57a9b548102b193dd828f4aa5908d7f866f607495cd5bd2ffc968600a1  src/duel/duel-engine.ts
```

Calculé via `Get-FileHash -Algorithm SHA256` sur working tree post-V2-B.
Zéro NUL byte vérifié.

---

## 4. Mécanismes causaux des 3 commits

### 4.1 P8-FIX — lazy env var read

**Bug d'origine** : `const DUEL_RUNS = parseInt(process.env.OMEGA_DUEL_RUNS ?? '2')`
lu au module-scope → ESM hoisting capture `undefined` quand l'env var est set par
le script appelant AVANT l'import. Résultat : `DUEL_RUNS=4` (fallback) au lieu de 7.

**Fix** : remplacement par fonction `getDuelRuns()` appelée au runtime dans
`runDuel()`. L'env var est lue au moment de l'appel, plus au chargement du module.

**Preuve** : bench NCR_M2 A.1 15/15 runs OK, 0 timeout (baseline v3 : 11/12 timeouts).

### 4.2 P8-bis — mode quarantine

**Besoin** : neutraliser temporairement `experimental_signature` sans modifier
`SOVEREIGN_CONFIG.DRAFT_MODES` (scellé via constants).

**Mécanisme** : env var `OMEGA_DUEL_EXCLUDE_MODES` (comma-separated), filtrage
runtime de `SOVEREIGN_CONFIG.DRAFT_MODES` AVANT la boucle de génération.
Config scellée **intacte**. Log actif : `[DUEL] Mode quarantine active: ...`.

**Invariant** : sans env var set → comportement identique à baseline (zéro régression).

### 4.3 V2-B — emotion_contract propagation

**Besoin** : chaque candidat duel (K2 chunked branch) doit pouvoir utiliser le plan
adaptatif quand `OMEGA_ADAPTIVE_CHUNKING='shadow'|'1'`. Sans propagation →
`generateChunkedDraft` tombe silencieusement en fallback legacy.

**Mécanisme** : ajout du champ `emotionContract: packet.emotion_contract` dans
l'objet options passé à `generateChunkedDraft` (ligne ~152). Modification
**additive et non-breaking** pour tous les callers existants.

---

## 5. Tests baseline

```
Test Files  231 total (230 passed, 1 expected FAIL pre-O.5)
Tests       2411 total (2410 passed, 1 expected FAIL pre-O.5)
```

**T08 INV-VAL-05** : FAIL attendu PRE-O.5 (working tree hash `2c29ce57...` ≠
phase-s-sealed hash `3bb2c6ff...`). Mis à jour en O.5 pour lire `CURRENT_REF.md`
→ baseline post-O.5 cible **2411/2411 PASS**.

---

## 6. Merge strategy — C (PARALLÈLE)

Conformément à `NCR_FROZEN_BREACH_DUEL_ENGINE_2026-04-20.md §8` :

- `phase-s-sealed/` : **IMMUABLE** (V1, 2026-04-13). Aucune modification directe.
- `phase-s-r7/` : nouveau répertoire parallèle (ce sceau).
- `CURRENT_REF.md` : pointeur top-level, source unique de vérité courante.

Règle dure : toute future itération (R8, V2, etc.) crée un nouveau `phase-s-rX/`
+ mise à jour `CURRENT_REF.md`. Jamais de remplacement, jamais d'écrasement.

---

## 7. Artefacts de ce sceau

```
packages/sovereign-engine/proofpack/phase-s-r7/
├── HASHES.sha256      — 12 fichiers, ligne 8 actualisée
├── EVIDENCE.md        — ce document
└── MANIFEST.json      — metadata minimal (6 champs)
packages/sovereign-engine/proofpack/CURRENT_REF.md  — active=phase-s-r7
```

---

## 8. NCRs closures (dans le même commit O.5)

- `nexus/proof/NCR_FROZEN_BREACH_DUEL_ENGINE_2026-04-20.md` — status **CLOSED-FIX_VALIDATED**
- `nexus/proof/NCR_SEAL_V2B_DUEL_ENGINE.md` — status **CLOSED-SUPERSEDED** (par merge strategy C)

---

## 9. Traçabilité

- Consensus 3-IA : Claude + Gemini + ChatGPT (unanimité sur Option α + merge C + MANIFEST minimal)
- Validation Francky : arbitrages relayés 2026-04-20
- Tag : `phase-s-r7-sealed-2026-04-20`
- V1_SEAL_CERTIFICATE (2026-04-13) : conservé intact, non impacté (V1 reste accessible
  via `phase-s-sealed/` + commit `0c3cbc48`)
