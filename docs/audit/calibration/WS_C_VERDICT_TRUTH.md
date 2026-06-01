# WS-C — VERDICT : la vérité mathématique des paliers (95 mesures maîtres)

**Date** : 2026-06-01 · Run Architecte (Ollama qwen3:32b, k=3, Option A, packets représentatifs, provenance DEC-014).
**Données** : `WS_C_MEASURES.jsonl` (95 mesures, provenance complète) + `WS_C_MASTER_COMPOSITE_CALIBRATION.{json,csv}`.
**Corpus** : 95 passages / 15 œuvres / 11 maîtres FR+EN, par catégorie. Composite complet (ECC+RCI+SII+IFI+AAI).

## 1. LA VÉRITÉ : 0/95 — l'ancien SEAL est au-dessus de toute la littérature

| Seuil ANCIEN | Maîtres qui passent | Distribution maîtres |
|---|---|---|
| **composite ≥ 93** | **0 / 95** | médiane 79.7, p90 84.7, **max 90.5** |
| min_axis ≥ 80 | ~0 (p90=71.5) | médiane 49.2 |
| ecc ≥ 88 | ~0 (p90=85.8) | médiane 72.4 |
| aai ≥ 85 | OK (p25=91.6) | médiane 93.6 |

**Aucun chef-d'œuvre mondial mesuré n'atteint le SEAL composite 93** (max = Proust 90.5). Le seuil était posé **au-dessus de la distribution entière des maîtres** → ancrage **aspirationnel, jamais mesuré**. Intuition Architecte **confirmée mathématiquement**.

## 2. Distribution composite maîtres (la vraie échelle)

| | composite | ecc | rci | sii | ifi | aai | min_axis |
|---|---|---|---|---|---|---|---|
| mean | 78.9 | 70.8 | 84.5 | 86.2 | **52.8** | 92.0 | **51.2** |
| p25 | 76.5 | 64.2 | 82.7 | 84.5 | 45.1 | 91.6 | 44.1 |
| p50 | 79.7 | 72.4 | 85.0 | 86.7 | 49.4 | 93.6 | 49.2 |
| p90 | 84.7 | 85.8 | 89.0 | 89.7 | 73.5 | 95.6 | 71.5 |
| max | 90.5 | 91.8 | 91.4 | 92.3 | 96.7 | 96.0 | 82.0 |

**Cross-validation** : RCI mean 84.5 = exactement WS-B2 (packet-fair) → harnais sain, mesures fiables.

## 3. L'axe-tueur : IFI (médiane 49.4)

`min_axis` (médiane 49.2) ≈ IFI (médiane 49.4) : **IFI plombe systématiquement le min_axis des maîtres**. Comme RCI (packet) et ECC (contrat) avant lui, **IFI est très probablement contrat/packet-dépendant** (même classe de défaut). Hugo épique tombe à IFI=40-45, Stendhal ecc=26-38. → IFI = prochain axe à diagnostiquer (passe C : intrinsèque vs conformité).

## 4. Paliers candidats DATA-DRIVEN (percentiles maîtres, AUCUN appliqué)

| Palier | composite | base |
|---|---|---|
| **S** (chef-d'œuvre) | **84.7** | p90 maîtres |
| **A** | 79.7 | p50 maîtres |
| **B** | 76.5 | p25 maîtres |
| SEAL ancien | 93 | **0/95 — à abandonner comme dogme** |

Un SEAL « niveau maître » réaliste se situe vers **p75–p90 ≈ 82–85**, PAS 93. Les floors par axe doivent suivre la distribution réelle (ex. ecc floor ~ p25 maîtres = 64, pas 88 ; min_axis ~ p25 = 44, pas 80) — sous réserve de réparer d'abord IFI/ECC (contrat/packet).

## 5. Caveats honnêtes

1. **Option A** : contrat = arc de l'œuvre entière → résidu circulaire sur tension_14d → **ECC légèrement OPTIMISTE**. Or même optimiste, ECC maître (médiane 72) reste **loin sous** l'ancien floor 88 → la conclusion « seuils trop hauts » tient *a fortiori*.
2. **Quelques `JSON parse failed` Ollama** (3-4 sur l'axe AAI, prose au lieu de JSON) → fallback ; impact marginal sur la distribution (à re-vérifier sur ces passages).
3. **IFI/ECC bas** = possiblement défaut contrat/packet (passe C), pas vérité littéraire → ne PAS fixer les floors ecc/ifi avant de réparer/diagnostiquer ces axes.
4. k=3 utilisé (juge déterministe, std≈0 → identique à k=1).

## 6. DÉCISION / SUITE

**Acquis (vérité prouvée)** : l'ancien SEAL 93 + floors 80/88 sont **mathématiquement au-dessus des maîtres** (0/95). À ne plus traiter comme dogme. Les vrais paliers sont les percentiles de la distribution mesurée (S≈84.7, A≈79.7).

**Gate (principe Architecte respecté)** : **aucun seuil changé** ici. Avant promotion :
- **Passe C** : séparer axes intrinsèques (RCI/SII partie qualité) vs conformité (ECC/IFI/tension) + diagnostiquer IFI (le nouvel axe-tueur).
- **Contrôle croisé Option B** (contrat uniforme) pour borner le résidu circulaire d'Option A sur ECC.
- **Bench non-régression** : appliquer les paliers candidats en SHADOW sur goldens OMEGA + rejects + K2 → faux accepts / faux rejets, AVANT toute promotion production.

## VERDICT
- Statut : PASS (vérité mathématique obtenue : 0/95 au SEAL 93 ; distribution maître mesurée, reproductible, provenancée DEC-014).
- Confiance : Haute (95 mesures, juge déterministe, RCI cross-validé WS-B2).
- Forces : prouve sans ambiguïté l'arbitraire de l'ancrage ; donne les vrais paliers par percentiles ; identifie IFI comme nouvel axe-tueur ; provenance complète rejouable.
- Faiblesses : (1) Option A optimiste sur ECC (mais conclusion tient a fortiori) ; (2) 3-4 parse-fails AAI à re-vérifier ; (3) IFI/ECC bas = défaut contrat/packet probable, pas vérité finale → floors par axe à ne pas figer avant passe C.
- Risques restants : fixer des floors sur IFI/ECC non réparés = recalibrer sur un capteur encore confondu. D'où passe C + Option B avant promotion.
- Action requise : décision Architecte — lancer passe C (intrinsèque/conformité + diagnostic IFI) + Option B croisé, puis bench shadow goldens/rejects. Aucun seuil promu avant.
