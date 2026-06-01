# NCR-KEYWORD-SENSOR-SYSTEMIC-BIAS : la mesure par mots-clés contamine le jugement OMEGA

**Status** : OPEN_DIAGNOSED · **Severity** : HIGH · **Date** : 2026-06-01
**Origine** : autopsie IFI (WS-D, `IFI_AUTOPSY_REPORT.md`) + audit keyword (`KEYWORD_SENSOR_SYSTEMIC_AUDIT.md`, `SENSOR_CABLE_MAP.md`).

## Issue
Plusieurs sous-capteurs CALC du juge OMEGA mesurent par **comptage de mots-clés / lexique statique**, et non par une propriété littéraire réelle. Conséquences prouvées :
- **IFI/sensory_richness** : mots-clés FRANÇAIS uniquement (code : « FR PREMIUM — pas de marqueurs EN ») → maîtres anglais sous-cotés (FR 37.7 / EN 28.8 ; pire = 0).
- **IFI/corporeal_anchoring** : LANGUAGE_BIASED (FR 33.1 / EN 20.0, Δ−13.1) + plancher (médiane 16.7).
- **SII/anti_cliche** : sature à 100 partout (ne mesure rien sur les maîtres).
- **RCI/signature + hook** : PACKET_DEPENDENT (vide → 60/85 ; plein → 100) — déjà NCR_RCI.
- **ECC/tension_14d** : fallback keyword émotion (canon 14D mort) quand le sémantique est off — déjà WS-A.2.

C'est un **pattern systémique**, pas un incident isolé : même classe que emotion-14D (garagé). Le min_axis et le composite héritent de ces biais → l'étalonnage des paliers (0/95 maîtres au SEAL 93) était faussé en partie par ces capteurs.

## Mécanisme (pourquoi ça marche / quand ça échoue)
Un compteur de mots-clés FR mesure « le texte contient-il ces mots français ». Il échoue : (a) sur toute autre langue (EN), (b) sur l'expression indirecte/métaphorique de la même propriété, (c) il sature ou plancher (anti_cliche=100, corporeal=16.7). Il ne capture pas la sémantique → ce n'est pas une mesure de qualité.

## Capteurs SAINS (à préserver)
LLM (emotion_coherence, interiority, impact, show_dont_tell, authenticity, necessity, metaphor_novelty, focalisation) + CALC structurel (rhythm, euphony, attention, fatigue). Langue-neutres, discriminants.

## Options
1. **Statu quo** : garder les capteurs keyword. Risque : tout étalonnage et tout seuil restent faussés (langue + littéralité). REJETÉ.
2. **Assainir le min_axis (R1) + remplacer par sémantique (R2)** : sortir sensory/corporeal du floor, reclasser signature/hook (packet-completeness), remplacer le comptage par LLM léger / embeddings langue-aware. Découpler intrinsèque/conformité. **Recommandé**, via shadow bench (DEC-016).
3. **Bilinguiser les listes (ajouter mots EN)** : améliore le symptôme mais reste du keyword (même maladie). NON recommandé seul.

## Decision
**PENDING Architecte.** Audit FAIT (capteurs classés, registre `KEYWORD_SENSOR_REGISTRY.csv`). **INTERDIT** : retirer/patcher un capteur ou changer un seuil avant shadow bench. Aucun patch tant que ce NCR est OPEN. Lié à NCR_RCI_SENSOR_DEFECT, NCR_ECC_CONTRACT_SENSOR, NCR_IFI_AXIS_CONTRACT_DEPENDENCY, FORBID-CANON-GARAGE-001 (emotion-14D).

## Verdict
- Statut : OPEN_DIAGNOSED · Confiance : Haute (biais FR/EN mesurés, méthodes lues dans le code).
- Action requise : décision Architecte sur R1/R2 ; remédiation via WS-D + shadow bench, jamais en prod sans preuve.
