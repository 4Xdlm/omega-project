# EMP-16 — PROTOCOLE DE TRIPLE-PREUVE (opérationnel)

**Loi** : EMP-16 (CLAUDE.md §H) — aucune modif de code MOTEUR sans **3 preuves mathématiques indépendantes CONVERGENTES** sur **corpus distincts** (données réelles, jamais projections). **3/3** requis ; 1 diverge → STOP + NCR.
**But de ce doc** : rendre la loi exécutable — quels corpus, quels critères de convergence, quel format de verdict.

## 1. Les 3 corpus indépendants (identifiés)
| Corpus | Source | Nature | Indépendance |
|---|---|---|---|
| **P1 — maîtres** | `omega-autopsie/gutenberg_cache/*.txt` (FR+EN, 11 auteurs) | littérature publiée | référence externe (non-OMEGA) |
| **P2 — ALTERNANCE** | `packages/sovereign-engine/sessions/ALTERNANCE_STUDY_2026-03-26*/` (prose_*.txt + phase{1,2,3}_results.json macro 5-axes) | sortie OMEGA mars 2026 | époque + prose différentes |
| **P3 — goldens / OMEGA output** | prose OMEGA scellée — `sessions/PROD_REVELATION*`, `BOOK_FULL*`, `MINI_V5R6*` (.txt prose) ; e2e/h2 = placeholder (exclure) | sortie OMEGA validée | run/seed différents |

Règle d'indépendance : 3 origines distinctes (littérature vs OMEGA-mars vs OMEGA-golden). Un effet qui ne tient que sur 1 = corpus-spécifique → NON généralisable (cf. R1 : vrai sur maîtres, faux sur ALTERNANCE).

## 2. Critères de convergence (par claim)
Une preuve = une mesure CALC/LLM reproductible sur un corpus. **Convergence = les 3 corpus satisfont le MÊME critère quantitatif**, pré-déclaré, sans ajustement post-hoc.
- Seuil de convergence par défaut : effet de même SIGNE sur les 3 + magnitude ≥ seuil pré-déclaré sur chacun.
- Exemple R2.1 (sémantique non-biaisé/non-gameable) : sur P1+P2+P3 — (a) |sem_FR − sem_EN| < 10 ; (b) Δ_sem_stuffing < 5 ET Δ_keyword_stuffing > 30. 3/3 → GO.
- Exemple « baisser un floor » : sur P1+P2+P3 — le nouveau floor doit (a) réduire les faux-rejets, (b) ne pas augmenter les faux-accepts mauvaise-prose, sur les 3.

## 3. Procédure
1. **Pré-déclarer** le claim + le critère quantitatif + le seuil (avant de mesurer — anti-post-hoc).
2. **Mesurer** sur P1, P2, P3 indépendamment (Ollama si LLM ; provenance DEC-014 ; déterministe temp 0).
3. **Évaluer** : 3/3 satisfont → CONVERGE ; sinon `PROOF_DIVERGENCE`.
4. **Verdict** : CONVERGE → GO code (terminal, EMP-10, flag, shadow d'abord). DIVERGE → **STOP**, ouvrir/annoter NCR, réexaminer le claim (souvent corpus-spécifique).
5. **Consulter l'historique** (EMP-17) : croiser avec benches/sessions passés ; un historique sérieux qui contredit = re-vérifier, pas ignorer.

## 4. Format de verdict (à coller dans le doc de décision)
```
TRIPLE-PREUVE [claim] :
- P1 maîtres   : [mesure] vs [seuil] -> CONVERGE/DIVERGE
- P2 ALTERNANCE: [mesure] vs [seuil] -> CONVERGE/DIVERGE
- P3 goldens   : [mesure] vs [seuil] -> CONVERGE/DIVERGE
=> [3/3 CONVERGE -> GO code | sinon STOP]
```

## 5. Précédent fondateur (preuve que la loi marche)
R1 « IFI advisory » : P1 maîtres CONVERGE (IFI=min 87%, lift +23) / P2 ALTERNANCE DIVERGE (IFI=min 17%, lift +1.7) → 1/2 → **STOP** → a empêché une modif moteur corpus-spécifique. Cf `WS_D_R1_TRIPLE_PROOF_VERDICT.md`, commit `9db8307a`.

## 6. Outillage prêt
- `wsd-r1-triple-proof.ts` (template : charge P1+P2, applique le gate, verdict convergence) → à généraliser par claim.
- `wsd-r2-semantic-rescore.ts` (P1+P2+P3, sémantique vs keyword + adversarial).
- Analyseurs CALC : `wsd-axis-correlation.ts`, `wsd-shadow-double-verdict.ts`.
