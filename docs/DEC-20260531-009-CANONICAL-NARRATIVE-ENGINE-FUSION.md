# DEC-20260531-009 — Fusion vers un moteur narratif canonique unique (OMEGA)

**Status** : PROPOSED · **Date** : 2026-05-31 · **Decision Owner** : Architecte (Francky) · **Severity** : HIGH
**Supersede** : DEC-007 + DEC-008 (frontière/câblage devenaient des sous-problèmes de la fusion).
**Résout** : NCR-OMEGA-DUAL-ENGINE-PRODUCTION-IDENTITY (chemin de résolution = ce DEC).
**Participants** : Architecte (décision « fusionner, qualité > temps »), Gemini (fusion modulaire ≠ monolithe ; adaptateur = protocole étanche), ChatGPT (fusion = cible finale, hybride = échafaudage, matrice capacités, bench-avant-destitution), Claude Code (vérif repo + architecture en couches dictée par la granularité).
**Doctrine** : NO CODE BEFORE DEC RATIFIÉ · MINIMIZE IT (migration capacité-par-capacité) · PROVE IT (bench avant destitution) · DÉTERMINISME · feedback-toxique-interdit · NCR OVER HEROICS.

---

## 1. Décision (intention Architecte actée)
**L'état final OMEGA = UN SEUL moteur narratif canonique**, fusion du meilleur des deux moteurs actuels + perfectionné. Le statu quo dual-engine est **REJETÉ comme état final**. L'hybride (DEC-007/B) est **accepté UNIQUEMENT comme phase transitoire** (échafaudage de migration sûre), **jamais comme cible**.

> Formule scellée : *« L'hybride est l'échafaudage. La fusion est la cathédrale. »* OMEGA ne choisit pas entre orchestration et qualité — il forge un moteur supérieur qui absorbe les deux.

## 2. Principe architectural — FUSION MODULAIRE, PAS MONOLITHE (correction critique)
La « fusion » est **logique et fonctionnelle**, **pas** un copier-coller en un gros dossier. Un monolithe à couplage fort (orchestration livre codée en dur avec l'Oracle esthétique) serait **anti-OMEGA** : intestable en isolation, fragile. Le moteur canonique = **UN moteur, modules internes à interfaces pures**. La granularité réelle (mesurée : livre/`IntentPack` vs scène/`ForgePacket`) **dicte une architecture en couches** :

```
IntentPack
  └─[BookOrchestrator]      (← absorbe creation-pipeline : plan, evidence, multi-chapitres)
       └─ ScenePlan[]       (← genesis-planner)
            └─[Adapter Scene→ForgePacket]   (PROTOCOLE ÉTANCHE, le point dur — DEC-008 absorbé)
                 └─[SovereignForge]         (← K2 PF+Duras, génération de qualité prouvée)
                      └─[S-Oracle V2 + R6]  (← jugement esthétique + rejection)
                           └─ Evidence pack + manuscrit final
```
Chaque couche reste **testable en isolation**. L'adaptateur n'est pas un pansement : c'est le **contrat strict** qui permet à l'orchestrateur (cerveau) de commander la forge (cœur) sans contamination mutuelle.

## 3. Matrice capacités source → cible
| Capacité | Source actuelle | Destination (moteur fusionné) | Statut |
|---|---|---|---|
| IntentPack / plan livre | creation-pipeline + genesis-planner | **BookOrchestrator** | GARDER |
| Evidence pack / traçabilité | creation-pipeline | **BookOrchestrator** | GARDER |
| Multi-scènes / multi-chapitres | creation-pipeline | **BookOrchestrator** | GARDER |
| Gates structurels CALC | ScribeEngine-P2A | **réintégrer** (si prouvés utiles) | MIGRER |
| Validation Intent fail-closed | ScribeEngine-P2A (LAW-SCRIBE-INTENT-001) | BookOrchestrator (entrée) | MIGRER |
| Génération prose | **SovereignForge (K2)** | cœur génération | CANONIQUE |
| weaveLLM (génération faible) | ScribeEngine-P2A | — | **DESTITUER** (après bench) |
| S-Oracle V2 / R6 / Duel / Dédale | SovereignEngine | cœur jugement | CANONIQUE |
| Sélection finale / verdict qualité | SovereignEngine | cœur jugement | CANONIQUE |
| rewriteLoop déterministe scribe | ScribeEngine-P2A | à garder SI prouvé utile | À BENCHER |

## 4. Boucle de rejet (rappel, conservé)
Si le juge (S-Oracle V2/R6) rejette → **invalidation totale + régénération** (nouveau tir/seed), JAMAIS feedback scores→directives (toxique, Codex 3.x / ADR-003). Une seule autorité de verdict esthétique : le cœur jugement.

## 5. No-go / garde-fous
- **Fusion brutale INTERDITE** (pas de big-bang, pas de copier-coller monolithe).
- **Migration capacité-par-capacité, chaque étape gatée** (TSC+vitest), réversible.
- **Le pipeline produit actuel (omega-runner→creation-pipeline→scribe) ne doit JAMAIS être cassé pendant la migration** — il reste vivant jusqu'à ce que le chemin fusionné passe les gates.
- **Bench comparatif AVANT toute destitution** : aucune suppression de scribe (génération ou gates) sans preuve mesurée (S-Oracle V2 sur même brief). Le statut « scellé » de sovereign n'est PAS une preuve de supériorité en contexte livre — il faut le mesurer.
- **Adaptateur Scene→ForgePacket spécifié + testé** avant d'être branché.
- Déterminisme préservé à chaque étape (seeds, pas de timestamp sur chemin hashé).

## 6. Conséquences
- **+** Un OMEGA unifié : meilleure orchestration + meilleure génération + meilleur jugement + traçabilité, modulaire et testable. Fin de la schizophrénie dual-engine.
- **−** Chantier long, pluri-sprint, le plus risqué de tous (touche le moteur scellé V1 ET le pipeline produit câblé). Exige discipline absolue (gates, bench, réversibilité).
- **Risque si bâclé** : casser le seul pipeline qui tourne, ou perdre la qualité prouvée. Mitigé par migration incrémentale + double-run + bench.

## 7. Nom cible (proposition, naming = Architecte)
`OmegaNarrativeEngine` (ou `SovereignNarrativeEngine` aligné ENGINE_STATUS) — **PAS** le `sovereign-engine` actuel simplement renommé : il doit absorber l'orchestration livre. Le mot nu « Scribe » reste interdit en décision archi (cf registre d'identité).

