# Solution - Numéros de Licence dans l'Assistant IA

Date : 30 décembre 2025

## 🎯 Problème Identifié

L'Assistant IA de l'application web ne retournait PAS les numéros de licence des joueurs, malgré que les données soient disponibles dans Supabase.

### Cause Racine

**Confusion initiale** : J'ai d'abord pensé que le problème venait du MCP Server (utilisé par Claude Desktop), mais l'utilisateur testait via **l'Assistant IA intégré à l'application web**, qui est complètement différent !

- **MCP Server** (`mcp-server-veec/`) : Utilisé par Claude Desktop / ChatGPT Desktop
- **Assistant IA Web** (`components/AIChat.tsx` + `lib/aiFunctions.ts`) : Intégré directement dans l'application web

### Problème Exact

La fonction `getPlayers()` dans `lib/aiFunctions.ts` ne récupérait PAS les champs suivants depuis Supabase :
- ❌ `Num_Licencie` (numéro de licence FFVB)
- ❌ `Categorie_licencie` (catégorie : SEN, U18, M21, etc.)

**Ligne 336-341** avant correction :
```typescript
licencie:VEEC_Licencie!fk_collectifs_licencie(
  id,
  Nom_Licencie,
  Prenom_Licencie,
  Date_Naissance_licencie
)
```

## ✅ Solution Appliquée

### 1. Mise à Jour de la Requête SQL

**Fichier** : `lib/aiFunctions.ts`

Ajout des champs manquants dans la requête Supabase (ligne 336-343) :

```typescript
licencie:VEEC_Licencie!fk_collectifs_licencie(
  id,
  Num_Licencie,              // ← AJOUTÉ
  Nom_Licencie,
  Prenom_Licencie,
  Date_Naissance_licencie,
  Categorie_licencie         // ← AJOUTÉ
)
```

### 2. Mise à Jour du Mapping des Résultats

**Trois endroits** dans `getPlayers()` mis à jour :

#### A. Recherche par équipe (ligne 358-367)

```typescript
let results = (collectifs || []).map((c: any) => ({
  id: c.licencie?.id,
  numeroLicence: c.licencie?.Num_Licencie,         // ← AJOUTÉ
  nom: c.licencie?.Nom_Licencie,
  prenom: c.licencie?.Prenom_Licencie,
  categorie: c.licencie?.Categorie_licencie,       // ← AJOUTÉ
  numeroMaillot: c.numero_maillot,                 // ← RENOMMÉ (était "numero")
  poste: c.poste,
  dateNaissance: c.licencie?.Date_Naissance_licencie,
}));
```

#### B. Recherche par nom/prénom (ligne 418-425)

```typescript
data: uniquePlayers.map((player: any) => ({
  id: player.id,
  numeroLicence: player.Num_Licencie,        // ← AJOUTÉ
  nom: player.Nom_Licencie,
  prenom: player.Prenom_Licencie,
  categorie: player.Categorie_licencie,      // ← AJOUTÉ
  dateNaissance: player.Date_Naissance_licencie,
})),
```

#### C. Liste complète sans filtre (ligne 443-450)

```typescript
data: (data || []).map((player: any) => ({
  id: player.id,
  numeroLicence: player.Num_Licencie,        // ← AJOUTÉ
  nom: player.Nom_Licencie,
  prenom: player.Prenom_Licencie,
  categorie: player.Categorie_licencie,      // ← AJOUTÉ
  dateNaissance: player.Date_Naissance_licencie,
})),
```

### 3. Mise à Jour de la Description de l'Outil

**Ligne 582-583** mise à jour pour être explicite :

```typescript
{
  name: 'getPlayers',
  description: 'Récupère les informations complètes des joueurs licenciés FFVB: numéro de licence, nom, prénom, date de naissance, catégorie (SEN, U18, etc.), équipe, numéro de maillot et poste. Permet de filtrer par nom/prénom ou par équipe (ex: "SM1", "U18M").',
  // ...
}
```

