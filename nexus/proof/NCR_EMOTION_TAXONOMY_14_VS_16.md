# NCR-EMOTION-TAXONOMY-14-VS-16
**Status**: OPEN | **Severity**: MEDIUM | **Ouvert**: 2026-07-21 | **Origine**: spec V4.4→R6 (grounding code)

## Issue
La spec V4.4→R6 supposait une seule taxonomie émotionnelle « Emotion14 (ou 16) ». Le grounding du code révèle **DEUX taxonomies 14-émotions DISTINCTES et incompatibles terme à terme**, plus une dette documentaire « 16 ».

1. **`genome` — `Emotion14`** (`packages/genome/src/api/types.ts`, SANCTUARISÉ) :
   `joy, sadness, anger, fear, surprise, disgust, trust, anticipation, love, guilt, shame, pride, envy, hope`.
   Rôle : fingerprint / similarité narrative (`analyze` prend des données pré-calculées, read-only). **NE dérive PAS l'émotion depuis la prose.**

2. **`omega-forge` / `sovereign` — Plutchik-14** (`SemanticEmotionResult`, consommé par `oracle/axes/tension-14d.ts`) :
   `joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, submission, awe, disapproval, remorse, contempt`.
   Rôle : **mesure prose→émotion déterministe** (`analyzeEmotionFromText`, 0 token) + scoring de conformité à une trajectoire (`scoreTension14D`, ×3.0 dans l'Oracle). C'est ce que consomme `EmotionContract.curve_quartiles[].target_14d`.

3. **Docs « 16 émotions »** (Concept Ledger `CONCEPT-EMOTION-PHYSICS-V44-001`, VISION) : mention de 16 états. **Aucun code n'implémente 16.**

**Impact bridge** : le `EmotionContract` (target_14d) et le scoreur `scoreTension14D` parlent **Plutchik-14 (forge)**. Un contrat de chapitre rédigé dans l'espace `genome-Emotion14` serait scoré dans un espace DIFFÉRENT → mismatch silencieux. Les 6 termes divergents (guilt/shame/pride/envy/hope ⟷ submission/awe/disapproval/remorse/contempt) ne s'alignent pas.

## Options
1. **REPO=TRUTH, rôles séparés, ZÉRO migration (RECOMMANDÉ)** :
   - Le bridge R6 utilise **Plutchik-14 (forge)** end-to-end (c'est déjà ce que `EmotionContract` + `scoreTension14D` parlent) ;
   - `genome-Emotion14` reste la taxonomie de **fingerprint** (inchangée, sanctuarisée) ;
   - la mention « 16 » = **dette documentaire** → aligner les docs sur « 14 (deux taxonomies, deux rôles) ».
   - Aucune modif moteur. Aucun risque.
2. **Unifier les deux taxonomies 14** (une seule liste canonique) : modif `genome` (SANCTUARISÉ) → NCR séparé + **EMP-16 (3 preuves)** + migration des fingerprints. **LOURD. HOLD.**
3. **Migrer vers 16** : aucune preuve que 16 soit voulu ; probable dette doc. **REJETÉ sauf décision Architecte.**

## Décision (proposée, en attente validation Francky)
- **Option 1 adoptée pour débloquer le bridge** : le scoreur émotionnel R6 = **Plutchik-14 (forge)**, taxonomie opérationnelle. `genome-Emotion14` non touché.
- `Emotion14` (genome) et Plutchik-14 (forge) coexistent par rôle — documenté ici comme vérité repo.
- Migration/unification = **HOLD** jusqu'à décision Architecte (hors périmètre bridge shadow).

## ⚠️ CORRECTION CRITIQUE (2026-07-21, alerte Architecte « vieux moteur au garage »)
**La conclusion « utiliser forge Plutchik-14 comme scoreur émotion » ci-dessous est PARTIELLEMENT INVALIDÉE.** Vérification faite : le canon **`Emotion14 target_14d` (`deriveEmotionContract.ts`)** et le runtime **`emotion_14d`/`tension_14d`** sont **GARAGE/DORMANT** sous **`FORBID-CANON-GARAGE-001`** (`NCR_EMOTION14_CANON_DRIFT` ; OMEGA_ULTRA_VISION 2026-06-08 : « Emotion14 target_14d — GARAGE — NE PAS RESSUSCITER »). Leçon scellée `NCR_V2_3_ORACLE_ECC_14D_INCOMPATIBLE` : interdit de forcer `target_14d` (qui reste `{}`) pour faire passer un Oracle. Motif du garage (WS-C) : 14D « estimé/calculé mais pas mesuré avec rigueur » → résurrection = **Tribunal + preuve WS-C de pouvoir discriminant mesuré**, PAS un câblage.
**Conséquence** : `scoreTension14D`/`target_14d`/`omega-forge` ne peuvent PAS servir de source `emotion01` du bridge tant que le garage n'est pas levé. Le **code du bridge reste valide** (agnostique : `emotion01` injecté, aucun import du garage — vérifié). La **SOURCE émotion est UNRESOLVED/gatée** : à définir hors garage (voie WS-C approuvée Tribunal). Le taxonomie 14/16 reste tranché (Option 1) mais ne suffit pas — le blocage réel est le garage, pas la taxonomie.

## Décision Architecte
**2026-07-21 — OPTION 1 ADOPTÉE** (taxonomie), **MAIS SOURCE ÉMOTION GATÉE GARAGE**. Statut : **taxonomie RESOLVED ; source émotion OPEN (garage)**.
- Le bridge R6 reste **agnostique du moteur** ; la taxonomie cible, SI un jour un scoreur non-garé est approuvé, sera Plutchik-14 côté forme — mais **aucun câblage de `scoreTension14D`/`target_14d` autorisé** (FORBID-CANON-GARAGE-001).
- `genome-Emotion14` reste la taxonomie de **fingerprint**, SANCTUARISÉE, non touchée.
- Mention « 16 émotions » = **dette documentaire** → aligner les docs sur 14.
- **INTERDITS actés** : aucune migration vers 16 ; aucune unification de taxonomie ; aucune mutation genome.
- Axe logique du composite (25 %) : **`continuity-oracle`** (couplé arc + CharacterRegistry) désigné (Gemini) ; en attendant le branchement, fallback `logic01=0.5` + composite dual `emotion_style` (60/40) pour isoler l'effet émotion (ChatGPT).
