# V6_BANS_SPEC — liste de bans pour la régénération des 163 ORANGE

**Statut : SPEC INERTE. `NOT_EXECUTED`. Aucune génération V6 lancée. HOLD run.** Date : 2026-06-11.
Mandat convergent Gemini + ChatGPT : verrouiller la liste d'exclusions maintenant, ne PAS lancer V6. Ce fichier est une spécification de prompt — il ne déclenche rien.

## But
Empêcher gemma4 (passe V6) de remplacer un tic par un autre (la fabrique observée : `s'approcha` ×54, `registre/carnet` ×20). Chaque ban = un substitut faible déjà attrapé empiriquement dans les 223 candidats ou le triage.

## Bans lexicaux (substituts INTERDITS dans la passe V6)
| terme | raison (empirique) |
|---|---|
| s'approcha / s'approche | fabrique n°1 (×54 dans les 223) — béquille de mouvement |
| registre / carnet (comme substitut) | béquille d'inventaire (×20) — meuble la phrase sans agir |
| mâchoire | tic gestuel revenu (×13 famille bannie) |
| regard / yeux | tic gestuel saturé (déjà banni AP-9) |
| immobile / figé / pétrifié / resta planté | famille immobilité déguisée |
| fit un pas | tic phrase déjà traité (AP-10) |
| le silence qui suivit | formule atmosphérique déjà traitée (AP-11) |
| brisa l'air / déchira l'air | cliché de choc (×6/×9) |
| comme un couperet / comme un coup de feu | similés de choc (AP-11) |
| L'air saturé / atmosphère saturée | famille SATURATION (×52 préexistant, AP-12 pending) |
| court souffle par le nez | **conditionnel** : interdit SI répétition (déjà utilisé en A096) |
| mains à plat / doigts crispés | **conditionnel** : interdit SI la famille GESTURAL monte |

## Règles de garde V6 (au moment du run — pas maintenant)
1. Génération gemma4 avec ces bans au prompt système.
2. Chaque candidat repasse la **triple garde** micro-lot (operateTic + patchAdmissible + applyPatch/buildCanonical + bookGate).
3. **AUCUNE famille ne monte** (book-wide) — règle dure inchangée.
4. **Anti-invention d'objet** (leçon A236) : tout objet introduit (verre, etc.) doit être LOCAL à la scène — à vérifier au pointeur d'objets (MARK-1) avant ACCEPT. C'est une garde NOUVELLE révélée par le micro-lot.
5. Sélection finale = juge LLM (souffle) + oreille auteur. Le proxy classe, ne tranche pas.

## Statut
`NOT_GATE`, `NOT_EXECUTED`. À activer seulement sur GO explicite Architecte, après nettoyage hash + mini-scan typo + publication décidée. HOLD V4_ROMAN.
