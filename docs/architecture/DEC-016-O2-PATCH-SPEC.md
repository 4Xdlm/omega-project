# DEC-016 O2 — PATCH-SPEC (à appliquer dans le terminal Architecte, EMP-10)

**Date** : 2026-06-02 · **Cible** : `packages/sovereign-engine/src/oracle/macro-axes.ts` · `computeIFI` (l.628-707)
**Flag** : `OMEGA_SENSORY_DECOUPLE` ∈ { `'0'` legacy (défaut) | `'shadow'` (logue, verdict inchangé) | `'1'` actif (IFI=pacing) }
**VERROU TRIBUNAL 2/2 (2026-06-02)** : `OMEGA_SENSORY_DECOUPLE='1'` (flip actif prod) **INTERDIT** tant que R4
(discrimination qualité) + re-dérivation des paliers ne sont pas faits. Seuls `'0'` (défaut) et `'shadow'` (logs) autorisés.
O2 = « retrait d'un faux floor », PAS « nouvelle métrique de qualité ». R4 est prioritaire sur le flip.

**Garde-fous** : flag défaut `'0'` → zéro changement de comportement par défaut. Forme de retour `MacroAxisScore` INCHANGÉE
(pas de crash orchestrateur). Reclassement, pas suppression. Appliquer via `commit-with-tests.ps1` (TSC + Vitest).

---

## Changement unique (computeIFI)

**AVANT** (l.692-700) :
```ts
  // 6. Score final (capped at 100)
  const score_final = Math.max(0, Math.min(100, ifi_raw + total_bonus));

  // 7. ScoreReasons
  const reasons = buildIFIReasons(sub_scores);

  return {
    name: 'ifi',
    score: score_final,
```

**APRÈS** :
```ts
  // 6. Score final (capped at 100)
  const score_legacy = Math.max(0, Math.min(100, ifi_raw + total_bonus));

  // 6b. DEC-016 O2 — découplage densité ↔ qualité (flag OMEGA_SENSORY_DECOUPLE).
  //     IFI-pacing = pacing structurel pur (attention_sustain + fatigue_management), langue-neutre,
  //     SANS densité sensorielle (sensory_richness/corporeal_anchoring keyword + focalisation sémantique).
  //     Preuve : WS_D_R2_3 (densité anti-corrèle qualité) + WS_D_R3 (IFI = floor universel défectueux).
  const ifi_pacing = Math.max(0, Math.min(100, attention_axis.score * 0.5 + fatigue_axis.score * 0.5));
  const decouple = process.env.OMEGA_SENSORY_DECOUPLE ?? '0';
  const score_final = decouple === '1' ? ifi_pacing : score_legacy;
  if (decouple === 'shadow') {
    // eslint-disable-next-line no-console
    console.error(
      `[SENSORY_DECOUPLE shadow] ifi_legacy=${score_legacy.toFixed(1)} ifi_pacing=${ifi_pacing.toFixed(1)} ` +
      `delta=${(ifi_pacing - score_legacy).toFixed(1)} focal=${focalisation.toFixed(0)} ` +
      `sensory=${sensory_richness.toFixed(0)} corporeal=${corporeal_anchoring.toFixed(0)}`,
    );
  }
  if (decouple === '1') {
    // densité passée ADVISORY : poids 0, annotation (reclassement, jamais suppression — toujours calculée/exposée)
    for (const s of sub_scores) {
      if (/sensory_richness|corporeal_anchoring|focalisation/.test(s.name)) {
        s.weight = 0;
        s.details = `[ADVISORY DEC-016] ${s.details}`;
      }
    }
  }

  // 7. ScoreReasons
  const reasons = buildIFIReasons(sub_scores);

  return {
    name: 'ifi',
    score: score_final,
```

(Le reste du `return` — `weight`, `method`, `sub_scores`, `bonuses`, `reasons` — INCHANGÉ.)

## Notes de sûreté

- **Aucune modif de `computeMacroSScore` (l.863)** : min_axis/composite gardent les 5 axes ; seule la *valeur* d'IFI change
  en mode `'1'`. Pas de repondération (≠ option O1). Pas de changement de signature ni de forme de retour.
- **`s.method` NON modifié** (évite une rupture du type `AxisScore.method`) ; l'annotation advisory passe par `details` + `weight=0`.
- **`distribution_bonus`** : en mode `'1'`, `ifi_raw`/`total_bonus` ne sont plus utilisés pour le score (remplacé par `ifi_pacing`),
  donc le bonus corporeal-quartile n'influe plus le score. Il reste calculé (exposé dans `bonuses`) — advisory de fait.
- **Seuils production INCHANGÉS** (DEC-015). Le mode `'shadow'` ne change AUCUN verdict.

## Procédure (terminal Architecte)

1. Appliquer le bloc ci-dessus.
2. `commit-with-tests.ps1` (Typologie A : TSC PASS + Vitest PASS empirique requis, EMP-10).
3. **Shadow d'abord** : tourner la prod / un bench avec `$env:OMEGA_SENSORY_DECOUPLE='shadow'` → collecter les lignes
   `[SENSORY_DECOUPLE shadow]`, vérifier que le delta correspond au bench WS-D R3 (IFI legacy ~44 → pacing ~100).
4. Flip `'1'` **seulement après** : (a) shadow concluant, (b) re-dérivation des paliers sous le nouveau régime (DEC-015),
   (c) chantier confound packet/ECC traité (sinon ECC reste l'axe-tueur, cf WS_D_R3 caveat C1).
5. Tests à ajouter : un cas `'1'` (IFI = pacing), un cas `'0'` (legacy inchangé), un cas `'shadow'` (score == legacy).

## Rappel (WS_D_R3 caveats)

O2 est **nécessaire mais non suffisant** pour faire passer les maîtres : après O2, l'axe contraignant devient **ECC**
(bas sous contrat-packet faux, WS-A.2). Le flip `'1'` seul ne fera pas SEAL les maîtres tant que le confound contrat/packet
n'est pas traité. O2 corrige UN défaut (densité dans la porte qualité), pas tous.
