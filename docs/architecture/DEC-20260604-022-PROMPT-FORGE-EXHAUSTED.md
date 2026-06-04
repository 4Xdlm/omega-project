# DEC-20260604-022 — La forge par prompt est épuisée (clôture de paradigme)

**Statut** : ACCEPTÉ (Tribunal 2/2 + autonomie Architecte, 2026-06-04) · **Type** : décision de paradigme (advisory — ne modifie aucun code moteur) · **Famille** : EMP-16 (preuve avant moteur), EMP-19 (instruments calibrés).

## Contexte
Campagne de forge advisory menée pour déplacer la prose OMEGA V1 vers le cluster des maîtres (radar bge-m3 LOAO + juge gemma4 calibré `ecfb32d6`), à **longueur constante** (thermostat de masse), 1 levier/passe, sans jamais toucher le moteur.

## Preuves accumulées (toutes mesurées, advisory)
| Forge | Leviers | Échelle | Résultat |
|---|---|---|---|
| Forge Chirurgicale | lexicaux : TTR, compression, contraste, rareté bigrammes | 12 cellules (3×4) | **0/12 victoire juge**, Δradar sous-seuil + sign-instable. FAIL. |
| N7 sémantique | scène : sous-texte, focalisation, nécessité images, tension interne, voix + few-shot mimétique | 18 cellules (3×6) | 6/18 victoires (sémantique > lexical), `voice` 2/3, mais **dissociation juge⊥radar** ; mimétique 1/3 décevant. PASS conditionnel. |
| N8 confirmation | voice, internal_tension, subtext | 18 cellules (6×3), règle deux clés | **FAIL** : aucun levier wins≥4/6 + 0 SUSPECT. voice 2/6 (N7 non reproduit). Variance portée par le chapitre, pas le levier. |

## Décision
1. **La forge par prompt (lexicale, sémantique, mimétique) est déclarée ÉPUISÉE.** À longueur constante, aucune directive de surface ne produit un levier de qualité **stable** ET **géométriquement convergent** vers les maîtres.
2. **Aucun levier N7/N8 n'est promu.** voice / internal_tension / subtext restent advisory non adoptés.
3. **Aucune modification moteur.** Aucune fusion combinée. RAG mimétique naïf gelé. **LoRA interdit sans pré-flight L0** (cf `docs/research/L0_LORA_FEASIBILITY_PREFLIGHT.md`).
4. **Doctrine confirmée — Règle des Deux Clés** : une amélioration n'est candidate que si le juge gemma calibré **ET** le radar bge-m3 concordent (juge gagne ∧ radar non dégradé). Le cas `subtext` N8 (3 victoires juge, 2 effondrements radar) prouve la valeur de la double clé : sans elle, on aurait validé une dégradation stylistique (« excellent pulp »).

## Justification (mécanisme)
Un LLM pilote des propriétés distributionnelles de surface via le prompt ; il n'acquiert pas par instruction l'architecture cognitive qui produit le style maître. La variance inter-chapitre observée en N8 (même levier, effet opposé selon le texte) montre que l'effet-prompt est dominé par le contexte, pas par la directive. Pour franchir le plafond, il faut changer **ce que le modèle sait faire** (poids), pas **lui parler plus fort** (prompt).

## Conséquences
- OMEGA V1 = plafond du paradigme actuel (cf `OMEGA_V1_RELEASE_CANDIDATE.md`).
- La voie profonde (modification des poids) est ouverte mais **gatée par L0** (faisabilité, dataset, légalité, protocole, recalibration EMP-19) avant tout entraînement.
- Découverte conservée comme acquis métrologique : **juge ⊥ radar** (axes orthogonaux — engagement narratif vs conformité géométrique). Ni l'un ni l'autre seul ne définit « la grandeur ».

## VERDICT
- Statut : PASS (décision de clôture fondée sur 3 campagnes mesurées convergentes vers le même null). Confiance : Haute.
- Forces : null result robuste et dimensionné ; règle des deux clés validée empiriquement ; aucune dégradation moteur introduite.
- Faiblesses : (1) juge unique gemma (2e juge non disponible, N2) ; (2) variance run température 0.7 ; (3) effets mesurés ~0.005, petit n — un effet réel minuscule n'est pas exclu mais non exploitable.
- Risques restants : sur-conclure « rien n'est pilotable » ; mitigé par le coût/bénéfice (un n=20 pour un effet sous-seuil non convergent n'est pas justifié).
- Action requise : Architecte tranche L0 (lancer le pré-flight LoRA doc-only) vs réorientation (axe commercial book-pipeline). Aucune action moteur sans GO.
