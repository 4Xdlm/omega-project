# REVUE — « Le Silence du Phare » 60K (run C8, 50 chapitres, 87 987 mots)
**Revieweur** : IA (ADVISORY) · **Date** : 2026-06-06 · **Run** : `runs/c8_book60k/` (qwen3.5:35b-a3b, N=7 + extension ≤2 continuations/chap, ~50 min).

## VERDICT : **PASS — premier roman LONG complet sous boucle souveraine, cap 60k dépassé de 47%, les correctifs C8 PROUVÉS sur pièce**

## 1. CHIFFRES (preuves : progress.log, AUDIT.json, 50 admission.json)
50/50 chapitres · **87 987 mots** (~1 760/chap — l'extension ×2,9 vs BB-02 a tenu TOUTE la longueur, σ faible : 1 683-1 819) · **349/350 candidats éligibles** (1 rejet ch.46 — les gates ne sont pas décoratifs) · 50 admissions rejouables hashées · 7/7 profils gagnants représentés (synthese×9+, voix-sèche, tension-interne, dialogue, canon-strict, rythme-compressé, sensoriel — diversité réelle de bout en bout).

## 2. LES CORRECTIFS C8, VÉRIFIÉS SUR LE LIVRE RÉEL
| Prise (revue C7) | Remède C8 | Résultat 60k (AUDIT shadow) |
|---|---|---|
| D2 ancrage d'incipit (4 proses clonées au ch.1) | amorces variées par profil | **0/49 incipits adjacents sous le seuil de clonage** — corrigé au niveau LIVRE |
| D1 dérive de rôle par implication (tablier/boulangerie) | implication-gate advisory | **0 signal sur 50 chapitres** — le pattern a disparu À LA SOURCE (amorces retirant l'ancrage cuisine) ; le gate reste en filet |
| Sous-production BB-02 (~600 w) | chapter-extender (continuations bornées, filet BF-02/segment) | ~1 760 w/chap stables ×50 — **aucun segment refusé par le filet recall** |

## 3. NOUVELLES VÉRITÉS (ce que le shadow révèle — matière EMP-16)
1. **Tics trans-chapitres** : « il y a » ×39, « le bruit de » ×32, « le silence qui » ×32, « la pluie ne » ×31 — les leitmotivs atmosphériques (pluie/silence, cohérents avec le ton commandé) deviennent des TICS à ~×30 sur 50 chapitres. → candidats au G5 durci : plafond d'occurrences par trigramme de contenu (seuil à mesurer multi-livres).
2. **Near-dup : 1 seule paire ≥0.7** sur 50 chapitres — la répétition structurelle est sous contrôle sans gate dur.
3. **Le rejet du ch.46 (6/7)** : premier rejet de gate en conditions réelles — la préséance a fonctionné (candidat écarté, gagnant pris parmi les 6 restants, zéro intervention).

## 4. LECTURE LITTÉRAIRE (échantillons ch.1/20/50)
Tenue du ton sur 88k mots : ch.20 *« La pluie ne tombait plus, elle fouettait le béton »* (Garcia, gant de cuir, sel rassis — matière sensorielle constante) ; **clôture ch.50 : « Du naufrage », dit Yvon** — la graine seed-naufrage plantée à l'acte 2 éclot en confrontation finale avec le maire, dialogue tendu, rage froide : **l'arc payoff du plan est PAYÉ dans la prose**. Score estimé ADVISORY : **3.5-3.8 GB** (légère hausse vs pilote : la variété d'attaques aère le livre). Faiblesse littéraire dominante : les tics ci-dessus + une météo omniprésente (pluie quasi chaque chapitre — cohérent novembre breton, mais à doser V2 via TemporalClaim/weather).

## 5. ÉTAGE B VIVANT (tournoi gemma RÉEL — rapport séparé `JUDGED_RESELECT_ch001.json`)
Re-sélection jugée offline sur les 7 candidats persistés du ch.1 : juge gemma4 APPROVED (Self-Test prompt ✓), tournoi double-ordre, comparaison au gagnant d'origine — voir rapport (lancé post-run ; zéro mutation du run).

## 6. RECOMMANDATIONS (C9)
1. G5 durci par PLAFOND de tics trans-chapitres (seuils depuis cet AUDIT + prochains livres, EMP-16). 2. Météo : variable du plan (TemporalClaim weather déjà typé). 3. Étage B en ligne (judge port ouvert — coût ~10 min/chapitre N=7 : réserver aux chapitres pivots ou réduire aux 3 finalistes du score CALC). 4. N2 en conditions réelles (câblé, ratifié — première campagne sur fautes injectées en run réel). 5. Édition humaine : le manuscrit est PRÊT pour ta lecture — c'est désormais un objet de 88k mots avec preuve d'admission par chapitre.
