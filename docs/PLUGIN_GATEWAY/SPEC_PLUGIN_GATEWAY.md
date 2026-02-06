**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

# SPEC — OMEGA Plugin Gateway (PNP) — v1.0 (DRAFT-NORMATIVE)

## 0. Statut
- Nature: Spécification normative (contrat d’architecture + invariants)
- Zone: GOVERNANCE / EXTENSION (hors BUILD)
- Règle: **Aucun code** ne doit être écrit avant validation humaine de ce document.

## 1. But
Créer une **porte unique** permettant d’ajouter des modules externes (plugins) à OMEGA sans jamais :
- dépasser l’autorité d’OMEGA,
- violer la frontière BUILD↔GOVERNANCE,
- introduire de l’actuation,
- permettre des canaux latéraux plugin↔plugin.

## 2. Scope (ce que le Gateway fait)
- Enregistrer/activer/désactiver des plugins via manifest signé.
- Valider strictement versions, schémas d’I/O, capabilités, limites.
- Orchestrer des appels plugins **uniquement sur demande d’OMEGA**.
- Exécuter les plugins dans une **Sandbox isolée** (Mode B obligatoire).
- Journaliser tous échanges en **append-only** + **hash-chain**.
- Produire des preuves et rapports **data-only**.

## 3. Non-Scope (interdit / hors périmètre)
- Aucun plugin ne modifie BUILD, ni gouvernance scellée.
- Aucun accès direct plugin → FS/réseau/process/env, sauf via capacités explicites et uniquement si autorisées (politique par défaut: **refus**).
- Aucun stockage d’état persistant par plugin entre deux appels (stateless).
- Aucun plugin n’appelle un autre plugin (interdit).
- Le Gateway ne “répare” pas OMEGA ; il ne fait que fournir des **propositions** (données, drafts, rapports).

## 4. Autorité & Gouvernance
- **OMEGA est maître** : seul OMEGA initie `invoke()` / `invokePipeline()`.
- Le Gateway est un **mécanisme de transport + contrôle + preuve**, pas un moteur de décision.
- Toute décision “humaine” reste humaine ; tout contournement est bloqué.

## 5. Invariants (INV-PNP)
### INV-PNP-01 — Single Gateway
Tout module externe passe par le Gateway (0 bypass).

### INV-PNP-02 — Non-Actuating
Le Gateway et les plugins ne modifient jamais BUILD ni phases SEALED.

### INV-PNP-03 — Determinism Surface
Pour les chemins déclarés déterministes : mêmes inputs ⇒ même output canonique ⇒ même hash.

### INV-PNP-04 — Typed IO
Zéro `any`. Validation runtime obligatoire (schema) + types TS stricts.

### INV-PNP-05 — Isolation
Zéro ambient authority. Pas d’accès implicite au monde extérieur.

### INV-PNP-06 — Capability-Based Access
Permissions minimales explicites, refus par défaut.

### INV-PNP-07 — Traceability
Chaque échange produit un `GatewayEvent` append-only + hash-chain vérifiable.

### INV-PNP-08 — No Side Channels
Aucune communication plugin↔plugin ou plugin→OMEGA hors protocole.

### INV-PNP-09 — Version Contract
Compatibilité via `OMEGA_PLUGIN_API_VERSION` (SemVer), rejet sinon.

### INV-PNP-10 — Fail-Closed
Erreur / doute / timeout / output invalide ⇒ refus + preuve (event).

## 6. Architecture — 5 couches (obligatoire)
1) **Registry** : inventaire + statut (enabled/disabled), signature, versions.
2) **Validator** : manifest, semver, schemas, capabilities, limits.
3) **Router/Orchestrator** : policy, fan-out, ordering, timeouts.
4) **Sandbox** : exécution isolée (Worker thread / process isolé), protocole message strict.
5) **Ledger+Proof** : NDJSON append-only, hash-chain, export de preuve.

## 7. Flux de données (unique)
`OMEGA → Gateway → Sandbox(Plugin) → Gateway → OMEGA`

Interdits:
- Plugin → OMEGA direct
- Plugin → Plugin
- Plugin → FS/réseau/process (sans capability autorisée, et par défaut non autorisé)

## 8. Modes d’exécution
- **Mode B uniquement** : Sandbox obligatoire.
- Mode A (in-process) : **interdit** (pas de dette).

## 9. Types de Payload supportés (v1.0)
- `TextPayload`
- `JSONPayload` (schema-validated)
- `BinaryRefPayload` (référence artefact déjà existant côté OMEGA)
- `DatasetSlicePayload` (IDs/keys uniquement)

## 10. Politique de logs & preuves
- Ledger en NDJSON append-only.
- Hash-chain: chaque event inclut `prev_hash` + `event_hash`.
- Export proof: bundle data-only (hashes, ids, timings, décisions) sans secrets.

## 11. Performance (exigences minimales)
- 100 plugins enregistrés : listing + validation stable.
- Invocations concurrentes contrôlées (quota), pas d’effondrement.
- Timeouts stricts + circuit-breaker “soft” (refus, pas actuation).

## 12. Critères d’acceptation (E1)
- Documents E1 complets + cohérents.
- Invariants listés + non ambigus.
- Non-scope explicitement défini.
- Interfaces minimales listées.
