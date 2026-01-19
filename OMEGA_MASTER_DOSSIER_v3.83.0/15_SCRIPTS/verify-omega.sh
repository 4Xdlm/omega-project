#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — Script de Vérification
# verify-omega.sh
# ═══════════════════════════════════════════════════════════════════════════════
#
# SYNOPSIS:
#   Vérifie l'intégrité et la conformité du projet OMEGA
#
# USAGE:
#   ./verify-omega.sh /path/to/omega-project
#
# STANDARD: NASA-Grade L4
# VERSION: 1.0
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables
ERRORS=0
WARNINGS=0
PATH_TO_CHECK=$1

echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}          OMEGA VERIFICATION SCRIPT v1.0${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Vérification argument
if [ -z "$PATH_TO_CHECK" ]; then
    echo -e "${RED}ERREUR: Chemin requis${NC}"
    echo "Usage: ./verify-omega.sh /path/to/omega-project"
    exit 1
fi

# 1. Vérification existence du chemin
echo -e "${YELLOW}[1/5] Vérification du chemin...${NC}"
if [ ! -d "$PATH_TO_CHECK" ]; then
    echo -e "${RED}ERREUR: Chemin non trouvé: $PATH_TO_CHECK${NC}"
    exit 1
fi
echo -e "${GREEN}      OK: $PATH_TO_CHECK existe${NC}"

# 2. Documents requis
echo ""
echo -e "${YELLOW}[2/5] Vérification documents requis...${NC}"
REQUIRED_DOCS=("00_INDEX_MASTER.md" "README.md")

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$PATH_TO_CHECK/$doc" ]; then
        echo -e "${GREEN}      OK: $doc${NC}"
    else
        echo -e "${RED}      MANQUANT: $doc${NC}"
        ((ERRORS++))
    fi
done

# 3. Scan BACKLOG/BACKLOG_FIX/TBD
echo ""
echo -e "${YELLOW}[3/5] Scan BACKLOG/BACKLOG_FIX/TBD...${NC}"
PLACEHOLDER_COUNT=$(grep -rl "TODO\|FIXME\|TBD\|XXX" "$PATH_TO_CHECK"/*.md "$PATH_TO_CHECK"/**/*.md 2>/dev/null | wc -l)

if [ "$PLACEHOLDER_COUNT" -eq 0 ]; then
    echo -e "${GREEN}      OK: Aucun placeholder trouvé${NC}"
else
    echo -e "${YELLOW}      ATTENTION: $PLACEHOLDER_COUNT fichiers avec placeholders${NC}"
    grep -rl "TODO\|FIXME\|TBD\|XXX" "$PATH_TO_CHECK"/*.md "$PATH_TO_CHECK"/**/*.md 2>/dev/null | while read file; do
        echo -e "${YELLOW}        - $(basename $file)${NC}"
    done
    ((WARNINGS++))
fi

# 4. Calcul hash des fichiers critiques
echo ""
echo -e "${YELLOW}[4/5] Calcul des hashes...${NC}"
CRITICAL_FILES=("00_INDEX_MASTER.md" "README.md")

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$PATH_TO_CHECK/$file" ]; then
        HASH=$(sha256sum "$PATH_TO_CHECK/$file" | cut -d' ' -f1)
        echo "      $file"
        echo "      SHA-256: $HASH"
    fi
done

# 5. Comptage fichiers
echo ""
echo -e "${YELLOW}[5/5] Statistiques...${NC}"
MD_COUNT=$(find "$PATH_TO_CHECK" -name "*.md" | wc -l)
DIR_COUNT=$(find "$PATH_TO_CHECK" -type d | wc -l)
echo "      Fichiers .md: $MD_COUNT"
echo "      Dossiers: $DIR_COUNT"

# Rapport final
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}RÉSULTAT: ✅ PASS${NC}"
    exit 0
elif [ $ERRORS -gt 0 ]; then
    echo -e "${RED}RÉSULTAT: ❌ FAIL ($ERRORS erreurs)${NC}"
    exit 1
else
    echo -e "${YELLOW}RÉSULTAT: ⚠️ WARN ($WARNINGS avertissements)${NC}"
    exit 0
fi
