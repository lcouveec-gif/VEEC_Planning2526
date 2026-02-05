# 🚀 Options de déploiement - MCP Server VEEC

## 📋 Vue d'ensemble

Vous avez **3 options** pour déployer et utiliser le MCP Server VEEC:

| Option | Où tourne le serveur | Déploiement | Disponibilité | Complexité |
|--------|---------------------|-------------|---------------|------------|
| **1. Local** | Votre Mac | Aucun | Quand votre Mac est allumé | ⭐ Facile |
| **2A. VPS + GitHub Actions** | VPS distant | Automatique (git push) | 24/7 | ⭐⭐ Moyen |
| **2B. VPS + Script manuel** | VPS distant | Manuel (./deploy.sh) | 24/7 | ⭐⭐ Moyen |

## 🎯 Quelle option choisir ?

### Option 1: Local (Développement)

**Idéal pour:**
- ✅ Développement et tests
- ✅ Utilisation personnelle
- ✅ Pas besoin de configuration VPS

**Avantages:**
- ⚡ Le plus rapide (pas de latence réseau)
- 🔧 Facile à debugger
- 💰 Gratuit (pas de VPS nécessaire)

**Inconvénients:**
- ❌ Disponible uniquement quand votre Mac est allumé
- ❌ Pas accessible depuis d'autres ordinateurs

**Documentation:** Déjà configuré dans le README principal

---

### Option 2A: VPS + GitHub Actions (Recommandé pour la production)

**Idéal pour:**
- ✅ Production
- ✅ Équipe qui utilise Git
- ✅ Déploiement automatique souhaité

**Avantages:**
- 🚀 Déploiement automatique à chaque push
- ✅ Traçabilité complète (GitHub Actions logs)
- 🔄 Rollback facile (revert un commit)
- 📊 Monitoring intégré
- 🌐 Disponible 24/7
- 🔐 Sécurisé (secrets GitHub)

**Inconvénients:**
- 🔧 Configuration initiale nécessaire (secrets GitHub)
- 💰 Nécessite un VPS (~5-10€/mois)

**Workflow:**
```bash
# Modifier le code
vim mcp-server-veec/src/index.ts

# Push = Déploiement automatique!
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# 🎉 Le serveur est déployé automatiquement!
```

**Documentation:**
- 👉 [QUICK_START_GITHUB_ACTIONS.md](QUICK_START_GITHUB_ACTIONS.md) - Configuration rapide (5 min)
- 👉 [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) - Guide complet

---

### Option 2B: VPS + Script manuel

**Idéal pour:**
- ✅ Production sans GitHub Actions
- ✅ Déploiement contrôlé manuellement
- ✅ Pas d'accès aux secrets GitHub

**Avantages:**
- 🌐 Disponible 24/7
- 🔐 Sécurisé
- 🎯 Contrôle total du déploiement

**Inconvénients:**
- 🔄 Déploiement manuel nécessaire
- ⏱️ Plus lent (script à lancer à chaque fois)
- 💰 Nécessite un VPS (~5-10€/mois)

**Workflow:**
```bash
# Modifier le code
vim mcp-server-veec/src/index.ts

# Déployer manuellement
./deploy.sh

# Le serveur est mis à jour sur le VPS
```

