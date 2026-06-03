# S0 — AUDIT DES DOSSIERS SOURCE (Downloads/livre + livres_payants)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Déclencheur** : Architecte (source primaire au-delà de Gutenberg) · **Méthode** : énumération + lecture des rapports de classification (read-only)

> Verdict d'utilité : **OUI, hautement utile**. Ces dossiers (a) résolvent la provenance des labels (EG-03), (b) fournissent une vérité-terrain tier-labellisée plus large et défendable, (c) contiennent le corpus commercial pour OBJ1bis, (d) apportent des maîtres modernes hors Gutenberg.

---

## 1. `Downloads/livre` — corpus source classé

- **Live (disque)** : 2429 fichiers — 1952 epub, 350 pdf, 121 txt, 5 md, 1 json. Sous-dossiers : `FR`, `ENG`, `ESP`, `IT`, `corpus D a trier`, `_EXCLU`, `non_classe`.
- **État FINAL post-dédoublonnage** (RAPPORT_FINAL.md, 2026-04-08) : **1328 livres** classés, zéro perte vérifiée.

| Langue | S | A | B | C | D | Best Seller | Total |
|---|---|---|---|---|---|---|---|
| FR | 190 | 59 | 67 | 349 | — | 4 | 669 |
| ENG | 139 | 123 | 186 | 87 | 2 | 19 | 556 |
| ESP | 20 | 15 | 8 | 38 | — | 1 | 82 |
| IT | 1 | — | — | 1 | — | — | 2 |
| non classé | | | | | | | 19 |

- **Méthode de classification** (RAPPORT_CLASSIFICATION.md) : *« extraction titre/auteur depuis le nom de fichier + classification par connaissance littéraire »* → **labels par RÉPUTATION D'AUTEUR (jugement expert)**, pas par keyword de contenu.
- **Langue rangée par DOSSIER** (FR/ENG/ESP/IT) = plus fiable que l'auto-détection JSON (qui étiquetait des titres anglais `fr`).
- **Canon S confirmé curaté** : FR/S = Camus, Robbe-Grillet, Malraux, Flaubert, Proust, Zola, Hugo… ; ENG/S = Austen, Dickens, Woolf, Melville, Fitzgerald… (+121 classiques Gutenberg intégrés).

---

## 2. `Downloads/livres_payants` — maîtres modernes sous copyright

5 PDF, hors domaine public (« payants » = achetés) :
- Emmanuel Carrère — *L'Adversaire*
- Cormac McCarthy — *La Route*
- Marguerite Duras — *L'Amant*
- Juan Rulfo — *Pedro Páramo*
- Toni Morrison — *Beloved*

→ Maîtres littéraires modernes (Pulitzer/Goncourt-niveau), **absents de Gutenberg**. Ancres haut-tier idéales pour l'extrême « maître » du Gold-Set, et contre-exemples modernes (le canon Gutenberg s'arrête ~1930).

---

## 3. IMPACT SUR LE PLAN (ce que ça change)

1. **EG-03 RÉSOLU** : provenance = jugement expert par auteur → **contamination keyword levée** (cf. registre evidence-gap). La vérité-terrain défendable existe.
2. **Corpus de référence élargi** : ~1328 livres tier-labellisés (vs 881 txt Gutenberg / 1334 manifest). Le manifest M0b (FR 788/ENG 546) et les dossiers (FR 669/ENG 556) sont **proches mais non identiques** → réconciliation à faire (item S1).
3. **Corpus commercial OBJ1bis identifié** : dossiers `Best Seller` (FR 4 + ENG 19 + ESP 1 = **24 explicites**). Petit → à augmenter pour n≥30, mais le SIGNAL existe et est isolé proprement.
4. **Contrainte technique** : le gros du corpus est en **epub/pdf NON extrait** (seuls 121 txt Gutenberg le sont). → **Pipeline d'extraction epub/pdf→texte requis avant tout embedding/mesure** (nouvel item S1, non trivial : epub = HTML zippé, pdf = extraction bruitée).

---

## 4. RÉPONSE À LA QUESTION « faut-il vérifier chaque livre (langue/type/titre/contenu) ? »

**Recommandation : validation CIBLÉE, pas exhaustive.** Vérifier les 1328 par contenu = coût élevé, valeur faible — la classification experte par dossier est déjà défendable sur les extrêmes. Ce qui est utile :
- **Spot-check langue** sur un échantillon par dossier (confirmer que FR/ ne contient pas d'EN résiduels) — rapide.
- **Curer les extrêmes du Gold-Set** : sélectionner manuellement ~50 maîtres S incontestables (FR + livres_payants) vs ~50 pulp/D incontestables, langue vérifiée, split par auteur, zéro doublon. C'est là que la vérification fine paie.
- **Dédoublonnage résiduel** (epub+pdf du même livre ; fichiers `(1)`).
- **NE PAS** investir dans la vérification des tiers médians A/B/C (bruit de label max, hors test AUC initial).

---

## 5. VERDICT

VERDICT :
- **Statut** : PASS (audit source)
- **Confiance** : Haute (rapports de provenance lus, structure vérifiée live)
- **Forces** : résout EG-03 (provenance experte) ; vérité-terrain élargie + défendable ; corpus commercial isolé ; maîtres modernes hors Gutenberg.
- **Faiblesses** : (1) corpus bulk en epub/pdf non extrait → pipeline d'extraction requis ; (2) label par auteur (pas de variation intra-auteur) ; (3) manifest(1334)↔dossiers(1328) à réconcilier ; (4) Best Seller n=24 trop petit, à augmenter.
- **Risques restants** : extraction pdf bruitée (qualité texte variable) ; doublons résiduels epub/pdf.
- **Action requise** : intégrer au design S1 — (a) pipeline extraction epub/pdf→txt, (b) Gold-Set curé sur extrêmes, (c) réconciliation manifest↔dossiers, (d) augmentation corpus Best Seller.
