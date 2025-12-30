# Dépannage - Numéros de Licence

## Problème Rapporté

L'assistant LLM (Claude Desktop, ChatGPT, etc.) répond :
> "Désolé, je n'ai pas accès aux numéros de licence des joueurs. Je peux vous donner leur nom, prénom, numéro de maillot et poste."

**MAIS** les tests montrent que le MCP Server retourne bien les numéros de licence.

## Vérifications Effectuées ✅

### 1. Permissions Supabase (RLS)
✅ **Confirmé** : La clé ANON_KEY peut bien accéder à la table `VEEC_Licencie` incluant `Num_Licencie`

Test : `test-rls-access.js`
```bash
node test-rls-access.js
# Résultat: ✅ Accès réussi, numéros de licence retournés
```

### 2. Fonction getPlayers()
✅ **Confirmé** : La requête récupère bien `Num_Licencie` via le JOIN

Test : `test-get-players-output.js`
```bash
node test-get-players-output.js
# Résultat: ✅ numeroLicence présent dans chaque joueur
```

### 3. Protocole MCP
✅ **Confirmé** : Le MCP Server retourne un texte formaté contenant les licences

Test : `test-mcp-protocol.js`
```bash
node test-mcp-protocol.js
```

**Résultat** : Le texte retourné contient clairement :
```
👤 **MAXIME GRANGER**
   🎫 Licence: 2260545
   📊 Catégorie: SEN
   👕 Équipe: SM4 - N°3 - Central
```

### 4. Description de l'outil
✅ **Confirmé** : La description indique explicitement que les licences sont disponibles

```json
{
  "name": "get_players",
  "description": "Récupère les informations complètes des joueurs licenciés FFVB: numéro de licence, nom, prénom, date de naissance, catégorie, équipe(s), numéro de maillot et poste. Filtres disponibles: recherche par nom/prénom ou par équipe."
}
```

## Diagnostic

Le MCP Server fonctionne **parfaitement**. L'erreur vient du client LLM qui :
1. Ne lit pas correctement le texte formaté retourné
2. Ou a mis en cache une ancienne version de la définition de l'outil
3. Ou interprète mal les capacités de l'outil

## Solutions à Tester

### Solution 1 : Redémarrer le client LLM (Recommandé)

**Claude Desktop** :
1. Quitter complètement Claude Desktop (Cmd+Q sur Mac)
2. Relancer l'application
3. Vérifier l'icône 🔨 qui indique que les outils sont chargés
4. Essayer à nouveau la requête

**ChatGPT Desktop** :
1. Quitter et relancer
2. Vérifier que les outils MCP sont bien chargés

### Solution 2 : Vérifier la configuration

Fichier de configuration Claude Desktop :
- **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

Vérifier que le chemin vers le serveur est correct :

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
        "SUPABASE_ANON_KEY": "votre_clé"
      }
    }
  }
}
```

### Solution 3 : Consulter les logs du client

**Claude Desktop** :
- Menu > Settings > Developer > Show Logs
- Chercher les erreurs lors de l'appel à `get_players`
- Vérifier que le serveur MCP démarre bien

**Indicateurs de bon fonctionnement** :
- Icône 🔨 visible dans l'interface
- Aucune erreur dans les logs
- Le serveur se lance sans erreur

### Solution 4 : Tester manuellement le serveur

Lancer le serveur en mode standalone :
```bash
cd /Users/Laurent/Documents/GitHub/VEEC_Planning2526/mcp-server-veec
npm start
```

Si le serveur démarre sans erreur, c'est bon signe.

### Solution 5 : Vider le cache (si applicable)

Certains clients LLM peuvent mettre en cache les définitions d'outils. Essayer :
1. Supprimer le dossier cache du client (si existant)
2. Redémarrer l'ordinateur
3. Relancer le client LLM

## Vérification Post-Fix

Après avoir appliqué une solution, tester avec cette requête :

```
Donne-moi la liste des joueurs de l'équipe SM4 avec leurs numéros de licence
```

**Réponse attendue** :
```
✅ 13 joueur(s) trouvé(s)

👤 **MAXIME GRANGER**
   🎫 Licence: 2260545
   📊 Catégorie: SEN
   👕 Équipe: SM4 - N°3 - Central

[... autres joueurs avec licences ...]
```

## Logs de Débogage

Si le problème persiste, activer le mode debug :

1. Ajouter des console.error dans `index.ts` :
```typescript
console.error('[DEBUG] get_players called with args:', args);
console.error('[DEBUG] Returning formatted data with', result.count, 'players');
console.error('[DEBUG] First player sample:', JSON.stringify(result.data[0]));
```

2. Recompiler : `npm run build`
3. Redémarrer le client LLM
4. Consulter les logs système pour voir les messages de debug

## Assistance Supplémentaire

Si aucune solution ne fonctionne :

1. Partager les logs du client LLM
2. Partager la version exacte du client (Claude Desktop 1.x.x, etc.)
3. Indiquer le système d'exploitation
4. Tester avec un autre client MCP pour isoler le problème

## Résumé

✅ **Le MCP Server fonctionne correctement**
✅ **Les données sont accessibles et retournées**
✅ **Les numéros de licence sont présents dans la réponse**

❓ **Le problème est côté client LLM** - probablement un cache ou mauvaise interprétation

🔧 **Solution la plus probable** : Redémarrer complètement le client LLM
