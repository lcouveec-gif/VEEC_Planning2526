# 🚀 Guide Rapide - Déploiement VPS en 10 minutes

## Prérequis

- ✅ Un VPS avec Node.js 18+ installé
- ✅ Accès SSH au VPS
- ✅ Votre clé Supabase SERVICE_ROLE

## 📋 Étapes

### 1. Configurer le script de déploiement (2 min)

Éditez `deploy.sh` et modifiez ces lignes:

```bash
VPS_USER="votre-user"           # Ex: laurent, root, ubuntu
VPS_HOST="votre-vps.com"        # Ex: vps.coutellec.fr, 123.45.67.89
VPS_PATH="/home/user/mcp-server-veec"  # Chemin sur le VPS
```

### 2. Tester la connexion SSH (1 min)

```bash
ssh votre-user@votre-vps.com
# Si ça fonctionne, vous êtes connecté ✅
exit
```

### 3. Déployer (2 min)

```bash
cd /Users/Laurent/Documents/GitHub/VEEC_Planning2526/mcp-server-veec
./deploy.sh
```

Le script va:
1. ✅ Build le projet
2. ✅ Créer une archive
3. ✅ L'envoyer sur le VPS
4. ✅ Installer les dépendances
5. ✅ Démarrer le serveur avec PM2

### 4. Configurer les variables d'environnement (1 min)

```bash
ssh votre-user@votre-vps.com
cd ~/mcp-server-veec
nano .env
```

Remplacez `your-service-role-key-here` par votre vraie clé Supabase SERVICE_ROLE.

```env
SUPABASE_URL=https://odfijihyepuxjzeueiri.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Sauvegardez: `Ctrl+X`, puis `Y`, puis `Entrée`

Redémarrez le serveur:
```bash
pm2 restart mcp-server
exit
```

### 5. Configurer Claude Desktop (2 min)

Éditez `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "veec-local": {
      "command": "node",
      "args": [
        "/Users/Laurent/Documents/GitHub/VEEC_Planning2526/mcp-server-veec/dist/index.js"
      ],
      "env": {
        "SUPABASE_URL": "https://odfijihyepuxjzeueiri.supabase.co",
        "SUPABASE_KEY": "VOTRE_CLE_SERVICE_ROLE"
      }
    },
    "veec-remote": {
      "command": "ssh",
      "args": [
        "votre-user@votre-vps.com",
        "cd /home/votre-user/mcp-server-veec && node dist/index.js"
      ]
    }
  }
}
```

### 6. Tester (2 min)

1. Redémarrez Claude Desktop
2. Posez la question: **"Quels sont les joueurs de l'équipe SM4 ?"**
3. Si vous voyez les 13 joueurs → ✅ **Ça fonctionne!**

## 🔧 Configuration SSH avancée (optionnel)

Pour éviter de taper le mot de passe à chaque fois, configurez les clés SSH:

### Créer une clé SSH

```bash
ssh-keygen -t ed25519 -C "mcp-server"
# Appuyez sur Entrée 3 fois (pas de passphrase pour simplifier)
```

### Copier la clé sur le VPS

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub votre-user@votre-vps.com
```

### Créer un alias SSH

Éditez `~/.ssh/config`:

```
Host mcp-vps
    HostName votre-vps.com
    User votre-user
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Maintenant vous pouvez vous connecter avec:
```bash
ssh mcp-vps
```

Et dans Claude Desktop:
```json
{
  "mcpServers": {
    "veec-remote": {
      "command": "ssh",
      "args": [
        "mcp-vps",
        "cd ~/mcp-server-veec && node dist/index.js"
      ]
    }
  }
}
```

## 📊 Commandes utiles

### Voir les logs
```bash
ssh votre-user@votre-vps.com "pm2 logs mcp-server"
```

### Redémarrer le serveur
```bash
ssh votre-user@votre-vps.com "pm2 restart mcp-server"
```

### Voir le statut
```bash
ssh votre-user@votre-vps.com "pm2 status"
```

### Mettre à jour le serveur
```bash
cd /Users/Laurent/Documents/GitHub/VEEC_Planning2526/mcp-server-veec
./deploy.sh
```

## ❓ Dépannage

### "Permission denied" lors du déploiement

Vérifiez que vous avez les bonnes permissions SSH:
```bash
ssh votre-user@votre-vps.com "ls -la ~"
```

### "PM2 not found"

Installez PM2 sur le VPS:
```bash
ssh votre-user@votre-vps.com
npm install -g pm2
exit
```

### Claude Desktop ne se connecte pas

Vérifiez les logs:
```bash
# Logs Claude Desktop (macOS)
tail -f ~/Library/Logs/Claude/mcp*.log

# Logs du serveur MCP
ssh votre-user@votre-vps.com "pm2 logs mcp-server --lines 50"
```

### Test de connexion SSH

```bash
# Test simple
ssh votre-user@votre-vps.com "echo 'Test OK'"

# Test du serveur MCP
ssh votre-user@votre-vps.com "cd ~/mcp-server-veec && node dist/index.js" << EOF
{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}
EOF
```

## 🎯 Avantages du déploiement VPS

### ✅ Disponibilité 24/7
Le serveur MCP est toujours disponible sur le VPS, même quand votre Mac est éteint.

### ✅ Accès depuis n'importe où
Vous pouvez utiliser le MCP depuis:
- Votre Mac au bureau
- Votre Mac à la maison
- Un autre ordinateur (si vous configurez SSH)

### ✅ Performances stables
Le VPS a une connexion internet stable et rapide vers Supabase.

### ✅ Sécurité
Les clés Supabase restent sur le VPS, jamais exposées localement.

## 📝 Checklist finale

- [ ] Script deploy.sh configuré avec vos infos VPS
- [ ] Connexion SSH testée et fonctionnelle
- [ ] Déploiement réussi (./deploy.sh)
- [ ] Variables .env configurées sur le VPS
- [ ] PM2 installé et serveur démarré
- [ ] Claude Desktop configuré avec veec-remote
- [ ] Test réussi: "Quels sont les joueurs de l'équipe SM4 ?"
- [ ] Clés SSH configurées (optionnel)
- [ ] Alias SSH créé (optionnel)

## 🎉 Vous êtes prêt !

Votre serveur MCP VEEC est maintenant déployé sur votre VPS et accessible depuis Claude Desktop via SSH.

**Prochaine étape**: Utilisez Claude avec votre serveur MCP distant pour gérer vos équipes, matchs et joueurs !

---

**Besoin d'aide ?** Consultez [DEPLOYMENT_VPS.md](DEPLOYMENT_VPS.md) pour la documentation complète.
