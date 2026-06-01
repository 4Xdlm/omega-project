# IFI AUTOPSY — pourquoi l'axe-tueur coule les maîtres (WS-D Phase 0.5)

**Date** : 2026-06-01 · **Mode** : CALC déterministe, READ-ONLY, **autonome** (0 Ollama). 0 patch.
**Outil** : `scripts/metrology/wsd-ifi-autopsy.ts` (EXIT 0). 95 passages maîtres.
**Méthode** : IFI = sensory_richness·0.25 + corporeal_anchoring·0.25 + focalisation·0.25(LLM) + attention·0.125 + fatigue·0.125. Les 4 sous-axes CALC répliqués fidèlement (`macro-axes.ts:776,824` + `scoreAttentionSustain/scoreFatigueManagement` exportés). Focalisation (LLM, 0.25) non mesurée ici — non nécessaire, le CALC suffit à expliquer la chute.

## 1. Décomposition (95 passages maîtres)

| Sous-axe IFI | méthode | moyenne | p50 | verdict |
|---|---|---|---|---|
| **sensory_richness** | CALC keyword | **35.4** | 40 | **EFFONDRÉ** |
| **corporeal_anchoring** | CALC keyword | **29.7** | 16.7 | **EFFONDRÉ** |
| attention | CALC | 98.3 | 100 | sain |
| fatigue | CALC | 100 | 100 | sain |

→ IFI est coulé **uniquement** par `sensory_richness` + `corporeal_anchoring`. attention/fatigue sont ~saturés (non coupables).

## 2. La cause : comptage de mots-clés FRANÇAIS-ONLY

`computeSensoryRichness` (macro-axes.ts:776) compte des marqueurs **explicitement FR** (commentaire du code : *« FR PREMIUM — pas de marqueurs EN »*). Conséquence par auteur :

| Auteur | langue | sensory | corporeal |
|---|---|---|---|
| Flaubert | FR | 53 | 58 |
| Hugo | FR | 42 | 35 |
| Proust | FR | 40 | 40 |
| **Dickens** | **EN** | **30** | **17** |
| **Austen** | **EN** | **28** | **17** |
| **Melville** | **EN** | **20** | **23** |

**Les maîtres anglais sont mesurés avec un lexique sensoriel français** → ils ne peuvent pas matcher → sous-cotés structurellement. Biais de **langue**, pas de qualité. Les 5 pires passages ont sensory=**0** (aucune catégorie FR matchée) — ce qui est impossible pour de la prose sensorielle réelle.

## 3. Verdict : IFI n'est PAS un bon floor universel — maladie du mot-clé

Réponse à la question Architecte (« le juge est-il juste, l'échelle fausse ? ») :
- **Les sous-axes LLM** (focalisation, et les juges ECC/AAI/interiority/impact ailleurs) ne sont pas en cause ici.
- **Les sous-axes CALC keyword** (`sensory_richness` FR-only, `corporeal_anchoring`) sont **défectueux** : (a) FR-only → pénalisent tout l'anglais ; (b) comptage littéral → ratent l'immersion sensorielle indirecte/métaphorique.
- C'est **exactement la même classe de défaut** que : emotion-14D keyword (garagé), signature RCI (keyword/packet vide), contrat ECC dégénéré. **Le fil rouge de toute la session : les mesures CALC fondées sur des listes de mots-clés sont la pourriture systémique d'OMEGA.** Les juges LLM, eux, tiennent.

Donc **ni « IFI parfaitement calibré » ni « IFI cassé en bloc »** : IFI a 2 sous-capteurs keyword biaisés (langue + littéralité) qui le rendent **inapte comme floor universel du min_axis**.

## 4. Implications / pistes (à décider, rien appliqué)

1. **Retirer sensory_richness/corporeal_anchoring du min_axis** (ou de l'IFI) tant qu'ils sont keyword-FR-only → ils ne mesurent pas la qualité, ils mesurent « contient-il des mots sensoriels français ».
2. OU **rendre les lexiques bilingues + sémantiques** (marqueurs EN, ou bascule LLM/embeddings pour la densité sensorielle) — refonte du sous-capteur.
3. **Interconnexion (point Architecte)** : à vérifier en WS-D — sensory_richness corrèle-t-il avec d'autres axes (redondance) ? Si oui, le composite double-compte.
4. Confirme la stratégie WS-D : **séparer intrinsèque vs conformité** ET **auditer chaque sous-capteur CALC keyword** avant de figer un seuil.

## VERDICT
- Statut : PASS (autopsie concluante, autonome, déterministe).
- Confiance : Haute (sous-axes CALC répliqués exactement ; biais FR/EN net : FR 40-53 vs EN 20-30).
- Forces : isole la cause en 2 sous-axes ; révèle le bug langue (FR-only) ; relie IFI à la maladie keyword commune ; fait en autonomie (0 Ollama).
- Faiblesses : (1) focalisation (LLM, 0.25 IFI) non mesurée — mais le CALC explique déjà la chute ; (2) ne quantifie pas encore l'interconnexion inter-axes (WS-D) ; (3) ne tranche pas le remède (retrait vs refonte bilingue) = décision Architecte.
- Risques restants : « réparer » IFI en ajoutant des mots-clés EN resterait du keyword (même maladie) → préférer LLM/sémantique ou retrait du floor.
- Action requise : décision Architecte — retirer sensory/corporeal du min_axis (rapide) OU refonte sémantique (lourde) ; intégrer à WS-D Phase 4. Aucun seuil/capteur modifié ici.
