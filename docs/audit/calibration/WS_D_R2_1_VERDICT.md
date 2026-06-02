# WS-D R2.1 — VERDICT : preuve forte sur maîtres, triple-preuve NON atteinte → STOP

**Date** : 2026-06-02 (run Architecte, Ollama qwen3:32b, k=1). Sous EMP-16 (3/3 stricts). Données : `WS_D_R2_SEMANTIC_RESCORE.{json,csv}`.

## 1. Résultats
| Corpus | n | sem FR | sem EN | Δ langue | Δ_kw_stuff | Δ_sem_stuff | verdict |
|---|---|---|---|---|---|---|---|
| **maîtres** | 18 | 19.2 | 16.4 | **2.8** (<10 ✓) | **+55.6** | **+3.4** | **CONVERGE (3 critères)** |
| ALTERNANCE | 9 | 67.7 | — (0 EN) | N/A | +15.6 | +13.1 | **INCONCLUANT** (dégénéré) |
| goldens | 0 | — | — | — | — | — | **MANQUANT** |

## 2. Lecture
- **Maîtres (corpus discriminant, non-saturé)** : le capteur sémantique `scoreSensoryDensity` est (a) **non biaisé langue** (FR 19.2 ≈ EN 16.4) — corrige le biais FR-only du keyword (FR 52 / EN 35) ; (b) **non-gameable** (stuffing → +3.4 vs keyword +55.6). → La thèse R2 (sémantique > keyword) est **confirmée fortement** sur le corpus où le test est valide.
- **ALTERNANCE = test dégénéré, PAS une divergence** : (1) 0 passage EN → biais-langue intestable ; (2) keyword saturé ~84-100 → ne peut pas bondir (Δ+15.6 = effet plafond), gameabilité intestable ; (3) Δ_sem +13 = artefact de longueur (phrase de stuffing ≈ poids fort sur prose courte ~450 mots ALTERNANCE vs dilution sur maîtres ~1400 mots — le texte devient *réellement* plus sensoriel, le LLM le note correctement ; ce n'est pas du gaming).
- **Goldens manquant** (`R2_GOLDENS_DIR` non passé).

## 3. VERDICT EMP-16 : 1 PASS fort + 2 inconcluants → **3/3 NON atteint → STOP. Pas de code.**
Ce n'est pas une divergence (cf. R1) : le seul corpus où le test est *valide* (maîtres, non-saturé, bilingue) converge nettement. Mais EMP-16 exige **3 corpus indépendants où la preuve est valide**. Il faut donc compléter le protocole, pas conclure.

## 4. Correctifs de protocole (avant re-run)
1. **Test adversarial contrôlé en longueur** : insérer la phrase de stuffing **proportionnellement** (ou tronquer les passages à longueur égale) pour éliminer l'artefact (ALTERNANCE Δsem +13 vs maîtres +3). Mesurer Δ par 100 mots.
2. **2 corpus supplémentaires NON-saturés ET bilingues** : ALTERNANCE (FR-only, keyword-saturé) ne convient pas. Candidats : (a) **plus de maîtres EN** (sous-échantillon EN distinct) ; (b) **prose commerciale / best-sellers FR+EN** (non-saturée) ; (c) **mauvaise prose** (référence basse). Idéalement : maîtres-EN, best-sellers, mauvaise-prose → 3 corpus où keyword n'est pas au plafond.
3. **Goldens** : fournir `R2_GOLDENS_DIR` (prose OMEGA réelle, .txt) — mais note : OMEGA-output sature le keyword (circularité prouvée Δ+42/+67) → goldens utiles pour la circularité, pas pour le test de gameabilité (saturés comme ALTERNANCE).

## 5. Ce qui est ACQUIS (à ne pas re-prouver)
- Le sémantique `scoreSensoryDensity` corrige le biais langue (FR≈EN) ET résiste au stuffing — **prouvé sur maîtres**. C'est le candidat de remplacement R2.1.
- Le keyword sensory est biaisé (FR>EN) ET gameable (+55.6) — **prouvé**.
- ECC LLM **reproductible** (std=0) ; dérive then/now inconcluante (confond-contrat) — inchangé.

## VERDICT
- Statut : STOP (preuve forte 1 corpus, triple-preuve incomplète — protocole à compléter, pas de divergence).
- Confiance : Haute sur maîtres ; le test ALTERNANCE est invalide (saturation+langue+longueur).
- Action requise : (1) test adversarial length-normalisé ; (2) 2 corpus non-saturés bilingues (maîtres-EN / best-sellers / mauvaise-prose) ; (3) re-run → 3/3 sur corpus VALIDES avant tout code R2 (EMP-16). Aucun code engagé.
