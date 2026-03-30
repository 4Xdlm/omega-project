# SESSION_SAVE — 2026-03-30 — BLOCS 0/1/2 + D1 CLOSEOUT
## OMEGA — Session Blocs Architecturaux Post-Blackbox

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  Document    : SESSION_SAVE_2026-03-30_BLOCS_0_1_2.md                           ║
║  Date        : 2026-03-30                                                        ║
║  HEAD        : 7a1c0009                                                          ║
║  Branche     : phase-r-metrology-rebuild                                         ║
║  Tests       : 2022 PASS                                                         ║
║  Standard    : NASA-Grade L4 / DO-178C Level A                                   ║
║  Autorité    : Francky (Architecte Suprême)                                      ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. RÉSUMÉ EXÉCUTIF

Session d'exécution architecturale post-blackbox. 3 blocs exécutés, 48 runs API,
~20 commits. Résultat principal : le prompt engineering est PLAFONNÉ comme levier
moyen. Le vrai plafond est la MESURE, pas le moteur. Le shadow mode D1 a filtré
impitoyablement : 1 composant PASS sur 5 testés.

---

## 2. CHRONOLOGIE

| Étape | Action | Résultat | Commit |
|-------|--------|---------|--------|
| BLOC 0 | Assainissement SSOT | 2011 PASS, seuils centralisés, tokens morts purgés | cdf821a7 |
| BLOC 1 P1 | Injection L37 subordination | 2011 PASS | 3289fef6 |
| BLOC 1 P2 | Conflits orthogonaux I1 | 2011 PASS | e66856b8 |
| BLOC 1 P3 | Anti-fermeture prompt | 2011 PASS | da77e6b0 |
| BLOC 1 P4 | Cliff gate telemetry | 2011 PASS | 5a342795 |
| BLOC 1 P5 | L37 + anti-fermeture K2 | 2011 PASS | af657051 |
| BLOC 1 P6 | Script benchmark | 2011 PASS | 4a9686ba |
| BENCH V5 | 24 runs benchmark | comp=88.9, cliff=0.404, 2 SAGA | 54cdc4ba |
| FIX 1 | Remap societal → long_vs_hook | 2011 PASS | baef8085 |
| FIX 2 | Retirer anti-fermeture (token mort prouvé) | 2011 PASS | 00ea0797 |
| FIX 3 | Cliff gate micro-API | 2011 PASS | 12badbe5 |
| BENCH FIX | 24 runs retest | comp=88.5, cliff=0.404, 1 SAGA | b4a8665f |
| BLOC 2 | Shadow judges code (CI_L37 + profils + dual-scale) | 2022 PASS (+11 tests) | 957c7dd4 |
| ADDENDUMS | Best-of-N + EN min/max + CI_L37 double norm | 2022 PASS | a8a58d72 |
| CLIFF FIX | Gate déplacé post-duel (bug corrigé) | 2022 PASS | b1680eb0 |
| SHADOW COLLECT | 32 runs collecte données D1 | Données complètes | 68400d55 |
| D1 CLOSEOUT | Retirer CI_L37+PROFILES, guillotine cliff | 2022 PASS | e939181f |
| RAPPORT D1 | docs/OMEGA_D1_CLOSEOUT_BLOC2.md | Déposé | 7a1c0009 |

---

## 3. VERDICTS PAR BLOC

### BLOC 0 — ASSAINISSEMENT SSOT : ✅ PASS
- Seuils SAGA_READY centralisés dans core/thresholds.ts (3 fichiers corrigés)
- Tokens morts TM-01→TM-07 purgés (BB-P04)
- s-score.ts marqué @deprecated LEGACY
- AAI cohérent (0.25 partout sauf LEGACY)

### BLOC 1 — V-ATOMIC v5 : ❌ FAIL (closé)
- Delta composite = -0.7 (cible +1.5) → FAIL
- cliff_score = 0.404 (cible <0.30) → FAIL
- Anti-fermeture prompt = TOKEN MORT confirmé (delta = -0.02)
- Conflit societal (noirceur_vs_sobriete) DÉTRUIT confrontation (-2.4)
- MAIS : 2 pics SAGA_READY (menace 93.1, révélation 92.3) = variance élargie
- Conclusion scellée : le prompt engineering est PLAFONNÉ comme levier moyen

### BLOC 2 — SHADOW JUDGES D1 : ✅ CLOSÉ

| Composant | r(composite) | Verdict D1 |
|-----------|-------------|------------|
| DUAL_COMBINED | 0.94 | PASS SHADOW (intégration décisionnelle différée) |
| CI_L37 corpus | ~0 | REJETÉ (sature 100, BB-C01 sub=constante) |
| CI_L37 omega | ~0 | REJETÉ (même cause) |
| PROFILE_FR | -0.218 | REJETÉ (anti-corrélé) |
| PROFILE_EN_MIN | faible | REJETÉ |
| PROFILE_EN_MAX | faible | REJETÉ |

---

## 4. DÉCOUVERTES SCELLÉES CETTE SESSION

