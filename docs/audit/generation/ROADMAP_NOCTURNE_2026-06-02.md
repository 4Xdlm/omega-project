# ROADMAP NOCTURNE — Atelier Best-of-N + IntrinsicQuality shadow (~10 h, dispatch phase par phase)

**Date** : 2026-06-02 · **Branche** : phase-r-dispatcher-v33 · **Mode** : exécution autonome, validation Architecte par dispatch (« go phase N »)
**Base** : DEC-017 ACCEPTED, module `intrinsic-quality` validé (commit `aa258cb3`), déblocage PATHEXT.
**Tribunal 2/2** : GO roadmap, cadrée OPÉRATION SHADOW (pas de refonte moteur).

---

## RÈGLES ABSOLUES (toutes phases) — aucune dérogation sans STOP

- **PATHEXT** : préfixer chaque shell exe par `set "PATHEXT=.COM;.EXE;.BAT;.CMD;.PS1"` (+ nodejs/git au PATH).
- **Flag** : `OMEGA_INTRINSIC_QUALITY='0'` par défaut → comportement prod **strictement identique**. `'shadow'` = logs seulement.
- **INTERDITS** : aucun min_axis, aucun composite, aucun SEAL, aucun seuil prod modifié, **O2 actif HOLD**, **DEC-009 HOLD**, **fusion moteur HOLD**, **gate dur HOLD**, modules FROZEN (genome/sentinel) **jamais touchés**.
- **EMP-10** : tout commit code précédé de `tsc --noEmit` PASS + `vitest` PASS (lancés manuellement, evidence loguée). Commit `--no-verify` (hooks DC), staging ciblé (EMP-13).
- **Granularité** : scoring qualité uniquement sur scènes **1200-1800 mots**. **Pairwise toujours 2 ordres** (A/B + B/A).
- **STOP-si-échec** : toute phase dont les gates échouent → rollback de la phase, on conserve l'acquis précédent, on documente, on s'arrête (pas de fuite en avant).
- **Crash-safe** : runs Ollama longs via `start_process` + checkpoint, reprenables.

---

## PHASE 0 — Sécurisation (≈ 0:30) `[go phase 0]`
**Actions** : `git status` + `git log --oneline -8` ; **push** les ~25 commits locaux → `origin/phase-r-dispatcher-v33` ; créer `docs/ops/PATHEXT_CLAUDE_TERMINAL_RECOVERY.md` (cause = PATHEXT=.CPL, fix, 3 méthodes Ollama).
**Gate** : push OK (origin = local), arbre propre.
**Livrable** : doc PATHEXT + confirmation push.
**PASS** : `git status` clean, branche sync origin 0/0.

## PHASE 1 — Baseline avant câblage (≈ 0:45) `[go phase 1]`
**Actions** : `tsc --noEmit` (package) ; `vitest run tests/intrinsic-quality` ; smoke live Ollama (Flaubert vs pulp, pairwise 2 ordres).
**Gate** : TSC 0 err ; 17 tests PASS ; smoke maître > pulp + pairwise 2/2.
**Livrable** : log baseline.
**PASS** : baseline propre post-`aa258cb3`. **STOP-si-échec** : on ne câble rien.

## PHASE 2 — Câblage shadow minimal (≈ 1:30-2:00) `[go phase 2]` — *seul code moteur de la nuit*
**Actions** : repérer le point de scoring (oracle/engine) ; ajouter un appel **flag-gaté** au scorer advisory : si `OMEGA_INTRINSIC_QUALITY='shadow'` → calcul profondeur/style/voix/mean (si scène 1200-1800) + log télémétrie `{mean,profondeur,style,voix,model,prompt_hash,scene_hash,words}` ; **ne modifie AUCUN champ du verdict** (score/min_axis/composite/SEAL inchangés). Flag `'0'` = aucun appel, comportement identique.
**Gate** : `tsc` ; tests non-régression (flag '0' = sortie identique) + test log (flag 'shadow').
**Livrable** : câblage + commit `feat(intrinsic-quality): wire advisory scorer in shadow mode`.
**PASS** : flag '0' bit-identique ; flag 'shadow' logue sans changer le verdict. **STOP-si-échec** : rollback câblage, module standalone conservé.

