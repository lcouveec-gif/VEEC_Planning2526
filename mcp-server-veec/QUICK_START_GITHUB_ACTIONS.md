# ⚡ Démarrage Rapide - GitHub Actions (5 min)

## 🎯 Objectif

Configurer le déploiement automatique du MCP Server en 5 minutes.

**Après configuration**: Chaque push sur `main` → Déploiement automatique sur le VPS! 🚀

## ✅ Prérequis

Vous devez avoir:
- ✅ Un VPS avec accès SSH
- ✅ Node.js installé sur le VPS
- ✅ Un compte GitHub (avec ce repo)
- ✅ Les credentials Supabase

## 🚀 Configuration en 3 étapes

### Étape 1: Vérifier les secrets GitHub (2 min)

Les secrets sont **déjà configurés** pour votre application web. Il suffit d'en ajouter un nouveau.

**1. Aller sur GitHub**
```
Votre repo → Settings → Secrets and variables → Actions
```

**2. Vérifier que ces secrets existent**
- ✅ `SSH_KEY` - Clé privée SSH
- ✅ `SSH_USER` - Utilisateur VPS (ex: `laurent`)
- ✅ `SSH_HOST` - Adresse VPS (ex: `vps.coutellec.fr`)
- ✅ `SSH_PORT` - Port SSH (optionnel, défaut: 22)
- ✅ `VITE_SUPABASE_URL` - URL Supabase
- ✅ `VITE_SUPABASE_ANON_KEY` - Clé anonyme Supabase

**3. Vérification**

Tous les secrets nécessaires sont **déjà configurés** pour votre application web! ✅

Rien à ajouter, passez directement à l'étape 2.

### Étape 2: Premier déploiement (2 min)

Le fichier `.github/workflows/deploy-mcp-server.yml` est déjà créé! ✅

Vérifiez qu'il existe:
```bash
ls -la .github/workflows/deploy-mcp-server.yml
```

Si oui → C'est prêt!

**1. Commitez et pushez**

```bash
git add .
git commit -m "feat: setup automatic deployment for MCP Server"
git push origin main
```

**2. Suivez le déploiement**

```
GitHub → Onglet "Actions" → Cliquez sur "Deploy MCP Server to VPS"
```

Vous verrez le déploiement en temps réel! ⏳

**3. Vérifiez sur le VPS**

```bash
ssh votre-user@votre-vps.com
pm2 status mcp-server
pm2 logs mcp-server
```

Si vous voyez `online` → ✅ **C'est bon!**

## 🎉 C'est terminé!

Maintenant, à chaque push sur `main` ou `recette` qui modifie le MCP Server:

```bash
# Modifier le code
vim mcp-server-veec/src/index.ts

# Commiter et pusher
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# 🎉 Déploiement automatique!
```

## 📊 Workflow de déploiement

```
┌─────────────────┐
│   git push      │
│   origin main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │
│   - Build       │
│   - Archive     │
│   - Upload      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      VPS        │
│   - Extract     │
│   - Install     │
│   - PM2 Restart │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ✅ MCP Running  │
└─────────────────┘
```

## 🔍 Vérification

### Test depuis Claude Desktop

**1. Configurez Claude Desktop** (si pas encore fait)

Éditez `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "veec-remote": {
      "command": "ssh",
      "args": [
        "votre-user@votre-vps.com",
        "cd ~/mcp-server-veec && node dist/index.js"
      ]
    }
  }
}
```

**2. Redémarrez Claude Desktop**

**3. Testez**

> "Quels sont les joueurs de l'équipe SM4 ?"

Si vous voyez les 13 joueurs → ✅ **Tout fonctionne!**

## 🐛 Dépannage rapide

### Le workflow échoue

**1. Vérifiez les logs**
```
GitHub → Actions → Cliquez sur le workflow rouge
```

**2. Erreurs communes**

| Erreur | Solution |
|--------|----------|
| `Permission denied` | Vérifiez `SSH_KEY` dans les secrets |
| `Could not resolve hostname` | Vérifiez `SSH_HOST` |
| `supabaseUrl is required` | Vérifiez `SUPABASE_SERVICE_ROLE_KEY` |

### Le serveur ne démarre pas

```bash
# Connectez-vous au VPS
ssh votre-user@votre-vps.com

# Vérifiez les logs
pm2 logs mcp-server --lines 100

# Vérifiez le .env
cat ~/mcp-server-veec/.env
```

## 📚 Documentation complète

Pour plus de détails, consultez:
- **[GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)** - Guide complet
- **[DEPLOYMENT_VPS.md](DEPLOYMENT_VPS.md)** - Architecture et sécurité

## ✅ Checklist finale

- [ ] Secrets GitHub vérifiés
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ajouté
- [ ] Premier push effectué
- [ ] Workflow GitHub Actions réussi ✅
- [ ] `pm2 status mcp-server` → `online` ✅
- [ ] Test depuis Claude Desktop réussi ✅

## 🎊 Vous êtes prêt!

Vous avez maintenant:
- ✅ Déploiement automatique du MCP Server
- ✅ Build et tests automatiques
- ✅ Zéro configuration manuelle
- ✅ Traçabilité complète via GitHub

**Prochaine étape**: Développez de nouvelles fonctionnalités et pushez! Le déploiement se fera automatiquement. 🚀

---

**Temps total**: 5 minutes ⏱️
**Niveau de difficulté**: Facile ⭐
**Maintenance**: Zéro, tout est automatique! 🎉
