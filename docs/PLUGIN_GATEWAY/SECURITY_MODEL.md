**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

# SECURITY MODEL — Plugin Gateway (PNP) — v1.0 (DRAFT-NORMATIVE)

## 1. Menaces couvertes (minimum)
- Plugin malveillant (FS/réseau/process/env)
- Plugin qui tente bypass gateway (side-channel)
- Exfiltration via output (canal caché)
- Replay / duplication / corruption d’events
- Escalade de capacités (capability spoofing)
- Déni de service (timeouts, surcharge)
- Supply-chain (manifest non signé / signature invalide)

## 2. Posture “Fail-Closed”
- Par défaut: refus.
- Toute erreur, ambiguïté ou dépassement de limite ⇒ rejet + preuve.

## 3. Sandbox (Mode B obligatoire)
- Exécution isolée.
- Communication par messages structurés (request/response).
- Pas d’accès ambient authority.
- Quotas stricts : CPU/time, memory, bytes.

## 4. Signature & provenance
- `registerPlugin()` exige une signature valide.
- Politique: liste blanche approuvée humainement.
- Rejet si signature invalide/non reconnue.

## 5. Capabilities
- Capabilities déclarées dans manifest + validées.
- Capabilities interdites v1.0 : FS/réseau/process/env.
- Pas d’élévation de privilèges à l’exécution.

## 6. Validation runtime
- Tous inputs/outputs validés par schémas.
- Rejet si non conforme ou non sérialisable (data-only requis selon type).

## 7. Isolation inter-plugins
- Aucune API de découverte d’autres plugins côté plugin.
- Aucun canal direct plugin↔plugin.
- Le Router orchestre, pas le plugin.

## 8. Observabilité & preuves
- Ledger NDJSON append-only.
- Hash-chain vérifiable.
- Export proof reproductible (data-only).

## 9. Tests sécurité obligatoires
- Poison pill: plugin tente FS/réseau/env/process ⇒ bloqué.
- Fuzz manifest/schemas ⇒ rejet propre.
- Timeout/crash ⇒ rejet propre + preuve.
- Replay event ⇒ détecté (ledger integrity).
