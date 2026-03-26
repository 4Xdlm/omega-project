# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : BEST-OF-3 PAR BRIQUE
# Générer 3 candidats, garder le meilleur — filet anti-variance
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 2004 PASS
#
# CONTEXTE :
# Le factoriel 2×2 a prouvé que le moteur est trop proche du seuil 92.
# La variance stochastique fait osciller Contemplation entre 86 et 92.
# Le moteur SAIT produire du SAGA_READY mais pas à chaque tir.
#
# SOLUTION : Générer jusqu'à 3 candidats par brique.
# Si un candidat atteint SAGA_READY → early exit (économie d'API).
# Si aucun ne passe → garder le meilleur composite.
#
# Probabilité : si p(SAGA)=0.35 par run, P(au moins 1 sur 3) = 1-(0.65)³ ≈ 73%
# ═══════════════════════════════════════════════════════════════════════════════

## ÉTAPE 1 — Créer `src/assembly/best-of-n.ts`

### Interface

```typescript
export interface BestOfNConfig {
  readonly max_attempts: number;  // 3 par défaut
  readonly early_exit_composite: number;  // 92.0 (SAGA_READY)
  readonly early_exit_min_axis: number;   // 85.0
}

export interface BestOfNResult {
  readonly winner: BrickResult;
  readonly all_candidates: BrickResult[];
  readonly attempts: number;
  readonly early_exit: boolean;
  readonly selection_reason: 'saga_ready' | 'best_composite';
}

export interface BrickResult {
  readonly prose: string;
  readonly words: number;
  readonly composite: number;
  readonly min_axis: number;
  readonly axes: { ECC: number; RCI: number; SII: number; IFI: number; AAI: number };
  readonly hash: string;
  readonly saga_ready: boolean;
}
```

### Logique

```typescript
export async function generateBestOfN(
  forgePacket: ForgePacket,
  provider: SovereignProvider,
  config: BestOfNConfig = { max_attempts: 3, early_exit_composite: 92.0, early_exit_min_axis: 85.0 }
): Promise<BestOfNResult> {
  const candidates: BrickResult[] = [];

  for (let i = 0; i < config.max_attempts; i++) {
    // 1. Générer la brique via le pipeline complet
    //    (ChunkedDraft → Duel → MicroSurgery → MacroSScore)
    const result = await generateAndScoreBrick(forgePacket, provider);
    candidates.push(result);

    // 2. Early exit si SAGA_READY
    if (result.composite >= config.early_exit_composite
        && result.min_axis >= config.early_exit_min_axis) {
      return {
        winner: result,
        all_candidates: candidates,
        attempts: i + 1,
        early_exit: true,
        selection_reason: 'saga_ready',
      };
    }

    // 3. Pause 5s entre les tentatives (rate limiting)
    if (i < config.max_attempts - 1) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // 4. Aucun SAGA_READY → garder le meilleur par selection_score
  //    selection_score = composite - 1.5 * max(0, 85 - min_axis)
  //    (même formule que le Duel hostile)
  const sorted = [...candidates].sort((a, b) => {
    const scoreA = a.composite - 1.5 * Math.max(0, 85 - a.min_axis);
    const scoreB = b.composite - 1.5 * Math.max(0, 85 - b.min_axis);
    return scoreB - scoreA;
  });

  return {
    winner: sorted[0],
    all_candidates: candidates,
    attempts: config.max_attempts,
    early_exit: false,
    selection_reason: 'best_composite',
  };
}
```

### La fonction generateAndScoreBrick

Cette fonction encapsule le pipeline complet :
1. `runSovereignForgeWithPacket(forgePacket, provider)` → prose brute
2. Duel (3 modes single-shot + CV Gate) → meilleur candidat
3. MicroSurgery → ajustements
4. MacroSScore → composite + axes

Elle doit réutiliser le code existant de `test-vatomic-5bricks.ts`
ou de `s-oracle-v2.ts`. NE PAS réécrire le pipeline — appeler
les fonctions existantes.

