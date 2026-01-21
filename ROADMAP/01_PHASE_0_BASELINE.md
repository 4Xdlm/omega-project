# OMEGA — PHASE 0: BASELINE & SANITY

## Statut: 🔄 EN COURS

---

## OBJECTIF

Figer l'état **réel** du repo avant toute modification.
Point zéro incontestable.

---

## MODULES CONCERNÉS

Aucun. Phase 0 = mesure uniquement.

---

## LIVRABLES

| Fichier | Contenu |
|---------|---------|
| `baseline_git.txt` | Git status, branch, HEAD, commits récents |
| `baseline_env.txt` | Node, npm, OS, versions |
| `tests_before.txt` | Output complet des tests existants |
| `tree_structure.txt` | Arborescence projet |
| `package_snapshot.json` | Copie package.json |
| `ROOT_HASH.txt` | Hashes de tous les fichiers + root hash |

**Emplacement:** `PROOFS/phase0-BASELINE/`

---

## GATE 0 — CRITÈRES DE PASSAGE

| Critère | Requis |
|---------|--------|
| Git documenté | ✅ |
| Environnement documenté | ✅ |
| Tests exécutés | ✅ (même si fails) |
| ROOT_HASH calculé | ✅ |
| 6 fichiers produits | ✅ |

**Note:** Si des tests échouent, ce n'est PAS un FAIL. On documente l'état réel.

---

## PERF AUTORISÉE

❌ **NON.** Zéro discussion performance. Phase 0 = mesure uniquement.

---

## INTERDICTIONS

- ❌ Modifier du code
- ❌ Corriger des tests
- ❌ Mettre à jour des dépendances
- ❌ Refactorer
- ❌ Proposer des améliorations

---

## PROCHAINE PHASE

→ **PHASE 1: V4.4 CONTRACT** (si GATE 0 = PASS)
