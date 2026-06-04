# N8 — Confirmation sémantique dimensionnée (règle des deux clés)

**Date** : 2026-06-04 · **Générateur/Juge** : gemma4:31b (juge calibré `ecfb32d6`, double-ordre) · **Radar** : bge-m3 LOAO · **Standard** : EMP-16, EMP-19. Advisory, **zéro modif moteur**.
**Directive Tribunal 2/2** : confirmer/réfuter les candidats N7 (`voice`, `internal_tension`, `subtext`) sur n≥6 chapitres distincts ; règle des deux clés (juge + radar) ; PASS levier = **wins≥4/6 ET 0 SUSPECT ET length 6/6** ; + autopsie de la zone morte mixed ; Gemma seul (N2/EMP-19) ; mimetic/RAG gelés, LoRA HOLD.

## Protocole
6 chapitres distincts (2 low, 2 mixed, 2 master) de 6 sessions BOOK_FULL différentes × 3 leviers sémantiques, 1 levier/passe, thermostat ±10 %, double-ordre pairwise + radar avant/après. 18 cellules. Règle des deux clés graduée : STRONG (juge gagne ∧ radar↑) / CANDIDATE (juge gagne ∧ radar légèrement↓) / SUSPECT (juge gagne ∧ radar s'effondre ≤−0.005) / COSMETIC (radar↑ ∧ juge ne gagne pas) / TIE / LOSS.

## Résultat : VERDICT = FAIL (aucun levier ne passe)

| Levier | victoires juge | STRONG | SUSPECT | Δradar moyen | length | PASS |
|---|---|---|---|---|---|---|
| voice | 2/6 | 1 | 0 | −0.00055 | 6/6 | ✗ |
| internal_tension | 1/6 | 0 | 1 | −0.00170 | 6/6 | ✗ |
| subtext | **3/6** (plus de victoires juge) | 0 | **2** | −0.00285 | 5/6 | ✗ |

Aucun levier n'atteint le bar (wins≥4/6 + 0 SUSPECT + length 6/6).

## Lecture — ce que la dimension révèle

1. **Le signal N7 ne se reproduit pas à n=6.** `voice` faisait 2/3 en N7 → **2/6** en N8. `internal_tension` (pic radar +0.0066 en N7 sur le chapitre low) → sur le **même** chapitre en N8 : TIE, Δradar −0.0024. La variance inter-run (température 0.7) et inter-chapitre **domine** l'effet du levier. Un résultat 2/3 sur micro-échantillon était de l'optimisme de petit n.

2. **La variance est portée par le CHAPITRE, pas par le levier.** Sur le 2ᵉ chapitre low (233077701/ch03), les 3 leviers donnent COSMETIC : **radar monte fort (+0.0069/+0.0076/+0.0069) mais le juge fait TIE**. Sur le 1er chapitre low, l'inverse (juge gagne, radar plat). Même levier, comportement opposé selon le texte. → on n'isole pas un effet-levier stable.

3. **La règle des deux clés tue les candidats — et c'était son rôle.** `subtext` gagne le plus souvent le juge (3/6) **mais 2 de ces victoires coïncident avec un effondrement radar** (SUSPECT : mixed −0.011, master −0.0076) + 1 perte de matière (length 5/6). C'est le profil « excellent pulp » prédit par le Tribunal : le juge aime, la géométrie maître s'éloigne. La double clé l'écarte à raison.

4. **Autopsie de la zone morte mixed — confirmée comme artefact de données.** Un des 2 chapitres mixed (125356560/ch01) est **dégénéré** : longueur de phrase moyenne **4 mots**, taux de répétition de trigrammes **0.80** (80 %). Texte télégraphique/quasi-listé → intransformable, le juge tie tout. L'autre mixed (219750367/ch01) a une densité explicative élevée (2.67/1000, « il pensait / se sentait »). La « zone morte » des forges précédentes n'est donc pas un échec de levier mais en partie un **packet/chapitre dégénéré** dans l'échantillon.

## Conclusion — fermeture de la voie « forge par prompt »
Lexical (Forge Chir) = 0 victoire validée. Sémantique (N7→N8) = signal réel au juge mais **non reproductible et non dual-key à n=6**. **À longueur constante, aucune directive de prompt (lexicale ou sémantique) ne produit un levier de qualité stable ET géométriquement convergent.** EMP-16 (3 preuves convergentes) : très loin du compte. La grandeur manquante n'est pas pilotable par instruction de surface — ni métrique, ni sémantique-déclarative.

## VERDICT
- **Statut : FAIL** (aucun levier ne passe la règle des deux clés à n=6). **Confiance : Haute** (n=6, 6 livres distincts, double-ordre, thermostat 17/18 — 1 perte matière subtext, autopsie mixed concluante).
- **Forces** : dimension a démasqué l'optimisme N7 ; règle des deux clés opérationnelle et discriminante ; zone morte mixed expliquée (chapitre dégénéré) ; honnêteté du FAIL.
- **Faiblesses** : (1) juge unique gemma (pas de 2e juge — choix assumé N2/EMP-19) ; (2) température 0.7 → variance run élevée (un protocole à seed fixe réduirait le bruit) ; (3) 1 chapitre mixed dégénéré a pollué la bande mixed ; (4) n=6 reste modeste pour des effets ~0.005.
- **Risques restants** : conclure trop vite que « rien n'est pilotable » — la variance run/chapitre masque peut-être un petit effet réel ; mais le coût d'un n=20 pour un effet sous-seuil non convergent n'est pas justifié.
- **Action requise (Architecte)** : décision. Recommandation : **clore la voie forge-par-prompt** (lexicale + sémantique épuisées). La grandeur n'étant pilotable ni par métrique ni par instruction de scène à longueur constante, le levier restant cohérent est la **modification profonde des poids (LoRA sur corpus maîtres)** — coûteuse, déclenche recalibration EMP-19 complète, donc à n'engager que sur décision explicite. Alternative : accepter OMEGA V1 comme plafond du paradigme actuel et réorienter. **Aucune fusion, aucun gate, aucun LoRA sans GO.**
