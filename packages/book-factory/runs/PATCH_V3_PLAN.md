# PATCH V3 — PLAN D'EXÉCUTION + RECON (2026-06-09)
**GO** : convergence 3-IA (Gemini + ChatGPT) après gates PASS. **HOLD V4** jusqu'à certif V3.
**Base** : V3 gemma4 (runs/duel_gemma, 85215w, 50 ch). **Garde-fou** : `buildCanonical` + `enforceAuthorRules` (vitalité) re-certifie après chaque patch ; échec → annulation (modèle Gemini).

---

## 1. RECON — machinerie (anti-doublon, RÈGLE N°1)

| Besoin | Existe ? | Détail |
|---|---|---|
| Juger une candidate de regen | ✅ `guardRegen` (PE-3) | 6 invariants, pur, testé. **JUGE, ne génère pas.** |
| Générer un chapitre (LLM) | ✅ `chapter-generator.ts`, `book-orchestrator.ts`, paths Ollama | gemma4 Windows-side |
| **Appliquer** un patch (splice/cut/replace) + re-certifier + revert | ❌ **À CONSTRUIRE** | aucun `applyRegen/spliceChapter/mergeChapter` |
| Re-certifier | ✅ `buildCanonical(enforceAuthorRules:true)` | gate vitalité opposable |

→ **Pièce manquante = un EXÉCUTEUR** `patch-v3` : `op (CUT_MERGE | REPLACE) → manuscrit patché → guardRegen (pour REPLACE) → re-import → buildCanonical → ACCEPT/REVERT + INTEGRITY_REPORT`. Pur pour le splice ; la candidate REPLACE vient du LLM (séparé).

---

## 2. FINDING qui corrige le plan — ch.21 n'est PAS mort (1000% vérité)

Le work order listait **ch.21 = CUT/MERGE**. Lecture du chapitre réel : Garcia + Léna, scène construite, **ouverture de dialogue** (« Cette phrase n'était pas une défense, c'était une ouverture. Une fissure. »). Le label CUT_MERGE = **classement tercile RELATIF** (le moins défendable des 19), PAS « chapitre vide » — et le gate vitalité lui donne **0 violation**. Couper 1741 mots de scène réelle = la boucherie qu'on évite depuis le début.

**Décision proposée** : ch.21 → **REINFORCE** (escalader la « fissure » existante en confrontation/décision), pas CUT. + nettoyage du résidu de scaffold dans son titre (déjà retiré au build canonique, présent dans le brut). À valider 3-IA (la coupe structurelle renumérote 50→49 et touche ancres/seeds — décision d'arc, pas mécanique).

---

## 3. Plan par item (chacun guardé + re-certifié)

| Item | Défaut | Action | LLM ? | Garde |
|---|---|---|---|---|
| **ch.27, 31, 33** | noMover (CONFRONTATION sans moteur) | regen : « un personnage NOMMÉ AGIT/DÉCIDE » | ✅ gemma4 | `guardRegen` defect=mover (moversAfter>before, casting intact, zéro mort ressuscité) + vitalité |
| **ch.46, 49** | REINFORCE (ambiance mince) | injecter acte/décision/micro-révélation | ✅ gemma4 | `guardRegen` defect=soft_transition + vitalité |
| **ch.21** | ~~CUT~~ → REINFORCE (pas mort, cf §2) | escalader la fissure existante | ✅ gemma4 | idem 46/49 |
| **micro-payoffs** | back-loading (acte1=0/acte2=0) | 1 vérité locale acte1 + 1 preuve aggravante acte2 (bornés) | ✅ gemma4 | guard + interdits ChatGPT (pas de vérité centrale, pas de nouvelle intrigue) |

**Certification finale** : V3 patché → `buildCanonical(enforceAuthorRules:true)` PASS + 373 tests + hash + INTEGRITY_REPORT.

---

## 4. CHECKPOINT (avant génération LLM lourde)

Étapes 3 = **génération créative LLM détachée** (~5-6 chapitres + payoffs, gemma4 Windows-side, minutes/chap) via un exécuteur à construire. C'est une relance de phase lourde + une décision d'arc sur ch.21 (cut→reinforce). Je m'arrête ici pour :
1. **Confirmer la correction ch.21** (REINFORCE au lieu de CUT — il n'est pas mort).
2. Lancer ensuite : build exécuteur `patch-v3` (testable, non-créatif) → regens détachés guardés → re-certif → INTEGRITY.

**Rien n'est modifié sur le manuscrit canonique à ce stade.** Recon + plan + finding livrés.
