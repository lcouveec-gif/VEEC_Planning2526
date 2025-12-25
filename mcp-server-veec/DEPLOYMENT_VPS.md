# 🚀 Déploiement MCP Server sur VPS

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Prérequis](#prérequis)
4. [Option 1: MCP via SSH (Recommandé)](#option-1-mcp-via-ssh-recommandé)
5. [Option 2: MCP via HTTP/SSE](#option-2-mcp-via-httpsse)
6. [Configuration Claude Desktop](#configuration-claude-desktop)
7. [Sécurité](#sécurité)
8. [Maintenance](#maintenance)

## 🎯 Vue d'ensemble

Actuellement, votre serveur MCP fonctionne **en local** sur votre machine. Pour le rendre accessible via internet depuis n'importe quel client MCP, nous avons deux options:

### Option 1: MCP via SSH (Recommandé) ✅
- Le serveur MCP tourne sur le VPS
- Claude Desktop s'y connecte via SSH
- **Avantages**: Sécurisé (SSH natif), simple, protocole MCP standard
- **Inconvénient**: Nécessite accès SSH depuis le client

### Option 2: MCP via HTTP/SSE
- Serveur HTTP qui expose le MCP via SSE (Server-Sent Events)
- **Avantages**: Accessible via HTTP, peut être mis derrière reverse proxy
- **Inconvénient**: Plus complexe, nécessite développement supplémentaire

## 🏗️ Architecture

### Architecture actuelle (Local)
```
┌─────────────────┐
│ Claude Desktop  │
│   (Local)       │
└────────┬────────┘
         │ stdio
         ▼
┌─────────────────┐
│   MCP Server    │
│   (Local Node)  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│    Supabase     │
│   (Cloud DB)    │
└─────────────────┘
```

### Architecture cible (VPS via SSH)
```
┌─────────────────┐
│ Claude Desktop  │
│   (Local)       │
└────────┬────────┘
         │ SSH
         ▼
┌─────────────────┐
│      VPS        │
│  MCP Server     │
│  (Node.js)      │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│    Supabase     │
│   (Cloud DB)    │
└─────────────────┘
```

## 📦 Prérequis

### Sur votre VPS
- ✅ Node.js v18+ installé
- ✅ Accès SSH configuré
- ✅ Git installé (pour déployer le code)
- ✅ PM2 ou systemd (pour gérer le processus)

### Sur votre machine locale
- ✅ Claude Desktop installé
- ✅ Clé SSH pour accéder au VPS
- ✅ Configuration SSH (~/.ssh/config)

## 🔧 Option 1: MCP via SSH (Recommandé)

### Étape 1: Déployer le code sur le VPS

```bash
# Sur votre machine locale
# 1. Préparer le code pour le déploiement
cd /Users/Laurent/Documents/GitHub/VEEC_Planning2526/mcp-server-veec
npm run build

# 2. Créer une archive
tar -czf mcp-server-veec.tar.gz dist package.json package-lock.json

# 3. Envoyer au VPS (remplacez par votre VPS)
scp mcp-server-veec.tar.gz user@votre-vps.com:/home/user/

# 4. Se connecter au VPS
ssh user@votre-vps.com
```

### Étape 2: Installer sur le VPS

```bash
# Sur le VPS
cd /home/user
mkdir -p mcp-server-veec
cd mcp-server-veec

# Extraire l'archive
tar -xzf ../mcp-server-veec.tar.gz

# Installer les dépendances (production seulement)
npm install --production

# Créer le fichier .env
cat > .env << EOF
SUPABASE_URL=https://odfijihyepuxjzeueiri.supabase.co
SUPABASE_KEY=VOTRE_CLE_SERVICE_ROLE_ICI
EOF

# Tester le serveur
node dist/index.js
```

### Étape 3: Configurer Claude Desktop (SSH)

Sur votre machine locale, éditez `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "veec-remote": {
      "command": "ssh",
      "args": [
        "user@votre-vps.com",
        "cd /home/user/mcp-server-veec && node dist/index.js"
      ]
    }
  }
}
```

### Étape 4: Configuration SSH optimale

Créez/éditez `~/.ssh/config`:

```
Host veec-mcp
    HostName votre-vps.com
    User user
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 600
```

Puis dans Claude Desktop:

```json
{
  "mcpServers": {
    "veec-remote": {
      "command": "ssh",
      "args": [
        "veec-mcp",
        "cd /home/user/mcp-server-veec && node dist/index.js"
      ]
    }
  }
}
```

### Étape 5: Tester

1. Redémarrez Claude Desktop
2. Vérifiez que le serveur MCP distant est connecté
3. Testez avec: "Quels sont les joueurs de l'équipe SM4 ?"

## 🌐 Option 2: MCP via HTTP/SSE

Cette option nécessite de créer un wrapper HTTP autour du serveur MCP.

### Architecture

```
┌─────────────────┐
│ Claude Desktop  │
│   (Local)       │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│ Nginx (VPS)     │
│ Reverse Proxy   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Wrapper   │
│  Port 3000      │
└────────┬────────┘
         │ stdio
         ▼
┌─────────────────┐
│   MCP Server    │
│   (Node.js)     │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│    Supabase     │
└─────────────────┘
```

### Créer le wrapper HTTP

Créez `http-wrapper/server.js`:

```javascript
import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Endpoint SSE pour le streaming MCP
app.get('/mcp/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Démarrer le processus MCP
  const mcpProcess = spawn('node', ['../dist/index.js'], {
    cwd: __dirname,
    env: process.env
  });

  // Envoyer les messages du MCP au client
  mcpProcess.stdout.on('data', (data) => {
    res.write(`data: ${data.toString()}\n\n`);
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('MCP Error:', data.toString());
  });

  // Gérer les messages du client vers le MCP
  req.on('close', () => {
    mcpProcess.kill();
  });
});

// Endpoint pour envoyer des messages au MCP
app.post('/mcp/message', async (req, res) => {
  try {
    const { method, params } = req.body;

    // Implémenter la logique de communication avec le MCP
    // (Nécessite un gestionnaire de sessions)

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`MCP HTTP Wrapper running on port ${PORT}`);
});
```

**Note**: Cette option nécessite un développement plus avancé pour gérer correctement le protocole MCP via HTTP. L'**Option 1 (SSH) est fortement recommandée** car elle utilise le protocole standard.

## 🔐 Sécurité

### Pour l'Option SSH

1. **Clés SSH uniquement** (pas de mot de passe)
```bash
# Sur votre machine locale
ssh-keygen -t ed25519 -C "mcp-server"
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@votre-vps.com
```

2. **Désactiver l'authentification par mot de passe**
```bash
# Sur le VPS, éditez /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes

# Redémarrer SSH
sudo systemctl restart sshd
```

3. **Utiliser une clé service role Supabase dédiée**
```bash
# Sur le VPS
# Utilisez la clé SERVICE_ROLE (pas ANON) avec RLS configuré
```

4. **Firewall**
```bash
# Sur le VPS
sudo ufw allow 22/tcp  # SSH uniquement
sudo ufw enable
```

### Pour l'Option HTTP

1. **HTTPS obligatoire** (Let's Encrypt)
2. **Authentification par token** (JWT)
3. **Rate limiting**
4. **CORS configuré correctement**

## 🔄 Maintenance

### Mise à jour du serveur

```bash
# Sur votre machine locale
cd /Users/Laurent/Documents/GitHub/VEEC_Planning2526/mcp-server-veec
npm run build
tar -czf mcp-server-veec.tar.gz dist package.json package-lock.json
scp mcp-server-veec.tar.gz user@votre-vps.com:/home/user/

# Sur le VPS
ssh user@votre-vps.com
cd /home/user/mcp-server-veec
tar -xzf ../mcp-server-veec.tar.gz
# Si PM2 est utilisé:
pm2 restart mcp-server
```

### Script de déploiement automatique

Créez `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🏗️  Building MCP Server..."
npm run build

echo "📦 Creating archive..."
tar -czf mcp-server-veec.tar.gz dist package.json package-lock.json

echo "📤 Uploading to VPS..."
scp mcp-server-veec.tar.gz user@votre-vps.com:/home/user/

echo "🚀 Deploying on VPS..."
ssh user@votre-vps.com << 'EOF'
  cd /home/user/mcp-server-veec
  tar -xzf ../mcp-server-veec.tar.gz
  npm install --production
  pm2 restart mcp-server || pm2 start dist/index.js --name mcp-server
EOF

echo "✅ Deployment complete!"
```

Rendez-le exécutable:
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📊 Monitoring

### Avec PM2 (Recommandé)

```bash
# Sur le VPS
npm install -g pm2

# Démarrer le serveur
pm2 start dist/index.js --name mcp-server

# Voir les logs
pm2 logs mcp-server

# Monitoring
pm2 monit

# Auto-restart au démarrage
pm2 startup
pm2 save
```

### Logs

```bash
# Sur le VPS
# Les logs MCP sont accessibles via:
pm2 logs mcp-server --lines 100

# Ou si pas de PM2:
journalctl -u mcp-server -f
```

## 🧪 Tests

### Test 1: Connexion SSH

```bash
# Tester la connexion SSH
ssh user@votre-vps.com "node /home/user/mcp-server-veec/dist/index.js"

# Devrait afficher le message de démarrage du serveur MCP
```

### Test 2: Depuis Claude Desktop

1. Ouvrir Claude Desktop
2. Vérifier dans les paramètres que "veec-remote" est connecté
3. Tester: "Quels sont les joueurs de l'équipe SM4 ?"

### Test 3: Performance

```bash
# Mesurer la latence SSH
ssh user@votre-vps.com "echo 'test'" | time

# Devrait être < 200ms pour une bonne expérience
```

## ❓ FAQ

### Le serveur MCP doit-il tourner en continu ?

**Non**. Avec l'option SSH, le serveur MCP est démarré **à la demande** quand Claude Desktop se connecte, puis s'arrête automatiquement après utilisation.

### Quelle option choisir ?

**Option 1 (SSH)** si:
- ✅ Vous avez accès SSH au VPS
- ✅ Vous voulez une solution simple et sécurisée
- ✅ Vous utilisez principalement Claude Desktop

**Option 2 (HTTP)** si:
- ✅ Vous voulez exposer le MCP à plusieurs clients
- ✅ Vous voulez un accès web
- ✅ Vous ne pouvez pas utiliser SSH

### Et la performance ?

L'option SSH ajoute une latence minime (généralement < 50ms). Les requêtes Supabase restent le principal facteur de latence (~100-200ms).

### Puis-je utiliser les deux en même temps ?

Oui! Vous pouvez avoir:
- `veec-local`: Serveur MCP local (rapide, pour le dev)
- `veec-remote`: Serveur MCP distant via SSH (production)

## 📝 Checklist de déploiement

- [ ] Node.js installé sur le VPS
- [ ] Code déployé sur le VPS
- [ ] .env configuré avec les bonnes clés
- [ ] SSH configuré avec clés publiques
- [ ] Configuration Claude Desktop mise à jour
- [ ] Test de connexion réussi
- [ ] PM2 configuré (optionnel mais recommandé)
- [ ] Script de déploiement créé
- [ ] Monitoring en place

## 🎉 Prochaines étapes

1. Choisir l'option de déploiement
2. Suivre le guide d'installation
3. Tester la connexion
4. Configurer le monitoring
5. Créer un script de déploiement automatique

---

**Besoin d'aide ?** Consultez les logs:
```bash
# Logs SSH
tail -f /var/log/auth.log

# Logs MCP (si PM2)
pm2 logs mcp-server
```
