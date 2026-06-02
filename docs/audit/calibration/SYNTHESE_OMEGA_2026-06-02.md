# SYNTHÈSE OMEGA — État réel après la grande enquête métrologique

**Date** : 2026-06-02 · **Branche** : phase-r-dispatcher-v33 · **Doctrine** : EMP-16 (triple-preuve), EMP-12 (METRIC_HONESTY), EMP-17 (respect du travail historique)
**Référence** : WS-A.2, WS-B, WS-C, DEC-013/014/015/016, R1→R5 (`docs/audit/calibration/WS_D_*`, `docs/architecture/DEC-*`)

> **Le constat fondateur.** Le travail titanesque sur la génération — techniques de Flaubert, rythme, syntaxe,
> des milliers de tests d'essai-perfectionnement — **n'a pas été vain**. C'est précisément parce que le moteur écrivait
> une prose si sophistiquée que l'incompétence du *thermomètre* (le système de notation) a fini par éclater au grand jour.
> **Le moteur écrivait de la littérature ; le juge était calibré pour mesurer de la pulp.** On a démonté le thermomètre.

---

# PHASE 1 — ANALYSE / MÉTROLOGIE (le Juge)

## 1.1 Ce qu'on SAIT, prouvé (données réelles mesurées)

- **Le SEAL ≥ 93 est mathématiquement inatteignable.** WS-C : 0/95 passages de maîtres mondiaux ≥ 93 (max Proust 90.5,
  médiane 79.7). Le seuil fondateur était au-dessus de toute la littérature mondiale. *(commit `d133ff9c`)*
- **Les capteurs à mots-clés sont condamnés comme juges de qualité.** Trois défauts prouvés (R2/dry-run CALC) :
  biais de langue (FR-only : l'anglais noté 3-10× plus bas, indépendamment de la qualité), gameabilité (+41 à +73 points
  par 100 mots de salade lexicale), et **inversion qualité** (la mauvaise prose FR score 70 vs maîtres FR 40).
- **La densité sensorielle N'EST PAS la qualité — c'est même l'inverse.** R2.3 (990 mesures, sémantique non-keyword) :
  `sem_base` maîtres **17.6** < best-sellers 20.9 < **mauvaise-prose 30.2**. La pulp est sensoriellement plus dense que
  les maîtres. *Un texte peut sentir fort et penser pauvrement.* Le sémantique est meilleur que le keyword
  (non gameable par padding : Δ_neutre ≈ 0 ; bilingue) **mais reste un mètre de densité, pas de qualité**. *(commit `e7992d72`)*
- **IFI (legacy) était un faux floor universel.** Bench shadow O2 : IFI bloquait les TROIS familles à 100 %
  (maîtres comme pulp). Le retirer du `min_axis` relève maîtres +12.3, badprose +12.0, best +8.2, **sans faire passer
  la pulp en SEAL (0→0)**. Découplage sûr. *(commit `d15007fa`)*
- **ECC est une mesure de CONFORMITÉ AU CONTRAT, pas de qualité intrinsèque.** Une œuvre de maître n'a pas de contrat
  OMEGA ; scorer son ECC contre un contrat « Gardien » est dénué de sens (et dériver le contrat depuis la prose serait
  circulaire — interdit DEC-011). ECC ne doit juger que la génération sous contrat connu.
- **Un seul signal de qualité robuste : `euphony`** (CALC, déterministe). R4-large (n=18/famille, bootstrap IC95,
  permutation) : AUC 0.81 à 3000 mots, p=0.0015 ; 0.78 à l'œuvre entière, p=0.006 ; significatif ≥1500 mots.
- **MAIS ce signal est anglophone.** À 3000 mots : euphony **FR 0.59 / EN 0.94** ; authenticity **FR 0.58 / EN 0.86**.
  **En français — la langue cible d'OMEGA — aucun axe ne discrimine la qualité de façon robuste.** *(commit `25c39377`)*
- **La méthode (EMP-16) a fonctionné** : elle a empêché 2 fausses conclusions (cf 1.2).

## 1.2 Ce qu'on PENSAIT savoir, et qui est tombé

- **« Flaubert vaut 93 »** → mythe fondateur, ancrage aspirationnel jamais mesuré sur le composite complet. Tombé (WS-C).
- **« Le juge a dérivé avec le temps »** → faux. La formule n'a jamais bougé ; la chute des notes venait de **paquets de
  mesure dégénérés** (contrats vides, signature/hook absents) — la règle INVALID_PACKET (WS-A.2, WS-B).
