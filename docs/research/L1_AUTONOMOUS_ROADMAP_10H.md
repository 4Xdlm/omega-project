# L1 — Feuille de route autonome 10h (LoRA V2 pilote)

**Date** : 2026-06-04 ~20h45 · **Mandat** : Architecte « 10h autonomie, contrôle via dispatch ». **Garde-fous permanents** : adapter réversible (base figée), advisory only, **aucun gate / SEAL / intégration moteur**, recalibration EMP-19 avant toute affirmation post-LoRA, **STOP avant décision d'intégration** (= Architecte). Mesures Ollama-local ; Anthropic API réservée validation finale.

## Dépendances & coordination GPU
- Download `gemma-4-31b-it` (62.6 Go, ~6 Mo/s, réseau) tourne en fond → waiter auto-loadtest armé.
- Le mining de dataset (Phase A) utilise le GPU via Ollama (gemma4). Le load-test 31B utilise aussi le GPU. **Sérialisation** : le waiter ne lance le load-test que lorsque `_resume_done.txt` ET `_mining_done.txt` existent (stoppe Ollama à ce moment seulement). → mining et download en parallèle, load-test après les deux.

## Phases

### Phase A — Mining dataset cadrage B (NOW, model-independent, Ollama)
Miner des paires `OMEGA-faible → réécriture améliorée` qui passent la **Règle des Deux Clés** (juge gemma calibré gagne ∧ radar bge-m3 non dégradé = STRONG). Sur les 42 chapitres N5, best-of-2 sur leviers sémantiques (voice/internal_tension/subtext), thermostat de masse, écriture **incrémentale crash-safe** en JSONL (format chat Gemma). Mesure du **rendement** (combien de paires STRONG / tentatives).
- Sortie : `L1_DATASET_pairs.jsonl` + `L1_MINING_REPORT.md`.
- **Gate de décision** : si rendement ≥ ~30 paires STRONG → dataset pilote viable → Phase C (LoRA). Si < ~15 → **data-starvation** = finding → pivot **Phase B'** (DPO/préférence).

### Phase B' (fallback si mining pauvre) — Formulation DPO/préférence
Si les paires same-content améliorées sont trop rares (probable vu N8), pivoter vers **préférence non-appariée** : `preferred` = prose maître/golden mesurée haut, `rejected` = pulp/OMEGA-faible. Exploite le Gold-Set existant (copyright : usage interne, JAMAIS reproduit dans le repo — dataset référence des hashes/chemins, pas le texte). DPO/ORPO n'exige pas de paires same-content. Doc de design `L1_DPO_DESIGN.md`.

### Phase C — LoRA pilote (gated : load-test PASS_31B ∧ dataset viable)
- L2 : QLoRA sur le dataset pilote (gemma-4-31b-it 4-bit, r=16, q/k/v/o, gradient checkpointing, 1-3 epochs, seq court). Adapter sauvé (réversible).
- L3 : éval avant/après **deux clés + échantillons générés** sur holdout jamais vu. Anti-copie, anti-triche-longueur.
- L4 (doc) : plan recalibration EMP-19 du générateur LoRA.
- **STOP** : verdict PASS/FAIL ; décision d'intégration = Architecte (L5).

### Phase D — Consolidation
Rapports + verdicts + `log_quality.md` + commits + MAJ mémoire à chaque jalon. Si tout bloque (download/loadtest échouent), Phase A+B' (dataset+design) restent livrables ; rapport d'état honnête.

## Ordre d'exécution réel
1. NOW : Ollama up → lancer mining (Phase A) détaché + patcher waiter (dual-flag).
2. Download finit → mining fini → load-test 31B auto → verdict.
3. Si PASS_31B ∧ dataset viable → Phase C (LoRA pilote). Sinon Phase B' (DPO design) ou rapport data-starvation.
4. Consolidation continue, commits réguliers.

## VERDICT (plan)
- Statut : PLAN. Confiance : Haute sur Phases A/B'/D (autonomes, sûres) ; Moyenne sur Phase C (dépend load-test PASS + rendement dataset).
- Garde-fous : réversibilité, advisory, zéro intégration sans Architecte, recalibration EMP-19, copyright respecté (pas de texte maître dans le repo).
- Action : exécution autonome ; points d'arrêt = décision d'intégration (Architecte) + tout `STOP_ARCHITECT_ARBITRATION`.
