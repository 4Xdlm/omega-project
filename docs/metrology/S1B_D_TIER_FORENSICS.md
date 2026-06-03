# S1B-0 — FORENSIQUE TIER-D (avant scellement Gold-Set)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Déclencheur** : Architecte (« le tier D a été fait avec des proses qualité-D de ChatGPT, à vérifier ») + Tribunal 3-IA · **Méthode** : lecture manifest 1334 + énumération Downloads + grep synthétique (read-only)

> Mandat : ne PAS conclure « D absent » globalement ; prouver ou réfuter explicitement la nature du D historique. Ne jamais mélanger C_FORMULAIC, D_SOURCE_REAL, D_SYNTHETIC.

---

## 1. RÉSULTAT PRINCIPAL — le tier-D est du PULP PUBLIÉ RÉEL (pas du ChatGPT)

Le `FULL_CORPUS_MANIFEST.json` (1334) contient **126 entrées tier-D** (FR=124, ENG=2). Inspection des noms :
- **FR/D = genre/pulp publié réel** : Coplan (Paul Kenny), *Les Enquêtes de Sharko* (Thilliez), Chattam, OSS 117 (Jean Bruce), SAS (Gérard de Villiers), Bob Morane (Henri Vernes), Guillaume Musso, romance (Nina Marx)…
- **ENG/D = 2 entrées junk non-fiction** (« White Nationalist Guide to the Movies », « Summary of Lessons in Chemistry ») — inutilisables.

**Localisation physique** : ces titres sont dans `Downloads/livre/corpus D a trier/` (**153 fichiers epub**), confirmé par énumération. (Les `txt_path` du manifest pointent vers une session antérieure `clever-keen-clarke` — périmés, 0/126 existants aujourd'hui.)

**Verdict** : le tier-D = **D_SOURCE_REAL_FR** (pulp/genre PUBLIÉ). **Le souvenir « D = proses ChatGPT » est NON CONFIRMÉ.**

## 2. RECHERCHE D'UN SET SYNTHÉTIQUE ChatGPT — EVIDENCE_GAP

`grep -ri "chatgpt|synthet|généré|bad prose|mauvaise prose"` sur `omega-project` + `omega-autopsie` (md/json) = **0 résultat** lié à un corpus D.
**Statut** : `EVIDENCE_GAP_D_SYNTHETIC` — aucun corpus D synthétique ChatGPT trouvé dans repo/workspace/autopsie. Soit souvenir erroné, soit set hors de ces emplacements. **Ne pas supposer son existence.** Si retrouvé plus tard → classer `D_SYNTHETIC_CHATGPT` = contrôle adversarial négatif, JAMAIS mélangé au D réel ni au C.

## 3. CAUSE DU « FR/D=0 » INITIAL (corrigée)

Mon extraction S1A a parsé le tier depuis les sous-dossiers `S|A|B|C|D`. Le dossier **« corpus D a trier »** n'a pas de lettre de tier → ses 153 fichiers ont été extraits avec `tier_folder=''` (buckets non-tierés, ~670 OK). D'où le « FR/D=0 » **erroné**. **Fix** : mapper `corpus D a trier` → tier `D` (D_SOURCE_REAL_FR).

## 4. CORRECTION DE FORMULATION (ChatGPT, adoptée)
- ❌ « tier D absent »
- ✅ « tier D absent des sous-dossiers tier-lettrés ; PRÉSENT sous `corpus D a trier` (153 FR pulp publié réel) ; D synthétique ChatGPT = non trouvé (evidence-gap) ».

## 5. TAXONOMIE DE FAMILLES (adoptée pour le Gold-Set)
Cellules distinctes, jamais mélangées :
`MASTER_NATIVE_FR` · `MASTER_TRANSLATED_FR` (séparé) · `MASTER_NATIVE_EN` · `C_FORMULAIC_FR/EN` (genre mid, ex-FR/C) · `D_SOURCE_REAL_FR` (pulp publié = « corpus D a trier ») · `BEST_SELLER_FR/EN` · `D_SYNTHETIC_CHATGPT` (EVIDENCE_GAP, contrôle négatif si retrouvé) · `OMEGA_WEAK/GOLDENS` (futur).

## 6. IMPACT SUR LE CONTRASTE DE MESURE
On dispose désormais de **deux contrastes** distincts, à mesurer séparément (ne pas confondre la portée) :
- **S vs D_SOURCE_REAL** = maître vs **pulp publié réel** (contraste fort, le plus discriminant). ✅ disponible (≈153 FR).
- **S vs C_FORMULAIC** = maître vs **genre formulaïque mid** (contraste plus subtil). ✅ disponible.
Le rapport de mesure devra énoncer lequel est testé. Gemini : « distinguer Flaubert d'un roman de gare humain = le vrai test ».

## 7. ACTIONS (mise à jour Gold-Set, avant S1C/scellement)
1. Re-tag extraction : `corpus D a trier` → `D_SOURCE_REAL_FR`.
2. Reconstruire Gold-Set en familles §5 ; **purger les traductions** de MASTER_NATIVE ; **exclure non-fiction** ; **canonicaliser auteurs** (fusion variantes Flaubert/Hugo/Le Clézio) pour split-par-auteur valide.
3. Cible **n=30 ultra-propres/cellule** (Gemini ; seuil TCL) plutôt que 50 bruités.
4. Cellules de mesure CERTAIN : MASTER_NATIVE_FR/EN, D_SOURCE_REAL_FR, C_FORMULAIC_FR/EN. MASTER_TRANSLATED et BEST_SELLER = séparées.

## VERDICT
- **Statut** : PASS (forensique) — D-tier nature ÉTABLIE (pulp publié réel), souvenir ChatGPT RÉFUTÉ/evidence-gap.
- **Confiance** : Haute (manifest + énumération + grep).
- **Forces** : vrai S vs D désormais possible ; familles séparées ; formulation corrigée.
- **Faiblesses** : (1) D synthétique = evidence-gap non résolu (à reclasser si retrouvé) ; (2) 2 ENG/D junk → EN aura D faible, le bas EN restera C ; (3) « corpus D a trier » = « à trier » → contrôle qualité requis (doublons avec FR/C probables).
- **Action requise** : re-tag + rebuild Gold-Set familles + n=30, puis S1C humain, puis scellement. STOP avant embeddings.
