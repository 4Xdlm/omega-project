# ═══════════════════════════════════════════════════════════════════
# OMEGA NIGHT RUN — PROMPT CLAUDE CODE AUTONOME
# U-ROSETTE-04 : RCI_COMPLIANCE COMPLET
# ═══════════════════════════════════════════════════════════════════
#
# AUTEUR    : Claude (IA Principal OMEGA)
# DATE      : 2026-03-08
# COMMIT    : HEAD=6af2a7ec (U-ROSETTE-03 SEALED)
# OBJECTIF  : Implémenter le bloc RCI_COMPLIANCE complet + micro-run
# AUTONOMIE : TOTALE — ZÉRO QUESTION jusqu'à fin d'exécution
#
# ═══════════════════════════════════════════════════════════════════

## CONTEXTE & RÈGLES D'EXÉCUTION

Tu es Claude Code opérant sur le projet OMEGA.
Standard: NASA-Grade L4 / DO-178C. Aucune approximation tolérée.

**RÈGLE ABSOLUE : ZÉRO QUESTION.** À chaque branchement, tu décides seul selon les critères
mesurables définis dans ce document. Tu n'interromps jamais pour demander validation.

**FAIL-CLOSED** : Si une étape FAIL, tu loggues dans `sessions/NIGHT_RUN_LOG.md` et tu
passes à la décision documentée ci-dessous. Tu ne bloques JAMAIS en attente de réponse.

**ORDRE D'EXÉCUTION STRICT** :
```
WARM-01 → WARM-02 → WARM-03
→ IMPL-01 → IMPL-02
→ GATE-01 (tests)
→ COMMIT-01
→ BENCH-01 (micro-run)
→ ANALYSE-01
→ DÉCISION-01 (branchement automatique)
```

---

## ═══ PHASE WARM — LECTURE & VÉRIFICATION ÉTAT ═══

### WARM-01 — Vérifier état Git

```bash
cd C:/Users/elric/omega-project
git log --oneline -5
git status
```

**Critère PASS** : HEAD = `6af2a7ec` ou commit plus récent sur `phase-u-transcendence`.
**Si FAIL** : Logger dans `sessions/NIGHT_RUN_LOG.md` → "WARM-01 FAIL: HEAD inattendu [valeur]" → STOP.

### WARM-02 — Vérifier tests baseline

```bash
cd C:/Users/elric/omega-project/packages/sovereign-engine
npx vitest run --reporter=verbose 2>&1 | tail -20
```

**Critère PASS** : `1458 passed` (ou plus). Zéro failed.
**Si FAIL** : Logger → "WARM-02 FAIL: baseline tests not green [X failed]" → STOP.

### WARM-03 — Lire fichiers clés

Lire ces fichiers AVANT toute modification :
- `packages/sovereign-engine/src/input/prompt-assembler-v2.ts` — ligne 876 à fin
- `packages/sovereign-engine/src/oracle/axes/voice-conformity.ts`
- `packages/sovereign-engine/src/voice/voice-genome.ts` — chercher `opening_variety`

**Objectif** : confirmer que `buildVoiceComplianceSection()` est présente, version = `'2.5.2'`.
**Critère PASS** : Les 3 fichiers lisibles, version `PROMPT_ASSEMBLER_VERSION = '2.5.2'` confirmée.
**Si FAIL** : Logger → "WARM-03 FAIL: fichier manquant ou version inattendue" → STOP.

---

## ═══ PHASE IMPL — IMPLÉMENTATION U-ROSETTE-04 ═══

### CONTEXTE TECHNIQUE

Le micro-run post-U-ROSETTE-03 a donné :
- `voice_conformity` = 67–72 (bloqué, cible 85)
- `opening_variety` mesuré ≈ 0.45 (cible 0.80) → cause principale du blocage
- `rhythm` instable 70–84

**Diagnostic confirmé par ChatGPT + Gemini** : le bloc RCI_COMPLIANCE partiel (syncopes seules)
n'adresse pas `opening_variety`. Il faut les 4 sections complètes :
1. OUVERTURES (4 attaques grammaticales distinctes — fix principal)
2. EUPHONIE (alternance tension/relâchement syntaxique)
3. VOIX CONCRÈTE (registre Camus, zéro abstraction philosophique)
4. Renforcement FINAL_CHECKLIST (recency effect)

### IMPL-01 — Patcher `buildVoiceComplianceSection()`

