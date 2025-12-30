# Architecture IA/LLM - Gestion sécurisée par utilisateur

## 🎯 Vue d'ensemble

L'application VEEC Planning intègre désormais un système de configuration IA/LLM permettant à chaque utilisateur de configurer ses propres paramètres de manière sécurisée. Les clés API sont chiffrées côté serveur et jamais exposées au client.

## 🏗️ Architecture

### Composants Frontend

#### 1. LLMConfig.tsx
**Emplacement** : `components/Admin/LLMConfig.tsx`

**Fonctionnalités** :
- Configuration des paramètres LLM par utilisateur
- Choix du provider (OpenAI, Anthropic, Google, Custom)
- Sélection du modèle
- Saisie sécurisée de la clé API (jamais affichée en clair)
- Réglage température et tokens max
- Test de connexion
- Synchronisation automatique entre appareils

**Sécurité** :
- Vérification authentification obligatoire
- Clé API masquée après sauvegarde
- Affichage message si utilisateur non connecté

#### 2. WebhookManager.tsx
**Emplacement** : `components/Admin/WebhookManager.tsx`

**Fonctionnalités** :
- Gestion des webhooks personnalisés
- Webhook prédéfini MajBaseMatch
- Exécution et monitoring des webhooks

### Backend Supabase

#### 1. Table `user_llm_settings`

```sql
CREATE TABLE user_llm_settings (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  provider text NOT NULL,
  api_key_encrypted text NOT NULL,  -- Chiffré avec pgcrypto
  model text NOT NULL,
  endpoint text NOT NULL,
  temperature numeric DEFAULT 0.7,
  max_tokens integer DEFAULT 2000,
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(user_id)
);
```

**Row Level Security (RLS)** :
- Chaque utilisateur peut uniquement voir/modifier ses propres paramètres
- Politiques SELECT, INSERT, UPDATE, DELETE activées
- Authentification obligatoire via `auth.uid()`

#### 2. Edge Functions

##### a) save-llm-settings
**Endpoint** : `/functions/v1/save-llm-settings`

**Méthode** : POST

**Body** :
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

**Processus** :
1. Vérifie l'authentification
2. Valide les données
3. Chiffre la clé API avec `pgp_sym_encrypt()`
4. Upsert dans `user_llm_settings`

**Sécurité** :
- Clé de chiffrement stockée dans les secrets Supabase
- Jamais exposée au client
- Chiffrement AES via pgcrypto

##### b) get-llm-settings
**Endpoint** : `/functions/v1/get-llm-settings`

**Méthode** : GET

**Réponse** :
```json
{
  "settings": {
    "provider": "openai",
    "model": "gpt-4o",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "temperature": 0.7,
    "maxTokens": 2000,
    "hasApiKey": true,  // Indique si une clé existe
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Sécurité** :
- Clé API **jamais** retournée
- Uniquement indicateur `hasApiKey`

##### c) call-llm
**Endpoint** : `/functions/v1/call-llm`

**Méthode** : POST

**Body** :
```json
{
  "messages": [
    {"role": "user", "content": "Votre question"}
  ],
  "temperature": 0.7,  // Optionnel
  "maxTokens": 1000    // Optionnel
}
```

**Processus** :
1. Vérifie l'authentification
2. Récupère et déchiffre les paramètres de l'utilisateur
3. Appelle l'API LLM configurée
4. Normalise la réponse selon le provider
5. Retourne le résultat au client

**Sécurité** :
- Clé API déchiffrée uniquement côté serveur
- Jamais exposée dans les logs ou réponses
- Utilise la clé de l'utilisateur authentifié

## 🔐 Sécurité

### Chiffrement des clés API

**Méthode** : pgcrypto (PostgreSQL)

```sql
-- Chiffrement
pgp_sym_encrypt(api_key, encryption_key)

-- Déchiffrement (uniquement serveur-side)
pgp_sym_decrypt(api_key_encrypted::bytea, encryption_key)
```

**Clé de chiffrement** :
- Stockée dans les secrets Supabase : `LLM_ENCRYPTION_KEY`
- Minimum 32 caractères
- Générée aléatoirement
- Jamais commitée dans le code

### Flow de sécurité

```
Client (Browser)
    ↓
    | 1. Saisie clé API
    ↓
    | 2. Envoi HTTPS vers Edge Function
    ↓
Supabase Edge Function
    ↓
    | 3. Chiffrement avec LLM_ENCRYPTION_KEY
    ↓
PostgreSQL (Supabase)
    ↓
    | 4. Stockage clé chiffrée
    ↓
RLS Policy
    | 5. Vérification user_id = auth.uid()
```

### Appel LLM sécurisé

```
Client (Browser)
    ↓
    | 1. Requête call-llm (sans clé API)
    ↓
