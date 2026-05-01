# NCR_EVIDENCE_ARTIFACT_GAP_PATTERN

**ID** : NCR_EVIDENCE_ARTIFACT_GAP_PATTERN
**Title** : Pattern méta — artefacts de preuve référencés dans NCRs mais introuvables filesystem (Evidence Rot)
**Status** : **OPEN_DIAGNOSED**
**Severity** : P1
**Priority** : P1
**Opened** : 2026-05-01 (Sprint S8 V3 Étape 0 — convergence 3 IA)
**Owner** : Francky + Claude

---

## 1. Résumé

Pattern méta-NCR identifié pendant Sprint S8 Vague 2 : artefacts de
preuve cités explicitement dans des NCRs OMEGA sont introuvables sur
le filesystem actuel du repo. Effet "Evidence Rot" (wording Gemini).

## 2. Évidence empirique (2 cas confirmés au 2026-05-01)

**Cas 1 — `outputs/DIRECTIVE_ABLATION_VERDICT_v1.md`**
- Cité : `NCR_DIRECTIVE_BLOAT` §"Clôture > Evidence (SHA256 scellés)"
- Recherche exhaustive : 5 méthodes EMP-1..EMP-6 (Vague 2 C11)
- Résultat : **INTROUVABLE** sur disque, **jamais commité** dans aucune branche
- NCR dédié émergent : `NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING` (commit `5f0236d6`)

**Cas 2 — `M0B_SLIM_V34_COEFFICIENTS.json`**
- Cité : `NCR_R6_BENCH_SOURCE_MISSING` §4.3 (SHA256 `e75e3bb0..fe8424c`)
- Recherche : Vague 2 C13 audit (`Get-ChildItem -Recurse -Filter "*M0B*"`)
- Résultat : **INTROUVABLE** sur disque, SHA256 cité **non vérifiable empiriquement**
- Pas de NCR dédié — couvert par cet umbrella

## 3. Pattern observé

Ces 2 cas suggèrent une désynchronisation systémique entre :
- Documentation NCRs (références d'artefacts de preuve)
- Filesystem repo réel (présence physique des fichiers)

Causes possibles (NON tranchées — investigation S9+) :
- **H1** : Artefacts générés mais non versionnés (perdus au cleanup)
- **H2** : Artefacts produits dans worktree quarantaine puis effacés
- **H3** : Renames non répercutés dans NCRs
- **H4** : Fichiers archives backup externes (hors repo)
- **H5** : Mémoire d'audit sans validation filesystem au moment du scellage NCR

## 4. Impact

- **R1** : Traçabilité empirique des NCRs CLOSED affaiblie
- **R2** : Doctrine PROVE IT compromise si preuves manquantes
- **R3** : Audit rétroactif futur impossible si pattern s'amplifie
- **R4** : Confiance dans evidence pack global réduite
- **R5** : Risque méta — un NCR CLOSED_CONFIRMED peut reposer sur
  preuve manquante sans déclencher d'alerte automatisée

## 5. Action requise (Sprint S9+)

1. Audit complet : grep tous NCRs `nexus/proof/*.md` pour références
   d'artefacts (pattern : `/[A-Z_]+\.(md|json|csv|log)/`)
2. Vérification filesystem de chaque référence (Test-Path / git ls-files)
3. Recensement exhaustif des artefacts manquants (table consolidée)
4. Décision per-artefact : régénération / archivage manifest externe /
   closure ACCEPTED_DIAGNOSED_UNKNOWN avec mise à jour NCR source
5. Règle future **EVIDENCE_HASH_PRECONDITION** (amendement v3.1.0 C11) :
   toute référence d'artefact dans NCR doit inclure :
   - Path absolu vérifiable
   - Hash SHA256 calculé empirique au moment de la closure
   - Date de capture
   Mention "à sceller post-commit" comme placeholder durable = INTERDITE
6. Mise en place check CI : script qui parse tous NCRs et vérifie
   présence + hash de chaque artefact référencé

## 6. Convergence Tribunal 3 IA 2026-05-01

- **Gemini** : "Effet Evidence Rot, NCR umbrella structurel obligatoire
  pour traiter le pattern, pas chaque cas isolément"
- **ChatGPT** : "Pattern, pas accident isolé. Umbrella NCR + règle
  future EVIDENCE_HASH_PRECONDITION"
- **Cowork** : "F1 umbrella confirmé Q3 unanime. Remplace proposition
  NCR F1 dédié par umbrella structurel"

## 7. NCRs liés

- `NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING` (commit `5f0236d6`, P2 OPEN_DIAGNOSED)
  — cas 1 dédié, sera référencé par cet umbrella
- `NCR_R6_BENCH_SOURCE_MISSING` (commit `d610de87`, ACCEPTED_DIAGNOSED_UNKNOWN)
  — contient cas 2 §10.5
- `NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN` (commit `b9c8fec4`, DOCUMENTED P2)
  — pattern méta parallèle (anchors externes Cowork) ; cet umbrella couvre
  le pattern interne (artefacts repo)
- `NCR_REGISTRY_BROKEN_FILTER` (commit `d46587fc`, OPEN_DIAGNOSED P2)
  — pattern méta parallèle (registry script broken)

## 8. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR umbrella | Claude | S8.V3 Étape 0 | **DONE** |
| 2 | Audit complet artefacts (grep + Test-Path tous NCRs) | Claude | S9 | PENDING |
| 3 | Décision per-artefact (régénération / archivage / closure) | Francky | S9 | PENDING |
| 4 | Règle EVIDENCE_HASH_PRECONDITION (amendement v3.1.0 C11) | Cowork | S9 | PENDING |
| 5 | Mise en place check CI evidence-hash-validator | Claude | S9+ | PENDING |
| 6 | Audit rétrospectif NCRs CLOSED via evidence-gap | Claude | S9+ | PENDING |

## 9. Doctrine

NCR OVER HEROICS — pattern méta capturé à part, pas masqué dans NCRs
individuels. PROVE IT — règle future EVIDENCE_HASH_PRECONDITION
empêche futurs evidence-gaps. NASA-Grade L4 — la doctrine PROVE IT
n'a de sens que si les preuves sont **présentes et vérifiables au
moment de l'audit**, pas seulement au moment du scellage initial.

## 10. Signature

```
NCR-ID    : NCR_EVIDENCE_ARTIFACT_GAP_PATTERN
OPENED    : 2026-05-01 (Sprint S8 V3 Étape 0 — Tribunal 3 IA)
STATUS    : OPEN_DIAGNOSED — umbrella P1, fix queue Sprint S9+
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal, runtime arbiter)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
