# OMEGA DOCUMENTATION MUSEUM — README

> **Statut**: SCELLÉ 2026-05-31 (EMP-15 DOCUMENTATION_TOPOLOGY_MUSEUM) · **Mode**: NON_SOURCE_OF_TRUTH_RUNTIME
> **Principe**: *musée, pas purge.* Rien n'est supprimé ; tout est isolé, étiqueté, et **indexé au catalogue**.

---

## 1. Règle d'or — « evidence, not authority »

Tout document sous `docs/archive/museum/` est **NON_SOURCE_OF_TRUTH_RUNTIME**.

**INTERDIT** d'y fonder **SEUL** :
- une décision architecture,
- une NCR / sa clôture,
- une modification de code moteur,
- l'identité du moteur de production,
- l'état build/test.

Un doc muséé explique **POURQUOI** OMEGA est devenu ainsi — **pas ce qu'il EST maintenant**.

## 2. SSOT (source de vérité runtime)

```
SSOT  =  docs/  +  nexus/proof/  +  sessions/   (+ le CODE dans packages/ src/ gateway/)
```
Le musée est **hors SSOT**. En cas de conflit musée ↔ SSOT : **SSOT gagne** (REPO=TRUTH).

## 3. Procédure d'usage AVANT de citer un doc muséé

1. Vérifier `git log -1` (HEAD) et `git status` (tree clean ?).
2. Trouver la **source courante équivalente** via `docs/INDEX/` (colonne « source courante » du catalogue).
3. Recouper avec le **runtime** (code / tests / mesure), jamais le doc seul.
4. Citer le doc muséé uniquement comme **contexte historique** (« pourquoi »), avec mention `[MUSEUM]`.

## 4. Le catalogue fait foi

`MUSEUM_CATALOG.md` **fait foi du contenu du musée** : il permet de savoir ce qui est au musée **sans rescaner** le dépôt. Tout item déplacé ici DOIT y avoir une ligne (ancien chemin → nouveau chemin → raison → source courante → statut). Un item muséé absent du catalogue = **violation EMP-15**.

## 5. Topologie du musée

```
docs/archive/museum/
├── README_MUSEUM.md            (ce fichier — politique)
├── MUSEUM_CATALOG.md           (catalogue maître — fait foi)
├── STALE_EXPORTS/              (exports périmés : deposit_2026-02-23/ …)
├── SESSION_SAVES_legacy/       (session-saves éparpillés racine)
├── ROOT_STRAYS_2026-05-31/     (Rosetta/MasterPlan/Certs/Codex anciennes versions)
└── …                           (chaque sous-dossier porte un MUSEUM_HEADER.md)
```

## 6. Vagues

- **Vague 1 (ce sprint)** : DOCUMENTS uniquement (`git mv`, zéro suppression, zéro code).
- **Vague 2 (sprint séparé gaté build)** : snapshots de CODE + `omega-autopsie/` (3,6 GB) — **RÉFÉRENCÉS** au catalogue (`REGISTERED_NOT_MOVED`), décision LFS/zip à prendre.

## 7. Garde-fous (FAIL si violés)

`git add -A` interdit (EMP-13, staging ciblé par chemin) · suppression directe interdite (`git mv` only) · EMP-14 ne doit jamais régresser · binaires `.exe/.msi` restent pointeurs LFS · aucun snapshot de code déplacé en vague 1.

---
*Réf doctrine : CLAUDE.md §H amendement 14 (EMP-15) · CODEX v1-3-1.*
