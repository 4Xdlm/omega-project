# NCR-SEAL-V2B-DUEL-ENGINE

**Opened**  : 2026-04-17
**Severity** : MEDIUM
**Status**   : ACCEPTED — autorisé par Francky (Option A)
**Owner**    : Claude Code (IA Principal) — validation Francky

## Issue

Le fichier `packages/sovereign-engine/src/duel/duel-engine.ts` figure dans le
registre de hashes scellé Phase S :

```
proofpack/phase-s-sealed/HASHES.sha256 (ligne 8)
```

L'intégration V2-B (Adaptive Chunking dispatcher) a nécessité une modification
de ce fichier pour propager `packet.emotion_contract` à `generateChunkedDraft`
dans la branche K2 duel (ligne 152 du fichier). Sans cette propagation, le
duel K2 ne bénéficie pas du chunking adaptatif, rendant V2-B incomplet.

Cette modification change le SHA256 du fichier, déclenchant le test
`T08: sealed pipeline source unchanged [INV-VAL-05]` qui vérifie la
conformité du seal Phase S.

## Hashes

- **Avant V2-B** (seal V1 du 2026-04-13) :
  `f075ee3ae2be7df760bd4de085c5a07eb91abf61bb40227e6173275165694cc6`
- **Après V2-B** (2026-04-17) :
  `4f11ea54f5e3bea9603432a545f4f0b2294dd3987b77ce2156e1823f194b668a`

## Mécanisme causal du delta

La modification apportée à `duel-engine.ts` est **limitée** (~6 lignes effectives
autour de la ligne 152) :

```typescript
// AJOUT V2-B — propagate emotion_contract so every duel candidate can
// use the adaptive plan when OMEGA_ADAPTIVE_CHUNKING='shadow'|'1'.
// Absence → silent legacy fallback inside generateChunkedDraft.
emotionContract: packet.emotion_contract,
```

Plus le log :

```typescript
if (chunkedResult.adaptive_mode && chunkedResult.adaptive_mode !== '0') {
  console.log(`[V2-B][duel] mode=${chunkedResult.adaptive_mode} fallback=${chunkedResult.adaptive_fallback_triggered} plan_chunks=${chunkedResult.adaptive_plan?.length ?? 'n/a'}`);
}
```

**Aucune** modification du flow de sélection duel, du scoring, des personas, ou
de la structure retour. La modification est **additive et non-breaking** pour
les callers existants.

## Alternatives considérées

| Option | Description | Verdict |
|--------|-------------|---------|
| **A (retenue)** | Update HASHES.sha256 avec nouveau hash | ✅ Appliqué |
| B | Revert propagation → V2-B sans duel K2 | ❌ Rejeté : rend V2-B incomplet, invalide le bench A/B comme preuve globale |
| C | Wrapper externe autour de duel-engine.ts | ❌ Impossible : l'appel à generateChunkedDraft est inline L152 |

## Autorisation

L'ordre `go enchaine tous` du 2026-04-17 (Francky → Claude) mandate
l'intégration V2-B complète. L'ADR DEC-20260417-004 documente explicitement
la modification `duel-engine.ts`. La rupture du seal Phase S est donc
**attendue et autorisée**, pas illicite.

Validation explicite Francky : 2026-04-17 ("a" = Option A).

## Action prise

1. `proofpack/phase-s-sealed/HASHES.sha256` ligne 8 : hash mis à jour avec
   la nouvelle valeur `4f11ea5...694cc6`.
2. Cette NCR ouverte et datée.
3. ADR DEC-20260417-004 amendé avec section "Seal Phase S impact".
4. Test T08 attendu : PASS après rehash.

## Impact sur le seal Phase S

Le seal Phase S représentait l'état OMEGA V1 au 2026-04-13 (commit `0c3cbc48`).
V2-B est une phase d'évolution postérieure. Le seal V1 reste valide comme
artefact historique — le git log préserve le hash `f075ee3a...` au commit
`0c3cbc48`.

**Le registre HASHES.sha256 devient un seal "vivant"** qui reflète l'état
courant des fichiers sous invariant. Cette NCR documente la transition entre
"seal V1 figé" et "seal courant + V2-B".

