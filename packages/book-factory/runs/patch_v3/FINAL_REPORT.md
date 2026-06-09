# V3 PATCHED — RAPPORT FINAL (MACHINE-CERTIFIED)
**Date** : 2026-06-09 · **Statut** : `V3_PATCHED_MACHINE_CERTIFIED = TRUE` · **Publication** : `HOLD HUMAN_FINAL_READ`

## Hash & taille
- `CERTIFIED_V3_PATCHED_HASH` = **b7b6c036dbeb2a1c6b43ce70a25461b724b4e3fbda368a888dea3a6532429d20**
- Base (V3 gemma canonique) : `3025744d…` → patché : `b7b6c036…`
- Mots : **85067** (50 chapitres)

## Patches appliqués (6)
| Chapitre | Type | Vérification |
|---|---|---|
| ch.21 | REINFORCE (escalade fissure Garcia/Léna) | movers 2→3, guard ok, vitalité ok |
| ch.46 | REINFORCE | guard ok, vitalité ok |
| ch.49 | REINFORCE | seed 123 (retry après 2 rejets TIC), guard ok |
| ch.16 | PAYOFF `{clé}` — vérité locale (accès Léna) | guard ok, vitalité ok |
| ch.32 | PAYOFF `{clé→registre}` — preuve aggravante (anomalie → Yvon/Gaspard) | retry tic-aware, tic 1.22→1.09, guard ok |
| ch.27/31/33 | ACCEPTÉS tels quels (faux noMover, agence par confrontation) | re-mesure EMP-16 |

## Gates passées (build final)
SYNTAX_CLEAN ✓ · SEAM_CLEAN ✓ · SEMANTIC_CLEAN ✓ · **NARRATIVE_CLEAN ✓ (strict)** · AUTHOR_LOCKS_INTACT ✓

## Filet (preuve d'intégrité transactionnelle)
Chaque candidate passée par `applyPatch` (splice → guardRegen → buildCanonical[vitalité opposable] → ACCEPT/REVERT bit-identique). Rejets corrects observés : NO_MOVER_GAINED (ch.27 → re-mesure prouve faux défaut), TIC_INCREASED (ch.49/ch.32 → retry). Aucune candidate non certifiée admise.

## 3 défauts fantômes démasqués par la rigueur
1. CUT ch.21 (pas mort — scène vivante) → REINFORCE.
2. Gate identité (co-occurrence ≠ coréférence, faux-positif V3) → démotée ADVISORY.
3. noMover 27/31/33 (lexique mover trop physique) → agence par interrogation, acceptés.

## Artefacts finaux
- `MANUSCRIT_V3_PATCHED.md` (canonique certifié, 85067w)
- `CERTIFIED_V3_PATCHED.json` (hash + cleanliness + patches)
- `INTEGRITY.jsonl` (log par patch : guard, certif, hash, revert)

## Limites (honnêteté)
La certification = gates CALC (propreté + vitalité), **PAS jugement littéraire**. Le souffle, l'émotion, le plaisir de lecture, le naturel des scènes et la fatigue des tics résiduels = **lecture humaine finale requise** avant statut "production". V4 = HOLD.

## RÉVISION AP-1 (2026-06-09) — franglais nettoyé, gate LANG_CLEAN
- Nouveau hash : **24bb55dfa0091081…** (supersede b7b6c036). 85068 mots.
- 8 résidus anglais corrigés (substitution déterministe) : carefully→soigneusement, bothering→déconcertante, blending→se mêlant à, during→durant, conjugates(supprimé), weighted→peser sur, when→quand, would→allait. Le détecteur a trouvé 2 résidus de plus que la relecture humaine (when, would) ; 1 faux-positif exclu (standing = emprunt FR).
- `LANG_CLEAN = TRUE` désormais câblé dans buildCanonical (gate permanente). Propreté : SYNTAX/SEAM/SEMANTIC/NARRATIVE/LANG/AUTHOR_LOCKS = tous ✓.
