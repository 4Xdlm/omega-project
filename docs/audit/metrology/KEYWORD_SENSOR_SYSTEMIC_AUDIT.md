# OMEGA — AUDIT KEYWORD SYSTÉMIQUE + BLUEPRINT DE RECONSTRUCTION

**Date** : 2026-06-01 · **Mode** : CALC autonome + lecture code. READ-ONLY. 0 patch, 0 seuil.
**Mandat** : « démonter tout, analyser câble par câble, prouver tout, puis voir comment reconstruire sans oublier ce qu'on a appris ». Refs : `SENSOR_CABLE_MAP.md`, `KEYWORD_SENSOR_REGISTRY.csv`, `IFI_AUTOPSY_REPORT.md`, `WS_C_VERDICT_TRUTH.md`.

## 1. Verdict systémique
La métrologie OMEGA repose sur 3 classes de capteurs :
- **LLM (8 sous-axes)** — emotion_coherence, interiority, impact, show_dont_tell, authenticity, necessity, metaphor_novelty, focalisation. **Sains, déterministes (temp 0, WS-B0c).**
- **CALC structurel (4)** — rhythm, euphony, attention, fatigue. **VALID, langue-neutres** (rhythm FR 69.9/EN 69.0 ; euphony FR 73/EN 81).
- **CALC keyword (la maladie, 5)** — sensory_richness (FR-only), corporeal_anchoring (FR-lourd), signature/hook (packet), anti_cliche (inerte), tension_14d-fallback. **C'est ici, et SEULEMENT ici, qu'est la pourriture.**

→ **OMEGA n'a pas un juge cassé. Il a 5 sous-capteurs lexicaux défectueux** qui contaminent IFI (sensory+corporeal), RCI (signature+hook), SII (anti_cliche), ECC (tension_14d fallback). Le composite et le min_axis héritent de ces défauts → l'ancien étalonnage (0/95) était faussé par eux.

## 2. Preuves empiriques (corpus maître WS-C, 95 passages)
| Capteur | preuve | classe |
|---|---|---|
| corporeal_anchoring | FR 33.1 / EN 20.0 (Δ−13.1) | LANGUAGE_BIASED, INVALID_FOR_FLOOR |
| sensory_richness | FR 37.7 / EN 28.8 ; pire=0 ; FR-only (code) | LANGUAGE_BIASED_LITERAL, INVALID_FOR_FLOOR |
| anti_cliche | 100 partout (min=max) | INERT (ne mesure rien) |
| signature/hook | vide 60/85 → plein 100 (WS-B) | PACKET_DEPENDENT (pas qualité) |
| tension_14d | contrat dégénéré (WS-A.2) | CONTRACT_DEPENDENT |
| rhythm / euphony | langue-neutres, discriminants | VALID |

## 3. Le principe à sceller
> **Un comptage de mots-clés ne mesure pas une qualité littéraire. Il mesure la présence d'un lexique.** Un chef-d'œuvre ne doit pas perdre parce qu'il n'a pas prononcé les bons mots (et surtout pas dans la mauvaise langue).

## 4. Blueprint de reconstruction (à plat → rebâtir), proposé — RIEN appliqué
Discipline : aucun changement avant shadow bench + décision Architecte (DEC-016). On garde l'acquis (rhythm/euphony/LLM = bons).

### Étape R1 — Assainir le min_axis (urgent, à shadow-bencher)
- **Sortir sensory_richness + corporeal_anchoring du floor universel** (ils mesurent un lexique FR, pas la qualité). IFI = focalisation(LLM) + attention + fatigue tant qu'on n'a pas de capteur d'immersion sémantique.
- **signature/hook** : reclassés `packet-completeness` (DEC-013), dé-pondérés ou gardés hors min_axis.
- **anti_cliche** inerte : retirer du composite ou remplacer (il n'apporte aucune information).

### Étape R2 — Remplacer le keyword par du sémantique (pas ajouter des mots EN — ce serait la même maladie)
- Densité sensorielle / corporelle → **juge LLM léger** (few-shot) ou **embeddings** VAKOG sémantiques, langue-aware.
- tension_14d → contrat 14D scène-approprié (DEC-011) + analyseur sémantique (jamais keyword fallback en prod).
- anti_cliche → détection de cliché sémantique (embeddings vs banque de clichés) si on veut le garder.

### Étape R3 — Découplage intrinsèque vs conformité (WS-D Phase 4)
- **IntrinsicQuality** = rhythm, euphony, (sensory/corporeal sémantiques), authenticity, show_dont_tell.
- **ContractConformity** = tension_14d, emotion_coherence, necessity, focalisation.
- min_axis et SEAL recalculés par percentiles maîtres (WS-C/WS-D), par catégorie, avec IC95 + ROC + tests adversariaux + panel humain (renforts ChatGPT).

### Étape R4 — Interconnexions (point Architecte)
- Calculer la **matrice de corrélation inter-axes** sur le corpus mesuré : quels axes co-varient (redondance → le composite double-compte) vs orthogonaux. Intégrer au design du composite (poids selon information réelle, pas intuition).

## 5. Recommandation d'ordre (consensus 2-IA)
1. **NCR_KEYWORD_SENSOR_SYSTEMIC_BIAS** ouvert (ce pattern n'est plus un incident isolé).
2. Audit keyword = FAIT (ce doc). Capteurs classés.
3. **HOLD** : aucun retrait/patch/seuil avant shadow bench (R1 en shadow d'abord).
4. WS-D méga-bench corpus élargi (best-sellers) **après** R1/R2 (sinon on mesure 400 œuvres avec capteurs malades).
5. Remplacement sémantique R2 = chantier code (terminal Architecte, EMP-10).

## VERDICT
- Statut : PASS (cartographie totale + audit keyword prouvé + blueprint).
- Confiance : Haute (méthodes lues dans le code ; biais FR/EN mesurés ; cohérent WS-A/B/C).
- Forces : isole la maladie à 5 sous-capteurs précis ; innocente LLM + CALC structurel ; trace chaque câble ; blueprint réutilisant l'acquis.
- Faiblesses : (1) le remplacement sémantique (R2) reste à concevoir/bencher ; (2) la matrice d'interconnexion (R4) pas encore calculée (prochain run) ; (3) anti_cliche/signature à re-mesurer hors packet vide pour confirmer inertie/dépendance.
- Risques restants : « réparer » en ajoutant des mots-clés EN = rester malade. Préférer sémantique/LLM ou retrait.
- Action requise : décision Architecte sur R1 (assainissement min_axis en shadow) ; je peux calculer la matrice d'interconnexion inter-axes (R4) en autonomie depuis WS_C_MEASURES.jsonl immédiatement.
