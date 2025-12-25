# 🚀 Configuration GitHub Actions - MCP Server

## 📋 Vue d'ensemble

Ce guide explique comment configurer le déploiement automatique du MCP Server sur votre VPS via GitHub Actions.

**Une fois configuré**, chaque push sur `main` ou `recette` déploiera automatiquement le MCP Server! ✨

## 🎯 Avantages du déploiement automatique

✅ **Zéro friction**: Push sur GitHub → Déploiement automatique
✅ **Traçabilité**: Chaque déploiement est loggé
✅ **Rollback facile**: Revert un commit = rollback automatique
✅ **Pas d'erreur manuelle**: Pas de `./deploy.sh` à oublier
✅ **CI/CD complet**: Build, test, et déploiement en une étape

## 🔐 Secrets GitHub à configurer

Le workflow GitHub Actions utilise les **mêmes secrets** que votre application web actuelle. Si vous avez déjà déployé votre application web via GitHub Actions, **vous n'avez rien à configurer!**

### Vérifier les secrets existants

Allez sur GitHub:
1. Votre repo → **Settings**
2. **Secrets and variables** → **Actions**
3. Vérifiez que vous avez:

| Secret | Description | Exemple |
|--------|-------------|---------|
| `SSH_KEY` | Clé privée SSH pour se connecter au VPS | Contenu de `~/.ssh/id_rsa` |
| `SSH_USER` | Utilisateur SSH sur le VPS | `laurent` |
| `SSH_HOST` | Adresse du VPS | `vps.coutellec.fr` ou `123.45.67.89` |
| `SSH_PORT` | Port SSH (optionnel, défaut: 22) | `22` ou `2222` |
| `VITE_SUPABASE_URL` | URL Supabase | `https://odfijihyepuxjzeueiri.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

### ✅ Aucun secret à ajouter

Tous les secrets nécessaires sont **déjà configurés** pour votre application web!

Le MCP Server utilisera `VITE_SUPABASE_ANON_KEY` avec les Row Level Security (RLS) que vous avez configurés dans Supabase.

### 🆕 Créer les secrets (première fois)

Si vous configurez pour la première fois, suivez ce guide:

#### 1. Clé SSH

```bash
# Sur votre machine locale
cat ~/.ssh/id_rsa
# Copiez TOUT le contenu (de -----BEGIN à -----END-----)
```

Sur GitHub:
- **New repository secret**
- Name: `SSH_KEY`
- Value: Collez le contenu de la clé
- **Add secret**

#### 2. Informations VPS

```bash
# Utilisateur SSH
SSH_USER: laurent  # (exemple)

# Host du VPS
SSH_HOST: vps.coutellec.fr  # ou 123.45.67.89

# Port SSH (si différent de 22)
SSH_PORT: 22  # optionnel
```

#### 3. Supabase

```bash
# URL Supabase
VITE_SUPABASE_URL: https://odfijihyepuxjzeueiri.supabase.co

# Clé ANON (trouvée dans Supabase Dashboard > Settings > API)
VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

## 📁 Structure du workflow

Le fichier `.github/workflows/deploy-mcp-server.yml` contient le workflow.

### Déclenchement

Le déploiement se lance automatiquement quand:
1. ✅ Vous faites un push sur `main` ou `recette`
2. ✅ Un fichier dans `mcp-server-veec/` a changé
3. ✅ Le workflow lui-même a changé

**Optimisation**: Si vous modifiez uniquement le frontend (pas le MCP Server), le workflow ne se lance pas. Économie de temps et de ressources!

### Étapes du déploiement

