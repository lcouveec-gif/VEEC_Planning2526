# 📋 Résumé - Déploiement MCP Server sur VPS

## 🎯 Objectif

Rendre votre serveur MCP VEEC accessible via internet depuis n'importe quel client MCP (Claude Desktop, etc.), même quand votre ordinateur local est éteint.

## 🏗️ Solution recommandée: MCP via SSH

Le protocole MCP fonctionne nativement via SSH. C'est la solution **la plus simple et la plus sécurisée**.

### Comment ça fonctionne ?

```
┌─────────────────┐
│ Claude Desktop  │  ← Votre ordinateur (Mac, PC, etc.)
│   (Local)       │
└────────┬────────┘
         │
         │ Connexion SSH sécurisée
         │ (automatique, transparente)
         │
         ▼
┌─────────────────┐
│      VPS        │  ← Votre serveur distant
│  MCP Server     │
│   (Node.js)     │
└────────┬────────┘
         │
         │ HTTPS
         │
         ▼
┌─────────────────┐
│   Supabase      │  ← Base de données cloud
└─────────────────┘
```

### Avantages

✅ **Simple**: Utilise SSH standard, pas de serveur web à configurer
✅ **Sécurisé**: Chiffrement SSH natif
✅ **Léger**: Pas de surcharge HTTP
✅ **Protocole standard**: Compatible avec tous les clients MCP
✅ **Démarrage à la demande**: Le serveur ne tourne que quand nécessaire

## 📚 Documentation disponible

### 1. [QUICK_START_VPS.md](QUICK_START_VPS.md) - Guide rapide (10 min)
**Pour commencer rapidement**

- Configuration en 6 étapes
- Temps estimé: 10 minutes
- Tout est expliqué pas à pas

### 2. [DEPLOYMENT_VPS.md](DEPLOYMENT_VPS.md) - Guide complet
**Pour tout comprendre**

- Architecture détaillée
- Deux options de déploiement (SSH et HTTP)
- Sécurité, monitoring, maintenance
- FAQ et dépannage

### 3. [deploy.sh](deploy.sh) - Script de déploiement automatique
**Pour déployer en une commande**

```bash
./deploy.sh
```

Fait automatiquement:
1. Build du projet
2. Création de l'archive
3. Upload vers le VPS
4. Installation des dépendances
5. Démarrage avec PM2

## 🚀 Démarrage rapide

### Étape 1: Configurer le script

Éditez `deploy.sh`:
```bash
VPS_USER="laurent"              # Votre user SSH
VPS_HOST="vps.coutellec.fr"     # Votre VPS
```

### Étape 2: Déployer

```bash
./deploy.sh
```

### Étape 3: Configurer les variables

```bash
ssh laurent@vps.coutellec.fr
cd ~/mcp-server-veec
nano .env
# Remplacez la clé Supabase
# Ctrl+X, Y, Entrée pour sauvegarder
pm2 restart mcp-server
exit
```

### Étape 4: Configurer Claude Desktop

Éditez `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "veec-remote": {
      "command": "ssh",
      "args": [
        "laurent@vps.coutellec.fr",
        "cd ~/mcp-server-veec && node dist/index.js"
      ]
    }
  }
}
```

### Étape 5: Tester

Redémarrez Claude Desktop et demandez:
> "Quels sont les joueurs de l'équipe SM4 ?"

Si vous voyez les 13 joueurs → ✅ **C'est bon!**

## 🔧 Configuration avancée (optionnel)

### Créer un alias SSH

Éditez `~/.ssh/config`:

```
Host mcp-vps
    HostName vps.coutellec.fr
    User laurent
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Puis dans Claude Desktop:

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

### Déployer une mise à jour
```bash
./deploy.sh
```

### Voir les logs
```bash
ssh laurent@vps.coutellec.fr "pm2 logs mcp-server"
```

### Redémarrer le serveur
```bash
ssh laurent@vps.coutellec.fr "pm2 restart mcp-server"
```

### Voir le statut
```bash
ssh laurent@vps.coutellec.fr "pm2 status"
```

## 🔐 Sécurité

### Clés SSH (recommandé)

Au lieu de taper un mot de passe à chaque fois:

```bash
# Créer une clé SSH
ssh-keygen -t ed25519 -C "mcp-server"

# Copier la clé sur le VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub laurent@vps.coutellec.fr

