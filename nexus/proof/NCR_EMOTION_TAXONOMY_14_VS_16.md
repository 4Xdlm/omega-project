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

## Décision Architecte (à remplir)
_Pending Francky._ — (a) valider Option 1 ; (b) trancher si l'unification long-terme est souhaitée ; (c) autoriser l'alignement documentaire « 16 → 14 ».
