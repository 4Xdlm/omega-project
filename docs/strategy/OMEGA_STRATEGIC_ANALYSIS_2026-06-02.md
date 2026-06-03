# OMEGA — DOCUMENT STRATÉGIQUE : ANALYSE COMPLÈTE + 2 PLANS DE FAISABILITÉ

**Date** : 2026-06-02 · **Auteur** : Claude Code (IA Principal) · **Standard** : NASA-Grade L4, METRIC_HONESTY (EMP-12), triple-preuve (EMP-16)
**Périmètre** : les 4 objectifs OMEGA (juger / générer-corriger / surpasser les humains / mycélium-ADN), à la lumière de TOUTE l'enquête métrologique (R-Physics, R-Metrology M0b, démontage scoring R1→R5, atelier P4→P5.1) et du moteur Sovereign/K2 + omega-forge.

> **Note de balisage (SSOT)** : les chiffres marqués [MESURÉ] viennent de runs committés de cette session (vérifiables dans `docs/audit/`). Les chiffres [REGISTRE] viennent du registre R-Metrology/CLAUDE.md (calibration antérieure). Les chiffres [HYPOTHÈSE] sont des estimations explicites.

---

# PARTIE I — ANALYSE COMPLÈTE

## 1. État des lieux factuel (ce qui est réellement mesuré)

### 1.1 Métrologie CALC (M0b_slim V3.4) — [REGISTRE]
- Modèle Ridge dispatché FR/EN/fallback, 5 features (f24c, f33b, f1a, f33c, f12), α=1.0.
- Corpus calibration 1334 œuvres (FR 788 / EN 546), train 1070 / holdout V2 264 (stratifié, seed 42).
- **ρ_dispatch = 0.6138** (holdout) ; ρ_FR 0.5362 ; ρ_EN 0.4366 ; VIF max < 3 ; zéro sign-flip ; CV 5-fold ρ = 0.598 ± 0.040.
- **Plafond CALC scellé** : 0.6138. Kill-switch +0.02 : f9a REJETÉ, body_binding SHADOW, sensors redondants REJETÉS.
- **Conclusion** : la prédiction CALC pure (lexico-structurelle) plafonne autour de ρ ≈ 0.61 — corrélation modérée, pas un juge fiable seul.

