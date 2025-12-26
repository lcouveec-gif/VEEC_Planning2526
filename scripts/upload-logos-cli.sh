#!/bin/bash

# ========================================
# Upload des logos via Supabase CLI
# ========================================
# Prérequis: npm install -g supabase

LOGOS_DIR="./logos"
BUCKET_NAME="club-logos"

echo "========================================="
echo "Upload des logos via Supabase CLI"
echo "========================================="
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

# Vérifier que le dossier existe
if [ ! -d "$LOGOS_DIR" ]; then
  echo "❌ Le dossier $LOGOS_DIR n'existe pas"
  exit 1
fi

# Se connecter (si pas déjà fait)
echo "🔐 Connexion à Supabase..."
supabase login

# Lier le projet (si pas déjà fait)
echo "🔗 Liaison du projet..."
supabase link --project-ref [VOTRE-REF-PROJET]

# Uploader tous les fichiers
echo ""
echo "📤 Upload des logos..."
echo ""

success_count=0
error_count=0

for file in "$LOGOS_DIR"/*.png; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo -n "Uploading $filename... "

    if supabase storage cp "$file" "$BUCKET_NAME/$filename" --upsert 2>/dev/null; then
      echo "✓"
      ((success_count++))
    else
      echo "✗"
      ((error_count++))
    fi
  fi
done

echo ""
echo "========================================="
echo "✅ Upload terminé:"
echo "   - $success_count fichiers uploadés"
if [ "$error_count" -gt 0 ]; then
  echo "   - $error_count erreurs"
fi
echo "========================================="
