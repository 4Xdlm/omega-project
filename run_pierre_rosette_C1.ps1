# OMEGA - PIERRE DE ROSETTE - RUN C1
# Camus - L Etranger APEX - PROMPT_A + PROMPT_B
# Contrepoint sec - Appel direct API Anthropic

$API_KEY = $env:ANTHROPIC_API_KEY
$MODEL   = "claude-sonnet-4-20250514"
$OUTPUT  = "C:\Users\elric\omega-project\PIERRE_ROSETTE_C1_RESULTS.txt"

if (-not $API_KEY) {
    Write-Error "ERREUR: ANTHROPIC_API_KEY non definie."
    exit 1
}

$EXTRACT = Get-Content "C:\Users\elric\omega-project\omega-autopsie\scenes_v4\camus\L'Etranger_APEX.txt" -Raw -Encoding UTF8
if (-not $EXTRACT) {
    $EXTRACT = Get-Content "C:\Users\elric\omega-project\omega-autopsie\scenes_v4\camus\L_Etranger_APEX.txt" -Raw -Encoding UTF8
}
Write-Output "Extrait charge: $($EXTRACT.Length) caracteres"

$PROMPT_A_TEXT = "Tu vas resoudre un probleme d identification inverse sur cet extrait litteraire.`n`n[EXTRAIT - Albert Camus, L Etranger, scene du proces]`n$EXTRACT`n`nNe le reproduis pas. Ne l imite pas. Ne le commente pas.`n`nResous ce probleme : quelles contraintes de fabrication seraient necessaires pour generer un texte NOUVEAU appartenant a la meme zone stylistique que cet extrait, sans le reproduire ?`n`nTu dois produire un CONTRAT CAUSAL structure. Format obligatoire, rien d autre :`n`nOUVERTURE        : [regle de demarrage - friction, tension, neutralite, etc.]`nCONFLIT          : [type de conflictualite - interne/externe/latente/absente]`nRYTHME           : [regle rythmique - alternance, ratio, perturbation periodique]`nVOIX             : [distance narrative - personne, registre, opacite]`nIMAGE            : [regle d image - densite, corporalite, abstraction]`nTENSION          : [modele de tension - progression, compression, retenue]`nSOUS-TEXTE       : [presence/absence/niveau - ce que le texte ne dit pas]`nINTERDIT_1       : [ce que ce texte n utilise JAMAIS]`nINTERDIT_2       : [second interdit absolu]`nINTERDIT_3       : [troisieme interdit absolu]`nCONTRAT_FINAL    : [5 regles max, causales, actionnables, non decoratives]`n`nPas d introduction. Pas d explication. Que le schema."

$PROMPT_B_TEXT = "Tu vas extraire les Boundary Conditions metriques de cet extrait litteraire.`n`n[EXTRAIT - Albert Camus, L Etranger, scene du proces]`n$EXTRACT`n`nNe le commente pas. Resous ce probleme d ingenierie : quelles contraintes numeriques INFRANCHISSABLES dois-je imposer a un systeme generatif pour qu il ne regresse pas vers la moyenne statistique ?`n`nFormat obligatoire pour chaque metrique :`n`nMETRIQUE         : [nom]`nVALEUR_CIBLE     : [chiffre ou fourchette mesurable]`nDEFINITION      : [comment la mesurer exactement]`nTYPE_CONTRAINTE  : [PLANCHER / PLAFOND / FOURCHETTE / DIRAC]`nSTABILITE       : [CONSTANTE_AUTEUR / CONSTANTE_EXTRAIT / UNIVERSEL]`n`nTu dois couvrir OBLIGATOIREMENT ces dimensions :`n`n1. Longueur moyenne des phrases (mots)`n2. Variance sigma2 de la longueur des phrases`n3. Ratio phrases courtes (< 5 mots) sur total`n4. Ratio phrases longues (> 40 mots) sur total`n5. Profondeur arbre syntaxique (ratio subordonnees/principales)`n6. Ratio imbrication fractale (subordonnees de subordonnees)`n7. Densite images/metaphores pour 100 mots`n8. Variation attaques de phrases (% premiers mots uniques)`n9. Ratio abstraction / corporalite (mots abstraits vs sensoriels)`n10. Frequence perturbation rythmique (impulsion Dirac - phrase <= 3 mots)`n11. Toute autre Boundary Condition critique pour CET extrait specifique`n`nPas d introduction. Pas d explication. Que le schema."

function Invoke-Claude {
    param([string]$UserPrompt, [string]$Label)
    Write-Output ""
    Write-Output ">>> Appel API: $Label ..."
    $bodyObj = @{
        model      = $MODEL
        max_tokens = 2000
        messages   = @(@{ role = "user"; content = $UserPrompt })
    }
    $bodyJson = $bodyObj | ConvertTo-Json -Depth 5 -Compress
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)
    $headers = @{
        "x-api-key"         = $API_KEY
        "anthropic-version" = "2023-06-01"
        "content-type"      = "application/json"
    }
    $response = Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Method POST -Headers $headers -Body $bodyBytes -ContentType "application/json; charset=utf-8"
    $text = $response.content[0].text
    Write-Output "    OK - $($text.Length) chars recus"
    return $text
}

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$resultA = Invoke-Claude -UserPrompt $PROMPT_A_TEXT -Label "PROMPT_A (Contrat Causal)"
$resultB = Invoke-Claude -UserPrompt $PROMPT_B_TEXT -Label "PROMPT_B (Boundary Conditions)"

$out = "OMEGA - PIERRE DE ROSETTE - RUN C1`r`n"
$out += "Extrait : Albert Camus - L Etranger - APEX (scene du proces)`r`n"
$out += "Date    : $ts`r`n"
$out += "Model   : $MODEL`r`n"
$out += "======================================================`r`n`r`n"
$out += "PROMPT_A - CONTRAT CAUSAL`r`n"
$out += "======================================================`r`n"
$out += $resultA
$out += "`r`n`r`n======================================================`r`n"
$out += "PROMPT_B - BOUNDARY CONDITIONS METRIQUES`r`n"
$out += "======================================================`r`n"
$out += $resultB
$out += "`r`n`r`nFIN DES RESULTATS`r`n"

[System.IO.File]::WriteAllText($OUTPUT, $out, [System.Text.Encoding]::UTF8)
Write-Output ""
Write-Output "TERMINE. Resultats dans: $OUTPUT"
