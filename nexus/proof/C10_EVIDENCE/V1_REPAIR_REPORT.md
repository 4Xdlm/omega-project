# V1 REPAIR PACK — « Le Silence du Phare » (GO tribunaux 2026-06-06)
**Entrée** : `runs/c8_book60k/MANUSCRIT.md` (V0, 87 987 mots — INTACT, jamais écrasé).
**Sortie** : `runs/c8_book60k/MANUSCRIT_V1_REPAIRED.md` (87 974 mots).
**Doctrine** : minimal-intervention (BF-12 esprit) — zéro régénération, zéro refonte, chaque édition tracée ci-dessous.

## DIFF COMPLET (6 opérations)
| # | Opération | Détail | Compte |
|---|---|---|---|
| R1 | Gardien unifié → **Henri** (Morel) | `\bThomas\b` → `Henri` (choix convergent Gemini+ChatGPT option A ; « Henri Morel » était déjà le nom complet donné ch.5) | **16** remplacements |
| R2a | Village unifié → **Ker-Morvan** | `Saint-Marc` → `Ker-Morvan` (ch.1-2 primitifs) | **2** |
| R2b | Mer cohérente (Bretagne) | `la mer du Nord` → `l'Atlantique` (ch.1) | **1** |
| R3 | Couture cassée ch.1 réparée | « luisant. **Elle l** Le métal est froid, luisant. Elle l'ouvre » → « luisant. Elle l'ouvre » (troncature+reprise dédupliquée) | 1 |
| R4 | Couture cassée 2 réparée | « cette capsule n'appartenait pas **à l** ¶ Le silence qui suivit » → « …posée. Ou cachée. **Quelqu'un savait.** ¶ Le silence qui suivit » (coupe à la phrase complète, zéro fait inventé) | 1 |
| R5 | Micro-physique bottes ch.1 | « Elle avance pieds nus, la semelle de ses bottes restée accrochée à la porte. » → « **Elle a ôté ses bottes sur le seuil.** Elle avance pieds nus, les semelles abandonnées contre la porte. » (transition explicitée — cohérent avec l'entrée furtive) | 1 |

## LETTRE / REGISTRE — RÉSOLUTION SANS ÉDITION (découverte d'audit)
Le verdict « UNPAID » de C9 était un **faux négatif du proxy** : relecture sur pièce —
- « lettre » EST payée **ch.48** : « Mais les lettres, elles, sont toujours là. […] Derrière le panneau de bois. Dans le grenier. Là où le gardien les a mises. » (le marqueur « confirma » n'était pas dans REVELATION_RE) ;
- « registre » EST payé **ch.50** : « Il avait trouvé les documents. Les registres. Les preuves de ce que le conseil a fait. »
Décision : **aucune scène de Bilan insérée** (l'intention narrative est déjà honorée — BF-12) ; le lexique de l'instrument n'est PAS retouché après coup pour coller au résultat (anti-Goodhart, EMP-16) — la V2 de REVELATION_RE se calibrera sur corpus. L'ordre Gemini d'insérer une scène devient sans objet : l'objet de la scène existe déjà dans le texte.

## RE-AUDIT INSTRUMENTÉ DE LA V1 (preuve : `runs/c8_book60k_v1/EDITORIAL_AUDIT.json`)
| Contrôle | V0 | V1 | Verdict |
|---|---|---|---|
| FOOTWEAR_CONTRADICTION | 1 | **0** | corrigé (a nécessité un fix d'instrument : `\b` JS ne matche pas devant lettre accentuée — « ôté » invisible ; lookarounds `\p{L}` posés, +1 test) |
| Coutures cassées (« Elle l ») | 2 | **0** | corrigées |
| Oscillation gardien | Thomas⇄Henri (4 chap.) | **éteinte** (Henri seul porteur) | corrigée |
| Saint-Marc / mer du Nord | 2+1 | **0** | unifié (Ker-Morvan ×86, Atlantique) |
| DOOR / LOC / TIME / GHOST | 5/8/22/8 | inchangés | ADVISORY — non bloquants, part de faux positifs documentée |
| Tics trans-chapitres | FAIL_SHADOW multiples | inchangés | **DETTE CONNUE** — traitement au prochain run via cooldown ledger (édition à la main de ±30 occurrences ×5 tics dégraderait la prose — interdit « refonte massive non tracée ») |

## VERDICT
- Statut : **PASS** — les 5 défauts majeurs éditables sont réparés et re-prouvés à l'instrument ; V0 préservé ; diff exhaustif ci-dessus.
- Confiance : Haute sur R1-R5 (mécaniques, vérifiées) ; Moyenne sur l'effet littéraire de R5 (1 phrase ajoutée de ma main — à valider à ta lecture).
- Faiblesses : (1) tics non traités dans la V1 (choix assumé, dette documentée) ; (2) « Henri » ×21 dont d'éventuels contextes où « Thomas » sonnait différemment — 4 contextes vérifiés sains, pas les 16.
- Risques restants : la scission Squarcioni/« Yvon » (le maire désigné des deux façons) n'est PAS éditée — elle est ambiguë mais non contradictoire (nom/prénom du même homme) ; à trancher à ta lecture.
- Action requise : lecture Architecte du ch.1 réparé + décision sur tics (run V2 avec cooldown vs édition manuelle ciblée).
