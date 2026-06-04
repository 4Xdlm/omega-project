# L1 Phase A — Mining dataset cadrage B (rapport)

**Date** : 2026-06-04 · **Parent** : [L1 Roadmap](L1_AUTONOMOUS_ROADMAP_10H.md). Ollama-only (gemma4 + bge-m3), zéro moteur, zéro entraînement.

## Objectif
Miner des paires `OMEGA-faible → réécriture` qui **améliorent réellement** (Règle des Deux Clés STRONG : juge gemma calibré préfère la réécriture ∧ radar bge-m3 non dégradé), pour constituer un dataset SFT cadrage B.

## Résultat — DATA-STARVATION confirmée
- **15 cellules** minées (chapitres N5 × leviers voice/internal_tension/subtext), thermostat de masse.
- **1 seule paire STRONG** acceptée (dR radar +0.002). **Rendement ≈ 6.7 %.**
- Échantillon stoppé : la conclusion est stable (cohérente avec N8 : ~7-11 % au fil des runs).

## Lecture
Confirmation directe et quantifiée du résultat N7/N8 : à longueur constante, gemma4 **améliore rarement** la prose OMEGA de façon convergente (juge + radar d'accord). Mécaniquement : la réécriture change le texte, mais le juge la trouve équivalente (TIE) ou le radar s'éloigne du maître — STRONG est rare. **Un SFT cadrage B est donc data-starved** : ~1 paire utile / 15 tentatives → constituer 50 paires exigerait ~750 générations (~15-20 h gemma) pour un dataset qui, de plus, ne dépasse pas le « meilleur réécrit gemma » (plafond bas).

## Conséquence — pivot recommandé
SFT cadrage B = **non viable** en l'état (rendement trop bas, plafond faible). → **DPO/préférence** (cf [L1_DPO_DESIGN.md](L1_DPO_DESIGN.md)), qui n'exige pas de paires same-content améliorées :
- **DPO-1 self-preference (recommandé)** : chosen = sorties OMEGA scorées HAUT, rejected = scorées BAS. Données déjà disponibles (N5 télémétrie + benches + goldens), **copyright-clean** (100 % OMEGA).
- La faisabilité technique du LoRA 31B est **déjà prouvée** (PASS_31B, VRAM 22.9/32 Go).

## Artefacts
`l1_dataset/L1_DATASET_pairs.jsonl` (1 paire STRONG), `l1_dataset/_mining.log`, `l1_mine_dataset.py`. Dataset conservé mais **insuffisant pour entraîner** seul.

## VERDICT
- Statut : **FAIL viabilité dataset cadrage B** (rendement 6.7 %, data-starved). Finding net. Confiance : Haute (cohérent N7/N8).
- Forces : confirme quantitativement la rareté des améliorations same-content ; oriente vers DPO sur preuve, pas supposition ; copyright respecté.
- Faiblesses : (1) n=15 (mais conclusion stable) ; (2) leviers limités aux 3 candidats N7/N8 ; (3) best-of-1 (best-of-N augmenterait un peu le rendement mais pas l'ordre de grandeur).
- Action requise : **décision Architecte sur la voie data** — DPO-1 self-preference (recommandé) / DPO-3 hybride / abandon training. Le LoRA technique est prêt ; il manque la stratégie de données validée.
