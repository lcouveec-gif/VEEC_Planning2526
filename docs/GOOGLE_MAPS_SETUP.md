# Configuration Google Maps pour le Géocodage des Gymnases

Ce guide explique comment configurer l'API Google Maps pour obtenir automatiquement les coordonnées GPS des gymnases à partir de leur adresse.

## 1. Obtenir une Clé API Google Maps

### Étape 1 : Créer un Projet Google Cloud

1. Accédez à [Google Cloud Console](https://console.cloud.google.com/)
2. Connectez-vous avec votre compte Google
3. Cliquez sur le menu déroulant des projets en haut de la page
4. Cliquez sur "Nouveau projet"
5. Donnez un nom à votre projet (ex: "VEEC Planning")
6. Cliquez sur "Créer"

### Étape 2 : Activer l'API Geocoding

1. Dans le menu de navigation (☰), allez dans "APIs et services" > "Bibliothèque"
2. Recherchez "Geocoding API"
3. Cliquez sur "Geocoding API"
4. Cliquez sur le bouton "ACTIVER"

### Étape 3 : Créer une Clé API

1. Dans le menu de navigation, allez dans "APIs et services" > "Identifiants"
2. Cliquez sur "+ CRÉER DES IDENTIFIANTS" en haut
3. Sélectionnez "Clé API"
4. Votre clé API est créée et affichée

### Étape 4 : Sécuriser la Clé API (Recommandé)

1. Cliquez sur "RESTREINDRE LA CLÉ" ou sur le nom de la clé
2. Sous "Restrictions liées aux applications" :
   - Sélectionnez "Référents HTTP (sites web)"
   - Ajoutez vos domaines autorisés :
     - `http://localhost:5174/*` (pour le développement)
     - `https://votre-domaine.com/*` (pour la production)
3. Sous "Restrictions liées aux API" :
   - Sélectionnez "Limiter la clé aux API sélectionnées"
   - Cochez uniquement "Geocoding API"
4. Cliquez sur "ENREGISTRER"

## 2. Configurer l'Application

### Étape 1 : Ajouter la Clé API au fichier .env

1. Ouvrez le fichier `.env` à la racine du projet
2. Remplacez `votre_cle_google_maps_api` par votre véritable clé API :

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyD-VOTRE_CLE_API_ICI
```

3. Sauvegardez le fichier

### Étape 2 : Redémarrer l'Application

Pour que les variables d'environnement soient prises en compte :

```bash
# Arrêter le serveur de développement (Ctrl+C)
# Puis relancer :
npm run dev
```

## 3. Utiliser le Géocodage dans l'Interface Admin

### Géocoder l'Adresse d'un Gymnase

1. Connectez-vous à l'interface d'administration
2. Accédez à "Gestion des Gymnases"
3. Cliquez sur "Modifier" pour un gymnase existant ou créez-en un nouveau
4. Remplissez les champs d'adresse :
   - **Adresse complète** : ex. "12 Rue du Sport"
   - **Code postal** : ex. "75015"
   - **Ville** : ex. "Paris"
5. Cliquez sur le bouton "📍 Obtenir les coordonnées GPS"
6. Si l'adresse est valide, les champs Latitude et Longitude seront automatiquement remplis
7. Cliquez sur "Enregistrer" pour sauvegarder les coordonnées

### Conseils pour de Meilleurs Résultats

- Entrez l'adresse la plus complète possible
- Vérifiez l'orthographe de la ville
- Assurez-vous que le code postal correspond à la ville
- Si le géocodage échoue :
  - Vérifiez l'adresse sur Google Maps
  - Simplifiez l'adresse (retirez les indications de bâtiment, etc.)
  - Réessayez avec une formulation différente

## 4. Vérification et Dépannage

### Vérifier que la Clé API Fonctionne

1. Ouvrez la Console du Navigateur (F12)
2. Allez dans l'onglet "Console"
3. Essayez de géocoder une adresse
4. Si vous voyez une erreur, vérifiez :
   - La clé API est correctement copiée dans `.env`
   - L'application a été redémarrée après modification de `.env`
   - L'API Geocoding est bien activée dans Google Cloud Console
   - Les restrictions de la clé permettent votre domaine

### Messages d'Erreur Courants

**"VITE_GOOGLE_MAPS_API_KEY non définie"**
- La clé API n'est pas dans le fichier `.env`
- L'application n'a pas été redémarrée après ajout de la clé

**"Impossible de géocoder cette adresse"**
- L'adresse n'est pas reconnue par Google Maps
- Essayez de simplifier ou de reformuler l'adresse

**"REQUEST_DENIED"**
- La clé API n'est pas valide
- Les restrictions de la clé bloquent la requête
- L'API Geocoding n'est pas activée

### Consulter l'Utilisation de l'API

1. Dans Google Cloud Console, allez dans "APIs et services" > "Geocoding API"
2. Consultez l'onglet "Métriques" pour voir :
   - Nombre de requêtes effectuées
   - Erreurs éventuelles
   - Quota restant

## 5. Tarification et Quotas

### Quota Gratuit

Google Maps offre **$200 de crédit mensuel gratuit**, ce qui correspond à :
- **40 000 géocodages gratuits par mois**
- Au-delà : $5 pour 1 000 requêtes supplémentaires

Pour un usage normal de gestion de gymnases, le quota gratuit devrait largement suffire.

### Définir un Quota Maximal (Recommandé)

Pour éviter les frais imprévus :

1. Dans Google Cloud Console, allez dans "APIs et services" > "Geocoding API"
2. Cliquez sur "Quotas"
3. Définissez une limite quotidienne (ex: 100 requêtes/jour)

## 6. Sécurité

### Bonnes Pratiques

- **Ne jamais** committer le fichier `.env` dans Git (déjà dans `.gitignore`)
- Restreindre la clé API aux domaines autorisés uniquement
- Restreindre la clé API à Geocoding API uniquement
- Définir des quotas pour éviter les abus
- Surveiller régulièrement l'utilisation dans Google Cloud Console

### Régénérer une Clé Compromise

Si votre clé API est exposée publiquement :

1. Dans Google Cloud Console, allez dans "Identifiants"
2. Supprimez l'ancienne clé
3. Créez une nouvelle clé avec les restrictions appropriées
4. Mettez à jour le fichier `.env` avec la nouvelle clé
5. Redémarrez l'application

## Support

Pour toute question ou problème :
- Consultez la [documentation officielle Google Maps](https://developers.google.com/maps/documentation/geocoding)
- Vérifiez les logs dans la Console du Navigateur (F12)
- Consultez les métriques dans Google Cloud Console