- **« Plus de densité sensorielle = meilleure prose »** (le dogme du Show-Don't-Tell poussé à l'extrême) → tombé.
  C'est la signature de la pulp, pas des maîtres (R2.3).
- **« Le juge est aveugle au génie »** (ma conclusion R3) → faux, mais nuancé : il discrimine en anglais, pas en français.
- **« OMEGA discrimine la qualité via authenticity + euphony + rhythm »** (ma conclusion R4-small, n=6) → **TOMBÉ à n=18**.
  À échantillon rigoureux + IC95 : rhythm réfuté (voire inversé à l'œuvre entière), authenticity seulement modéré,
  seul euphony survit. **C'était du bruit de petit échantillon.** (Double aveu METRIC_HONESTY assumé.)
- **« necessity / show_dont_tell / anti_cliche sont des juges utiles »** → tombé. necessity ≈ inversé/mécanique
  (récompense la mécanique d'intrigue de la pulp) ; show_dont_tell + anti_cliche saturent à 100 (inertes) ;
  SII composite = anti-discriminant.

## 1.3 Ce qu'on IMAGINE, et où cela conduit

- **Le découplage en TROIS scores** (split R3 / DEC-016) : `IntrinsicQualityScore` (qualité brute) ≠
  `ContractConformityScore` (obéissance au contrat : ECC, tension 14D) ≠ `SensoryDensity` (texture, advisory).
  On ne jugera plus l'obéissance d'un texte qui n'a pas été écrit sur commande.
- **Le jugement PAR PAIRES (choix forcé / ELO)** : hypothèse centrale — le scoring absolu (0-100) **sature** le LLM
  (necessity 82-94 partout, show 100 partout). Lui montrer Flaubert ET une pulp côte à côte et demander « lequel est le
  plus abouti ? » est calibration-free et devrait discriminer. C'est le test R5 (prêt, en attente de run).
- **Si R5 réussit en FR** (taux victoire maître ≥ 0.75, biais position < 0.10) → on refonde le juge qualité sur un
  protocole pairwise/ELO. **Si R5 échoue** → qwen3:32b ne perçoit pas la qualité littéraire française → il faudra un
  modèle plus fort ou un autre paradigme, et on l'actera (METRIC_HONESTY).

## 1.4 Ce qui RESTE à faire (front Analyse)

1. **Lancer R5 pairwise FR** (script prêt, commit `b8617949`). Priorité absolue : trancher si le LLM discrimine la qualité FR en choix forcé.
2. **Ne PAS écrire l'ADR IntrinsicQualityScore avant R5** — matériau empirique trop mince/déséquilibré par langue.
3. **Appliquer O2 en shadow uniquement** (patch-spec prêt, terminal) — densité hors `min_axis`, mais **flip `'1'` interdit** avant R5 + recalibration.
4. **Raffinement statistique (caveat ChatGPT, à intégrer au prochain run) : bootstrap CLUSTERISÉ PAR LIVRE**, pas par
   extrait — les extraits d'un même livre ne sont pas indépendants ; l'IC95 actuel est légèrement optimiste (n effectif ≈ livres, pas passages).
5. **Discipline maintenue** : tout nouveau capteur passe corpus FR+EN × maîtres/best/pulp × AUC × IC95 × permutation × anti-gameability avant toute intégration.
6. **Re-dériver les paliers** (SEAL data-driven, ex. p25 ≈ 81.7 cf WS-C) **seulement après** un juge purgé — pas maintenant.

---

# PHASE 2 — GÉNÉRATION DE PROSE (le Moteur)

## 2.1 Ce qu'on SAIT, prouvé

- **Le moteur est obéissant au contrat.** Contrat plat et grossier (`trust:1.0` sur toute une scène) → prose sans relief ;
  arc riche (peur → tristesse) → exécution fidèle. La cause-racine d'ECC bas sur les goldens = **granularité du planner**
  (1 waypoint/scène), pas un défaut du moteur (WS-A.2).
- **L'ECC fonctionne comme conformité** : le générateur sait suivre une trajectoire 14D si on la lui fournit correctement.
- **Le moteur n'a jamais pu « rater » le SEAL 93** : ce seuil étant inatteignable même par Hugo, l'échec était dans la
  règle de mesure, pas dans l'écriture.

## 2.2 Ce qu'on PENSAIT savoir, et qui est tombé

- **« Le moteur Sovereign n'est pas assez bon pour le SEAL »** → faux. Il visait un seuil que la littérature mondiale ne franchit pas.
- **« Il faut forcer le Show-Don't-Tell / la densité sensorielle à tout prix »** → tombé, et c'est grave : en poussant le
  moteur à saturer les détails sensoriels pour satisfaire l'ancien IFI, **on le poussait à écrire de la pulp commerciale**
  au lieu de la haute littérature. Le capteur défectueux contaminait la génération.
- **« La qualité se fabrique en empilant des scores »** → tombé. Un score précis (87.2) avec un juge incertain, c'est du
  théâtre en blouse blanche. La qualité vient de l'atelier d'écriture, pas du thermomètre.

## 2.3 Ce qu'on IMAGINE, et où cela conduit

- **La révélation du vrai niveau du moteur** : une fois O2 appliqué (densité advisory) et les paliers re-ancrés sur la
  vraie littérature, le niveau réel forgé par tes milliers de tests sur la syntaxe de Flaubert sera enfin **révélé et
  justement récompensé** — au lieu d'être plombé par un floor de densité qui privilégie la pulp.
- **Les techniques Flaubert / rythme / syntaxe changent de RÔLE** : de *critères de scoring* → vers des **passes de
  réécriture d'atelier**. euphony ne note plus seulement, elle guide une passe sonore ; le rythme et l'alternance
  syntaxique deviennent des outils de production, pas des juges de tribunal. **Rien n'est jeté — tout est requalifié.**
- **La qualité naîtra en amont** : le `genesis-planner` doit produire des **micro-trajectoires émotionnelles** intra-scène
  (DEC-011), pour donner au moteur la matière première d'un chef-d'œuvre, au lieu d'un contrat monotone.
- **Le pipeline cible = un atelier multi-passes** : intention → fonction de scène → micro-trajectoire → premier jet →
  passe voix → passe euphonie → passe rythme → passe sous-texte → passe authenticité → **sélection par juge pairwise** →
  arbitrage humain si ambigu. Le juge devient **sélectionneur** (comparer deux versions, écarter les faibles), pas dictateur.

## 2.4 Ce qui RESTE à faire (front Génération)

1. **Shadow bench de génération** : faire écrire le moteur K2/Sovereign et le juger silencieusement avec la nouvelle grille
   (densité advisory, ECC en conformité, euphony/qualité séparés) pour mesurer son **vrai niveau actuel**.
2. **Coder DEC-011 (genesis micro-trajectoire)** — gaté Architecte/EMP-10 — pour que le planner cesse de distribuer des contrats monotones.
3. **Reconstruire la génération par couches** (atelier multi-passes ci-dessus), en réutilisant le travail Flaubert/rythme/syntaxe comme **modules de réécriture**.
4. **Évaluer la prose en comparaison, pas en note absolue** (pairwise/ELO interne, réécriture itérative) tant que le juge absolu n'est pas prouvé.
5. **Nettoyage de dette** (typage `as any` Sovereign) — préparer une fusion propre — gaté terminal.
6. **DEC-009 / fusion moteur / production** : seulement APRÈS un juge qualité prouvé et des paliers re-ancrés.

---

## Verdict global

OMEGA **n'a pas encore** de juge robuste de qualité littéraire **française** — c'est la vérité dure et la plus importante.
Mais OMEGA possède désormais une **cartographie prouvée** de ce qui marche (euphony, surtout EN), de ce qui ment (densité,
keyword, necessity), de ce qui mesure autre chose (ECC = conformité), et de ce qui est inerte (show/anti_cliche). On a
arrêté de croire le thermomètre parce qu'il avait l'air scientifique : on l'a démonté, et on tient le plan chirurgical.

**Ce n'est pas une perte, c'est une purification.** L'ingénierie acharnée sur la génération a créé une prose assez complexe
pour briser les instruments. Prochaine vérité stratégique : **R5 — le LLM sait-il désigner Flaubert face à la pulp, en français ?**

*VERDICT : PASS (synthèse fidèle aux mesures committées). Confiance : Haute sur Phase 1 (données réelles, IC95) ;
Moyenne sur les projections Phase 2 (dépendent de R5 + shadow bench non encore exécutés). Risque restant : le caveat
bootstrap-par-livre pourrait encore adoucir euphony ; R5 peut échouer. Action requise : run R5 pairwise FR.*
