# C7 — REVUE BENCH + MANUSCRIT (« Le Silence du Phare », qwen3.5:35b-a3b sous R6)
**Revieweur** : IA (revue ADVISORY de niveau humain — pas une métrique calibrée) · **Date** : 2026-06-06 · **Corpus** : bench `runs/c7_bench/` (3 chap × [direct + 3 candidats]) + manuscrit `runs/c7_book/MANUSCRIT.md` (30 chap, 18 107 mots, 210 candidats persistés).

## VERDICT DE REVUE : **PASS pilote — prose au-dessus des attentes, DEUX défauts systémiques identifiés et actionnables**

## 1. FORCES (citations)
1. **Ancrage sensoriel réel, sobre, français propre** — incipits du ch.1 : *« Le sel colle à la peau comme une seconde couche de sueur, une pellicule âpre qui ne part jamais tout à fait »* (direct) ; *« comme une fine poussière de verre »* (candidat sensoriel) ; *« comme une fine pellicule de poussière métallique »* (gagnant livre). Métaphores concrètes, zéro lyrisme creux — le ton commandé (« sobre, tendu, sensoriel ») est TENU.
2. **La mécanique R6 a fonctionné à l'échelle** : 210/210 candidats éligibles, 30 admissions rejouables, diversité de plume RÉELLE au fil du livre (gagnants : tension-interne, voix-sèche, dialogue, synthèse, rythme-compressé, sensoriel — au moins 6 profils gagnent au moins une fois).
3. **Le tissu de graines existe dans la prose** : « lettre » ×30 occurrences, « carnet » ×9 — la matière des payoffs circule à travers les chapitres (la vérification fine bloom-par-bloom = diff G3, archivée par chapitre dans admission.json).
4. **Vitesse industrielle** : 30 chapitres N=7 en 23 minutes — la boucle complète (packs → 7 générations → gates → extraction → diff → sélection → persistance) tient la cadence.

## 2. DÉFAUTS SYSTÉMIQUES (les deux vraies prises de cette revue)
**D1 — Dérive de rôle PAR IMPLICATION DE SCÈNE (le plus important).** Au ch.1, Léna — *enquêtrice* verrouillée par DriftRule — apparaît *« essuie ses mains sur son tablier de toile grise »* dans *« la cuisine de la boulangerie »* (candidat sensoriel) et en quasi-identique chez le gagnant livre. AUCUN gate ne tombe : le verrou G2 ne se déclenche que sur les événements EXTRAITS (CHARACTER_MOVE/STATUS), et « tablier+boulangerie » n'est ni un déplacement ni un statut — c'est une IMPLICATION de métier. **Mécanisme** : limite de rappel des passes CALC, déclarée dès C4 — ici prouvée sur cas réel. **Action C8** : (a) DriftRule lexicale par rôle (lexiques d'implication métier : tablier/fournil/pétrin ⇒ incompatible « enquêtrice » sauf scène justifiée) en gate ADVISORY d'abord ; (b) l'extracteur calibré (instrument LLM EMP-19 — désormais possible : deux juges en cours de calibration) pour la détection d'implications.
**D2 — Ancrage d'incipit (prompt-anchoring).** Les 4 proses du ch.1 (direct + 3 candidats) ouvrent TOUTES sur la même image (« Le sel colle à la peau comme… ») : le digest commun aimante la première phrase. La diversité de plume est réelle ENSUITE, mais l'attaque de chapitre est quasi-clonée entre candidats. **Action C8** : amorce variée par profil (consigne d'attaque distincte : in medias res / dialogue / description — sans toucher à la réalité), et mesure d'écart inter-candidats sur les 50 premiers mots (CALC, shadow).

## 3. NOTES MÉCANIQUES
Sous-production ≈ 600 mots/chap (cible 900) — BB-02 trans-modèle reconfirmé sur qwen3.5 ; volume final 18 107 mots = pilote conforme. Bench : gagnant ≥ direct en matière 2/3 ; au ch.2 le direct gagne de 3 mots — non significatif ; la vraie différence est dans l'AUDITABILITÉ (le gagnant R6 arrive avec gates+packs+hash, le direct arrive nu). Répétitions inter-chapitres non mesurées ici (G5 par-candidat seulement) — campagne repeat inter-chapitres = C8 (réutiliser bestofn_repeat_matrix).

## 4. SCORE ESTIMÉ (échelle GB 0-5, ADVISORY non calibré)
Prose locale : **3.4-3.7** (au-dessus du pulp net, sous les maîtres — exactement la zone attendue d'un premier jet R6 sans S-Oracle ni N2). Cohérence structurelle : forte (zéro contradiction dure sur 30 chapitres — diffs G3 verts). Le levier de gain n°1 n'est PAS le style : c'est D1+N2 (corrections factuelles nommées, désormais RATIFIÉES) + S-Oracle à l'étage B quand un juge sera APPROVED.

## 5. RECOMMANDATIONS C8 (ordonnées)
1. N2 câblage (RATIFIÉ — gabarit figé, G2/G3/G4, ≤2 retries, audit lexical). 2. DriftRule lexicale d'implication de rôle (advisory→dur après mesure). 3. Amorces variées par profil + métrique d'écart d'incipit (shadow). 4. Juge à l'étage B dès profil APPROVED (campagnes gemma+qwen3.5 en cours). 5. Repeat inter-chapitres (matrice existante). 6. Volume : ×2 chapitres OU continuation par chapitre pour viser 60k (décision plan).
