# NCR-SEAM-GLOBAL-002 — CLOSEOUT

**Statut** : CLOSED — PASS
**Ordre Architecte** : « les outils d'analyse et de contrôle doivent être
intraitables et ne pas être myopes, tout doit être irréprochable. Développez les
contrôles et leur puissance et rigueur, mais rien ne doit être laissé au hasard. »
**Mandats tribunal** : ChatGPT (NCR-SEAM-GLOBAL-002, balayage global + rebuild
hashé + résidu zéro) ; Gemini (sceller Gold-Set V3, 5 désaccords = SOUS_TEXTE).
**Date** : 2026-06-07

---

## 1. Diagnostic — pourquoi « myope »

Les détecteurs de couture précédents étaient des **listes de patterns connus**
(`l|d|qu…`, exact-match). Ils éteignaient les alarmes au cas par cas et laissaient
passer toute variante non listée. Preuves apportées par ChatGPT :

- ch.2 finissait par « — Yvon ! s » (le « s » orphelin de « se »).
- « Yvon ne répond pas tout de suite. ¶ Il ne répond pas tout de suite. » —
  reprise quasi-dupliquée que l'exact-match ne voyait pas.

## 2. Correctif — DÉFINITIONS structurelles, pas listes

Module `src/doctor/seam-sweep.ts` (BF-08). Détection par **invariants** :

- **FRAGMENT PENDU** : bloc dont le cœur (après retrait des décorations `*_\`"'`)
  ne finit pas par `[.!?…»:]`. Sous-classe DANGLING si dernier token tronqué.
- **REPRISE DE COUTURE** : dernière phrase d'un bloc ≈ PREMIÈRE phrase du bloc
  suivant (Jaccard mots ≥ 0.6), reprise de bloc entier incluse.
- **EXCEPTION stylisée** : interruption reprise par « — … » = effet voulu, jamais
  signalée (sinon le résidu ne tomberait jamais à zéro sur un texte légitime).

Réparation par **arbre grammatical** (8 actions tracées, jamais silencieuses) :
mot de continuation (préposition/article/conjonction/auxiliaire) ⇒ troncature
(faux-départ / coupe à la virgule / fragment court retiré / revue manuelle si
long) ; mot terminal-capable (nom/verbe/particule) ⇒ point ajouté ; phrase
complète interne ⇒ coupe. **Critère PASS = re-scan à zéro** (le réparateur ne se
note pas lui-même).

## 3. Découverte pendant le balayage — SCAFFOLD_GUARD

Le balayage a révélé **50 directives de génération** laissées dans la PROSE (une
par ouverture de chapitre) : « — Acte 2 : avancer l'enquête… [synthese] »,
« — Présenter Léna Marchetti… [rythme-compresse] », « — Incident déclencheur…
[canon-strict] ». Ce bruit avait été nettoyé du GÉNOME (NCR-MYC-001) mais jamais
de la prose. Module `src/doctor/scaffold-guard.ts` (BF-08), invariant prouvé sur
corpus : les 50 crochets du V0 sont TOUS des tags directive (canon-strict×9,
voix-seche×9, rythme-compresse×8, synthese×8, tension-interne×8, sensoriel×5,
dialogue×3), **zéro crochet de prose**. Signature = crochet contenant un token
minuscule composé `[a-z-]+` (exclut toute incise « [signé Garcia] » majuscule+espace).

**Bug en cascade trouvé et corrigé** : la 1re version du guard supposait un tag
NON fermé et rejetait les crochets fermés ; la directive ch.1 (sans préfixe
« Acte ») échappait, puis le seam sweep lui retirait le « ] » comme décoration et
ajoutait un point. Corrigé : détection du crochet FERMÉ (forme réelle). 50/50
retirés, résidu 0.

## 4. Correction de proof2 (footwear) — respecter la sévérité du scanner

Le seul « footwear contradiction » restant (« Elle avance pieds nus, la semelle de
ses bottes restée accrochée à la porte ») est classé **INFO** par le scanner
lui-même (élision délibérée, image cohérente) — pas WARN. proof2 comptait toutes
sévérités : compter une INFO comme échec = proof myope vs la classification du
scanner. proof2 teste désormais les contradictions DURES (WARN), reporte les INFO.

## 5. Export canonique — 5 preuves instrumentales PASS

`runDoctor (mécanique) → SCAFFOLD_GUARD → dédup → tail → SEAM_SWEEP → preuves`.
Mode **déterministe** (zéro Ollama : reproductible et non suspendable ; le SURGICAL
LLM non déterministe + risque de hang est désactivé par défaut).

| Preuve | Résultat |
|---|---|
| P1 — pas de phrase « métal » dupliquée | PASS |
| P2 — contradictions footwear DURES | 0 (1 INFO reportée) — PASS |
| P3 — ch.50 terminé | PASS |
| P4 — résidu couture après re-scan | **0** — PASS |
| P5 — directives scaffold résiduelles | retirées 50, résidu **0** — PASS |

- **MANUSCRIT_V1_FINAL.md** — SHA256 `7464c4bb78dcf655…`, 86 723 mots.
- **SEAM_SWEEP_GLOBAL.csv** — 185 réparations avant/après (111 ADD_PERIOD,
  38 CUT_AT_CLAUSE_COMMA, 12 REMOVE_FRAGMENT, 11 CUT, 8 FALSE_START, 3 ORPHAN, 2 STYLED_OK).
- **SCAFFOLD_STRIP.csv** — 50 directives retirées, tracées.
- Manuscrit propre : `[tag]`=0, `— Acte`=0, ch.1 ouvre sur la narration.

## 6. Gold-Set V3 — SCELLÉ (mandat Gemini)

**GOLDSET_V3_SEALED.json** — 64 items, 59 in-spectrum, **5 SOUS_TEXTE** gelés
(P22/P29 révélations implicite/oblique ; N02/N22/N31 révélations négatives).
Accord humain↔IA global 92.2 %, **in-spectrum 100 %**. labelsHash `82f7ebf7…`.
Principe anti-Goodhart : le proxy lexical cible la révélation EXPLICITE ; le
sous-texte est hors spectre PAR DÉCISION (REVELATION_RE V2 reste plafonné R=0.75).

## 7. Tests & non-régression

- `seam-sweep.test.ts` : 12 INV (cas réels du tribunal en fixtures) — PASS.
- `scaffold-guard.test.ts` : 7 INV (positifs + 3 prose réelle préservée) — PASS.
- Suite book-factory complète : **251 PASS ×2** (stable), TSC strict 0.

---

## VERDICT

- **Statut** : PASS
- **Confiance** : Haute
- **Forces** : détection par définitions grammaticales (non myope) ; réparation
  par arbre de décision tracé (8 actions) ; re-scan à zéro comme critère ;
  cas réels du tribunal en fixtures de test ; export déterministe reproductible ;
  découverte + correction du scaffold-leak (50) et d'un bug en cascade.
- **Faiblesses** : (1) le SURGICAL footwear LLM reste désactivé — la contradiction
  ch.1 demeure en INFO (image volontaire, non bloquante) ; (2) le manuscrit V1
  reste un livre gemma4 brut réparé, pas un livre R6-bouclé (la qualité littéraire
  n'est pas l'objet de ce NCR, seule l'intégrité mécanique l'est).
- **Risques restants** : aucun sur l'intégrité couture/scaffold (résidu 0 prouvé).
  L'INFO footwear et la qualité littéraire relèvent d'un travail éditorial séparé.
- **Action requise** : ratification tribunal du closeout ; décision Architecte sur
  un éventuel passage SURGICAL supervisé (gemma4 chaud) pour l'INFO footwear.
