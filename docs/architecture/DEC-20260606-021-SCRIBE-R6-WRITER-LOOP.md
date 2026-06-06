# DEC-20260606-021 — SCRIBE R6 WRITER LOOP (« L'Écrivain Souverain »)

**Date** : 2026-06-06 · **Statut** : 🟡 **PROPOSED** — validation **Architecte + 3-IA** OBLIGATOIRE avant toute ligne de code de production.
**Auteur** : Claude (IA Principal) · **Commanditaires** : Francky (Architecte) + Tribunal (Gemini + ChatGPT, mandats convergents 2026-06-06).
**S'appuie sur** : ADR-003 (R6 rejection sampling, SCELLÉ) · `SCRIBE_ENGINE_ACTION_PLAN_2026-05-31` (Phases C→E) · `SCRIBE_ENGINE_FULL_AUDIT_2026-05-31` · NCR-M0B (OPEN) · DEC-20260531-009 (fusion) · P0.6b/P1/P2 book-factory (scellés) · autopsie empirique « Le Silence du Phare » (30 chap réels).
**Numérotation** : DEC-010 étant déjà pris (EMOTION-CONTRACT), cette décision prend le numéro libre **021**.

---

## 0. LA VISION DE L'ARCHITECTE (la colonne vertébrale de cet ADR)

> *« Le LLM doit écrire comme un écrivain : il se relit à voix haute et à voix basse, il corrige, optimise, nettoie sa prose, corrige les incohérences par phases — personnages, puis monde, puis vérité et interactions, puis interconnexions — il vérifie les dates, la météo. Et chez nous il peut même faire relire par une autre personne pour avoir plusieurs avis : c'est pour ça qu'on a les juges et les bibles de contrôle. On doit avoir une Bible qui enregistre ce qu'il y a RÉELLEMENT dans le livre et qui la compare à la Bible réelle qu'on protège : les incohérences se voient automatiquement. Et si la Bible peut tout noter, elle peut aussi analyser, sortir une carte, et la comparer. »*

Formalisation — l'écrivain souverain a **5 organes**, tous mappés sur de l'existant ou du book-factory additif :

