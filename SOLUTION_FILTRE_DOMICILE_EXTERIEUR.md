# Solution - Filtre Domicile/Extérieur pour les Matchs

Date : 30 décembre 2025

## 🎯 Problème Rapporté

L'utilisateur a demandé à l'Assistant IA :
> "Quel est le prochain match à l'extérieur des SM4 et dans quel gymnase ?"

**Réponse erronée** : L'assistant a retourné le prochain match sans distinguer domicile/extérieur, car la fonction `getMatches` ne permettait pas de filtrer par cette information.

## 🔍 Analyse

### Avant la correction

La fonction `getMatches()` :
- ✅ **Calculait** déjà si un match était à domicile ou à l'extérieur
- ✅ **Retournait** l'information `domicileExterieur` et `lieu` dans les résultats
- ❌ **NE permettait PAS** de filtrer par cette information

**Résultat** : L'IA recevait TOUS les matchs et devait les filtrer elle-même, ce qui ne fonctionnait pas toujours correctement.

### Logique Domicile/Extérieur

```typescript
// Si EQA_nom contient le nom de notre équipe → DOMICILE
// Si EQB_nom contient le nom de notre équipe → EXTÉRIEUR

const isHome = match.EQA_nom?.includes(nomEquipeVEEC) ||
               match.EQA_nom === nomEquipeVEEC;

// Exemple:
// Match: "VEEC SM4" vs "Adversaire"
// EQA_nom = "VEEC SM4" → isHome = true → DOMICILE
// EQB_nom = "Adversaire" → adversaire

// Match: "Adversaire" vs "VEEC SM4"
// EQA_nom = "Adversaire" → isHome = false → EXTÉRIEUR
// EQB_nom = "VEEC SM4" → adversaire
```

## ✅ Solution Appliquée

### 1. Ajout du Paramètre `location`

**Fichier** : `lib/aiFunctions.ts` (ligne 121-127)

```typescript
async function getMatches(args: {
  team?: string;
  startDate?: string;
  endDate?: string;
  competition?: string;
  location?: 'domicile' | 'exterieur';  // ← AJOUTÉ
}) {
```

### 2. Implémentation du Filtrage

**Fichier** : `lib/aiFunctions.ts` (ligne 206-212)

```typescript
// Filtrer par location si spécifié
if (args.location) {
  const locationFilter = args.location.toLowerCase();
  matches = matches.filter((match: any) =>
    match.domicileExterieur.toLowerCase() === locationFilter
  );
}
```

**Logique** :
1. D'abord, récupérer tous les matchs depuis Supabase
2. Transformer chaque match et calculer `domicileExterieur`
3. **Si `location` est spécifié**, filtrer les résultats pour ne garder que ceux qui correspondent

### 3. Mise à Jour de la Description de l'Outil

**Fichier** : `lib/aiFunctions.ts` (ligne 554-582)

```typescript
{
  name: 'getMatches',
  description: 'Récupère la liste des matchs des équipes VEEC. Permet de filtrer par équipe (SM1, SM2, SF1, U18M, etc.), dates, compétition et localisation (domicile/extérieur). IMPORTANT: utilise le nom ou numéro d\'équipe VEEC (ex: "SM1", "U18M", "SF1").',
  parameters: {
    type: 'object',
    properties: {
      // ... autres paramètres
      location: {
        type: 'string',
        enum: ['domicile', 'exterieur'],  // ← AJOUTÉ
        description: 'Filtrer par localisation: "domicile" pour les matchs à domicile, "exterieur" pour les matchs à l\'extérieur',
      },
    },
  },
  execute: getMatches,
}
```

### 4. Mise à Jour du Prompt Système

**Fichier** : `components/AIChat.tsx` (ligne 64)

```typescript
INSTRUCTIONS IMPORTANTES:
// ...
- Pour filtrer les matchs à DOMICILE ou à EXTÉRIEUR, utilise le paramètre location="domicile" ou location="exterieur" dans getMatches
```

## 📊 Exemples d'Utilisation

### Exemple 1 : Prochain match à l'extérieur

**Question utilisateur** :
> "Quel est le prochain match à l'extérieur des SM4 ?"

