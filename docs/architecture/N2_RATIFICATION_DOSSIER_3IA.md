# DOSSIER DE RATIFICATION 3-IA — DOCTRINE N2 (correction factuelle nommée)

**Statut** : **RATIFIÉ — Architecte, 2026-06-06** (« Ratification N2 : OK, ratifié », dispatch). L'implémentation N2 est DÉBLOQUÉE selon le texte ci-dessous (gabarit figé, G2/G3/G4 only, ≤2 retries, mitigation rail-truth-only, audit lexical automatique) — phase d'implémentation : C8.

## QUESTION SOUMISE
Autoriser le retry **N2** : lorsqu'un candidat viole un FAIT (gates G2 fidélité / G3 canon / G4 matière), le moteur peut relancer le générateur avec la désignation EXACTE de la violation factuelle — et rien d'autre.

## TEXTE PROPOSÉ (à ratifier tel quel ou amender)
- Périmètre : G2/G3/G4 UNIQUEMENT. Jamais G7/G8 (esthétique), jamais de score, jamais de directive de style.
- Forme du prompt N2 : `[FAIT CANONIQUE] <énoncé du fait violé + référence> [OBSERVÉ] <extrait/diff> [ORDRE] Corrige cette violation. N'altère rien d'autre.` — gabarit FIGÉ, hashé, archivé dans l'evidence de chaque usage.
- Limites : max 2 retries N2 par candidat ; au-delà → candidat rejeté (N1 reste disponible).
- Audit : tout prompt N2 émis est archivé + scanné automatiquement (liste de vocabulaire esthétique interdit → présence = violation FORBID-006, run invalide).

## POURQUOI C'EST CONFORME (mécanisme)
ADR-003 (scellée) interdit le FEEDBACK SÉMANTIQUE scores→directives (Mode C : Δ−0.264, passage 10% — surcorrection en cascade). N2 ne transmet AUCUN score ni directive esthétique : il transmet un FAIT et sa violation — le canal vérité, pas le canal goût. La frontière est mécanique (gabarit figé + scan lexical), pas déclarative.

## RISQUE PRINCIPAL À TRANCHER
La dérive d'usage : un fait reformulé peut devenir un coaching déguisé (« Léna est déterminée » n'est PAS un fait canonique). Mitigation proposée : seuls les faits présents sur le rail truth (ou contraintes dures du ChapterSpec : rôle, lieu, date, état) sont éligibles au gabarit N2 ; toute autre chaîne = rejet du retry.

## VOTES
| IA | Verdict (RATIFIE / AMENDE / REJETTE) | Commentaire |
|---|---|---|
| Gemini | (en attente) | — |
| ChatGPT | (en attente) | — |
| Claude (rédacteur) | RATIFIE avec la mitigation rail-truth-only | conflit ADR-003 résolu par le canal (fait ≠ score) |
| **Architecte** | (décision finale) | — |
