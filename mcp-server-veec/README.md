# MCP Server VEEC

Serveur MCP (Model Context Protocol) pour accéder aux données du club VEEC via Supabase.

## 🎯 Fonctionnalités

Ce serveur MCP permet d'accéder aux données VEEC depuis :
- **Claude Desktop** (Anthropic)
- **ChatGPT Desktop** (OpenAI)
- **N'importe quel client MCP**
- **Votre application web** (via WebSocket ou HTTP)

### Outils disponibles

1. **get_current_datetime** - Obtient la date et l'heure actuelles
2. **calculate_date** - Calcule des dates relatives (demain, hier, semaine prochaine, etc.)
3. **get_matches** - Récupère les matchs avec filtres (équipe, dates, compétition)
4. **get_players** - Liste les joueurs licenciés (par nom, prénom ou équipe)
5. **get_teams** - Récupère les équipes du club
6. **get_training_sessions** - Liste les créneaux d'entraînement
7. **get_statistics** - Statistiques générales du club

## 📦 Installation

### 1. Installer les dépendances

```bash
cd mcp-server-veec
npm install
```

### 2. Configuration

Créez un fichier `.env` à partir de `.env.example` :

```bash
cp .env.example .env
```

Puis éditez `.env` avec vos credentials Supabase :

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Build

```bash
npm run build
```

## 🚀 Utilisation avec Claude Desktop

### Configuration Claude Desktop

1. Ouvrez le fichier de configuration de Claude Desktop :
   - **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

2. Ajoutez la configuration du serveur MCP :

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
        "SUPABASE_ANON_KEY": "your_supabase_anon_key"
      }
    }
  }
}
```

3. **Redémarrez Claude Desktop**

4. Vous verrez maintenant une icône 🔨 indiquant que les outils VEEC sont disponibles

### Exemples d'utilisation dans Claude Desktop

```
"Quels sont les joueurs de l'équipe SM4 ?"

"Quel est le prochain match des Seniors Masculins 1 ?"

"Quels entraînements ont lieu mercredi ?"

"Donne-moi les statistiques du club"
```

## 🌐 Utilisation avec ChatGPT Desktop

Pour ChatGPT Desktop, suivez les mêmes étapes mais adaptez le chemin de configuration selon la documentation OpenAI MCP.

## 🔧 Développement

### Mode développement

```bash
npm run dev
```

Cette commande lance TypeScript en mode watch - les changements sont recompilés automatiquement.

### Tests

Testez le serveur localement :

```bash
npm start
```

Le serveur démarre sur stdio et attend les commandes MCP.

## 📚 Structure du projet

```
mcp-server-veec/
├── src/
│   └── index.ts          # Code principal du serveur
├── dist/                 # Fichiers compilés (généré)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔐 Sécurité

- Les credentials Supabase sont stockés dans `.env` (ne PAS committer)
- Le serveur utilise la clé anonyme Supabase (sécurité RLS activée côté Supabase)
- Toutes les requêtes respectent les Row Level Security policies de Supabase

## 🛠️ Dépannage

### Le serveur ne démarre pas

1. Vérifiez que les variables d'environnement sont bien définies
2. Vérifiez que le build a réussi : `npm run build`
3. Vérifiez les logs dans Claude Desktop (Menu > Settings > Developer > Show Logs)

### Les outils ne sont pas visibles dans Claude

1. Redémarrez complètement Claude Desktop
2. Vérifiez que le chemin dans `claude_desktop_config.json` est absolu et correct
3. Vérifiez les permissions d'exécution sur le fichier `dist/index.js`

### Erreurs Supabase

- Vérifiez que votre URL et clé Supabase sont correctes
- Vérifiez la connexion réseau
- Consultez les logs Supabase pour voir les requêtes

## 📖 Documentation

- [MCP Protocol](https://modelcontextprotocol.io)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Claude Desktop](https://claude.ai/desktop)

## 📝 Licence

MIT

## 👤 Auteur

VEEC - Club de Volleyball
