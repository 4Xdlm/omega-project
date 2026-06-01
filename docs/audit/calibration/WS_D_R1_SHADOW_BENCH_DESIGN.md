# WS-D R1 — SHADOW BENCH DESIGN : reclasser les capteurs (jamais supprimer)

**Date** : 2026-06-01 · **Statut** : DESIGN (doc-only). Aucun code/seuil avant exécution + décision Architecte.
**Principe scellé (Architecte 2026-06-01)** :
> **AUCUNE mesure qui fonctionne ne disparaît. On REDÉFINIT son usage, on ne supprime pas.** Une mesure syntaxique qui compte juste (sensory/corporeal comptent réellement des mots sensoriels/corporels) reste VALIDE — elle était seulement mal *placée* (dans le gate bloquant `min_axis` au lieu d'un rôle informatif). R1 = **RECLASSER**, pas retirer.

## 1. Taxonomie de RÔLES (nouveau concept — on ne touche pas aux mesures, on définit leur usage)
Chaque sous-capteur reste **calculé et persisté** (provenance DEC-014). On lui assigne un RÔLE :

| Rôle | Définition | Effet sur le SEAL |
|---|---|---|
| **GATING** | entre dans le `min_axis` bloquant + le composite | peut bloquer le seal |
| **COMPOSITE** | entre dans le composite pondéré, PAS dans le min_axis | influence le score, ne bloque pas |
| **ADVISORY** | calculé, loggé, affiché dans le « profil » de la prose, hors composite/gate | informatif uniquement |
| **DIAGNOSTIC** | calculé pour audit/provenance, jamais scoré | traçabilité |

→ Reclasser = changer le RÔLE d'un capteur, **jamais l'éteindre**. Toutes les valeurs restent dans le bloc de provenance (DEC-014) — on garde tout l'historique de mesure.

## 2. Reclassement proposé (à shadow-bencher, RIEN appliqué)

| Sous-capteur | Rôle ANCIEN | Rôle PROPOSÉ | Justification (on garde la mesure) |
|---|---|---|---|
| sensory_richness | GATING (via IFI→min_axis) | **ADVISORY** (profil immersion) + COMPOSITE soft | mesure réelle de densité sensorielle lexicale ; biais langue → pas un floor, mais un signal utile (ex. « cette scène est sensoriellement dense ») |
| corporeal_anchoring | GATING | **ADVISORY** + COMPOSITE soft | idem (ancrage corporel) ; reste mesuré, sort du gate |
| signature | GATING (RCI) | **COMPOSITE** (packet-completeness) | mesure la conformité au lexique-contrat → utile comme signal de conformité, pas comme floor de qualité (DEC-013) |
| hook_presence | GATING (RCI) | **ADVISORY/COMPOSITE** | idem |
| anti_cliche | GATING (SII) | **ADVISORY** (réparé) | inerte tel quel (sature 100) → la MESURE de clichés est utile une fois corrigée (R2 sémantique) ; reste calculée, surfacée comme alerte cliché |
| tension_14d | GATING (ECC) | **GATING** (mais contrat réparé DEC-011) | reste gating ; on répare sa SOURCE (contrat), pas son rôle |
| rhythm, euphony, attention, fatigue, focalisation, + tous les LLM | GATING/COMPOSITE | **INCHANGÉ** (VALID) | sains, restent où ils sont |

## 3. Le gate `min_axis` reclassé (shadow)
- `min_axis_shadow` = min sur les **macro-axes en rôle GATING** dont les sous-capteurs floor-valides.
- Concrètement pour IFI : IFI reste calculé et reporté (composite), mais sa contribution au `min_axis` bloquant est recomposée sur ses sous-axes GATING (focalisation/attention/fatigue) ; sensory/corporeal deviennent ADVISORY **dans** IFI (toujours mesurés, affichés au profil, hors floor).
- Rien n'est perdu : `IFI_full` (avec sensory/corporeal) reste loggé ; `IFI_gate` (sans) sert au seal-shadow.

## 4. Protocole du shadow bench (double-verdict, tout loggé)
Pour chaque passage du corpus (maîtres WS-C + goldens OMEGA + high-quality rejects + mauvaise prose + best-sellers quand dispo) :
1. Calculer **TOUS** les sous-capteurs (aucune suppression) + provenance DEC-014.
2. Émettre **DEUX verdicts** :
   - `verdict_OLD` : SEAL avec min_axis incluant les capteurs keyword (gate actuel).
   - `verdict_NEW` : SEAL avec min_axis reclassé (keyword en ADVISORY/COMPOSITE).
3. Mesurer le delta : faux rejets maîtres (OLD vs NEW), faux accepts mauvaise prose (le reclassement ne doit PAS laisser passer la famille D), placement best-sellers, conservation des goldens.
4. **Aucun changement production** : shadow only, double-log.

Livrables : `WS_D_R1_SHADOW_BENCH.md` + `.csv` + `R1_SENSOR_ROLE_MAP.csv` (rôle ancien→proposé par capteur).
**PASS** : NEW réduit les faux rejets maîtres SANS augmenter les faux accepts mauvaise prose ; toutes les mesures restent calculées/loggées.

## 5. Garde-fous (philosophie Architecte)
- Interdit de **supprimer** un capteur (`compute*`) — on change son RÔLE dans la config de scoring, pas le code de mesure.
- Toute valeur reste dans la provenance (DEC-014) → réversible, auditable, ré-exploitable plus tard.
- Le reclassement est testé en shadow avant toute promotion (DEC-016).

## VERDICT
- Statut : PASS (design conforme à « reclasser, jamais supprimer »).
- Confiance : Haute (s'appuie sur cartographie + audit + interconnexion mesurés).
- Forces : préserve 100% des mesures (rien ne disparaît) ; introduit une taxonomie de rôles propre (GATING/COMPOSITE/ADVISORY/DIAGNOSTIC) ; double-verdict shadow non destructif ; min_axis reclassé attaque directement le 0/95 (min_axis≈IFI).
- Faiblesses : (1) implémentation = config de rôles dans le scorer (code moteur, terminal Architecte) ; (2) le « profil immersion » advisory est un nouveau livrable d'affichage à définir ; (3) anti_cliche réparé dépend de R2 (sémantique).
- Action requise : exécution code gatée (terminal Architecte) — ajouter une couche de RÔLES de capteurs (sans toucher aux compute*) + le double-verdict shadow. Je peux préparer en autonomie le `R1_SENSOR_ROLE_MAP.csv` complet + le squelette du bench shadow (CALC) prêt à brancher.


---
## 6. PRÉ-CHECK R1 sur données réelles (autonome, `wsd-r1-shadow-precheck.ts`, 95 maîtres)

Test du reclassement IFI (gating → ADVISORY hors gate, IFI toujours calculé/loggé) sur `WS_C_MEASURES.jsonl` :

| Gate | min_axis médiane | min_axis≥80 | ≥76 | ≥72 |
|---|---|---|---|---|
| **OLD** (5 axes, IFI gating) | 49.2 | 2/95 (2%) | 4% | 11% |
| **NEW** (4 axes, IFI advisory) | **72.4** | **20/95 (21%)** | 35% | 54% |

**Confirmé** : le 0/95 venait du **gate IFI keyword**. Reclasser IFI en advisory (sans rien supprimer) récupère massivement les maîtres. **Nouveau goulot = ECC** (axe minimum dans 79/95) — l'axe contrat-dépendant → cascade IFI→ECC : R1 (IFI) doit s'accompagner de la réparation du contrat ECC (DEC-011). Candidats floor min_axis NEW (percentile maîtres) : p25=64.2, p50=72.4.

**Caveats** : (1) ne teste que la RÉCUPÉRATION des maîtres ; les **faux-accepts mauvaise prose** exigent le corpus WS-D (terminal). (2) ECC reste Option-A-optimiste. (3) reclassement = config de rôles (code moteur, terminal Architecte), shadow avant DEC-016. **Aucune mesure supprimée, aucun seuil changé.**