## VERDICT
- Statut : **PROPOSED** — ratification Architecte requise pour ouvrir le chantier.
- Forces : acte l'intention (fusion qualité-max) ; corrige « fusion = monolithe » → modulaire ; architecture en couches dérivée des mesures ; matrice capacités source→cible ; bench-avant-destitution ; pipeline produit protégé pendant migration.
- Faiblesses : (1) effort non chiffré (plusieurs sprints) ; (2) la supériorité génération de sovereign en contexte LIVRE reste à benchmarker (prouvée en scène/scripts, pas en orchestration livre) ; (3) l'utilité des gates/rewriteLoop scribe à conserver doit être prouvée, pas supposée.
- Action requise : **ratification Architecte de DEC-009** → puis roadmap `OMEGA_NARRATIVE_ENGINE_FUSION_ROADMAP.md` (M0→M5), M0 = bench comparatif + spec adaptateur (read-only/design). Aucun code de fusion avant ratification + M0.

## ADDENDUM 2026-05-31 — Inventaire complet (3eme incarnation trouvee)
Controle exhaustif repo+blueprints+snapshots (cf docs/architecture/OMEGA_ENGINE_INVENTORY_COMPLET_2026-05-31.md) : une 3eme incarnation existe = monolithe racine src/scribe = 'SCRIBE v1.0.0' certifie NASA-GRADE AS9100D/DO-178C (01/01/2026), ANCETRE des deux packages, aujourd'hui ORPHELIN (hors tsconfig racine, non build, non lance). Les dossiers omega-v44/titanium/SNAPSHOTS/MASTER_DOSSIER/narrative-genome = archives janvier (0 marqueur generation). CONCLUSION : la fusion DEC-009 concerne bien scribe-engine(#2)+sovereign-engine(#3) ; src/scribe v1.0.0(#1) = ancetre a archiver OU garder comme reference de conception certifiee (decision Architecte, ne pas laisser orphelin non documente). Cible fusion inchangee.
