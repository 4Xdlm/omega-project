# OMEGA — AUDIT BLACK-BOX : CONTRAINTES LITTÉRAIRES DE CLAUDE SONNET
**Date** : 2026-03-28
**Modèle** : claude-sonnet-4-20250514
**Méthode** : Audit empirique black-box — zéro exfiltration
**API calls** : 0
**Tokens consommés** : 0
**Résultats totaux** : 354

---

## PROTOCOLE

Audit en 6 blocs :
1. **Baseline spontanée** — 90 échantillons
2. **Compréhension des consignes** — 144 échantillons
3. **Plafonds mécaniques** — 78 échantillons
4. **Attracteurs** — 24 échantillons
5. **Conflits** — 18 échantillons
6. **Synthèse** — analyse pure (pas d'API)

## STATUT

Toutes les conclusions sont classées :
- **OBSERVÉ** — mesuré directement
- **INFÉRÉ** — déduit des mesures
- **NON PROUVÉ** — hypothèse non vérifiable

## DONNÉES

Fichiers JSON produits dans `src/scoring/data/` :
- CLAUDE_BLACKBOX_BASELINE.json + _RAW.json
- CLAUDE_BLACKBOX_INSTRUCTION_COMPLIANCE.json + _RAW.json
- CLAUDE_BLACKBOX_CEILINGS.json + _RAW.json
- CLAUDE_BLACKBOX_ATTRACTORS.json + _RAW.json
- CLAUDE_BLACKBOX_CONFLICTS.json + _RAW.json
- CLAUDE_BLACKBOX_LAWS.json

## AVERTISSEMENT

Ce rapport documente des **contraintes observées en sortie**, pas des règles internes.
Aucune tentative d'extraction de system prompt, consignes cachées, ou secrets internes.
