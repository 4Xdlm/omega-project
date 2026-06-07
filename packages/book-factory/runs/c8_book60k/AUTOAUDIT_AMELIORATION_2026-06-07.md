# AUTOAUDIT D'AMÉLIORATION ARCHITECTURALE + TECHNIQUE — 2026-06-07

**Ordre Architecte** : « on pousse un autoaudit d'amélioration architecturale et
technique, on réfléchit à ce qu'on peut améliorer et perfectionner. »
**Méthode** : chaque faiblesse est tirée d'un FAIT de cette session (pas d'opinion),
avec mécanisme causal, amélioration proposée, coût et risque. Priorisé P0/P1/P2.

---

## I. FAIBLESSES ARCHITECTURALES (constatées, pas supposées)

### A1 — Le pipeline canonique est une CONVENTION, pas un CONTRAT
**Fait** : l'ordre des étapes vit dans le `main()` de rebuild-final.ts. Le bug en
cascade scaffold→seam (la couture mangeait le `]` du markup quand le scaffold ne
passait pas avant) prouve que l'ORDRE est porteur de sens — or rien ne l'impose.
**Mécanisme** : deux étapes qui partagent la même surface (le texte) sans
invariants d'interface = couplage caché ; toute insertion future re-créera une
cascade. **Amélioration** : `ExportPipeline` déclaratif — stages typés
`{name, requires[], provides[], run, csv}` avec vérification d'ordre à la
construction (Semantic exige Seam ; Seam exige Scaffold). Le pipeline devient
testable unitairement (T3) et auto-documenté.