### D-SESSION-01 : Le prompt engineering a une asymptote
48 runs totaux. Le composite moyen oscille entre 88.5 et 89.6 quelle que soit
la combinaison de prompts. L'attracteur RLHF de Sonnet est plus fort que nos
instructions. Le levier prompt ne MONTE pas la moyenne — il ÉLARGIT la variance.

### D-SESSION-02 : L'anti-fermeture prompt est un token mort universel
BB-01 (cliff=0.50 attracteur) est confirmé par 72 runs additionnels.
L'instruction "la dernière phrase OUVRE" n'a AUCUN effet mesurable.
Seul le post-processing (guillotine déterministe) peut agir.

### D-SESSION-03 : CI_L37 ne discrimine pas intra-OMEGA
L37 est prouvée sur le corpus humain (881 œuvres). Mais BB-C01 montre que
sub_per_sentence ≈ 0.099 est une CONSTANTE DE RÉGIME du modèle Sonnet.
Quand la variable de commande est une constante, l'indice causal sature.
CI_L37 = utile humain vs humain, inutile OMEGA vs OMEGA.

### D-SESSION-04 : Les profils FR/EN humains ne prédisent pas la qualité OMEGA
Les features FR humaines (semicolon dominant) anti-corrèlent avec la qualité
OMEGA. Le régime RLHF produit une prose dont la distribution de features est
fondamentalement différente de la prose humaine.

### D-SESSION-05 : Le cliff gate doit être post-duel
Le gate placé avant le duel agit sur un texte qui est ensuite JETÉ par le duel.
Position correcte : après duel + microsurgery, avant scoring final.

---

## 5. ÉTAT DES FICHIERS

### Créés cette session
- src/scoring/ci-l37.ts — module dormant (REJETÉ D1)
- src/scoring/language-profiles.ts — module dormant (REJETÉ D1)
- src/scoring/dual-scale.ts — ACTIF monitoring
- scripts/bench-v-atomic-v5.ts — script benchmark
- scripts/collect-shadow-bloc2.ts — script collecte shadow
- tests/scoring/ci-l37.test.ts — 3 tests
- tests/scoring/language-profiles.test.ts — 2 tests
- tests/scoring/dual-scale.test.ts — 4 tests (+2 addendum)
- docs/OMEGA_D1_CLOSEOUT_BLOC2.md — rapport D1

### Modifiés cette session
- src/engine.ts — cliff gate post-duel + shadow DUAL + best-of-N flag
- src/input/prompt-assembler-v4.ts — L37 + conflits orthogonaux
- src/generation/chunked-generator.ts — L37 dans persona K2
- src/duel/draft-modes.ts — purge tokens morts TM-01/TM-02
- src/validation/phase-u/phase-u-exit-validator.ts — seuils centralisés
- src/validation/phase-u/polish-engine.ts — seuils centralisés
- src/assembly/best-of-n.ts — seuils centralisés
- src/oracle/s-score.ts — header @deprecated LEGACY

---

## 6. ÉTAT ARCHITECTURAL FINAL

```
DUAL_COMBINED  : PASS SHADOW — monitoring, intégration décisionnelle DIFFÉRÉE
CI_L37         : REJETÉ D1 — dormant (sub=constante régime BB-C01)
PROFILES       : REJETÉS D1 — dormants (anti-corrélation)
CLIFF GATE     : guillotine déterministe ACTIVE post-duel
BEST-OF-N      : codé, activable par OMEGA_BEST_OF_N=1 (pas en prod par défaut)
PROMPT V5      : L37 + conflits orthogonaux en place (levier variance, pas moyenne)
```

---

## 7. PROCHAINES ACTIONS

### Immédiat
- Exécuter le best-of-3 sur quelques runs pour valider que la variance est filtrée
- Valider la guillotine cliff sur le texte final (3 runs suffisent)

### BLOC 3 — Intégration décisionnelle (quand les données le justifient)
- DUAL_COMBINED : intégrer quand ARC ≠ LOCAL (multi-briques)
- Genius Engine (D2) : backtest 881 œuvres, activation sous-dimension par sous-dimension

### BLOC 4/5 — Genius Engine + Scorer V5
- Le mur sémantique L38 reste le vrai problème
- Le Genius Engine G=(D×S×I×R×V) est la meilleure hypothèse pour l'attaquer
- Nécessite backtest corpus AVANT shadow

---

## 8. RÈGLE ANTI-OUBLI (grille de vérification)

Avant chaque décision future, vérifier :
- Compatible Rosetta ? (features pilotables vs irréductibles)
- Compatible blackbox ? (attracteurs BB-01, BB-C01, BB-C02)
- Compatible L37 ? (subordination = cause, longueur = effet)
- Compatible FR/EN split ? (monocentrique vs polycentrique)
- Compatible OMEGA↔SCRIBE ? (frontière inviolable)
- Shadow-first ? (D1 : 30 runs min, r≥0.60)
- Cause réelle ou symptôme ? (M2 : AUC ≠ causalité)

---

*SESSION_SAVE 2026-03-30 — NASA-Grade L4 / DO-178C Level A*
*HEAD : 7a1c0009 | Tests : 2022 PASS | Branche : phase-r-metrology-rebuild*
*Architecte Suprême : Francky | IA Principal : Claude*