```
1. 📥 Checkout du code
2. 🔧 Setup Node.js 20
3. 📦 Installation des dépendances
4. 🏗️  Build du MCP Server (TypeScript → JavaScript)
5. 📦 Création d'une archive (.tar.gz)
6. 🔑 Configuration SSH
7. 📤 Upload de l'archive vers le VPS
8. 🚀 Déploiement sur le VPS:
   - Extraction de l'archive
   - Installation des dépendances (production)
   - Configuration .env (si première fois)
   - Installation PM2 (si nécessaire)
   - Redémarrage du serveur MCP
   - Vérification que le serveur tourne
9. ✅ Vérification du déploiement
10. 📝 Enregistrement de la date de déploiement
```

## 🎬 Utilisation

### Déploiement automatique

```bash
# Modifiez le code du MCP Server
cd mcp-server-veec/src
nano index.ts

# Commitez et pushez
git add .
git commit -m "feat: amélioration du MCP Server"
git push origin main

# 🎉 Le déploiement se lance automatiquement!
```

### Suivre le déploiement

1. Allez sur GitHub → Votre repo
2. Cliquez sur **Actions**
3. Vous verrez le workflow "Deploy MCP Server to VPS" en cours
4. Cliquez dessus pour voir les logs en temps réel

### Vérifier le déploiement

Une fois le workflow terminé:

```bash
# SSH vers le VPS
ssh laurent@vps.coutellec.fr

# Vérifier le statut PM2
pm2 status mcp-server

# Voir les logs
pm2 logs mcp-server --lines 20

# Tester le serveur
cd ~/mcp-server-veec
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | node dist/index.js
```

## 🔍 Débogage

### Le workflow échoue

**1. Vérifiez les logs GitHub Actions**
- GitHub → Actions → Cliquez sur le workflow qui a échoué
- Regardez quelle étape a échoué (croix rouge ❌)

**2. Erreurs SSH communes**

```
❌ Permission denied (publickey)
```
→ Vérifiez que `SSH_KEY` contient bien votre clé privée complète