**Documentation:**
- 👉 [QUICK_START_VPS.md](QUICK_START_VPS.md) - Guide rapide (10 min)
- 👉 [DEPLOYMENT_VPS.md](DEPLOYMENT_VPS.md) - Guide complet
- 👉 [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Vue d'ensemble

---

## 📊 Comparaison détaillée

### Performance

| Option | Latence | Disponibilité | Performance |
|--------|---------|---------------|-------------|
| Local | ~50ms | Quand Mac allumé | ⚡⚡⚡ Excellente |
| VPS + GitHub Actions | ~200ms | 24/7 | ⚡⚡ Bonne |
| VPS + Script | ~200ms | 24/7 | ⚡⚡ Bonne |

### Coût

| Option | VPS | GitHub Actions | Total/mois |
|--------|-----|----------------|------------|
| Local | ❌ Non | ❌ Non | 0€ |
| VPS + GitHub Actions | ✅ 5-10€ | ✅ Gratuit* | 5-10€ |
| VPS + Script | ✅ 5-10€ | ❌ Non | 5-10€ |

*GitHub Actions: 2000 minutes/mois gratuites (largement suffisant)

### Complexité de configuration

| Option | Configuration | Maintenance | Difficulté |
|--------|--------------|-------------|------------|
| Local | ⭐ Facile (5 min) | ✅ Aucune | Débutant |
| VPS + GitHub Actions | ⭐⭐ Moyen (5 min) | ✅ Automatique | Intermédiaire |
| VPS + Script | ⭐⭐ Moyen (10 min) | 🔧 Manuelle | Intermédiaire |

## 🎯 Recommandations par cas d'usage

### Cas 1: Développeur solo, tests et développement

**→ Option 1: Local**

**Configuration:**
```json
{
  "mcpServers": {
    "veec-local": {
      "command": "node",
      "args": ["./mcp-server-veec/dist/index.js"],
      "env": { ... }
    }
  }
}
```

**Temps de setup:** 5 minutes

---

### Cas 2: Équipe, production, utilisation de Git

**→ Option 2A: VPS + GitHub Actions** ⭐ Recommandé

**Configuration:**
```bash
# 1. Configurer les secrets GitHub (une fois)
# 2. Push sur main = Déploiement automatique!
git push origin main
```

**Temps de setup:** 5 minutes (configuration secrets)

---

### Cas 3: Production, sans GitHub ou déploiement contrôlé

**→ Option 2B: VPS + Script manuel**

**Configuration:**
```bash
# 1. Configurer deploy.sh (une fois)
# 2. Déployer manuellement quand nécessaire
./deploy.sh
```

**Temps de setup:** 10 minutes

---

## 🔄 Combinaison d'options

**Vous pouvez utiliser plusieurs options en même temps!**

### Configuration recommandée pour le développement:

```json
{
  "mcpServers": {
    "veec-local": {
      "command": "node",
      "args": ["./mcp-server-veec/dist/index.js"],
      "env": { ... }
    },
    "veec-prod": {
      "command": "ssh",
      "args": [
        "user@vps.com",
        "cd ~/mcp-server-veec && node dist/index.js"
      ]
    }
  }
}
```

**Usage:**
- `veec-local`: Pour le développement (rapide, debug facile)
- `veec-prod`: Pour tester en production (données réelles)

## 📋 Guides de démarrage rapide

### Pour commencer immédiatement:

#### Option 1: Local
→ Voir le [README.md](README.md) principal, section "Option 1"

#### Option 2A: GitHub Actions
→ [QUICK_START_GITHUB_ACTIONS.md](QUICK_START_GITHUB_ACTIONS.md)

#### Option 2B: Script manuel
→ [QUICK_START_VPS.md](QUICK_START_VPS.md)

## 🔐 Sécurité

### Option 1 (Local)
- ✅ Clés Supabase sur votre Mac
- ⚠️ Risque si le Mac est compromis

### Options 2A/2B (VPS)
- ✅ Clés Supabase sur le VPS (plus sécurisé)
- ✅ Connexion SSH chiffrée
- ✅ Clés SSH (pas de mot de passe)
- ✅ Secrets GitHub (Option 2A)

## 📈 Migration entre options

### De Local → VPS

**Facile!** Suivez simplement le guide de l'option 2A ou 2B.

Votre configuration locale continue de fonctionner, vous ajoutez juste une configuration distante.

### De VPS Script → GitHub Actions

**Très facile!**

1. Configurez les secrets GitHub (5 min)
2. Le workflow `.github/workflows/deploy-mcp-server.yml` existe déjà
3. Push sur `main` → Premier déploiement automatique

Le script `deploy.sh` reste disponible en backup.

## ✅ Checklist de décision

**Posez-vous ces questions:**

- [ ] Ai-je besoin que le serveur soit disponible 24/7 ?
  - **Oui** → Options 2A ou 2B
  - **Non** → Option 1

- [ ] Est-ce que j'utilise Git/GitHub pour mon code ?
  - **Oui** → Option 2A (recommandé)
  - **Non** → Option 2B

- [ ] Est-ce que je veux un déploiement automatique ?
  - **Oui** → Option 2A
  - **Non** → Option 2B ou Option 1

- [ ] Ai-je un budget pour un VPS ?
  - **Oui** → Options 2A ou 2B
  - **Non** → Option 1

- [ ] Est-ce pour du développement ou de la production ?
  - **Développement** → Option 1
  - **Production** → Options 2A ou 2B

## 🎉 Récapitulatif

### Pour le développement
**→ Option 1: Local**
- 5 minutes de setup
- Gratuit
- Rapide

### Pour la production avec Git
**→ Option 2A: GitHub Actions** ⭐ Recommandé
- 5 minutes de setup
- Déploiement automatique
- Traçabilité complète

### Pour la production sans Git
**→ Option 2B: Script manuel**
- 10 minutes de setup
- Déploiement contrôlé
- Simplicité

---

**Conseil:** Commencez avec l'Option 1 (Local) pour tester, puis migrez vers l'Option 2A (GitHub Actions) pour la production. C'est la combinaison la plus courante et la plus efficace! 🚀
