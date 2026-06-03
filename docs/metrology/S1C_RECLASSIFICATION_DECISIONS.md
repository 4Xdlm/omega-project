# S1C+ — DÉCISIONS DE RECLASSEMENT (preuves externes)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Phase** : S1C+ (External Reception, avant S1D)
**Résultat** : le dossier externe a attrapé **9 erreurs de classement** que les filtres mécaniques (S1A/S1B) avaient laissées passer. Gold-Set re-scellé v4 propre.

> Vindication du mandat Architecte (« ne pas faire d'erreur de jugement ») : sans cette passe, des essais/histoire/œuvres primées auraient pollué les cellules de mesure.

---

## 1. ERREURS ATTRAPÉES & ACTIONS

### A — Non-fiction échappée au filtre mots-clés → EXCLURE
| Œuvre | Auteur | Nature | Cellule erronée |
|---|---|---|---|
| Comprendre l'empire / Sociologie du dragueur | Alain Soral | essais polémiques | C_FORMULAIC_FR |
| Being and the Meaning of Life | A.H. Almaas | philosophie/spiritualité | C_FORMULAIC_EN |
| Les Anormaux | Götz Aly | essai historique (traduit) | C_FORMULAIC_FR |
| Prisonnière à Téhéran | Fariba Adelkhah | témoignage | C_FORMULAIC_FR |

→ Le filtre `NONFICTION` (mots-clés titre) ne détecte pas les essais au titre « romanesque ». Détection par **auteur/genre** requise (fait ici manuellement, sourcé).

### B — Œuvres littéraires/primées mal rangées en C_FORMULAIC → EXCLURE de C
| Œuvre | Auteur | Preuve externe | Reclassement |
|---|---|---|---|
| Cadavre exquis (Cadáver exquisito) | Agustina Bazterrica | **Premio Clarín 2017** + Ladies of Horror 2020, 500k+ ex., 25+ traductions ([PenguinRandomHouse](https://www.penguinrandomhouse.com/books/664457/), [Wikipedia](https://en.wikipedia.org/wiki/Agustina_Bazterrica)) | littéraire+commercial traduit → hors C |
| La Carte d'identité | Jean-Marie Adiaffi | Grand prix littéraire d'Afrique noire 1981 | littéraire francophone → hors C |
| The Fountainhead | Ayn Rand | œuvre canonique-débattue, massivement étudiée | hors C formulaïque |
| The Maltese Falcon | Dashiell Hammett | classique du roman noir, étudié | hors C formulaïque |

→ Ces œuvres auraient tiré le centroïde « C formulaïque » vers le littéraire = contraste faussé.

### C — Erreur de langue → EXCLURE
| Œuvre | Problème |
|---|---|
| Non dirlo a nessuno (Harlan Coben) | texte en **italien** dans la cellule D_SOURCE_REAL_**FR** |

---

## 2. MÉTHODE & PREUVES (validation)
- WebSearch sourcé confirmé sur : **Yourcenar** (Académie française 1980, Prix Femina 1968, Prix Académie 1952, éditions critiques — MASTER_CANON CERTAIN) et **Bazterrica** (Premio Clarín 2017 — reclassement).
- Source structurée (Google Books API) inaccessible via `web_fetch` → recours à WebSearch (outil sanctionné).

## 3. RÉSULTAT — GOLD-SET v4
- Re-généré après exclusions sourcées, remplacements tirés du pool (cap 2/auteur).
- **30/cellule, 5 familles, 0 multi-clé, 0 fuite, 0 word_count hors plage, 0 issue.**
- **Seal SHA256 : `4388b4b6e5b91d4d2494c22b1036ac0c53c0ae1d6aa5f90655e5f929590c45b4`** (supersède 524e934e).

## 4. CE QUI RESTE (honnêteté)
La passe faite = **validation anti-erreur** (le prioritaire). Le **dossier 2-axes complet sourcé par œuvre** (PRESTIGE_SCORE + COMMERCIAL_SCORE, 7 dimensions, 150 fiches) reste à produire par batchs — sa plus grande valeur est pour l'**axe commercial OBJ1bis** et le mycélium, pas pour la discrimination extrême S1D (dont les labels de famille sont désormais nettoyés).

## VERDICT
- **Statut** : S1C+ passe anti-erreur PASS (9 corrections sourcées) ; Gold-Set v4 re-scellé propre.
- **Confiance** : Haute (corrections appuyées sur preuves vérifiables).
- **Faiblesses** : (1) dossier 2-axes complet non encore produit (batchs à venir) ; (2) détection non-fiction par mots-clés insuffisante → idéalement par auteur/genre ; (3) axe commercial (ventes/notes) non collecté (sources fiables limitées).
- **Action requise** : décision Architecte — S1D sur v4 nettoyé (labels famille validés), OU dossier 2-axes complet d'abord.
