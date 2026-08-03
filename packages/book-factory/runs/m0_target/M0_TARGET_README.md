# M0 — MODERN_FR_THRILLER_MASTER_TARGET_P0 (2026-08-03)

Calibration de cible stratifiée pour le scribe, exigée par le tour de table du
3 août (ChatGPT : « la strate pré-1950 ne définit jamais la cible ; aucun
pourcentage inventé avant la distribution réelle »).

## Fichiers

- `M0_TARGET_PER_BOOK.json` — mesures par livre (médiane des passages ~1000 mots) :
  tail30/40/50/60, maxlen, slm, slcv, subordination, ponctuation /10k.
  Strates : B_THRILLER_ELITE (18 pleins : Thilliez/Chattam/Bussi/Loubry),
  A_THRILLER_POP (13 pleins : Musso/Levy/Giacometti), C_MASTER_CONTEMP
  (8 pleins : Houellebecq/NDiaye/Carrère/Modiano/Duras), C_1p + D_1p
  (échantillons 1500w), N9_SCRIBE_V2 (10 chapitres).
- `DEGEN_CALIBRATION.json` — runMax/dupRatio/domShare sur 41 romans publiés +
  N9 + 20 chapitres de juin. Source des seuils de `degeneration-veto.ts`.
- `EXTRACT_MANIFEST.json` — quels EPUB ont été extraits, comptes de mots.
- `V34_DOMAIN_PROBE_ROWS.txt` — sonde domaine V3.4 : score extrait-milieu,
  extrait-25%, œuvre entière, par livre (37 dédupliqués).

## Résultats clés (détail : workspace outputs/AUTONOMIE_M0_TAIL_DEGEN_V34_2026-08-03.md)

- tail40 par livre : N9 0,0081 · élite méd 0,0120 [0,008–0,020, max 0,093] ·
  maîtres contemp 0,146 · pré-1950 0,109 (contrôle).
- AUC tail40 maîtres/thriller 0,90 (p_auteur 0,012) ; **élite/pop 0,57 ns** →
  marqueur de REGISTRE, pas de qualité intra-genre.
- Ponctuation : tirets N9 34/10k vs thrillers 155–189 (dialogue) ; `;` ≈ 0 chez
  les thrillers contemporains (marqueur d'époque — ne jamais cibler).
- V3.4 : œuvre entière → scores 25–390 (comptes bruts) = `DOMAIN_LENGTH_SENSITIVE` ;
  extraits 1000w → A 2,45 < B 3,19 < C 5,44, AUC B/A 0,791, retest 0,673.

## Provenance

EPUB/PDF : `Downloads/livre` (classification par réputation d'auteur, cf.
S0_CORPUS_SOURCE_AUDIT). Extraction stdlib (zipfile+html pour EPUB, pdfminer
pour PDF). Listes d'auteurs CURÉES à la main — jamais de substring (leçon ML8 :
Amanda Grange ≠ Grangé). Traductions EN de Bussi exclues. Passages : découpe
par accumulation de phrases (splitter terminateur+amorce) jusqu'à 1000 mots,
tête/queue 5 % retirées.