| Geste de l'écrivain | Organe OMEGA | Statut |
|---|---|---|
| **Se relire à voix haute** (l'oreille : rythme, souffle, sonorités) | passes CALC prosodie/rythme : `sent_len_cv`, euphonie (modules `phonetic/` sovereign), advisory anti-Goodhart | existant (sovereign) + advisory |
| **Se relire à voix basse** (le sens : logique, cohérence) | SKEPTIC (CNC-100) + gates canon/continuité | existant (dormant) + book-factory |
| **Corriger par PHASES** | relecture dimensionnelle : ①personnages ②monde ③vérité/interactions ④interconnexions ⑤dates/météo (§4) | NOUVEAU (structure de l'extracteur) |
| **Faire relire par d'autres** | multi-lecteurs = juges calibrés EMP-19 (§6) | partiel (gemma4 seul juge calibré) |
| **La Bible de contrôle + la carte** | **DOUBLE BIBLE** : Bible-EXTRAITE (du texte réel) vs Bible-RÉELLE (canon protégé) + diff automatique + MapProjection comparée (§5) | NOUVEAU (réutilise StoryState) |

---

## 1. PREUVES EMPIRIQUES (chaque organe est justifié par un échec OBSERVÉ dans le jet réel)

Autopsie « Le Silence du Phare » (30 chap, gemma4 1-passe sans gate — le générateur INTERIM_PROBE) :

| Échec observé (preuve) | Organe R6 qui le tue |
|---|---|
| Tropes répétés en boucle : « cœur battant contre ses côtes » (×10+), « tabac froid », « frisson l'échine » | **Repeat Gate** (n-grams exacts + motifs d'ambiance sémantiques) — candidat-level |
| Dérive d'identité/lieux : Léna enquêtrice→secrétaire→PJ ; Ker-Morvan/Ker-Mor ; Siren/Sainte-Marie | **Fidelity Gate** + **Double-Bible diff** (§5) |
| Micro-cliffhanger artificiel à CHAQUE chapitre (tension plate, pas de respiration) | modulation **pacing** (tension_target du book-planner respectée par segment, advisory) |
| Phrases courtes uniformes, zéro architecture syntaxique (anti-maître, cf E0/LEGION) | **Rythme advisory** (`sent_len_cv` cible par genre — JAMAIS gate dur, EMP-16) |
| Artefacts de langue : « remarut », coupures brutales inter-chapitres | **Language Gate** (CALC : lexique inexistant, phrases tronquées) |
| Sous-production : cible ~900 → ~550 mots (défaut DOCUMENTÉ P2B : 900-1200→350-540) | **K2 chunking** (le LLM ne tient pas 2000+ mots d'un coup → segments ~500-750) |
| La Bible pilotée par le plan, pas relue depuis la prose (boucle OUVERTE) | **Extracteur par phases + Double-Bible** (boucle FERMÉE) |

→ Le LLM brut cherche le minimum local statistique (le Pulp). **R6 = le filtre stochastique inversé** : forcer l'improbable admissible.

---

## 2. ARCHITECTURE — le pipeline « écrivain » (vue d'ensemble)

```
BookFactory (plan, canon, état, seeds/payoffs — AUTORITÉ STRUCTURELLE)
   │ R6Input { chapterSpec, bookIntent, storyState(planifiée), canonState, knowledgeGraph,
   │           readerState, contextDigest, previousTail, forbiddenDrift, requiredSeeds/Payoffs }
   ▼
K2 CHUNKING : ChapterSpec (~2000-2500 mots) → 3-5 Segments (~500-750 mots)   [attention LLM préservée]
   ▼  pour CHAQUE segment :
CANDIDATE FACTORY (Best-of-N) : N candidats à diversité CONTRÔLÉE
   (profils : canon-strict / tension interne / sensoriel / dialogue / rythme compressé / voix sèche / synthèse)
   — même objectif, même canon, mêmes graines : on varie la PLUME, jamais la RÉALITÉ —
   ▼
ORACLE À DOUBLE LAME (le douanier CALC — §3)
   Lame 1 HARD-VETOES (score=0, élimination) : Format/Language · Fidelity · Canon/Truth · Matter
   Lame 2 SOFT-SCORES (classement des survivants) : Rythme · Sous-texte · Voix · S-Oracle advisory
   + Repeat = SHADOW candidat-level (loggé, re-ranking observé, durcissable après preuve multi-livres)
   ▼
MULTI-LECTEURS (§6) : juges calibrés EMP-19 (aujourd'hui gemma4 seul) + SKEPTIC (deus-ex-machina, facilité)
   ▼
SÉLECTION 2 ÉTAGES (§8) : (A) filtre dur Eligible(ci) ; (B) score multi-objectif pareto (anti-Goodhart)
   — on ne choisit JAMAIS le plus beau : on choisit le MEILLEUR ADMISSIBLE —
   ▼  si aucun admissible OU max < SEUIL :
RÉGÉNÉRATION CIBLÉE SOUS GATE (§7 — frontière doctrinale stricte, bounded retries)
   ▼
ASSEMBLAGE segments → chapitre → BOUCLE FERMÉE (§5) :
   EXTRACTEUR par phases (①→⑤) → BIBLE-EXTRAITE → DIFF vs BIBLE-RÉELLE → carte comparée
   → incohérences automatiques → SKEPTIC verdict → events VALIDÉS appliqués à StoryState
   ▼
EVIDENCE PACK par chapitre (persistance TOTALE des candidats — §9)
```

L'interface d'accueil existe déjà : `ScribeR6Generator implements ChapterGenerator` (book-factory P2) — l'orchestrateur P2 n'est **pas modifié** ; on remplace le générateur INTERIM_PROBE. (≡ l'interface `ProseGenerator` que l'ACTION_PLAN scribe déclare « absente » : book-factory l'a déjà.)

---

## 3. LES GATES (définitions exactes)

| # | Gate | Type | Mesure | Échec → |
|---|---|---|---|---|
| G1 | **Format/Language** | HARD | bornes mots ; pas de coupure brutale ; pas de markdown ; artefacts lexicaux (« remarut ») | REJECT |
| G2 | **Fidelity** | HARD | POV/rôles/lieu/objectif du ChapterSpec respectés ; seeds requis plantés ; payoffs requis éclatés ; **aucune identité mutée** (forbiddenDrift) | REJECT |
| G3 | **Canon/Truth** | HARD | aucun fait du rail truth contredit ; un perso ne révèle que ce qu'il `knows` (JTB, P0.6b ✅) ; objet détruit ≠ réapparu ; chrono/dates/météo cohérentes | REJECT |
| G4 | **Matter Preservation** | HARD | la matière utile est là : indices requis, bascule de relation, fait essentiel — un texte plus beau qui PERD l'indice perd | REJECT |
| G5 | **Repeat** | **SHADOW** (→ durcissable) | trigram_ratio, near_dup_density, motif d'ambiance recyclé (2 niveaux : surface n-grams + motifs sémantiques) ; « cœur battant » ×2 dans un chapitre = flag | log + re-rank shadow |
| G6 | **SKEPTIC** | HARD (verdicts graves) | deus-ex-machina, perso agissant sans cause, conflit résolu trop facilement, indice non préparé, TIMELINE_ERROR (réutilise CNC-100, à réveiller via ACL) | REJECT |
| G7 | **S-Oracle qualité** | ADVISORY (classement) | ECC/AAI/RCI/SII/IFI + IntrinsicQuality + radar bge-m3 advisory — ne sauve JAMAIS un texte qui viole le canon ; jamais seul (angle mort répétition documenté) | score |
| G8 | **Rythme/prosodie** (« voix haute ») | ADVISORY | `sent_len_cv` (amplitude respiratoire), euphonie (phonetic/) — cibles par genre, JAMAIS gate dur (EMP-16, anti-Goodhart) | score |

Règle d'or : **une seule autorité de rejection par étage** (structurel = gates G1-G6 ; esthétique = G7/G8 en classement) — pas de double-rejection contradictoire (DEC-009).

---

## 4. LA RELECTURE PAR PHASES (le cœur « écrivain » — extraction ET vérification dimensionnelles)

L'extracteur prose→événements ne lit pas le texte « en vrac » : il relit **comme l'Architecte relit**, en 5 passes dédiées, chacune avec son schéma de sortie et son comparateur :

| Phase | Extrait du texte réel | Vérifie contre |
|---|---|---|
| ① **PERSONNAGES** | qui apparaît, agit, parle ; rôle exprimé ; état (vivant/blessé/mort) ; qui sait quoi ; qui ment | Bible-réelle.characters + knowledgeGraph (JTB) |
| ② **MONDE** | lieux visités, état des lieux (incendié/intact), objets (créés/détruits/déplacés) | Bible-réelle.places + world_changes |
| ③ **VÉRITÉ & INTERACTIONS** | assertions des persos, révélations, mensonges/bluffs, transferts de croyance (rumeur) | rails truth/interpretation (P0.6b) — un perso ne révèle que ce qu'il knows |
| ④ **INTERCONNEXIONS** | graines plantées/renforcées/écloses EFFECTIVEMENT ; fils ouverts/avancés/fermés ; références inter-chapitres | payoff_graph + threads de la Bible-réelle |
| ⑤ **DATES & MÉTÉO** | marqueurs temporels (jour/heure/saison), météo, durées | timeline + weather-track (AJOUT au modèle d'événements : `WEATHER`, `DATE_MARK`) |

Méthode par passe : **CALC d'abord** (NER léger, lexiques, règles) + **LLM extracteur calibré EMP-19** (gemma4 think:false, prompt figé/hashé = un instrument) en renfort, **SKEPTIC en filet**. Une passe = un schéma typé strict → comparable mécaniquement.

« **Voix haute** » = G8 (rythme/euphonie, CALC) ; « **voix basse** » = phases ①-⑤ + SKEPTIC (le sens). Les deux relectures sont distinctes et toutes deux obligatoires.

---

## 5. LA DOUBLE BIBLE + LA CARTE (l'innovation demandée — boucle fermée formelle)

**Principe** : deux objets du MÊME type (`StoryState`, déjà construit en P1.A comme fold pur, hashable, triable) :
- **Bible-RÉELLE** (planifiée/canon) : projetée depuis le plan + les événements validés — *ce que le livre DOIT contenir*. Protégée.
- **Bible-EXTRAITE** : projetée depuis les événements extraits de la PROSE réelle (passes ①-⑤) — *ce que le livre CONTIENT vraiment*.

**Diff automatique** `diffBibles(réelle, extraite) → IncoherenceReport` — mécanique car les deux états sont normalisés/triés :
```
MISSING   : prévu mais absent du texte (indice non planté, perso disparu)
EXTRA     : présent dans le texte mais hors canon (fait inventé, perso fantôme)   ← l'hallucination DÉTECTÉE
MUTATED   : présent mais altéré (enquêtrice→secrétaire ; Ker-Morvan→Ker-Mor ; Siren→Sainte-Marie)
TEMPORAL  : chrono/date/météo incompatibles (orage le soir du ch.5 ≠ nuit sèche même soir)
EPISTEMIC : un perso révèle/agit sur ce qu'il ne peut pas savoir (LEAK, JTB)
```
Chaque entrée du rapport référence chapitre + dimension + les deux valeurs → **l'incohérence se voit automatiquement**, exactement la demande. Verdict par chapitre : diff vide (ou advisory-only) = scellable ; sinon → régénération ciblée du segment fautif.

**La CARTE (`MapProjection`)** : la Bible note tout → elle peut dessiner. Projection dérivée (pure) de chaque Bible :
- **carte spatiale** : lieux + état + positions des persos par chapitre (trajectoires) ;
- **carte relationnelle** : graphe persos (relations, valences) ;
- **carte des graines** : plant→reinforce→bloom (déjà dans le squelette P1.B).
`diffMaps(carte_réelle, carte_extraite)` = diff de graphes (nœuds/arêtes manquants/excédentaires/mutés) — une **2ᵉ vue des mêmes incohérences**, lisible par un humain (artefact SVG/texte par chapitre dans l'evidence pack). Implémentation : projections additives sur StoryState — **aucun nouveau store, aucun nouveau canon** (interdit absolu, 4 canons existent déjà).

---

## 6. MULTI-LECTEURS (« faire relire par une autre personne ») — sous contrainte EMP-19

La doctrine : **tout lecteur est un instrument** ; un instrument sans profil de calibration = mesure invalide (EMP-19, loi permanente). État réel (mesuré N1-N6) : **gemma4 = SEUL juge LLM calibré non-biaisé** ; qwen3/mistral/phi4/command-r7b/llama3.1 **DISQUALIFIÉS** (biais de position) → *jury multi-modèles non viable aujourd'hui*.

Donc les « plusieurs avis » V1 = pluralité d'**instruments calibrés**, pas de modèles :
1. **Lecteurs CALC** (déterministes, toujours valides) : gates G1-G5, rythme, repeat, double-Bible diff.
2. **Lecteur LLM n°1** : gemma4 + prompt-juge calibré (profil existant).
3. **Lecteur LLM n°2** : gemma4 + **persona de relecture DIFFÉRENTE** (le couple modèle+prompt = un AUTRE instrument au sens EMP-19) → **exige son propre profil de calibration avant usage** (biais position, tie_rate). C'est la voie « une autre personne » conforme.
4. **SKEPTIC** : le contre-pouvoir (CNC-100) — l'avocat de l'accusation.
Futurs juges (nouveaux modèles) : admis seulement après calibration. ⚠ gap connu : gemma4 **générateur** n'a pas de profil Rosetta — à régler en prérequis.

---

## 7. CORRECTION vs COACHING — la frontière doctrinale (⚠ point à ratifier 3-IA)

**Loi scellée (ADR-003 + bench R6 Mode C = TOXIQUE empiriquement)** : réinjecter les **scores/features esthétiques comme directives** = surcorrection en cascade = INTERDIT. CALC = douanier, pas coach.
**Mais** l'écrivain de l'Architecte « corrige, optimise, nettoie » — et la MicroSurgery sovereign existe (+0.2 prouvé). Résolution proposée, en 3 niveaux :

| Niveau | Mécanisme | Statut doctrinal |
|---|---|---|
| N1 — **Régénération aveugle** | nouveau seed/variante du segment fautif, re-jugement (rejection pur) | ✅ conforme ADR-003 (déjà la doctrine) |
| N2 — **Correction FACTUELLE nommée** | le retry nomme la **violation de canon** (fait, pas score) : « Léna est enquêtrice, pas secrétaire — corrige » ; « le carnet a brûlé au ch.12 — il ne peut pas réapparaître » | 🟡 **PROPOSÉ** : c'est de l'*enforcement de vérité* (G2/G3), pas du coaching esthétique. ≠ Mode C (qui injectait des features CALC). **À ratifier 3-IA + Architecte** |
| N3 — **Coaching esthétique** (« écris des phrases plus longues », réinjection de sent_len/scores) | — | ❌ **INTERDIT** (Mode C toxique, EMP-16 Goodhart) |
Garde-fous N2 : uniquement sur échec G2/G3/G4 (jamais G7/G8) ; bounded (`MAX_RETRIES`, ex. 2) ; en dernier recours → meilleur admissible + flag `below_threshold` + télémétrie (fallback A, ADR-003). L'amélioration **esthétique** ne passe QUE par régénération + sélection (N1).

---

## 8. SÉLECTION (2 étages, anti-Goodhart)

**Étage A — filtre dur** : `Eligible(ci) = G1 ∧ G2 ∧ G3 ∧ G4 ∧ ¬SKEPTIC_FAIL`. Si ∅ → régénération ciblée (§7), jamais « le moins mauvais » direct.
**Étage B — score multi-objectif** (survivants seulement, pondérations v1 à calibrer) :
```
Score = 0.35·S-Oracle + 0.20·Fidelity + 0.15·Matter + 0.10·Rythme + 0.10·CanonConfidence + 0.10·NoveltyContrôlée
        − λr·RepeatPenalty(SHADOW v1) − λd·DriftPenalty
```
**Règles anti-Goodhart (absolues)** : aucune métrique seule ne décide ; bge-m3 jamais seul ; Oracle jamais seul (angle mort répétition prouvé) ; rythme/longueur jamais maximisés ; sélection **pareto** : admissible partout d'abord, meilleur ensuite. Repeat reste SHADOW tant que non prouvé sur plusieurs livres (kill-switch usuel pour le durcir).

## 9. PERSISTANCE (leçon Best-of-N payée — non négociable)
Par chapitre, TOUT est conservé : `r6_run_id, chapter_id, plan_hash, context_hash` + **par candidat** : `candidate_id, prompt_hash, model, temperature, seed, TEXTE INTÉGRAL, tous scores, tous verdicts de gates, raisons d'échec` + `winner_current, winner_shadow_repeat, selector_formula_version` + diff double-Bible + cartes. Sans le texte des rejetés, aucun audit possible.

## 10. FRONTIÈRES (scellées par cet ADR)
**BookFactory** = plan, canon, état, dettes, seeds/payoffs, double-Bible (AUTORITÉ STRUCTURELLE — jamais déléguée au LLM). **Scribe** = la plume (prose, voix, scène, dialogue) — ne vérifie JAMAIS la cohérence. **Sovereign/Oracle/juges** = mesure + sélection. **R6 = un pont, pas un dieu** : il orchestre, il ne devient ni un 5ᵉ canon ni un juge magique.

## 11. VARIANTES + ROADMAP + CRITÈRES PASS
- **R6-Lite** (premier branchement) : N=3, G1+G2+Repeat-shadow, S-Oracle advisory, persistance totale, sélecteur simple.
- **R6-Core** (cible) : N=7 profils, tous gates, extracteur ①-⑤ minimal + double-Bible diff, SKEPTIC, sélecteur 2 étages, evidence pack.
- **R6-Tournament** (après preuve) : N=9-12 par familles, duels pairwise calibrés, front de Pareto.
**Roadmap gatée** : R6-A (cet ADR, validation) → R6-B (interface `ScribeR6Generator`, sans prod) → R6-C (persistance candidats) → R6-D (Fidelity + Repeat-shadow) → R6-E (S-Oracle advisory) → R6-F (extracteur + double-Bible + SKEPTIC) → R6-G (Tournament).
**PASS R6-Core (test)** : 3 chapitres × N=7 → 21 textes persistés ; fidelity 100 % ; zéro dérive rôle/lieu ; winner > génération directe sur ≥2/3 chapitres ; répétition non aggravée. **PASS livre** : 30 chapitres, zéro chapitre sans admissible, zéro contradiction canonique majeure, rôles/lieux stables, seeds/payoffs honorés, diff double-Bible propre.

## 12. PRÉREQUIS (état réel)
1. **P0.6b (knows=JTB, reader séparé, PROMOTE source)** : ✅ **FAIT et scellé** (13 tests, revue adverse SOUND, 2026-06-05) — exigé par ChatGPT, déjà livré.
2. **repeat-shadow terminal** (patch duel-engine sovereign) : vérifié, **en attente de commit Architecte** (hooks). Pour R6 book-factory : métriques repeat candidat-level recalculées dans NOTRE couche (additif, zéro mutation sovereign) — pas bloquant.
3. **Calibration EMP-19** : profil juge gemma4 ✅ ; profil **persona-relecteur n°2** à calibrer ; profil **générateur** gemma4 (Rosetta) = gap connu à combler.
4. **Décisions liées** : NCR-M0B (OPEN) + frontière DEC-009 — cet ADR propose la résolution §10 ; ratification Architecte.

## 13. INTERDITS (gravés)
Aucun code R6 avant validation de cet ADR · aucun nouveau canon/truth-gate/store · aucune cohérence déléguée au LLM · aucun score unique décideur · aucun coaching esthétique (N3) · aucun R6 prod sans persistance candidats · aucun LoRA/DPO · aucun run 60k « validé production » avant R6-Core PASS · FROZEN intouchés.

---

## VERDICT
- **Statut : PROPOSED.** Confiance : Haute sur l'architecture (chaque organe justifié par un échec mesuré + mappé sur de l'existant) ; Moyenne sur les pondérations §8 (à calibrer) et le niveau N2 (§7, à ratifier).
- **Forces** : (1) la vision écrivain de l'Architecte devient une mécanique exécutable (relecture 2 voix, 5 phases, multi-lecteurs, double-Bible+carte) ; (2) boucle FERMÉE — l'hallucination devient un diff EXTRA/MUTATED détectable ; (3) conforme aux lois scellées (ADR-003, EMP-16/19, anti-Goodhart) avec la seule extension (N2) explicitement soumise à ratification ; (4) réutilise tout (StoryState, gates scribe, SKEPTIC, S-Oracle, ChapterGenerator) — zéro 5ᵉ canon ; (5) persistance totale = auditable.
- **Faiblesses** : (1) l'extracteur ①-⑤ reste le maillon dur (qualité d'extraction = qualité du diff) — CALC-first + calibration + SKEPTIC en filet, mais risque résiduel réel ; (2) coût : N=7 × segments × retries ≈ ×10-20 vs 1-passe (≈15 s/chap → minutes/chap) ; (3) « motifs d'ambiance sémantiques » (G5 niveau 2) à définir métriquement ; (4) un seul juge LLM calibré aujourd'hui (pluralité limitée en V1).
- **Risques restants** : N2 mal borné pourrait recréer du feedback toxique (d'où ratification 3-IA + garde-fous) ; double rejection scribe/sovereign si §10 non respecté.
- **Action requise** : lecture + validation **Architecte** (notamment §7-N2, §8 pondérations, §11 variante de départ R6-Lite) + passage **3-IA** sur §7. **ZÉRO code avant ce GO.**