### 1.2 Le démontage du scoring (cette session R1→R4) — [MESURÉ]
- **SEAL 93 mathématiquement impossible** : WS-C, 0/95 passages de maîtres ≥ 93 (max Proust 90.5, médiane 79.7). L'ancien dogme était au-dessus de toute la littérature mondiale.
- **Densité sensorielle ≠ qualité, et même anti-corrélée** : R2.3 (990 mesures) — maîtres 17.6 < best-sellers 20.9 < **mauvaise-prose 30.2**. *Un texte peut sentir fort et penser pauvrement.*
- **Capteurs keyword condamnés** : biais langue FR-only (EN 3-10× plus bas), gameables (+41 à +73/100 mots), inversion qualité.
- **IFI = floor défectueux universel** (bench O2) ; **RCI = packet-confound** (dérive −17 et 0/57 = artefacts de paquet dégénéré) ; **necessity INVERSÉ** (récompense la mécanique d'intrigue de la pulp) ; show_dont_tell + anti_cliche **inertes** (saturés 100).
- **R4-large (n=18, IC95 bootstrap)** : la « trinité » authenticity+euphony+rhythm de R4-small s'effondre ; **seul euphony robuste** (AUC 0.81 @3000) — et **anglophone** (euphony FR 0.59 / EN 0.94). En français, aucun axe legacy ne discrimine.

### 1.3 Le juge reconstruit (R5/R5-large, DEC-017) — [MESURÉ]
- Reformulation : scoring absolu redessiné (profondeur/style/voix, anti-saturation) + **juge par paires** (choix forcé).
- **R5-large (60 livres, IC95 clusterisé par livre)** : pairwise FR master-win 0.78-0.81 ; absolu FR AUC 0.84-0.86 @1500 mots (IC-bas 0.67-0.72).
- **Sweet-spot = ~1500 mots (granularité scène)**. EN ≫ FR persiste.
- **DÉCOUVERTE CAPITALE (P5.1)** : le juge est un **SÉLECTEUR GROSSIER fiable** (sépare maître/pulp, complet/tronqué) mais **PAS un discriminateur FIN** (4 variantes proches d'un même texte → tournoi 3-3-3-3, indistinguables).

### 1.4 La génération (atelier P4→P5.1) — [MESURÉ]
- Moteur Sovereign/K2 **obéissant** au contrat (contrat plat → prose plate ; arc riche → exécution). 6 lois physiques omega-forge (inertie, dissipation, faisabilité, décroissance organique, conservation du flux, synthèse) modélisent la dynamique émotionnelle.
- **Best-of-N fonctionne** : 5 variantes, scoring, tournoi pairwise, sélection cohérente du haut du classement.
- **Forge-langue améliore** (nettoyage : fautes corrigées, +mean, longueur tenue). **Forge-style neutre-à-négative** (sous-texte/rythme/Flaubert n'améliorent pas le score, et le juge ne sait pas mesurer un gain fin).
- Prose OMEGA score 82-86 **sur son propre juge** — *même-juge*, donc PAS une validation indépendante de niveau.

## 2. Corrélations mesurées vs objectifs

| Objectif | Capacité actuelle réelle | Métrique mesurée | Gap |
|---|---|---|---|
| **1. Juger qualité (ordinal)** | Sélecteur pairwise grossier FR/EN | pairwise FR 0.78-0.81 ; AUC abs 0.85 @1500 [MESURÉ] | Note ABSOLUE fiable + discrimination FINE manquantes |
| **1bis. Prédire best-seller** | **Aucune** capacité dédiée | — (jamais modélisé) | Corpus commercial labellisé + modèle = à construire |
| **2. Générer/corriger** | Best-of-N + forge-langue | sélection OK ; forge-langue +1 mean ; forge-style 0 | « Qualité au choix » non pilotable/prouvée |
| **3. Surpasser TOUS les humains** | Non mesurable avec l'outil actuel | juge ne sépare pas le fin ; same-judge | **Énorme** (juge fin + éval humaine aveugle + modèle fort) |
| **4. Mycélium/ADN** | Machinerie de features partielle | euphony/rhythm/authenticity validés ; CALC ρ0.61 | Socle de dimensions ORTHOGONALES validées manquant |

## 3. Conclusions mathématiques et physiques

1. **La qualité littéraire n'est pas la densité.** Prouvé à 990 mesures. Tout capteur de densité (keyword OU sémantique) est anti-corrélé à la qualité → exclu de la porte qualité. (Loi empirique OMEGA.)
2. **Le CALC pur plafonne (ρ≈0.61).** La structure lexicale prédit modérément ; elle ne suffit pas pour un juge fiable. Le signal de qualité fin est sémantique, donc LLM-dépendant.
3. **Le juge LLM est un instrument GROSSIER.** Il discrimine les grands écarts (maître/pulp : AUC 0.85-0.94) mais pas les nuances (variantes proches : 0.50). C'est un thermomètre à graduations larges, pas un micromètre.
4. **Asymétrie de langue FR<EN.** Le modèle (qwen3:32b) est plus fort en anglais. Pour une cible FR, le signal est « modéré » (AUC 0.85 @1500, IC-bas 0.67), pas certain.
5. **Densité utile pour le COMMERCIAL, pas pour l'ART.** Corollaire stratégique majeur : la pulp/best-seller EST sensoriellement dense → les capteurs « ratés » pour la qualité sont potentiellement de bons **prédicteurs commerciaux**. L'échec de l'Objectif qualité est le matériau de l'Objectif best-seller.
6. **Same-judge = circularité.** Tant que le générateur et le juge partagent le modèle, « OMEGA écrit au niveau de Flaubert » est invérifiable. Il faut un juge INDÉPENDANT (humain aveugle ou modèle distinct).

## 4. Ce qui fonctionne déjà vs ce qui manque

**FONCTIONNE (prouvé)** : sélection best-of-N pairwise ; nettoyage de langue (forge-langue) ; discrimination des gros écarts de qualité ; euphony/rhythm CALC (structurels, déterministes) ; moteur de génération obéissant au contrat ; 6 lois physiques émotionnelles ; pipeline crash-safe + traçabilité NASA.

**MANQUE** : (a) note de qualité ABSOLUE calibrée et fiable ; (b) discrimination FINE ; (c) parité FR/EN ; (d) juge INDÉPENDANT (anti-circularité) ; (e) prédicteur best-seller (corpus + modèle) ; (f) pilotage « qualité au choix » à la génération ; (g) preuve de surpassement humain (protocole d'évaluation aveugle) ; (h) socle de dimensions orthogonales validées pour le mycélium.

## 5. Gaps critiques par objectif

- **OBJ 1 (juger)** : on SAIT classer (ordinal grossier). On NE SAIT PAS noter en absolu de façon fiable ni discriminer finement. Best-seller = capacité **inexistante** aujourd'hui. **Gap : moyen pour l'ordinal, grand pour l'absolu/fin, total pour le best-seller.**
- **OBJ 2 (générer/corriger)** : on SAIT générer + sélectionner + nettoyer. On NE SAIT PAS prouver « qualité exceptionnelle » ni piloter « exceptionnel vs best-seller » (faute de juge fin + de prédicteur commercial). **Gap : moyen.**
- **OBJ 3 (surpasser tous les humains)** : **gap maximal**. Le juge actuel ne peut même pas certifier qu'une prose dépasse une autre prose de qualité voisine. Sans juge fin + évaluation humaine aveugle + probablement un modèle de base plus puissant, l'objectif est **non prouvable**, pas seulement non atteint.
- **OBJ 4 (mycélium/ADN)** : **le plus accessible techniquement**. On a déjà des dimensions mesurables (euphony, rhythm, authenticity, densité, Q_struct, arc 14D, 6 lois). Il manque un **socle validé orthogonal** + reproductibilité + normalisation. Le « classement mondial objectif » est faisable comme PRODUIT ; sa LÉGITIMITÉ dépend de la validité prouvée des dimensions.

## 6. Avis honnête, sans filtre

- **OBJ 4 est le plus mûr et le plus défendable** : c'est de la cartographie multi-dimensionnelle. À privilégier comme livrable concret et différenciant. Le « mycélium » est réel et atteignable.
- **OBJ 1 est atteignable en VERSION ORDINALE** (classer, départager, sélectionner) — c'est déjà le cas. La version « note absolue fiable + best-seller » demande deux chantiers distincts (recalibration + corpus commercial).
- **OBJ 2 est en bonne voie pour le COMMERCIAL/best-seller** (la densité, qu'on sait mesurer, EST le marqueur du commercial) et pour le NETTOYAGE. « Qualité exceptionnelle au choix » dépend de l'OBJ 1-fin.
- **OBJ 3, sans filtre** : c'est une **étoile polaire, pas un livrable**. Affirmer aujourd'hui « surpasser tous les auteurs humains » serait malhonnête : (1) notre juge ne distingue pas le fin, (2) il est plafonné par qwen3:32b et biaisé EN, (3) le test « same-judge » est circulaire. Surpasser l'humain exige de PROUVER la supériorité devant des humains aveugles et/ou un juge indépendant — un programme de recherche pluri-trimestriel à l'issue incertaine. Je recommande de le garder comme cap directionnel, et de ne JAMAIS le revendiquer sans preuve d'évaluation aveugle.
- **La grande ironie stratégique** : tout ce qui a « échoué » comme juge de qualité (densité, keyword) est probablement de l'**or pour prédire le best-seller**. Capitaliser dessus au lieu de le jeter.

---

# PARTIE II — DEUX PLANS DE FAISABILITÉ

> Hypothèses communes : exécution locale (Ollama qwen3:32b) + budget cloud possible en Plan B ; corpus_r (881) + corpus calibration (1334) disponibles ; tout gaté EMP-10/EMP-16 ; moteur FROZEN intact ; jamais de seuil prod sans bench.

## PLAN A — PRAGMATIQUE (le plus rapide pour servir les 4 objectifs « assez bien »)

**Philosophie** : livrer une version honnête et utile de chaque objectif avec l'outillage actuel, sans prétendre à la perfection. Horizon ~8-10 semaines.

### A1 — Juge de qualité v1 (ordinal + advisory) — sem. 1-2
- Adopter `IntrinsicQualityScore` (profondeur/style/voix) + euphony CALC en **composite advisory** ; ELO pairwise pour le classement.
- **Re-dériver les paliers** par percentiles sur corpus réel (DEC-015) — fin du dogme 93 ; SEAL = p90 maîtres, etc.
- **Dépendances** : module DEC-017 (fait), corpus_r. **Risques** : juge grossier (assumé pour l'ordinal). **Métrique succès** : AUC FR ≥0.75 IC-bas>0.65 sur ≥2 échelles ; paliers data-driven publiés.

### A2 — Prédicteur best-seller v1 — sem. 2-4
- Corpus labellisé commercial (best-seller vs midlist vs littéraire) à partir de corpus_r (familles déjà étiquetées) + métadonnées de ventes [PRÉREQUIS : source de labels ventes].
- Features = **densité sensorielle (enfin utile !)** + Q_struct + longueur de phrase/rythme + lisibilité ; modèle logistique/Ridge.
- **Dépendances** : labels commerciaux. **Risques** : disponibilité/qualité des labels ventes ; droits. **Métrique** : AUC best-seller ≥0.70 holdout.

### A3 — Génération pilotable v1 — sem. 3-6
- Pipeline atelier : best-of-N (N=5-8) + **forge-langue** (acquis P5.1) en prod-shadow.
- **2 modes** : `exceptionnel` (maximise IntrinsicQuality advisory) ; `best-seller` (maximise prédicteur A2).
- **Dépendances** : A1, A2. **Risques** : forge-style inopérante (assumé : on s'appuie sur best-of-N + langue, pas sur la transformation). **Métrique** : mode best-seller bat baseline sur prédicteur A2 ; mode exceptionnel gagne le pairwise vs baseline.

### A4 — Mycélium/ADN v1 — sem. 4-8
- Fingerprint = vecteur des dimensions VALIDÉES disponibles : euphony, rhythm, authenticity, densité (advisory), Q_struct, arc émotionnel 14D, profil des 6 lois.
- Export « carte ADN » par livre (JSON + visualisation radar) ; classement mondial = ELO IntrinsicQuality ordinal.
- **Dépendances** : A1. **Risques** : dimensions partiellement corrélées (à documenter). **Métrique** : ADN reproductible (même livre → même empreinte, temp 0) ; classement stable au re-run.

### A — Objectif 3 : ACTÉ HORS PÉRIMÈTRE
Plan A **ne prétend pas** surpasser les humains. Il pose les briques (juge ordinal, génération pilotable) mais documente honnêtement que la preuve de surpassement n'est pas livrable à cet horizon.

**Risques transverses Plan A** : same-judge (mitigé en ordinal/sélection, pas en absolu) ; FR<EN ; plafond qwen3:32b ; labels commerciaux. **Prérequis** : Ollama stable (PATHEXT), corpus labellisé ventes, budget GPU local.
**Métriques de succès globales A** : 4 livrables fonctionnels + honnêtement bornés, zéro régression moteur, tout gaté.

## PLAN B — MAXIMALISTE (perfection absolue, aucun compromis)

**Philosophie** : construire le juge et le générateur de référence MONDIALE, avec preuves indépendantes. Horizon ~6-12 mois, jalonné.

### B1 — Juge INDÉPENDANT et FIN — mois 1-3
- **Briser la circularité** : juge ≠ modèle générateur. Options : modèle plus puissant (cloud frontier), ensemble multi-juges, fine-tune dédié sur préférences littéraires.
- **Calibration psychométrique** : Item Response Theory / Bradley-Terry-Luce sur un grand jeu de comparaisons pairwise (échelle continue calibrée, pas note ad hoc).
- **Ancrage humain aveugle** : panel d'évaluateurs humains sur sous-échantillon (gold standard) → calibrer le juge sur l'humain.
- **Corpus étendu** : viser le corpus complet (≥2000 livres) × multi-langues × multi-échelles, bootstrap par livre.
- **Métrique** : AUC FR ET EN ≥0.85 IC-bas>0.75 ; discrimination FINE prouvée (séparer des variantes proches, AUC>0.65) ; corrélation juge↔humain ρ>0.7.

### B2 — Socle de dimensions ORTHOGONALES (Mycélium scientifique) — mois 2-4
- Battre toutes les features candidates (R-Physics, Q_struct, sensors sémantiques, 6 lois, prosodie) sur le corpus étendu ; **PCA/ICA + VIF** pour extraire une base orthogonale validée et reproductible.
- ADN = vecteur dans cette base, normalisé, avec IC. Classement mondial = score composite défendable + intervalles de confiance.
- **Métrique** : base à VIF<2, reproductibilité sha-stable, couverture variance >80%, dimensions interprétables.

### B3 — Génération de référence — mois 3-8
- Pipeline atelier multi-passes complet **piloté par le juge fin** (B1) : génération → micro-trajectoires (DEC-011) → passes (voix/rythme/euphonie/sous-texte) avec garde-fous → sélection ELO.
- **Apprentissage par préférences** : DPO/RLHF sur les jugements du juge fin (et/ou humains) pour pousser le générateur au-delà du best-of-N.
- **2 régimes** exceptionnel/best-seller pilotés par deux fonctions-objectif distinctes (qualité fine vs prédicteur commercial B-grade).
- **Métrique** : la prose générée bat un corpus de référence (best-sellers contemporains) en pairwise aveugle humain ; gain mesurable post-DPO.

### B4 — PREUVE DE SURPASSEMENT HUMAIN (Objectif 3) — mois 6-12
- Protocole d'évaluation **aveugle** : panels humains experts comparent prose OMEGA vs prose de maîtres/best-sellers, sans savoir la source.
- Critère : **p(OMEGA préféré à un maître) significativement > 0.5** sur échantillon suffisant, juge humain aveugle + juge indépendant concordants.
- **Honnêteté** : ce jalon peut ÉCHOUER. Le succès n'est pas garanti par la construction ; c'est une hypothèse à tester, pas une certitude à livrer.
- **Métrique** : significativité statistique du surpassement, multi-juges + humains, multi-langues.

### B5 — Classement littéraire mondial objectif — mois 8-12
- Sur le socle B2 + juge B1 : indexer un large corpus, publier un classement avec méthodologie ouverte, IC, et reproductibilité. C'est le débouché « nouveau classement mondial » de l'Objectif 4.

**Risques transverses Plan B** : coût (cloud + panels humains) ; le juge fin peut plafonner même avec un modèle frontier ; l'Objectif 3 peut être structurellement hors d'atteinte (et il faut l'accepter) ; dérive de calibration ; droits sur corpus commercial. **Prérequis** : budget cloud/annotation, accès modèle frontier, protocole d'éval humaine, corpus étendu licencié.
**Métriques de succès globales B** : juge indépendant calibré sur l'humain (ρ>0.7), base ADN orthogonale validée, générateur qui gagne en aveugle, classement mondial reproductible publié.

---

## SYNTHÈSE DÉCISIONNELLE

| Objectif | Plan A (pragmatique) | Plan B (maximaliste) |
|---|---|---|
| 1 Juger | ordinal fiable + best-seller v1 (~4 sem) | juge indépendant fin calibré humain (~3 mois) |
| 2 Générer/corriger | best-of-N + forge-langue + 2 modes (~6 sem) | atelier piloté + DPO sur juge fin (~5 mois) |
| 3 Surpasser humains | **hors périmètre, acté** | protocole de preuve aveugle (~6-12 mois, incertain) |
| 4 Mycélium/ADN | fingerprint v1 + classement ordinal (~8 sem) | socle orthogonal validé + classement mondial (~12 mois) |

**Recommandation de l'IA Principal** : démarrer par **Plan A** (livrables honnêtes, rapides, dont l'OBJ 4 qui est le plus mûr et le plus différenciant), en posant délibérément les fondations réutilisables par **Plan B** (juge indépendant, corpus étendu, base orthogonale). Traiter l'**Objectif 3 comme une hypothèse de recherche à prouver en aveugle**, jamais comme une revendication. La force d'OMEGA n'est pas de proclamer la perfection — c'est d'être le seul système qui **mesure honnêtement** ce qu'il sait et ne sait pas faire.

**VERDICT** : Analyse PASS (fondée sur données committées). Confiance : Haute sur l'état des lieux et les gaps ; Moyenne sur les durées des plans (dépendent de prérequis externes : labels commerciaux, budget cloud, panels humains). Risque principal : confondre « le juge dit oui » avec « c'est vrai » — d'où l'exigence d'évaluation indépendante dans tout chemin vers l'OBJ 3.