**Fichier** : `packages/sovereign-engine/src/input/prompt-assembler-v2.ts`

**Action** : Dans la fonction `buildVoiceComplianceSection()`, remplacer le bloc de la
RÈGLE 2 (VARIÉTÉ DES OUVERTURES) ET ajouter les nouvelles règles après la RÈGLE 3.

**Localiser** ce texte exact dans le fichier :
```
## RÈGLE 2 — VARIÉTÉ DES OUVERTURES [opening_variety cible: 0.80]
```

**Remplacer tout le contenu de RÈGLE 2** (jusqu'à la ligne `══════════` suivante) par
le nouveau bloc ci-dessous. Ensuite, INSÉRER les nouvelles RÈGLES 2B + RÈGLE EUPHONIE
+ RÈGLE VOIX après la fin de RÈGLE 3 et avant RÈGLE 4.

#### NOUVEAU CONTENU RÈGLE 2 (remplace l'ancienne)

```
## RÈGLE 2 — VARIÉTÉ DES OUVERTURES [opening_variety cible: 0.80]

Formule EXACTE du scorer :
  opening_variety = Set(premier_mot_de_chaque_phrase).taille / total_phrases

Traduit en contrainte pratique :
  Pour ~30 phrases : le scorer compte TOUS les premiers mots. S'il voit "Elle" 8 fois,
  "Il" 5 fois, "La" 4 fois = seulement ~16 mots uniques sur 30 = 0.53 → REJET.

**MINIMUM IMPOSÉ : sur 30 phrases, max 6 répétitions GLOBALES (tous mots confondus).**

Limites par mot d'ouverture (texte ~30 phrases) :
- "Elle" : max 4 fois
- "Il" : max 3 fois
- "Le/La/Les" : max 2 fois CHACUN
- "Ses/Son/Sa" : max 2 fois
- Tout autre mot d'ouverture : max 2 fois

❌ Interdiction absolue :
- 2 phrases CONSÉCUTIVES avec le même premier mot.
- Plus de 4 occurrences du même mot d'ouverture dans 30 phrases.

✅ Techniques de diversification :
- Commencer par un verbe conjugué : "Surgit alors...", "Restait...", "Pesait..."
- Commencer par un complément de lieu : "Au fond du couloir...", "Dans la pièce..."
- Commencer par un moment : "Quelques secondes...", "Très lentement..."
- Commencer par une syncope sans sujet : "Rien.", "Du sang.", "Silence."
- Commencer par un nom propre ou objet concret : "La porte...", "Ses mains...", "Le bruit..."
- Commencer par une proposition subordonnée : "Quand elle...", "Si le...", "Avant que..."
- Commencer par un adverbe ou locution : "Déjà...", "Plus loin...", "Pourtant..."

Contrôle AVANT de soumettre : liste les premiers mots de TOUTES tes phrases.
Compte combien de fois chaque mot apparaît. Aucun ne doit dépasser 4.
Si "Elle" apparaît 5+ fois → reformule 2 occurrences minimum.

══════════════════════════════════════════════════════════════

## RÈGLE 2B — ATTAQUES GRAMMATICALES (4 PREMIÈRES PHRASES) [NOUVEAU — U-ROSETTE-04]

Les 4 PREMIÈRES phrases du texte sont les plus scannées par le scorer.
**OBLIGATION ABSOLUE : chaque phrase parmi les 4 premières doit utiliser une attaque
grammaticale DIFFÉRENTE.**

Les 4 types obligatoires (utiliser dans les 4 premières phrases, dans n'importe quel ordre) :

  a) GROUPE NOMINAL CONCRET — objet ou lieu d'abord, pas de pronom :
     Exemples : "La pluie froide...", "Le couloir...", "Ses mains..."

  b) PROPOSITION CIRCONSTANCIELLE — temps, lieu, condition :
     Exemples : "Avant que le jour...", "Quand elle entra...", "Dans l'obscurité..."

  c) PRONOM PERSONNEL — "Il", "Elle", "Ils" — autorisé UNE SEULE FOIS dans les 4 premières :
     Exemples : "Il regarda...", "Elle s'arrêta...", "Ils savaient..."

  d) VERBE OU PARTICIPE EN TÊTE — action ou gérondif direct :
     Exemples : "Frappant le sol...", "Surgit alors...", "Courir n'avait...", "Rester était..."

❌ VIOLATION : 2 phrases parmi les 4 premières commencent par le même pronom.
❌ VIOLATION : 3 phrases parmi les 4 premières commencent par "Il/Elle/Ils/Elles".
✅ OBJECTIF : Le lecteur perçoit immédiatement la variété rythmique.

Contrôle avant génération : planifie mentalement tes 4 premières attaques avant d'écrire.
```

#### NOUVELLES RÈGLES À INSÉRER après RÈGLE 3 (avant RÈGLE 4)

Insérer ce bloc entre la fin de RÈGLE 3 et le début de RÈGLE 4 :

```
══════════════════════════════════════════════════════════════

## RÈGLE 3B — EUPHONIE SYNTAXIQUE [euphony_basic cible: 87+] [NOUVEAU — U-ROSETTE-04]

Le scorer mesure l'euphonie via la fluidité structurelle et l'alternance rythmique.
**Violation = euphony_basic < 82 = RCI pénalisé directement.**

### Interdictions absolues :

❌ CHAÎNES LOURDES : 3+ segments syntaxiques séparés UNIQUEMENT par des virgules dans
une même phrase, chacun de 8+ mots :
  Exemple INTERDIT : "Il marchait dans le couloir sombre, il sentait la présence derrière,
  il entendait le souffle dans l'ombre, il savait que tout était perdu."
  → Couper en 2 phrases minimum, ou utiliser un point-virgule.

❌ MOT-OUTIL RÉPÉTÉ EN TÊTE : "Et...", "Mais...", "Le...", "La..." répété sur 2 phrases
consécutives :
  Exemple INTERDIT : "Le silence pesait. Le froid s'insinuait. Le temps s'étirait."
  → Varier : "Le silence pesait. Froid soudain. Le temps s'étirait."

❌ RÉGULARITÉ DE STRUCTURE : 3+ phrases consécutives avec la même structure
[Sujet + Verbe + Complément] de longueur quasi-identique (±3 mots) :
  Exemple INTERDIT : "Elle ouvrit la porte. (4m) Il entra dans la pièce. (5m) Elle recula d'un pas. (4m)"
  → Insérer une syncope ou une phrase longue.

### Obligations d'alternance :

✅ Après chaque bloc de 2+ phrases longues (15+ mots) : UNE phrase de ≤6 mots minimum.
✅ Après chaque syncope (≤3 mots) : autoriser la phrase longue suivante (15+ mots).
✅ Chaque paragraphe doit avoir AU MINIMUM une transition rythmique :
   court→long ou long→court ou syncope→développement.

✅ Séquence idéale (CV paragraphe ≥ 0.90) :
   [Phrase 25 mots] [Phrase 18 mots] [3 mots.] [Phrase 30 mots] [Phrase 12 mots] [2 mots.]

══════════════════════════════════════════════════════════════

## RÈGLE 3C — VOIX CONCRÈTE (REGISTRE CAMUS) [voice_conformity — paramètre actif] [NOUVEAU]

Le scorer voice_conformity mesure le DRIFT entre ta prose et le genome cible.
Les 3 paramètres ACTIFS (non exclus) sont : ellipsis_rate, paragraph_rhythm, opening_variety.
**Un drift global > 0.10 = voice_conformity < 85 = RCI plafonne.**

### Socle obligatoire — Registre Camus-adjacent :

✅ REGISTRE : français narratif littéraire, ancré dans le réel et le CONCRET.
   Chaque émotion = un objet, une sensation, une posture physique. Jamais une idée abstraite.
   Exemples :
   ✅ "Sa main cherchait le bord de la table." (concret)
   ❌ "Elle ressentait l'absurdité de sa propre existence." (abstraction philosophique → REJET)
   ✅ "Le café avait refroidi. Elle ne l'avait pas remarqué." (concret + implication)
   ❌ "Le temps passait, implacable, comme toujours." (généralité → REJET)

### Interdictions absolues (Voix) :

❌ GÉNÉRALISATIONS PHILOSOPHIQUES : "comme toujours", "ainsi va la vie", "c'était ainsi",
   "les choses étaient ce qu'elles étaient", "le monde ne changeait pas"
❌ EMPHASE ORNEMENTALE : "indiciblement", "ineffable", "mystérieusement", "d'une façon
   étrange", "quelque chose d'inexplicable"
❌ RÉSUMÉ D'ÉMOTION : "elle était triste", "il se sentait perdu", "la peur l'envahit"
   → Toujours MONTRER via le corps ou l'action.

### Prescription directe (drift paragraph_rhythm) :

✅ Aucun paragraphe de plus de 90 mots sans coupure ou syncope interne.
✅ Au moins 1 paragraphe d'une seule phrase de ≤4 mots dans la scène entière.
✅ Les paragraphes longs (60-90 mots) doivent alterner avec des paragraphes courts (5-20 mots).

══════════════════════════════════════════════════════════════
```

### IMPL-02 — Mettre à jour version + AUTO-VÉRIFICATION FINALE

**Action 1** : Changer la version dans le fichier :
```typescript
// Avant :
export const PROMPT_ASSEMBLER_VERSION = '2.5.2';
// Après :
export const PROMPT_ASSEMBLER_VERSION = '2.5.3';
```

**Action 2** : Dans le commentaire JSDoc au-dessus de la version, remplacer :
```typescript
// Avant :
/** U-ROSETTE-03: version bump — FIX opening_variety RULE 2 (scorer-exact formula + global limits) */
// Après :
/** U-ROSETTE-04: RCI_COMPLIANCE complet — RÈGLE 2B (attaques grammaticales), RÈGLE 3B (euphonie), RÈGLE 3C (voix concrète) */
```

**Action 3** : Dans `buildVoiceComplianceSection()`, section AUTO-VÉRIFICATION FINALE,
remplacer la liste de contrôle actuelle par :

```
⚠️ AUTO-VÉRIFICATION AVANT SOUMISSION :
1. Compte les phrases <= 3 mots -> minimum 40% du total
2. Vérifie les 4 PREMIÈRES phrases : 4 types d'attaque grammaticale différents (GN/circonstancielle/pronom/verbe)
3. Pas 2 premiers mots identiques consécutifs
4. 1 paragraphe ultra-court (1-4 mots seuls) obligatoire
5. Moins de 20% de phrases avec 2+ subordonnants
6. Max 2 participes présents consécutifs dans une même phrase
7. Zéro chaîne de 3+ segments lourds séparés par virgules seules
8. Zéro généralité philosophique ou emphase ornementale

SCORER REJETTERA AUTOMATIQUEMENT si les métriques 1, 3, 4 ne sont pas atteintes.
RCI < 85 si métriques 2, 7, 8 sont violées.
```

**Action 4** : Dans `buildFinalChecklistSection()`, ajouter POINT 7 (entre point 6 et la ligne `---`) :

```
## 7. ATTAQUES DES 4 PREMIÈRES PHRASES (opening_variety score direct)
Tes 4 premières phrases utilisent 4 types grammaticaux DISTINCTS :
  □ Groupe nominal concret (ex: "La porte...", "Ses mains...", "L'air...")
  □ Proposition circonstancielle (ex: "Quand elle...", "Dans le couloir...", "Avant que...")
  □ Pronom personnel — MAX 1 fois parmi les 4 (ex: "Elle s'arrêta...", "Il regarda...")
  □ Verbe ou participe en tête (ex: "Surgit alors...", "Courir était...", "Frappant le sol...")
❌ Si 2+ phrases parmi les 4 premières commencent par le même type → REFORMULE avant de soumettre.
```

---

## ═══ PHASE GATE-01 — TESTS ═══

### GATE-01 — Exécuter npm test

```bash
cd C:/Users/elric/omega-project/packages/sovereign-engine
npx vitest run 2>&1 | tail -30
```

**Critère PASS** : `≥ 1458 passed`, 0 failed.
**Si FAIL** :
1. Lire les erreurs complètes
2. Corriger uniquement les tests cassés par la modification (probablement aucun — la modification est additive dans des template strings)
3. Si la correction dépasse 15 min → LOGGER → "GATE-01 FAIL: [erreurs]" et STOP proprement.

---

## ═══ PHASE COMMIT-01 ═══

### COMMIT-01 — Hash + Commit

```bash
cd C:/Users/elric/omega-project/packages/sovereign-engine
Get-FileHash -Algorithm SHA256 src/input/prompt-assembler-v2.ts
git add src/input/prompt-assembler-v2.ts
git commit -m "feat(prompt): U-ROSETTE-04 RCI_COMPLIANCE complet [INV-VOICE-01] — RÈGLE 2B attaques grammaticales + RÈGLE 3B euphonie + RÈGLE 3C voix concrète — v2.5.3 — tests 1458/1458 PASS"
```

Logger le SHA256 dans `sessions/NIGHT_RUN_LOG.md`.

---

## ═══ PHASE BENCH-01 — MICRO-RUN ═══

### BENCH-01 — Lancer le micro-run

```bash
cd C:/Users/elric/omega-project/packages/sovereign-engine
$env:ANTHROPIC_API_KEY = (Get-Content .env | Where-Object { $_ -match "^ANTHROPIC_API_KEY=" }) -replace "^ANTHROPIC_API_KEY=", ""
$env:BENCH_MICRO = "1"
npx tsx scripts/run-benchmark-phase-u.ts 2>&1 | Tee-Object -FilePath sessions/NIGHT_RUN_BENCH_OUTPUT.txt
```

**Durée estimée** : 60-120 min. Laisser tourner jusqu'à fin naturelle.
**Ne pas interrompre** même en cas d'erreurs 500 (absorbées par INV-TK-06).

---

## ═══ PHASE ANALYSE-01 + DÉCISION-01 ═══

### ANALYSE-01 — Parser résultats

Lire `sessions/NIGHT_RUN_BENCH_OUTPUT.txt` et extraire :
- Scores RCI de chaque ONE-SHOT run (3 valeurs)
- Score voice_conformity de chaque run (si disponible)
- TOP-K survivors count

Calculer :
- `rci_max` = max des 3 RCI one-shot
- `rci_mean` = moyenne des 3 RCI one-shot
- `voice_max` = max des voice_conformity
- `survivors_total` = total survivors sur 3 TOP-K runs

### DÉCISION-01 — Branchement automatique

#### CAS A : rci_max >= 85 ET rci_mean >= 82

**Action** :
1. Logger → "U-ROSETTE-04 VALIDÉ — rci_max=[X] rci_mean=[X] voice_max=[X]"
2. Commit final de validation
3. Créer le tag : `git tag -a u-rosette-04-validated -m "RCI floor atteint — micro-run PASS"`
4. **LANCER LE FULL BENCHMARK** (voir PHASE FULL-BENCH ci-dessous)

#### CAS B : rci_max >= 83 ET rci_max < 85 (proche mais insuffisant)

**Action** :
1. Logger → "U-ROSETTE-04 PROCHE — rci_max=[X] — second patch requis"
2. Analyser quel sous-axe RCI est encore bloquant (voice_conformity vs rhythm vs hook)
3. Implémenter le patch ciblé selon le sous-axe dominant (voir PATCH CONDITIONNEL ci-dessous)
4. Relancer GATE-01 → COMMIT-01 → BENCH-01

#### CAS C : rci_max < 83

**Action** :
1. Logger → "U-ROSETTE-04 INSUFFISANT — rci_max=[X] — analyse structurelle requise"
2. Vérifier si le patch a bien été appliqué (lire le fichier, compter les occurrences de "RÈGLE 2B")
3. Logger l'état complet dans `sessions/NIGHT_RUN_LOG.md`
4. STOP — attendre décision humaine

---

## ═══ PHASE FULL-BENCH (CAS A UNIQUEMENT) ═══

### FULL-BENCH-01 — Benchmark 30 runs ONE-SHOT

```bash
cd C:/Users/elric/omega-project/packages/sovereign-engine
$env:ANTHROPIC_API_KEY = (Get-Content .env | Where-Object { $_ -match "^ANTHROPIC_API_KEY=" }) -replace "^ANTHROPIC_API_KEY=", ""
$env:BENCH_RUNS = "30"
$env:BENCH_MODE = "oneshot"
npx tsx scripts/run-benchmark-phase-u.ts 2>&1 | Tee-Object -FilePath sessions/NIGHT_RUN_FULL_BENCH.txt
```

**Critère de succès** : SEAL rate >= 30% sur 30 runs ONE-SHOT.

**Après full bench** :
- Si SEAL rate >= 30% → logger "FULL BENCH PASS" + commit + tag `u-rosette-04-full-bench-pass`
- Si SEAL rate < 30% mais >= 15% → logger "FULL BENCH PARTIEL — décision humaine requise"
- Si SEAL rate < 15% → logger "FULL BENCH FAIL — retour au diagnostic"

---

## ═══ PATCH CONDITIONNEL (CAS B) ═══

Si CAS B : analyser `voice_conformity` détail dans les logs du bench.

**Si `opening_variety` still < 0.65** :
→ Ajouter dans `buildFinalChecklistSection()` un 8ème point ULTRA-EXPLICITE :
```
## 8. VÉRIFICATION MÉCANIQUE opening_variety (CRITIQUE)
Avant de terminer : liste TOUS les premiers mots de tes phrases sur une ligne :
"Elle / Le / Rien / Avant / Il / La / Surgit / Quand / Ses / Du sang / ..."
Compte les doublons. Aucun mot ne peut apparaître > 4 fois.
Si "Elle" = 5+ → change 2 phrases en commençant par un verbe ou un GN.
```

**Si `rhythm` still < 78** :
→ Renforcer la section RYTHMIQUE avec un exemple concret de comptage.

**Si `hook_presence` still < 65** :
→ Vérifier que les signature_words sont bien listés dans le prompt avec instruction de présence.

---

## ═══ LOG DE SESSION ═══

À chaque étape, maintenir `sessions/NIGHT_RUN_LOG.md` :

```markdown
# OMEGA NIGHT RUN LOG — 2026-03-08

## Timeline

| Heure | Étape | Statut | Détail |
|-------|-------|--------|--------|
| HH:MM | WARM-01 | PASS/FAIL | [détail] |
| HH:MM | WARM-02 | PASS/FAIL | X tests |
| HH:MM | WARM-03 | PASS/FAIL | version confirmée |
| HH:MM | IMPL-01 | DONE | règles ajoutées |
| HH:MM | IMPL-02 | DONE | version 2.5.3 |
| HH:MM | GATE-01 | PASS/FAIL | X/1458 tests |
| HH:MM | COMMIT-01 | DONE | SHA256=[...] |
| HH:MM | BENCH-01 | DONE | durée=[X]min |
| HH:MM | ANALYSE-01 | DONE | rci_max=[X] voice_max=[X] |
| HH:MM | DÉCISION-01 | CAS [A/B/C] | [détail] |

## Résultats Micro-Run

| Run | Type | Composite | RCI | voice_conformity | Verdict |
|-----|------|-----------|-----|-----------------|---------|
| 1 | ONE-SHOT | - | - | - | - |
| 2 | ONE-SHOT | - | - | - | - |
| 3 | ONE-SHOT | - | - | - | - |

## Verdict Final

- rci_max = [X]
- rci_mean = [X]
- voice_max = [X]
- survivors_total = [X]
- CAS = [A/B/C]
- Action = [description]
```

---

## ═══ RÈGLES CARDINALES D'EXÉCUTION ═══

1. **JAMAIS de modification destructive** — toutes les modifications dans `prompt-assembler-v2.ts`
   sont ADDITIVES (ajout de règles dans des template strings). Rien de supprimé.

2. **TESTS AVANT COMMIT** — le commit n'a lieu que si GATE-01 = PASS.

3. **LOG TOUJOURS** — chaque étape est loggée dans `sessions/NIGHT_RUN_LOG.md` même si PASS.

4. **BASH WINDOWS** — utiliser PowerShell syntax (pas bash Linux).
   Paths : `C:/Users/elric/omega-project/...`
   Env vars : `$env:VAR = "value"`

5. **MAX 4 COMMANDES PAR BLOC** — conformément à la charte OMEGA D2.

6. **ZÉRO QUESTION** — si un cas non prévu se présente, logger et STOP proprement.
   Ne jamais attendre une réponse qui ne viendra pas cette nuit.

---

## ═══ RÉSUMÉ EXÉCUTIF ═══

**Problème** : `voice_conformity` bloquée à 67–72 malgré U-ROSETTE-03.
**Cause** : `opening_variety` mesuré ≈ 0.45 vs cible 0.80. Les syncopes seules ne déplacent pas ce paramètre.
**Solution** : 3 nouvelles règles dans le prompt LLM :
  - RÈGLE 2B : 4 attaques grammaticales distinctes dans les 4 premières phrases
  - RÈGLE 3B : Euphonie syntaxique — alternance tension/relâchement
  - RÈGLE 3C : Voix concrète — registre Camus, zéro abstraction philosophique
**Attendu** : voice_conformity → 78–88, RCI → 85–89, premier SEAL possible.

**Sources** : ChatGPT (audit DO-178C), Gemini (audit divergence), télémétrie BENCH (micro-run 6af2a7ec).

---

FIN DU PROMPT NIGHT RUN
Standard: NASA-Grade L4 / DO-178C
Autorité: Francky (Architecte Suprême)