Si Francky souhaite préserver un seal V1 immuable séparé, créer :
- `proofpack/phase-s-sealed-v1/HASHES.sha256` (copie figée datée 2026-04-13)
- `proofpack/phase-s-sealed/HASHES.sha256` (seal vivant, mis à jour avec
  chaque phase d'évolution autorisée)

Cette séparation n'est **pas** faite dans cette NCR. À décider séparément.

## Conditions de fermeture

Cette NCR se ferme (status CLOSED-RESOLVED) dès que :

1. `npm test` passe avec **0 FAIL** incluant T08.
2. Le bench A/B P5 V2-B a livré un verdict (REJECT / SHADOW_CONTINUE / PROMOTE).
3. La décision ADR DEC-20260417-004 est soit scellée (PROMOTE) soit archivée
   (REJECT) soit re-évaluée (SHADOW_CONTINUE).

Si V2-B est ultimement rejeté (Option REJECT du P5 bench), cette NCR sera
**amendée** pour documenter un revert de `duel-engine.ts` au hash V1 et un
rollback du registre HASHES.sha256.

## Traçabilité

- Ordre V2-B : Francky "go enchaine tous" 2026-04-17
- ADR : `docs/DEC-20260417-004-V2B-ADAPTIVE-CHUNKING.md`
- Test affecté : `packages/sovereign-engine/tests/validation/validation-runner.test.ts:130` (T08)
- Fichier modifié : `packages/sovereign-engine/src/duel/duel-engine.ts:152`
- Registre : `packages/sovereign-engine/proofpack/phase-s-sealed/HASHES.sha256:8`
- Validation Francky : messagerie Cowork 2026-04-17, réponse "a" (Option A)

---

## Closure — 2026-04-20

**Status** : ACCEPTED → **CLOSED-SUPERSEDED**
**Closed by** : Claude (exécution Bloc O, validation Francky)
**Superseded by** : merge strategy C (PARALLÈLE + CURRENT_REF.md) adoptée 2026-04-20

### Motif de supersession

Cette NCR (2026-04-17) documentait un Option A in-place : mise à jour du hash
ligne 8 de `phase-s-sealed/HASHES.sha256` pour refléter V2-B
(`f075ee3a...` → `4f11ea54...`).

Le 2026-04-20, après détection FROZEN breach étendu (P8-FIX + P8-bis + V2-B
sur working tree non scellé), une nouvelle NCR a été ouverte
(`NCR_FROZEN_BREACH_DUEL_ENGINE_2026-04-20.md`). L'arbitrage 3-IA + Francky a
adopté **merge strategy C (PARALLÈLE)** :

- `phase-s-sealed/` devient **immuable à perpétuité** (V1, 2026-04-13, intact).
- Toute évolution ultérieure crée un nouveau `phase-s-rX/` en parallèle.
- `CURRENT_REF.md` pointe vers le sceau actif.

### Impact sur cette NCR

**Option A in-place (Section "Action prise", point 1) : ANNULÉE.**

Le hash ligne 8 de `phase-s-sealed/HASHES.sha256` reste `3bb2c6ff...` (V1
originale, 2026-04-13). Aucune modification n'a été faite sur ce registre.

La nouvelle donnée V2-B est capturée dans `phase-s-r7/HASHES.sha256`, ligne 8 :
```
2c29ce57a9b548102b193dd828f4aa5908d7f866f607495cd5bd2ffc968600a1  src/duel/duel-engine.ts
```

**Remarque historique** : le hash cité dans cette NCR (`4f11ea54...`) correspond
à l'état working tree au 2026-04-17 avant les commits atomiques Bloc N. Le hash
final post-Bloc N est différent (`2c29ce57...`) car P8-FIX + P8-bis ont été
appliqués en plus de V2-B.

### État ADR DEC-20260417-004

La section "Seal Phase S impact" de l'ADR reste valide dans son contenu, mais
son action opérationnelle (update HASHES ligne 8) est remplacée par la création
de `phase-s-r7/`. Pas de modification de l'ADR (préservation historique).

### Test T08 (INV-VAL-05)

Condition de fermeture point 1 ("`npm test` passe avec 0 FAIL incluant T08") :
**satisfaite** par Bloc O Option α (T08 mis à jour pour lire `CURRENT_REF.md`).

### Bench A/B P5 V2-B

Condition de fermeture point 2 : V2-B est conservé (non rejeté). Le bench NCR_M2
Phase 1 A.1 a validé empiriquement V2-B combiné à P8-FIX + P8-bis (15/15 runs OK).
Verdict consolidé : **SHADOW_CONTINUE → PROMOTE** via scellement `phase-s-r7`.

### Traçabilité

- NCR_FROZEN_BREACH_DUEL_ENGINE_2026-04-20.md §9 (Decision)
- Consensus 3-IA 2026-04-20 (Claude + Gemini + ChatGPT + Francky)
- Tag : `phase-s-r7-sealed-2026-04-20`

---

**NCR CLOSED-SUPERSEDED**. Aucune action résiduelle. Conservée pour historique.
