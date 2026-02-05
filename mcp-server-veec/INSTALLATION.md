# Guide d'installation rapide - MCP Server VEEC

## ✅ Étapes complétées

Le MCP Server VEEC est maintenant prêt ! Voici ce qui a été fait :

- ✅ Structure du projet créée
- ✅ Code TypeScript implémenté
- ✅ Dépendances NPM installées
- ✅ Build réussi (`dist/index.js` généré)
- ✅ Configuration d'exemple créée

## 🚀 Prochaines étapes

### 1. Configurer vos credentials Supabase

Éditez le fichier `/Users/Laurent/Documents/GitHub/VEEC_Planning2526/mcp-server-veec/.env` :

```bash
SUPABASE_URL=https://odfijihyepuxjzeueiri.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon_ici
```

### 2. Configurer Claude Desktop

#### macOS

Ouvrez le fichier de configuration :
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Ajoutez cette configuration :
```json
{
  "mcpServers": {
    "veec": {
      "command": "node",
      "args": [
        "/Users/Laurent/Documents/GitHub/VEEC_Planning2526/mcp-server-veec/dist/index.js"
      ],
      "env": {
        "SUPABASE_URL": "https://odfijihyepuxjzeueiri.supabase.co",
        "SUPABASE_ANON_KEY": "VOTRE_CLE_SUPABASE_ANON"
      }
    }
  }
}
```

**⚠️ Important** : Remplacez `VOTRE_CLE_SUPABASE_ANON` par votre vraie clé Supabase

#### Windows

Le fichier de configuration est ici :
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 3. Redémarrer Claude Desktop

1. Quittez complètement Claude Desktop
2. Relancez l'application
3. Vous devriez voir une icône 🔨 dans l'interface

### 4. Tester

Dans Claude Desktop, essayez :

```
Quels sont les joueurs de l'équipe SM4 ?
```

Si cela fonctionne, vous verrez Claude utiliser l'outil `get_players` avec le paramètre `team: "SM4"` et récupérer les données depuis Supabase !

## 🎯 Outils disponibles dans Claude

Une fois configuré, vous pouvez poser des questions comme :

- **Joueurs** : "Quels sont les joueurs des SM4 ?"
- **Matchs** : "Quel est le prochain match des Seniors Masculins 1 ?"
- **Entraînements** : "Quels entraînements ont lieu mercredi ?"
- **Équipes** : "Liste toutes les équipes du club"
- **Statistiques** : "Donne-moi les statistiques du club"
- **Dates** : "Quelle date sera-t-il dans 15 jours ?"

## 🔧 Dépannage

### Les outils ne sont pas visibles

1. Vérifiez que le chemin dans `claude_desktop_config.json` est correct
2. Vérifiez que le fichier `dist/index.js` existe
3. Consultez les logs de Claude Desktop (Menu > Settings > Developer > Show Logs)

### Erreur de connexion Supabase

1. Vérifiez votre URL Supabase
2. Vérifiez votre clé anonyme
3. Testez la connexion directement depuis votre application web

## 📚 Documentation complète

Voir [README.md](./README.md) pour plus de détails.

## 🎉 C'est tout !

Votre MCP Server VEEC est prêt à être utilisé avec Claude Desktop, ChatGPT Desktop, ou n'importe quel client MCP !
