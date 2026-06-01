# OMEGA — COMMANDES DE RÉVEIL (copier-coller, terminal Architecte)

**Date prépa** : 2026-06-01 nuit · Pour : Francky au réveil. **Tout est prêt. Tu n'as qu'à coller.**
Branche : `phase-r-dispatcher-v33` · HEAD au coucher : `f8619c0c` (vérifier sync ci-dessous).
**Aucune de ces commandes ne modifie le code moteur ni un seuil.** Ce sont des mesures (Ollama) + analyses (CALC). Doctrine EMP-16 : aucun patch moteur tant que 3 preuves ne convergent pas.

---

## 0. Setup terminal (une fois)
```powershell
cd C:\Users\elric\omega-project
git fetch --all; git status -sb        # doit être à jour origin, tree clean
cd packages\sovereign-engine
$env:ECC_K='1'                          # juge déterministe (prouvé WS-B0c) -> k=1 suffit
```

## 1. PREUVE R2.1 — sémantique vs keyword (la plus importante) ~15-40 min
Mesure : capteur sémantique `scoreSensoryDensity` vs keyword sensory/corporeal, sur maîtres + ALTERNANCE (+ goldens si dispo), avec contre-test adversarial keyword-stuffing.
```powershell
npx tsx ..\..\scripts\metrology\wsd-r2-semantic-rescore.ts
```
Sorties : `docs\audit\calibration\WS_D_R2_SEMANTIC_RESCORE.{json,csv}`.
**Optionnel — 3e corpus goldens** (prose OMEGA réelle ; pointe vers un dossier de .txt prose) :
```powershell
$env:R2_GOLDENS_DIR='C:\chemin\vers\prose_golden_txt'   # ex. extraits BOOK_FULL/PROD_REVELATION
npx tsx ..\..\scripts\metrology\wsd-r2-semantic-rescore.ts
```
**Critère (EMP-16, à lire dans le SUMMARY)** : sur CHAQUE corpus — (a) sémantique FR≈EN (|Δ|<10), (b) Δ_sem_stuff ≈ 0 alors que Δ_kw_stuff grand. 3/3 → R2.1 prouvé. 1 diverge → STOP.

## 2. PREUVE ECC then/now (juge LLM reproductible) ~10-20 min — si pas déjà fait
```powershell
npx tsx ..\..\scripts\metrology\wsb0c-ecc-then-now.ts
```
Sorties : `docs\audit\minaxis\JUDGE_DRIFT_ECC_THEN_NOW.{md,csv}`.

## 3. (Re)mesures CALC autonomes — instantanées, 0 Ollama (sanity/réplique)
```powershell
node "C:\Program Files\nodejs\node.exe" ..\..\node_modules\tsx\dist\cli.mjs ..\..\scripts\metrology\wsd-r1-triple-proof.ts      # triple-preuve R1 (DIVERGE attendu)
node "C:\Program Files\nodejs\node.exe" ..\..\node_modules\tsx\dist\cli.mjs ..\..\scripts\metrology\wsd-axis-correlation.ts      # interconnexions
node "C:\Program Files\nodejs\node.exe" ..\..\node_modules\tsx\dist\cli.mjs ..\..\scripts\metrology\wsd-shadow-double-verdict.ts  # double-verdict OLD/NEW
```
(En terminal normal `npx tsx <script>` suffit ; la forme node-full-path est pour shell sans npx.)

## 4. Après les runs : me coller les SUMMARY
Colle ici les blocs `=== SUMMARY ===` de R2.1 (et ECC then/now). J'analyse la convergence 3/3 et je rédige le verdict. **Si convergence → on prépare le patch moteur R2 (voir `R2_ENGINE_CODE_PLAN.md`), gaté EMP-10. Si divergence → STOP, on réexamine.**

---

## Notes
- Tout tourne dans TON terminal car 4/5 axes + le sémantique = Ollama (le shell de Claude ne résout pas `node` imbriqué de l'ollama-provider).
- Les scripts sont **resumable/idempotents** en lecture ; ils n'écrivent que des fichiers d'audit (jamais le moteur).
- Provenance : chaque mesure macro est loggée (DEC-014) dans les JSONL d'audit.
- En cas de `JSON parse failed` Ollama (vu en WS-C sur AAI) : marginal (fallback) ; à corriger avant le méga-bench WS-D (noté dans le plan).