### 4. Mise à Jour du Prompt Système

**Fichier** : `components/AIChat.tsx` (ligne 57-67)

```typescript
- getPlayers : pour obtenir les joueurs avec TOUTES leurs informations (numéro de licence FFVB, nom, prénom, catégorie, date de naissance, numéro de maillot, poste)

INSTRUCTIONS IMPORTANTES:
// ...
- IMPORTANT: getPlayers retourne TOUJOURS les numéros de licence FFVB (numeroLicence) - affiche-les systématiquement quand on demande des informations sur les joueurs
```

## 📊 Exemple de Données Retournées

Après correction, `getPlayers({ team: 'SM4' })` retourne :

```json
{
  "success": true,
  "data": [
    {
      "id": "64e4235d-473d-484c-84fc-f224d7bc6ed5",
      "numeroLicence": 2260545,           // ✅ PRÉSENT
      "nom": "GRANGER",
      "prenom": "MAXIME",
      "categorie": "SEN",                 // ✅ PRÉSENT
      "numeroMaillot": 3,
      "poste": "Central",
      "dateNaissance": null
    },
    // ... autres joueurs
  ],
  "count": 13
}
```

## 🧪 Tests à Effectuer

1. **Redémarrer l'application** (si en mode dev) :
   ```bash
   npm run dev
   ```

2. **Tester dans l'Assistant IA** :
   - Aller dans l'Assistant IA de l'application web
   - Demander : "Quels sont les joueurs de l'équipe SM4 avec leurs numéros de licence ?"
   - **Résultat attendu** : L'assistant doit afficher les numéros de licence

3. **Vérifier les logs** dans la console navigateur :
   ```
   [getPlayers] Collectifs récupérés: [...]
   [getPlayers] Joueurs après mapping: [...]
   ```

## 📝 Différences avec le MCP Server

| Fonctionnalité | MCP Server | Assistant IA Web |
|----------------|------------|------------------|
| **Usage** | Claude Desktop, ChatGPT Desktop | Application web VEEC |
| **Fichier principal** | `mcp-server-veec/src/index.ts` | `lib/aiFunctions.ts` |
| **Protocole** | MCP (Model Context Protocol) | Function calling direct |
| **Configuration** | `claude_desktop_config.json` | LLM Config dans Admin |
| **État numéros licence** | ✅ Fonctionnel (déjà OK) | ✅ Corrigé maintenant |

## 🎓 Leçons Apprises

1. **Deux systèmes distincts** : Le MCP Server et l'Assistant IA web sont complètement séparés
2. **Tester le bon système** : Important de clarifier quel système est testé
3. **Cohérence des données** : Les deux systèmes doivent retourner les mêmes données
4. **Descriptions explicites** : Les prompts système et descriptions d'outils doivent être très clairs

## ✨ Prochaines Étapes

1. ✅ Tester l'Assistant IA web avec les modifications
2. ✅ Vérifier que les numéros de licence s'affichent
3. 🔄 Si besoin, améliorer le formatage de l'affichage (tableaux, emojis, etc.)
4. 🔄 Synchroniser les deux systèmes pour qu'ils retournent exactement les mêmes données

## 🔗 Fichiers Modifiés

1. **`lib/aiFunctions.ts`** :
   - Ajout `Num_Licencie` et `Categorie_licencie` dans les requêtes SELECT
   - Mapping des champs `numeroLicence` et `categorie` dans les 3 cas d'usage
   - Description de `getPlayers` mise à jour

2. **`components/AIChat.tsx`** :
   - Prompt système mis à jour pour mentionner les numéros de licence
   - Instruction explicite d'afficher les numéros de licence

---

**Statut** : ✅ Solution appliquée - En attente de test utilisateur
**Date** : 30 décembre 2025
**Auteur** : Claude Code
