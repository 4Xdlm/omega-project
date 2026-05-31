# MUSEUM — deposit_2026-02-23 (STALE EXPORT)

> **NON_SOURCE_OF_TRUTH_RUNTIME** (EMP-15). Export de livraison périmé (daté 2026-02-23), muséé 2026-05-31.

- **Origine** : ancien dossier racine `deposit/` (bundle d'export public/confidentiel).
- **Raison du musée** : doublon stale — `deposit/public/sessions/` = **75/75 fichiers identiques au contenu** de `sessions/` racine (hash SHA256 vérifié, 0 unique). Le reste = snapshot doc daté, dépassé par `docs/`/`sessions/` courants.
- **Source courante équivalente** : `sessions/` (session-saves), `docs/` (architecture/roadmap/certificates courants).
- **⚠ Exclusion vague 1** : `deposit/confidential/src_code/` (**174 fichiers .ts = snapshot de CODE**) **N'A PAS été déplacé** — reste à `deposit/confidential/src_code/`, `REGISTERED_NOT_MOVED` au catalogue (traitement vague 2, sprint gaté build). Conforme à la règle « snapshots de code non déplacés en vague 1 ».
- **Usage** : contexte historique uniquement. Ne rien fonder ici (cf. `../../README_MUSEUM.md`).

Voir `DEPOSIT_INDEX.md` pour le détail du contenu muséé.
