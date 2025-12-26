#!/bin/bash

# ========================================
# Script pour uploader les logos de clubs en masse
# ========================================

# Configuration
SUPABASE_PROJECT_REF="[VOTRE-REF-PROJET]"  # Ex: abcdefghijk
SUPABASE_ANON_KEY="[VOTRE-ANON-KEY]"       # Clé publique depuis Supabase Dashboard
LOGOS_DIR="./logos"                         # Dossier contenant vos logos
BUCKET_NAME="club-logos"

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Upload des logos de clubs vers Supabase"
echo "========================================="
echo ""

# Vérifier que le dossier existe
if [ ! -d "$LOGOS_DIR" ]; then
  echo -e "${RED}❌ Erreur: Le dossier $LOGOS_DIR n'existe pas${NC}"
  echo "Créez le dossier et placez-y vos logos au format: code_club.png"
  exit 1
fi

# Compter les fichiers PNG
file_count=$(find "$LOGOS_DIR" -name "*.png" -type f | wc -l | tr -d ' ')

if [ "$file_count" -eq 0 ]; then
  echo -e "${RED}❌ Aucun fichier PNG trouvé dans $LOGOS_DIR${NC}"
  exit 1
fi

echo -e "${YELLOW}📁 $file_count fichiers PNG trouvés${NC}"
echo ""

# Fonction pour uploader un fichier
upload_file() {
  local file_path=$1
  local file_name=$(basename "$file_path")

  echo -n "Uploading $file_name... "

  response=$(curl -s -w "\n%{http_code}" -X POST \
    "https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/${BUCKET_NAME}/${file_name}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: image/png" \
    --data-binary "@${file_path}")

  http_code=$(echo "$response" | tail -n1)

  if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗ (HTTP $http_code)${NC}"
    return 1
  fi
}

# Uploader tous les fichiers PNG
success_count=0
error_count=0

for file in "$LOGOS_DIR"/*.png; do
  if [ -f "$file" ]; then
    if upload_file "$file"; then
      ((success_count++))
    else
      ((error_count++))
    fi
  fi
done

echo ""
echo "========================================="
echo -e "${GREEN}✅ Upload terminé:${NC}"
echo "   - $success_count fichiers uploadés avec succès"
if [ "$error_count" -gt 0 ]; then
  echo -e "   - ${RED}$error_count erreurs${NC}"
fi
echo "========================================="
