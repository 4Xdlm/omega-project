# NCR_VALIDATION_TYPE_ASSERTIONS_DEBT

**ID** : NCR_VALIDATION_TYPE_ASSERTIONS_DEBT
**Title** : Pattern type assertion `as unknown as Record<string, unknown>` introduit comme patch minimal Sprint S10.1-B — refonte architecturale Option B/C reportée S11+
**Status** : **OPEN_DOCUMENTED** (debt acceptée, scope minimal)
**Severity** : LOW (debt technique, pas de bug runtime)
**Priority** : P3 (DEFERRED Sprint S11+)
**Opened** : 2026-05-03 (Sprint S10.1-B)
**Owner** : Francky + Claude

---

## 1. Issue

Sprint S10.1-B a appliqué le pattern type assertion **Option A** (minimal scoped) pour débloquer le build sovereign-engine bloqué par 4 erreurs TS2352 (préexistantes depuis 2026-02-27 — voir S10.0 audit §8bis).

**Pattern appliqué** :
```typescript
// AVANT (TS2352 strict mode reject):
(X as Record<string, unknown>).propName as Type ?? default

// APRÈS (compile, debt documented):
(X as unknown as Record<string, unknown>).propName as Type ?? default
```

**5 sites patchés** :
1. `packages/sovereign-engine/src/validation/phase-u/phase-u-exit-validator.ts:189` — KSelectionReport (S10.1-B)
2. `packages/sovereign-engine/src/validation/phase-u/phase-u-exit-validator.ts:218` — KSelectionReport (S10.1-B)
3. `packages/sovereign-engine/src/validation/phase-u/top-k-selection.ts:359` — ForgePacketInput (S10.1-B)
4. `packages/sovereign-engine/src/validation/real-llm-provider.ts:110` — ForgePacket (S10.1-B)
5. `packages/sovereign-engine/src/validation/phase-u/benchmark/run-dual-benchmark.ts:590` — ForgePacketInput (**S10.1-C extension** — révélé post-batch tsc)

## 2. Origin (S10.0 audit §8bis Q6)

Pattern délibéré introduit par Francky (4Xdlm) pour bridge des types narrow vers logique générique :

| Site | Commit origine | Date |
|------|----------------|------|
| phase-u-exit-validator.ts:189 + :218 | `bbd448d22` | 2026-03-13 |
| top-k-selection.ts:359 | `87db4dc94` | 2026-03-03 |
| real-llm-provider.ts:110 | `14414a6cc` | 2026-02-27 |
| run-dual-benchmark.ts:590 | (à blamer S10.2 audit) | (probablement 2026-03 même époque) |

**Trigger TS upgrade** : TypeScript a été upgradé vers une version plus stricte entre mars et mai 2026. Le pattern `as Record<string, unknown>` (sans `as unknown` intermédiaire) est désormais rejeté par TS strict moderne (TS 5.x récent).

→ Dette technique pré-existante révélée par TS upgrade, NOT régression récente.

## 3. Justification S10.1-B (Option A scoped)

Mini-Tribunal IA convergent (S10.0 audit §9.1) :
- **Option A (Mécanique)** retenue : `as unknown as Record<...>` aux 4 sites — minimal patch, scoped, débloque build
- **Option B (Architectural)** : Index signature `[key: string]: unknown` aux 3 types cibles (KSelectionReport, ForgePacketInput, ForgePacket) — refonte propre mais affecte API publique du type
- **Option C (Refactor)** : Évaluer la nécessité réelle des conversions Record — peut révéler que certaines sont superflues

**Rationale Option A pour S10.1-B** :
- MINIMIZE IT (1 mot ajouté par site, 4 sites, 0 refactor architectural)
- NCR OVER HEROICS (debt documenté ouvertement, refonte différée S11+)
- Déblocage build immédiat sans propagation type changes
- ChatGPT garde-fou : changes localized, no public type propagation

## 4. ChatGPT garde-fou (Mini-Tribunal Q2 condition)

Conditions respectées par patch S10.1-B :
- ✅ **Localized** : 4 sites isolés en `src/validation/`, aucun impact hors validation
- ✅ **No public type propagation** : KSelectionReport, ForgePacketInput, ForgePacket types non modifiés (signatures publiques inchangées)
- ✅ **NCR opened** : ce document, debt tracée
- ✅ **Reversible** : si Option B/C choisie ultérieurement, les 4 sites peuvent être nettoyés simultanément

## 5. Plan refonte S11+ (Option B candidate)

### Option B — Index signature

Ajouter `[key: string]: unknown` à 3 types cibles :

```typescript
// KSelectionReport
export interface KSelectionReport {
  k_generated: number;
  k_survived_seal: number;
  // ... existing fields
  [key: string]: unknown;  // NEW : extension permise
}

// ForgePacketInput, ForgePacket : idem pattern
```

**Effort estimé** : 1-2h
- 3 fichiers types modifiés
- 4 sites validation/ : retour à pattern simple `as Record<...>` ou direct `.propName`
- Tests existants : doivent encore passer (signatures backward-compatible)

**Risques Option B** :
- Index signature `[key: string]: unknown` peut désactiver TypeScript autocomplete strict pour ces types
- Décision Architecte requise : strict typing vs flexibility

### Option C — Refactor évaluation

Audit chaque conversion : est-elle vraiment nécessaire ?
- `k_saga_ready` : extension property → devrait être dans KSelectionReport directement
- `seeds.generation` : sous-objet → devrait être dans ForgePacketInput type
- `narrative_shape` : extension property → devrait être dans ForgePacket type

**Effort estimé** : 3-5h
- Audit + refactor types principaux
- Migration des 4 sites validation/
- Test suite extension validation

## 6. Risques restants post-S10.1-B

- **R1 — Pattern multiplication** : si nouveau code valide est ajouté avec besoin similaire, le pattern Option A peut se propager. Mitigation : document clair S11+ refonte.
- **R2 — Refonte S11+ pas planifiée** : aucune deadline pour Option B/C. Si oublié, debt s'accumule.
- **R3 — TS upgrade futur** : si TypeScript devient encore plus strict, `as unknown as Record<...>` pourrait aussi être rejeté un jour.

## 7. Cross-references

- `nexus/proof/S10_STEP0_SOVEREIGN_ENGINE_CASC_AUDIT.md` §8bis (Q6 timeline blame)
- `nexus/proof/S10_STEP0_SOVEREIGN_ENGINE_CASC_AUDIT.md` §9.1 (Mini-Tribunal Q2 verdict Option A)
- Commit S10.1-B (ce sprint) : 4 sites patchés
- `CLAUDE.md` v3.156.0 (doctrine MINIMIZE IT + NCR OVER HEROICS)

## 8. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S10.1-B | **DONE** |
| 2 | Décision Architecte Option B vs C | Francky | S11+ | PENDING |
| 3 | Si Option B : refactor 3 types + 4 sites validation/ | Claude | S11+ | PENDING |
| 4 | Si Option C : audit + refactor architecture | Claude | S11+ | PENDING |

## 9. Signature

```
NCR-ID    : NCR_VALIDATION_TYPE_ASSERTIONS_DEBT
OPENED    : 2026-05-03 (Sprint S10.1-B)
STATUS    : OPEN_DOCUMENTED — debt acceptée, scope minimal Option A
ARCHITECT : Francky (décision Option B/C S11+)
DRAFTER   : Claude (IA Principal, runtime arbiter)
TRIBUNAL  : Mini-Tribunal IA convergent Option A (Cowork + ChatGPT + Gemini)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
