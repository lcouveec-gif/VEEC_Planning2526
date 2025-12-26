# Guide d'utilisation - Logos des clubs adverses

## Vue d'ensemble

Le système de gestion des logos permet d'afficher automatiquement les logos des clubs adverses dans la page des matchs. Les logos sont stockés dans Supabase Storage et référencés dans la base de données.

## Configuration initiale

### 1. Créer le bucket Supabase Storage

1. Accédez à votre projet Supabase
2. Allez dans **Storage** → **Buckets**
3. Créez un nouveau bucket public nommé `club-logos`
4. Configurez les politiques d'accès :
   - **Lecture publique** : Activée (pour afficher les logos)
   - **Écriture** : Réservée aux admin/entraineurs

### 2. Exécuter la migration SQL

Exécutez la migration suivante dans **SQL Editor** :

```bash
# Dans le dossier du projet
supabase migration up
```

Ou manuellement via l'interface Supabase :
- Ouvrez `supabase/migrations/create_clubs_table.sql`
- Copiez et exécutez le contenu dans SQL Editor

## Ajouter des logos de clubs

### Méthode 1 : Interface admin (recommandée)

1. Connectez-vous en tant qu'**admin** ou **entraineur**
2. Allez dans **Admin** → **Clubs adverses**
3. Cliquez sur **Nouveau club**
4. Remplissez les informations :
   - **Nom du club** (obligatoire) : Nom complet tel qu'il apparaît dans les matchs
   - **Nom court** (optionnel) : Abréviation ou nom court
   - **Ville** (optionnel)
   - **Logo** : Sélectionnez un fichier PNG/JPG (max 2 MB)
5. Cliquez sur **Enregistrer**

### Méthode 2 : Upload en masse (pour votre bibliothèque PNG)

Pour uploader rapidement votre bibliothèque de logos PNG existante :

#### Option A : Via l'interface Supabase Storage

1. Accédez à **Storage** → **club-logos**
2. Cliquez sur **Upload files**
3. Sélectionnez tous vos fichiers PNG
4. Une fois uploadés, créez les entrées dans la base de données :

```sql
-- Exemple pour un club
INSERT INTO clubs (nom, nom_court, ville, logo_url)
VALUES (
  'VOLLEY CLUB PARIS',
  'VCP',
  'Paris',
  'https://[votre-projet].supabase.co/storage/v1/object/public/club-logos/vcp.png'
);
```

#### Option B : Script d'import automatique

Créez un script pour importer en masse :

```javascript
// import-logos.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://[votre-projet].supabase.co',
  '[votre-clé-service]'
);

async function uploadLogos(logosDirectory) {
  const files = fs.readdirSync(logosDirectory);

  for (const file of files) {
    if (!file.endsWith('.png')) continue;

    // Extraire le nom du club du nom de fichier
    const clubName = file.replace('.png', '').replace(/-/g, ' ').toUpperCase();

    // Upload du fichier
    const filePath = path.join(logosDirectory, file);
    const fileBuffer = fs.readFileSync(filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('club-logos')
      .upload(file, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error(`Erreur upload ${file}:`, uploadError);
      continue;
    }

    // Créer l'entrée dans la base de données
    const { data: publicUrl } = supabase.storage
      .from('club-logos')
      .getPublicUrl(file);

    const { error: dbError } = await supabase
      .from('clubs')
      .insert({
        nom: clubName,
        logo_url: publicUrl.publicUrl
      });

    if (dbError) {
      console.error(`Erreur DB ${clubName}:`, dbError);
    } else {
      console.log(`✅ ${clubName} importé`);
    }
  }
}

// Utilisation
uploadLogos('./logos-clubs');
```

## Convention de nommage des fichiers

Pour faciliter la reconnaissance automatique, nommez vos fichiers PNG selon cette convention :

- Format : `nom-du-club.png`
- Exemples :
  - `volley-club-paris.png`
  - `asv-nanterre.png`
  - `thiais-volley.png`

## Optimisation des logos

Pour de meilleures performances :

- **Format** : PNG ou JPG
- **Taille recommandée** : 200x200 pixels
- **Poids max** : 2 MB (idéalement < 200 KB)
- **Fond** : Transparent (PNG) de préférence

### Outil de compression recommandé

```bash
# Installer ImageMagick
brew install imagemagick  # macOS
apt install imagemagick   # Linux

# Compresser et redimensionner en masse
for file in *.png; do
  convert "$file" -resize 200x200 -quality 85 "optimized/$file"
done
```

## Fonctionnement de l'affichage

### Recherche automatique

Le composant `ClubLogo` recherche automatiquement le logo correspondant :

1. Recherche par **nom exact** du club
2. Recherche par **nom court**
3. Recherche par **ville**
4. Affiche une icône par défaut si aucun logo trouvé

### Exemple d'utilisation dans le code

```tsx
import ClubLogo from './components/ClubLogo';

// Dans votre composant
<ClubLogo
  clubName="VOLLEY CLUB PARIS"
  size="md"
  showFallback={true}
/>
```

## Dépannage

### Le logo ne s'affiche pas

1. **Vérifier que le club existe** :
```sql
SELECT * FROM clubs WHERE nom ILIKE '%nom du club%';
```

2. **Vérifier l'URL du logo** :
   - Copiez l'URL du logo depuis la base de données
   - Collez-la dans un navigateur
   - Si l'image ne s'affiche pas, le fichier n'est pas accessible

3. **Vérifier les politiques RLS** :
```sql
-- Doit retourner une politique de lecture publique
SELECT * FROM pg_policies WHERE tablename = 'clubs';
```

4. **Vérifier que le bucket est public** :
   - Storage → club-logos → Settings
   - Public bucket : **ON**

### Performances lentes

Si les logos chargent lentement :

1. **Optimiser les images** : Réduire la taille et le poids
2. **Activer le cache** : Les logos sont déjà en cache avec `cache-control: 3600`
3. **Vérifier la connexion Supabase** : Latence réseau

## Structure de la base de données

### Table `clubs`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| nom | TEXT | Nom complet du club (unique) |
| nom_court | TEXT | Nom court/abréviation |
| ville | TEXT | Ville du club |
| logo_url | TEXT | URL Supabase Storage |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Dernière modification |

### Bucket Storage `club-logos`

- **Type** : Public
- **Chemin** : `club-logos/[nom-fichier].png`
- **URL publique** : `https://[projet].supabase.co/storage/v1/object/public/club-logos/[fichier]`

## Support

Pour toute question ou problème :
1. Vérifiez les logs Supabase (Database → Logs)
2. Consultez la console du navigateur (F12)
3. Contactez l'administrateur système
