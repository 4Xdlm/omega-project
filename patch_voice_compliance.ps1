
# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA U-ROSETTE-01 — Patch VOICE COMPLIANCE section dans prompt-assembler-v2.ts
# Remplace le corps du template literal de buildVoiceComplianceSection()
# ═══════════════════════════════════════════════════════════════════════════════

$filePath = "C:\Users\elric\omega-project\packages\sovereign-engine\src\input\prompt-assembler-v2.ts"

$content = Get-Content $filePath -Raw -Encoding UTF8

# Nouveau corps de la section (Camus-adjacent)
$newBody = @'
Ces règles sont MESURÉES AUTOMATIQUEMENT par le scorer après génération.
Violation = voice_conformity < 80 = RCI < 85 = REJET DU TEXTE.

## POSITION CIBLE — ESPACE LATENT 2D

Ton texte doit se positionner dans la zone CAMUS-ADJACENT de l'espace stylistique calibré :

  AXE 1 (Expansion) :  cible ≤0.15 — phrases courtes (18-22 mots de moyenne)
  AXE 2 (Imbrication): cible ≤0.12 — peu de subordonnées fracturées

  Camus (0.1, 0.1) ✔ — RÉFÉRENCE ABSOLUE
  Proust (0.5, 0.9) — réservé aux injections ponctuelles (1 bloc/5)
  Simon  (1.0, 1.0) — INTERDIT comme style de base

══════════════════════════════════════════════════════

## RÈGLE 1 — SYNCOPES MÉTRIQUES [ellipsis_rate cible: 0.50]

Définition du scorer : phrase "courte" = STRICTEMENT MOINS DE 4 MOTS (1, 2 ou 3 mots).
Formule : syncopes / total_phrases. Le scorer mesure exactement ceci.

**MINIMUM IMPOSÉ : 40% de tes phrases doivent avoir 3 mots ou moins.**

✅ Syncopes valides : "Du sang." (2m) / "Elle savait." (2m) / "Silence." (1m) / "Il attendit." (2m)
❌ Ne compte PAS : toute phrase de 4 mots ou plus.

Contrôle AVANT de soumettre : compte les phrases de ≤3 mots.
Si total < 40% → insère des syncopes aux moments d'intensité émotionnelle.

══════════════════════════════════════════════════════

## RÈGLE 2 — VARIÉTÉ DES OUVERTURES [opening_variety cible: 0.80]

Définition du scorer : premier mot unique par phrase / total phrases.

**MINIMUM IMPOSÉ : 70% des phrases commencent par un mot non répété.**

❌ Interdit : 2 phrases CONSÉCUTIVES avec le même premier mot.
✅ Varie : verbe conjugué, lieu, nom propre, syncope sans sujet, subordonnée.

══════════════════════════════════════════════════════

## RÈGLE 3 — RYTHME PARAGRAPHE [paragraph_rhythm cible: 0.90]

CV des longueurs de paragraphes. Inclure OBLIGATOIREMENT au moins 1 paragraphe
ultra-court (1-3 mots seuls) et 1 long (70+ mots).

══════════════════════════════════════════════════════

## RÈGLE 4 — IMBRICATION FRACTALE (F32) — CIBLE CAMUS BAS [shadow mesuré]

L'imbrication fractale est l'AXE 2 de l'espace stylistique. Le scorer la mesure en SHADOW.

Définition : % de tes phrases qui contiennent 2+ marqueurs subordonnants (qui, que, dont,
où, quand, si, comme, parce que, bien que, puisque, lorsque, avant que, après que...).

**CIBLE CAMUS : ≤18% de tes phrases avec 2+ subordonnants.**

❌ À éviter (régime Simon/Proust) :
  "Il savait que ce qu'elle voyait là n'était pas ce qu'elle cherchait quand elle
   regardait par la fenêtre." → 4 marqueurs = imbrication extrême

✅ À privilégier (Camus) :
  "Il savait. Elle regardait par la fenêtre. Ce n'était pas ce qu'elle cherchait."
  → Phrases simples + une seule subordonnante par phrase

Règle pratique : quand une phrase devient longue, coupe-la en 2 plutôt que d'enchasser.

══════════════════════════════════════════════════════

