# Migration vers Supabase - Guide complet

## Vue d'ensemble

L'application utilise maintenant Supabase comme base de données pour stocker les données des entraînements. Les données ne sont plus stockées dans un fichier statique mais sont chargées dynamiquement depuis Supabase.

## Configuration en 3 étapes

### Étape 1 : Configuration de Supabase

1. **Créer la table dans Supabase**
   - Allez sur https://odfijihyepuxjzeueiri.supabase.co
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Copiez-collez le contenu du fichier `supabase_insert_data.sql`
   - Cliquez sur "Run" pour exécuter le script
   - Cela va créer la table `training_sessions` et insérer toutes vos données

2. **Vérifier que les données sont bien insérées**
   - Allez dans "Table Editor"
   - Sélectionnez la table `training_sessions`
   - Vous devriez voir 49 lignes de données

### Étape 2 : Configuration des variables d'environnement

1. **Le fichier `.env` a déjà été créé** avec vos credentials
2. **IMPORTANT** : Ce fichier est déjà ignoré par Git (ajouté au `.gitignore`)
3. **Pour les autres développeurs** : Copiez `.env.example` vers `.env` et remplissez les valeurs

### Étape 3 : Tester l'application

1. **Installer les dépendances** (déjà fait)
   ```bash
   npm install
   ```

2. **Lancer l'application**
   ```bash
   npm run dev
   ```

3. **Vérifier que ça fonctionne**
   - L'application devrait afficher un spinner de chargement
   - Puis afficher toutes les données d'entraînements depuis Supabase
   - En cas d'erreur, elle affichera un message d'erreur en rouge

## Architecture mise en place

### Fichiers créés/modifiés

1. **`lib/supabaseClient.ts`** : Client Supabase configuré
2. **`hooks/useTrainingSessions.ts`** : Hook React pour charger les données
3. **`App.tsx`** : Modifié pour utiliser le hook au lieu des données statiques
4. **`.env`** : Variables d'environnement (credentials Supabase)
5. **`.gitignore`** : Mis à jour pour ignorer `.env`

### Sécurité

✅ **Ce qui a été mis en place :**
- Les credentials sont dans un fichier `.env` non versionné
- Le fichier `.env` est ignoré par Git
- Row Level Security (RLS) est activé sur Supabase
- Seule la lecture publique est autorisée (SELECT)

⚠️ **Note importante :**
- La clé `VITE_SUPABASE_ANON_KEY` est une clé publique
- Elle peut être exposée côté client en toute sécurité
- Les règles RLS de Supabase protègent vos données

## Fonctionnalités

### Ce qui fonctionne maintenant :
- ✅ Chargement des données depuis Supabase
- ✅ Affichage d'un spinner pendant le chargement
- ✅ Gestion des erreurs
- ✅ Tous les filtres et recherches fonctionnent comme avant
- ✅ Export PDF fonctionne toujours

### Prochaines étapes possibles :
- Ajouter la possibilité de modifier les données depuis l'interface
- Ajouter des politiques RLS pour permettre les modifications
- Créer une interface d'administration
- Ajouter la même logique pour les matchs

## Dépannage

### L'application affiche "Erreur : ..."
1. Vérifiez que le fichier `.env` existe et contient les bonnes valeurs
2. Vérifiez que la table `training_sessions` existe dans Supabase
3. Vérifiez que les données sont bien insérées dans la table
4. Ouvrez la console du navigateur (F12) pour voir les détails de l'erreur

### Les données ne s'affichent pas
1. Vérifiez que RLS est activé et que la politique de lecture existe
2. Vérifiez dans la console du navigateur s'il y a des erreurs
3. Vérifiez que le format des données dans Supabase correspond au schéma attendu

### Erreur "Missing Supabase environment variables"
- Le fichier `.env` n'existe pas ou est vide
- Créez un fichier `.env` à la racine du projet
- Copiez le contenu de `.env.example` et remplissez les valeurs

## Support

Pour toute question, consultez :
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation du hook useTrainingSessions](./hooks/useTrainingSessions.ts)
- Le fichier `SUPABASE_SETUP.md` pour plus de détails techniques