## PHASE 3 — Gates complets post-câblage (≈ 1:00) `[go phase 3]`
**Actions** : `tsc --noEmit` ; `vitest run` **suite complète** ; smoke live Ollama post-câblage.
**Gate** : TSC 0 err ; **2536+ pass** (mêmes 5 échecs env pré-existants gate-roadmap/proofpack, rien de neuf) ; smoke OK.
**Livrable** : rapport gates. Si PASS → commit + push.
**PASS** : zéro régression nouvelle. **STOP-si-échec** : rollback Phase 2.

## PHASE 4 — Atelier Best-of-N v0 (≈ 2:00-2:30) `[go phase 4]` — *tooling pur, n'utilise PAS de code moteur figé*
**Actions** (script `scripts/generation/atelier-best-of-n.ts`, Ollama via provider) : pour **2-3 briefs** (dont ouverture « Le Gardien »), générer **N=5 variantes** d'une scène (~1500 mots) via `provider.generateDraft` (seeds diversifiés, même contrat/intention) ; scorer chaque variante (profondeur/style/voix/mean) ; **tournoi pairwise complet 2 ordres** → matrice + gagnante + classement ; position_bias.
**Livrables** : `docs/audit/generation/BEST_OF_N_V0_REPORT.md` + `_RESULTS.csv` + `_PAIRWISE_MATRIX.csv` (prose générée OMEGA = nôtre, peut être loguée).
**PASS** : le juge produit un classement cohérent + désigne une gagnante (≠ prouver chef-d'œuvre). **STOP-si-échec** : documenter le blocage génération, livrer ce qui tient.

## PHASE 5 — Passes de forge sur la gagnante (≈ 2:00) `[go phase 5]` — *seulement si Phase 4 propre*
**Actions** : sur la variante gagnante, appliquer **3 passes max** de réécriture LLM (réutilisation des acquis historiques comme FORGES, pas comme juges) : (1) **voix**, (2) **euphonie/rythme** (variation longueurs, heurts sonores), (3) **sous-texte/syntaxe flaubertienne** ; mesurer **avant/après chaque passe** (profondeur/style/voix) + **pairwise avant/après**.
**Livrable** : `docs/audit/generation/ATELIER_PASSES_V0_REPORT.md`.
**PASS** : on peut dire, chiffres à l'appui, si les passes **améliorent** la qualité mesurée (ou non — METRIC_HONESTY).

## PHASE 6 — Rapport de clôture (≈ 0:45-1:00) `[go phase 6]`
**Actions** : consolider logs/métriques ; rédiger `docs/audit/generation/NIGHT_RUN_2026-06-02_INTRINSIC_SHADOW_ATELIER.md` : (1) commits poussés (2) PATHEXT vérifié (3) état module shadow (4) gates (5) best-of-N (classement + gagnante) (6) passes (avant/après) (7) limites (8) prochaines décisions. **Aucune décision prod**, juste constats.
**Livrable** : rapport matinal + push final + `git status` clean.
**PASS** : repo propre, rapport prêt à lire au réveil.

---

## TIMELINE
```
H0:00-0:30  P0 Securisation (push + PATHEXT doc)
H0:30-1:15  P1 Baseline gates
H1:15-3:15  P2 Cablage shadow (code moteur, flag-gate)
H3:15-4:15  P3 Gates complets + smoke
H4:15-6:45  P4 Atelier best-of-N v0
H6:45-8:45  P5 Passes forge sur gagnante
H8:45-9:45  P6 Rapport nocturne
H9:45-10:00 Push final + clean
```
Minimum viable nuit = P0->P4. P5 seulement si gates propres. P6 toujours.

## DISPATCH
Tu valides par « **go phase N** » (ou « go P0 »...). J'exécute la phase entière sans question, je rends le verdict PASS/FAIL + livrable, et j'attends ton dispatch suivant. STOP automatique si une phase FAIL.

**Phrase de cap** : *cette nuit, OMEGA ne devient pas plus sévère — il devient capable de choisir mieux, et de prouver que la forge améliore la prose.*
