# AUDIT ÉDITORIAL C9 — runs/c8_book60k (SHADOW — mesure pure)

Chapitres: 50

## Niveau PHRASE — micro-physique : 6 signaux (FOOTWEAR 1, OBJECT 0, DOOR 5)

- ch.1 [FOOTWEAR_CONTRADICTION] « Elle avance pieds nus, la semelle de ses bottes restée accrochée à la porte. »
- ch.2 [DOOR_REOPENED] « Elle poussa la porte, l'air intérieur sentait la poussière, le vieux bois et une odeur métallique, comme du sang séché. »
- ch.2 [DOOR_REOPENED] « Elle poussa le loquet qui bloquait la porte de la chambre de veille, la serrure rouillée grinçant comme une plainte hum… »
- ch.21 [DOOR_REOPENED] « La porte s'ouvre lentement, ne révélant que le visage de la femme. »
- ch.28 [DOOR_REOPENED] « Elle passa devant Garcia, qui ne bougea pas, et ouvrit la porte du salon. »
- ch.36 [DOOR_REOPENED] « Il fit signe à Gaspard de rester en arrière, puis poussa la porte d'un coup de pied sec. »

## Niveau CHAPITRE : 38 signaux (LOC 8, TIME 22, GHOST 8)

- ch.1 [LOCATION_JUMP] « falaise » → « phare » sans verbe de déplacement à ±2 phrases
- ch.1 [TIME_REGRESSION] « matin » → « aube » sans marqueur de nouvelle journée
- ch.3 [LOCATION_JUMP] « mairie » → « phare » sans verbe de déplacement à ±2 phrases
- ch.3 [LOCATION_JUMP] « cale » → « mairie » sans verbe de déplacement à ±2 phrases
- ch.3 [TIME_REGRESSION] « crépuscule » → « matin » sans marqueur de nouvelle journée
- ch.3 [TIME_REGRESSION] « nuit » → « soir » sans marqueur de nouvelle journée
- ch.5 [GHOST_SPEAKER] Léna parle (phrase 33) alors que sorti de scène (phrase 23) sans marqueur de retour
- ch.6 [TIME_REGRESSION] « nuit » → « soir » sans marqueur de nouvelle journée

## Niveau ARC — dérives d'identité : 1

- rôle « gardien » : Thomas (1ʳᵉ ch.2, ×4) / Squarci (1ʳᵉ ch.12, ×2) / Gaspar (1ʳᵉ ch.23, ×2) / Jean (1ʳᵉ ch.28, ×2) / Squ (1ʳᵉ ch.30, ×2) / Dubois (1ʳᵉ ch.33, ×2) / Ker (1ʳᵉ ch.46, ×2)

## Fonctions de chapitre (proxy CALC) : TRANSITION=36 · ACTION=9 · CONFRONTATION=5

REDITE: chapitres aucun

## Mystery ledger

- « carnet » : planté 11, rappels ×14, payoff 46
- « dette » : planté 11, rappels ×8, payoff 45
- « lettre » : planté 3, rappels ×9, payoff UNPAID
- « naufrage » : planté 8, rappels ×11, payoff 46
- « registre » : planté 7, rappels ×2, payoff UNPAID

## G5-TICS (seuils/chap : warn>0.3, fail-shadow>0.5)

- « le gardien » ×349 (6.98/chap) → FAIL_SHADOW
- « le silence » ×255 (5.1/chap) → FAIL_SHADOW
- « les yeux » ×192 (3.84/chap) → FAIL_SHADOW
- « la pièce » ×183 (3.66/chap) → FAIL_SHADOW
- « la table » ×172 (3.44/chap) → FAIL_SHADOW
- « la porte » ×171 (3.42/chap) → FAIL_SHADOW
- « sa voix » ×169 (3.38/chap) → FAIL_SHADOW
- « n'est pas » ×136 (2.72/chap) → FAIL_SHADOW
- « la voix » ×134 (2.68/chap) → FAIL_SHADOW
- « le village » ×132 (2.64/chap) → FAIL_SHADOW
- « la mer » ×129 (2.58/chap) → FAIL_SHADOW
- « n'était pas » ×126 (2.52/chap) → FAIL_SHADOW

## Cooldowns proposés (chapitres futurs) : 99