## RÈGLE 5 — PARTICIPES PRÉSENTS (F31) — CIBLE CAMUS [0.8–1.6/100m]

Les participes présents (-ant : courant, sachant, voyant, pensant...) créent du flux.
Le scorer mesure leur densité en SHADOW.

**CIBLE CAMUS : 0.8 à 1.6 participes présents pour 100 mots.**
(Simon dépasse 4.8 — flux continu. Camus reste sobre.)

✅ Usage Camus correct : 1 participe sur 3-4 phrases
❌ Usage Simon à éviter : "Il avancait, titubant, cherchant ses mots, pensant à elle." → 4 = dérive Simon

══════════════════════════════════════════════════════

## RÈGLE 6 — PARENTHÉTIQUES (F33) — CIBLE CAMUS [0.15–0.35/phrase]

Incises, appositions, parenthèses. Le scorer les mesure en SHADOW.

**CIBLE CAMUS : 0.15 à 0.35 parenthétiques par phrase.**
(Proust atteint 2.5–4.0. Camus reste rare.)

✅ Usage Camus : "Elle dit, sans lever les yeux, qu'elle savait." → une seule incise
❌ Usage Proust : incises emboîtées — double enchassement = dérive Proust

══════════════════════════════════════════════════════

⚠️ INJECTION PONCTUELLE AUTORISÉE (1 bloc/5 blocs maximum) :
- Expansion Simon : 1 phrase-fleuve 80+ mots avec imbrication élevée
- Saturation Proust : 1 bloc dense 60+ mots avec images synesthésiques
Ces injections doivent être suivies d'un retour Camus immédiat (syncope + phrase courte).

⚠️ AUTO-VÉRIFICATION AVANT SOUMISSION :
1. Compte phrases ≤3 mots → minimum 40% du total
2. Pas 2 premiers mots identiques consécutifs
3. 1 paragraphe ultra-court (1-3 mots seuls) obligatoire
4. Moins de 20% de phrases avec 2+ subordonnants
5. Max 2 participes présents consécutifs dans une même phrase

SCORER REJETTERA AUTOMATIQUEMENT si les 3 premières métriques ne sont pas atteintes.
'@

# Rechercher la fonction buildVoiceComplianceSection et remplacer le contenu du template literal
# On cherche le pattern du titre de la section (déjà mis à jour par l'edit précédent)
$oldHeader = '# ⚠️ VOICE COMPLIANCE — CALIBRATION CAMUS-ADJACENT (U-ROSETTE-01)'

if ($content -notmatch [regex]::Escape($oldHeader)) {
    Write-Host "ERREUR: Header non trouvé dans le fichier. Vérifier l'état du fichier."
    exit 1
}

Write-Host "Header trouvé. Remplacement en cours..."

# Construire le nouveau contenu de la section
$newSection = $oldHeader + "`n`n" + $newBody

# Pattern: depuis le header jusqu'à la ligne `;` qui ferme le template literal
# On cherche le header suivi de n'importe quoi jusqu'à la fermeture du backtick + `;`
$pattern = '(?s)(' + [regex]::Escape($oldHeader) + ').*?(` + "\n" + `\n  return \{)'

# Approche plus simple: trouver les index et reconstruire
$startMarker = $oldHeader
$endMarker = "`n  return {`n    section_id: 'voice_compliance',"

$startIdx = $content.IndexOf($startMarker)
$endIdx = $content.IndexOf($endMarker)

if ($startIdx -lt 0) {
    Write-Host "ERREUR: startMarker non trouvé"
    exit 1
}
if ($endIdx -lt 0) {
    Write-Host "ERREUR: endMarker non trouvé"
    exit 1
}

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

$newContent = $before + $newSection + $after

Set-Content -Path $filePath -Value $newContent -Encoding UTF8 -NoNewline

Write-Host "PATCH APPLIQUÉ — vérification..."
if ($newContent -match [regex]::Escape("CIBLE CAMUS")) {
    Write-Host "✅ Section VOICE COMPLIANCE mise à jour avec succès"
} else {
    Write-Host "❌ Vérification échouée"
}
Write-Host "Longueur fichier: $($newContent.Length) caractères"
