# Guide rapide - Logos des clubs avec codes

## Système basé sur les codes clubs (7 positions)

Le système utilise maintenant les codes clubs à 7 positions (ex: `0775819`) pour identifier et charger les logos. Ce code est extrait automatiquement des champs `EQA_no` et `EQB_no` de vos matchs.

## Installation rapide - 3 étapes

### 1. Créer le bucket Supabase Storage

```
1. Supabase Dashboard → Storage
2. Create bucket → "club-logos"
3. Public: ✓ ON
```

### 2. Exécuter les migrations SQL

Dans Supabase SQL Editor, exécutez dans l'ordre :

```sql
-- 1. Créer la table clubs
-- Copier-coller le contenu de: supabase/migrations/create_clubs_table.sql

-- 2. Initialiser les clubs depuis vos matchs
-- Copier-coller le contenu de: supabase/migrations/init_clubs_from_matches.sql
-- IMPORTANT: Remplacer [VOTRE-PROJET] par votre URL Supabase réelle
```

### 3. Uploader vos logos PNG

Deux méthodes au choix :

#### Méthode A : Via Supabase Storage (Upload direct)

```
1. Storage → club-logos
2. Upload files
3. Sélectionner tous vos fichiers PNG nommés: code_club.png
   Exemples:
   - 0775819.png (VEEC)
   - 0778965.png (autre club)
   - etc.
```

#### Méthode B : Via l'interface admin

```
1. Connexion admin
2. Admin → Clubs adverses
3. Sélectionner un club dans la liste
4. Cliquer sur "Sélectionner un logo"
5. Upload du fichier PNG
   (sera automatiquement renommé avec le code club)
```

## Convention de nommage obligatoire

**Format**: `{code_club}.png`

Exemples :
- `0775819.png` → Club VEEC
- `0778965.png` → Club adverse 1
- `0912345.png` → Club adverse 2

Le code club est extrait automatiquement des matchs (7 premiers caractères de EQA_no/EQB_no).

## Vérification

### Voir les clubs importés

```sql
SELECT code_club, nom, logo_url
FROM clubs
ORDER BY nom;
```

### Vérifier qu'un logo s'affiche

1. Allez sur la page **Matchs**
2. Les logos des clubs adverses doivent apparaître automatiquement à côté des noms d'équipes
3. Si pas de logo : icône par défaut (normal si le fichier PNG n'est pas encore uploadé)

## Nettoyer les noms de clubs

Le script d'initialisation retire automatiquement les numéros d'équipe :
- "VOLLEY CLUB PARIS 1" → "VOLLEY CLUB PARIS"
- "ASV NANTERRE 2" → "ASV NANTERRE"

Vous pouvez modifier les noms dans **Admin → Clubs adverses**.

## Exemple complet

### Cas d'usage : Ajouter le logo du club "ASV NANTERRE"

1. **Trouver le code club** :
```sql
SELECT DISTINCT
  SUBSTRING(EQA_no, 1, 7) as code_club,
  EQA_nom
FROM "VEEC_Matchs"
WHERE EQA_nom LIKE '%NANTERRE%';
```

Résultat : `0778965` → "ASV NANTERRE 1"

2. **Renommer votre fichier PNG** :
```
nanterre-logo.png → 0778965.png
```

3. **Uploader** :
- Via Storage : Upload `0778965.png` dans le bucket `club-logos`
- Via Admin : Clubs adverses → ASV NANTERRE → Sélectionner logo

4. **Vérifier** :
- Page Matchs → Les matchs contre Nanterre affichent maintenant le logo

## Upload en masse (optionnel)

Si vous avez beaucoup de logos à uploader :

### Script bash pour renommer vos fichiers

```bash
#!/bin/bash
# rename-logos.sh

# Tableau associatif: nom_fichier_actuel → code_club
declare -A MAPPING=(
  ["paris.png"]="0775819"
  ["nanterre.png"]="0778965"
  ["thiais.png"]="0912345"
  # Ajoutez vos mappings ici
)

# Renommer les fichiers
for file in "${!MAPPING[@]}"; do
  code="${MAPPING[$file]}"
  if [ -f "$file" ]; then
    cp "$file" "${code}.png"
    echo "✓ $file → ${code}.png"
  fi
done
```

### Upload via CLI Supabase

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref [votre-ref-projet]

# Uploader tous les logos
for file in *.png; do
  supabase storage cp "$file" "club-logos/$file"
  echo "✓ Uploaded $file"
done
```

## Dépannage

### Le logo ne s'affiche pas

1. **Vérifier que le club existe** :
```sql
SELECT * FROM clubs WHERE code_club = '0775819';
```

2. **Vérifier l'URL du logo** :
```sql
SELECT code_club, nom, logo_url FROM clubs WHERE code_club = '0775819';
```

3. **Tester l'URL dans le navigateur** :
- Copier l'URL du logo_url
- Coller dans la barre d'adresse
- Si l'image ne s'affiche pas → Le fichier n'existe pas dans Storage

4. **Vérifier le nom du fichier dans Storage** :
```
Storage → club-logos → Vérifier que 0775819.png existe
```

### Le club n'apparaît pas dans la liste

→ Le script d'initialisation n'a pas trouvé ce club dans les matchs
→ Solution : Créer manuellement via Admin → Clubs adverses → Nouveau club

### Erreur d'upload

- Vérifier que le bucket `club-logos` est **public**
- Vérifier que les RLS policies sont actives (voir create_clubs_table.sql)
- Vérifier la taille du fichier (max 2 MB)

## Support

Pour obtenir de l'aide :
1. Vérifier les logs Supabase (Database → Logs)
2. Console navigateur (F12 → Console)
3. Consulter [docs/LOGOS_CLUBS.md](LOGOS_CLUBS.md) pour plus de détails
