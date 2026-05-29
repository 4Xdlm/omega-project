# NCR_V2_3_ORACLE_ECC_14D_INCOMPATIBLE : composite Oracle V3 inutilisable pour la prose réécrite V2.3

**Status**: RESOLVED (Option D, décision Architecte 2026-05-29)
**Severity**: HIGH (bloquait le bench P4 — juge final d'Option B)
**Sprint**: V2.3-A P4 | **Date**: 2026-05-29
**Réf croisées**: NCR_EMOTION14_CANON_DRIFT (2026-05-05), Codex v1.3.1 §294, FORBID-CANON-GARAGE-001, LAW-CHUNK-048

## Issue (mécanisme causal)
Le bench P4 score chaque prose réécrite via `judgeAestheticV3 → computeMacroSScore → canonicalize`.
- `computeECC` (oracle/macro-axes.ts:102) construit `sub_scores = [tension_14d, emotion_coherence, interiority, impact, physics_compliance, temporal_pacing]`.
- `tension_14d` (oracle/axes/tension-14d.ts:93) lit `packet.emotion_contract.curve_quartiles[i].target_14d`.
- En mode réécriture V2.3, P0 (`deriveEmotionContractFromSegment`) laisse **`target_14d = {}`** délibérément (Emotion14 GARAGE/DORMANT depuis NCR_EMOTION14_CANON_DRIFT ; FORBID-CANON-GARAGE-001 interdit toute résurrection).
- `{}` → arithmétique sur `undefined` → **`NaN`** → `canonicalize` lève (refus de propager un score corrompu) → **bench FATAL**.

Diagnostic empirique : `scripts/diag-v2_3-score.ts` (opt-in) a généré 1 prose qwen, scoré chaque macro-axe individuellement, scanné le NaN → localisé exactement à **`ECC.sub_scores[0]` (tension_14d)**. RCI/SII/IFI/AAI = finis. emotion_coherence/interiority/impact = finis.

## Options
1. **A — `target_14d` uniforme** : remplir un vecteur 14d constant. REJETÉ : valeur bidon (UNIFORM_14D), score non interprétable, frôle la résurrection du canon GARAGE.
2. **B' — amputer tout ECC** : exclure les 5 macro-axes ECC du score. REJETÉ : jette emotion_coherence/interiority/impact qui sont des signaux qualité prose forts et fonctionnels (ne touchent pas le 14d).
3. **D — REWRITE_ORACLE scopé (RETENU)** : métrique dédiée V2.3 = moyenne de 7 axes valides {RCI, SII, IFI, AAI, emotion_coherence, interiority, impact}, **excluant le seul axe couplé au 14d (tension_14d)**. `target_14d` reste `{}`. `judgeAestheticV3` non modifié.

## Décision (Architecte, 2026-05-29) : Option D
- Module : `packages/sovereign-engine/src/oracle/rewrite-oracle.ts` — `scoreRewriteOracle` + `computeRewriteComposite` (pur) + `REWRITE_ORACLE_AXES`.
- Garde anti-NaN : `computeRewriteComposite` lève si un axe est non-fini (pas de score corrompu silencieux).
- Tests CI déterministes (zéro qwen) : `tests/rewrite-oracle.test.ts` (7 PASS) — math composite, garde NaN, jeu d'axes excluant tension_14d, isolation statique (n'importe pas tension-14d, ne lit pas `.target_14d`).
- Bench `scripts/bench-v2_3_ab_oracle.ts` recâblé sur `scoreRewriteOracle`.
- **Portée stricte** : REWRITE_ORACLE est une métrique de comparaison A/B SCOPÉE réécriture V2.3, **PAS** le composite Oracle standard, **PAS** Δρ V3.4. Le composite V3 standard reste la métrique de l'ex-nihilo (intact).

## Risques résiduels
- REWRITE_ORACLE n'est pas comparable numériquement au composite V1 (87.8) : axes différents. N'est utilisé que pour le **Δ intra-bench** (naïf vs scalpel), jamais en absolu cross-sprint.
- tension_14d exclu = on ne mesure pas la trajectoire émotionnelle 14d de la prose réécrite. Acceptable : le 14d est dormant par doctrine ; la cohérence émotionnelle reste couverte par `emotion_coherence`.

## Verdict
- Statut : RESOLVED
- Action requise : aucune côté code (Option D implémentée + testée). Le verdict prose (GO_B_CANDIDATE/SHADOW/REJECT) sera produit par le run P4 détaché.
