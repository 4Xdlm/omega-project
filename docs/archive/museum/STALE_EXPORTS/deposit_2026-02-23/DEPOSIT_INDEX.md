# DEPOSIT INDEX — deposit_2026-02-23 (muséé 2026-05-31)

> Inventaire du contenu muséé. NON_SOURCE_OF_TRUTH_RUNTIME (EMP-15).

## Contenu DÉPLACÉ ici (vague 1 — documents, 178 fichiers)

| Sous-arbre | fichiers | nature | source courante |
|---|---|---|---|
| `public/sessions/` | 75 | session-saves | **= `sessions/` racine (75/75 hash-identiques, 0 unique)** |
| `public/architecture/` | docs archi | doc | `docs/architecture/` |
| `public/certificates/` | certifs | preuve | `certificates/` |
| `public/docs/`, `public/roadmap/` | doc/roadmap | doc | `docs/`, `docs/roadmap/` |
| `public/` (CHANGELOG, EXECUTIVE_SUMMARY, PROOF_REGISTRY, HASHES, VERSION, LICENSE) | 7 | méta | `docs/` courants |
| `confidential/{artefacts,config,docs_internal,governance_docs,prompts_prod}` | 31 | doc/data internes | `docs/governance/`, `config/` courants |
| **public total** | **147** | | |
| **confidential déplacé** | **31** | | |

## Hash-verify (procédure C2)
`Get-FileHash -Algorithm SHA256` des **75** `deposit/public/sessions/*` vs `sessions/` racine (97 fichiers) → **75 doublons exacts, 0 contenu unique**. Aucun fichier `UNIQUE_REVIEW_REQUIRED`.

## NON déplacé (REGISTERED_NOT_MOVED — vague 2)
| item | reste à | nature | raison |
|---|---|---|---|
| `deposit/confidential/src_code/` | en place | **174 .ts = snapshot CODE** (incarnation `src/` ancêtre : scribe/genesis/canon/gates/orchestrator/…) | code non déplacé en vague 1 ; décision LFS/zip vague 2 |

*(Note : `deposit/confidential/prompts/` était un dossier vide non-tracké — rien à déplacer.)*