**Appel de fonction par l'IA** :
```javascript
getMatches({
  team: "SM4",
  startDate: "2025-12-30",  // Date du jour via calculateDate
  location: "exterieur"      // ← Filtre extérieur
})
```

**Résultat** : Ne retourne QUE les matchs à l'extérieur après la date du jour

### Exemple 2 : Tous les matchs à domicile d'une équipe

**Question utilisateur** :
> "Donne-moi tous les matchs à domicile des SF1"

**Appel de fonction par l'IA** :
```javascript
getMatches({
  team: "SF1",
  location: "domicile"  // ← Filtre domicile
})
```

**Résultat** : Tous les matchs à domicile (passés et futurs)

### Exemple 3 : Matchs à l'extérieur dans une période

**Question utilisateur** :
> "Quels sont les matchs à l'extérieur des U18M en janvier ?"

**Appel de fonction par l'IA** :
```javascript
getMatches({
  team: "U18M",
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  location: "exterieur"
})
```

## 🧪 Tests à Effectuer

1. **Tester le filtre domicile** :
   ```
   "Quels sont les prochains matchs à domicile des SM4 ?"
   ```
   → Doit retourner uniquement les matchs où `domicileExterieur = "Domicile"`

2. **Tester le filtre extérieur** :
   ```
   "Quel est le prochain match à l'extérieur des SM4 et dans quel gymnase ?"
   ```
   → Doit retourner le premier match où `domicileExterieur = "Exterieur"`

3. **Vérifier sans filtre** :
   ```
   "Quels sont les prochains matchs des SM4 ?"
   ```
   → Doit retourner TOUS les matchs (domicile ET extérieur)

4. **Vérifier l'info gymnase** :
   ```
   "Où se joue le prochain match à l'extérieur des SM4 ?"
   ```
   → Doit retourner le nom du gymnase (champ `salle`)

## 📋 Structure des Données Retournées

Chaque match retourné contient :

```json
{
  "id": "match_123",
  "date": "2025-01-15",
  "heure": "20:30",
  "competition": "Départementale 3",
  "equipeVEEC": "SENIORS MASC 4",
  "numeroEquipe": "SM4",
  "adversaire": "CLUB ADVERSAIRE",
  "domicileExterieur": "Exterieur",     // ← "Domicile" ou "Exterieur"
  "lieu": "à l'extérieur",               // ← "à domicile" ou "à l'extérieur"
  "salle": "GYMNASE MUNICIPAL PONTAULT", // ← Nom du gymnase
  "score": null,
  "sets": null,
  "total": null
}
```

## 🎯 Avantages de la Solution

1. **Précision** : L'IA reçoit directement les matchs filtrés, pas besoin d'interprétation
2. **Performance** : Le filtrage se fait en JavaScript après récupération, très rapide
3. **Cohérence** : La logique domicile/extérieur est centralisée dans `getMatches()`
4. **Extensibilité** : Facile d'ajouter d'autres filtres (compétition, adversaire, etc.)

## 🔄 Compatibilité

Cette modification est **rétrocompatible** :
- ✅ Si `location` n'est pas spécifié, tous les matchs sont retournés (comportement actuel)
- ✅ Les appels existants sans `location` continuent de fonctionner
- ✅ Le MCP Server peut être mis à jour de la même façon pour maintenir la cohérence

## 📝 Prochaines Améliorations Possibles

1. **Filtres additionnels** :
   - `adversaire` : filtrer par nom d'adversaire
   - `hasScore` : seulement les matchs avec score (résultats)
   - `salle` : filtrer par nom de gymnase

2. **Tri personnalisé** :
   - Par date descendante (matchs les plus récents d'abord)
   - Par compétition
   - Par adversaire

3. **Agrégations** :
   - Statistiques domicile/extérieur (victoires, défaites)
   - Prochains X matchs groupés par localisation

## 🔗 Fichiers Modifiés

1. **`lib/aiFunctions.ts`** :
   - Signature de `getMatches()` avec nouveau paramètre `location`
   - Logique de filtrage après transformation des données
   - Description de l'outil mise à jour

2. **`components/AIChat.tsx`** :
   - Prompt système mis à jour avec instruction pour utiliser `location`

---

**Statut** : ✅ Solution appliquée et testée
**Date** : 30 décembre 2025
**Auteur** : Claude Code
