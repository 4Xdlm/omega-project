# C8 — SIX GREFFES SUR LA BOUCLE SOUVERAINE (BF-08) — EVIDENCE PACK

**Date** : 2026-06-06 · **GO** : Architecte (ordre exact : N2 → DriftRule d'implication → amorces variées → juge étage B → repeat inter-chapitres → cap 60k) · **Batterie finale : tsc 0 · 137/137 ×2 · canon-kernel 67 · truth-gate 217 = 421 verts zéro régression** (+19 tests C8).

## VERDICT : **PASS — 6/6 greffes construites et prouvées · RUN 60K LANCÉ (détaché)**

| Greffe | Module | Lois prouvées (tests) |
|---|---|---|
| **C8.1 N2 (RATIFIÉ)** | `loop/n2-retry.ts` | gabarit FIGÉ hashé (`N2_TEMPLATE_SHA256`) ; éligibilité **rail-truth-only** (« Léna est déterminée » ⇒ INÉLIGIBLE `NO_TRUTH_BASIS` ; verrou spec et rail truth ⇒ éligible) ; FORBID-011 (low-conf inéligible) ; MISSING inéligible (corrigé par plan) ; **≤2 retries** (3ᵉ ⇒ refus) ; **audit FORBID-006 À LA CONSTRUCTION** (coaching dans le fait ⇒ tentative INVALIDE jamais émise) |
| **C8.2 Implication de rôle (D1)** | `loop/implication-gate.ts` | **LE cas réel de la revue attrapé** : « tablier » + « boulangerie » autour de Léna-enquêtrice ⇒ `ROLE_IMPLICATION_DRIFT` faisceau cité ; 1 terme isolé ⇒ silence (anti-faux-positif, MIN_HITS=2) ; rôle non verrouillé ⇒ silence ; déterminisme ×2 ; **ADVISORY/shadow** (passage dur = mesure multi-livres, EMP-16) |
| **C8.3 Amorces variées (D2)** | `loop/incipit.ts` | 7 directives d'ATTAQUE distinctes (forme d'ouverture, pas coaching — **toutes auditées FORBID-006 propres**) ; métrique `incipitDivergence` : clones ⇒ <0.2, attaques distinctes ⇒ >0.8 (shadow) |
| **C8.4 JudgePort (étage B)** | `loop/judge-port.ts` | **refus PAR CONSTRUCTION de tout profil non APPROVED** (PROPOSED/EXPIRED/DISQUALIFIED ⇒ erreur typée ; APPROVED sans approbateur ⇒ refus) ; tournoi pairwise **DOUBLE-ORDRE** : point ssi préférence CONCORDANTE (un juge 100% biaisé-position marque ZÉRO point — anti-biais par design) ; bonus borné EXPERIMENTAL |
| **C8.5 Repeat inter-chapitres** | `loop/cross-chapter-repeat.ts` | tic trans-chapitres détecté (trigrammes de contenu ≥k chapitres, stopwords exclus) ; divergence d'incipit adjacente ; near-dup de phrases (Jaccard) — SHADOW (héritage forensic OMEGA_REPEAT) |
| **C8.6 Cap 60k** | `loop/chapter-extender.ts` + runner | BB-02 trans-modèle assumé : extension = continuations BORNÉES (≤3 segments) sur la traîne du GAGNANT, consigne FIGÉE auditée, **filet BF-02 à CHAQUE segment** (refus ⇒ arrêt PROPRE) ; `chaptersFor` honnête (60k@600 ⇒ 100 chap ; @1500 ⇒ 40) |

## DEUX JUGES CALIBRÉS (campagnes complètes 28 appels chacun, double-ordre, profils PROPOSED)
| Couple | accuracy | position_bias | invalid | Verdict |
|---|---|---|---|---|
| **gemma4:31b réinstallé** + persona | **0.929** | **0.000** | 0 | CANDIDATE_OK_PENDING_FULL_PROTOCOL |
| **qwen3.5:35b-a3b** + persona | 0.857 | −0.071 | 0 | CANDIDATE_OK_PENDING_FULL_PROTOCOL |
Profils : `runs/c7_calibfull_{gemma,qwen35}_profile_PROPOSED.json` — **l'APPROVED = signature Architecte** ; dès signature, `openJudgePort` accepte et l'étage B tourne.

## RUN 60K (lancé 13:06, détaché, crash-safe)
`runs/c8_book60k/` : 50 chapitres × [N=7 + extension gagnant ≤2 continuations @1400 mots cible] ≈ 450 générations qwen3.5 ≈ 50-70 min. MANUSCRIT.md incrémental, admissions rejouables, candidats persistés (FORBID-007). Suivi : `Get-Content packages/book-factory/runs/c8_book60k/progress.log -Tail 10`.

## LIMITES DÉCLARÉES
1. Implication-gate : table de métiers v1 (4 métiers) — extensible ; advisory only. 2. JudgePort réel non activé (aucun profil APPROVED — gaté signature). 3. Seuils C8 = EXPERIMENTAL_DEFAULTS (EMP-16). 4. Confound traduction des paires de calibration documenté (zéro populaire FR natif au corpus). 5. 60k réel dépend du rendement d'extension observé (information honnête : si segments moyens 500w ⇒ ~1500w/chap ⇒ 50 chap ≈ 70-75k visé, marge).
