#!/bin/bash
# Script de déploiement automatique du MCP Server VEEC sur VPS

set -e  # Arrêter en cas d'erreur

# Configuration
VPS_USER="user"
VPS_HOST="votre-vps.com"
VPS_PATH="/home/user/mcp-server-veec"
ARCHIVE_NAME="mcp-server-veec.tar.gz"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement du MCP Server VEEC${NC}\n"

# Étape 1: Build
echo -e "${BLUE}📦 Étape 1/5: Build du projet...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build réussi${NC}\n"
else
    echo -e "${RED}❌ Erreur lors du build${NC}"
    exit 1
fi

# Étape 2: Création de l'archive
echo -e "${BLUE}📦 Étape 2/5: Création de l'archive...${NC}"
tar -czf $ARCHIVE_NAME dist package.json package-lock.json .env.example
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archive créée: $ARCHIVE_NAME${NC}\n"
else
    echo -e "${RED}❌ Erreur lors de la création de l'archive${NC}"
    exit 1
fi

# Étape 3: Upload vers le VPS
echo -e "${BLUE}📤 Étape 3/5: Upload vers le VPS...${NC}"
scp $ARCHIVE_NAME $VPS_USER@$VPS_HOST:/home/$VPS_USER/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Upload réussi${NC}\n"
else
    echo -e "${RED}❌ Erreur lors de l'upload${NC}"
    exit 1
fi

# Étape 4: Déploiement sur le VPS
echo -e "${BLUE}🔧 Étape 4/5: Déploiement sur le VPS...${NC}"
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e

    # Créer le répertoire s'il n'existe pas
    mkdir -p ~/mcp-server-veec
    cd ~/mcp-server-veec

    # Extraire l'archive
    echo "📂 Extraction de l'archive..."
    tar -xzf ~/mcp-server-veec.tar.gz

    # Installer les dépendances en production
    echo "📦 Installation des dépendances..."
    npm install --production --silent

    # Vérifier si .env existe, sinon créer à partir de .env.example
    if [ ! -f .env ]; then
        echo "⚠️  Fichier .env manquant, création depuis .env.example..."
        cp .env.example .env
        echo "⚠️  N'oubliez pas de configurer les variables dans .env !"
    fi

    # Redémarrer avec PM2 si installé
    if command -v pm2 &> /dev/null; then
        echo "🔄 Redémarrage avec PM2..."
        pm2 delete mcp-server 2>/dev/null || true
        pm2 start dist/index.js --name mcp-server
        pm2 save
        echo "✅ MCP Server démarré avec PM2"
    else
        echo "⚠️  PM2 non installé. Le serveur ne sera pas démarré automatiquement."
        echo "   Pour installer PM2: npm install -g pm2"
    fi

    # Nettoyage
    rm ~/mcp-server-veec.tar.gz

    echo "✅ Déploiement terminé"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Déploiement sur le VPS réussi${NC}\n"
else
    echo -e "${RED}❌ Erreur lors du déploiement${NC}"
    exit 1
fi

# Étape 5: Nettoyage local
echo -e "${BLUE}🧹 Étape 5/5: Nettoyage...${NC}"
rm $ARCHIVE_NAME
echo -e "${GREEN}✅ Nettoyage terminé${NC}\n"

# Résumé
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Déploiement terminé avec succès !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}📋 Prochaines étapes:${NC}"
echo -e "1. Vérifier les logs: ${GREEN}ssh $VPS_USER@$VPS_HOST 'pm2 logs mcp-server'${NC}"
echo -e "2. Tester depuis Claude Desktop"
echo -e "3. Vérifier le statut: ${GREEN}ssh $VPS_USER@$VPS_HOST 'pm2 status'${NC}\n"

echo -e "${BLUE}🔗 Configuration Claude Desktop:${NC}"
cat << 'EOF'
{
  "mcpServers": {
    "veec-remote": {
      "command": "ssh",
      "args": [
        "USER@HOST",
        "cd /home/USER/mcp-server-veec && node dist/index.js"
      ]
    }
  }
}
EOF

echo ""
echo -e "${BLUE}💡 Astuce: Pour configurer les variables d'environnement:${NC}"
echo -e "   ${GREEN}ssh $VPS_USER@$VPS_HOST 'nano ~/mcp-server-veec/.env'${NC}\n"