# Tester
ssh laurent@vps.coutellec.fr
# Devrait se connecter sans mot de passe ✅
```

### Variables d'environnement

Sur le VPS, utilisez la clé **SERVICE_ROLE** de Supabase (pas ANON):

```env
SUPABASE_URL=https://odfijihyepuxjzeueiri.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # SERVICE_ROLE
```

Trouvez-la dans: Supabase Dashboard > Settings > API > `service_role` key

## ❓ Questions fréquentes

### Le serveur doit-il tourner en continu ?

**Non**. Avec SSH, le serveur MCP est démarré **automatiquement** quand Claude Desktop se connecte, puis s'arrête quand vous fermez Claude.

### Ça coûte combien ?

- VPS: ~5-10€/mois (vous avez déjà un VPS)
- Serveur MCP: Gratuit (utilise Node.js déjà installé)
- Supabase: Gratuit (plan free jusqu'à 500MB)

**Total: 0€ de plus** si vous avez déjà un VPS

### C'est sécurisé ?

Oui, très sécurisé:
- ✅ Connexion SSH chiffrée
- ✅ Clés SSH (pas de mot de passe)
- ✅ Clé Supabase jamais exposée localement
- ✅ Pas de port ouvert (sauf SSH:22)

### Quelle est la latence ?

Généralement < 100ms pour la connexion SSH. La latence vient principalement de Supabase (~100-200ms).

**Total: ~200-300ms** pour une requête complète, ce qui est imperceptible.

### Puis-je utiliser les deux (local + distant) ?

**Oui!** Vous pouvez configurer:
- `veec-local`: Pour le développement (rapide, pas besoin d'internet)
- `veec-remote`: Pour la production (toujours disponible)

```json
{
  "mcpServers": {
    "veec-local": {
      "command": "node",
      "args": ["/chemin/local/dist/index.js"],
      "env": { ... }
    },
    "veec-remote": {
      "command": "ssh",
      "args": ["mcp-vps", "cd ~/mcp-server-veec && node dist/index.js"]
    }
  }
}
```

### Et si mon VPS redémarre ?

Avec PM2, le serveur MCP redémarre automatiquement:

```bash
# Sur le VPS, une seule fois:
pm2 startup
pm2 save
```

## 🎯 Prochaines étapes

1. ✅ Lire [QUICK_START_VPS.md](QUICK_START_VPS.md)
2. ✅ Configurer et lancer `./deploy.sh`
3. ✅ Configurer Claude Desktop
4. ✅ Tester avec "Quels sont les joueurs de l'équipe SM4 ?"
5. ✅ (Optionnel) Configurer les clés SSH

## 📞 Support

### Logs à vérifier en cas de problème

**Logs SSH:**
```bash
tail -f /var/log/auth.log  # Sur le VPS
```

**Logs MCP:**
```bash
ssh laurent@vps.coutellec.fr "pm2 logs mcp-server --lines 50"
```

**Logs Claude Desktop:**
```bash
tail -f ~/Library/Logs/Claude/mcp*.log  # macOS
```

### Test de connexion

```bash
# Test SSH
ssh laurent@vps.coutellec.fr "echo 'Test OK'"

# Test MCP Server
ssh laurent@vps.coutellec.fr "cd ~/mcp-server-veec && node dist/index.js" << EOF
{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}
EOF
```

---

## ✅ Checklist complète

- [ ] VPS accessible via SSH
- [ ] Node.js 18+ installé sur le VPS
- [ ] Script `deploy.sh` configuré
- [ ] Déploiement réussi (`./deploy.sh`)
- [ ] Variables `.env` configurées sur le VPS
- [ ] PM2 installé et serveur démarré
- [ ] Claude Desktop configuré avec `veec-remote`
- [ ] Test réussi: "Quels sont les joueurs de l'équipe SM4 ?"
- [ ] (Optionnel) Clés SSH configurées
- [ ] (Optionnel) Alias SSH créé

## 🎉 Résultat final

Une fois tout configuré, vous pourrez:

✅ Utiliser le MCP Server depuis n'importe où
✅ Même quand votre Mac est éteint
✅ Avec une sécurité renforcée
✅ Déployer les mises à jour en une commande
✅ Monitorer les performances en temps réel

**Prêt à déployer ?** Suivez [QUICK_START_VPS.md](QUICK_START_VPS.md) !
