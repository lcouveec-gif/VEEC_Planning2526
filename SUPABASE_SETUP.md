# Configuration Supabase

## Table training_sessions

Vous devez créer une table `training_sessions` dans votre projet Supabase avec la structure suivante :

### SQL de création de la table

```sql
-- Création de la table training_sessions
CREATE TABLE training_sessions (
  id BIGSERIAL PRIMARY KEY,
  team TEXT NOT NULL,
  coach TEXT NOT NULL,
  day TEXT NOT NULL,
  gym TEXT NOT NULL,
  courts TEXT[] NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Activer RLS (Row Level Security)
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique
CREATE POLICY "Allow public read access" ON training_sessions
  FOR SELECT
  USING (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Structure des colonnes

| Colonne     | Type      | Description                           | Exemple           |
|-------------|-----------|---------------------------------------|-------------------|
| id          | bigserial | Identifiant unique (auto-incrémenté)  | 1                 |
| team        | text      | Nom de l'équipe                       | "SM1"             |
| coach       | text      | Nom de l'entraîneur                   | "Jurgen"          |
| day         | text      | Jour de la semaine (en minuscules)    | "lundi"           |
| gym         | text      | Nom du gymnase                        | "Coupvray"        |
| courts      | text[]    | Tableau des terrains                  | ["T1", "T2"]      |
| start_time  | text      | Heure de début (format HH:mm)         | "20:30"           |
| end_time    | text      | Heure de fin (format HH:mm)           | "22:30"           |
| created_at  | timestamp | Date de création                      | auto              |
| updated_at  | timestamp | Date de dernière modification         | auto              |

### Import des données existantes

Pour importer vos données existantes depuis `scheduleData.ts`, vous pouvez utiliser l'interface Supabase :

1. Allez dans votre projet Supabase : https://odfijihyepuxjzeueiri.supabase.co
2. Naviguez vers "Table Editor"
3. Sélectionnez la table `training_sessions`
4. Cliquez sur "Insert" > "Insert row" pour ajouter les données manuellement

Ou utilisez le SQL suivant pour insérer toutes les données :

```sql
INSERT INTO training_sessions (id, team, coach, day, gym, courts, start_time, end_time) VALUES
  (1, 'ELITE VB assis', 'Laurent Cl', 'mercredi', 'Coupvray', ARRAY['T3'], '20:30', '22:30'),
  (2, 'ELITE VB assis', 'Laurent Cl', 'samedi', 'Coupvray', ARRAY['T1'], '09:00', '10:30'),
  (3, 'SM1', 'Jurgen', 'lundi', 'Coupvray', ARRAY['T1'], '20:30', '22:30'),
  (4, 'SM1', 'Jurgen', 'mercredi', 'Coupvray', ARRAY['T1'], '20:30', '22:30'),
  (5, 'SM1', 'Jurgen', 'vendredi', 'Coupvray', ARRAY['T1', 'T2', 'T3'], '20:30', '22:30'),
  -- ... ajoutez toutes les autres lignes de scheduleData.ts
;
```

## Variables d'environnement

Les credentials Supabase sont stockées dans le fichier `.env` (non versionné) :

```env
VITE_SUPABASE_URL=https://odfijihyepuxjzeueiri.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

**IMPORTANT** : Ne commitez jamais le fichier `.env` dans Git. Utilisez `.env.example` comme template.

## Sécurité

- La clé `VITE_SUPABASE_ANON_KEY` est une clé publique qui peut être exposée côté client
- Row Level Security (RLS) est activé pour contrôler les accès
- Actuellement, la politique permet la lecture publique (SELECT)
- Pour permettre les modifications, vous devrez ajouter des politiques supplémentaires (INSERT, UPDATE, DELETE)

## Tester la connexion

1. Assurez-vous que le fichier `.env` est bien configuré
2. Lancez l'application : `npm run dev`
3. L'application devrait charger les données depuis Supabase
4. En cas d'erreur, vérifiez la console du navigateur pour plus de détails
