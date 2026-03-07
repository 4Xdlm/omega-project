# OMEGA - PIERRE DE ROSETTE v2.1 - SCRIPTS GENERIQUES
# Usage: . run_pierre_rosette_SHARED.ps1
# Puis appeler: Invoke-RosettaRun -ExtractPath "..." -AuthorLabel "..." -OutputPath "..."

param(
    [string]$ExtractPath,
    [string]$AuthorLabel,
    [string]$OutputPath
)

$API_KEY = $env:ANTHROPIC_API_KEY
$MODEL   = "claude-sonnet-4-20250514"

if (-not $API_KEY) { Write-Error "ERREUR: ANTHROPIC_API_KEY non definie."; exit 1 }
if (-not $ExtractPath) { Write-Error "ERREUR: ExtractPath requis."; exit 1 }
if (-not $AuthorLabel) { Write-Error "ERREUR: AuthorLabel requis."; exit 1 }
if (-not $OutputPath)  { Write-Error "ERREUR: OutputPath requis."; exit 1 }

$EXTRACT = Get-Content $ExtractPath -Raw -Encoding UTF8
if (-not $EXTRACT) { Write-Error "ERREUR: Extrait vide ou introuvable: $ExtractPath"; exit 1 }
Write-Output "Extrait charge: $($EXTRACT.Length) caracteres — $AuthorLabel"

# PROMPT_A v2.1 — Contrat Causal + POSITION_SPECTRE
$PROMPT_A = @"
Tu vas resoudre un probleme d identification inverse sur cet extrait litteraire.

[EXTRAIT - $AuthorLabel]
$EXTRACT

Ne le reproduis pas. Ne l imite pas. Ne le commente pas.

Resous ce probleme : quelles contraintes de fabrication seraient necessaires pour generer un texte NOUVEAU appartenant a la meme zone stylistique que cet extrait, sans le reproduire ?

Tu dois produire un CONTRAT CAUSAL structure. Format obligatoire, rien d autre :

OUVERTURE         : [regle de demarrage - friction, tension, neutralite, etc.]
CONFLIT           : [type de conflictualite - interne/externe/latente/absente]
RYTHME            : [regle rythmique - alternance, ratio, perturbation periodique]
VOIX              : [distance narrative - personne, registre, opacite]
IMAGE             : [regle d image - densite, corporalite, abstraction]
TENSION           : [modele de tension - progression, compression, retenue]
SOUS-TEXTE        : [presence/absence/niveau - ce que le texte ne dit pas]
INTERDIT_1        : [ce que ce texte n utilise JAMAIS]
INTERDIT_2        : [second interdit absolu]
INTERDIT_3        : [troisieme interdit absolu]
POSITION_SPECTRE  : [position sur axe Simon(maximaliste)<==>Camus(minimaliste) - ex: 0.2/1.0 cote Camus]
CONTRAT_FINAL     : [5 regles max, causales, actionnables, non decoratives]

Pas d introduction. Pas d explication. Que le schema.
"@

# PROMPT_B v2.1 — Boundary Conditions (unites unifiees)
$PROMPT_B = @"
Tu vas extraire les Boundary Conditions metriques de cet extrait litteraire.

[EXTRAIT - $AuthorLabel]
$EXTRACT

Ne le commente pas. Resous ce probleme d ingenierie : quelles contraintes numeriques INFRANCHISSABLES dois-je imposer a un systeme generatif pour qu il ne regresse pas vers la moyenne statistique ?

REGLE D UNITE OBLIGATOIRE :
- Toutes les metriques de frequence = RATIO 0.0 a 1.0 (ex: 0.08, pas 8%)
- Sauf mention "/100 mots" explicite dans la DEFINITION

Format obligatoire pour chaque metrique :

METRIQUE         : [nom]
VALEUR_CIBLE     : [chiffre ou fourchette - ratio OU /100 mots selon DEFINITION]
DEFINITION       : [comment la mesurer exactement + unite]
TYPE_CONTRAINTE  : [PLANCHER / PLAFOND / FOURCHETTE / DIRAC]
STABILITE        : [CONSTANTE_AUTEUR / CONSTANTE_EXTRAIT / UNIVERSEL]

Tu dois couvrir OBLIGATOIREMENT ces 13 dimensions :

1.  Longueur moyenne des phrases (mots)
2.  Variance sigma2 de la longueur des phrases (mots2)
3.  Ratio phrases courtes (<=5 mots) sur total [RATIO 0-1]
4.  Ratio phrases longues (>40 mots) sur total [RATIO 0-1]
5.  Ratio profondeur syntaxique (subordonnees/principales) [RATIO 0-1]
6.  Ratio imbrication fractale (subordonnees de subordonnees/total subordonnees) [RATIO 0-1]
7.  Densite images/metaphores [/100 mots]
8.  Variation attaques de phrases (premiers mots uniques/total) [RATIO 0-1]
9.  Ratio abstraction/corporalite (mots abstraits/mots sensoriels)
10. Ratio perturbation rythmique Dirac (phrases <=3 mots/total) [RATIO 0-1]
11. Densite participes presents [/100 mots]
12. Coefficient parenthetiques (incises + appositions/phrase) [par phrase]
13. Toute Boundary Condition critique specifique a CET extrait

Pas d introduction. Pas d explication. Que le schema.
"@

function Invoke-Claude {
    param([string]$UserPrompt, [string]$Label)
    Write-Output ">>> Appel API: $Label ..."
    $bodyObj  = @{ model=$MODEL; max_tokens=2000; messages=@(@{role="user";content=$UserPrompt}) }
    $bodyJson = $bodyObj | ConvertTo-Json -Depth 5 -Compress
    $bodyBytes= [System.Text.Encoding]::UTF8.GetBytes($bodyJson)
    $headers  = @{ "x-api-key"=$API_KEY; "anthropic-version"="2023-06-01"; "content-type"="application/json" }
    $resp     = Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Method POST -Headers $headers -Body $bodyBytes -ContentType "application/json; charset=utf-8"
    $text     = $resp.content[0].text
    Write-Output "    OK - $($text.Length) chars"
    return $text
}

$ts      = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$resultA = Invoke-Claude -UserPrompt $PROMPT_A -Label "PROMPT_A v2.1 (Contrat Causal)"
$resultB = Invoke-Claude -UserPrompt $PROMPT_B -Label "PROMPT_B v2.1 (Boundary Conditions)"

$out  = "OMEGA - PIERRE DE ROSETTE v2.1 - $AuthorLabel`r`n"
$out += "Date    : $ts`r`n"
$out += "Model   : $MODEL`r`n"
$out += "Prompts : v2.1 (POSITION_SPECTRE + unites unifiees + 13 metriques obligatoires)`r`n"
$out += "=" * 60 + "`r`n`r`n"
$out += "PROMPT_A - CONTRAT CAUSAL`r`n" + "=" * 60 + "`r`n"
$out += $resultA
$out += "`r`n`r`n" + "=" * 60 + "`r`n"
$out += "PROMPT_B - BOUNDARY CONDITIONS METRIQUES`r`n" + "=" * 60 + "`r`n"
$out += $resultB
$out += "`r`n`r`nFIN DES RESULTATS`r`n"

[System.IO.File]::WriteAllText($OutputPath, $out, [System.Text.Encoding]::UTF8)
Write-Output "TERMINE. Resultats dans: $OutputPath"
