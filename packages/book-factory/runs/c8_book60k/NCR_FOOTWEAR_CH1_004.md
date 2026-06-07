# NCR-FOOTWEAR-CH1-004 — micro-physique ch.1 (bottes / pieds nus)

**Statut** : OPEN — réparation supervisée prête, GATÉE par la ratification fixture 120
**Origine** : ChatGPT (2026-06-07) — « Ch.1 conserve "Elle avance pieds nus, la
semelle de ses bottes restée accrochée à la porte." […] FOOTWEAR hard : FAIL. »

## La divergence à arbitrer (consignée honnêtement)

- **Le scanner C9** (`sentence-physics.ts`, lignes 117-123) classe cette phrase
  **INFO** délibérément : élision INTRA-phrase (« la semelle restée accrochée »
  = mécanisme de séparation), pas une contradiction d'état SHOD→barefoot sans
  retrait (qui serait WARN). C'est un choix de conception documenté dans le code.
- **ChatGPT** rejette cette lecture : l'image est physiquement absurde
  (« une semelle qui reste accrochée pendant qu'elle marche pieds nus, c'est
  Tex Avery ») et bloque l'export.
- **Constat** : les deux lectures sont défendables ; le différend porte sur la
  FRONTIÈRE INFO/WARN du scanner, pas sur les faits. → arbitrage Architecte.

## Résolution préparée (sans attendre l'arbitrage sur la frontière)

Le **R6_SEAM_SURGEON** (livré ce jour, fixture 120 PASS) contient la famille de
ce cas comme **cas réel obligatoire** : contradiction bottes WARN → patch
d'EXPLICITATION guidé par l'état du monde (RecallPack « porte des bottes
mouillées ») → « Elle retire ses bottes… et avance pieds nus » → re-scan
physique propre. Test : `CAS RÉEL OBLIGATOIRE (famille NCR-FOOTWEAR-004)` PASS.

**Plan d'exécution (après GO tribunal sur la fixture)** :
1. Passage SUPERVISÉ du surgeon sur la phrase ch.1 réelle (port gemma4 chaud,
   world state = Bible ch.1), patch borné ≤3 phrases, gardes + re-scan + hash.
2. Si ESCALATE → SURGICAL_REWRITE_SUPERVISED par l'Architecte (la phrase est
   unique, 1 minute de décision humaine).
3. Rebuild canonique + preuves ; l'INFO disparaît quel que soit l'arbitrage de
   frontière (la phrase explicite le retrait).

## Hors périmètre de cette NCR (consigné pour mémoire — export HOLD ChatGPT)

Le refus d'export NARRATIVE_CLEAN cite aussi : redite « petite cuisine » ch.1 ;
incipits clonés (30/50 « La pluie ne tombait pas/plus ») ; tics massifs
(le gardien 346, le silence 254, il y a 145). Ce sont des défauts de
GÉNÉRATION (niveau moteur : cooldown lexical, quotas d'incipits, anti-repeat
trans-chapitres), pas des coutures — ils appartiennent au prochain run
full-stack (essai clinique EMP-16) avec casting total + quotas, déjà au
backlog 09_GAP_AND_BUILD. Le 88k actuel reste l'échantillon d'outillage, pas
le produit publiable.
