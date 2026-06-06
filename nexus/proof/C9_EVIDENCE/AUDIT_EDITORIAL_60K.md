# AUDIT ÉDITORIAL COMPLET — « Le Silence du Phare » (run c8_book60k, 50 chap., 87 987 mots)
**Auditeur** : IA (rôle Architecte délégué — ordre Francky 2026-06-06 « fais un audit du livre moi je n'ai pas le temps »)
**Méthode** : 4 instruments C9 (phrase/chapitre/arc/tics, SHADOW) sur le manuscrit ENTIER + lecture humaine d'échantillons (ch.1, 25, 46, 50) + vérification sur pièce de CHAQUE claim des tribunaux (ChatGPT, Gemini).
**Artefacts** : `runs/c8_book60k/EDITORIAL_AUDIT.{json,md}` (mesures brutes rejouables) · ce rapport (synthèse + arbitrages).

## VERDICT GLOBAL
```
Moteur (industriel)        : PASS confirmé — rien dans cet audit ne remet en cause C0→C8
Roman V0 (matière)         : PASS — colonne vertébrale réelle, payoff payé, ambiance tenue
Roman publiable en l'état  : FAIL — 5 défauts majeurs, TOUS à cause mécanique identifiée
Réécriture V1              : possible SANS régénération totale (fixes plan + couture + édition ciblée)
```

---

## 1. LES 5 DÉFAUTS MAJEURS (prouvés sur pièce, cause mécanique attribuée)

### D-AUD-1 — IDENTITÉ DU GARDIEN : oscillation Thomas ⇄ Henri (CRITIQUE)
Mesure : ch.2 Thomas×6 · ch.5 Henri×3 (« Il s'appelait Henri. Henri Morel. ») · ch.21 Thomas×4 · **ch.50 LES DEUX (Thomas×6 + Henri×2)**. Ce n'est pas un twist : aucun événement ALIAS/REVEAL, le chapitre FINAL mélange les deux noms.
**Cause mécanique** : le gardien MORT n'a jamais été minté — le casting C7 = {Léna, Gaspard, Yvon, Garcia} seulement. Aucun CharacterRecord, donc aucun RecallPack, donc aucun lock G2 ne portait son nom : le modèle a improvisé à chaque besoin. **La boucle R6 a protégé les 4 enregistrés (zéro dérive sur eux ×50 chapitres) et n'a PAS protégé le non-enregistré — preuve par l'absence que BF-01/BF-02 font exactement leur travail.** Fix : caster TOUT personnage nommable (y compris les morts et absents) au plan. Détection : arc-coherence l'attrape désormais (IDENTITY_DRIFT rôle « gardien »).

### D-AUD-2 — LE VILLAGE CHANGE DE NOM : Saint-Marc → Ker-Morvan (MAJEUR)
Mesure : « Saint-Marc » ×2 + « mer du Nord » ×1, UNIQUEMENT ch.1-2 ; « Ker-Morvan » ×84 partout ailleurs. Le décor primitif du ch.1 n'a jamais été réconcilié.
**Cause mécanique** : le LIEU n'était pas un fait locké du plan — le modèle a inventé « Saint-Marc/mer du Nord » au ch.1 (digest vide), puis « Ker-Morvan » s'est imposé par propagation de digest. Même classe que D-AUD-1 : ce qui n'est pas dans le monde verrouillé dérive. Fix plan : village + géographie = entités mintées avec DriftRule location.

### D-AUD-3 — COUTURES D'EXTENSION CASSÉES ×2 (MAJEUR, le plus visible au lecteur)
Preuve verbatim ch.1 : « Le métal est froid, luisant. **Elle l** Le métal est froid, luisant. Elle l'ouvre à la hâte… » — troncature + reprise dupliquée. ×2 occurrences sur le livre (mesure regex).
**Cause mécanique** : chapter-extender (C8) colle la continuation SANS (a) tronquer la dernière phrase incomplète du segment précédent, (b) détecter le chevauchement de reprise (le modèle répète la dernière phrase avant de continuer). Fix moteur PRÉCIS : couture = couper le tail à la dernière phrase terminée + dédup par chevauchement de préfixe. C'est un bug à 30 lignes, détectable par test.

### D-AUD-4 — MICRO-PHYSIQUE : bottes/pieds nus (CONFIRMÉ, instrument livré)
Preuve ch.1 : « Elle avance pieds nus, la semelle de ses bottes restée accrochée à la porte » — bottes établies 2 phrases avant (« sous ses bottes lourdes »), aucun retrait. L'instrument sentence-physics l'attrape (FOOTWEAR_CONTRADICTION ch.1) + 5 signaux DOOR (dont ch.2 = granularité 2 portes différentes, faux positif documenté). Total niveau phrase : 6 signaux/50 chap — la prose est micro-physiquement PROPRE à 99%, mais les rares accidents sont très visibles.

### D-AUD-5 — TICS D'IMAGINAIRE (CONFIRMÉ et MESURÉ, seuils proposés)
G5-TICS sur n-grammes 2-4 : « le silence » ×255 (5.1/chap), « il y a » ×39, « le silence qui » ×32, « la pluie ne » ×31 — auxquels s'ajoute « le gardien » ×349 (référentiel, PAS un tic — l'instrument sépare désormais mais le rapport doit lire : tics de CONSTRUCTION = 3-4-grammes). Near-dup phrases : 1 seule paire — la répétition de SURFACE est maîtrisée, la répétition d'IMAGINAIRE non. Fix : cooldown ledger livré (tic ≥3× dans 3 chap ⇒ interdit 5 chap, injectable dans les directives futures — compatible Scribe aveugle).

## 2. CE QUE L'AUDIT INSTRUMENTÉ A TROUVÉ EN PLUS (inédit tribunaux)
1. **Mystery ledger** : « naufrage » planté ch.8 → payoff ch.46 ✓ · « carnet » 11→46 ✓ · « dette » 11→45 ✓ · MAIS « **lettre** » (planté ch.3, 9 rappels) et « **registre** » (ch.7) = **UNPAID** — deux fils ouverts jamais soldés. Matière directe pour la V1 (payer ou couper).
2. **Niveau chapitre** : 38 signaux (TIME_REGRESSION 22 — régressions soir→matin sans marqueur, à échantillonner : part de flashbacks légitimes ; GHOST_SPEAKER 8 — personnages qui parlent après être sortis de scène ; LOCATION_JUMP 8 après filtre présence-vs-mention).
3. **Fonctions de chapitre (proxy CALC, quantiles)** : TRANSITION=36 · ACTION=9 · CONFRONTATION=5 · REVELATION=0 · REDITE=0. Lecture honnête : le livre révèle par DIALOGUE (peu de verbes d'aveu explicites — q80 des marqueurs ≤1/chap), et la sur-représentation TRANSITION (72%) objective la « monotonie dramatique » pointée par Gemini : peu de chapitres à fonction forte.
4. **Scission Squarcioni/Yvon** (lecture ch.46) : « souffla Squarcioni » en présence de Garcia/Gaspard alors que Yvon Squarcioni = LE maire — le modèle traite parfois « Squarcioni » comme un tiers. Même famille que D-AUD-1 (résolution d'alias jamais câblée dans les packs : nom complet locké mais surfaces partielles non liées).

## 3. VÉRIFICATION CLAIM-PAR-CLAIM DES TRIBUNAUX
| Claim | Verdict | Preuve |
|---|---|---|
| ChatGPT : passage bottes « accident industriel » | **CONFIRMÉ** | verbatim trouvé + instrument l'attrape |
| ChatGPT : « Elle l » coupé, reprises cassées | **CONFIRMÉ ×2** | couture extender, cause mécanique identifiée |
| ChatGPT : gardien tantôt Thomas tantôt Henri | **CONFIRMÉ** | ch.2/5/21/50, oscillation jusqu'au final |
| ChatGPT : flou mer du Nord / Saint-Marc / Ker-Morvan | **CONFIRMÉ** | primitif ch.1-2 jamais réconcilié |
| ChatGPT : « pensée petite cuisine reprise quasi à l'identique » | **NUANCÉ** | « petite cuisine » ×2 livre entier — répétition réelle mais unique |
| ChatGPT : tics ×30+ | **CONFIRMÉ + mesuré** | G5-TICS, seuils proposés, cooldown livré |
| ChatGPT : Léna manque d'agence | **PARTIEL** | proxy : 72% TRANSITION objective la passivité dramatique ; l'agence fine = lecture humaine Francky |
| ChatGPT : voix interchangeables | **NON MESURÉ** | G-VOICE = V2 (nécessite attribution de répliques fiable — chantier propre) |
| Gemini : continuité locale impeccable | **INFIRMÉ en partie** | 38 signaux chapitre + 2 coutures cassées |
| Gemini : 0 contradiction canon sur faits clés | **CONFIRMÉ sur les 4 mintés** / **INFIRMÉ sur les non-mintés** | gardien + village dérivent — hors périmètre des locks |

## 4. SCORES PAR AXE (audit instrumenté + lecture)
```
Concept / colonne vertébrale : 8/10  (payoff payé ch.46+50, concret : Ker-Vo, moteur coupé)
Atmosphère                   : 8/10  (constante, identité forte)
Cohérence canon (mintés)     : 9/10  (zéro dérive ×50 chap sur les 4 enregistrés)
Cohérence canon (non-mintés) : 3/10  (gardien, village — D-AUD-1/2)
Continuité micro/chapitre    : 6/10  (6 + 38 signaux, 2 coutures cassées)
Variété dramatique           : 4/10  (72% TRANSITION, REVELATION explicite rare)
Tics / saturation motifs     : 3/10  (mesuré, FAIL_SHADOW multiples)
Publiable en l'état          : NON — V1 éditoriale requise
```

## 5. PLAN V1 — priorisé, chaque item adossé à sa cause
1. **P0 moteur (avant tout nouveau run)** : (a) couture extender (tronquer phrase incomplète + dédup reprise, test sur les 2 cas réels) ; (b) casting complet au plan : morts, absents, VILLAGE et géographie mintés avec DriftRule ; (c) surfaces partielles des noms composés liées (Squarcioni→Yvon Squarcioni).
2. **P1 édition du manuscrit ACTUEL (sans régénérer)** : unifier gardien (choisir Henri Morel OU Thomas — 16+5 occurrences à éditer), unifier Saint-Marc→Ker-Morvan (2 occ.), réparer les 2 coutures, payer ou couper « lettre » et « registre ».
3. **P2 prochain run** : cooldown ledger branché dans les directives (tics), amorces pondérées vers fonctions fortes (quota REVELATION/CONFRONTATION par acte au plan), instruments C9 en post-chapitre (rapport par chapitre pendant le run, toujours ADVISORY).
4. **P3 (V2, chantiers propres)** : G-VOICE par personnage, météo pilotée par le plan, étage B sur finalistes des chapitres pivots.

## 6. CE QUI POURRAIT CASSER CE VERDICT
Les instruments C9 sont des proxys lexicaux : TIME_REGRESSION peut compter des flashbacks légitimes (22 signaux à échantillonner avant d'en faire un chiffre de défauts) ; la classification de fonction est relative au livre (pas inter-livres tant que 3 corpus non mesurés, EMP-16) ; la lecture humaine de Francky reste l'autorité sur l'agence de Léna et les voix — cet audit la PRÉPARE, il ne la remplace pas.