```
❌ Could not resolve hostname
```
→ Vérifiez `SSH_HOST` (doit être l'IP ou le domaine du VPS)

```
❌ Connection refused
```
→ Vérifiez `SSH_PORT` et que SSH est bien activé sur le VPS

**3. Erreurs de build**

```
❌ npm ERR! Build failed
```
→ Testez le build localement:
```bash
cd mcp-server-veec
npm install
npm run build
```

**4. Erreurs PM2**

```
❌ PM2: Process not found
```
→ PM2 n'est peut-être pas installé. Le workflow l'installe automatiquement, mais vérifiez les logs.

### Le serveur ne démarre pas

**Vérifier les logs sur le VPS:**

```bash
ssh laurent@vps.coutellec.fr
pm2 logs mcp-server --lines 100
```

**Erreurs Supabase communes:**

```
❌ supabaseUrl is required
```
→ Le fichier `.env` n'est pas correctement configuré

```bash
# Sur le VPS
cat ~/mcp-server-veec/.env
# Vérifiez que SUPABASE_URL et SUPABASE_KEY sont bien remplis
```

## 📊 Fichiers de déploiement

### LAST_DEPLOY_MCP_PROD.md

Après chaque déploiement réussi sur `main`, un fichier `.github/workflows/LAST_DEPLOY_MCP_PROD.md` est créé avec la date du dernier déploiement.

```markdown
## Dernier déploiement MCP Server (Production)

2025-12-25 18:45:32 UTC
```

### LAST_DEPLOY_MCP_RECETTE.md

Idem pour les déploiements sur `recette`.

## 🔄 Workflows multiples

Vous avez maintenant **3 workflows** de déploiement:

1. **deploy.yml** - Application web (Production)
2. **deploy-recette.yml** - Application web (Recette)
3. **deploy-mcp-server.yml** - MCP Server (Production + Recette)

### Déploiements indépendants

- Modifier le **frontend** → Déploie uniquement l'application web
- Modifier le **MCP Server** → Déploie uniquement le MCP Server
- Modifier les **deux** → Les deux se déploient en parallèle

**Avantage**: Pas de déploiement inutile, économie de temps!

## 🎯 Workflow détaillé

### Étape 1: Build local (sur GitHub Actions)

```yaml
- name: Build MCP Server
  working-directory: mcp-server-veec
  run: npm run build
```

Le code TypeScript est compilé en JavaScript dans le dossier `dist/`.

### Étape 2: Création de l'archive

```yaml
- name: Create deployment archive
  run: |
    tar -czf mcp-server-deploy.tar.gz \
      dist/ \
      package.json \
      package-lock.json \
      .env.example
```

Une archive compressée contenant uniquement les fichiers nécessaires.

### Étape 3: Upload vers le VPS

```yaml
- name: Upload archive to VPS
  run: |
    scp -i key.pem -P ${SSH_PORT:-22} \
      mcp-server-deploy.tar.gz \
      ${{ env.SSH_USER }}@${{ env.SSH_HOST }}:~/
```

Transfert sécurisé via SCP (SSH).

### Étape 4: Déploiement sur le VPS

```bash
# Extraction
tar -xzf ~/mcp-server-deploy.tar.gz

# Création du .env (première fois uniquement)
if [ ! -f .env ]; then
  echo 'SUPABASE_URL=...' >> .env
  echo 'SUPABASE_KEY=...' >> .env
fi

# Installation des dépendances
npm install --production

# Redémarrage avec PM2
pm2 delete mcp-server || true
pm2 start dist/index.js --name mcp-server
pm2 save
```

### Étape 5: Vérification

```bash
# Attendre 2 secondes
sleep 2

# Vérifier que le processus tourne
if pm2 list | grep -q 'mcp-server.*online'; then
  echo '✅ MCP Server is running'
else
  echo '❌ Failed to start'
  exit 1
fi
```

Si le serveur ne démarre pas, le workflow échoue et vous êtes notifié.

## 🚨 Rollback

### En cas de problème après déploiement

**Option 1: Revert le commit**

```bash
git revert HEAD
git push origin main
# Le déploiement automatique rollback vers la version précédente
```

**Option 2: Rollback manuel sur le VPS**

```bash
ssh laurent@vps.coutellec.fr
cd ~/mcp-server-veec
git log  # Trouver le commit précédent
git checkout <commit-hash>
npm install --production
pm2 restart mcp-server
```

## 📈 Monitoring

### Notifications GitHub

Activez les notifications pour être alerté en cas d'échec:

1. GitHub → Settings (votre profil) → Notifications
2. **Actions** → ✅ Enable notifications

Vous recevrez un email si un déploiement échoue.

### Monitoring PM2

Sur le VPS, PM2 peut envoyer des alertes:

```bash
# Installer PM2 Plus (monitoring gratuit)
pm2 install pm2-logrotate

# Configurer les logs
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## ✅ Checklist de configuration

- [ ] Secrets GitHub configurés (SSH_KEY, SSH_USER, SSH_HOST, etc.)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ajouté aux secrets
- [ ] Workflow `.github/workflows/deploy-mcp-server.yml` présent
- [ ] Premier push sur `main` ou `recette`
- [ ] Workflow exécuté avec succès ✅
- [ ] Vérification sur le VPS: `pm2 status mcp-server`
- [ ] Test du serveur MCP depuis Claude Desktop

## 🎉 Résultat final

Une fois configuré, vous aurez:

✅ **Déploiement automatique** à chaque push
✅ **Build et tests** automatiques
✅ **Zéro configuration manuelle**
✅ **Logs et traçabilité** complets
✅ **Rollback facile** en cas de problème
✅ **Notifications** en cas d'échec

**Workflow typique:**

```bash
# 1. Modifier le code
vim mcp-server-veec/src/index.ts

# 2. Commiter et pusher
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# 3. ☕ Prendre un café pendant que GitHub déploie

# 4. ✅ C'est prêt! Le MCP Server tourne avec la nouvelle version
```

---

**Besoin d'aide?** Consultez les logs GitHub Actions ou les logs PM2 sur le VPS.
