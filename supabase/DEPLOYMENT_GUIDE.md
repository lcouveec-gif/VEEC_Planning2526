# Guide de déploiement - Paramètres LLM sécurisés

Ce guide explique comment déployer l'infrastructure pour gérer les paramètres LLM de manière sécurisée.

## 📋 Prérequis

- Compte Supabase actif
- CLI Supabase installé (`npm install -g supabase`)
- Connexion au projet Supabase configurée

## 🗄️ Étape 1 : Déployer les migrations SQL

Les migrations créent la table et les fonctions nécessaires.

```bash
# Depuis le répertoire racine du projet
cd supabase/migrations

# Appliquer les migrations dans l'ordre :
# 1. Créer la table user_llm_settings
psql -h [VOTRE_HOST_SUPABASE] -U postgres -d postgres -f create_user_llm_settings.sql

# 2. Créer la fonction upsert
psql -h [VOTRE_HOST_SUPABASE] -U postgres -d postgres -f create_upsert_llm_settings_function.sql

# 3. Créer la fonction de déchiffrement
psql -h [VOTRE_HOST_SUPABASE] -U postgres -d postgres -f create_get_llm_settings_decrypted_function.sql
```

### Alternative : Via l'interface Supabase

1. Connectez-vous à votre dashboard Supabase
2. Allez dans **SQL Editor**
3. Copiez et exécutez le contenu de chaque fichier `.sql` dans l'ordre

## 🔐 Étape 2 : Configurer la clé de chiffrement

La clé de chiffrement doit être définie comme secret dans Supabase.

### Via Supabase Dashboard :

1. Allez dans **Settings** > **Edge Functions** > **Secrets**
2. Ajoutez un nouveau secret :
   - **Nom** : `LLM_ENCRYPTION_KEY`
   - **Valeur** : Générez une clé aléatoire sécurisée (minimum 32 caractères)

### Générer une clé sécurisée :

```bash
# Linux/Mac
openssl rand -base64 32

# Ou avec Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

⚠️ **Important** : Conservez cette clé en lieu sûr ! Sans elle, les clés API chiffrées ne pourront pas être déchiffrées.

## ⚡ Étape 3 : Déployer les Edge Functions

```bash
# Se positionner dans le répertoire supabase
cd supabase

# Déployer toutes les fonctions
supabase functions deploy save-llm-settings
supabase functions deploy get-llm-settings
supabase functions deploy call-llm

# Ou déployer toutes les fonctions en une fois
supabase functions deploy
```

### Vérifier le déploiement :

```bash
# Lister les fonctions déployées
supabase functions list
```

## 🧪 Étape 4 : Tester les fonctions

### Test de sauvegarde des paramètres :

```bash
curl -X POST 'https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/save-llm-settings' \
  -H "Authorization: Bearer [VOTRE_TOKEN_USER]" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "apiKey": "sk-test-key",
    "model": "gpt-4o",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "temperature": 0.7,
    "maxTokens": 2000
  }'
```

### Test de récupération des paramètres :

```bash
curl -X GET 'https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/get-llm-settings' \
  -H "Authorization: Bearer [VOTRE_TOKEN_USER]"
```

### Test d'appel au LLM :

```bash
curl -X POST 'https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/call-llm' \
  -H "Authorization: Bearer [VOTRE_TOKEN_USER]" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Test"}
    ],
    "maxTokens": 10
  }'
```

## 🔍 Étape 5 : Vérifier les Row Level Security (RLS)

Les politiques RLS garantissent que chaque utilisateur ne peut accéder qu'à ses propres paramètres.

### Vérifier via SQL :

```sql
-- Se connecter à la base de données et vérifier
SELECT * FROM user_llm_settings WHERE user_id = auth.uid();
```

Vous devriez voir uniquement vos propres paramètres.

## 📊 Étape 6 : Monitorer les Edge Functions

### Via le Dashboard Supabase :

1. Allez dans **Edge Functions**
2. Cliquez sur chaque fonction pour voir :
   - Les logs d'exécution
   - Les erreurs éventuelles
   - Les métriques d'utilisation

### Logs en temps réel :

```bash
# Suivre les logs d'une fonction spécifique
supabase functions logs save-llm-settings --tail
```

## 🛡️ Sécurité

### Bonnes pratiques :

1. **Clé de chiffrement** :
   - Ne jamais commiter la clé dans le code
   - Utiliser uniquement les secrets Supabase
   - Rotation régulière recommandée (avec re-chiffrement des données)

2. **Row Level Security** :
   - Toujours actif sur `user_llm_settings`
   - Ne jamais désactiver les policies

3. **Edge Functions** :
   - Toujours vérifier l'authentification
   - Ne jamais exposer les clés API déchiffrées au client

4. **Clés API utilisateurs** :
   - Chaque utilisateur est responsable de sa clé
   - Les clés sont chiffrées avec `pgcrypto`
   - Jamais envoyées au client en clair

## 🔄 Mise à jour

### Mettre à jour une Edge Function :

```bash
supabase functions deploy [nom-fonction]
```

### Modifier la structure de la table :

Créez une nouvelle migration :

```bash
supabase migration new update_user_llm_settings
```

Puis appliquez-la via le dashboard ou psql.

## 🐛 Dépannage

### Les fonctions ne répondent pas :

```bash
# Vérifier les logs
supabase functions logs [nom-fonction] --tail

# Redéployer
supabase functions deploy [nom-fonction]
```

### Erreur de déchiffrement :

- Vérifier que `LLM_ENCRYPTION_KEY` est bien défini dans les secrets
- S'assurer que la clé n'a pas changé depuis le chiffrement

### RLS bloque l'accès :

```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'user_llm_settings';
```

## 📝 URLs des fonctions

Une fois déployées, vos fonctions seront disponibles à :

```
https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/save-llm-settings
https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/get-llm-settings
https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/call-llm
```

## ✅ Checklist de déploiement

- [ ] Migrations SQL appliquées
- [ ] Secret `LLM_ENCRYPTION_KEY` configuré
- [ ] Edge Functions déployées
- [ ] Tests manuels réussis
- [ ] RLS vérifié
- [ ] Logs consultés (pas d'erreurs)
- [ ] Interface utilisateur testée

## 📚 Ressources

- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentation Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [pgcrypto Extension](https://www.postgresql.org/docs/current/pgcrypto.html)