Edge Function call-llm
    ↓
    | 2. Récupération user_id
    ↓
    | 3. Déchiffrement clé API (serveur uniquement)
    ↓
API LLM (OpenAI/Anthropic/Google)
    ↓
    | 4. Réponse LLM
    ↓
Client (Browser)
    | 5. Résultat (jamais la clé)
```

## 📊 Flux utilisateur

### Configuration initiale

1. Utilisateur se connecte à l'application
2. Navigation : **Admin** > **IA / Automatisation**
3. Clic sur **Configurer** dans la carte Configuration LLM
4. Sélection du provider (OpenAI, Anthropic, etc.)
5. Saisie de la clé API personnelle
6. Réglage des paramètres (température, tokens)
7. Clic sur **Enregistrer**
8. Paramètres chiffrés et sauvegardés dans Supabase

### Modification

1. Clic sur **Modifier**
2. Modification des paramètres souhaités
3. Clé API masquée (`••••••••••••`)
4. Option : laisser vide pour conserver la clé actuelle
5. Clic sur **Enregistrer**

### Test de connexion

1. Bouton **Tester la connexion** (visible si paramètres configurés)
2. Appel à `call-llm` avec message de test
3. Affichage du résultat (succès ou erreur)

### Utilisation

1. Utilisateur utilise une fonctionnalité IA de l'app
2. Frontend appelle `call-llm` avec les messages
3. Serveur récupère automatiquement les paramètres de l'utilisateur
4. Appel au LLM avec la clé de l'utilisateur
5. Résultat retourné à l'utilisateur

## 🌐 Synchronisation multi-appareils

**Avantage** : Les paramètres sont liés au profil utilisateur, pas à l'appareil.

**Scénario** :
1. Utilisateur configure sur Desktop → Sauvegarde dans Supabase
2. Se connecte sur Smartphone → Récupération automatique
3. Modification sur Smartphone → Mise à jour immédiate
4. Retour sur Desktop → Paramètres à jour

## 🔄 Providers supportés

### OpenAI
- Modèles : GPT-4o, GPT-4o-mini, GPT-4 Turbo, O1, etc.
- Endpoint : `https://api.openai.com/v1/chat/completions`
- Format : Bearer token

### Anthropic (Claude)
- Modèles : Claude 3.5 Sonnet, Claude 3.5 Haiku, etc.
- Endpoint : `https://api.anthropic.com/v1/messages`
- Format : x-api-key header

### Google (Gemini)
- Modèles : Gemini 2.5 Flash, Gemini 2.5 Pro, etc.
- Endpoint : `https://generativelanguage.googleapis.com/v1beta`
- Format : Query parameter

### Custom
- Endpoint personnalisé
- Modèle personnalisé
- Compatible avec APIs respectant le format OpenAI

## 📈 Évolutions futures

### Prévues
- [ ] Génération automatique de descriptions d'entraînements
- [ ] Suggestions d'organisation de planning
- [ ] Analyse de disponibilités des joueurs
- [ ] Assistant conversationnel dans le planning

### Possibles
- [ ] Quotas d'utilisation par utilisateur
- [ ] Logs d'utilisation IA
- [ ] Templates de prompts prédéfinis
- [ ] Partage de configurations entre utilisateurs (optionnel)

## 🛠️ Maintenance

### Rotation de la clé de chiffrement

⚠️ **Attention** : Nécessite un script de migration pour re-chiffrer toutes les clés API.

1. Générer nouvelle clé
2. Déchiffrer toutes les clés avec ancienne clé
3. Re-chiffrer avec nouvelle clé
4. Mettre à jour le secret Supabase

### Monitoring

**Métriques à surveiller** :
- Nombre d'appels `call-llm` par utilisateur
- Taux d'erreur des Edge Functions
- Temps de réponse des APIs LLM
- Coûts générés par les appels LLM

## 📚 Documentation complémentaire

- [Guide de déploiement](../supabase/DEPLOYMENT_GUIDE.md)
- [Migrations SQL](../supabase/migrations/)
- [Edge Functions](../supabase/functions/)

## 🤝 Responsabilités

### Utilisateur
- Fournit et gère sa propre clé API
- Responsable des coûts associés à son utilisation
- Doit respecter les conditions d'utilisation du provider

### Application
- Stockage sécurisé des clés API
- Chiffrement/déchiffrement transparent
- Proxy pour les appels LLM
- Isolation des données entre utilisateurs

## ✅ Conformité

- **RGPD** : Clés API stockées de manière chiffrée
- **Sécurité** : Row Level Security activé
- **Isolation** : Chaque utilisateur accède uniquement à ses données
- **Transparence** : Utilisateur contrôle sa clé API
