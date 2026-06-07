# NCR-SEMANTIC-TRUNCATION-003 — CLOSEOUT

**Origine** : REFUS du closeout NCR-SEAM-002 par ChatGPT (2026-06-07) — « Un point
final ne répare pas une phrase amputée. Il la maquille. OMEGA doit détecter les
trous de SENS, pas seulement les trous de ponctuation. » Refus VALIDÉ par
vérification empirique : les 7 preuves étaient toutes réelles sur `7464c4bb`.
**Statut** : CLOSED — PASS (rebuild `2563ea4d451f4980`, 86 626 mots)

---

## 1. Vérification des 7 preuves (AVANT, sur 7464c4bb → APRÈS, sur 2563ea4d)

| Preuve ChatGPT | Avant | Après | Réparation |
|---|---|---|---|
| « Elle peut voir. » | 1 | **0** | CUT à « …du fauteuil. » (segment terminal 3 mots = ouvert) |
| « Léna ouvrit. » (bloc isolé) | 1 | **0** | fragment ouvert court → retiré tracé |
| « Le visage. » (bloc isolé) | 1 | **0** | idem |
| « «. » (point unique) | 1 | **0** | REMOVE_DEGENERATE_QUOTE |
| « — Tu parles de culp. » | 1 | **0** | stem corpus (culp→culpabilité) → retiré |
| « « Qui l'a fait taire. » non fermé | 1 | **0** | CLOSE_QUOTE (« … taire. » ) |
| ch.50 finit sur citation ouverte | FAIL | **PASS** | CLOSE_QUOTE → « Du naufrage », dit Yvon simplement. « Le navire de marchandises. » |
| (systémique découvert) 19 « orphelins | 756«/737» | **delta 0** | 20 CLOSE_QUOTE + 3 CUT tracés |

**Note d'honnêteté** : 2 items de la liste ChatGPT étaient en réalité des FAUX
POSITIFS une fois le contexte lu — « Léna ouvrit. Elle était pâle… » (après
« Garcia toqua à la porte » : phrase idiomatique complète, PRÉSERVÉE) et
« « ... » d'ellipse de reprise (style voulu, PRÉSERVÉ). Les preuves ciblent la
forme ARTEFACT (bloc isolé / point unique) — les formes légitimes restent.

## 2. Mécanismes (zéro lexique externe — le corpus est sa propre autorité)

- **STEM TRONQUÉ DATA-DRIVEN** (`semantic-gate.ts`) : mot final hapax (freq ≤1)
  ET préfixe strict d'un mot du livre ≥+3 lettres = troncature PROUVÉE.
  Candidats = mots SIMPLES uniquement (le composé « dites-moi » avait produit le
  faux positif « dite » ch.37 — attrapé et neutralisé avec test INV-SEM-009).
- **GATE DE COMPLÉTUDE avant ADD_PERIOD** (`seam-sweep.ts`) : le point n'est
  ajouté que si le SEGMENT TERMINAL (pas le bloc entier) a ≥4 mots, pas de stem,
  guillemets équilibrés. Sinon : coupe à la dernière phrase complète / retrait
  tracé / revue. Seule l'incise de dialogue (« dit-il ») reste non gatée —
  complète par construction.
- **GUILLEMETS** : citation TERMINÉE non fermée → « » » ajouté (le DIALOGUE
  licencie l'ellipse — « Le navire de marchandises. » est une réplique
  elliptique légitime ; la narration, elle, ne licencie rien) ; citation
  tronquée → coupe à la dernière phrase équilibrée ; « dégénéré → retrait.
- **FIN DE LIVRE** (`isBookEndComplete`) : dernier bloc terminé + équilibré +
  ≥4 mots + non dégénéré — une scène fermée, jamais une citation ouverte.

## 3. Preuves instrumentales du rebuild (9 familles, TOUTES PASS)

P1 dup=0 · P2 footwear dur=0 (1 INFO advisory) · P3 ch.50 terminé ·
P4 couture résidu=0 · P5 scaffold 50 retirés résidu=0 ·
**P6 sémantique 21 findings → 21 réparés → résidu=0** · **P7 fin de livre
fermée** · **P8 les 6 formes-artefacts ChatGPT = 0** · **P9 delta guillemets
global = 0**. CSVs : SEAM_SWEEP_GLOBAL.csv, SCAFFOLD_STRIP.csv,
SEMANTIC_GATE.csv (avant/après exhaustifs).

## 4. Tests
`semantic-gate.test.ts` 9 INV (les preuves réelles en fixtures, dont le faux
positif « dite ») ; suite book-factory complète **264 PASS ×2**, tsc strict 0.

## VERDICT
- **Statut** : PASS — re-soumis à ratification ChatGPT
- **Confiance** : Haute sur SYNTAX_CLEAN + SEMANTIC_CLEAN ; la propreté
  NARRATIVE (continuité fine, qualité littéraire) reste hors périmètre export
  (couverte en amont par C9/R6 — voir AUTOAUDIT A2)
- **Forces** : critère « phrase complète + continuité » incarné en code gaté ;
  preuves du refus devenues fixtures ; faux positifs documentés avec contexte ;
  fin de livre élégante sans un mot inventé
- **Faiblesses** : (1) la complétude ≥4 mots est un seuil structurel, pas une
  analyse verbale — une troncature longue grammaticalement plausible peut encore
  passer (résiduel assumé, tracé CSV) ; (2) station de relecture humaine ch.1 +
  ch.50 (critère 7 ChatGPT) = à faire par l'Architecte, non automatisable
- **Action requise** : ratification tribunal ; relecture humaine ch.1 + ch.50