### A2 — Les critères de sortie mélangent les NIVEAUX de propreté
**Fait** : le refus ChatGPT (NCR-003) — « fermeture orthographique ≠ fermeture
narrative ». proof4 disait « propre » au niveau syntaxe pendant que le texte était
troué au niveau sens. **Amélioration** : typer les niveaux —
`SYNTAX_CLEAN` (terminateurs, P4) < `SEMANTIC_CLEAN` (stems, guillemets, P6-P9)
< `NARRATIVE_CLEAN` (continuité, arcs — C9/R6, niveau supérieur non couvert par
l'export). Chaque proof déclare son niveau ; un closeout n'annonce JAMAIS un
niveau qu'il n'a pas testé. Coût faible (taxonomie + renommage), gain : plus
jamais un « 5 preuves PASS » qui sur-promet.

### A3 — QUATRE représentations d'entités non unifiées (la vraie dette)
**Fait** : CharacterRegistry (C1, mint NONCE) ; entités du mention-annotator
(déclarées à la main dans annotate-final.ts) ; cast du génome (NCR-MYC-001,
validatedCast) ; cibles du GPS. Même concept, 4 encodages — la duplication
KNOWN[] vs ENTITIES[] dans deux scripts de cette session en est le symptôme.
**Mécanisme** : toute divergence entre ces 4 = classe entière de bugs d'identité
(la leçon « gardien→11 noms » du Doctor E2E). **Amélioration (P0)** :
**REGISTRE D'ENTITÉS TYPÉ UNIQUE** — étendre le mint C1 aux kinds
CHARACTER/PLACE/EVENT/OBJECT (le `EntityKind` livré aujourd'hui), consommé par
annotator, génome, GPS, Studio. C'est le PRÉREQUIS du Casting Total (loi
« Dubois », mandat Gemini) : minter figurants et lieux AVANT le chapitre 1.

### A4 — Les classes de mots main-codées restent une myopie résiduelle
**Fait** : LEGIT_SHORT_ENDINGS, CONTINUATION_DEMAND, CLAUSE_FINAL_OK sont des
sets écrits à la main ; « culp » (4 lettres) a échappé au stem 1-3 lettres
jusqu'au correctif corpus. Le correctif data-driven (hapax + préfixe-strict) a
montré la voie. **Amélioration (P2)** : dériver/valider ces classes depuis
LEGION (1037 livres FR déjà indexés) — la fréquence d'un mot en POSITION FINALE
de phrase dans le corpus réel est un score empirique de « clause-finalité »
(« voir » termine quasi jamais une phrase ; « là » souvent). Les sets actuels
deviennent des seeds vérifiés, plus des dogmes.

### A5 — Studio V1 est un habitacle mono-chapitre sans instruments
**Fait** : le Studio bundle le moteur réel mais n'affiche ni pointeurs ni radar ;
PRESENCE_MAP.json (livré aujourd'hui : qui/où/quoi par chapitre, 3691 mentions
typées) est exactement la nourriture qui lui manque. **Amélioration (P1, mandat
Gemini)** : Studio V2 — (1) annotation temps réel : taper « Gaspard » → le GPS
affiche dangers/routes du charId ; (2) CASTING TOTAL GATE : interdiction d'écrire
le ch.1 tant que figurants et lieux ne sont pas mintés (le routeur BF-09 sait
déjà refuser par capacité — même mécanisme) ; (3) multi-chapitres avec presence
map par chapitre.

### A6 — Pont V2 ProseDoc (ADR-022 acté aujourd'hui)
**Fait** : ADR-022 ACCEPTED Option B — R6 = vérité (veto seul), oracles scribe =
qualité advisory via pont V2. Le pont V1 (ScribeGatedRepairPort) ne passe PAS
par les gates réels du scribe. **Amélioration (P1)** : construire le ProseDoc
propre (segmentPlan→buildSkeleton) pour que les segments SURGICAL soient jugés
par les 7 gates scribe en advisory — refus-local ⇒ no-op sûr.

### A7 — Les preuves doivent respecter l'AUTORITÉ des instruments
**Fait** : proof2 comptait les FOOTWEAR INFO comme des échecs alors que le
scanner C9 les classe délibérément advisory — corrigé (WARN seul). **Règle à
généraliser** : chaque proof référence {instrument, niveau de sévérité testé} ;
une proof qui re-juge un instrument est elle-même un instrument non calibré.

## II. FAIBLESSES TECHNIQUES

### T1 — LLM de réparation sans préflight = hang prouvé
**Fait** : 8 min de blocage (qwen3.5:35b cold-load × N appels, timeout 120s
chacun). **Amélioration** : étendre le préflight EMP-19 au rôle « repair » —
health-check + modèle CHAUD exigé avant tout run, sinon refus immédiat (pas de
dégradation silencieuse). Le mode déterministe par défaut (acté) reste la base.

### T2 — La logique du canonique vit dans un script, pas une fonction
**Fait** : rebuild-final.ts n'est pas testable unitairement ; zéro test E2E du
pipeline complet. **Amélioration (P0)** : extraire `buildCanonical(v0, opts) →
{text, proofs, csvs}` + test E2E sur mini-livre fixture (3 chapitres avec défauts
injectés connus : scaffold + couture + stem + guillemet). Cycle complet prouvé
à chaque commit, plus seulement à chaque run manuel.

### T3 — 14,3 % de mentions non résolues = pronoms et périphrases
**Fait** : resolvedRate 85,7 % ; le reste = « il/elle », « le maire », « le
vieux ». **Amélioration (P2, SHADOW d'abord)** : coréférence LÉGÈRE par focus de
scène (dernier personnage mentionné du même genre = antécédent probable) —
livrée en shadow avec taux de confiance, JAMAIS autoritaire (leçon : proxys
calibrés sur gold-set avant promotion).

### T4 — Evidence packs au format ad-hoc
**Fait** : chaque NCR invente son JSON/CSV. **Amélioration (P2)** : schéma
d'evidence unifié {ncr, stage, before, after, hash, instrument, severity} —
requêtable, diffable entre runs.

## III. PRIORISATION

| P | Item | Pourquoi d'abord | Coût |
|---|---|---|---|
| **P0** | A3 registre d'entités typé unique | prérequis Casting Total + Studio V2 + supprime la duplication 4× | 1 module + adaptation 3 consommateurs |
| **P0** | T2 buildCanonical testable + E2E fixture | le canonique est le LIVRABLE — il doit être prouvé en CI, pas à la main | extraction + 1 fixture |
| **P1** | A5 Studio V2 (annotator temps réel + GPS charId + casting gate) | mandat Gemini ; toutes les briques existent (presence map, router, radar) | bundle + UI |
| **P1** | A6 pont V2 ProseDoc | ADR-022 acté ; donne aux SURGICAL la juridiction qualité | chantier dédié |
| **P1** | A1 ExportPipeline déclaratif + A2 niveaux de propreté typés | anti-cascade structurel + anti-surpromesse | refactor borné |
| **P2** | A4 classes de mots LEGION-driven · T3 coref shadow · T4 evidence schema · T1 préflight repair | perfectionnements mesurables, non bloquants | itératif |

## VERDICT
- **Statut** : PASS (audit complet, chaque item ancré sur un fait de session)
- **Confiance** : Haute sur les constats ; Moyenne sur les coûts estimés
- **Forces** : zéro item spéculatif ; chaque amélioration a un mécanisme causal
  et un précédent dans les leçons de la session ; priorisation alignée mandats
  tribunal (Casting Total, Studio V2, pont V2)
- **Faiblesses** : (1) NARRATIVE_CLEAN (A2 niveau 3) n'a pas encore d'instrument
  de niveau export — C9/R6 le couvrent en amont seulement ; (2) la coréférence
  T3 est le seul item à risque de sur-ingénierie — d'où SHADOW obligatoire
- **Risques restants** : Studio V2 sans A3 d'abord recréerait une 5ᵉ
  représentation d'entités — l'ordre P0→P1 est impératif
- **Action requise** : arbitrage Architecte sur l'ordre P0/P1 proposé
