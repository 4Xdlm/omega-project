# L0 — Stratégie de dataset LoRA (doc-only)

**Date** : 2026-06-04 · **Parent** : [L0 Preflight](L0_LORA_FEASIBILITY_PREFLIGHT.md). But : trancher QUOI apprendre au LoRA, sous contrainte légale et anti-pastiche.

## Deux cadrages possibles

### Cadrage A — Imitation des maîtres (DÉCONSEILLÉ)
Entraîner sur des textes de maîtres (Flaubert, Proust, Ernaux…) en espérant que le générateur « devienne maître ».
- **Risques majeurs** : pastiche / sur-style ; **copie verbatim** (le modèle régurgite des phrases d'auteurs) ; perte de la voix OMEGA ; prose précieuse artificielle.
- **Bloquant légal** : les maîtres modernes (Ernaux, Modiano, Duras, NDiaye, Echenoz, Tournier…) sont **sous droits** ; le corpus `livres_payants` est à usage interne et **ne peut PAS être reproduit ni servir de cible d'entraînement diffusable**. Seuls les auteurs du domaine public (Flaubert, Proust ≈ selon juridiction) seraient utilisables — couverture stylistique trop étroite.
- **Verdict** : déconseillé (risque copyright + pastiche).

### Cadrage B — Correction supervisée OMEGA→amélioré (RECOMMANDÉ)
Entraîner sur des **paires** : `prose OMEGA faible/mixed` → `version corrigée haut niveau`. Le LoRA apprend **comment élever OMEGA**, pas **comment imiter Proust**.
- **Avantages** : pas de reproduction de texte sous droits (les deux côtés de la paire sont de la prose OMEGA ou dérivée OMEGA) ; cible = la voix OMEGA améliorée, pas un auteur ; supervised improvement mesurable (avant/après sur la même histoire).
- **Source des « versions corrigées »** : (i) réécritures validées par l'Architecte (œil humain = vérité) ; (ii) candidates issues des forges N7/N8 qui ont gagné le juge **ET** non dégradé le radar (rares mais réelles : ex. low/voice STRONG) — à filtrer par la règle des deux clés ; (iii) éventuellement réécritures Anthropic API (qualité haute) validées humainement.
- **Verdict** : **recommandé** — propre légalement, aligné sur l'objectif (élever OMEGA, pas copier).

## Paramètres dataset à fixer (si GO)
- **Langue** : FR d'abord (cœur OMEGA), EN différé.
- **Taille** : L1 = 50 paires pilote (micro-test faisabilité) ; viable ≈ plusieurs centaines pour un effet réel (à confirmer).
- **Format** : JSONL `{prompt: <instruction+texte OMEGA>, completion: <version corrigée>}` ou format chat selon outil.
- **Anti-copie** : filtrer toute paire dont la complétion contient des n-grammes longs d'œuvres sous droits ; vérifier que les corrections sont des réécritures, pas des collages.
- **Anti-overfit** : diversité de scènes/tons ; holdout de paires pour L3.

## Contrainte copyright (rappel SSOT)
`livres_payants` = usage interne mesure uniquement, **jamais** reproduit dans le repo ni utilisé comme cible d'entraînement redistribuable. Le cadrage B évite intégralement ce problème (cible = prose OMEGA).

## VERDICT
- Statut : PASS (stratégie tranchée, recommandation claire). Confiance : Haute sur le choix B ; Moyenne sur la taille viable (non mesurée).
- Forces : évite le mur copyright ; objectif aligné (améliorer OMEGA ≠ imiter) ; source de paires identifiée (réécritures validées + gagnants deux-clés).
- Faiblesses : (1) constituer des « versions corrigées » de qualité = coût humain (curation Architecte) ; (2) taille viable inconnue ; (3) si les corrections viennent du même générateur, risque de plafond circulaire — préférer validation/édition humaine.
- Action requise : Architecte valide le cadrage B (ou A) et autorise la constitution L1 (50 paires pilote). Aucun entraînement sans cette validation.
