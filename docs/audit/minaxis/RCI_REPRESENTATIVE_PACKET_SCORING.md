# RCI REPRESENTATIVE-PACKET SCORING (WS-B2)

**Date** : 2026-05-31 · **Mode** : CALC, READ-ONLY, 0 Ollama, 0 patch, 0 floor change.
**Source** : 57 passages / 19 œuvres / 11 maîtres (`omega-autopsie/gutenberg_cache`). Mêmes frontières de passage que MINAXIS_E.
**Outil** : `scripts/metrology/wsb2-representative-packet-scoring.ts` (EXIT 0) → `RCI_REPRESENTATIVE_PACKET_SCORING.csv` + `rci_representative_summary.json`.

## Question (D-WS-B2)

Quel est le VRAI RCI des maîtres avec un packet **représentatif** (ni vide=probe, ni forcé=ceiling) ? La valeur packet-fair est-elle un intermédiaire entre probe (68) et ceiling (84.5), ou proche d'une borne ?

## Méthode (documentée, uniforme, non optimisée)

Pour chaque œuvre, deux lexiques **au niveau du livre entier** (pas du passage → évite la tautologie) :
- **FREQ** : top-12 mots de contenu les plus fréquents (stopwords FR/EN retirés, longueur ≥4).
- **MID** : rangs 30-42 (mots distinctifs, non ubiquitaires) — plus proche d'une politique signature thématique.

Chaque passage est scoré contre le lexique de SON œuvre. signature/hook **non forcés**. `motifs` = 5 premiers.

## Résultat — signature/hook SATURENT à 100 (les deux lexiques)

| Packet | signature | hook | RCI médiane | pass@85 |
|---|---|---|---|---|
| probe (vide) | 60 const | 85 const | 68.37 | 0/57 |
| **MID** (rangs 30-42) | **100** | **100** | **84.54** | **28/57** |
| **FREQ** (top-12) | **100** | **100** | **84.54** | **28/57** |
| ceiling (forcé 100) | 100 | 100 | 84.54 | 28/57 |

**Découverte robuste** : pour **tout** lexique d'œuvre réel (fréquent OU mid-fréquent), `signature` et `hook` **saturent à 100** chez les maîtres — les mots tirés du livre apparaissent dans tout passage de 1400 mots du même livre. Seul le packet **vide** (probe) produit 60/85. → **RCI représentatif = RCI ceiling** (84.54), confirmé par deux lexiques indépendants.

## Conséquences

1. **Le vrai RCI packet-fair des maîtres ≈ 84.5** (médiane), PAS un intermédiaire à 75. Le caveat WS-B1 « ceiling = borne haute trop optimiste » est **LEVÉ** : le ceiling est représentatif (real packets saturent signature/hook).
2. **Maîtres (84.54) ≥ K2 (82.6)** à packet égal → circularité K2 définitivement non démontrée.
3. **Le floor 85 ≈ la médiane maîtres packet-fair** → il rejette ~la moitié des chefs-d'œuvre. Trop strict si l'objectif est de ne rejeter que la prose sous-littéraire.
4. **signature & hook sont NON-DISCRIMINANTS** : avec un packet réel ils valent toujours ~100 ; avec un packet vide, 60/85. Ce sont des capteurs **quasi-binaires** (packet présent/absent), PAS des signaux gradués de qualité. → ils ajoutent un **offset constant** au RCI. Les seuls axes RCI qui **discriminent** la qualité sont **rhythm** et **euphony** (prose-purs).
5. Le « 0/57 maîtres ≥85 » est à **100 % l'artefact packet-vide** — à proscrire comme preuve sans caveat.

## Candidats floor (data-driven, distribution packet-fair, AUCUN appliqué)

| Candidat | RCI maîtres packet-fair | % maîtres rejetés |
|---|---|---|
| 85 (actuel) | médiane 84.54 | ~51 % (29/57) |
| **p25 = 81.67** (reco Gemini) | quartile bas | ~25 % (rejette le quart le plus faible) |
| p10 = 79.41 | décile bas | ~10 % |

## Implication pour D2 (leviers)

Le levier « re-tuner signature/hook » est **caduc** : ils saturent (non gradués). Le vrai travail de recalibration porte sur :
- **rhythm** (pic CV à étalonner sur la distribution littéraire : médiane 69.6, p10 56.9, p90 82.2) — le discriminant principal ;
- **euphony** (le ×0.5 défensif à réexaminer) ;
- **le floor** (data-driven, candidat p25 ≈ 81.7) ;
- **assurer que le scoring de prod utilise des packets peuplés** (sinon −16 systématiques) — le vrai bug de classe (comme ECC).

## VERDICT
- Statut : PASS (question D-WS-B2 tranchée : RCI représentatif = ceiling ≈ 84.5, robuste sur 2 lexiques).
- Confiance : Haute (saturation signature/hook reproduite sur FREQ et MID indépendants ; 57 passages).
- Forces : lève le caveat « ceiling optimiste » (WS-B1) ; identifie signature/hook comme non-discriminants (capteurs binaires) ; recentre la recalibration sur rhythm/euphony/floor + packet de prod ; floor candidat data-driven p25=81.7.
- Faiblesses : (1) saturation = les maîtres contiennent forcément leur propre lexique → signature/hook ne testent PAS la qualité, juste la présence du packet (constat, pas biais de ma méthode) ; (2) la politique production de signature_words (nombre/sélection) reste un choix d'architecture non mesuré ici ; (3) rhythm reste le seul vrai discriminant — sa calibration pic-CV (D2) demande un corpus rythme dédié.
- Risques restants : si signature/hook sont de fait binaires, leur poids dans RCI (signature ~, hook 0.20) gonfle artificiellement tout score à packet plein → à réexaminer dans la recalibration (dé-pondérer les non-discriminants).
- Action requise : décision Architecte D1 — floor data-driven (candidat p25-maîtres = 81.7) ; D2 — recalibration centrée rhythm/euphony + dé-pondération signature/hook non-discriminants ; via dispatcher Phase R. Aucun appliqué ici.
