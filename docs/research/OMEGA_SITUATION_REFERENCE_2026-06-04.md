# OMEGA — Doc de référence de situation (avant tour de table)

**Date** : 2026-06-04 · **But** : capturer l'intégralité de l'état pour que rien ne se perde au tour de table (directive Architecte). Source de vérité de la session ; à lire avant toute décision. Standard OMEGA (mécanisme, limites, risques ; verdicts).

---

## 0. Résumé en une page
- **Forge par prompt = MORTE** (DEC-20260604-022). Lexical (0/12), sémantique N7 (signal fragile), N8 dimensionné (FAIL : voice 2/6, aucun levier passe la Règle des Deux Clés). À longueur constante, **aucune directive de surface** ne hisse OMEGA au niveau maître de façon stable+convergente.
- **Découverte instrumentale** : **juge gemma ⊥ radar bge-m3** (axes orthogonaux — engagement narratif vs conformité géométrique). → **Règle des Deux Clés** : une amélioration n'est validée que si juge ET radar concordent.
- **V1 = plafond du paradigme prompt**, code génération+métrologie figé (référence sceau `0c3cbc48`). Position bge-m3 ≈ +0.52 axe pulp→maître (supra-pulp, sous-maître). « Supra-commercial » = hypothèse non prouvée.
- **LoRA V2 techniquement PROUVÉ** : `gemma-4-31b-it` (multimodal, Apache-2.0) entraîné en QLoRA 4-bit sur RTX 5090, **VRAM pic 22.9/32 Go**, PASS_31B. Toolchain (torch cu128 + bnb 0.49 + peft + trl, Python 3.11) opérationnelle.
- **Mur des données** : dataset cadrage B (OMEGA→amélioré) data-starved (rendement 6.7%). DPO-1 self-preference préparé (14 paires, copyright-clean) mais **plafond auto-référentiel** : tout dataset issu d'OMEGA plafonne au meilleur OMEGA. Importer la qualité maître = **mur copyright** (modernes interdits, domaine public étroit).
- **Verdict des 3 IA (tour de table mené pendant la session)** : (1) lancer le **pilote DPO-1** comme preuve-de-concept (la boucle Génération→Jugement→DPO→poids bouge-t-elle l'aiguille ?), puis **geler la branche R&D Tier-S** ; (2) basculer sur l'axe commercial (book-factory) ; (3) la quête Tier-S exige un corpus exogène (domaine public + analyse des modernes achetés), structuré en couches.

---

## 1. Chronologie technique de la session

### 1.1 Campagne de forge (advisory, zéro moteur)
| Étape | Quoi | Résultat |
|---|---|---|
| Forge Chirurgicale | 4 leviers LEXICAUX Rosetta isolés (TTR, compression, contraste, rareté bigrammes), 12 cellules, thermostat de masse | **FAIL** 0/12 victoire juge ; Δradar sous-seuil + sign-instable |
| N7 sémantique | 6 leviers de SCÈNE (sous-texte, focalisation, nécessité images, tension interne, voix, + few-shot mimétique), 18 cellules | PASS conditionnel : 6/18 victoires (sémantique > lexical), `voice` 2/3 ; **dissociation juge⊥radar** ; mimétique 1/3 décevant |
| N8 confirmation | voice + internal_tension + subtext, 6 chapitres × 3, **Règle des Deux Clés** | **FAIL** : aucun levier wins≥4/6 + 0 SUSPECT. voice 2/6 (N7 non reproduit). Variance portée par le chapitre, pas le levier. Zone morte mixed = chapitre dégénéré (phrases 4 mots, répétition 0.80) |

**Mécanisme** : un LLM pilote des propriétés distributionnelles de surface via le prompt ; il n'acquiert pas par instruction l'architecture cognitive qui produit le style maître. La variance inter-chapitre domine l'effet-levier.

### 1.2 Clôture de paradigme (docs scellés)
- `DEC-20260604-022-PROMPT-FORGE-EXHAUSTED.md` — forge épuisée, aucun levier promu, Règle des Deux Clés doctrine.
- `OMEGA_V1_RELEASE_CANDIDATE.md` — V1 plafond, code figé, supra-commercial = hypothèse.
- `V5_MIMETIC_FORGE_SPEC.md` — forge RAG (déçue en N7).

### 1.3 Voie LoRA V2 (L0 → L1-A-bis)
| Phase | Résultat |
|---|---|
| L0 preflight (3 docs) | faisabilité cadrée ; reco dataset cadrage B (puis pivot) |
| Hardware probe | RTX 5090 32 Go Blackwell sm_120, CUDA 13.2, 64 Go RAM, 1.2 To. Toolchain ABSENTE au départ (torch CPU-only, py3.14) |
| L0.5 build env + smoke | env `C:\Users\elric\omega-lora\.venv` (uv, py3.11, torch cu128, bnb 0.49.2, peft 0.19, trl 1.5). **Smoke QLoRA PASS** sur petit modèle (Blackwell+bnb 4-bit OK) |
| L1-A validation modèle | base = **`google/gemma-4-31b-it`** (vrai base Ollama gemma4:31b, Gemma4ForConditionalGeneration MULTIMODAL, Apache-2.0, non gaté, 62.6 Go). Download bloqué anonyme → débloqué par **HF token** (user 4Xdlm) |
| L1-A-bis load test | **PASS_31B** : 4-bit 64s/17.45 Go, LoRA all-linear 133.6M, 1 step OK loss 11.88, **VRAM pic 22.9/32 Go**, adapter sauvé |

### 1.4 Données L1 — le vrai mur
- **Mining cadrage B** (OMEGA-faible → réécriture STRONG two-key) : 15 cellules, **1 paire**, rendement **6.7%** → SFT cadrage B NON viable.
- **DPO-1 self-preference** construit : 14 paires (chosen=OMEGA haut-radar 0.005-0.012 / rejected bas-radar −0.022/−0.005), 100% OMEGA, copyright-clean, depuis N5 télémétrie. Prêt à entraîner.
- **Constat** : approches self-référentielles (forge, cadrage B, DPO-1, self-SFT) **plafonnent au meilleur OMEGA**. Le mur Tier-S est un **mur de données**, pas (plus) technique.

---

## 2. Pièges/gotchas infra rencontrés (réutilisables)
1. **hf_transfer GÈLE à 0%** sur cette machine → ne pas l'utiliser ; download HF standard (hf_transfer OFF), reprise via cache.
2. **Download HF anonyme throttlé** → **HF token obligatoire** (persisté setx, user 4Xdlm).
3. **`ollama serve` SANS `OLLAMA_MODELS` explicite** démarre sur le mauvais dossier (qwen/mistral) ; le bon = **`C:\ollama-models`** (gemma4+bge-m3+nomic+...). Relancer via `Start-Process ... -Environment @{OLLAMA_MODELS="C:\ollama-models"}`.
4. Watchdog kill mid-download = jette le `.incomplete` (anonyme) ; laisser hf reprendre.
5. Python 3.14 système trop récent pour la stack training → env py3.11 dédié (uv).

---

## 3. Tour de table IA (synthèse des positions)

### 3.1 Sur la fork L1 (data LoRA)
- **ChatGPT** : GO **DPO-1** (pilote court, prouve que le levier LoRA bouge l'aiguille — PAS viser maître) ; NO SFT cadrage B ; HOLD DPO-3 ; NO bascule commerciale avant le pilote. Critère PASS = LoRA gagne ≥60% vs base + radar non dégradé + pas de dégénérescence.
- **Gemini** : GO **DPO-1** comme preuve-de-concept de la boucle Génération→Jugement→DPO→poids, PUIS **geler la branche R&D Tier-S** et **basculer commercial** (book-factory). V1 (0.52) suffit pour le marché de genre.
- **Convergence** : DPO-1 pilote d'abord (réversible, advisory, 14 paires prêtes), puis pivot. **Aucune intégration moteur, aucun SEAL.**

### 3.2 Sur la stratégie corpus (anciens + modernes + évolution)
- **Entraîner sur les anciens (domaine public) = NÉCESSITÉ** : non pour imiter l'archaïsme, mais pour apprendre les **invariants de grandeur** (densité, rythme, architecture, nécessité, voix, tension) — rapport signal/bruit supérieur (pas de standardisation « Netflix »).
- **Objectif ≠ imiter les maîtres** mais **apprendre ce qui traverse les époques** : séparer **formes d'époque** (longueur phrase, % dialogue, vocabulaire, intériorité, place du narrateur) des **invariants** (nécessité, voix, tension, perception, densité, cohérence).
- **3 axes orthogonaux à NE PAS confondre** : (1) **Prestige littéraire** (Nobel/Goncourt/Booker…), (2) **Succès public/commercial**, (3) **Forme stylistique mesurable**. + ajout : (4) **contexte historique**.
- **Cadre juridique STRICT** : domaine public = entraînement OK ; **modernes achetés = analyse/features/holdout/inspiration SEULEMENT, JAMAIS raw training sans licence**. Chaque texte tagué : source, droits, époque, langue, genre, prestige, commercial, usage autorisé.
- **Architecture en 3 couches** : A = domaine public maître (socle, SFT/contrastif) ; B = OMEGA self-preference (DPO-1, plafonné) ; C = modernes achetés (analyse/holdout, pas training).
- **Listes d'acquisition** (cf §5) : modernes FR (Mauvignier, Michon, Quignard, Ernaux, Modiano, NDiaye, Carrère, Kerangal, Énard, Mbougar Sarr…), internationaux (McCarthy, Morrison, Ishiguro, Fosse, Han Kang, Krasznahorkai…), commercial (Musso, Bussi, Thilliez, Chattam, Dicker, Lemaitre, Damasio…), anciens domaine public (Flaubert, Hugo, Balzac, Zola, Proust, Céline, Dostoïevski, Tolstoï…).

---

## 4. Décisions PARKÉES pour le tour de table
| # | Décision | Options | Reco IA |
|---|---|---|---|
| D1 | Pilote DPO-1 ? | GO maintenant / HOLD | **GO** (ChatGPT+Gemini) — preuve-de-concept réversible |
| D2 | Après DPO-1 : geler Tier-S + pivot commercial ? | oui / continuer R&D | **oui** (Gemini) — V1 suffit marché genre |
| D3 | Voie data Tier-S long terme | DPO-1 self-pref / DPO-3 hybride public-domain / couches A+B+C | **couches structurées** ; jamais corpus en vrac |
| D4 | Achats livres modernes | analyse/holdout only (pas training) | **oui, analyse seulement** (copyright) |
| D5 | **NOUVEAU — Moteur de physique de l'évolution de la prose** | cf `PROSE_EVOLUTION_PHYSICS_ATTACK_PLAN.md` | à arbitrer au tour de table |

---

## 5. Listes d'acquisition (consolidées, pour mémoire)
**Modernes FR (analyse/holdout)** : Mauvignier (La Maison vide / Continuer), Michon (Vies minuscules), Quignard (Tous les matins du monde), Ernaux (Les Années), Modiano (Dora Bruder), NDiaye (Trois femmes puissantes), Carrère (Limonov/Yoga), Kerangal (Réparer les vivants), Énard (Boussole), Mbougar Sarr (La plus secrète mémoire des hommes), Appanah, Collette.
**Internationaux** : McCarthy, Morrison, Ishiguro, Coetzee, Tokarczuk, Han Kang, Fosse, Krasznahorkai, Sebald, Bolaño, Cusk, Rooney, Atwood, Mitchell.
**Commercial/genre (analyse)** : Musso, Bussi, Thilliez, Chattam, Werber, Valognes, Da Costa, Dicker, Coben, Brown, Hoover, Yarros, Maas, + **Lemaitre** (Au revoir là-haut), **Damasio** (La Horde du Contrevent).
**Anciens domaine public (training socle)** : Homère, Sophocle, Virgile, Dante, Cervantes, Shakespeare, Montaigne, Rabelais, La Fayette, Racine, Molière, Voltaire, Diderot, Balzac, Stendhal, **Flaubert**, **Hugo**, Zola, Maupassant, Dostoïevski, Tolstoï, Tchekhov, Dickens, Melville, James, **Proust**, Kafka, Joyce, Woolf, Faulkner, **Céline** (oralité/rythme).
⚠️ Traductions récentes = potentiellement protégées ; privilégier originaux domaine public ou traductions domaine public.

---

## 6. État des artefacts (repo `phase-r-dispatcher-v33`)
- `docs/architecture/` : DEC-022, OMEGA_V1_RELEASE_CANDIDATE, DEC-019/020/021 (calibration), V5_MIMETIC_FORGE_SPEC.
- `docs/metrology/` : FORGE_CHIRURGICALE_*, N7_FORGE_SEMANTIQUE_*, N8_CONFIRMATION_*, rapports + CSV + RESULTS.json.
- `docs/research/` : L0_*, L0.5 smoke, L1A_* (load test PASS_31B), L1_MINING_REPORT, L1_DPO_DESIGN, L1_DPO1_meta, L1_AUTONOMOUS_ROADMAP_10H, + **ce doc** + `PROSE_EVOLUTION_PHYSICS_ATTACK_PLAN.md`.
- Env LoRA : `C:\Users\elric\omega-lora\.venv` ; modèle cache HF ; dataset `l1_dataset/L1_DPO1_preference.jsonl`.
- Mémoire : `project_etalonneur_emp19_2026-06-04.md` (état complet).

## VERDICT
- Statut : RÉFÉRENCE COMPLÈTE (rien perdu pour le tour de table). Confiance : Haute.
- Forces : trace exhaustive forge→V1→LoRA→données ; positions IA consolidées ; décisions parkées explicites ; listes + cadre juridique ; gotchas infra.
- Faiblesses : (1) « supra-commercial » non prouvé ; (2) market-share historique non encore sourcé (cf attack plan) ; (3) DPO-1 non encore exécuté.
- Action requise : ouvrir le tour de table sur D1-D5, notamment D5 (moteur physique d'évolution de la prose).
