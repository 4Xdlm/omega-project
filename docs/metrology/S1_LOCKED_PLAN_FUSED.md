# S1 — PLAN VERROUILLÉ FUSIONNÉ (Tribunal 3-IA convergent)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Sources** : Gemini + ChatGPT + Claude, fusionnés
**Principe directeur** : débloquer la **mesure qualité (S1D)** sans la bloquer par l'axe commercial ; ne pas amplifier les erreurs (full-corpus en dernier) ; respecter EMP-17 (reprise ciblée, pas réouverture du cimetière).

---

## ORDRE DE BATAILLE (priorité stricte)

1. **Gold-Set qualité — FINALISÉ** ✅ : v4 scellé (`4388b4b6`), 30/cellule, 0 fuite ; durci S1C+ (93 RESEARCHED_RECORD, 54 NO_EXTERNAL_PRESTIGE_SIGNAL_FOUND, 0 multi-clé). `founding_quality_eligible` tracé.
2. **S1D — MESURE QUALITÉ** (PROCHAINE ACTION) : embeddings `nomic` + challenger (`bge-m3` si FR faible) **vs** juges LLM `qwen3:32b` + `gemma4:31b` (indépendant, anti-circularité), sur le Gold-Set scellé. **Contrastes** : FR MASTER_NATIVE vs D_SOURCE_REAL (fort) ; FR vs C_FORMULAIC (subtil) ; EN MASTER vs C. **Stats militaires** : AUC + IC95 bootstrap 10k **clusterisé par auteur** + test permutation 1000× + K-fold par auteur + FR/EN séparés. **GATE FORK** géométrique vs multi-juges. ⚠️ **non bloqué par l'axe commercial** (qui sert OBJ1bis, pas la discrimination qualité).
3. **Axe COMMERCIAL RESEARCHED + confound** (OBJ1bis) : WebSearch ~19 commerciaux → RESEARCHED ; appliquer §3+§3bis du design (volume d'avis > note ; `era_bucket` + `exogenous_tags` + **baseline marché par décennie** : alphabétisation, taille marché, concurrence média Internet~1995/streaming/BookTok/IA~2023) → 3 niveaux `sales_raw`/`sales_norm_era`/`text_borne_potential`.
4. **Reprise ciblée** : rejouer **H-CROSS-02** (mélancolie×subordination, p=0.061) et **H-PCA-01** (émotion PCA, Δ+0.034 instable) sur les features existantes — PAS tout le cimetière.
5. **Extension FULL-CORPUS** (1698, réutilise features historiques) — **en dernier** (amplifie les erreurs si fait trop tôt).

## INTERDITS (scellés)
- Pas de full-corpus avant Gold-Set scellé. ✅ respecté.
- `COMMERCIAL_SCORE=ESTIMATED` → **jamais** preuve fondatrice (RESEARCHED only pour OBJ1bis).
- Ne **jamais fusionner** prestige et commercial (2 axes orthogonaux).
- Ne pas rouvrir tout le cimetière (seulement H-CROSS-02 / H-PCA-01).
- Pas d'embeddings sur corpus non scellé.
- `CERTAIN` exige source attachée (sinon `EXPERT_PRESELECTION`/`CERTAIN_PENDING_SOURCE`).
- « absence de signal » = `NO_EXTERNAL_PRESTIGE_SIGNAL_FOUND`, jamais « prestige nul prouvé ».

## ÉTAT DOSSIER S1C+ (post-hardening)
- Prestige : 93 RESEARCHED_RECORD (source établie attachée) · 54 NO_EXTERNAL_PRESTIGE_SIGNAL_FOUND · 3 CERTAIN_PENDING_SOURCE.
- Commercial : 4 RESEARCHED (Thilliez, Werber) · ~32 ESTIMATED (à confirmer rail 3) · 60 NOT_PRIORITIZED (masters) · 54 ESTIMATED_LOW.
- 2 axes orthogonaux ; carte prestige×commercial exploitable.

## VERDICT
- **Statut** : plan fusionné VERROUILLÉ ; Gold-Set qualité prêt + durci ; S1D débloqué.
- **Confiance** : Haute.
- **Forces** : ordre qui débloque la mesure qualité sans attendre le commercial ; confound marché/époque intégré ; reprise ciblée respecte EMP-17 ; hardening honnête (absence≠nul).
- **Faiblesses** : (1) S1D quality utilise les 93 founding-eligible — les 54 obscurs-C restent PROBABLE_LOW (acceptable pour le contraste extrême, à noter) ; (2) commercial reste majoritairement ESTIMATED jusqu'au rail 3 ; (3) baseline marché par décennie = collecte à faire (UNESCO/SNE/AAP).
- **Action** : exécuter **rail 2 (S1D mesure qualité)** en autonomie — pré-autorisé par les 3 IA après scellement.