Chercher dans le code existant comment le pipeline est invoqué
(probablement dans les scripts test-vatomic ou dans engine.ts).

## ÉTAPE 2 — Créer `scripts/test-bestof3-5bricks.ts`

Script qui lance Best-of-3 sur les 5 briques classiques :
Contemplation, Confrontation, Souvenir, Menace, Révélation

Pour chaque brique :
1. Appeler `generateBestOfN(packet, provider, { max_attempts: 3 })`
2. Afficher : attempts, early_exit, winner composite, winner min_axis, SAGA status
3. Afficher le tableau des 3 candidats (ou moins si early exit)

### Format de sortie

```
═══════════════════════════════════════════════════════════════════════
  OMEGA — BEST-OF-3 : FORGE DE 5 BRIQUES
  5 scènes × max 3 tentatives × pipeline 19 étages
═══════════════════════════════════════════════════════════════════════

═══ BRIQUE 1/5 : Contemplation ═══
  Tentative 1 : Comp=88.5 min=82.1 → ❌
  Tentative 2 : Comp=92.3 min=85.4 → ✅ SAGA_READY — EARLY EXIT
  Winner: Tentative 2 (early_exit=true, attempts=2)

═══ BRIQUE 2/5 : Confrontation ═══
  Tentative 1 : Comp=89.2 min=83.1 → ❌
  Tentative 2 : Comp=90.1 min=84.5 → ❌
  Tentative 3 : Comp=91.8 min=86.0 → ❌
  Winner: Tentative 3 (best_composite, attempts=3)

...

═══════════════════════════════════════════════════════════════════════
  RÉSUMÉ BEST-OF-3
═══════════════════════════════════════════════════════════════════════
  SAGA_READY     : X/5
  Early exits    : X/5
  Total attempts : X/15 (max)
  Total API calls: ~X

  Par brique :
  contemplation : Comp=XX.X min=XX.X attempts=X → ✅/❌
  confrontation : Comp=XX.X min=XX.X attempts=X → ✅/❌
  souvenir      : Comp=XX.X min=XX.X attempts=X → ✅/❌
  menace        : Comp=XX.X min=XX.X attempts=X → ✅/❌
  revelation    : Comp=XX.X min=XX.X attempts=X → ✅/❌
═══════════════════════════════════════════════════════════════════════
```

## ÉTAPE 3 — Tests unitaires

```
it('generateBestOfN returns early on SAGA_READY')
it('generateBestOfN tries max_attempts when no SAGA_READY')
it('generateBestOfN selects best composite when no SAGA_READY')
it('generateBestOfN returns all_candidates array')
it('BestOfNConfig defaults are correct')
```

Pour les tests unitaires, utiliser un mock provider qui retourne
des scores prévisibles (pas d'API).

## VÉRIFICATION

1. `npm test` → 2004+ PASS
2. `npx tsc --noEmit` → 0 erreurs
3. NE PAS lancer le script test-bestof3-5bricks.ts (budget API)
   → Le lancement sera fait manuellement par l'Architecte

## COMMIT

```
feat(assembly): best-of-3 par brique — filet anti-variance stochastique

Le factoriel 2x2 a prouvé: le moteur est trop proche du seuil 92.
La variance stochastique décide trop souvent à notre place.

Best-of-N génère jusqu'à max_attempts candidats par brique:
  - Early exit si SAGA_READY (composite>=92 + min_axis>=85)
  - Sinon, garde le meilleur par selection_score hostile
  - Pause 5s entre tentatives (rate limiting)

P(SAGA|1 run)=0.35 → P(SAGA|3 runs)=0.73

Module: src/assembly/best-of-n.ts
Script: scripts/test-bestof3-5bricks.ts (non lancé — budget API)
```

## CE QUI NE DOIT PAS CHANGER

- Pipeline de génération (chunked-generator, Duel, CV Gate, MicroSurgery)
- Tous les juges (Necessity V2, Impact V1, Interiority V1, AAI réel)
- MacroSScore et poids
- Glossaire (OFF par défaut, flag env)
- Voice weight (0 par défaut, flag env)
